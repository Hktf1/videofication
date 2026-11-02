import { brandOf, episodeStyle } from "../engine/src/script/parse";
import { outroFrames } from "../engine/src/script/timeline";
import { STYLE_ID } from "../engine/src/script/style";
import { isMotionStyle } from "../engine/src/script/motion";
import { loadScript } from "./lib";
import path from "node:path";
import { createHash } from "node:crypto";
import { preflight } from "./preflight";
// 渲染：npm run render -- 01-1      渲染一章
//       npm run render -- 01        渲染文章下的所有章（逐章输出，暂不合并全片）
//       npm run render -- 01 1      渲染文章 01 的第 1 章
//       npm run render -- --all     批量重渲（跳过「已发布」的章节，改风格后用）
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import { acquireLock, articleOf, chapterName, compositionId, die, drawerOf, ensureChapter, epPath, findArticle, languageOfVersion, listEpisodes, listVersions, outputFor, parseArgs, readStatus, readVersion, resolveChapters, resolveEpisode, resolveVersion, ROOT, setStatus, versionOf, versionStyle } from "./lib";

const argv = process.argv.slice(2);
const { positional, flags, values } = parseArgs(argv);
const arg = positional[0];
const extra = positional[1];
const versionHint = values["--version"];
if (!arg && !flags.has("--all")) die("用法：npm run render -- 01-1 / 01 / 01 1 / --all [--version 中文-极简动效v1]");
const dry = flags.has("--dry");

// 渲染会开本机 Chrome：先占锁，避免两条渲染同时跑；再清掉上次崩溃留下的临时配置（越积越多会拖慢启动）
const TMP = path.join(ROOT, ".tmp");
for (const name of !dry && fs.existsSync(TMP) ? fs.readdirSync(TMP) : []) {
  if (!name.startsWith("puppeteer_dev_chrome_profile-")) continue;
  const p = path.join(TMP, name);
  try {
    if (Date.now() - fs.statSync(p).mtimeMs > 2 * 3600_000) fs.rmSync(p, { recursive: true, force: true });
  } catch {}
}
if (!dry) acquireLock("render");

type Target = { dir: string; chapter?: string };
let targets: Target[];

if (flags.has("--all")) {
  // 批量重渲跳过已发抽屉里的文章（要重渲就显式指定章节）
  targets = listEpisodes()
    .filter(d => isMotionStyle(loadScript(d).meta) && !/纯文字/.test(d))
    .filter((d) => drawerOf(articleOf(d)) !== "已发" && readStatus(d)["阶段"] !== "已发布")
    .filter(d => {
      if (!versionHint) return true;
      const article = articleOf(d);
      const matches = listVersions(article).some(v => v.includes(versionHint) || versionStyle(article, v) === versionHint);
      return matches && versionOf(d) === resolveVersion(article, versionHint);
    })
    .map((dir) => ({ dir }));
} else {
  const article = findArticle(arg!.split("@")[0]);
  if (article) {
    // 文章 → 当前版本的章节（--version 或 16@版本 可以指定版本）；第二个位置参数是章节号
    const chapterNo = extra !== undefined && /^\d+$/.test(extra) ? Number(extra) : null;
    targets = resolveChapters(arg, chapterNo, versionHint).map((dir) => ({ dir }));
  } else {
    targets = [{ dir: resolveEpisode(arg, versionHint), chapter: extra }];
  }
}

if (dry) {
  console.log(JSON.stringify({ dry: true, targets: targets.map(t => ({...t, composition: compositionId(t.dir, t.chapter)})) }, null, 2));
  process.exit(0);
}
// 所有目标先通过检查，再开始任何渲染。
let blocked = false;
for (const target of targets) {
  const errors = preflight(target.dir);
  if (errors.length) { blocked = true; console.error(target.dir + "：\n" + errors.join("\n")); }
}
if (blocked) die("导出已停止：请先处理以上问题，未写入成片或状态。");
const cli = path.join(ROOT, "node_modules/@remotion/cli/remotion-cli.js");
// 帧截取是热点：Remotion 默认只给一半核数（封顶 8），这里按核数拉到 12；编码用 veryfast，黑底静态字看不出差别
const concurrency = String(Math.min(12, os.availableParallelism()));
// tsx 按 CJS 转译这个脚本，不能写顶层 await：整段渲染放进 async 函数，最后统一接住错误
async function renderAll() {
  for (const { dir, chapter } of targets) {
    ensureChapter(dir);
    // Composition ID 要和 Root.tsx 一致：多版本同名章节靠版本区分
    const name = chapterName(dir);
    const id = compositionId(dir, chapter);
    // 换风格重做时不覆盖旧成片：已经有别的风格的成片时，新成片带风格后缀（如 -v4.mp4）
    const meta = loadScript(dir).meta;
    const base = chapter ? `${name}-第${chapter}章` : name;
    const out = outputFor(epPath(dir, "out"), base, episodeStyle(meta));
    fs.mkdirSync(epPath(dir, "out"), { recursive: true });
    console.log(`渲染 ${dir}${chapter ? ` 第${chapter}章` : ""} …`);
    try {
      await renderWithProgress(name, id, [cli, "render", id, out, "--log=warn", `--concurrency=${concurrency}`, "--x264-preset=veryfast"]);
    } catch (err) {
      die(`渲染失败：${err instanceof Error ? err.message : err}`);
    }
    const inputs = ["script.md", "画面.tsx", "画面脚本.md", "朗读稿.txt", "朗读稿.演出.txt", "字幕/逐字.json", ...["mp3", "wav", "m4a"].map(x => "字幕/配音." + x)];
    const hashes = Object.fromEntries(inputs.filter(f => fs.existsSync(epPath(dir, f))).map(f => [f, createHash("sha256").update(fs.readFileSync(epPath(dir, f))).digest("hex")]));
    const engineFiles = fs.readdirSync(path.join(ROOT, "engine/src"), { recursive: true }).map(String).filter(f => /\.(tsx?|md|txt)$/.test(f)).sort();
    const engineHash = createHash("sha256");
    for (const f of engineFiles) engineHash.update(f).update(fs.readFileSync(path.join(ROOT, "engine/src", f)));
    fs.writeFileSync(out + ".manifest.json", JSON.stringify({ renderedAt: new Date().toISOString(), composition: id, outroFrames: outroFrames(meta), brand: brandOf(meta), inputs: hashes, engineSha256: engineHash.digest("hex"), style: episodeStyle(meta), styleId: STYLE_ID, version: versionOf(dir), language: readVersion(articleOf(dir), versionOf(dir))["语言代码"] ?? languageOfVersion(versionOf(dir)), dependencies: createHash("sha256").update(fs.readFileSync(path.join(ROOT, "package-lock.json"))).digest("hex") }, null, 2));
    if (!chapter) setStatus(dir, "阶段", "已渲染");
    console.log(`完成：${out}`);
  }
}

renderAll().catch((err) => die(`渲染失败：${err instanceof Error ? err.message : err}`));

const PROGRESS_FILE = path.join(TMP, "progress.json");

type RenderProgress = {
  label: string;
  composition: string;
  frames: number;
  total: number;
  percent: number;
  etaMs: number | null;
  startedAt: number;
  updatedAt: number;
  done: boolean;
};

function writeRenderProgress(p: RenderProgress) {
  try {
    fs.mkdirSync(TMP, { recursive: true });
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
  } catch {}
}

/**
 * 跑 Remotion 渲染，顺手把它输出里的「Rendered frames 123/456」解析成 .tmp/progress.json，
 * 让 npm run progress 在章内也能看到帧进度和剩余时间。
 * 进度行不转发（否则满屏都是刷新的条），其余警告和报错照常打到 stderr。
 */
function renderWithProgress(label: string, composition: string, args: string[]) {
  const startedAt = Date.now();
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let pending = "";
    let lastWrite = 0;
    const tail: string[] = [];
    const onData = (chunk: Buffer) => {
      pending += chunk.toString("utf8");
      const lines = pending.split(/[\r\n]+/);
      pending = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "").trim();
        if (!line) continue;
        const m = line.match(/(\d+)\s*\/\s*(\d+)/);
        if (m && /(Rendering|Rendered|Stitching|Encoded|Encoding)/i.test(line)) {
          const frames = Number(m[1]);
          const total = Number(m[2]);
          const now = Date.now();
          if (!(total > 0) || (now - lastWrite < 300 && frames < total)) continue;
          lastWrite = now;
          const elapsed = now - startedAt;
          writeRenderProgress({
            label,
            composition,
            frames,
            total,
            percent: Math.min(100, Math.round((frames / total) * 100)),
            etaMs: frames > 0 ? Math.max(0, Math.round((elapsed / frames) * (total - frames))) : null,
            startedAt,
            updatedAt: now,
            done: false,
          });
          continue;
        }
        tail.push(line);
        if (tail.length > 40) tail.shift();
        process.stderr.write(line + "\n");
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        writeRenderProgress({ label, composition, frames: 0, total: 0, percent: 100, etaMs: 0, startedAt, updatedAt: Date.now(), done: true });
        resolve();
        return;
      }
      try {
        fs.rmSync(PROGRESS_FILE, { force: true });
      } catch {}
      reject(new Error(`Remotion 退出码 ${code}${tail.length ? "：" + tail.slice(-3).join(" / ") : ""}`));
    });
  });
}
