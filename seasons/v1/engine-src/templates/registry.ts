// 模板目录：处理稿「画面」列的第一个词 = 这里的键。
// 新会话写处理稿前只需读这个文件（或运行 npm run check -- --templates）。
// 某篇专属的画面写在 episodes/<篇>/scenes.tsx，同名时覆盖这里。
import { BigText, Blank, Compare, Person } from "./basic";
import type { TemplateDef } from "./types";

export const REGISTRY: Record<string, TemplateDef> = {
  留白: { component: Blank, desc: "只有底部字幕", usage: "留白" },
  小人: { component: Person, desc: "中间一个小圆人；姿态：站/垂头/举手", usage: "小人 消耗 垂头" },
  对比: { component: Compare, desc: "两张卡片并列，右侧用强调色", usage: "对比 理性 想法 行动" },
  大字: { component: BigText, desc: "居中大字，用于命题和金句", usage: "大字 能量", ownSubtitle: true },
};
