import type React from "react";
import type { Screen } from "../script/parse";

export type TemplateProps = {
  screen: Screen;
  accent: string; // 本屏强调色（由色调决定）
};

export type TemplateDef = {
  component: React.FC<TemplateProps>;
  desc: string; // 给写处理稿的人看：做什么用
  usage: string; // 「画面」列写法示例
  ownSubtitle?: boolean; // 模板自己排文字，不叠底部字幕
};
