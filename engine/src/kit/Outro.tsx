import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { BRAND, C, FONT, OUTRO } from "../style/theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * 片尾卡：黑底，居中一行公众号名 + 一行关注提示，只淡入不淡出，最后一帧停住。
 * 只有处理稿头部写了「片尾：是」才加，默认不加；时长见 timeline.ts 的 OUTRO_FRAMES，合并全片时只保留最后一章的这一张。
 */
export const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const title = interpolate(f, [6, 24], [0, 1], clamp);
  const sub = interpolate(f, [18, 40], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: C.bg, justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontFamily: FONT.kai,
          fontWeight: FONT.weight,
          fontSize: OUTRO.titleSize,
          letterSpacing: `${OUTRO.titleTracking}em`,
          lineHeight: 1.2,
          color: C.ink,
          opacity: title,
          filter: title < 1 ? `blur(${(1 - title) * 4}px)` : undefined,
        }}
      >
        {BRAND.prefix}：{BRAND.account}
      </div>
      <div
        style={{
          marginTop: OUTRO.gap,
          fontFamily: FONT.kai,
          fontWeight: FONT.weight,
          fontSize: OUTRO.subSize,
          letterSpacing: `${OUTRO.subTracking}em`,
          lineHeight: 1.2,
          color: C.dim,
          opacity: sub,
        }}
      >
        {BRAND.outroSub}
      </div>
    </AbsoluteFill>
  );
};
