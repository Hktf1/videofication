import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, FONT, SIZE } from "../style/theme";

/** 引线标注：从 (x,y) 指向的点拉一条折线到文字 */
export const Callout: React.FC<{
  x: number;
  y: number;
  dx?: number;
  dy?: number;
  label: string;
  color?: string;
  delay?: number;
}> = ({ x, y, dx = 160, dy = -80, label, color = C.line, delay = 0 }) => {
  const f = useCurrentFrame() - delay;
  const p = interpolate(f, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ex = x + dx;
  const ey = y + dy;
  const len = Math.hypot(dx, dy) + 80;
  return (
    <>
      <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="100%" height="100%">
        <circle cx={x} cy={y} r={6} fill={color} opacity={p} />
        <polyline
          points={`${x},${y} ${ex},${ey} ${ex + Math.sign(dx || 1) * 80},${ey}`}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray={len}
          strokeDashoffset={len * (1 - p)}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: dx >= 0 ? ex + 96 : undefined,
          right: dx < 0 ? `calc(100% - ${ex - 96}px)` : undefined,
          top: ey - SIZE.label * 0.7,
          fontFamily: FONT.serif,
          fontSize: SIZE.label,
          color,
          opacity: p,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </>
  );
};
