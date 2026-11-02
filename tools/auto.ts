// 全自动：npm run auto -- 03 [--chapter 2] [--force] [--dry]
// 输入：原始文章 / --script 用户脚本 / 已准备好的章节，用户脚本优先。
// 依次完成：准备 → 配音 → 对稿/字幕 → 导出检查 → 渲染 → 合并全片。
// 配音、对稿、渲染失败会自动重试；仍失败就停下并给出下一步，不猜测、不跳过。
// 渲染固定使用项目内的 ASCII 临时目录（%TEMP% 含中文会让 Remotion 混音失败）。
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { episodeStyle } from "../engine/src/script/parse";
import { prepareArticle, checkInputContract } from "./input";
import { isMotionStyle } from "../engine/src/script/motion";
import { reusedAudioIsCurrent } from "./reuse";
import { chapterNumber, chapterOrder } from "./concat";
import { acquireLock, articleName, articleNo, articleOf, articleStyle, die, drawerOf, epPath, filmBase, findArticle, killTree, loadScript, moveArticle, outputFor, outputOf, parseArgs, readVersion, ROOT, versionOf } from "./lib";

const { positional, flags, values } = parseArgs(process.argv.slice(2));
const dry = flags.has("--dry");
const force = flags.has("--force");
const chapterNo = values["--chapter"] !== undefined ? Number(values["--chapter"]) : null;
if (chapterNo !== null && !Number.isInteger(chapterNo)) die("--chapter 后面要跟章节号，例如 --chapter 2");
const q = positional[0];
if (!q) die("用法：npm run auto -- 03 [--chapter 2] [--version 中文-极简动效v1] [--force] [--dry]");
if (values["--script"] !== undefined && !values["--script"]) die("--script 后必须提供文件路径，不会回退到自行写稿。");
const TMP = path.join(ROOT, ".tmp");
const env = { ...process.env, TMPDIR: TMP, TMP, TEMP: TMP };
const TSX = path.join(ROOT, "node_modules/tsx/dist/cli.mjs");

async function main() {
let article = findArticle(q.split("@")[0]);
if (!article) die(`找不到文章：${q}，先 npm run new -- 标题 并放入原文。`);
if (!dry) acquireLock("auto");
if (!dry && drawerOf(article) === "待制作") {
  article = moveArticle(article, "制作中");
  console.log(`已移入制作中：episodes/${article}/`);
}
const prepared = await prepareArticle(article, { script: values["--script"], version: q.split("@")[1] ?? values["--version"], dry });
const { version } = prepared;
if (version && parseInt(readVersion(article, version)["历史成片"] ?? "0", 10) > 0)
  die(`「${article}/${version}」存在只有成片、没有源稿的历史章节；完整全片已保留，补齐旧稿前不运行全自动。详情见该文章 版本一览.md。`);
/** 章节名 → 相对 episodes/ 的完整路径 */
const rel = (name: string) => `${article}/${version ? `${version}/` : ""}${name}`;
const all = chapterOrder(prepared.chapters);
if (!all.length) die(`「${article}」下还没有章节`);
const chapters =
  chapterNo === null
    ? all
    : (() => {
        const hit = all.find((name) => chapterNumber(name) === chapterNo);
        if (!hit) die(`「${article}」下找不到第 ${chapterNo} 章`);
        return [hit];
      })();

for (const name of chapters) {
  if (dry && prepared.prepared) continue;
  const dir = rel(name);
  if (!isMotionStyle(loadScript(dir).meta) || /纯文字/.test(dir)) die("纯文字风格已停用，请新建极简动效 V1 版本重做。");
  const contract = checkInputContract(dir);
  if (contract.length) die(contract.join("\n"));
  const narr = epPath(dir, "朗读稿.txt");
  if (!fs.existsSync(narr) || !fs.readFileSync(narr, "utf8").trim()) die(`${dir} 缺朗读稿.txt（或为空），先写朗读稿`);
  if (!fs.existsSync(epPath(dir, "script.md"))) die(`${dir} 缺 script.md，先写处理稿再跑全自动`);
}
const styles = chapters.map((name) => dry && prepared.prepared ? "v1" : episodeStyle(loadScript(rel(name)).meta));
if (new Set(styles).size > 1) {
  console.warn(
    `提示 各章风格不同（${chapters.map((c, i) => `${c.match(/^\d+-\d+/)?.[0]} ${styles[i]}`).join("、")}），` +
      "合并后画面会跳；全自动模式建议全篇统一风格。",
  );
}

if (!dry) fs.mkdirSync(TMP, { recursive: true });

console.log(`全自动：${article}，${chapters.length} 章${dry ? "（预览，不执行）" : ""}`);
const started = Date.now();

for (const name of chapters) {
  const dir = rel(name);
  console.log(`\n== ${dir} ==`);

  if (force || dry || ttsStale(dir)) {
    if (!ttsWithRetry(dir)) die(`配音失败：${dir}。检查网络后重跑：npm run auto -- ${q}`);
  } else {
    console.log("  配音已是最新，跳过");
  }

  let ok = run("voice.ts", [dir], "对稿", 30);
  if (!ok && !dry) {
    console.log("  对稿未通过，重新生成该章配音后再试一次…");
    if (!ttsWithRetry(dir)) die(`配音失败：${dir}`);
    ok = run("voice.ts", [dir], "对稿", 30);
  }
  if (!ok) die(`对稿未通过：${dir}。核对 朗读稿.txt / 演出稿 / 配音 后重跑：npm run auto -- ${q}`);

  if (!run("check.ts", [dir, "--ready"], "导出检查", 5))
    die(`处理稿未通过导出检查：${dir}。按提示补齐制作层；用户处理稿需要更新原始文件再导入，不能另写替代稿。`);
}

console.log(`\n== 渲染 ==`);
for (const name of chapters) {
  const dir = rel(name);
  if (!force && !dry && !renderStale(dir)) {
    console.log(`  ${dir}：成片已是最新，跳过（--force 可重渲）`);
    continue;
  }
  let ok = run("render.ts", [dir], "渲染", 25);
  if (!ok && !dry) {
    console.log("  渲染失败，重试一次…");
    ok = run("render.ts", [dir], "渲染", 25);
  }
  if (!ok) die(`渲染失败：${dir}。修复上述错误后重跑：npm run auto -- ${q}`);
}

if (chapterNo !== null) {
  console.log(dry ? `\n预览结束（单章模式不合并全片）` : `\n第 ${chapterNo} 章完成（单章模式不合并全片）`);
} else {
  console.log(`\n== 合并全片 ==`);
  if (!run("merge.ts", version ? [article, "--version", version] : [article], "合并", 20)) die(`合并失败：${article}`);
  if (dry) {
    console.log(`\n预览结束：将生成 ${outputFor(epPath(article, "out"), filmBase(article, version), articleStyle(article, version))}，再整篇搬进 episodes/待发/`);
  } else {
    // 出片完成即搬进 待发，等用户发布后归档到 已发
    const done = moveToPending(article);
    const out = outputOf(epPath(done, "out"), filmBase(done, version), articleStyle(done, version)) ?? epPath(done, "out", `${filmBase(done, version)}.mp4`);
    console.log(`\n完成：${out}（用时 ${mmss((Date.now() - started) / 1000)}）`);
  }
}
}

main().catch(error => die((error as Error).message));

/** 出片完成后把整篇文章搬进 待发；已在 待发/已发 就只提示，搬运失败不影响已生成的成片 */
function moveToPending(article: string): string {
  const drawer = drawerOf(article);
  if (drawer === "待发") {
    console.log(`\n== 归档 ==\n  已经在 episodes/${article}/（待发），不用搬`);
    return article;
  }
  if (drawer === "已发") {
    console.log(`\n== 归档 ==\n  「${article}」已在 已发/，不动它`);
    return article;
  }
  const no = articleNo(article) ?? article;
  try {
    const dest = moveArticle(article, "待发");
    console.log(`\n== 归档 ==\n  已搬入待发：episodes/${dest}/（发布后：npm run move -- ${no} 已发）`);
    return dest;
  } catch (err) {
    console.warn(
      `\n  未能自动搬进 待发（${(err as Error).message}），成片已生成；确认后手动搬：npm run move -- ${no} 待发`,
    );
    return article;
  }
}

/** 调 tools/ 下的命令；dry 时只打印。成功返回 true。超时会杀掉整棵进程树（Remotion 卡死时不会自己退出） */
function run(script: string, args: string[], label: string, timeoutMin = 20): boolean {
  const shown = ["tsx", `tools/${script}`, ...args].join(" ");
  if (dry) {
    console.log(`  将运行：${shown}`);
    return true;
  }
  console.log(`  ${shown}`);
  const r = spawnSync(process.execPath, [TSX, path.join(ROOT, "tools", script), ...args], {
    cwd: ROOT,
    stdio: "inherit",
    env,
    timeout: timeoutMin * 60_000,
  });
  if (r.error && (r.error as NodeJS.ErrnoException).code === "ETIMEDOUT") {
    if (r.pid) killTree(r.pid);
    console.error(`  ${label}超时（${timeoutMin} 分钟没有结束），已结束进程树`);
    return false;
  }
  if (r.error) {
    console.error(`  ${label}失败：${r.error.message}`);
    return false;
  }
  if (r.status !== 0) {
    console.error(`  ${label}失败${r.status ? `（退出码 ${r.status}）` : ""}`);
    return false;
  }
  return true;
}

/** 配音最多重试 3 次，应对 Edge TTS 偶发限流/断网 */
function ttsWithRetry(dir: string): boolean {
  for (let i = 1; i <= 3; i++) {
    if (run("tts.ts", [dir], "配音", 15)) return true;
    if (dry) return true;
    if (i < 3) {
      console.log(`  配音失败，3 秒后重试（${i}/3）…`);
      sleep(3000);
    }
  }
  return false;
}

function audioFile(dir: string) {
  return ["mp3", "wav", "m4a"].map((ext) => epPath(dir, "字幕", `配音.${ext}`)).find((f) => fs.existsSync(f));
}

/** 配音比朗读稿/演出稿旧或不存在时为 true */
function ttsStale(dir: string): boolean {
  const audio = audioFile(dir);
  if (!audio) return true;
  if (reusedAudioIsCurrent(dir)) return false;
  const sources = ["朗读稿.txt", "朗读稿.演出.txt"]
    .map((f) => epPath(dir, f))
    .concat(versionOf(dir) ? [epPath(articleOf(dir), versionOf(dir), "版本.md")] : [])
    .filter((f) => fs.existsSync(f));
  return Math.max(...sources.map((f) => fs.statSync(f).mtimeMs)) > fs.statSync(audio).mtimeMs;
}

/** 成片比 script.md / 朗读稿 / 配音 / 逐字.json 旧或不存在时为 true */
function renderStale(dir: string): boolean {
  const name = dir.split("/").pop()!;
  const style = episodeStyle(loadScript(dir).meta);
  const out = outputOf(epPath(dir, "out"), name, style);
  if (!out) return true;
  const audio = audioFile(dir);
  const sources = ["script.md", "画面.tsx", "画面脚本.md", "朗读稿.txt", "朗读稿.演出.txt", "字幕/逐字.json"]
    .map((f) => epPath(dir, f))
    .concat(audio ? [audio] : [])
    .concat(fs.readdirSync(path.join(ROOT, "engine/src"), { recursive: true }).map(String).filter(f => /\.(tsx?|md)$/.test(f)).map(f => path.join(ROOT, "engine/src", f)))
    .filter((f) => fs.existsSync(f));
  return Math.max(...sources.map((f) => fs.statSync(f).mtimeMs)) > fs.statSync(out).mtimeMs;
}

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function mmss(t: number) {
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
}
