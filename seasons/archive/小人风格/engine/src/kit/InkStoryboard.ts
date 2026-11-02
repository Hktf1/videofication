// 分镜配置：用声明式的数据描述小人动画，不用写逐帧代码。
import type { Pt } from "./InkUtils";

// 时间点：屏幕索引 + 字符索引
export type TimeRef = { screen: number; char: number };

// 小人的移动
export type FigureMove = {
  type: "walk" | "trudge" | "step" | "hesitate" | "sway";
  from: TimeRef;
  to?: TimeRef;
  distance?: number; // 像素
  amp?: number; // 步幅振幅
};

// 小人的姿态变化
export type FigurePose = {
  type: "lean" | "kneel" | "jitter" | "stop";
  at: TimeRef;
  duration?: number; // 帧数
  amount?: number; // 幅度
};

// 朱砂（希望）
export type Spark = {
  position: Pt;
  dim?: TimeRef;
  flicker?: TimeRef;
  out?: TimeRef;
};

// 墨滴
export type Drop = {
  at: TimeRef;
  land: Pt;
  crack?: { left: Pt[]; right: Pt[] };
  crackAt?: TimeRef;
};

// 墨团
export type Blot = {
  spawn: TimeRef;
  home: Pt;
  radius: number;
  surge?: TimeRef; // 涌向小人
  merge?: TimeRef; // 合并成怀疑云
  cloudOffset?: Pt; // 在头顶的偏移
  cloudRadius?: number;
};

// 墨团滴落
export type Drip = {
  from: TimeRef;
  to: "burden"; // 暂时只支持滴到背上
};

// 墨环（互相强化）
export type Loop = {
  start: TimeRef;
  growUntil: TimeRef;
  centers: [Pt, Pt]; // 云和重负的中心
};

// 墨池扩散
export type Pool = {
  start: TimeRef;
  end: TimeRef;
  maxRadius: number;
};

// 墨洪水（最后吞没画面）
export type Flood = {
  start: TimeRef;
  maxOpacity: number;
};

// 路径
export type Path = {
  x0: number;
  x1: number;
  gy: (x: number) => number; // 地面高度函数
  highlight?: { from: TimeRef; x0: number; x1: number }; // 前方被描深的段落
};

// 镜头
export type Camera = {
  zoom?: { start: TimeRef; end: TimeRef; amount: number };
  follow?: "figure"; // 跟随小人
};

// 脚印
export type Footprint = {
  at: TimeRef;
  size: number;
  weight: number; // 墨色深浅
};

// 完整的分镜描述
export type Storyboard = {
  path: Path;
  figure: {
    startX: number;
    moves: FigureMove[];
    poses: FigurePose[];
  };
  spark?: Spark;
  drop?: Drop;
  blots?: Blot[];
  drips?: Drip[];
  loop?: Loop;
  pool?: Pool;
  flood?: Flood;
  camera?: Camera;
  footprints?: Footprint[];
};
