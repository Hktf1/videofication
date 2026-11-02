// 极简抽象的「点与路径」画面：一条主干分叉成正/负两条路，正反馈弯回主干，负反馈断在半路。
// 整片一个 SVG，状态由 script/minimal.ts 的轨道驱动，只在每个 cue 的前 0.6 秒过渡。
import React from "react";
import { AbsoluteFill, interpolateColors, useCurrentFrame } from "remotion";
import { stateAt, type AbstractState, type AbstractStep } from "../script/minimal";
import { MIN, MIN_LAYOUT as L } from "../style/minimal";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const SPINE = `M ${L.x0} ${L.spineY} L ${L.splitX} ${L.spineY}`;
const UPPER = `M ${L.splitX} ${L.spineY} C 980 330 1010 268 1180 268 L ${L.x1} 268`;
const LOWER = `M ${L.splitX} ${L.spineY} C 980 330 1010 392 1180 392 L ${L.x1} 392`;
const UPPER_FB = `M ${L.x1} 268 C 1440 176 1060 176 1060 ${L.spineY}`;
const LOWER_FB = `M ${L.x1} 392 C 1440 470 1150 470 1120 412`;

const UPPER_NODES = [
  { x: 930, y: 324 },
  { x: 1080, y: 285 },
  { x: 1245, y: 268 },
];
const LOWER_NODES = [
  { x: 930, y: 336 },
  { x: 1080, y: 375 },
  { x: 1245, y: 392 },
];

const draw = (p: number) => ({
  pathLength: 1,
  strokeDasharray: 1,
  strokeDashoffset: 1 - clamp01(p),
});

const Stroke: React.FC<{ d: string; p: number; color: string; width?: number; opacity?: number }> = ({
  d, p, color, width = 2, opacity = 1,
}) => (
  <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" {...draw(p)} opacity={opacity} />
);

const Nodes: React.FC<{ at: { x: number; y: number }[]; n: number; color: string; opacity: number }> = ({
  at, n, color, opacity,
}) => (
  <>
    {at.map((p, i) => {
      const o = clamp01(n - i);
      return o > 0 ? <circle key={i} cx={p.x} cy={p.y} r={5} fill={color} opacity={o * opacity} /> : null;
    })}
  </>
);

export const MinimalCanvas: React.FC<{ steps: AbstractStep[]; initial: AbstractState }> = ({ steps, initial }) => {
  const f = useCurrentFrame();
  const s = stateAt(steps, initial, f);

  const settle = 1 - 0.65 * s.fracture;
  const upperOpacity = clamp01(1 - 0.6 * s.focus) * settle;
  const lowerOpacity = clamp01(0.35 + 0.65 * s.focus) * settle;

  const upperColor = interpolateColors(clamp01(s.upperFeedback), [0, 1], [MIN.line, MIN.goldLine]);
  const lowerColor = interpolateColors(clamp01(s.focus), [0, 1], [MIN.faint, MIN.line]);

  return (
    <AbsoluteFill>
      <svg viewBox={`0 0 ${L.width} ${L.height}`} width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        {/* 负反馈那条路先以暗线存在，转下时变亮 */}
        <g opacity={lowerOpacity}>
          <Stroke d={LOWER} p={s.branches * (0.7 + 0.3 * s.focus)} color={lowerColor} />
          <Stroke d={LOWER_FB} p={s.lowerFeedback * 0.55} color={MIN.dim} width={1.5} opacity={clamp01(s.lowerFeedback)} />
          <Nodes at={LOWER_NODES} n={s.lowerNodes} color={MIN.dim} opacity={0.9} />
        </g>

        {/* 主干（起点） */}
        <Stroke d={SPINE} p={s.spine} color={MIN.line} opacity={settle} />
        {s.spine > 0 && <circle cx={L.x0} cy={L.spineY} r={4} fill={MIN.ink} opacity={clamp01(s.spine) * settle} />}

        {/* 正反馈那条路 */}
        <g opacity={upperOpacity}>
          <Stroke d={UPPER} p={s.branches * (0.7 + 0.3 * Math.max(s.extend, s.upperFeedback))} color={upperColor} width={2.2} />
          {s.stall > 0 && (
            <line x1={1330} y1={L.upperY} x2={L.x1} y2={L.upperY} stroke={MIN.bg} strokeWidth={12} opacity={clamp01(s.stall)} />
          )}
          <Stroke d={UPPER_FB} p={s.upperFeedback} color={MIN.goldLine} width={1.8}
            opacity={clamp01(s.upperFeedback) * (1 - 0.75 * clamp01(s.stall))} />
          <circle cx={1155} cy={299} r={46} fill="none" stroke={MIN.goldLine} strokeWidth={1.6}
            transform="rotate(-90 1155 299)" opacity={clamp01(s.cycle) * (1 - 0.75 * clamp01(s.stall))} {...draw(s.cycle)} />
          <Nodes at={UPPER_NODES} n={s.upperNodes} color={MIN.accent} opacity={1} />
        </g>

        {/* 怀疑：整条路径出现虚线断口 */}
        {s.fracture > 0 && (
          <g opacity={clamp01(s.fracture)} stroke={MIN.dim} strokeWidth={1.6} fill="none" strokeDasharray="9 13">
            <path d={SPINE} />
            <path d={UPPER} opacity={upperOpacity} />
            <path d={LOWER} opacity={lowerOpacity} />
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};
