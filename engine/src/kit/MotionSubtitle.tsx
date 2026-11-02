import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { plainText } from "../script/parse";
import type { ScreenTiming } from "../script/timing";
import { MOTION, MOTION_FONT, MOTION_LAYOUT } from "../style/motion";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * V1 底部字幕：整句同色渐显，出现后保持暖白，不随朗读逐字变色。
 * 字幕起止仍由原时间线决定；逐字时间戳继续供配音对齐和画面节拍使用。
 */
export const MotionSubtitle: React.FC<{ text: string; size?: number } & ScreenTiming> = ({ text, size, frames }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // 首屏配音可能从 0 秒开始，也要保证可见的整句淡入，不被开口前空隙压成一帧。
  const fadeFrames = Math.max(1, Math.min(Math.round(MOTION_LAYOUT.subtitleFadeSeconds * fps), frames - 1));
  const opacity = interpolate(f, [0, fadeFrames], [0, 1], clamp);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: MOTION_LAYOUT.subtitleBottom,
          textAlign: "center",
          whiteSpace: "nowrap",
          fontFamily: MOTION_FONT.kai,
          fontWeight: 400,
          fontSize: size ?? MOTION_LAYOUT.subtitleSize,
          letterSpacing: `${MOTION_LAYOUT.subtitleTracking}em`,
          lineHeight: 1.3,
          color: MOTION.text,
          opacity,
        }}
      >
        {plainText(text)}
      </div>
    </AbsoluteFill>
  );
};
