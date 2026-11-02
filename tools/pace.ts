// 节奏谱自查：npm run pace -- 03-2（也接受文章号 03）
// 按配音时间戳展开每屏的实际时长，用条形图看长短分布。
// 只读，不写入任何文件。
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { alignVoice, mapScreens } from "../engine/src/script/sync";
import { buildTimeline } from "../engine/src/script/timeline";
import { FPS } from "../engine/src/script/parse";
import { epPath, loadScript, parseArgs, resolveChapters } from "./lib";

const SHORT = 1.6; // 低于这个时长的屏，除非是刻意的加速段，否则读起来会闪
const MIN_GAP = 0.25; // 相邻字之间的静音超过这个值才算一处停顿
const FLAT_SEC = 8; // 连续语音超过这么久没有停顿，听感会掉进「催眠区」

const { positional, values } = parseArgs(process.argv.slice(2));
for (const dir of resolveChapters(positional[0], null, values["--version"])) {
  const script = loadScript(dir);
  const words = JSON.parse(fs.readFileSync(epPath(dir, "字幕", "逐字.json"), "utf8"));
  const voice = mapScreens(script, alignVoice(fs.readFileSync(epPath(dir, "朗读稿.txt"), "utf8"), words));
  const { items, total } = buildTimeline(script, voice);

  console.log(`\n== ${dir}  ${script.screens.length} 屏  ${(total / FPS).toFixed(1)}s ==`);
  for (const it of items) {
    const d = it.frames / FPS;
    const bar = "█".repeat(Math.max(1, Math.round(d * 3)));
    const mark = d < SHORT ? " ←" : "";
    console.log(
      `${(it.from / FPS).toFixed(1).padStart(6)}s ${String(it.index + 1).padStart(3)} ${d.toFixed(1).padStart(5)}s ${bar.padEnd(18)} ${it.screen.text.slice(0, 22)}${mark}`
    );
  }

  const ds = items.map((it) => it.frames / FPS);
  const avg = ds.reduce((a, b) => a + b, 0) / ds.length;
  const sd = Math.sqrt(ds.reduce((a, b) => a + (b - avg) ** 2, 0) / ds.length);
  const short = ds.filter((d) => d < SHORT).length;
  console.log(
    `平均 ${avg.toFixed(2)}s  标准差 ${sd.toFixed(2)}  最短 ${Math.min(...ds).toFixed(1)}s  最长 ${Math.max(...ds).toFixed(1)}s  过短 ${short} 屏`
  );
  printVoiceRhythm(dir, words);
}

type Word = { w: string; s: number; e: number };
type Block = { start: number; end: number; chars: number };

/**
 * 声音本身的节奏：屏长只反映字幕停留，语速起伏和停顿分层看不出来。
 * 静音用 ffmpeg 从配音里直接测——ASR 的字时间戳会把静音并进词尾，
 * 按 s-e 算间隔会把句号停顿整个丢掉。文字部分仍按字时间戳统计语速。
 */
function printVoiceRhythm(dir: string, words: Word[]) {
  const audio = ["mp3", "wav", "m4a"].map((x) => epPath(dir, "字幕", `配音.${x}`)).find((p) => fs.existsSync(p));
  if (!audio || !words?.length) return;

  const pauses = detectPauses(audio);
  if (!pauses.length) return;

  // 两块语音之间的空隙就是停顿；首尾的静音不算
  const blocks: Block[] = [];
  let from = 0;
  for (const p of pauses) {
    if (p.start - from > 0.05) blocks.push({ start: from, end: p.start, chars: 0 });
    from = p.start + p.dur;
  }
  const total = words.at(-1)!.e;
  if (total - from > 0.05) blocks.push({ start: from, end: total, chars: 0 });

  for (const w of words) {
    const mid = (w.s + w.e) / 2;
    const b = blocks.find((x) => mid >= x.start && mid < x.end);
    if (b) b.chars += [...w.w].length;
  }
  const spoken = blocks.filter((b) => b.chars > 0);
  if (spoken.length < 2) return;

  const rate = (b: Block) => b.chars / Math.max(0.1, b.end - b.start);
  // 短块（一两个字的残句）会把最高语速拉到没有意义的数字，只统计成句的语音块
  const rates = spoken.filter((b) => b.end - b.start >= 0.8 && b.chars >= 3).map(rate);
  if (!rates.length) return;
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  const spread = ((Math.max(...rates) - Math.min(...rates)) / mean) * 100;
  const longest = spoken.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a));
  const avgLen = spoken.reduce((a, b) => a + (b.end - b.start), 0) / spoken.length;

  const tier = (p: number) => (p < 0.5 ? "换气" : p < 0.75 ? "分句" : p < 0.9 ? "段落" : "转折");
  const count = (k: string) => pauses.filter((p) => tier(p.dur) === k).length;

  console.log("— 声音节奏 —");
  console.log(
    `  语音块 ${spoken.length} 个，平均 ${avgLen.toFixed(1)}s，最长 ${(longest.end - longest.start).toFixed(1)}s` +
      (longest.end - longest.start >= FLAT_SEC ? ` ← 平坦区（≥${FLAT_SEC}s 无停顿，听众会走神）` : "")
  );
  console.log(
    `  语速 ${Math.min(...rates).toFixed(1)}～${Math.max(...rates).toFixed(1)} 字/秒（均值 ${mean.toFixed(1)}，起伏 ${spread.toFixed(0)}%` +
      `${spread < 20 ? " ← 全章一个调" : ""}）`
  );
  console.log(
    `  停顿 ${pauses.length} 处：换气(<0.5s) ${count("换气")}、分句(0.5～0.75s) ${count("分句")}、` +
      `段落(0.75～0.9s) ${count("段落")}、转折(>0.9s) ${count("转折")}`
  );

  for (const b of spoken.filter((x) => x.end - x.start >= FLAT_SEC))
    console.log(`  ⚠ ${b.start.toFixed(1)}s 起连续 ${(b.end - b.start).toFixed(1)}s 无停顿、语速 ${rate(b).toFixed(1)} 字/秒`);
}

/** 配音里的静音段：ffmpeg silencedetect 把结果打到 stderr */
function detectPauses(audio: string) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", audio, "-af", `silencedetect=noise=-40dB:d=${MIN_GAP}`, "-f", "null", "-"], {
    encoding: "utf8",
  });
  const log = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const starts = [...log.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...log.matchAll(/silence_end: (-?[\d.]+)/g)].map((m) => Number(m[1]));
  return starts
    .map((start, i) => ({ start: Math.max(0, start), dur: (ends[i] ?? start) - start }))
    .filter((p) => p.dur >= MIN_GAP);
}
