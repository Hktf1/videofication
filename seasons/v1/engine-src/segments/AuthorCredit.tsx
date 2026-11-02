import React from "react";
import { AbsoluteFill, Easing, interpolate, interpolateColors, useCurrentFrame } from "remotion";
import { C, FONT, LAYOUT, SIZE } from "../style/theme";

import { CREDIT_FRAMES } from "../script/timeline";
const AUTHOR = "示例账号";

/** 署名片段：居中出现，再缩到右下角，与常驻角标衔接 */
export const AuthorCredit: React.FC = () => {
  const f = useCurrentFrame();
  const appear = interpolate(f, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const move = interpolate(f, [40, CREDIT_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const size = interpolate(move, [0, 1], [120, SIZE.label]);
  const x = interpolate(move, [0, 1], [LAYOUT.width / 2, LAYOUT.width - LAYOUT.pad]);
  const y = interpolate(move, [0, 1], [LAYOUT.height / 2, LAYOUT.height - LAYOUT.pad]);
  const ax = interpolate(move, [0, 1], [-50, -100]);
  const ay = interpolate(move, [0, 1], [-50, -100]);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `translate(${ax}%, ${ay}%)`,
          fontFamily: FONT.serif,
          fontSize: size,
          letterSpacing: size * 0.2,
          color: interpolateColors(move, [0, 1], [C.ink, C.muted]),
          opacity: appear,
        }}
      >
        {AUTHOR}
      </div>
    </AbsoluteFill>
  );
};

/** 正片常驻右下角标 */
export const AuthorBadge: React.FC = () => (
  <div
    style={{
      position: "absolute",
      right: LAYOUT.pad,
      bottom: LAYOUT.pad,
      fontFamily: FONT.serif,
      fontSize: SIZE.label,
      letterSpacing: SIZE.label * 0.2,
      color: C.muted,
    }}
  >
    {AUTHOR}
  </div>
);
