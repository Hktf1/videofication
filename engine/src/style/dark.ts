// 暗调样片（第二档）：暖黑电影感 + 纸片信息图。
// 与 v1 的 theme.ts 完全独立；解析、时间线、配音仍然复用。
// 参考片：暗褐底、聚光 + 暗角、剪影、纸卡、金色衬线、朱红强调。
export const DARK = {
  bg0: "#050403", // 画面四周
  bg1: "#140D08", // 聚光边缘
  glow: "#2A1C12", // 聚光中心
  ink: "#E7E4DF", // 字幕暖白
  gold: "#E4CD9E", // 标题/线条
  goldDeep: "#C9A96A", // 金色重一点
  goldDim: "#8C7A58", // 次要金
  paper: "#F5E8CA", // 纸卡
  paperShade: "#DFD2B7",
  paperInk: "#3B2E22", // 纸上的字
  paperLabel: "#6B5A3F",
  red: "#C0503F", // 朱红：警报/情绪
  redDim: "#7E2C2A",
} as const;

// 本机已装 Noto Serif SC（思源宋体），兜底系统宋体
export const SERIF = '"Noto Serif SC", "Source Han Serif SC", "Songti SC", STSong, SimSun, serif';
export const SANS = '"Noto Sans SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif';

export const DL = {
  width: 1920,
  height: 1080,
  subtitleY: 944, // 字幕贴近底边，给画面留出道具区
  subtitleSize: 72,
  propCenterY: 420,
  subtitleShadow: "0 6px 26px rgba(0,0,0,0.65)",
} as const;
