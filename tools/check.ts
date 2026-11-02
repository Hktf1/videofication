import { preflight } from "./preflight";
import { speechSettings } from "./language";
// 检查处理稿，只输出结论：npm run check -- 01-1
//                 npm run check -- 01    检查文章下所有章节
import fs from "node:fs";
import path from "node:path";
import { brandOf, charCount, FPS, splitEmphasis } from "../engine/src/script/parse";
import { buildTimeline } from "../engine/src/script/timeline";
import { alignVoice, mapScreens } from "../engine/src/script/sync";
import { CHARS } from "../engine/src/style/theme";
import { resolveSfx, SFX, type SfxName } from "../engine/src/style/sfx";
import { epPath, loadScript, parseArgs, resolveChapters, ROOT } from "./lib";
import { parsePerformance } from "./perform";
import { isMotionStyle } from "../engine/src/script/motion";
import { checkInputContract } from "./input";

const { positional, flags, values } = parseArgs(process.argv.slice(2));
const targets = resolveChapters(positional[0], null, values["--version"]);

let anyProblems = false;
for (const dir of targets) {
  if (targets.length > 1) console.log(`\n== ${dir} ==`);
  anyProblems = run(dir) > 0 || anyProblems;
}
process.exit(anyProblems ? 1 : 0);

function run(dir: string): number {
  const script = loadScript(dir);
  const speech = speechSettings(dir);

  const problems: string[] = flags.has("--ready") ? preflight(dir) : script.errors.map((e) => `第${e.line}行：${e.msg}`);
  if (!flags.has("--ready")) {
    problems.push(...checkInputContract(dir));
    if (!isMotionStyle(script.meta) || /纯文字/.test(dir)) problems.push("纯文字风格已停用，请在独立的极简动效 V1 版本重做。");
  }
  const warns: string[] = [];
  let emph = 0;
  let holds = 0;
  let quotes = 0;
  let themes = 0;

  script.screens.forEach((s, i) => {
    const at = `第${s.line}行`;
    const n = charCount(s.text);
    if (!s.text) problems.push(`${at}：文字为空`);
    else if (n > CHARS.hardMax) problems.push(`${at}：${n} 字，一行放不下（上限 ${CHARS.hardMax}）`);
    else if (n > CHARS.max) warns.push(`${at}：${n} 字，建议 ≤${CHARS.max}`);
    if (/[【】]/.test(s.text) && (s.text.match(/【/g)?.length !== s.text.match(/】/g)?.length))
      problems.push(`${at}：【】不成对`);
    if (speech.language === 'zh' && /\s/.test(s.text)) problems.push(`${at}：字幕里有空格，改用标点或拆成两屏`);
    const e = splitEmphasis(s.text).filter((p) => p.em).length;
    if (e > 1) warns.push(`${at}：一屏 ${e} 处强调，建议只留一处`);
    if (e) emph++;
    if (s.hold) holds++;
    if (s.fx === "金句") quotes++;
    if (s.fx === "主旨") themes++;
    if (s.fx && e) warns.push(`${at}：${s.fx}和【】强调叠在一屏，焦点会打架，建议只留一种`);
    if (s.turn && !script.screens[i + 1]) problems.push(`${at}：转折 > 后面没有下一句`);
    for (const x of s.sfx) if (!resolveSfx(x)) problems.push(`${at}：未知标记「${x}」`);
  });

  const total = script.screens.length || 1;
  if (emph / total > 0.3) warns.push(`强调 ${emph} 屏（${Math.round((emph / total) * 100)}%），太多会失去重点，建议 ≤25%`);
  if (themes > 1) warns.push(`主旨 ${themes} 处，建议全篇只留 1 处`);
  if (quotes + themes > 5) warns.push(`金句+主旨 ${quotes + themes} 处，建议 3～5 处`);
  if (holds / total > 0.2) warns.push(`停留 ${holds} 屏，建议只给真正重要的观点`);

  // 背景音乐是整片的底噪，缺了会有大段绝对静音，按错误处理
  const bgmFile = `bgm/${script.meta["BGM"] ?? "default.mp3"}`;
  if (!fs.existsSync(path.join(ROOT, "engine/public", bgmFile)))
    problems.push(`缺背景音乐 engine/public/${bgmFile}（没有它会整片静音；npm run bgm 生成默认底噪）`);

  // 音效只要求处理稿真正标出来的那些；没有文件时标记会静默失效
  const usedSfx = [...new Set(script.screens.flatMap((s) => s.sfx).map(resolveSfx).filter((n): n is SfxName => !!n))];
  const missingSfx = usedSfx.filter((n) => !fs.existsSync(path.join(ROOT, "engine/public", SFX[n])));
  if (missingSfx.length) problems.push(`缺音效 ${missingSfx.map((n) => SFX[n]).join("、")}（已标记但不会响）`);

  // 有配音时按配音对时间；没有配音的屏仍按估算
  const narr = epPath(dir, "朗读稿.txt"), wj = epPath(dir, "字幕", "逐字.json");
  const hasAudio = ["mp3", "wav", "m4a"].some((x) =>
    fs.existsSync(epPath(dir, "字幕", `配音.${x}`)) ||
    Array.from({ length: 10 }, (_, i) => i + 1).some((n) => fs.existsSync(epPath(dir, "字幕", `配音-章${n}.${x}`)))
  );
  const voice = hasAudio && fs.existsSync(narr) && fs.existsSync(wj)
    ? mapScreens(script, alignVoice(fs.readFileSync(narr, "utf8"), JSON.parse(fs.readFileSync(wj, "utf8"))))
    : undefined;
  if (!voice) warns.push("还没有配音（字幕/配音.mp3 或 配音-章N.mp3），时长按 4 字/秒估算");
  else {
    const ok = voice.screens.filter(Boolean).length;
    warns.push(`配音对上 ${ok}/${script.screens.length} 屏${ok < script.screens.length ? "（其余按估算，详见 npm run voice）" : ""}`);
  }
  // 演出稿是配音的输入，也是每章的必做项（用户 2026-10-24 定）；缺了就报错
  const perfPath = epPath(dir, "朗读稿.演出.txt");
  if (!fs.existsSync(perfPath))
    problems.push("缺 朗读稿.演出.txt（每章必做，写法见 docs/配音情绪控制.md）");
  if (fs.existsSync(perfPath) && fs.existsSync(narr)) {
    const perf = parsePerformance(fs.readFileSync(perfPath, "utf8"), fs.readFileSync(narr, "utf8"), speech.voice);
    perf.errors.forEach((e) => problems.push(`朗读稿.演出.txt${e.line ? `第${e.line}行` : ""}：${e.msg}`));
    perf.warnings.forEach((w) => warns.push(`朗读稿.演出.txt 第${w.line}行：${w.msg}`));
  }

  const sec = Math.round(buildTimeline(script, voice).total / FPS);
  const chars = script.screens.reduce((a, s) => a + charCount(s.text), 0);
  const brand = brandOf(script.meta);
  const brandNote = [brand.watermark && "水印", brand.outro && "片尾"].filter(Boolean).join("、");

  console.log(`${dir}：${script.screens.length} 屏，${chars} 字，预计 ${Math.floor(sec / 60)}分${sec % 60}秒，强调 ${emph} 屏，停留 ${holds} 屏，金句 ${quotes}，主旨 ${themes}，署名 ${brandNote || "无"}`);
  warns.forEach((w) => console.log(`提示 ${w}`));
  problems.forEach((p) => console.log(`错误 ${p}`));
  console.log(problems.length ? `共 ${problems.length} 个错误` : flags.has("--ready") ? "导出检查通过" : "稿件格式通过（导出就绪检查：加 --ready）");
  return problems.length;
}
