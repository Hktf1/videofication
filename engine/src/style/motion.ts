// V1 极简动效：画面是处理稿的第二层，字幕落到底部，中间让给线、块和读数。
// 正式色板与版式在这里定义，theme.ts 提供共用字体、品牌与规则。
// 语义只用颜色表达：琥珀是行动与保留，红是损失与否定，绿是通过与验证。

export const MOTION = {
  bg: "#080A10", // 深蓝黑底，给线条留出层次
  text: "#E9E6DC", // 论断、整句字幕
  muted: "#687484", // 说明、标签
  unread: "#3E4856", // 背景结构（保留共用色名）
  line: "#26303E", // 结构线
  ink: "#0D1118", // 场景里的实心块底
  amber: "#E0A24C", // 行动、正向、被保留下来的时间
  red: "#C45442", // 损失、否定、错误
  green: "#709670", // 通过、警觉、被验证
} as const;

export const MOTION_FONT = {
  file: "fonts/SourceHanSansSC-Medium.otf", // engine/public/fonts/ 下已有
  family: "SansSC",
  // 画面上的标签、读数用思源黑体
  sans: '"SansSC", "Source Han Sans SC", "Microsoft YaHei", sans-serif',
  // 字幕用楷体；"Kai" 由 Font.tsx 加载，系统楷体兜底
  kai: '"Kai", "KaiTi", "STKaiti", serif',
  weight: 500,
  mono: 'Consolas, "SFMono-Regular", ui-monospace, monospace',
} as const;

export const MOTION_LAYOUT = {
  width: 1920,
  height: 1080,
  subtitleSize: 52, // 底部单行，建议 10～18 字
  subtitleFadeSeconds: 0.2, // 整句统一渐显，不逐字点亮或变色
  subtitleBottom: 84, // 距底 84px，和参考稿的比例接近
  subtitleTracking: 0.03,
  // 场景内容不超过这条线，避免被底部字幕压住
  contentBottom: 860,
} as const;
