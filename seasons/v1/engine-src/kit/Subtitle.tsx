import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, FONT, LAYOUT, SIZE } from "../style/theme";

/** 底部字幕。【】内的词用 accent 色强调。 */
export const Subtitle: React.FC<{ text: string; accent: string; size?: number }> = ({
  text,
  accent,
  size = SIZE.subtitle,
}) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(f, [0, 8], [12, 0], { extrapolateRight: "clamp" });
  const parts = text.split(/(【[^】]*】)/).filter(Boolean);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: LAYOUT.subtitleY,
        textAlign: "center",
        fontFamily: FONT.serif,
        fontSize: size,
        color: C.ink,
        letterSpacing: 4,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      {parts.map((p, i) =>
        p.startsWith("【") ? (
          <span key={i} style={{ color: accent }}>{p.slice(1, -1)}</span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </div>
  );
};
