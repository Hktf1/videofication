// 墨风格视频的可复用元件：描边、墨团、小人。
import React from "react";
import { INK } from "../style/ink";
import { type Pt, smoothPath, mixPt, add } from "./InkUtils";

/* ---------- 描边 ---------- */

export const Stroke: React.FC<{
  d: string;
  progress?: number;
  color?: string;
  width?: number;
  opacity?: number;
  dash?: string;
  offset?: number;
  filterId?: string;
}> = ({ d, progress = 1, color = INK.ink, width = 2.8, opacity = 1, dash, offset, filterId = "ink-rough" }) => {
  const reveal = progress < 0.999 ? { pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - progress } : {};
  const pattern = dash ? { strokeDasharray: dash, strokeDashoffset: offset } : {};
  if (progress <= 0.001 || opacity <= 0.001) return null;
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
      filter={`url(#${filterId})`}
      {...(dash ? pattern : reveal)}
    />
  );
};

/* ---------- 墨团 ---------- */

export const Blot: React.FC<{
  c: Pt;
  r: number;
  seed: number;
  opacity?: number;
  color?: string;
  f: number;
  filterId?: string;
}> = ({ c, r, seed, opacity = 0.85, color = INK.ink, f, filterId = "ink-bleed" }) => {
  if (r < 0.5 || opacity <= 0.001) return null;
  const shape = (k: number) =>
    Array.from({ length: 12 }, (_, i) => {
      const t = (i / 12) * Math.PI * 2;
      const rr =
        r *
        k *
        (1 +
          0.16 * Math.sin(3 * t + seed) +
          0.09 * Math.sin(5 * t + seed * 2.1) +
          0.04 * Math.sin(f * 0.06 + t * 2 + seed));
      return [c[0] + rr * Math.cos(t), c[1] + rr * Math.sin(t)] as Pt;
    });
  return (
    <g opacity={opacity} filter={`url(#${filterId})`}>
      <path d={smoothPath(shape(1.35), true)} fill={color} opacity={0.16} />
      <path d={smoothPath(shape(1), true)} fill={color} />
    </g>
  );
};

/* ---------- 小人 ---------- */

export type Pose = {
  x: number;
  phase: number;
  amp: number;
  lean: number;
  kneel: number;
  jit: number;
  f: number;
  gy: (x: number) => number; // 地面高度函数
};

export type Body = {
  head: Pt;
  neck: Pt;
  hip: Pt;
  back: (r: number) => Pt;
  d: string[];
};

const LEG = 38,
  TORSO = 68,
  HEAD_R = 19,
  ARM = 29;

// 两段骨骼的膝/肘：已知端点和段长，弯向 +x（前方）
const joint = (a: Pt, b: Pt, l: number, sign = 1): Pt => {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const d = Math.hypot(dx, dy) || 1;
  const h = Math.sqrt(Math.max(0, l * l - (d / 2) ** 2));
  return [(a[0] + b[0]) / 2 + (dy / d) * h * sign, (a[1] + b[1]) / 2 - (dx / d) * h * sign];
};

export const body = ({ x, phase, amp, lean, kneel, jit, f, gy }: Pose): Body => {
  const n = (k: number): Pt =>
    jit
      ? [
          jit * (Math.sin(f * 0.45 + k * 1.9) + 0.6 * Math.sin(f * 0.23 + k * 3.1)),
          jit * (Math.cos(f * 0.41 + k * 2.7) + 0.6 * Math.sin(f * 0.19 + k * 1.3)),
        ]
      : [0, 0];
  const g = gy(x);
  const s = amp * Math.sin(phase);
  const lift = (c: number) => 9 * amp * Math.max(0, c) * (1 - kneel);
  const footA: Pt = [x + (24 * s * (1 - kneel) - 20 * kneel), g - lift(Math.cos(phase))];
  const footB: Pt = [x + (-24 * s * (1 - kneel) + 24 * kneel), g - lift(-Math.cos(phase))];
  const hip: Pt = [x, g - (2 * LEG - 4) * (1 - kneel) - 30 * kneel];
  const u: Pt = [Math.sin(lean), -Math.cos(lean)];
  const neck = add(add(hip, [u[0] * TORSO, u[1] * TORSO]), n(1));
  const hl = lean * 1.25;
  const head: Pt = add(neck, [Math.sin(hl) * (HEAD_R + 6), -Math.cos(hl) * (HEAD_R + 6)]);
  const shoulder = add(neck, [-u[0] * 8, -u[1] * 8]);
  const arm = (swing: number, k: number) => {
    const t = swing + lean * 0.7;
    const elbow = add(add(shoulder, [Math.sin(t) * ARM, Math.cos(t) * ARM]), n(k));
    const hand = add(add(elbow, [Math.sin(t + 0.3) * (ARM - 2), Math.cos(t + 0.3) * (ARM - 2)]), n(k + 1));
    return smoothPath([shoulder, elbow, hand]);
  };
  const leg = (foot: Pt, k: number) => smoothPath([hip, add(joint(hip, foot, LEG), n(k)), foot]);
  const back = (r: number): Pt => {
    const m = mixPt(hip, neck, 0.62);
    return [m[0] - Math.cos(lean) * (r + 5), m[1] - Math.sin(lean) * (r + 5)];
  };
  return {
    head,
    neck,
    hip,
    back,
    d: [smoothPath([hip, mixPt(hip, neck, 0.5), neck]), leg(footA, 3), leg(footB, 5), arm(-0.5 * s - 0.08, 7), arm(0.5 * s + 0.12, 9)],
  };
};

export const Figure: React.FC<{ b: Body; opacity?: number; filterId?: string }> = ({ b, opacity = 1, filterId = "ink-rough" }) => (
  <g opacity={opacity}>
    {b.d.map((d, i) => (
      <Stroke key={i} d={d} width={4.2} filterId={filterId} />
    ))}
    <circle cx={b.head[0]} cy={b.head[1]} r={HEAD_R} fill={INK.paper} stroke={INK.ink} strokeWidth={4} filter={`url(#${filterId})`} />
  </g>
);
