import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT, SIZE } from "../style/theme";

import { CHAPTER_FRAMES } from "../script/timeline";

/** 章节路标卡：每个编号章节开头自动插入（配 page 音效） */
export const ChapterCard: React.FC<{ no: number; title: string }> = ({ no, title }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10, CHAPTER_FRAMES - 8, CHAPTER_FRAMES], [0, 1, 1, 0]);
  const w = interpolate(f, [5, 25], [0, 240], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: o }}>
      <div style={{ fontFamily: FONT.sans, fontSize: SIZE.label * 1.5, color: C.muted }}>
        {String(no).padStart(2, "0")}
      </div>
      <div style={{ width: w, height: 2, background: C.line, margin: "28px 0" }} />
      <div style={{ fontFamily: FONT.serif, fontSize: SIZE.title * 0.8, color: C.ink, letterSpacing: 10 }}>{title}</div>
    </AbsoluteFill>
  );
};
