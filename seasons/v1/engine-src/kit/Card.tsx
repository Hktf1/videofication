import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SIZE } from "../style/theme";

/** 并列对比用的线框卡片 */
export const Card: React.FC<{
  title: string;
  body?: string;
  color?: string;
  delay?: number;
  width?: number;
}> = ({ title, body, color = C.line, delay = 0, width = 520 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        width,
        padding: "48px 40px",
        border: `${3}px solid ${color}`,
        borderRadius: 16,
        textAlign: "center",
        opacity: s,
        transform: `translateY(${(1 - s) * 30}px)`,
      }}
    >
      <div style={{ fontFamily: FONT.serif, fontSize: 64, color }}>{title}</div>
      {body && (
        <div style={{ fontFamily: FONT.serif, fontSize: SIZE.label, color: C.ink, marginTop: 24, opacity: 0.8 }}>
          {body}
        </div>
      )}
    </div>
  );
};
