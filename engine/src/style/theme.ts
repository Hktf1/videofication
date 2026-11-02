// 共享字体、画布、品牌与校验规则；正式动效版式在 motion.ts。
// C、SIZE、centerY 仍供实验组件使用，不再提供纯文字正式风格。

export const C = {
  bg: "#000000", // 片尾与历史实验的基础底色
  ink: "#F1F0EB", // 正文
  accent: "#E4BC75", // 唯一强调色
  dim: "#7C8089", // 联络表标签等次要信息
} as const;

export const KAI_FILE = "fonts/simkai.ttf"; // 楷体（Windows 自带）
export const FONT = {
  // 楷体；本地字体文件优先，系统字体兜底
  kai: '"Kai", "KaiTi", "STKaiti", serif',
  weight: 400,
};

export const SIZE = {
  subtitle: 88, // 楷体 88 号（用户 2026-10-17 选定）
  tracking: 0.04, // 字间距，em
};

export const LAYOUT = {
  width: 1920,
  height: 1080,
  centerY: 515, // 视觉中心：比几何中心略高
  rise: 0, // 淡入时上移距离 px；0 = 原地渐显
};

export const CHARS = { min: 10, max: 18, hardMax: 21 }; // 正式字幕建议 10～18 字，上限 21

// 品牌署名：处理稿头部写「水印：是」「片尾：是」才渲染，默认都不加。
export const BRAND = {
  prefix: "公众号",
  account: "示例账号",
  outroSub: "关注不迷路",
} as const;

export const WATERMARK = {
  size: 38, // 字号（用户对着样片定的大致比例：1080p 下约 40 号）
  right: 40,
  bottom: 30,
  tracking: 0.08, // 字间距 em
  opacity: 0.9,
  fadeIn: 12, // 片头淡入帧数
} as const;

export const OUTRO = {
  titleSize: 76,
  subSize: 38,
  gap: 46, // 副行与主行的间距 px
  titleTracking: 0.06,
  subTracking: 0.18,
} as const;
