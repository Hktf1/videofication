// 02-1 网格样片：只画前 15 屏（希望 → 逻辑正确 → 正向反馈 → 庞氏闭环）。
export const GRID_SCREENS = 15;

export type GridSlot = { from: number; frames: number };
