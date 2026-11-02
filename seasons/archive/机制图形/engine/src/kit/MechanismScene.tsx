import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { MechanismSpec } from "../script/mechanism";
import { MECH } from "../style/mechanism";
import { FONT } from "../style/theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);

const Caption: React.FC<{ x: number; y: number; children: React.ReactNode; accent?: boolean; opacity?: number }> = ({ x, y, children, accent, opacity = 1 }) => (
  <text x={x} y={y} textAnchor="middle" fontFamily={FONT.kai} fontSize={32} letterSpacing="0.12em"
    fill={accent ? MECH.accent : MECH.dim} opacity={opacity}>{children}</text>
);

const Threshold: React.FC<{ stage?: string; frames: number }> = ({ stage = "接近", frames }) => {
  const f = useCurrentFrame();
  const enter = interpolate(f, [0, Math.min(14, frames * 0.3)], [0, 1], { ...clamp, easing: ease });
  const p = interpolate(f, [0, Math.max(1, frames - 8)], [0, 1], { ...clamp, easing: ease });
  const barrierX = 960;
  const groundY = 610;
  const stageX: Record<string, [number, number]> = {
    "接近": [470, 825], "受阻": [825, 875], "蓄能": [875, 875], "跨越": [875, 1240], "负担": [1240, 1390],
  };
  const [x0, x1] = stageX[stage] ?? stageX["接近"];
  const x = interpolate(p, [0, 1], [x0, x1], clamp);
  const jump = stage === "跨越" ? Math.sin(p * Math.PI) * 230 : 0;
  const bounce = stage === "受阻" ? Math.sin(p * Math.PI * 3) * (1 - p) * 18 : 0;
  const charge = stage === "蓄能" ? interpolate(f, [4, Math.max(5, frames - 6)], [0.18, 1], clamp) : stage === "跨越" ? 1 - p : 0;
  const drain = stage === "负担" ? interpolate(p, [0, 1], [0.34, 0.08], clamp) : 0.34;
  const label = stage === "负担" ? "额外消耗" : stage === "蓄能" || stage === "跨越" ? "启动能量" : "启动门槛";

  return (
    <AbsoluteFill style={{ opacity: enter }}>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <line x1={300} y1={groundY} x2={1620} y2={groundY} stroke={MECH.line} strokeWidth={3} />
        <line x1={barrierX} y1={groundY} x2={barrierX} y2={330} stroke={MECH.ink} strokeWidth={9} opacity={0.72} />
        <line x1={barrierX - 22} y1={330} x2={barrierX + 22} y2={330} stroke={MECH.ink} strokeWidth={9} opacity={0.72} />
        <Caption x={barrierX} y={286} opacity={0.82}>{label}</Caption>

        {(stage === "蓄能" || stage === "跨越") && (
          <>
            <circle cx={x + bounce} cy={groundY - 34 - jump} r={62 + charge * 34} fill="none" stroke={MECH.accent} strokeWidth={3} opacity={0.18 + charge * 0.5} />
            <circle cx={x + bounce} cy={groundY - 34 - jump} r={82 + charge * 54} fill="none" stroke={MECH.accent} strokeWidth={2} opacity={0.10 + charge * 0.22} />
          </>
        )}

        <circle cx={x + bounce} cy={groundY - 34 - jump} r={34} fill={stage === "受阻" ? MECH.ink : MECH.accent}
          opacity={0.96} style={{ filter: `drop-shadow(0 0 ${stage === "受阻" ? 8 : 18}px rgba(228,188,117,0.35))` }} />

        <rect x={360} y={735} width={420} height={12} rx={6} fill={MECH.faint} />
        <rect x={360} y={735} width={420 * drain} height={12} rx={6} fill={MECH.accent} opacity={0.9} />
        <Caption x={570} y={795} accent={stage === "负担"}>{stage === "负担" ? "剩余精力" : "可用精力"}</Caption>
      </svg>
    </AbsoluteFill>
  );
};

const curve = "M 330 532 C 430 510 492 454 565 470 C 650 488 704 590 790 576 C 886 560 912 298 1012 312 C 1114 326 1150 548 1254 536 C 1360 524 1400 432 1588 486";

const StateCurve: React.FC<{ stage?: string; frames: number }> = ({ stage = "波动", frames }) => {
  const f = useCurrentFrame();
  const enter = interpolate(f, [0, Math.min(12, frames * 0.25)], [0, 1], { ...clamp, easing: ease });
  const draw = interpolate(f, [0, Math.max(1, frames - 8)], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const thresholdY = 390;
  const emphasizeThreshold = stage === "门槛";
  const emphasizePeak = ["高峰", "稀缺", "分布", "波动"].includes(stage);
  return (
    <AbsoluteFill style={{ opacity: enter }}>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs><clipPath id="above-threshold"><rect x={280} y={180} width={1360} height={thresholdY - 180} /></clipPath></defs>
        <rect x={300} y={420} width={1320} height={210} rx={18} fill={MECH.faint} opacity={stage === "分布" ? 0.95 : 0.5} />
        <line x1={300} y1={thresholdY} x2={1620} y2={thresholdY} stroke={emphasizeThreshold ? MECH.accent : MECH.line}
          strokeWidth={emphasizeThreshold ? 5 : 3} strokeDasharray="12 14" opacity={0.95} />
        <Caption x={470} y={thresholdY - 28} accent={emphasizeThreshold}>启动门槛</Caption>
        <Caption x={480} y={548} opacity={0.7}>平常状态</Caption>
        <path d={curve} fill="none" stroke={MECH.dim} strokeWidth={8} strokeLinecap="round" pathLength={1}
          strokeDasharray={1} strokeDashoffset={1 - draw} opacity={0.75} />
        {emphasizePeak && <path d={curve} fill="none" stroke={MECH.accent} strokeWidth={10} strokeLinecap="round" pathLength={1}
          strokeDasharray={1} strokeDashoffset={1 - draw} clipPath="url(#above-threshold)" style={{ filter: "drop-shadow(0 0 12px rgba(228,188,117,0.38))" }} />}
        {stage === "稀缺" && <Caption x={1015} y={252} accent>少数时刻</Caption>}
        {stage === "门槛" && <Caption x={1370} y={336} accent>必要条件</Caption>}
      </svg>
    </AbsoluteFill>
  );
};

const cubicAt = (p0: number[], p1: number[], p2: number[], p3: number[], t: number) => {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
};

const Arrow: React.FC<{ x: number; y: number; deg: number; color: string; opacity: number }> = ({ x, y, deg, color, opacity }) => (
  <path d="M 0 0 L -22 -11 L -22 11 Z" fill={color} opacity={opacity} transform={`translate(${x} ${y}) rotate(${deg})`} />
);

// 反馈回路：行动 → 反馈 → 回到行动。强化时回程把能量补回并扩环；反转时回程偏折向下，回路没有闭合。
const Feedback: React.FC<{ stage?: string; frames: number }> = ({ stage = "强化", frames }) => {
  const f = useCurrentFrame();
  const enter = interpolate(f, [0, Math.min(14, frames * 0.3)], [0, 1], { ...clamp, easing: ease });
  const top = interpolate(f, [0, Math.max(1, frames * 0.32)], [0, 1], clamp);
  const back = interpolate(f, [frames * 0.3, Math.max(frames * 0.3 + 1, frames * 0.78)], [0, 1], clamp);
  const negative = stage === "反转";
  const missing = stage === "缺失";

  const L = { x: 660, y: 460 }, R = { x: 1260, y: 460 }, r = 40;
  const topPath = "M 660 420 C 800 250 1120 250 1260 420";
  const backPath = "M 1260 500 C 1120 670 800 670 660 500";
  const reversePath = "M 1260 500 C 1140 640 960 660 880 750";
  const pulse = cubicAt([1260, 500], [1120, 670], [800, 670], [660, 500], back);
  const stub = interpolate(f, [frames * 0.4, frames * 0.6, frames * 0.9], [0, 0.7, 0.3], clamp);
  const leftDim = negative ? interpolate(back, [0.55, 1], [1, 0.4], clamp) : 1;

  return (
    <AbsoluteFill style={{ opacity: enter }}>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        {/* 行动 → 反馈：负反馈那一屏把它画成“预期”，所以压暗 */}
        <path d={topPath} fill="none" stroke={MECH.line} strokeWidth={5} strokeLinecap="round"
          pathLength={1} strokeDasharray={1} strokeDashoffset={1 - top} opacity={negative ? 0.3 : 0.75} />
        <Arrow x={1260} y={420} deg={50.5} color={MECH.line}
          opacity={(negative ? 0.3 : 1) * interpolate(top, [0.85, 1], [0, 1], clamp)} />

        {!negative && !missing && (
          <>
            <path d={backPath} fill="none" stroke={MECH.accent} strokeWidth={7} strokeLinecap="round"
              pathLength={1} strokeDasharray={1} strokeDashoffset={1 - back} />
            <Arrow x={660} y={500} deg={230.5} color={MECH.accent} opacity={interpolate(back, [0.85, 1], [0, 1], clamp)} />
            <circle cx={pulse[0]} cy={pulse[1]} r={9} fill={MECH.accent} opacity={back > 0.06 ? 0.95 : 0}
              style={{ filter: "drop-shadow(0 0 14px rgba(228,188,117,0.6))" }} />
            {[0, 1, 2].map((i) => {
              const t0 = frames * 0.5 + i * 6;
              return (
                <circle key={i} cx={L.x} cy={L.y} r={r + 32 + i * 26} fill="none" stroke={MECH.accent} strokeWidth={2}
                  opacity={interpolate(f, [t0, t0 + 10], [0, 0.5 - i * 0.13], clamp)} />
              );
            })}
          </>
        )}

        {negative && (
          <>
            <path d={reversePath} fill="none" stroke={MECH.accent} strokeWidth={6} strokeLinecap="round"
              pathLength={1} strokeDasharray={1} strokeDashoffset={1 - back} />
            <Arrow x={880} y={750} deg={135} color={MECH.accent} opacity={interpolate(back, [0.85, 1], [0, 1], clamp)} />
          </>
        )}

        {missing && (
          <path d="M 1260 500 C 1240 560 1200 592 1150 604" fill="none" stroke={MECH.dim} strokeWidth={5}
            strokeLinecap="round" strokeDasharray="14 12" opacity={stub} />
        )}

        <circle cx={L.x} cy={L.y} r={r} fill={MECH.faint} stroke={MECH.ink} strokeWidth={3} opacity={leftDim} />
        <Caption x={L.x} y={L.y + 10} opacity={leftDim}>行动</Caption>
        <circle cx={R.x} cy={R.y} r={r} fill={MECH.faint} stroke={MECH.ink} strokeWidth={3} />
        <Caption x={R.x} y={R.y + 10}>反馈</Caption>

        <Caption x={960} y={212} opacity={negative ? 0.7 : 1}>{negative ? "预期" : "正反馈"}</Caption>
        {!negative && !missing && <Caption x={960} y={738} accent>补充并加强</Caption>}
        {negative && <Caption x={930} y={812} accent>实际</Caption>}
        {missing && <Caption x={960} y={738} opacity={0.75}>没有回音</Caption>}
      </svg>
    </AbsoluteFill>
  );
};

export const MechanismScene: React.FC<{ spec: MechanismSpec; frames: number }> = ({ spec, frames }) => {
  if (spec.kind === "门槛") return <Threshold stage={spec.stage} frames={frames} />;
  if (spec.kind === "反馈") return <Feedback stage={spec.stage} frames={frames} />;
  return <StateCurve stage={spec.stage} frames={frames} />;
};

