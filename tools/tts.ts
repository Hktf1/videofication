import { splitByLength } from "./split-text";
import { speechSettings } from "./language";
// 自动配音：npm run tts -- 01-1 [--dry] [--plain]
//       npm run tts -- 01            给文章下所有章节配音
//       npm run tts -- 01 --chapter 2 只给第 2 章配音
// 读 朗读稿.txt（全篇一个语速），或 朗读稿.演出.txt（逐句语速/音调/音色 + 停顿），
// 生成 字幕/配音.mp3。需要：pip install edge-tts、ffmpeg
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { die, epPath, parseArgs, resolveChapters } from "./lib";
import {
  describePerformance,
  describeStyle,
  MAX_SEGMENT_CHARS,
  parsePerformance,
  type Performance,
  type VoiceStyle,
} from "./perform";

const RATE = "+0%"; // 语速：-50% 到 +100%，0% 是正常
const PITCH = "+0Hz"; // 音调：-50Hz 到 +50Hz
const VOLUME = "+0%"; // 音量：-100% 到 +100%

// edge-tts 每段自带约 0.2s 段首、0.9s 段尾的静音。不裁掉的话，每处分段点的
// 真实静音 = 段尾 0.9 + 设计的停顿 + 段首 0.2，设计的分层会被 1.1s 的固定留白抹平。
const TRIM_HEAD_MS = 30; // 段首留白（保住起音，不要裁到字上）
const TRIM_TAIL_MS = 50; // 段尾留白（保住尾音的衰减）
const TRIM_RESIDUAL_MS = TRIM_HEAD_MS + TRIM_TAIL_MS;
const AR = ["-ar", "24000", "-ac", "1"]; // 和 edge-tts 输出一致，合并全片时才不会因参数不同被拒

if (process.argv.includes("--ssml"))
  die("--ssml 已移除：Edge TTS 不接受 SSML，标签会被当字念出来。逐句控制请写 朗读稿.演出.txt，见 docs/配音情绪控制.md");

const { positional, flags, values } = parseArgs(process.argv.slice(2));
const dry = flags.has("--dry");
const forcePlain = flags.has("--plain");
const chapterNum = values["--chapter"] !== undefined ? parseInt(values["--chapter"], 10) : null;
if (chapterNum !== null && !Number.isFinite(chapterNum)) die("--chapter 后面要跟章节号，例如 --chapter 2");

const targets = resolveChapters(positional[0], chapterNum, values["--version"]);

for (const dir of targets) run(dir);

if (targets.length === 1) {
  console.log(`接下来跑：npm run voice -- ${targets[0]}`);
} else {
  console.log(`接下来跑：npm run voice -- ${positional[0]}${values["--version"] ? ` --version ${values["--version"]}` : ""}`);
}

function run(dir: string) {
  const audioDir = epPath(dir, "字幕");
  fs.mkdirSync(audioDir, { recursive: true });

  const narrPath = epPath(dir, "朗读稿.txt");
  if (!fs.existsSync(narrPath)) die(`${dir} 缺 朗读稿.txt`);
  const narration = fs.readFileSync(narrPath, "utf8");
  if (!narration.trim()) die(`${dir} 朗读稿为空`);

  const perfPath = epPath(dir, "朗读稿.演出.txt");
  if (fs.existsSync(perfPath) && !forcePlain) {
    runPerformance(dir, audioDir, narration, fs.readFileSync(perfPath, "utf8"));
    return;
  }
  if (fs.existsSync(perfPath) && forcePlain) console.log("按 --plain 忽略 朗读稿.演出.txt，全篇用同一套语速音色");
  runPlain(dir, audioDir, narration);
}

/** 默认模式：整篇一套音色语速，按 300 字切段生成再拼接 */
function runPlain(dir: string, audioDir: string, text: string) {
  const style: VoiceStyle = { voice: speechSettings(dir).voice, rate: RATE, pitch: PITCH, volume: VOLUME };
  const chunks = splitByLength(text, 300);
  if (dry) {
    console.log(`默认模式（${dir}）：${describeStyle(style)}，${chunks.length} 段（按 300 字切）`);
    console.log("--dry：只预览，不调用 TTS。逐句控制语速/停顿请写 朗读稿.演出.txt");
    return;
  }
  console.log(`正在生成配音（${dir}，${describeStyle(style)}，${chunks.length} 段）…`);

  const rels: string[] = [];
  chunks.forEach((chunk, i) => {
    // 切点都在句号/分号上，补一段接近句号自带的停顿（约 700ms），别让两句黏在一起
    if (i) {
      const gap = `part-gap${i}.wav`;
      silence(audioDir, gap, 700 - TRIM_RESIDUAL_MS);
      rels.push(gap);
    }
    const mp3 = path.join(audioDir, `part${i}.mp3`);
    const rel = `part${i}.wav`;
    synth(style, chunk, mp3);
    trim(mp3, path.join(audioDir, rel));
    console.log(`  [${i + 1}/${chunks.length}] ${preview(chunk)}`);
    rels.push(rel);
  });

  const audioPath = path.join(audioDir, "配音.mp3");
  concat(audioDir, rels, audioPath);
  rels.forEach((r) => fs.unlinkSync(path.join(audioDir, r)));
  chunks.forEach((_, i) => fs.unlinkSync(path.join(audioDir, `part${i}.mp3`)));
  console.log(`✓ 配音已生成：${audioPath}`);
}

type Job =
  | { kind: "text"; style: VoiceStyle; text: string }
  | { kind: "pause"; ms: number };

function sameStyle(a: VoiceStyle, b: VoiceStyle) {
  return a.voice === b.voice && a.rate === b.rate && a.pitch === b.pitch && a.volume === b.volume;
}

/**
 * 整段合成：相邻、参数相同、中间没有停顿的句子并成一次调用。
 * 逐句单独合成时模型看不到上下文，每句都重新起调，听感像一条条念清单；
 * 合并成意群后语调能带着上一句走，段落内的句号、逗号仍由 Edge TTS 自己处理。
 */
function groupParts(perf: Performance): Job[] {
  const jobs: Job[] = [];
  for (const p of perf.parts) {
    if (p.kind === "pause") {
      jobs.push({ kind: "pause", ms: p.ms });
      continue;
    }
    const last = jobs.at(-1);
    if (last?.kind === "text" && sameStyle(last.style, p.style) && last.text.length + p.text.length <= MAX_SEGMENT_CHARS) {
      last.text += p.text;
      continue;
    }
    jobs.push({ kind: "text", style: p.style, text: p.text });
  }
  return jobs;
}

/** 演出模式：逐行分段，每段单独调语速/音调/音色，段间插停顿 */
function runPerformance(dir: string, audioDir: string, narration: string, src: string) {
  const perf = parsePerformance(src, narration, speechSettings(dir).voice);
  console.log(`演出模式（${dir}，朗读稿.演出.txt）：${describePerformance(perf)}`);
  perf.warnings.forEach((w) => console.log(`提示 第${w.line}行：${w.msg}`));
  if (perf.errors.length) {
    perf.errors.forEach((e) => console.error(e.line ? `第${e.line}行：${e.msg}` : e.msg));
    die("朗读稿.演出.txt 有错，未生成配音。");
  }
  if (dry) {
    printPlan(perf);
    console.log("--dry：只预览，不调用 TTS。");
    return;
  }

  const cacheDir = path.join(audioDir, ".tts");
  fs.mkdirSync(cacheDir, { recursive: true });
  const used = new Set<string>();
  const rels: string[] = [];
  const grouped = groupParts(perf);
  const jobs = grouped.reduce(
    (a, p) => a + (p.kind === "text" ? splitByLength(p.text, MAX_SEGMENT_CHARS).length : 1),
    0
  );
  let done = 0;

  for (const part of grouped) {
    if (part.kind === "pause") {
      // 相邻两段各自已留了段尾 50ms + 段首 30ms，插入的静音要扣掉，
      // 这样写在演出稿里的 800ms 就是实际听到的 800ms
      const ms = part.ms - TRIM_RESIDUAL_MS;
      if (ms <= 0) {
        done++;
        continue;
      }
      const file = `silence-${ms}ms.wav`;
      ensureWav(cacheDir, file, () => silence(cacheDir, file, ms));
      used.add(file);
      rels.push(`.tts/${file}`);
      console.log(`  [${++done}/${jobs}] 停顿 ${part.ms}ms`);
      continue;
    }

    for (const chunk of splitByLength(part.text, MAX_SEGMENT_CHARS)) {
      const h = hash(part.style, chunk);
      const mp3Name = `${h}.mp3`;
      const wavName = `${h}-t${TRIM_HEAD_MS}-${TRIM_TAIL_MS}.wav`;
      const mp3Abs = path.join(cacheDir, mp3Name);
      const wavAbs = path.join(cacheDir, wavName);
      const hadWav = isNonEmpty(wavAbs);
      if (!isNonEmpty(mp3Abs)) synth(part.style, chunk, mp3Abs);
      if (!hadWav) trim(mp3Abs, wavAbs); // 裁剪参数变了就重裁，不必重配
      used.add(mp3Name);
      used.add(wavName);
      rels.push(`.tts/${wavName}`);
      console.log(`  [${++done}/${jobs}] ${describeStyle(part.style)}${hadWav ? "（缓存）" : ""} ${preview(chunk)}`);
    }
  }

  const audioPath = path.join(audioDir, "配音.mp3");
  concat(audioDir, rels, audioPath);
  prune(cacheDir, used);
  console.log(`✓ 配音已生成：${audioPath}（${grouped.filter((j) => j.kind === "text").length} 次合成）`);
}

/** 调 edge-tts 生成一段 mp3（文本先写临时文件，避免命令行引号和编码问题） */
function synth(style: VoiceStyle, text: string, outPath: string) {
  const tmp = `${outPath}.txt`;
  fs.writeFileSync(tmp, text);
  try {
    execFileSync(
      "edge-tts",
      [
        "--voice", style.voice,
        `--rate=${style.rate}`,
        `--pitch=${style.pitch}`,
        `--volume=${style.volume}`,
        "--file", tmp,
        "--write-media", outPath,
        "--no-progress",
      ],
      { stdio: "inherit" }
    );
  } catch (err: any) {
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    if (err.status === 127) die("找不到 edge-tts 命令。请先安装：pip install edge-tts");
    die(`TTS 失败：${err.message}`);
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}

/** 裁掉 edge-tts 输出的首尾静音，转成和全片一致的 WAV，供按样本无损拼接 */
function trim(srcMp3: string, outWav: string) {
  const cut = (keep: number) =>
    `silenceremove=start_periods=1:start_threshold=-50dB:start_silence=${(keep / 1000).toFixed(3)}`;
  try {
    execFileSync(
      "ffmpeg",
      ["-y", "-loglevel", "error", "-i", srcMp3, "-af", `${cut(TRIM_HEAD_MS)},areverse,${cut(TRIM_TAIL_MS)},areverse`, ...AR, "-c:a", "pcm_s16le", outWav],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
  } catch (err: any) {
    if (err.status === 127) die("找不到 ffmpeg 命令，请先安装 ffmpeg");
    die(`裁剪静音失败：${err.stderr?.toString().trim() || err.message}`);
  }
}

/** 生成指定时长的静音 WAV，参数与裁剪后的片段一致才能拼接 */
function silence(dir: string, file: string, ms: number) {
  const out = path.join(dir, file);
  try {
    execFileSync(
      "ffmpeg",
      ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", (ms / 1000).toFixed(3), ...AR, "-c:a", "pcm_s16le", out],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
  } catch (err: any) {
    if (err.status === 127) die("找不到 ffmpeg 命令，请先安装 ffmpeg");
    die(`生成静音失败：${err.stderr?.toString().trim() || err.message}`);
  }
}

function isNonEmpty(f: string) {
  return fs.existsSync(f) && fs.statSync(f).size > 0;
}

/** 缓存文件缺失或为 0 字节时才重新生成 */
function ensureWav(dir: string, file: string, make: () => void) {
  const abs = path.join(dir, file);
  if (isNonEmpty(abs)) return;
  make();
}

/** 按顺序拼接 WAV 片段，最后统一编码一次 MP3（分段各自编码会在接缝处留帧误差） */
function concat(audioDir: string, rels: string[], outPath: string) {
  if (!rels.length) die("没有可拼接的音频片段");
  const listPath = path.join(audioDir, "concat.txt");
  fs.writeFileSync(listPath, rels.map((r) => `file '${r}'`).join("\n") + "\n");
  try {
    execFileSync(
      "ffmpeg",
      ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listPath, ...AR, "-c:a", "libmp3lame", "-b:a", "48k", outPath],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
  } catch (err: any) {
    if (err.status === 127) die("找不到 ffmpeg 命令，请先安装 ffmpeg");
    die(`拼接失败：${err.stderr?.toString().trim() || err.message}`);
  } finally {
    if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
  }
}

/** 这次没用到的缓存片段删掉，避免字改来改去越积越多 */
function prune(dir: string, used: Set<string>) {
  for (const f of fs.readdirSync(dir)) if (!used.has(f)) fs.unlinkSync(path.join(dir, f));
}

function hash(style: VoiceStyle, text: string) {
  return createHash("sha1")
    .update(JSON.stringify([style.voice, style.rate, style.pitch, style.volume, text]))
    .digest("hex")
    .slice(0, 16);
}

function preview(text: string) {
  const t = text.replace(/\s+/g, " ");
  const chars = [...t];
  return chars.length > 24 ? `${chars.slice(0, 24).join("")}…` : t;
}

function printPlan(perf: Performance) {
  const grouped = groupParts(perf);
  const calls = grouped.filter((j) => j.kind === "text").length;
  console.log(`分段（${calls} 次合成；相邻、参数相同且中间没有停顿的句子已合并）：`);
  let i = 0;
  for (const j of grouped) {
    if (j.kind === "pause") console.log(`  ${String(++i).padStart(3)}    ── 停顿 ${j.ms}ms`);
    else console.log(`  ${String(++i).padStart(3)}    ${describeStyle(j.style).padEnd(22)} ${preview(j.text)}`);
  }
}
