import React from "react";
import { AbsoluteFill, Composition, Html5Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ensureFont, ensureSansFont } from "../../kit/Font";
import { MOTION, MOTION_FONT } from "../../style/motion";
import { BGM_DEFAULT, VOLUME } from "../../style/sfx";

type Caption = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: number | null;
  confidence: number | null;
  sourceLine: number;
  words: { text: string; atMs: number }[];
};
type Excerpt = {
  durationInFrames: number;
  fps: number;
  beats: Record<"clear" | "higher" | "unstable" | "incoming" | "pleasure" | "certain" | "immediate" | "distant" | "vague" | "ordering" | "covered" | "prefer" | "phone", number>;
  captions: Caption[];
};
// 独立快照：不从实验里写回正式稿件，逐字时刻来自已有配音。
const excerpt: Excerpt = require("./excerpt.json");
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const smooth = (p: number) => p * p * (3 - 2 * p);
const mix = (a: number, b: number, p: number) => a + (b - a) * p;

const Text: React.FC<{ x: number; y: number; children: React.ReactNode; size?: number; fill?: string; opacity?: number; anchor?: "start" | "middle" | "end" }> = ({ x, y, children, size = 32, fill = MOTION.text, opacity = 1, anchor = "middle" }) =>
  <text x={x} y={y} fill={fill} fontSize={size} textAnchor={anchor} opacity={opacity} dominantBaseline="middle">{children}</text>;

const ValueDiagram: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = (beat: keyof Excerpt["beats"], seconds = 0.7, delay = 0) => smooth(interpolate(frame,
    [(excerpt.beats[beat] / 1000 + delay) * fps, (excerpt.beats[beat] / 1000 + delay + seconds) * fps], [0, 1], clamp));
  const clear = p("clear", 0.65);
  const higher = p("higher", 0.8);
  const unstable = p("unstable", 0.8);
  const incoming = p("incoming", 0.7);
  const pleasure = p("pleasure", 0.55);
  const certain = p("certain", 0.45);
  const immediate = p("immediate", 0.65);
  const distant = p("distant", 1.1);
  const vague = p("vague", 0.7);
  const covered = p("covered", 0.75);
  const follow = p("prefer", 1.2, 0.12);
  const phone = p("phone", 0.5);
  const learningWidth = mix(490 + 50 * higher, 310, distant);
  const learningHeight = mix(190 + 20 * higher, 142, distant);
  const douyinWidth = mix(340, 540, immediate * 0.5 + distant * 0.5);
  const douyinHeight = mix(146, 210, immediate * 0.5 + distant * 0.5);
  const left = 500;
  const right = 1420;
  const cy = 470;
  const actionX = mix(left, right, follow);
  // 所有状态共享同一对象与坐标；信息移入、收缩和选择移动都有原台词依据。
  const learningColor = covered > 0.5 ? MOTION.muted : MOTION.amber;
  const edgeOpacity = mix(0.7 + clear * 0.3, 0.48, unstable) * mix(1, 0.8, distant);
  const infoX = mix(1660, right, immediate);
  const infoY = mix(685, cy + 45, immediate);
  const infoOpacity = incoming * (1 - phone * 0.1);

  return <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ fontFamily: MOTION_FONT.sans }}>
    <Text x={960} y={224} size={28} fill={MOTION.muted}>当下认知到的价值</Text>

    <g aria-label="学习的价值框">
      <rect x={left - learningWidth / 2} y={cy - learningHeight / 2} width={learningWidth} height={learningHeight}
        fill="none" stroke={learningColor} strokeWidth={2} strokeOpacity={edgeOpacity}
        strokeDasharray={unstable > 0.5 ? "9 9" : undefined} />
      <Text x={left} y={cy - 28} size={44} fill={MOTION.text}>学习</Text>
      <Text x={left} y={cy + 32} size={27} fill={MOTION.muted} opacity={1 - vague}>未来回报</Text>
      <Text x={left} y={cy + 32} size={27} fill={MOTION.muted} opacity={vague}>遥远 · 模糊</Text>
      <path d={`M${left - learningWidth / 2} ${cy - learningHeight / 2 - 18} v-10 h${learningWidth * (1 - covered)} v10`}
        fill="none" stroke={MOTION.amber} strokeWidth={2} opacity={0.7 * (1 - covered)} />
    </g>

    <g aria-label="刷抖音的价值框">
      <rect x={right - douyinWidth / 2} y={cy - douyinHeight / 2} width={douyinWidth} height={douyinHeight}
        fill="none" stroke={covered > 0.5 ? MOTION.amber : MOTION.muted} strokeWidth={2}
        strokeOpacity={0.55 + 0.45 * covered} />
      <Text x={right} y={cy - 28} size={44} fill={pleasure > 0.5 ? MOTION.text : MOTION.muted}>刷抖音</Text>
      <path d={`M${right - douyinWidth / 2} ${cy - douyinHeight / 2 - 18} v-10 h${douyinWidth * covered} v10`}
        fill="none" stroke={MOTION.amber} strokeWidth={2} opacity={0.8 * covered} />
    </g>

    <g aria-label="价值高低关系" transform={`translate(960 ${cy}) scale(${1 - 2 * covered} 1)`} opacity={0.35 + 0.65 * clear}>
      <path d="M-22 -38 L25 0 L-22 38" fill="none" stroke={MOTION.text} strokeWidth={2.5}
        pathLength={1} strokeDasharray={1} strokeDashoffset={1 - (0.35 + clear * 0.65)} />
    </g>

    <g aria-label="即时快乐的信息移入" transform={`translate(${infoX} ${infoY})`} opacity={infoOpacity}>
      <rect x={-156} y={-31} width={312} height={62} fill={MOTION.bg} stroke={MOTION.amber}
        strokeWidth={1.5} strokeOpacity={mix(0.35, 0, immediate)} />
      <Text x={0} y={0} size={26} fill={MOTION.muted} opacity={1 - pleasure}>新认知</Text>
      <Text x={0} y={0} size={26} fill={MOTION.amber} opacity={pleasure * (1 - certain)}>即时快乐</Text>
      <Text x={0} y={0} size={26} fill={MOTION.amber} opacity={certain}>确定{immediate > 0.02 ? " · 立刻" : ""}</Text>
    </g>

    <path d={`M${left} ${cy + learningHeight / 2 + 24} V714 M${right} ${cy + douyinHeight / 2 + 24} V714`}
      stroke={MOTION.line} strokeWidth={1.5} strokeDasharray="5 9" fill="none" />
    <path d={`M${left} 748 H${right}`} stroke={MOTION.line} strokeWidth={2} />
    <path d={`M${left} 748 H${actionX}`} stroke={MOTION.amber} strokeWidth={2} opacity={follow * 0.65} />
    <circle cx={left} cy={748} r={4} fill={MOTION.line} />
    <circle cx={right} cy={748} r={4} fill={MOTION.line} />
    <circle cx={actionX} cy={748} r={8} fill={MOTION.amber} />
    <Text x={actionX} y={800} size={29} fill={MOTION.amber}>行动</Text>

    <g aria-label="拿起手机" opacity={phone} transform={`translate(1510 ${710 - phone * 8})`}>
      <path d="M0 9 H36 V78 H0 Z M12 68 H24" stroke={MOTION.amber} strokeWidth={2} fill="none" />
    </g>
  </svg>;
};

const CaptionLine: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <div style={{ position: "absolute", bottom: 84, width: "100%", textAlign: "center", fontFamily: MOTION_FONT.kai,
    fontSize: 52, lineHeight: 1.3, letterSpacing: "0.03em", whiteSpace: "nowrap", color: MOTION.text,
    opacity: interpolate(frame, [0, 0.2 * fps], [0, 1], clamp) }}>{text}</div>;
};

export const CognitionReference: React.FC = () => {
  ensureFont();
  ensureSansFont();
  const { fps, durationInFrames } = useVideoConfig();
  return <AbsoluteFill style={{ background: MOTION.bg }}>
    <ValueDiagram />
    <Sequence name="原配音连续摘录" from={0} durationInFrames={durationInFrames} premountFor={fps}>
      <Html5Audio src={staticFile("experiments/cognition-reference/voice.wav")} volume={VOLUME.voice} />
    </Sequence>
    <Sequence name="已有背景音乐" from={0} durationInFrames={durationInFrames} premountFor={fps}>
      <Html5Audio src={staticFile(BGM_DEFAULT)} loop
        volume={frame => VOLUME.bgm * Math.min(interpolate(frame, [0, 0.6 * fps], [0, 1], clamp),
          interpolate(frame, [durationInFrames - fps, durationInFrames], [1, 0], clamp))} />
    </Sequence>
    {excerpt.captions.map((caption, i) => {
      const from = Math.round(caption.startMs / 1000 * fps);
      const end = Math.min(durationInFrames, Math.round(caption.endMs / 1000 * fps));
      return <Sequence key={i} name={caption.text} from={from} durationInFrames={end - from} premountFor={fps}>
        <CaptionLine text={caption.text} />
      </Sequence>;
    })}
  </AbsoluteFill>;
};

export const CognitionReferenceComposition: React.FC = () => <Composition
  id="实验-认知行动-参考样片" component={CognitionReference} durationInFrames={excerpt.durationInFrames}
  fps={30} width={1920} height={1080} />;
