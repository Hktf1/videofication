// 系列风格总开关。模板只引用这里的语义名，不写死色值。
// 改风格：改这里 → 样片/联络表确认 → 批量重渲 → 在 seasons/ 记一笔。
import type { Tone } from "../script/parse";

export const C = {
  bg: "#14161a", // 暗底
  ink: "#ece4d4", // 米白正文
  line: "#8a8f98", // 线条/小圆人
  energy: "#e8a53c", // 琥珀：能量/重点
  drain: "#d0584a", // 红：消耗/错误
  reason: "#5b8fd4", // 蓝：理性/方法
  solve: "#5fb37a", // 绿：解决
  muted: "#6b6f76", // 灰：回忆/次要
} as const;

export const toneColor = (t?: Tone) => (t ? C[t] : C.energy);

export const FONT = {
  // 宋体正文；黑体只用于数字标签
  serif: '"Source Han Serif SC", "Noto Serif SC", "Songti SC", SimSun, serif',
  sans: '"Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", sans-serif',
};

export const SIZE = {
  subtitle: 64, // 底部字幕
  title: 96, // 命题/金句
  label: 32, // Hud、Callout、刻度；系列规定 ≥28
  stroke: 4, // 单线条粗细
};

export const LAYOUT = {
  width: 1920,
  height: 1080,
  pad: 72,
  subtitleY: 860, // 上画下字：字幕基线区域
};

export const MAX_CHARS = 20;
export const MAX_SHAKES = 3;
