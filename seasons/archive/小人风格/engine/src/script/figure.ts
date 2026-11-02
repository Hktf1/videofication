import type { Item } from "./timeline";

export const FIGURE_ACTIONS = ["站立", "前进", "犹豫", "受阻", "重负", "放弃", "选择", "希望"] as const;
export type FigureAction = typeof FIGURE_ACTIONS[number];
export type FigureSpec = { action: FigureAction; label?: string };
export const episodeStyle = (meta: Record<string, string>) => meta["风格"] ?? "v2";
export const isFigureStyle = (meta: Record<string, string>) => episodeStyle(meta) === "小人";

/** 相邻同一分镜跨字幕屏连续播放，转折空屏或分镜变化时重开。 */
export function figureScenes(items: Item[], initial: FigureSpec = { action: "站立" }) {
  const scenes: { from: number; frames: number; spec: FigureSpec }[] = [];
  let current = initial;
  for (const it of items) {
    current = it.screen.figure ?? current;
    const last = scenes.at(-1);
    if (last && last.from + last.frames === it.from && last.spec.action === current.action && last.spec.label === current.label) {
      last.frames += it.frames;
    } else scenes.push({ from: it.from, frames: it.frames, spec: current });
  }
  return scenes;
}
