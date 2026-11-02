// 02-1 网格画布：黑白红几何风格。先用严格网格建立秩序，
// 红线出现后网格开始弯曲，最后被庞氏闭环扭成旋涡。
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { GRID } from "../style/grid";
import type { GridSlot } from "../experiment/grid02";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const prog = (f: number, at: number, dur = 18) =>
  interpolate(f, [at, at + dur], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const fadeOut = (f: number, at: number, dur = 14) => 1 - prog(f, at, dur);
const mod = (n: number, m: number) => ((n % m) + m) % m;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

type Pt = [number, number];

/* ---------- 曲线采样 ---------- */

const catmullRom = (pts: Pt[], per = 16, closed = false): Pt[] => {
  const p = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  const out: Pt[] = [];
  const count = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < count; i++) {
    const p0 = p[i], p1 = p[i + 1], p2 = p[i + 2], p3 = p[i + 3];
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(closed ? pts[0] : pts[pts.length - 1]);
  return out;
};

const smoothPath = (pts: Pt[], closed = false) => {
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

const arcLengths = (pts: Pt[]) => {
  const segs: { a: Pt; b: Pt; len: number; start: number }[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    segs.push({ a: pts[i], b: pts[i + 1], len, start: total });
    total += len;
  }
  return { segs, total };
};

const pointAtOpen = (pts: Pt[], t: number): Pt => {
  const { segs, total } = arcLengths(pts);
  const d = Math.max(0, Math.min(1, t)) * total;
  for (const s of segs) {
    if (d <= s.start + s.len) {
      const k = s.len ? (d - s.start) / s.len : 0;
      return [s.a[0] + (s.b[0] - s.a[0]) * k, s.a[1] + (s.b[1] - s.a[1]) * k];
    }
  }
  return pts[pts.length - 1];
};

const pointAtClosed = (pts: Pt[], t: number): Pt => {
  const n = pts.length;
  const x = mod(t, 1) * n;
  const i = Math.floor(x) % n;
  const k = x - Math.floor(x);
  const a = pts[i], b = pts[(i + 1) % n];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
};

const resampleOpen = (pts: Pt[], n: number): Pt[] =>
  Array.from({ length: n }, (_, i) => pointAtOpen(pts, i / (n - 1)));

const polyline = (pts: Pt[]) => `M ${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L ")}`;

/* ---------- 版面 ---------- */

const X0 = 200;
const X1 = 1720;
const Y = 400;
const CX = 960;
const CY = 400;
const R = 210;

const WAVE_CTRL: Pt[] = [
  [X0, 640], [400, 560], [600, 700], [800, 610], [1000, 690],
  [1200, 580], [1400, 660], [1600, 590], [X1, 630],
];
const WAVE = catmullRom(WAVE_CTRL, 24);
const WAVE_SAMPLED = resampleOpen(WAVE, 32);
const CIRCLE_SAMPLED: Pt[] = Array.from({ length: 32 }, (_, i) => {
  const a = ((-90 + (i * 360) / 32) * Math.PI) / 180;
  return [CX + Math.cos(a) * R, CY + Math.sin(a) * R] as Pt;
});

const waveYAtX = (x: number) => {
  for (let i = 0; i < WAVE.length - 1; i++) {
    const a = WAVE[i], b = WAVE[i + 1];
    if ((x >= a[0] && x <= b[0]) || (x <= a[0] && x >= b[0])) {
      const k = (x - a[0]) / (b[0] - a[0] || 1);
      return a[1] + (b[1] - a[1]) * k;
    }
  }
  return x < WAVE[0][0] ? WAVE[0][1] : WAVE[WAVE.length - 1][1];
};

/** 网格点：先被红线吸引，再被闭环旋涡扭动 */
const warp = (x: number, y: number, waveP: number, reach: number, swirl: number): Pt => {
  const near = Math.exp(-Math.pow((y - waveYAtX(x)) / 110, 2));
  const reached = clamp01((reach - x) / 160);
  const bx = x + waveP * near * 20 * reached;

  const dx = bx - CX;
  const dy = y - CY;
  const rho = Math.hypot(dx, dy);
  const theta = Math.atan2(dy, dx);
  const ring = Math.exp(-Math.pow((rho - R) / 130, 2));
  const theta2 = theta + swirl * 0.95 * ring;
  return [CX + Math.cos(theta2) * rho, CY + Math.sin(theta2) * rho];
};

const gridLine = (
  fixed: number, from: number, to: number, vertical: boolean,
  waveP: number, reach: number, swirl: number,
) => {
  const pts: Pt[] = [];
  const step = 24;
  for (let v = from; v <= to; v += step) {
    pts.push(vertical ? warp(fixed, v, waveP, reach, swirl) : warp(v, fixed, waveP, reach, swirl));
  }
  return polyline(pts);
};

const Vertical: React.FC<{
  text: string; x: number; y: number; size?: number; gap?: number; color?: string; opacity?: number;
}> = ({ text, x, y, size = 30, gap = 8, color = GRID.ink, opacity = 1 }) => (
  <g opacity={opacity} fill={color} fontFamily={GRID.font} fontSize={size} textAnchor="middle" fontWeight={500}>
    {[...text].map((c, i) => (
      <text key={i} x={x} y={y + i * (size + gap)} dominantBaseline="central">{c}</text>
    ))}
  </g>
);

/* ---------- 画布 ---------- */

export const GridCanvas: React.FC<{ slots: GridSlot[] }> = ({ slots }) => {
  const f = useCurrentFrame();
  const at = (i: number) => slots[i]?.from ?? 0;
  const hopeAt = at(1);
  const dotAt = at(2);
  const logicAt = at(3);
  const dimAt = at(8);
  const feedAt = at(9);
  const stampAt = at(12);
  const loopAt = at(13);
  const exitAt = at(14);

  const phase = f < logicAt ? 0 : f < feedAt ? 1 : f < loopAt ? 2 : 3;
  const phaseAt = [0, logicAt, feedAt, loopAt][phase];
  const phaseIn = prog(f, phaseAt, 8);
  const phaseText = ["01 希望", "02 逻辑", "03 反馈", "04 庞氏"][phase];
  const phaseNo = ["01", "02", "03", "04"][phase];

  // 主路与直尺
  const lineP = prog(f, hopeAt + 4, 40);
  const hollow = prog(f, logicAt + 8, 16);
  const dim = prog(f, dimAt, 24);
  const gone = prog(f, loopAt + 6, 20);
  const mainOp = Math.max(0, 1 - 0.85 * dim - 0.15 * gone);
  const tickOp = Math.max(0, 1 - dim) * (1 - gone);

  // 希望的点
  const dotP = prog(f, dotAt, 14);
  const dotOp = dotP * (1 - hollow) * (1 - dim);

  // 红线与网格
  const waveP = prog(f, feedAt + 4, 50);
  const waveOp = fadeOut(f, loopAt + 4, 16);
  const bulge = prog(f, feedAt + 20, 50) * (1 - prog(f, loopAt + 4, 30));
  const swirl = prog(f, loopAt + 4, 50);
  const reach = X0 + (X1 - X0) * waveP;

  // 卷成闭环
  const morphP = prog(f, loopAt + 4, 50);
  const morphed: Pt[] = WAVE_SAMPLED.map((q, i) => [
    q[0] + (CIRCLE_SAMPLED[i][0] - q[0]) * morphP,
    q[1] + (CIRCLE_SAMPLED[i][1] - q[1]) * morphP,
  ] as Pt);
  const loopD = smoothPath(morphed, morphP > 0.95);
  const loopOp = prog(f, loopAt + 4, 14);

  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
      {/* 背景大编号 */}
      <text x={1790} y={310} textAnchor="end" fontFamily={GRID.font} fontSize={360} fontWeight={800}
        fill={GRID.ink} opacity={0.055 * phaseIn} letterSpacing="-0.04em">{phaseNo}</text>

      {/* 网格：先正，后被红线吸引，最后被闭环扭成旋涡 */}
      <g stroke={GRID.line} strokeWidth={1.2} fill="none" opacity={0.65 + 0.35 * prog(f, logicAt + 4, 20)}>
        {Array.from({ length: 13 }).map((_, i) => {
          const x = 100 + i * 140;
          return <path key={`v${i}`} d={gridLine(x, 0, 1080, true, bulge, reach, swirl)} />;
        })}
        {[100, 250, 400, 550, 700, 850].map((y) => (
          <path key={`h${y}`} d={gridLine(y, 0, 1920, false, bulge, reach, swirl)} />
        ))}
      </g>

      {/* 左上：阶段标记 */}
      <g opacity={phaseIn}>
        <rect x={100} y={52} width={12} height={12} fill={GRID.accent} />
        <text x={126} y={64} fontFamily={GRID.font} fontSize={26} fontWeight={600}
          fill={GRID.ink} letterSpacing="0.12em">{phaseText}</text>
      </g>

      {/* 一条精确的路 */}
      <path d={`M ${X0} ${Y} L ${X1} ${Y}`} fill="none" stroke={GRID.ink} strokeWidth={4}
        strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - lineP}
        opacity={mainOp} />

      {/* 刻度 */}
      <g opacity={prog(f, logicAt + 4, 16) * tickOp} stroke={GRID.ink} strokeWidth={2.2}>
        {Array.from({ length: 23 }).map((_, i) => (
          <line key={i} x1={X0 + i * 69} y1={Y - 11} x2={X0 + i * 69} y2={Y + 11} />
        ))}
      </g>

      {/* 向前走，没有回响 */}
      {Array.from({ length: 3 }).map((_, i) => {
        const phasePos = mod(f - logicAt - i * 40, 120) / 120;
        const op = f < logicAt ? 0 : Math.sin(Math.PI * phasePos) * 0.65 * tickOp;
        return <circle key={i} cx={X0 + (X1 - X0) * phasePos} cy={Y} r={4} fill={GRID.ink} opacity={op} />;
      })}

      {/* 反馈停在 0 */}
      <g opacity={hollow * (1 - dim) * (1 - gone)}>
        <circle cx={X1} cy={Y} r={30} fill="none" stroke={GRID.ink} strokeWidth={3} />
        <text x={X1} y={Y + 2} textAnchor="middle" dominantBaseline="central" fontFamily={GRID.font}
          fontSize={34} fontWeight={600} fill={GRID.ink}>0</text>
        <text x={X1} y={Y + 62} textAnchor="middle" fontFamily={GRID.font} fontSize={20}
          fill={GRID.gray} letterSpacing="0.16em">反馈</text>
      </g>

      {/* 希望的红点 */}
      <circle cx={X1} cy={Y} r={16 * (0.8 + 0.2 * Math.sin((f - dotAt) / 9))} fill={GRID.accent}
        opacity={dotOp} />
      <circle cx={X1} cy={Y} r={34} fill={GRID.accent} opacity={dotOp * 0.1} />

      {/* 红路：有反馈的一路 */}
      <path d={smoothPath(WAVE_CTRL)} fill="none" stroke={GRID.accent} strokeWidth={6}
        strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - waveP}
        opacity={waveOp} />
      {Array.from({ length: 3 }).map((_, i) => {
        const phasePos = mod(f - feedAt - 36 - i * 46, 140) / 140;
        const pos = pointAtOpen(WAVE, 1 - phasePos);
        const op = f < feedAt + 36 ? 0 : Math.sin(Math.PI * phasePos) * waveOp;
        return <circle key={i} cx={pos[0]} cy={pos[1]} r={5} fill={GRID.accent} opacity={op} />;
      })}

      {/* 印刷错位感的「正确」标签 */}
      <g opacity={prog(f, stampAt + 4, 8) * fadeOut(f, loopAt + 4, 12)}
        transform={`translate(${1468} ${520}) scale(${1.1 - 0.1 * prog(f, stampAt + 4, 8)})`}>
        <rect x={-80} y={-28} width={160} height={56} fill={GRID.ink} />
        <rect x={-88} y={-36} width={160} height={56} fill={GRID.accent} />
        <text x={-8} y={-8} textAnchor="middle" dominantBaseline="central" fontFamily={GRID.font}
          fontSize={28} fontWeight={700} fill={GRID.paper} letterSpacing="0.08em">正确</text>
      </g>

      {/* 闭环 */}
      <path d={loopD} fill="none" stroke={GRID.accent} strokeWidth={6} strokeLinejoin="round" opacity={loopOp} />
      <g opacity={prog(f, loopAt + 30, 12)} fill={GRID.accent}>
        <polygon points="0,0 -16,-6 -16,6" transform={`translate(${CIRCLE_SAMPLED[0][0]} ${CIRCLE_SAMPLED[0][1]}) rotate(0)`} />
        <polygon points="0,0 -16,-6 -16,6" transform={`translate(${CIRCLE_SAMPLED[16][0]} ${CIRCLE_SAMPLED[16][1]}) rotate(180)`} />
      </g>
      {Array.from({ length: 3 }).map((_, i) => {
        const pos = pointAtClosed(CIRCLE_SAMPLED, (f - loopAt) / 150 + i / 3);
        const op = prog(f, loopAt + 30, 12) * (0.6 + 0.4 * Math.sin((f + i * 18) / 9));
        return <circle key={i} cx={pos[0]} cy={pos[1]} r={6} fill={GRID.accent} opacity={Math.max(0, op)} />;
      })}
      <Vertical text="没有出口" x={CX} y={CY - 57} size={32} gap={10} color={GRID.ink}
        opacity={prog(f, exitAt + 2, 16)} />

      {/* 字幕区：用纸色压住网格，形成干净的 lower third */}
      <rect x={0} y={GRID.bandTop} width={1920} height={1080 - GRID.bandTop} fill={GRID.paper} />
      <line x1={100} y1={GRID.bandTop} x2={1820} y2={GRID.bandTop} stroke={GRID.line} strokeWidth={1.2} />
      <text x={1800} y={960} textAnchor="end" fontFamily={GRID.font} fontSize={18} fill={GRID.gray}
        letterSpacing="0.2em" opacity={0.7}>02-1</text>
    </svg>
  );
};
