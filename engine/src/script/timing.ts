// 每屏节奏。没有配音时按字数和标点估算（screenTiming，「3.2s」可手动指定总时长）；
// 有了配音（字幕/逐字.json）后全部取自逐字时间戳（voicedTiming）。
import { charCount, FPS, plainText, splitEmphasis, type Screen } from "./parse";

export const PACE = {
  charsPerSec: 4, // 沉静的口播语速（约 240 字/分）
  commaPause: 0.25, // 句中，、：—— 的换气
  questionPause: 0.35, // ？！（含句末）
  fadeIn: 0.2,
  fadeOut: 0.17,
  lead: 0.1, // 字出现到开口
  breath: 0.25, // 念完到开始淡出
  minScreen: 1.6, // 再短的句子也至少停这么久
  emphasisFade: 0.25, // 强调词变色
  turnGap: 0.45, // 转折：前句淡出后空屏的停顿
  ellipsisPause: 0.3, // 每个…（……即 0.6s 留白）
  slowFade: 0.55, // 含省略号的屏：淡入淡出放慢
  charFade: 0.3, // 逐字显现：每个字由虚到实的时长
  askDelay: 0.3, // 行尾问号比整句晚出现
  themeTint: 0.8, // 主旨句念完后整句转强调色
  turnIn: 0.4, // 转折后一句由虚到实浮现
  blur: 6, // 由虚到实的起始模糊 px
};

const sec = (s: number) => Math.round(s * FPS);

/** 一个字符占用的朗读秒数：字按语速，标点算换气 */
function charSec(c: string) {
  if (/[，,、：:—]/.test(c)) return PACE.commaPause;
  if (/[？?！!]/.test(c)) return PACE.questionPause;
  if (c === "…") return PACE.ellipsisPause;
  return charCount(c) / PACE.charsPerSec;
}

/** 一段文字的朗读秒数（不含前后空白） */
const speakSec = (text: string) => [...text].reduce((a, c) => a + charSec(c), 0);

export type ScreenTiming = {
  frames: number; // 本屏总帧数
  fadeIn: number;
  fadeOutAt: number; // 字消失的帧（只渐显、不渐隐：到这一帧直接消失）
  emphasis: number[]; // 每个强调词开始变色的帧，与【】顺序对应
  chars: number[]; // 去掉【】后每个字符念到的帧（逐字显现、分段、问号用）
  speakEnd: number; // 整句念完的帧
};

export function screenTiming(s: Screen): ScreenTiming {
  const natural = speakSec(s.text);
  const slow = s.text.includes("…");
  const fadeIn = slow ? PACE.slowFade : s.afterTurn ? PACE.turnIn : PACE.fadeIn;
  const fadeOut = slow ? PACE.slowFade : PACE.fadeOut;
  // 逐字显现时字是跟着声音出来的，不必等整屏淡入完
  const start = s.fx ? PACE.lead : fadeIn + PACE.lead;
  const fixed = start + PACE.breath + s.hold + fadeOut + (s.fx ? PACE.charFade : 0);
  let total = Math.max(PACE.minScreen, fixed + natural);
  let speak = total - fixed;
  if (s.seconds) {
    total = s.seconds;
    speak = Math.max(0.3, total - fixed);
  }
  const scale = natural > 0 ? speak / natural : 1;

  // 强调词在念到它的那一刻开始变色：按它前面的文字估算
  const chars: number[] = [];
  let t = start;
  for (const c of plainText(s.text)) {
    chars.push(sec(t));
    t += charSec(c) * scale;
  }
  const frames = sec(total);
  return { frames, fadeIn: sec(fadeIn), fadeOutAt: frames, emphasis: emphasisAt(s, chars), chars, speakEnd: sec(t) };
}

/** 强调词在念到它的那一刻开始变色：取它第一个字的时刻 */
function emphasisAt(s: Screen, chars: number[]) {
  const out: number[] = [];
  let k = 0;
  for (const p of splitEmphasis(s.text)) {
    if (p.em) out.push(chars[k] ?? 0);
    k += [...p.text].length;
  }
  return out;
}

/**
 * 有配音时的本屏节奏：时刻全部来自逐字时间戳（v 为秒，相对本屏开头）。
 * span：本屏那段配音的长度；之后补静音：停留时字留在屏上，转折时字消失后空屏
 */
export function voicedTiming(s: Screen, v: { s: number; e: number; chars: number[] }, span: number): ScreenTiming {
  const slow = s.text.includes("…");
  const fadeOut = sec(slow ? PACE.slowFade : PACE.fadeOut);
  const shown = sec(span + s.hold); // 到这一帧字完全淡出
  const frames = Math.max(shown + (s.turn ? sec(PACE.turnGap) : 0), 2);
  const chars = v.chars.map(sec);
  const speakEnd = sec(v.e);
  // 字在开口前出现；开口前空隙不够完整淡入，就开口时刚好淡入完
  const fadeIn = Math.max(1, Math.min(sec(slow ? PACE.slowFade : s.afterTurn ? PACE.turnIn : PACE.fadeIn), sec(v.s)));
  const fadeOutAt = Math.min(Math.max(speakEnd, shown), frames);
  return { frames, fadeIn, fadeOutAt, emphasis: emphasisAt(s, chars), chars, speakEnd };
}

export const TURN_GAP_FRAMES = sec(PACE.turnGap);
