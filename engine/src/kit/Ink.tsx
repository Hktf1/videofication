// 02-1 墨线画布：暖纸上的手绘墨线。一条路从「希望」开始，
// 被「逻辑正确」的直尺量过，再长出有反馈的歪路，最后卷成庞氏闭环。
// 坐标直接用 1920×1080 画面坐标，字与线都按整幅画布布局。
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { FONT } from "../style/theme";
import { INK, INK_LAYOUT } from "../style/ink";
import type { InkSlot } from "../experiment/ink02";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const prog = (f: number, at: number, dur = 18) =>
  interpolate(f, [at, at + dur], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const fadeOut = (f: number, at: number, dur = 14) => 1 - prog(f, at, dur);
const mod = (n: number, m: number) => ((n % m) + m) % m;

type Pt = [number, number];

/* ---------- 曲线：Catmull-Rom 采样 + 平滑路径 ---------- */

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

const resampleOpen = (pts: Pt[], n: number): Pt[] =>
  Array.from({ length: n }, (_, i) => pointAtOpen(pts, i / (n - 1)));

const resampleClosed = (pts: Pt[], n: number): Pt[] => {
  const { segs, total } = arcLengths(pts);
  const target = (t: number) => {
    const d = t * total;
    for (const s of segs) {
      if (d <= s.start + s.len) {
        const k = s.len ? (d - s.start) / s.len : 0;
        return [s.a[0] + (s.b[0] - s.a[0]) * k, s.a[1] + (s.b[1] - s.a[1]) * k] as Pt;
      }
    }
    return pts[pts.length - 1];
  };
  return Array.from({ length: n }, (_, i) => target(i / n));
};

const pointAtClosed = (pts: Pt[], t: number): Pt => {
  const n = pts.length;
  const x = mod(t, 1) * n;
  const i = Math.floor(x) % n;
  const k = x - Math.floor(x);
  const a = pts[i], b = pts[(i + 1) % n];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
};

/* ---------- 基础元件 ---------- */

const InkStroke: React.FC<{
  d: string; progress?: number; color?: string; width?: number; opacity?: number; rough?: boolean;
}> = ({ d, progress = 1, color = INK.ink, width = 2.6, opacity = 1, rough = true }) => {
  const dash = progress < 0.999
    ? { pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - progress }
    : {};
  return (
    <g opacity={opacity}>
      {rough && (
        <path d={d} fill="none" stroke={color} strokeWidth={width + 2.2} strokeLinecap="round"
          strokeLinejoin="round" opacity={0.13} filter="url(#ink-rough)" {...dash} />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round"
        strokeLinejoin="round" filter={rough ? "url(#ink-rough)" : undefined} {...dash} />
    </g>
  );
};

const Vertical: React.FC<{
  text: string; x: number; y: number; size?: number; gap?: number; color?: string; opacity?: number;
}> = ({ text, x, y, size = 30, gap = 8, color = INK.dim, opacity = 1 }) => (
  <g opacity={opacity} fill={color} fontFamily={FONT.kai} fontSize={size} textAnchor="middle">
    {[...text].map((c, i) => (
      <text key={i} x={x} y={y + i * (size + gap)} dominantBaseline="central">{c}</text>
    ))}
  </g>
);

const Phase: React.FC<{ label: string; inAt: number; outAt?: number }> = ({ label, inAt, outAt }) => {
  const f = useCurrentFrame();
  const opacity = prog(f, inAt, 16) * (outAt === undefined ? 1 : fadeOut(f, outAt));
  return (
    <g opacity={opacity}>
      <rect x={88} y={76} width={14} height={14} fill={INK.accent} />
      <Vertical text={label} x={95} y={126} size={32} gap={8} color={INK.dim} />
    </g>
  );
};

const Seal: React.FC<{ text: string; x: number; y: number; inAt: number; outAt?: number }> = ({
  text, x, y, inAt, outAt,
}) => {
  const f = useCurrentFrame();
  const p = prog(f, inAt, 10);
  const opacity = p * (outAt === undefined ? 1 : fadeOut(f, outAt));
  const scale = 1.24 - 0.24 * p;
  return (
    <g opacity={opacity} transform={`translate(${x} ${y}) rotate(-7) scale(${scale})`}>
      <rect x={-52} y={-52} width={104} height={104} fill={INK.accent} opacity={0.92} filter="url(#ink-rough)" />
      <rect x={-43} y={-43} width={86} height={86} fill="none" stroke={INK.paper} strokeWidth={1.3} opacity={0.72} />
      <text textAnchor="middle" dominantBaseline="central" fontFamily={FONT.kai} fontSize={36}
        fill={INK.paper} letterSpacing="0.06em">{text}</text>
    </g>
  );
};

/* ---------- 主画布 ---------- */

const X0 = INK_LAYOUT.x0;
const X1 = INK_LAYOUT.x1;
const Y = INK_LAYOUT.lineY;

const HOPE_CTRL: Pt[] = [
  [X0, Y + 2], [560, Y - 5], [1040, Y + 4], [1320, Y - 3], [X1, Y],
];

const CROOK_CTRL: Pt[] = [
  [X0, 640], [430, 578], [650, 690], [870, 606], [1090, 680], [1300, 588], [1500, 652], [X1, 618],
];

const LOOP_C = { x: 960, y: 430, r: 170 };
const LOOP_CTRL: Pt[] = Array.from({ length: 12 }, (_, i) => {
  const a = ((-90 + i * 30) * Math.PI) / 180;
  const r = LOOP_C.r + 5 * Math.sin(i * 2.1) + 3 * Math.cos(i * 1.4);
  return [LOOP_C.x + Math.cos(a) * r, LOOP_C.y + Math.sin(a) * r] as Pt;
});

const CROOK_CURVE = catmullRom(CROOK_CTRL, 20);
const CROOK_SAMPLED = resampleOpen(CROOK_CURVE, 16);
const LOOP_CURVE = catmullRom(LOOP_CTRL, 10, true);
const LOOP_SAMPLED = resampleClosed(LOOP_CURVE, 16);

export const InkCanvas: React.FC<{ slots: InkSlot[] }> = ({ slots }) => {
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

  // 手绘主路 → 直尺 → 退成淡墨
  const hopeP = prog(f, hopeAt + 4, 46);
  const hopeFade = prog(f, logicAt + 4, 24);
  const lineGone = prog(f, loopAt + 6, 20);
  const hopeOpacity = Math.max(0, 1 - 0.88 * hopeFade - 0.12 * lineGone);

  const ruleP = prog(f, logicAt + 4, 30);
  const dim = prog(f, dimAt, 24);
  const ruleOpacity = Math.max(0, 1 - 0.9 * dim - 0.1 * lineGone);

  // 希望：朱砂点 → 空心的反馈 0
  const dotP = prog(f, dotAt, 14);
  const hollow = prog(f, logicAt + 12, 18);
  const dotOpacity = dotP * (1 - hollow);
  const hollowOpacity = dotP * hollow * Math.max(0, 1 - 0.7 * dim) * (1 - lineGone);

  // 歪路：有反馈的一路
  const crookP = prog(f, feedAt + 4, 44);
  const crookOpacity = fadeOut(f, loopAt + 4, 16);

  // 卷成闭环
  const morphP = prog(f, loopAt + 4, 44);
  const morphed: Pt[] = CROOK_SAMPLED.map((q, i) => [
    q[0] + (LOOP_SAMPLED[i][0] - q[0]) * morphP,
    q[1] + (LOOP_SAMPLED[i][1] - q[1]) * morphP,
  ] as Pt);
  const loopD = smoothPath(morphed, morphP > 0.95);
  const loopOp = prog(f, loopAt + 4, 16);

  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id="ink-rough" x="-4%" y="-8%" width="108%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.05" numOctaves="2" seed="5" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      <Phase label="起点" inAt={dotAt} outAt={logicAt} />
      <Phase label="逻辑" inAt={logicAt} outAt={feedAt} />
      <Phase label="反馈" inAt={feedAt} outAt={loopAt} />
      <Phase label="庞氏" inAt={loopAt} />

      {/* 一条路：手绘的、通往希望对墨线 */}
      <InkStroke d={smoothPath(HOPE_CTRL)} progress={hopeP} color={INK.ink} width={2.8}
        opacity={hopeOpacity} />
      <Vertical text="希望" x={1628} y={356} size={27} gap={6} color={INK.dim}
        opacity={prog(f, dotAt + 6, 14) * fadeOut(f, logicAt, 14)} />

      {/* 逻辑正确：直尺压过手绘线，反馈停在 0 */}
      <g opacity={prog(f, logicAt + 4, 16) * ruleOpacity}>
        {Array.from({ length: 19 }).map((_, i) => (
          <line key={i} x1={X0 + i * 80} y1={Y - 10} x2={X0 + i * 80} y2={Y + 10}
            stroke={INK.dim} strokeWidth={1.3} />
        ))}
      </g>
      <InkStroke d={`M ${X0} ${Y} L ${X1} ${Y}`} progress={ruleP} color={INK.dim} width={2.1}
        opacity={ruleOpacity} rough={false} />

      {/* 向前走，但没有东西回来 */}
      {Array.from({ length: 3 }).map((_, i) => {
        const phase = mod(f - logicAt - i * 40, 125) / 125;
        const op = f < logicAt ? 0 : Math.sin(Math.PI * phase) * 0.5 * ruleOpacity;
        return <circle key={i} cx={X0 + (X1 - X0) * phase} cy={Y} r={3.2} fill={INK.dim} opacity={op} />;
      })}

      {/* 希望熄灭，只剩一个空心的 0 */}
      <circle cx={X1} cy={Y} r={22} fill="none" stroke={INK.dim} strokeWidth={1.8}
        opacity={hollowOpacity} />
      <text x={X1} y={Y + 1} textAnchor="middle" dominantBaseline="central" fontFamily={FONT.kai}
        fontSize={32} fill={INK.dim} opacity={hollowOpacity}>0</text>
      <circle cx={X1} cy={Y} r={11} fill={INK.accent} opacity={dotOpacity} />
      <circle cx={X1} cy={Y} r={26} fill={INK.accent} opacity={dotOpacity * 0.12} />
      <Vertical text="反馈" x={1732} y={Y - 44} size={27} gap={5} color={INK.dim}
        opacity={prog(f, logicAt + 20, 16) * Math.max(0, 1 - dim) * (1 - lineGone)} />

      {/* 歪路：实实在在的正向反馈 */}
      <InkStroke d={smoothPath(CROOK_CTRL)} progress={crookP} color={INK.accent} width={3.2}
        opacity={crookOpacity} />
      {Array.from({ length: 3 }).map((_, i) => {
        const phase = mod(f - feedAt - 36 - i * 46, 138) / 138;
        const pos = pointAtOpen(CROOK_CURVE, 1 - phase);
        const op = f < feedAt + 36 ? 0 : Math.sin(Math.PI * phase) * crookOpacity;
        return <circle key={i} cx={pos[0]} cy={pos[1]} r={4.4} fill={INK.accent} opacity={op} />;
      })}

      <Seal text="正确" x={1470} y={512} inAt={stampAt + 4} outAt={loopAt + 6} />

      {/* 闭环：没有出口 */}
      <InkStroke d={loopD} color={INK.accent} width={3.4} opacity={loopOp} />
      <g opacity={prog(f, loopAt + 30, 12)} fill={INK.accent}>
        <polygon points="0,0 -14,-5.5 -14,5.5" transform={`translate(${LOOP_SAMPLED[0][0]} ${LOOP_SAMPLED[0][1]}) rotate(0)`} />
        <polygon points="0,0 -14,-5.5 -14,5.5" transform={`translate(${LOOP_SAMPLED[8][0]} ${LOOP_SAMPLED[8][1]}) rotate(180)`} />
      </g>
      {Array.from({ length: 3 }).map((_, i) => {
        const pos = pointAtClosed(LOOP_SAMPLED, (f - loopAt) / 150 + i / 3);
        const op = prog(f, loopAt + 30, 12) * (0.6 + 0.4 * Math.sin((f + i * 18) / 9));
        return <circle key={i} cx={pos[0]} cy={pos[1]} r={5} fill={INK.accent} opacity={Math.max(0, op)} />;
      })}
      <Vertical text="没有出口" x={LOOP_C.x} y={LOOP_C.y - 54} size={29} gap={9} color={INK.accent}
        opacity={prog(f, exitAt + 2, 16)} />
    </svg>
  );
};
