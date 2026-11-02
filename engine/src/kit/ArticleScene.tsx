import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneProps } from "../script/scene";
import { plainText } from "../script/parse";
import { MOTION, MOTION_FONT } from "../style/motion";

/** 无定制分镜时的基础动效：只展示输入中的文字和阅读进度，不编造数据或关系。 */
export const ArticleScene: React.FC<SceneProps> = ({ cues }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let index = 0;
  for (let i = 0; i < cues.length && cues[i].at <= frame; i++) index = i;
  const start = Math.floor(index / 3) * 3;
  const progress = cues.length ? (index + 1) / cues.length : 0;
  return <AbsoluteFill>
    <svg width="1920" height="1080" viewBox="0 0 1920 1080">
      <path d="M330 340 V710" fill="none" stroke={MOTION.line} strokeWidth={2} />
      {cues.slice(start, start + 3).map((cue, i) => {
        const active = start + i === index;
        const opacity = frame < cue.at ? 0.25 : interpolate(frame - cue.at, [0, 0.4 * fps], [0.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return <g key={cue.index} opacity={opacity}>
          <circle cx="330" cy={380 + i * 140} r={active ? 8 : 5} fill={active ? MOTION.amber : MOTION.muted} />
          <text x="390" y={394 + i * 140} fontFamily={MOTION_FONT.sans} fontSize={40} fill={active ? MOTION.text : MOTION.muted}>
            {plainText(cue.text)}
          </text>
        </g>;
      })}
      <path d="M330 780 H1590" stroke={MOTION.line} strokeWidth={2} />
      <path d={`M330 780 H${330 + 1260 * progress}`} stroke={MOTION.amber} strokeWidth={3} />
    </svg>
  </AbsoluteFill>;
};
