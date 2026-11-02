import React from "react";
import { MOTION, MOTION_FONT } from "../style/motion";

// v4 画面的通用图元：路径、方块、圆、标签。
// 通用图元（MotionStage）和章节自定义画面（episodes 下的 画面.tsx）共用这一份，保证线条、字重和颜色一致。

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * clamp01(p);
export const easeOut = (p: number) => 1 - Math.pow(1 - clamp01(p), 3);
export const easeInOut = (p: number) => {
  const t = clamp01(p);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const mix = (a: string, b: string, p: number) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const t = clamp01(p);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) + (((pb >> sh) & 255) - ((pa >> sh) & 255)) * t);
  return `#${[ch(16), ch(8), ch(0)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

/** 线：p 控制画出进度（0～1），dash 则直接给虚线样式。 */
export const P: React.FC<{ d: string; color?: string; w?: number; p?: number; dash?: string; opacity?: number }> = ({
  d, color = MOTION.text, w = 2, p = 1, dash, opacity = 1,
}) => (
  <path
    d={d}
    fill="none"
    stroke={color}
    strokeWidth={w}
    strokeLinejoin="miter"
    opacity={opacity}
    {...(dash ? { strokeDasharray: dash } : { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - clamp01(p) })}
  />
);

export const Box: React.FC<{ x: number; y: number; w: number; h: number; fill?: string; stroke?: string; sw?: number; dash?: string; opacity?: number }> = ({
  x, y, w, h, fill = "none", stroke, sw = 1, dash, opacity = 1,
}) => (
  <rect x={x} y={y} width={w} height={h} fill={fill} opacity={opacity}
    {...(stroke ? { stroke, strokeWidth: sw } : {})} {...(dash ? { strokeDasharray: dash } : {})} />
);

export const Dot: React.FC<{ cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number; dash?: string; opacity?: number }> = ({
  cx, cy, r, fill = "none", stroke, sw = 1, dash, opacity = 1,
}) => (
  <circle cx={cx} cy={cy} r={r} fill={fill} opacity={opacity}
    {...(stroke ? { stroke, strokeWidth: sw } : {})} {...(dash ? { strokeDasharray: dash } : {})} />
);

export const Txt: React.FC<{ x: number; y: number; children: React.ReactNode; size?: number; color?: string; anchor?: "start" | "middle" | "end"; weight?: number; mono?: boolean; opacity?: number }> = ({
  x, y, children, size = 26, color = MOTION.text, anchor = "start", weight = 400, mono = false, opacity = 1,
}) => (
  <text x={x} y={y} fill={color} fontSize={size} fontWeight={weight} textAnchor={anchor}
    dominantBaseline="central" opacity={opacity} style={mono ? { fontFamily: MOTION_FONT.mono } : undefined}>
    {children}
  </text>
);
