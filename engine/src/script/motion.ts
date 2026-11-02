// V1 极简动效的画面状态机（纯函数，引擎和 tools 共用）。
//
// 处理稿在标记列写「画面:类型/阶段」，只写在画面要变的那一屏；不写的屏沿用上一个画面。
// 同一类型内阶段累积推进（不会回退）；换类型相当于换一幅图，从空白重新画起。
// 时间轴仍由配音与逐字时间戳决定：画面只在有台词的屏上推进，不额外占用时间。
import { FPS, type Beat, type Screen } from "./parse";
import type { Item } from "./timeline";
import { scriptStyle, STYLE_VERSION } from "./style";

export const MOTION_STYLE = STYLE_VERSION;
export const isMotionStyle = (meta: Record<string, string>) => scriptStyle(meta) === MOTION_STYLE;

export const MOTION_KINDS = ["标题", "路径", "概率", "时间轴", "闸门"] as const;
export type MotionKind = (typeof MOTION_KINDS)[number];

/** 每种画面的阶段顺序。阶段只能往后走；闸门/过闸可以连着写，每写一次过一道。 */
export const MOTION_STAGES: Record<MotionKind, readonly string[]> = {
  标题: ["入场"],
  路径: ["展开", "未知", "让开", "分叉"],
  概率: ["刻度", "概率", "遮罩"],
  时间轴: ["轨道", "徘徊", "冲刺", "结余"],
  闸门: ["错误", "过闸", "资源"],
};

export type MotionSpec = { kind: MotionKind; stage: string };

export const isMotionKind = (k: string): k is MotionKind => (MOTION_KINDS as readonly string[]).includes(k);

export const isMotionStage = (kind: MotionKind, stage: string) => MOTION_STAGES[kind].includes(stage);

/** 一次画面推进的时长（秒）；实际不超过那一屏的长度 */
export const MOTION_CUE_SECONDS = 0.7;

/** 换类型时旧画面淡出的帧数（0.5 秒） */
export const MOTION_FADE_FRAMES = 15;

/**
 * 画面状态。stage 是「已经完成到第几个阶段」：
 * -1 = 什么都还没画，0 = 第一个阶段完成，1 = 第二阶段完成……
 * 过渡期间是小数，场景按「元素所属阶段 - 已到阶段」依次浮现。
 */
export type MotionState = {
  kind: MotionKind | null;
  stage: number;
  gates: number; // 闸门：已经走过的道数 0～3，过渡期间是小数
};

export const EMPTY_MOTION: MotionState = { kind: null, stage: -1, gates: 0 };

const stageIndex = (spec: MotionSpec) => {
  const i = MOTION_STAGES[spec.kind].indexOf(spec.stage);
  return i < 0 ? 0 : i;
};

/** 把一条画面标记应用到当前状态，得到目标状态。 */
export function applyScene(s: MotionState, spec: MotionSpec): MotionState {
  const idx = stageIndex(spec);
  const pass = spec.kind === "闸门" && spec.stage === "过闸";
  const gates = pass ? Math.min(3, Math.round(s.gates) + 1) : s.gates;
  // 换类型：从这一幅图的第一阶段开始，不继承上一幅的进度
  if (s.kind !== spec.kind) return { kind: spec.kind, stage: idx, gates };
  return { kind: s.kind, stage: Math.max(s.stage, idx), gates };
}

export type MotionCue = {
  at: number; // 组合帧
  index: number; // 原稿屏序号
  spec: MotionSpec;
  dur: number;
};

/** 只有通用词表里的节/步才由这套图元渲染；章节自带的画面文件用自己的节名。 */
export const beatSpec = (b: Beat): MotionSpec | null =>
  isMotionKind(b.section) ? { kind: b.section, stage: b.step } : null;

/** 按屏收集画面标记；offset 用于把中间片段平移到 0 开始。 */
export const motionCues = (items: Item[], offset = 0): MotionCue[] =>
  items
    .flatMap((it) => {
      const spec = it.screen.scene ? beatSpec(it.screen.scene) : null;
      return spec
        ? [{
            at: Math.max(0, it.from - offset),
            index: it.index,
            spec,
            dur: Math.min(Math.round(MOTION_CUE_SECONDS * FPS), Math.max(6, it.frames)),
          }]
        : [];
    })
    .sort((a, b) => a.at - b.at);

/** 分章/样片预览时，画面要从之前的屏累积算出来，否则开头是空的。 */
export const initialMotion = (screens: Screen[], beforeIndex: number): MotionState =>
  screens
    .slice(0, Math.max(0, beforeIndex))
    .reduce((s, sc) => {
      const spec = sc.scene ? beatSpec(sc.scene) : null;
      return spec ? applyScene(s, spec) : s;
    }, { ...EMPTY_MOTION });

export type MotionStep = { at: number; dur: number; from: MotionState; to: MotionState };

/** 展开成「上一状态 → 当前状态」的轨道；只在每条 cue 的 dur 帧内过渡。 */
export const motionTrack = (cues: MotionCue[], initial: MotionState): MotionStep[] => {
  let cur = initial;
  return cues.map((c) => {
    const to = applyScene(cur, c.spec);
    const step = { at: c.at, dur: Math.max(1, c.dur), from: cur, to };
    cur = to;
    return step;
  });
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export type MotionFrame = {
  state: MotionState; // 当前要画的画面
  prev: MotionState | null; // 换类型时还没淡出的上一幅图
  fade: number; // 上一幅图的剩余不透明度
};

/** 某一帧的画面：换类型时新图从空白画起，旧图在 15 帧内淡出。 */
export function motionAt(steps: MotionStep[], initial: MotionState, frame: number): MotionFrame {
  let step: MotionStep | undefined;
  for (const s of steps) {
    if (s.at <= frame) step = s;
    else break;
  }
  if (!step) return { state: initial, prev: null, fade: 0 };
  const p = Math.min(1, Math.max(0, (frame - step.at) / step.dur));
  if (p >= 1) return { state: step.to, prev: null, fade: 0 };
  const e = easeInOut(p);
  if (step.from.kind !== step.to.kind) {
    const fp = Math.min(1, (frame - step.at) / Math.min(step.dur, MOTION_FADE_FRAMES));
    return {
      state: { kind: step.to.kind, stage: -1 + (step.to.stage + 1) * e, gates: step.to.gates },
      prev: step.from.kind ? step.from : null,
      fade: 1 - easeInOut(fp),
    };
  }
  return {
    state: {
      kind: step.to.kind,
      stage: step.from.stage + (step.to.stage - step.from.stage) * e,
      gates: step.from.gates + (step.to.gates - step.from.gates) * e,
    },
    prev: null,
    fade: 0,
  };
}

/** 某一帧的画面状态（只要当前状态时用它）。 */
export const stateAt = (steps: MotionStep[], initial: MotionState, frame: number): MotionState =>
  motionAt(steps, initial, frame).state;

/** 某个阶段画到几成：0 = 还没开始，1 = 已画完。 */
export const stageProgress = (s: MotionState, index: number) =>
  Math.min(1, Math.max(0, s.stage - index + 1));
