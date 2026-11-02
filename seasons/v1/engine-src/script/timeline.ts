// 把处理稿展开成时间线：钩子 → 署名 → 章节卡+正片 … → 转折卡 → … → 结尾。
// 引擎渲染和 tools（联络表抽帧、时长统计）共用。
import { FPS, screenFrames, type Script, type Screen } from "./parse";

export const CREDIT_FRAMES = 75;
export const CHAPTER_FRAMES = 45;
export const TURN_FRAMES = 60;
export const TAIL_FRAMES = 45; // 结尾留白

export type Item =
  | { kind: "screen"; from: number; frames: number; screen: Screen; index: number }
  | { kind: "credit"; from: number; frames: number }
  | { kind: "chapter"; from: number; frames: number; no: number; title: string }
  | { kind: "turn"; from: number; frames: number; title?: string };

export function buildTimeline(script: Script): { items: Item[]; total: number; creditEnd: number } {
  const items: Item[] = [];
  let t = 0;
  let creditEnd = 0;
  let lastSection: string | null = null;
  const push = (it: Item) => {
    items.push(it);
    t += it.frames;
  };
  const insertCredit = () => {
    if (creditEnd) return;
    push({ kind: "credit", from: t, frames: CREDIT_FRAMES });
    creditEnd = t;
  };

  script.screens.forEach((s, index) => {
    if (s.section !== lastSection) {
      lastSection = s.section;
      if (s.sectionKind !== "hook") insertCredit();
      if (s.sectionKind === "chapter") push({ kind: "chapter", from: t, frames: CHAPTER_FRAMES, no: s.chapterNo, title: s.section });
      if (s.sectionKind === "turn") push({ kind: "turn", from: t, frames: TURN_FRAMES, title: script.meta["转折词"] });
    }
    push({ kind: "screen", from: t, frames: screenFrames(s), screen: s, index });
  });
  insertCredit();
  return { items, total: Math.max(t + TAIL_FRAMES, FPS), creditEnd };
}
