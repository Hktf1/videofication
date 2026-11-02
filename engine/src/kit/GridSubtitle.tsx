// 网格风格字幕：左下角 documentary 式，红色竖条 + 无衬线字。
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { splitEmphasis } from "../script/parse";
import { GRID } from "../style/grid";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type GridSubtitleProps = {
  text: string;
  frames: number;
  fadeIn: number;
  fadeOutAt: number;
  emColor?: string;
};

export const GridSubtitle: React.FC<GridSubtitleProps> = ({ text, fadeIn, fadeOutAt, emColor }) => {
  const f = useCurrentFrame();
  const opacity = f >= fadeOutAt ? 0 : interpolate(f, [0, Math.max(1, fadeIn)], [0, 1], clamp);
  const rise = interpolate(f, [0, Math.max(1, fadeIn)], [10, 0], clamp);
  const parts = splitEmphasis(text);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 100, top: GRID.textY - 26, width: 6, height: 52,
        background: GRID.accent, opacity }} />
      <div style={{
        position: "absolute",
        left: GRID.textX,
        top: GRID.textY,
        transform: `translateY(calc(-50% + ${rise}px))`,
        fontFamily: GRID.font,
        fontWeight: 600,
        fontSize: GRID.textSize,
        lineHeight: 1.2,
        letterSpacing: "0.02em",
        color: GRID.ink,
        whiteSpace: "nowrap",
        opacity,
      }}>
        {parts.map((p, pi) => (
          <span key={pi} style={{ color: p.em && emColor ? emColor : "inherit" }}>
            {[...p.text].map((c, ci) =>
              /[，。；]/.test(c)
                ? <span key={ci} style={{ display: "inline-block", width: "0.45em" }} />
                : <span key={ci}>{c}</span>,
            )}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
