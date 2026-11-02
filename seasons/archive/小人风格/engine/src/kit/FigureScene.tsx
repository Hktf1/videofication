import React, { useId } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { figureMotion, type FigureSceneData } from "../script/figure-motion";
import { INK } from "../style/ink";
import { FONT } from "../style/theme";
import { body, Figure, Stroke, Blot } from "./InkElements";

/** One persistent canvas, one figure, continuously morphing geometry. */
export const FigureScene: React.FC<{ scenes: FigureSceneData[] }> = ({ scenes }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const id = useId().replace(/:/g, "");
  const rough = `figure-rough-${id}`, bleed = `figure-bleed-${id}`;
  const motion = figureMotion(scenes, frame, fps);
  if (!motion) return null;
  const { state: s, scene, previousLabel, progress: t, frame: f } = motion;
  const b = body({ x: s.x, phase: f / fps * 6, amp: s.amp, lean: s.lean,
    kneel: s.kneel, jit: s.jit, f, gy: () => 690 });
  const path = (v: number[]) => `M ${v[0]} ${v[1]} Q ${v[2]} ${v[3]} ${v[4]} ${v[5]}`;
  const back = b.back(43);
  const inkAmount = s.load + s.pool;
  const poolMix = inkAmount > 0 ? s.pool / inkAmount : 0;
  const last = scenes[scenes.length - 1];
  const fadeOut = Math.max(0, Math.min(1, (last.from + last.frames + fps * 0.4 - frame) / (fps * 0.4)));
  const enter = Math.min(1, Math.max(0, (frame - scenes[0].from) / (fps * 0.4))) * fadeOut;
  const labelStyle = { fontFamily: FONT.kai, fontSize: 54, fill: INK.accent };
  return (
    <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id={rough} x="-10%" y="-10%" width="120%" height="120%"><feTurbulence baseFrequency="0.03 0.06" numOctaves="2" seed="7" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" /></filter>
        <filter id={bleed} x="-30%" y="-30%" width="160%" height="160%"><feTurbulence baseFrequency="0.035" numOctaves="3" seed="3" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="10" /><feGaussianBlur stdDeviation="1" /></filter>
      </defs>
      <g opacity={enter}>
        <Stroke d="M 240 694 Q 620 683 960 691 T 1680 690" width={3} color={INK.dim} filterId={rough} />
        <Stroke d={path(s.upper)} width={4} opacity={s.upperOpacity} filterId={rough} />
        <Stroke d={path(s.lower)} width={s.strokeWidth} color={INK.accent} opacity={s.lowerOpacity} filterId={rough} />
        <circle cx={s.dotX} cy={s.dotY} r={42 + 5 * Math.sin(f / fps * 2)} fill={INK.accent} opacity={0.08 * s.halo} />
        <circle cx={s.dotX} cy={s.dotY} r={s.dotR} fill={INK.accent} />
        <text x={s.x + 25} y={440 + 15 * (1 - s.question)} fontFamily={FONT.kai} fontSize={70} fill={INK.dim} opacity={s.question}>？</text>
        <Blot c={[back[0] + (s.x - back[0]) * poolMix, back[1] + (695 - back[1]) * poolMix]}
          r={43 * s.load + 70 * s.pool} seed={3} f={f} opacity={0.85 * s.load + 0.18 * s.pool} filterId={bleed} />
        <Figure b={b} filterId={rough} />
        {previousLabel && previousLabel !== scene.spec.label && t < 1 &&
          <text x={1320} y={390 - 14 * t} textAnchor="middle" {...labelStyle} opacity={Math.max(0, 1 - 2 * t)}>{previousLabel}</text>}
        {scene.spec.label && <text x={1320} y={390 + (previousLabel === scene.spec.label ? 0 : 14 * (1 - t))}
          textAnchor="middle" {...labelStyle} opacity={previousLabel === scene.spec.label ? 1 : Math.max(0, 2 * t - 1)}>{scene.spec.label}</text>}
      </g>
    </svg>
  );
};
