import React from "react";
import { AbsoluteFill, interpolate, interpolateColors, useCurrentFrame } from "remotion";
import { splitEmphasis, FPS, type Screen } from "../script/parse";
import { PACE, type ScreenTiming } from "../script/timing";
import { C, FONT, LAYOUT, SIZE } from "../style/theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const sec = (s: number) => Math.round(s * FPS);

/** 单行居中文字：淡入（原地，可由虚到实）→ 停 → 直接消失。位置固定，不随内容跳动。 */
export const Line: React.FC<{
  frames: number;
  fadeIn?: number;
  fadeOutAt?: number;
  fadeOut?: number; // 结尾渐隐帧数；0 = 到点直接消失（v1 默认）
  size?: number;
  color?: string;
  font?: string;
  weight?: number;
  shadow?: string;
  y?: number;
  blurIn?: number; // 淡入时由多虚变实，px
  tracking?: number; // 字间距 em
  scaleFrom?: number; // 整行从该倍率收到 1（极简风格的核心句），默认不缩放
  scaleDur?: number; // 缩放时长（帧）
  children: React.ReactNode;
}> = ({ frames, fadeIn = 6, fadeOutAt = frames - 5, fadeOut = 0, size, color = C.ink, font = FONT.kai,
  weight = FONT.weight, shadow, y = LAYOUT.centerY, blurIn = 0, tracking = SIZE.tracking,
  scaleFrom, scaleDur = 12, children }) => {
  const f = useCurrentFrame();
  // 默认只渐显不渐隐（用户 2026-10-17）；暗调样片可传 fadeOut 做交叉淡化
  // 短屏时收窄渐隐区间，避免 [a, b] 不递增导致 interpolate 抛错
  const outDur = Math.min(fadeOut, Math.max(0, fadeOutAt - fadeIn));
  const out = outDur > 0
    ? interpolate(f, [fadeOutAt - outDur, fadeOutAt], [1, 0], clamp)
    : f >= fadeOutAt ? 0 : 1;
  const opacity = interpolate(f, [0, fadeIn], [0, 1], clamp) * out;
  const rise = interpolate(f, [0, fadeIn], [LAYOUT.rise, 0], clamp);
  const blur = interpolate(f, [0, fadeIn], [blurIn, 0], clamp);
  const scale = scaleFrom === undefined ? 1 : interpolate(f, [0, Math.max(1, scaleDur)], [scaleFrom, 1], clamp);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: y,
          transform: `translateY(calc(-50% + ${rise}px)) scale(${scale})`,
          transformOrigin: "center",
          textAlign: "center",
          whiteSpace: "nowrap",
          fontFamily: font,
          fontWeight: weight,
          fontSize: size ?? SIZE.subtitle,
          lineHeight: 1.2,
          letterSpacing: `${tracking}em`,
          color,
          opacity,
          textShadow: shadow,
          filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

// 标点照常显示；全角标点自带很宽的右侧留白，收掉一部分，免得句子看起来断成两截
const TIGHT = /[，。；、：]/;

type Props = Pick<Screen, "text" | "fx" | "segments" | "afterTurn" | "turn"> &
  ScreenTiming & {
    size?: number; y?: number; color?: string; emColor?: string;
    font?: string; weight?: number; shadow?: string;
    fadeOut?: number; // 结尾渐隐帧数（v1 默认直接消失）
    scaleFrom?: number; // 整行从该倍率收到 1（极简风格核心句），默认不缩放
  };

/**
 * 字幕。按句子类型选动效（都只用透明度、模糊、字距、出现时机）：
 * - 普通：整行淡入（【】不再变色，与正文同色）
 * - 金句：逐字由虚到实，跟朗读节奏
 * - 主旨：逐字显现 + 字距收拢，念完整句转强调色
 * - 分段：按顿号分段依次出现，前面的留在屏上
 * - 转折后一句由虚到实浮现，转折前一句淡出时略变虚
 */
export const Subtitle: React.FC<Props> = ({ text, fx, segments, afterTurn, turn, size, y,
  color: baseColor = C.ink, emColor, font, weight, shadow, fadeOut, scaleFrom, ...t }) => {
  const f = useCurrentFrame();
  const charFade = sec(PACE.charFade);

  // 每个字符何时出现（帧）；undefined 表示随整行出现
  const parts = splitEmphasis(text);
  const plain = parts.map((p) => p.text).join("");
  const glyphs = [...plain];
  const appear: (number | undefined)[] = glyphs.map(() => undefined);
  if (fx) glyphs.forEach((_, i) => (appear[i] = t.chars[i]));
  else if (segments) {
    let segStart: number | undefined;
    glyphs.forEach((c, i) => {
      if (i > 0 && glyphs[i - 1] === "、") segStart = t.chars[i];
      appear[i] = segStart;
    });
  }

  // 主旨：字距从宽收拢，念完转强调色
  const theme = fx === "主旨";
  const tracking = theme ? interpolate(f, [0, t.speakEnd], [0.12, SIZE.tracking], clamp) : SIZE.tracking;
  const tint = theme ? interpolate(f, [t.speakEnd, t.speakEnd + sec(PACE.themeTint)], [0, 1], clamp) : 0;
  const base = tint ? interpolateColors(tint, [0, 1], [baseColor, C.accent]) : baseColor;

  let gi = 0;
  const nodes: React.ReactNode[] = [];
  for (const p of parts) {
    // 【】关键词默认与正文同色；新风格可传 emColor 单独着色
    const color = p.em && emColor ? emColor : base;
    for (const c of p.text) {
      const i = gi++;
      const a = appear[i];
      const style: React.CSSProperties = { color };
      if (TIGHT.test(c)) style.marginRight = "-0.45em";
      if (a !== undefined) {
        const dur = fx ? charFade : sec(PACE.fadeIn);
        const blurPx = fx ? PACE.blur : PACE.blur / 2;
        style.opacity = interpolate(f, [a, a + dur], [0, 1], clamp);
        const b = interpolate(f, [a, a + dur], [blurPx, 0], clamp);
        if (b > 0.05) style.filter = `blur(${b}px)`;
      }
      nodes.push(<span key={i} style={style}>{c}</span>);
    }
  }

  return (
    <Line
      frames={t.frames}
      fadeIn={fx ? 1 : t.fadeIn}
      fadeOutAt={t.fadeOutAt}
      fadeOut={fadeOut}
      size={size}
      y={y}
      font={font}
      weight={weight}
      shadow={shadow}
      tracking={tracking}
      blurIn={afterTurn && !fx ? PACE.blur : 0}
      scaleFrom={scaleFrom}
      scaleDur={Math.max(12, t.fadeIn)}
    >
      {nodes}
    </Line>
  );
};
