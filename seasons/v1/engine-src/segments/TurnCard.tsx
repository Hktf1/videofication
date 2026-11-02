import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT, SIZE } from "../style/theme";

import { TURN_FRAMES } from "../script/timeline";

/** 转折卡：固定样式，一道光从左扫过，之后画面转暖（配 rise 音效） */
export const TurnCard: React.FC<{ title?: string }> = ({ title = "但是" }) => {
  const f = useCurrentFrame();
  const sweep = interpolate(f, [0, 30], [-10, 110], { extrapolateRight: "clamp" });
  const o = interpolate(f, [10, 25, TURN_FRAMES - 10, TURN_FRAMES], [0, 1, 1, 0]);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${sweep}%`,
          width: 6,
          background: C.energy,
          boxShadow: `0 0 60px 20px ${C.energy}55`,
        }}
      />
      <div style={{ fontFamily: FONT.serif, fontSize: SIZE.title, color: C.energy, letterSpacing: 16, opacity: o }}>
        {title}
      </div>
    </AbsoluteFill>
  );
};
