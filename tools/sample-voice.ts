// 暗调样片配音：npx tsx tools/sample-voice.ts
// 读 darkSample.md → 生成朗读稿.txt → Edge TTS（云健）→ faster-whisper 逐字 →
// 对齐成 darkSample.voice.ts，并把音频复制到 engine/public/dark-sample/voice.mp3。
// 改了样片稿件后重跑一次，再重新 render 即可。
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseScript } from "../engine/src/script/parse";
import { alignVoice, mapScreens, type Word } from "../engine/src/script/sync";
import { ROOT } from "./lib";

const SAMPLE_DIR = path.join(ROOT, "episodes", "_暗调样片");
const SCRIPT = path.join(ROOT, "engine/src/experiment/darkSample.md");
const VOICE_TS = path.join(ROOT, "engine/src/experiment/darkSample.voice.ts");
const AUDIO_PUBLIC = path.join(ROOT, "engine/public/dark-sample/voice.mp3");
const ASR = "D:/WorkSpace/asr";
const PY = "D:/WorkSpace/asr-venv/Scripts/python.exe";
const VOICE = "zh-CN-YunjianNeural";

const subtitles = path.join(SAMPLE_DIR, "字幕");
fs.mkdirSync(subtitles, { recursive: true });
fs.mkdirSync(path.dirname(AUDIO_PUBLIC), { recursive: true });

const script = parseScript(fs.readFileSync(SCRIPT, "utf8"));
const narration = script.screens.map((s) => s.spoken).join("\n") + "\n";
const narrationPath = path.join(SAMPLE_DIR, "朗读稿.txt");
fs.writeFileSync(narrationPath, narration);

const audio = path.join(subtitles, "配音.mp3");
console.log("生成配音（云健）…");
execFileSync(
  "edge-tts",
  ["--voice", VOICE, "--rate", "+0%", "--pitch", "+0Hz", "--file", narrationPath, "--write-media", audio],
  { stdio: "inherit" },
);

const wordsPath = path.join(subtitles, "逐字.json");
console.log("识别逐字（几分钟）…");
execFileSync(PY, ["-I", `${ASR}/dump_words.py`, audio, wordsPath], { stdio: "inherit" });

const words: Word[] = JSON.parse(fs.readFileSync(wordsPath, "utf8"));
const aligned = alignVoice(narration, words);
const voice = mapScreens(script, aligned);
const lost = voice.screens.filter((s) => !s).length;
console.log(
  `对齐 ${Math.round(aligned.coverage * 100)}%，缺段 ${aligned.missing.length}，无法对上的屏 ${lost}`,
);
voice.issues.forEach((i) => console.log(`第${i.line}行 ${i.msg}`));

const out =
  "// 自动生成：由 朗读稿.txt + 字幕/逐字.json 对齐得到，勿手改。\n" +
  'import type { VoiceMap } from "../script/sync";\n\n' +
  `export const DARK_VOICE: VoiceMap = ${JSON.stringify(voice, null, 2)};\n`;
fs.writeFileSync(VOICE_TS, out);
fs.copyFileSync(audio, AUDIO_PUBLIC);
console.log(`完成：${AUDIO_PUBLIC}`);
if (lost) process.exit(1);
