// 只准备独立 A/B 实验素材：读取现有章节，冻结基线与时间戳，复用音频。
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {parseScript, plainText, FPS} from '../engine/src/script/parse';
import {alignVoice, mapScreens, type Word} from '../engine/src/script/sync';
import type {SceneCue} from '../engine/src/script/scene';

const root = process.cwd();
const source = path.join(root, 'episodes/待发/01-认知行动/中文-极简动效v1-原文-3069a19336/01-1-全文');
const dest = path.join(root, 'engine/src/experiment/visual-polish-ab');
const assets = path.join(root, 'engine/public/experiments/visual-polish-ab');
fs.mkdirSync(assets, {recursive: true});
fs.mkdirSync(path.join(dest, 'snapshot'), {recursive: true});
const read = (file: string) => fs.readFileSync(path.join(source, file), 'utf8');
const script = parseScript(read('script.md'));
const aligned = alignVoice(read('朗读稿.txt'), JSON.parse(read('字幕/逐字.json')) as Word[]);
const voice = mapScreens(script, aligned);
const first = script.screens.findIndex(s => s.text.startsWith('大多数人所谓'));
const last = script.screens.findIndex(s => s.text.includes('而是沉入水底的锚'));
if (first < 0 || last <= first || voice.issues.length || aligned.coverage < .9) throw new Error('片段定位或配音对齐失败');
const start = Math.max(0, Math.floor((voice.screens[first]!.s - .12) * FPS) / FPS);
const finish = Math.min(voice.screens[last]!.e + .48, (voice.screens[last + 1]?.s ?? Infinity) - .05);
const durationInFrames = Math.round((finish - start) * FPS);
const totalSeconds = durationInFrames / FPS;
const cues: SceneCue[] = script.screens.slice(first, last + 1).map((screen, i) => {
  const timing = voice.screens[first + i]!;
  const at = i === 0 ? 0 : Math.max(0, Math.round((timing.s - start - .12) * FPS));
  const next = voice.screens[first + i + 1];
  const end = i === last - first ? durationInFrames : Math.round((next!.s - start - .12) * FPS);
  return {index: first + i, at, frames: end - at, text: plainText(screen.text),
    chars: timing.chars.map(t => Math.round((t - start) * FPS) - at),
    speakEnd: Math.round((timing.e - start) * FPS) - at,
    beat: i === 0 ? {section: '扎根', step: '对照'} : screen.scene};
});
if (cues.some(c => c.frames <= 0)) throw new Error('字幕时序无效');
const captions = cues.map(c => ({text: c.text, startMs: c.at / FPS * 1000,
  endMs: (c.at + c.frames) / FPS * 1000,
  timestampMs: (c.at + c.chars[0]) / FPS * 1000, confidence: null}));
const hashes: Record<string, string> = {};
for (const file of ['script.md', '朗读稿.txt', '朗读稿.演出.txt', '画面.tsx', '字幕/配音.mp3', '字幕/逐字.json']) {
  hashes[file] = createHash('sha256').update(fs.readFileSync(path.join(source, file))).digest('hex');
}
const data = {source: path.relative(root, source).replaceAll('\\', '/'), sourceHashes: hashes,
  selection: {method: 'PowerShell Get-Random，一次抽取', candidates: ['收益与亏损', '学习与即时快乐', '印象与锚定', '真正看见两条路', '主动与被迫'], selected: '印象与锚定'},
  audioStartSeconds: start, audioEndSeconds: start + totalSeconds, durationInFrames, fps: FPS,
  coverage: aligned.coverage, cues, captions};
fs.writeFileSync(path.join(dest, 'excerpt.json'), JSON.stringify(data, null, 2) + '\n');
fs.writeFileSync(path.join(dest, '原稿摘录.txt'), script.screens.slice(first, last + 1).map(s => plainText(s.text)).join('\n') + '\n');
for (const file of ['script.md', '朗读稿.txt', '朗读稿.演出.txt']) fs.copyFileSync(path.join(source, file), path.join(dest, 'snapshot', file));
fs.copyFileSync(path.join(source, '画面.tsx'), path.join(dest, 'snapshot', '画面.tsx.txt'));
fs.writeFileSync(path.join(dest, 'BaselineScene.tsx'), read('画面.tsx').replaceAll('../../../../../engine/src/', '../../'));
const cut = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(start), '-i',
  path.join(source, '字幕/配音.mp3'), '-t', String(totalSeconds), '-ar', '48000', '-ac', '1',
  '-c:a', 'pcm_s16le', path.join(assets, 'voice.wav')], {stdio: 'inherit', shell: false});
if (cut.status !== 0) throw new Error('音频截取失败');
console.log(JSON.stringify({selected: data.selection.selected, seconds: totalSeconds, frames: durationInFrames,
  coverage: aligned.coverage, captions: cues.length, start, lines: cues.map(c => c.text)}, null, 2));
