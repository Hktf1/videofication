// 极简抽象（候选）：关键语义屏用「点与路径」表达因果、反馈与循环。
// 这里只放不依赖 React 的纯数据/状态计算，画面见 kit/MinimalCanvas.tsx。
import type { Screen } from "./parse";
import type { Item } from "./timeline";

export const ABSTRACT_KINDS = ["路径", "节点", "反馈", "循环", "分叉"] as const;
export type AbstractKind = (typeof ABSTRACT_KINDS)[number];

export type AbstractSpec = { kind: AbstractKind; stage?: string };

export const MINIMAL_STYLE = "极简";
export const isMinimalStyle = (meta: Record<string, string>) => meta["风格"] === MINIMAL_STYLE;

/** 一屏抽象标记在画面上的目标状态；所有值都是 0～1（节点数量除外），可连续插值。 */
export type AbstractState = {
  spine: number; // 左侧主干画出
  branches: number; // 上下两条支线展开
  upperFeedback: number; // 上方支线的反馈弧接入（金色）
  cycle: number; // 反馈环闭合
  extend: number; // 上方支线继续延伸
  stall: number; // 上方支线停在半途
  focus: number; // 注意力转到下方支线（上方变暗）
  lowerFeedback: number; // 下方支线的反馈弧（画一半就断）
  upperNodes: number; // 0～3
  lowerNodes: number; // 0～3
  fracture: number; // 主干断裂成虚线
};

export const EMPTY_ABSTRACT: AbstractState = {
  spine: 0,
  branches: 0,
  upperFeedback: 0,
  cycle: 0,
  extend: 0,
  stall: 0,
  focus: 0,
  lowerFeedback: 0,
  upperNodes: 0,
  lowerNodes: 0,
  fracture: 0,
};

export const ABSTRACT_DUR = 18; // 一次画面动作约 0.6 秒

export const abstractKey = (spec: AbstractSpec) => `${spec.kind}/${spec.stage ?? ""}`;

const TARGETS: Record<string, (s: AbstractState) => Partial<AbstractState>> = {
  "路径/起点": () => ({ spine: 1 }),
  "路径/延伸": () => ({ spine: 1, extend: 1 }),
  "路径/停滞": () => ({ stall: 1 }),
  "路径/断裂": () => ({ fracture: 1 }),
  "分叉/展开": () => ({ spine: 1, branches: 1 }),
  "分叉/转下": () => ({ branches: 1, focus: 1 }),
  "反馈/接入": () => ({ upperFeedback: 1 }),
  "反馈/缺失": () => ({ lowerFeedback: 1 }),
  "循环/闭合": () => ({ cycle: 1 }),
  "节点/上行": (s) => ({ upperNodes: Math.min(3, s.upperNodes + 1) }),
  "节点/下行": (s) => ({ lowerNodes: Math.min(3, s.lowerNodes + 1) }),
};

/** 把一屏标记应用到当前状态。未知阶段忽略，不影响已画出的画面。 */
export const applyAbstract = (state: AbstractState, spec: AbstractSpec): AbstractState => {
  const target = TARGETS[abstractKey(spec)];
  return target ? { ...state, ...target(state) } : { ...state };
};

export type AbstractCue = {
  at: number; // 组合帧
  index: number; // 原稿屏序号
  kind: AbstractKind;
  stage?: string;
  dur: number;
};

/** 按屏收集抽象标记；offset 用于把中间片段平移到 0 开始。 */
export const abstractCues = (items: Item[], offset = 0): AbstractCue[] =>
  items
    .filter((it) => it.screen.abstract)
    .map((it) => ({
      at: Math.max(0, it.from - offset),
      index: it.index,
      kind: it.screen.abstract!.kind,
      stage: it.screen.abstract!.stage,
      dur: ABSTRACT_DUR,
    }))
    .sort((a, b) => a.at - b.at);

/** 取某屏之前的累积状态，避免分章/样片边界处画面重置。 */
export const initialAbstract = (screens: Screen[], beforeIndex: number): AbstractState =>
  screens
    .slice(0, Math.max(0, beforeIndex))
    .reduce((s, sc) => (sc.abstract ? applyAbstract(s, sc.abstract) : s), { ...EMPTY_ABSTRACT });

/** 展开成「上一状态 → 当前状态 → 保持」的轨道；画面只在每个 cue 的前 dur 帧内过渡。 */
export type AbstractStep = { at: number; dur: number; from: AbstractState; to: AbstractState };

export const abstractTrack = (cues: AbstractCue[], initial: AbstractState): AbstractStep[] => {
  let cur = { ...initial };
  return cues.map((c) => {
    const from = cur;
    const to = applyAbstract(cur, c);
    cur = to;
    return { at: c.at, dur: Math.max(1, c.dur), from, to };
  });
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** 取某一帧的完整状态：只在 cue 的前 dur 帧内过渡，其余时间保持上一个目标。 */
export const stateAt = (steps: AbstractStep[], initial: AbstractState, frame: number): AbstractState => {
  let step: AbstractStep | undefined;
  for (const s of steps) {
    if (s.at <= frame) step = s;
    else break;
  }
  if (!step) return initial;
  const t = Math.min(1, Math.max(0, (frame - step.at) / step.dur));
  const e = easeInOut(t);
  const out = { ...step.from };
  for (const k of Object.keys(out) as (keyof AbstractState)[]) {
    out[k] = step.from[k] + (step.to[k] - step.from[k]) * e;
  }
  return out;
};
