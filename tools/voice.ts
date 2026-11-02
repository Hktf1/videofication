// 配音处理：npm run voice -- 01-1
//       npm run voice -- 01   处理文章下的所有章节
//   1. 字幕/配音.mp3 → 字幕/逐字.json（faster-whisper，脚本在 tools/asr；已有且比配音新则跳过，加 --redo 重跑）
//   2. 对稿：识别结果 ↔ 朗读稿.txt 逐字比对，报告配音缺了 / 多了哪些段（同音错字不算）
//   3. 生成 字幕/校正.srt（文字取 script.md 的每一屏，时间取配音）
// 有缺段时退出码为 1：先补配，别往下做。
import { execFileSync } from "node:child_process";
import { speechSettings } from "./language";
import fs from "node:fs";
import path from "node:path";
import { plainText } from "../engine/src/script/parse";
import { alignVoice, mapScreens, type Word } from "../engine/src/script/sync";
import { die, epPath, loadScript, parseArgs, resolveChapters, ROOT } from "./lib";

const ASR = path.join(ROOT, "tools/asr");
const PY = "D:/WorkSpace/asr-venv/Scripts/python.exe";

const { positional, flags, values } = parseArgs(process.argv.slice(2));
const redo = flags.has("--redo");
const targets = resolveChapters(positional[0], null, values["--version"]);

let anyBad = false;
for (const dir of targets) {
  if (targets.length > 1) console.log(`\n== ${dir} ==`);
  anyBad = run(dir) || anyBad;
}
process.exit(anyBad ? 1 : 0);

function run(dir: string): boolean {
  const audio = ["mp3", "wav", "m4a"]
    .flatMap((x) => [epPath(dir, "字幕", `配音.${x}`), ...Array.from({ length: 10 }, (_, i) => epPath(dir, "字幕", `配音-章${i + 1}.${x}`))])
    .find((p) => fs.existsSync(p));
  const wordsPath = epPath(dir, "字幕", "逐字.json");
  const narrPath = epPath(dir, "朗读稿.txt");
  const {language} = speechSettings(dir);
  const settingsPath = epPath(dir, "字幕", "识别配置.json");
  let previousLanguage = 'zh'; // 无配置记录的旧识别结果来自原中文流程
  if (fs.existsSync(settingsPath)) {
    try {previousLanguage = JSON.parse(fs.readFileSync(settingsPath, 'utf8')).language;} catch {previousLanguage = '';}
  }
  if (!fs.existsSync(narrPath)) die(`${dir} 缺 朗读稿.txt`);

  if (audio && (redo || previousLanguage !== language || !fs.existsSync(wordsPath) || fs.statSync(wordsPath).mtimeMs < fs.statSync(audio).mtimeMs)) {
    console.log("识别配音中（几分钟）…");
    execFileSync(PY, ["-I", `${ASR}/dump_words.py`, audio, wordsPath, language], { stdio: "inherit" });
    fs.writeFileSync(settingsPath, JSON.stringify({language}, null, 2));
  } else if (!audio) {
    if (!fs.existsSync(wordsPath)) die(`把配音放到 episodes/${dir}/字幕/配音.mp3`);
    console.log("提示 没有 字幕/配音.mp3，只用已有的 逐字.json 对稿（预览不会有声音）");
  }

  const words: Word[] = JSON.parse(fs.readFileSync(wordsPath, "utf8"));
  const al = alignVoice(fs.readFileSync(narrPath, "utf8"), words);
  const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

  console.log(`对稿：朗读稿 ${al.src.length} 字，配音对上 ${Math.round(al.coverage * 100)}%，配音长 ${mmss(words.at(-1)?.e ?? 0)}`);
  al.missing.forEach((m) => console.log(`缺段 ${mmss(m.at)} 附近，配音里没有：${m.text}`));
  al.misheard.forEach((m) => console.log(`识别错 ${mmss(m.at)}「${m.text}」听成「${m.heard}」（不影响对时间）`));
  al.extra.forEach((m) => console.log(`多出 ${mmss(m.at)} 配音里多了（或连续识别错）：${m.text}`));

  // 校正字幕：按 script.md 已做的屏
  const script = loadScript(dir);
  const { screens, issues } = mapScreens(script, al);
  issues.forEach((i) => console.log(`第${i.line}行 ${i.msg}`));
  const ts = (t: number) => {
    const ms = Math.round(t * 1000);
    const p = (n: number, w = 2) => String(n).padStart(w, "0");
    return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
  };
  const cues = script.screens.flatMap((s, i) => (screens[i] ? [{ s: screens[i]!.s, e: screens[i]!.e, t: plainText(s.text) }] : []));
  if (cues.length) {
    fs.writeFileSync(epPath(dir, "字幕", "校正.srt"), cues.map((c, k) => `${k + 1}\n${ts(c.s)} --> ${ts(c.e)}\n${c.t}\n`).join("\n"));
    console.log(`校正.srt：${cues.length} 条（按 script.md 已做的屏）`);
  }

  const bad = al.missing.length > 0 || al.extra.length > 0 || al.coverage < 0.9 || issues.length > 0 || screens.some(s => !s || s.e <= s.s);
  console.log(bad ? "配音或字幕对齐未通过：请核对以上问题后重新运行" : "配音完整，可以逐章对时间");
  return bad;
}
