// 02-1 的另一种风格：黑白红几何网格（v5 候选）。
// 和墨线风格相反：没有纸纹、没有手绘，先用严格网格建立秩序，再让网格被红线和闭环扭弯。
export const GRID = {
  paper: "#F4F2ED",
  ink: "#101010",
  gray: "#8C8B86",
  line: "#E4E0D8",
  accent: "#E23A2E",
  font: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
  textX: 148,
  textY: 900,
  textSize: 66,
  bandTop: 820,
} as const;
