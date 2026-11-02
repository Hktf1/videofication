// 墨风格视频的基础工具：曲线、插值、滤镜。
import { Easing, interpolate } from "remotion";

export type Pt = [number, number];

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 缓动插值：ease-out-cubic，0→1 钳位
export const prog = (f: number, at: number, dur = 18) =>
  interpolate(f, [at, at + dur], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

// ease-in-out-cubic
export const smooth = (f: number, at: number, dur: number) =>
  interpolate(f, [at, at + dur], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

// 线性插值 0→1
export const lin = (f: number, a: number, b: number) =>
  interpolate(f, [a, Math.max(b, a + 1)], [0, 1], clamp);

// 数值混合
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// 点混合
export const mixPt = (a: Pt, b: Pt, t: number): Pt => [mix(a[0], b[0], t), mix(a[1], b[1], t)];

// 点加法
export const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];

// 以 t 为峰的三角脉冲，半宽 w
export const bump = (f: number, t: number, w: number) => Math.max(0, 1 - Math.abs(f - t) / w);

// Catmull-Rom 平滑曲线
export const smoothPath = (pts: Pt[], closed = false) => {
  if (pts.length < 2) return "";
  const p = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  const count = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < count; i++) {
    const p0 = p[i], p1 = p[i + 1], p2 = p[i + 2], p3 = p[i + 3];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return closed ? d + " Z" : d;
};

// SVG 滤镜定义：墨色边缘粗糙效果
export const InkRoughFilter: React.FC<{ id: string }> = ({ id }) => (
  <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.03 0.06" numOctaves={2} seed={7} result="n" />
    <feDisplacementMap in="SourceGraphic" in2="n" scale={2.2} xChannelSelector="R" yChannelSelector="G" />
  </filter>
);

// SVG 滤镜定义：墨团晕染效果
export const InkBleedFilter: React.FC<{ id: string }> = ({ id }) => (
  <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={3} seed={3} result="n" />
    <feDisplacementMap in="SourceGraphic" in2="n" scale={14} xChannelSelector="R" yChannelSelector="G" result="d" />
    <feGaussianBlur in="d" stdDeviation={1.4} />
  </filter>
);
