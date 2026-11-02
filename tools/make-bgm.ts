// 生成极简环境底噪：npm run bgm [名称] [秒数]  → engine/public/bgm/<名称>.mp3
// 纯正弦叠加，所有分音频率和起伏周期都是 1/时长 的整数倍，循环点严格无缝。
// 没有人声、没有旋律钩子，只提供「房间里还有东西在响」的底噪。
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib";

// 默认输出 room-tone：default.mp3 已是用户指定的曲子（time is broken），不能被重新生成覆盖
const name = process.argv[2] ?? "room-tone";
const dur = Number(process.argv[3] ?? 90);
const SR = 44100;
const TAU = Math.PI * 2;
const N = Math.round(SR * dur);

// f：频率（Hz，须为整数）；a：相对音量；k：起伏周期数（每段时长内）；ph：相位；spread：左右声道各偏移的周期数
type Partial = { f: number; a: number; k: number; ph: number; spread: number };

const PARTIALS: Partial[] = [
  { f: 55, a: 0.30, k: 1, ph: 0.0, spread: 1 },   // 低频底
  { f: 78, a: 0.022, k: 2, ph: 1.7, spread: 1 },  // 以下几层刻意不和 55 成整数倍，避免听成和弦
  { f: 110, a: 0.14, k: 3, ph: 0.9, spread: 2 },
  { f: 118, a: 0.016, k: 1, ph: 2.5, spread: 1 },
  { f: 165, a: 0.05, k: 2, ph: 0.3, spread: 1 },
  { f: 197, a: 0.011, k: 3, ph: 3.1, spread: 2 },
  { f: 220, a: 0.075, k: 1, ph: 1.2, spread: 1 },
  { f: 263, a: 0.008, k: 4, ph: 2.2, spread: 2 },
  { f: 275, a: 0.03, k: 2, ph: 0.6, spread: 1 },
  { f: 330, a: 0.04, k: 3, ph: 1.9, spread: 1 },  // 手机小喇叭能听到的主体在这里
  { f: 440, a: 0.026, k: 1, ph: 2.8, spread: 2 },
  { f: 550, a: 0.016, k: 2, ph: 0.4, spread: 1 },
  { f: 660, a: 0.012, k: 4, ph: 3.4, spread: 2 },
  { f: 880, a: 0.008, k: 3, ph: 1.4, spread: 1 },
  { f: 1100, a: 0.005, k: 2, ph: 2.6, spread: 2 },
  { f: 1320, a: 0.004, k: 1, ph: 0.8, spread: 1 },
  { f: 1760, a: 0.0025, k: 4, ph: 3.0, spread: 2 },
];

for (const p of PARTIALS) {
  for (const side of [p.f - p.spread, p.f + p.spread]) {
    if (!Number.isInteger(side * dur)) {
      throw new Error(`${side}Hz 在 ${dur} 秒内不是整数个周期，循环会有接缝`);
    }
  }
}

const left = new Float32Array(N);
const right = new Float32Array(N);
let sumSq = 0;

for (let i = 0; i < N; i++) {
  const t = i / SR;
  const swell = 0.88 + 0.12 * Math.sin(TAU * 2 * (t / dur) + 1.1);
  let l = 0;
  let r = 0;
  for (const p of PARTIALS) {
    const env = 0.75 + 0.25 * Math.sin(TAU * p.k * (t / dur) + p.ph);
    const amp = p.a * env * swell;
    l += amp * Math.sin(TAU * (p.f - p.spread) * t);
    r += amp * Math.sin(TAU * (p.f + p.spread) * t);
  }
  left[i] = l;
  right[i] = r;
  sumSq += l * l + r * r;
}

// 归一到 RMS 0.12（约 -18 dBFS）：配音之下约 15 dB，存在感刚好、不抢注意力
const rms = Math.sqrt(sumSq / (N * 2));
const gain = rms > 0 ? 0.12 / rms : 1;
let peak = 0;
for (let i = 0; i < N; i++) {
  left[i] *= gain;
  right[i] *= gain;
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
}
if (peak > 0.95) {
  console.log(`峰值 ${peak.toFixed(2)} 偏高，整体再压 ${(0.95 / peak).toFixed(2)}`);
  for (let i = 0; i < N; i++) {
    left[i] *= 0.95 / peak;
    right[i] *= 0.95 / peak;
  }
}
console.log(`循环检查：首帧 L=${left[0].toFixed(5)} R=${right[0].toFixed(5)}，末帧 L=${left[N - 1].toFixed(5)} R=${right[N - 1].toFixed(5)}`);

const tmpDir = path.join(ROOT, ".tmp");
fs.mkdirSync(tmpDir, { recursive: true });
const wavPath = path.join(tmpDir, `bgm-${name}.wav`);
fs.writeFileSync(wavPath, wav([left, right], SR));

const outDir = path.join(ROOT, "engine", "public", "bgm");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${name}.mp3`);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wavPath, "-codec:a", "libmp3lame", "-b:a", "128k", outPath]);
fs.rmSync(wavPath, { force: true });

console.log(`已生成 engine/public/bgm/${name}.mp3（${dur} 秒，${(fs.statSync(outPath).size / 1024).toFixed(0)} KB）`);

function wav(channels: Float32Array[], sr: number) {
  const n = channels[0].length;
  const ch = channels.length;
  const buf = Buffer.alloc(44 + n * ch * 2);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + n * ch * 2, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(ch, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * ch * 2, 28);
  buf.writeUInt16LE(ch * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(n * ch * 2, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, channels[c][i]));
      buf.writeInt16LE(Math.round(v * 32767), o);
      o += 2;
    }
  }
  return buf;
}
