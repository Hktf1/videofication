// 02-1 墨线样片：只画前 15 屏（希望 → 逻辑正确 → 正向反馈 → 庞氏闭环）。
// 屏序号和 script.md 一致，0 起。
export const INK_SCREENS = 15;

export type InkSlot = { from: number; frames: number };
