// 通用画面模板。新增模板后在 registry.ts 登记。
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Card, Figure, type Pose } from "../kit";
import { C, FONT, SIZE } from "../style/theme";
import type { TemplateProps } from "./types";

const POSES: Record<string, Pose> = { 站: "stand", 垂头: "slump", 举手: "up" };

/** 只有字幕，画面留白 */
export const Blank: React.FC<TemplateProps> = () => null;

/** 中间一个小圆人，参数为姿态 */
export const Person: React.FC<TemplateProps> = ({ screen, accent }) => {
  const pose = POSES[screen.args[0]] ?? "stand";
  return <Figure x={960} y={720} scale={1.6} pose={pose} color={screen.tone ? accent : C.line} />;
};

/** 两张卡片并列对比：对比 色调 A B */
export const Compare: React.FC<TemplateProps> = ({ screen, accent }) => {
  const [a = "A", b = "B"] = screen.args;
  return (
    <AbsoluteFill style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 120, paddingBottom: 260 }}>
      <Card title={a} color={C.muted} />
      <Card title={b} color={accent} delay={8} />
    </AbsoluteFill>
  );
};

/** 居中大字：命题、金句。文字就是本屏字幕 */
export const BigText: React.FC<TemplateProps> = ({ screen, accent }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const parts = screen.text.split(/(【[^】]*】)/).filter(Boolean);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: o }}>
      <div style={{ fontFamily: FONT.serif, fontSize: SIZE.title, color: C.ink, letterSpacing: 8 }}>
        {parts.map((p, i) =>
          p.startsWith("【") ? <span key={i} style={{ color: accent }}>{p.slice(1, -1)}</span> : p,
        )}
      </div>
    </AbsoluteFill>
  );
};
