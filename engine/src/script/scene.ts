// V1 章节自定义画面的输入：每屏在组合里的位置、文案、逐字时刻和画面节拍。
// 章节文件夹里的 画面.tsx 只依赖这些数据，不碰时间线内部。
import type { Item } from "./timeline";

export type SceneCue = {
  index: number; // 原稿屏序号
  at: number; // 这一屏在组合里的起始帧
  frames: number; // 这一屏的总帧数（含停留、转折）
  text: string; // 屏幕上的字（已去行尾标点，保留【】）
  chars: number[]; // 逐字开口帧（相对本屏）
  speakEnd: number; // 整句念完的帧（相对本屏）
  beat?: { section: string; step: string }; // 这一屏的 画面:节/步
};

export type SceneProps = { cues: SceneCue[]; total: number };

export const sceneCues = (items: Item[], offset = 0): SceneCue[] =>
  items.map((it) => ({
    index: it.index,
    at: Math.max(0, it.from - offset),
    frames: it.frames,
    text: it.screen.text,
    chars: it.timing.chars,
    speakEnd: it.timing.speakEnd,
    beat: it.screen.scene,
  }));

/** 某个节拍在组合里的起始帧；没有写这一拍就返回 Infinity。 */
export const beatAt = (cues: SceneCue[], section: string, step: string): number => {
  const c = cues.find((x) => x.beat?.section === section && x.beat.step === step);
  return c ? c.at : Infinity;
};

/** 某一节第一次出现的帧；用来判断当前该画哪一节。 */
export const sectionAt = (cues: SceneCue[], section: string): number =>
  Math.min(...cues.filter((x) => x.beat?.section === section).map((x) => x.at));

/** 某一屏里某个词开口的组合帧；找不到时退回这一屏的开头。 */
export const wordAt = (cue: SceneCue, word: string): number => {
  const i = cue.text.indexOf(word);
  return i < 0 ? cue.at : cue.at + (cue.chars[i] ?? 0);
};

/**
 * 章节画面用的取数工具：按节拍、按词、按屏找帧。
 * 画面文件只需要 `const ctx = sceneCtx(cues, useCurrentFrame())`。
 */
export type SceneCtx = {
  f: number;
  at: (section: string, step: string) => number;
  p: (section: string, step: string, dur?: number) => number;
  cueOf: (section: string, step: string) => SceneCue | undefined;
  cueWith: (text: string) => SceneCue | undefined;
  word: (cue: SceneCue | undefined, word: string) => number;
  grow: (frame: number, dur?: number) => number;
};

export const sceneCtx = (cues: SceneCue[], f: number): SceneCtx => {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const at = (section: string, step: string) => beatAt(cues, section, step);
  return {
    f,
    at,
    p: (section, step, dur = 20) => clamp((f - at(section, step)) / dur),
    cueOf: (section, step) => cues.find((c) => c.beat?.section === section && c.beat.step === step),
    cueWith: (text) => cues.find((c) => c.text.includes(text)),
    word: (cue, w) => (cue ? wordAt(cue, w) : Number.POSITIVE_INFINITY),
    grow: (frame, dur = 12) => clamp((f - frame) / dur),
  };
};
