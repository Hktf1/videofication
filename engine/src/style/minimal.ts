// 极简抽象（候选）的色板与画面位置。白色/金色直接复用 v1，避免两套颜色慢慢漂移。
import { C, LAYOUT, SIZE } from "./theme";

export const MIN = {
  bg: C.bg,
  ink: C.ink,
  accent: C.accent,
  dim: "#7C8089",
  line: "rgba(241,240,235,0.42)",
  faint: "rgba(241,240,235,0.14)",
  goldLine: "rgba(228,188,117,0.92)",
  goldFaint: "rgba(228,188,117,0.32)",
} as const;

export const MIN_LAYOUT = {
  width: LAYOUT.width,
  height: LAYOUT.height,
  subtitleY: LAYOUT.centerY,
  subtitleSize: SIZE.subtitle,
  fade: 12, // 0.4 秒 @30fps
  x0: 470,
  splitX: 830,
  x1: 1440,
  spineY: 330,
  upperY: 268,
  lowerY: 392,
} as const;

/** 短屏按屏长缩短渐隐，避免 1 秒以内的屏只剩一瞬全亮。 */
export const minimalFade = (frames: number) => Math.min(MIN_LAYOUT.fade, Math.max(4, Math.floor(frames / 4)));
