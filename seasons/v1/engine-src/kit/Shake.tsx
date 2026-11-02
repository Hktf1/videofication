import React from "react";
import { useCurrentFrame } from "remotion";

/** 画面震动（每篇 ≤3 次，由 check 统计） */
export const Shake: React.FC<{ children: React.ReactNode; frames?: number; amp?: number }> = ({
  children,
  frames = 10,
  amp = 10,
}) => {
  const f = useCurrentFrame();
  const k = f < frames ? (1 - f / frames) * amp : 0;
  const dx = Math.sin(f * 2.3) * k;
  const dy = Math.cos(f * 3.1) * k * 0.6;
  return <div style={{ position: "absolute", inset: 0, transform: `translate(${dx}px, ${dy}px)` }}>{children}</div>;
};
