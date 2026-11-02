import React from "react";
import { C, SIZE } from "../style/theme";

export type Pose = "stand" | "slump" | "up";

/** 固定角色：线条小圆人。(x,y) 是脚底中点。 */
export const Figure: React.FC<{
  x: number;
  y: number;
  scale?: number;
  pose?: Pose;
  color?: string;
}> = ({ x, y, scale = 1, pose = "stand", color = C.line }) => {
  const head = pose === "slump" ? { cx: 18, cy: -150 } : { cx: 0, cy: -170 };
  const arms =
    pose === "up"
      ? "M -50 -150 L 0 -110 L 50 -150"
      : pose === "slump"
        ? "M -30 -40 L 6 -105 L 40 -40"
        : "M -40 -50 L 0 -110 L 40 -50";
  return (
    <svg
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
      width={1}
      height={1}
    >
      <g
        transform={`translate(${x} ${y}) scale(${scale})`}
        fill="none"
        stroke={color}
        strokeWidth={SIZE.stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx={head.cx} cy={head.cy} r={28} />
        <path d={`M ${head.cx * 0.6} ${head.cy + 28} L 0 -60`} />
        <path d={arms} />
        <path d="M -30 0 L 0 -60 L 30 0" />
      </g>
    </svg>
  );
};
