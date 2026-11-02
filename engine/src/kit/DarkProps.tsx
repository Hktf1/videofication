// 暗调样片道具库（第二档）：一屏 = 一行字幕 + 一个道具。
// 每个道具都是参数化的，处理稿里用「类型:参数1/参数2」调用。
// 共同原则：慢进场、轻微漂浮、结尾淡出；不用硬切和快速弹跳。
import React from "react";
import { AbsoluteFill, Easing, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PropSpec } from "../script/parse";
import { DARK, SERIF } from "../style/dark";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.out(Easing.cubic);

/** 进场淡入 + 结尾淡出，返回当前帧与总不透明度 */
const useEnter = (frames: number, inDur = 14, outDur = 16) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = interpolate(f, [0, inDur], [0, 1], { ...clamp, easing: easeOut });
  const b = interpolate(f, [frames - outDur, frames], [1, 0], { ...clamp, easing: Easing.in(Easing.quad) });
  return { f, fps, opacity: a * b };
};

/* ---------- 剪影 ---------- */

const HEAD = { cx: 200, cy: 122, r: 56 };
const BODY =
  "M200 178 C146 178 112 216 100 264 C88 312 82 358 82 424 L318 424 C318 358 312 312 300 264 C288 216 254 178 200 178 Z";
const VIEW_W = 400;
const VIEW_H = 424;

const Bust: React.FC<{
  x: number; // 底边中点
  y: number;
  h: number;
  fill?: string;
  rim?: string;
  rimOpacity?: number;
  lit?: boolean;
  opacity?: number;
  sway?: number;
}> = ({ x, y, h, fill = "#070606", rim = DARK.goldDeep, rimOpacity = 0.28, lit = false, opacity = 1, sway = 0 }) => {
  const w = (h * VIEW_W) / VIEW_H;
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width={w}
      height={h}
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y - h,
        overflow: "visible",
        opacity,
        transform: `translateX(${sway}px)`,
      }}
    >
      {lit && (
        <g style={{ filter: "blur(20px)" }} opacity={0.55}>
          <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill={rim} />
          <path d={BODY} fill={rim} />
        </g>
      )}
      <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill={fill} stroke={rim} strokeWidth={lit ? 2.6 : 1.4} strokeOpacity={rimOpacity} />
      <path d={BODY} fill={fill} stroke={rim} strokeWidth={lit ? 2.6 : 1.4} strokeOpacity={rimOpacity} />
    </svg>
  );
};

/* ---------- 大字：巨型概念字 + 一个人 ---------- */

const BigWord: React.FC<{ args: string[]; frames: number }> = ({ args, frames }) => {
  const { f, opacity } = useEnter(frames, 18, 20);
  const word = args[0] ?? "";
  const scale = interpolate(f, [0, frames], [1.015, 1.05], clamp);
  // 按字数自动收字号，长词不顶到画幅边缘
  const size = Math.min(430, Math.floor(1780 / Math.max(1, [...word].length) / 1.1));
  return (
    <AbsoluteFill style={{ opacity }}>
      {/* 人物背后的暖光 */}
      <div
        style={{
          position: "absolute",
          left: 960 - 430,
          top: 330,
          width: 860,
          height: 760,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,169,106,0.20) 0%, rgba(150,108,58,0.06) 45%, transparent 70%)",
          filter: "blur(28px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 92,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: SERIF,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1,
          whiteSpace: "nowrap",
          letterSpacing: "0.1em",
          color: "transparent",
          backgroundImage: "linear-gradient(180deg, rgba(240,221,180,0.92) 0%, rgba(201,169,106,0.55) 62%, rgba(201,169,106,0.2) 100%)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          filter: "drop-shadow(0 0 52px rgba(201,169,106,0.16))",
          transform: `scale(${scale})`,
          transformOrigin: "50% 40%",
        }}
      >
        {word}
      </div>
      <Bust x={960} y={1035} h={670} lit rimOpacity={0.85} />
    </AbsoluteFill>
  );
};

/* ---------- 人群：剪影人群 + 视线标注 ---------- */

const CROWD = [
  { x: 72, h: 430, o: 0.5 },
  { x: 246, h: 520, o: 0.66 },
  { x: 424, h: 452, o: 0.55 },
  { x: 606, h: 556, o: 0.75 },
  { x: 806, h: 486, o: 0.6 },
  { x: 1128, h: 540, o: 0.72 },
  { x: 1330, h: 468, o: 0.56 },
  { x: 1520, h: 566, o: 0.75 },
  { x: 1742, h: 438, o: 0.5 },
  { x: 1888, h: 500, o: 0.42 },
];

const Crowd: React.FC<{ args: string[]; frames: number }> = ({ args, frames }) => {
  const { f, opacity } = useEnter(frames, 16, 18);
  const label = args[0] ?? "视线";
  const draw = interpolate(f, [10, 30], [0, 1], { ...clamp, easing: easeOut });
  const labelIn = interpolate(f, [24, 38], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity }}>
      {/* 中央人物脚下一圈光 */}
      <div
        style={{
          position: "absolute",
          left: 960 - 360,
          top: 560,
          width: 720,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,169,106,0.18) 0%, transparent 66%)",
          filter: "blur(26px)",
        }}
      />
      {CROWD.map((p, i) => (
        <Bust key={i} x={p.x} y={1040} h={p.h} opacity={p.o} sway={Math.sin(f / 46 + i) * 4} rimOpacity={0.16} />
      ))}
      <Bust x={960} y={1040} h={720} lit rimOpacity={0.9} sway={Math.sin(f / 52) * 3} />
      {/* 视线标注 */}
      <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <path
          d="M 1018 438 C 1108 408 1172 360 1226 326"
          fill="none"
          stroke={DARK.gold}
          strokeWidth={2.6}
          strokeDasharray="7 10"
          opacity={0.9 * draw}
        />
        <path
          d={`M ${1226 - 20} ${326 + 4} L 1226 326 L ${1226 - 8} ${326 + 22}`}
          fill="none"
          stroke={DARK.gold}
          strokeWidth={2.6}
          strokeLinecap="round"
          opacity={draw > 0.92 ? 0.9 : 0}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: 1242,
          top: 292,
          fontFamily: SERIF,
          fontSize: 34,
          letterSpacing: "0.28em",
          color: DARK.gold,
          opacity: labelIn * 0.95,
        }}
      >
        {label}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 纸卡：暖白便签 + 朱红勾选 ---------- */

const PAPER_NOISE = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='180' height='180' filter='url(%23p)' opacity='0.4'/></svg>")`;

const Check: React.FC<{ delay: number }> = ({ delay }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [delay, delay + 9], [0, 1], { ...clamp, easing: easeOut });
  return (
    <svg width={30} height={30} viewBox="0 0 30 30" style={{ flex: "0 0 auto" }}>
      <rect x={1.5} y={1.5} width={27} height={27} rx={4} fill="none" stroke={DARK.red} strokeWidth={2} opacity={0.88} />
      <path
        d="M7 15.5 L12.5 21 L23 9.5"
        fill="none"
        stroke={DARK.red}
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - p}
      />
    </svg>
  );
};

const PaperCard: React.FC<{ args: string[]; frames: number }> = ({ args, frames }) => {
  const { f, fps } = useEnter(frames, 14, 18);
  const [title, ...items] = args;
  const s = spring({ frame: f - 3, fps, config: { damping: 200, mass: 0.9 } });
  const out = interpolate(f, [frames - 18, frames], [1, 0], { ...clamp, easing: Easing.in(Easing.quad) });
  const rotate = interpolate(s, [0, 1], [-4.4, -2.1]);
  const rise = interpolate(s, [0, 1], [36, 0]);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 136,
          left: "50%",
          width: 800,
          minHeight: 452,
          padding: "52px 64px 56px",
          transform: `translateX(-50%) translateY(${rise}px) rotate(${rotate}deg)`,
          opacity: s * out,
          borderRadius: 4,
          background: "linear-gradient(166deg, #F8EFD9 0%, #F1E3C4 56%, #E3D2AC 100%)",
          boxShadow: "0 36px 96px rgba(0,0,0,0.62), 0 2px 0 rgba(255,255,255,0.32) inset",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 4,
            backgroundImage: PAPER_NOISE,
            opacity: 0.4,
            mixBlendMode: "multiply",
            pointerEvents: "none",
          }}
        />
        {title && (
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 32,
              fontWeight: 500,
              letterSpacing: "0.16em",
              color: DARK.paperLabel,
              paddingBottom: 20,
              borderBottom: "1px solid rgba(90,70,40,0.28)",
            }}
          >
            {title}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 28 }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                fontFamily: SERIF,
                fontSize: 40,
                fontWeight: 500,
                color: DARK.paperInk,
                opacity: interpolate(f, [10 + i * 5, 22 + i * 5], [0, 1], clamp),
              }}
            >
              <Check delay={12 + i * 5} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 选项：两个描边胶囊（第三个参数可选 1/2，指定高亮哪一侧） ---------- */

const Choices: React.FC<{ args: string[]; frames: number }> = ({ args, frames }) => {
  const f = useCurrentFrame();
  const out = interpolate(f, [frames - 16, frames], [1, 0], { ...clamp, easing: Easing.in(Easing.quad) });
  const labels = args.slice(0, 2);
  const pick = Number(args[2]) === 2 ? 1 : 0;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 396,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 92,
        }}
      >
        {labels.map((label, i) => {
          const on = i === pick;
          const delay = i === 0 ? 4 : 14;
          const o = interpolate(f, [delay, delay + 16], [0, 1], { ...clamp, easing: easeOut }) * out;
          const y = interpolate(f, [delay, delay + 16], [22, 0], { ...clamp, easing: easeOut });
          return (
            <div
              key={i}
              style={{
                opacity: o,
                transform: `translateY(${y}px)`,
                padding: "30px 62px",
                border: `2px solid ${on ? DARK.gold : "rgba(140,122,88,0.5)"}`,
                borderRadius: 16,
                fontFamily: SERIF,
                fontSize: 46,
                fontWeight: 500,
                letterSpacing: "0.1em",
                color: on ? DARK.gold : DARK.goldDim,
                background: on ? "rgba(228,205,158,0.06)" : "rgba(0,0,0,0.14)",
                boxShadow: on ? "0 0 76px rgba(228,205,158,0.16), 0 0 0 1px rgba(228,205,158,0.08) inset" : "none",
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 计时：HUD + 走动的大数字 ---------- */

const Timer: React.FC<{ args: string[]; frames: number }> = ({ args, frames }) => {
  const { f, opacity } = useEnter(frames, 10, 16);
  const label = args[0] ?? "对视";
  const target = Number(args[1] ?? 6) || 6;
  const down = args[2] === "下" || args[2] === "down"; // 倒计时：希望一点点归零
  const raw = interpolate(f, [8, Math.max(30, frames - 26)], [0, target], clamp);
  const t = down ? target - raw : raw;
  const color = down
    ? interpolateColors(interpolate(t, [0, target * 0.32], [1, 0], clamp), [0, 1], [DARK.gold, DARK.red])
    : DARK.gold;
  const shown = `00:${t.toFixed(1).padStart(4, "0")}`;
  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{ position: "absolute", left: 224, top: 118, display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: DARK.red,
            boxShadow: "0 0 16px rgba(192,80,63,0.9)",
            opacity: 0.7 + 0.3 * Math.sin(f / 6),
          }}
        />
        <div style={{ fontFamily: SERIF, fontSize: 30, letterSpacing: "0.3em", color: DARK.goldDim }}>{label}</div>
      </div>
      <div style={{ position: "absolute", top: 248, left: 0, right: 0, textAlign: "center" }}>
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 300,
            fontSize: 206,
            lineHeight: 1.1,
            color,
            fontVariantNumeric: "tabular-nums",
            textShadow: down ? "0 0 64px rgba(192,80,63,0.25)" : "0 0 64px rgba(201,169,106,0.22)",
          }}
        >
          {shown}
        </div>
        <div
          style={{
            position: "absolute",
            top: 262,
            left: "50%",
            width: 860,
            height: 2,
            transform: "translateX(-50%)",
            background: "rgba(201,169,106,0.22)",
          }}
        >
          <div
            style={{
              width: `${Math.min(1, t / target) * 100}%`,
              height: "100%",
              background: color,
              boxShadow: `0 0 18px ${down ? "rgba(192,80,63,0.6)" : "rgba(201,169,106,0.55)"}`,
            }}
          />
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${(i / 6) * 100}%`,
                top: 4,
                width: 1,
                height: 9,
                background: "rgba(201,169,106,0.35)",
              }}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 节点：一圈人轮流亮起 ---------- */

const Nodes: React.FC<{ args: string[]; frames: number }> = ({ args, frames }) => {
  const { f, opacity } = useEnter(frames, 14, 18);
  const cx = 960;
  const cy = 420;
  const R = 272;
  const centerLabel = args[0] ?? "你";
  const labels = args.slice(1);
  const ring = interpolate(f, [0, 24], [0, 1], { ...clamp, easing: easeOut });
  const lit = (i: number) => f >= 14 + i * 11;
  const nodes = Array.from({ length: 6 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, a, label: labels[i] };
  });
  return (
    <AbsoluteFill style={{ opacity }}>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={DARK.goldDim} strokeWidth={1.4} strokeDasharray="5 11" opacity={0.34 * ring} />
        {nodes.map((n, i) => {
          const on = lit(i);
          return (
            <g key={i}>
              <line
                x1={cx}
                y1={cy}
                x2={n.x}
                y2={n.y}
                stroke={on ? DARK.goldDeep : DARK.goldDim}
                strokeWidth={on ? 1.8 : 1.2}
                strokeDasharray="4 9"
                opacity={on ? 0.5 : 0.16}
              />
              {on && <circle cx={n.x} cy={n.y} r={24} fill={DARK.gold} opacity={0.22} style={{ filter: "blur(9px)" }} />}
              <circle
                cx={n.x}
                cy={n.y}
                r={on ? 17 : 13}
                fill={on ? DARK.gold : "rgba(140,122,88,0.5)"}
                stroke={on ? DARK.gold : "none"}
                strokeWidth={2}
              />
              {n.label && (
                <text
                  x={cx + Math.cos(n.a) * (R + 58)}
                  y={cy + Math.sin(n.a) * (R + 58)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily={SERIF}
                  fontSize={32}
                  letterSpacing="0.12em"
                  fill={on ? DARK.gold : DARK.goldDim}
                  opacity={on ? 0.95 : 0.55}
                >
                  {n.label}
                </text>
              )}
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={96} fill="rgba(228,205,158,0.05)" stroke={DARK.gold} strokeWidth={2} />
        <circle cx={cx} cy={cy} r={96} fill="none" stroke={DARK.gold} strokeWidth={10} opacity={0.1} style={{ filter: "blur(10px)" }} />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={SERIF}
          fontSize={44}
          letterSpacing="0.14em"
          fill={DARK.gold}
        >
          {centerLabel}
        </text>
      </svg>
    </AbsoluteFill>
  );
};

/* ---------- 警报：红环 + 心跳线 ---------- */

const ECG =
  "M 520 590 L 700 590 L 728 580 L 754 590 L 838 590 L 860 524 L 883 648 L 905 560 L 927 590 L 1008 590 L 1034 574 L 1058 590 L 1138 590 L 1160 508 L 1183 664 L 1205 548 L 1227 590 L 1400 590";

const Alarm: React.FC<{ args: string[]; frames: number }> = ({ args, frames }) => {
  const { f, opacity } = useEnter(frames, 10, 16);
  const label = args[0] ?? "警报";
  const draw = interpolate(f, [4, 30], [0, 1], { ...clamp, easing: easeOut });
  const pulse = 0.5 + 0.5 * Math.sin(f / 7);
  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 58% 50% at 50% 45%, transparent 42%, rgba(192,80,63,0.22) 100%)",
          opacity: 0.28 + 0.26 * pulse,
        }}
      />
      <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <circle cx={960} cy={278} r={88} fill="none" stroke={DARK.red} strokeWidth={2.6} opacity={0.9} />
        <circle cx={960} cy={278} r={88} fill={DARK.red} opacity={0.07 + 0.05 * pulse} style={{ filter: "blur(14px)" }} />
        <line x1={960} y1={242} x2={960} y2={296} stroke={DARK.red} strokeWidth={7} strokeLinecap="round" />
        <circle cx={960} cy={318} r={5.5} fill={DARK.red} />
        <line x1={480} y1={590} x2={1440} y2={590} stroke={DARK.red} strokeWidth={1} opacity={0.18} />
        <path
          d={ECG}
          fill="none"
          stroke={DARK.red}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - draw}
          style={{ filter: "drop-shadow(0 0 12px rgba(192,80,63,0.55))" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 392,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: SERIF,
          fontSize: 42,
          letterSpacing: "0.42em",
          color: DARK.red,
          textShadow: "0 0 34px rgba(192,80,63,0.45)",
        }}
      >
        {label}
      </div>
      <div style={{ position: "absolute", left: 500, top: 500, fontFamily: SERIF, fontSize: 26, letterSpacing: "0.22em", color: DARK.goldDim }}>
        心跳
      </div>
      <div
        style={{
          position: "absolute",
          right: 500,
          top: 488,
          fontFamily: SERIF,
          fontSize: 38,
          color: DARK.red,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        112
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 标题卡：金色宋体 + 细线 ---------- */

const TitleCard: React.FC<{ args: string[]; frames: number }> = ({ args, frames }) => {
  const { f, opacity } = useEnter(frames, 16, 20);
  const [title, kicker] = args;
  const w = interpolate(f, [8, 36], [0, 640], { ...clamp, easing: easeOut });
  return (
    <AbsoluteFill style={{ opacity }}>
      {kicker && (
        <div
          style={{
            position: "absolute",
            top: 206,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: SERIF,
            fontSize: 30,
            letterSpacing: "0.44em",
            color: DARK.goldDim,
            opacity: 0.9,
          }}
        >
          {kicker}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: 296,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: SERIF,
          fontWeight: 600,
          fontSize: 138,
          lineHeight: 1.15,
          letterSpacing: "0.06em",
          color: "transparent",
          backgroundImage: "linear-gradient(180deg, #F6E8C2 0%, #E4CD9E 46%, #B9975E 100%)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          filter: "drop-shadow(0 8px 30px rgba(0,0,0,0.5))",
        }}
      >
        {title}
      </div>
      <div
        style={{
          position: "absolute",
          top: 502,
          left: "50%",
          width: w,
          height: 2,
          transform: "translateX(-50%)",
          background: "linear-gradient(90deg, transparent, rgba(228,205,158,0.75), transparent)",
          opacity: 0.9,
        }}
      />
    </AbsoluteFill>
  );
};

/* ---------- 分发 ---------- */

export const DarkProp: React.FC<{ spec: PropSpec; frames: number }> = ({ spec, frames }) => {
  const args = spec.args;
  switch (spec.kind) {
    case "大字": return <BigWord args={args} frames={frames} />;
    case "人群": return <Crowd args={args} frames={frames} />;
    case "纸卡": return <PaperCard args={args} frames={frames} />;
    case "选项": return <Choices args={args} frames={frames} />;
    case "计时": return <Timer args={args} frames={frames} />;
    case "节点": return <Nodes args={args} frames={frames} />;
    case "警报": return <Alarm args={args} frames={frames} />;
    case "标题": return <TitleCard args={args} frames={frames} />;
    default: return null;
  }
};
