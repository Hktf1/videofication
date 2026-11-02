// 02-1 新风格：纸底墨线 + 朱砂印记（v4 候选）。
// 与 v1 的 theme.ts 完全独立；字幕、配音、时间线仍然复用。
export const INK = {
  paper: "#EDE3D0", // 缺纸纹图时的兜底色
  ink: "#241F19", // 墨
  dim: "#6F6557", // 淡墨
  wash: "#B9AD98", // 更淡的墨，用于退场
  accent: "#B4432D", // 朱砂
} as const;

export const INK_LAYOUT = {
  width: 1920,
  height: 1080,
  x0: 240,
  x1: 1680,
  lineY: 430,
  textY: 900,
  textSize: 80,
} as const;
