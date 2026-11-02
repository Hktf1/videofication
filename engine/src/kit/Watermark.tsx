import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { BRAND, C, FONT, WATERMARK } from "../style/theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 右下角公众号水印：仅在处理稿头部写了「水印：是」时整片常驻，片头短淡入；片尾卡出现时由 Episode 裁掉，避免和居中署名重复 */
export const Watermark: React.FC = () => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, WATERMARK.fadeIn], [0, WATERMARK.opacity], clamp);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          right: WATERMARK.right,
          bottom: WATERMARK.bottom,
          fontFamily: FONT.kai,
          fontWeight: FONT.weight,
          fontSize: WATERMARK.size,
          letterSpacing: `${WATERMARK.tracking}em`,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          color: C.dim,
          opacity,
        }}
      >
        {BRAND.prefix}：{BRAND.account}
      </div>
    </AbsoluteFill>
  );
};
