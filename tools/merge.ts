// 合并全片：npm run merge -- 03 [--force]
// 把 episodes/03-文章/03-*/out/03-章名.mp4 按章号拼成 episodes/03-文章/out/03-文章.mp4。
// 视频流直接复制，音频重新编码（避免 AAC 拼接缝隙）；合并前核对各章参数一致。
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { FPS, episodeStyle } from "../engine/src/script/parse";
import { STYLE_ID } from "../engine/src/script/style";
import { chapterOrder, checkCompatible, concatList, parseProbe, type MediaInfo } from "./concat";
import { articleName, articleStyle, die, epPath, filmBase, languageOfVersion, listVersionChapters, loadScript, outputFor, outputOf, parseArgs, readVersion, resolveArticle, resolveVersion, ROOT, setStatus } from "./lib";

const { positional, flags, values } = parseArgs(process.argv.slice(2));
const q = positional[0];
const force = flags.has("--force");
if (!q) die("用法：npm run merge -- 03 [--version 中文-极简动效v1] [--force]");

const article = resolveArticle(q.split("@")[0]);
const version = resolveVersion(article, q.split("@")[1] ?? values["--version"]);
// 个别历史章节只剩成片，缺少源稿。不能把剩余章节拼成不完整的全片覆盖原交付。
if (version && parseInt(readVersion(article, version)["历史成片"] ?? "0", 10) > 0)
  die(`「${article}/${version}」有仅存成片的历史章节，完整全片已保留在 out/，请查看 版本一览.md；补齐历史源稿前停止合并，避免只拼现存稿件而漏章。`);
const chapters = chapterOrder(listVersionChapters(article, version));
if (!chapters.length) die(`「${article}」${version ? `的版本「${version}」` : ""}下还没有章节`);
if (articleStyle(article, version) !== "v1" || /纯文字/.test(version)) die("正式合并只支持极简动效 V1；历史纯文字成片原样保留，请在新版本重做。");

// 各章按自己当前的风格找成片：换风格重做后旧成片还在，只拼当前风格那一支
const styleOf = (dir: string) => {
  try {
    return episodeStyle(loadScript(dir).meta);
  } catch {
    return "?";
  }
};
const parts = chapters.map((name) => {
  const dir = `${article}/${version ? `${version}/` : ""}${name}`;
  const style = styleOf(dir);
  return { name, dir, style, file: outputOf(epPath(dir, "out"), name, style) };
});
const missing = parts.filter((p) => !p.file);
if (missing.length)
  die(
    `缺当前风格的成片，先逐章渲染：\n` +
      missing.map((p) => `  ${p.name}（${p.style}；npm run render -- ${p.dir}）`).join("\n"),
  );
const ready = parts.map((p) => ({ ...p, file: p.file! }));

const probed = ready.map((p) => ({ ...p, info: probe(p.file), outro: outroOf(p.file) }));
const errors = checkCompatible(probed.map((p) => ({ name: p.name, info: p.info })));
if (errors.length) die(`各章成片参数不一致，无法直接拼接：\n${errors.join("\n")}`);

// 片尾卡在每章成片末尾都有一张，合并全片时只保留最后一章的；旧成片没有片尾（manifest 无该字段）则不动
const keeps = probed.map((p, i) => {
  const trim = i < probed.length - 1 ? Math.min(p.outro, Math.max(0, p.info.duration - 1)) : 0;
  return { ...p, trim, keep: p.info.duration - trim };
});
const want = keeps.reduce((n, k) => n + k.keep, 0);
const trimming = keeps.some((k) => k.trim > 0);
if (trimming)
  console.log(
    `片尾卡：合并时去掉各章末尾（${keeps
      .filter((k) => k.trim > 0)
      .map((k) => `${k.name.match(/^\d+-\d+/)?.[0] ?? k.name} ${k.trim.toFixed(1)}s`)
      .join("、")}），只保留最后一章的那一张`,
  );

const styles = parts.map((p) => p.style);
if (new Set(styles).size > 1)
  console.warn(
    `提示 各章风格不同（${parts.map((p, i) => `${p.name.match(/^\d+-\d+/)?.[0]} ${styles[i]}`).join("、")}），` +
      "合并后画面会跳；全自动模式应全篇统一风格。",
  );

// 成片比输入旧，说明改过稿子但没重渲，拼进去会是旧画面
const stale = ready.filter((p) => {
  const audio = ["mp3", "wav", "m4a"].map((ext) => epPath(p.dir, "字幕", `配音.${ext}`)).find((f) => fs.existsSync(f));
  const sources = ["script.md", "朗读稿.txt", "朗读稿.演出.txt", "字幕/逐字.json"]
    .map((f) => epPath(p.dir, f))
    .concat(audio ? [audio] : [])
    .filter((f) => fs.existsSync(f));
  return Math.max(...sources.map((f) => fs.statSync(f).mtimeMs)) > fs.statSync(p.file).mtimeMs;
});
if (stale.length)
  console.warn(
    `提示 以下章节成片早于稿件或配音，可能不是最新，先重渲再合并：\n` +
      stale.map((p) => `  ${p.dir}（npm run render -- ${p.dir}）`).join("\n"),
  );

const outDir = epPath(article, "out");
const out = outputFor(outDir, filmBase(article, version), articleStyle(article, version));
const newest = Math.max(...ready.map((p) => fs.statSync(p.file).mtimeMs));
if (!force && fs.existsSync(out) && fs.statSync(out).mtimeMs >= newest) {
  console.log(`已是最新：${out}（加 --force 可重新合并）`);
  setStatus(article, "阶段", "已整合");
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });
const listPath = path.join(outDir, ".concat.txt");
const tmp = path.join(outDir, `.${articleName(article)}.merging.mp4`);
console.log(`合并 ${parts.length} 章（合计 ${mmss(want)}）→ ${path.basename(out)} …`);

try {
  fs.writeFileSync(listPath, concatList(ready.map((p) => p.file)));
  const audio = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart"];
  if (trimming) {
    // 有片尾要裁：各章按 keep 秒数截断后一次拼接。截断点不在关键帧上，只能重新编码视频
    const inputs = keeps.flatMap((k) => ["-i", k.file]);
    const chains = keeps
      .map((k, i) =>
        `[${i}:v]trim=start=0:end=${k.keep.toFixed(3)},setpts=PTS-STARTPTS[v${i}];` +
        `[${i}:a]atrim=start=0:end=${k.keep.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`,
      )
      .join(";");
    const pads = keeps.map((_, i) => `[v${i}][a${i}]`).join("");
    ffmpeg(["-y", "-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", `${chains};${pads}concat=n=${keeps.length}:v=1:a=1[vout][aout]`,
      "-map", "[vout]", "-map", "[aout]", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
      "-r", String(FPS), ...audio, tmp]);
  } else {
    const base = [
      "-y", "-hide_banner", "-loglevel", "error",
      "-f", "concat", "-safe", "0", "-i", listPath,
      "-map", "0:v:0", "-map", "0:a:0",
    ];
    try {
      ffmpeg([...base, "-c:v", "copy", ...audio, tmp]);
    } catch (err) {
      console.warn(`视频流直接复制失败（${(err as Error).message.split("\n")[0]}），改为重新编码视频，会慢一些…`);
      ffmpeg([...base, "-c:v", "libx264", "-preset", "medium", "-crf", "18", ...audio, tmp]);
    }
  }

  const merged = probe(tmp);
  const tolerance = Math.max(1.5, want * 0.002);
  if (Math.abs(merged.duration - want) > tolerance)
    throw new Error(`合并后时长 ${merged.duration.toFixed(2)}s 与各章合计 ${want.toFixed(2)}s 相差过大`);
  if (merged.video.width !== probed[0].info.video.width || merged.video.height !== probed[0].info.video.height)
    throw new Error("合并后画面尺寸异常");

  fs.rmSync(out, { force: true });
  fs.renameSync(tmp, out);

  const sha = (f: string) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");
  fs.writeFileSync(
    out + ".manifest.json",
    JSON.stringify(
      {
        mergedAt: new Date().toISOString(),
        composition: "concat",
        style: articleStyle(article, version),
        styleId: STYLE_ID,
        version,
        language: readVersion(article, version)["语言代码"] ?? languageOfVersion(version),
        sources: probed.map((p, i) => ({
          chapter: p.name,
          file: path.basename(p.file),
          sha256: sha(p.file),
          duration: round(p.info.duration),
          trimmed: round(keeps[i].trim),
          style: styles[i],
          styleId: STYLE_ID,
        })),
        totalDuration: round(want),
        outputDuration: round(merged.duration),
        ffmpeg: ffmpegVersion(),
        dependencies: sha(path.join(ROOT, "package-lock.json")),
      },
      null,
      2,
    ),
  );
  setStatus(article, "阶段", "已整合");
  console.log(`完成：${out}（${mmss(merged.duration)}，${(fs.statSync(out).size / 1024 / 1024).toFixed(1)} MB）`);
} catch (err) {
  fs.rmSync(tmp, { force: true });
  die(`合并失败：${(err as Error).message}`);
} finally {
  fs.rmSync(listPath, { force: true });
}

/** 成片 manifest 里记录的片尾卡帧数；旧成片没有该字段，按 0（没有片尾）处理 */
function outroOf(file: string): number {
  try {
    const frames = Number(JSON.parse(fs.readFileSync(file + ".manifest.json", "utf8"))?.outroFrames);
    return Number.isFinite(frames) && frames > 0 ? frames / FPS : 0;
  } catch {
    return 0;
  }
}

function probe(file: string): MediaInfo {
  try {
    const json = JSON.parse(
      execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], {
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
      }),
    );
    return parseProbe(json);
  } catch (err: any) {
    if (err.status === 127) die("找不到 ffprobe 命令，请先安装 ffmpeg（含 ffprobe）");
    die(`无法读取 ${file}：${(err as Error).message}`);
  }
}

function ffmpeg(args: string[]) {
  try {
    execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
  } catch (err: any) {
    if (err.status === 127) die("找不到 ffmpeg 命令，请先安装 ffmpeg");
    throw new Error(err.stderr?.toString().trim() || err.message);
  }
}

function ffmpegVersion(): string {
  try {
    return execFileSync("ffmpeg", ["-version"], { encoding: "utf8" }).split("\n")[0].trim();
  } catch {
    return "unknown";
  }
}

function round(n: number) {
  return Number(n.toFixed(3));
}

function mmss(t: number) {
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
}
