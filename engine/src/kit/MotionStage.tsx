import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { motionAt, stageProgress, type MotionState, type MotionStep } from "../script/motion";
import { MOTION, MOTION_FONT } from "../style/motion";
import { Box, clamp01, Dot, mix, P as Path, Txt } from "./sceneKit";

// V1 极简动效的通用画面层：只用线、块、读数、闸门；不用渐变、阴影、圆角、人物。
// 五幅通用画面各自读同一个 MotionState，阶段到了就画出来，过渡由 motionAt 给的小数驱动。
// 章节自带 画面.tsx 时不走这里，由那一章的组件自己画。

/* 01 标题：一条横线从中间画穿画面，中段一截琥珀。标题的字由底部字幕承担，画面不重复排字。 */
const TitleScene: React.FC<{ s: MotionState }> = ({ s }) => {
  const p = stageProgress(s, 0);
  return (
    <>
      <Path d="M360 552 H1560" color={MOTION.line} w={2} p={clamp01(p / 0.7)} />
      <Path d="M860 552 H1060" color={MOTION.amber} w={3} p={clamp01((p - 0.55) / 0.45)} />
    </>
  );
};

/* 02 路径：实线走到「此刻」，后半没入未知；遮罩让开，尽头分成台阶与悬崖。 */
const PathScene: React.FC<{ s: MotionState }> = ({ s }) => {
  const p0 = stageProgress(s, 0);
  const p1 = stageProgress(s, 1);
  const p2 = stageProgress(s, 2);
  const p3 = stageProgress(s, 3);
  const unknown = clamp01(p1) * (1 - p2);
  // 分叉出现后主线收回到岔口，不再穿过两条支路
  const end = 1660 - 230 * p3;
  return (
    <>
      <Path d="M240 700 H900" color={MOTION.text} w={3} p={p0} />
      <Dot cx={900} cy={700} r={7} fill={MOTION.amber} opacity={p0} />
      <Txt x={900} y={648} size={22} color={MOTION.muted} anchor="middle" opacity={0.8 * p0}>此刻</Txt>

      <Path d="M900 700 H1660" color={MOTION.unread} w={2} dash="7 10" opacity={0.9 * unknown} />
      <Dot cx={1660} cy={700} r={50} stroke={MOTION.unread} sw={1.5} dash="4 9" opacity={0.8 * unknown} />
      <Txt x={1660} y={702} size={44} color={MOTION.unread} anchor="middle" opacity={0.8 * unknown}>?</Txt>
      <Txt x={1660} y={788} size={22} color={MOTION.muted} anchor="middle" opacity={0.8 * unknown}>看不清</Txt>

      <Path d={`M900 700 H${end}`} color={MOTION.text} w={3} p={p2} opacity={p2} />

      <Path d="M1430 700 L1500 630 M1500 630 H1530 V604 H1560 V578 H1590 V552 H1620" color={MOTION.text} w={2} p={p3} />
      <Txt x={1660} y={552} size={26} color={MOTION.muted} opacity={p3}>台阶</Txt>
      <Path d="M1430 700 L1500 770 M1500 770 H1580 V850 M1580 850 H1680" color={MOTION.text} w={2} p={p3} />
      <Txt x={1610} y={822} size={26} color={MOTION.muted} opacity={p3}>悬崖</Txt>
    </>
  );
};

/* 03 概率：0～100 的刻度轴，「你」在左端；琥珀条长到 40%；右半段被遮罩盖住。 */
const ProbabilityScene: React.FC<{ s: MotionState }> = ({ s }) => {
  const p0 = stageProgress(s, 0);
  const p1 = stageProgress(s, 1);
  const p2 = stageProgress(s, 2);
  const ticks = [0, 25, 50, 75, 100];
  return (
    <>
      <Path d="M360 540 H1560" color={MOTION.line} w={1.5} p={p0} />
      {ticks.map((v, i) => {
        const x = 360 + i * 300;
        return (
          <React.Fragment key={v}>
            <Path d={`M${x} 532 V548`} color={MOTION.line} w={1} p={p0} />
            <Txt x={x} y={584} size={18} color={MOTION.muted} anchor="middle" mono opacity={p0}>{v}</Txt>
          </React.Fragment>
        );
      })}
      <Box x={318} y={527} w={24} h={24} stroke={MOTION.text} sw={1.5} opacity={p0} />
      <Txt x={330} y={495} size={24} color={MOTION.muted} anchor="middle" opacity={p0}>你</Txt>
      <Path d="M342 539 H360" color={MOTION.line} w={1} p={p0} />

      <Box x={360} y={534} w={480 * clamp01(p1)} h={12} fill={MOTION.amber} />
      <Txt x={840} y={470} size={30} color={MOTION.amber} anchor="middle" opacity={p1}>概率 &gt; 0</Txt>

      <Box x={1020} y={462} w={600} h={150} fill={MOTION.bg} stroke={MOTION.line} dash="6 9" opacity={p2} />
      <Txt x={1320} y={500} size={26} color={MOTION.muted} anchor="middle" opacity={0.7 * p2}>?</Txt>
      <Txt x={1320} y={552} size={30} color={MOTION.muted} anchor="middle" opacity={0.8 * p2}>看不清</Txt>
    </>
  );
};

/* 04 时间轴：1 年 = 340px。上轨徘徊满 3 年撞死胡同，下轨冲刺半年撞墙，中间 2.5 年是转向的资本。 */
const TimelineScene: React.FC<{ s: MotionState }> = ({ s }) => {
  const p0 = stageProgress(s, 0);
  const p1 = stageProgress(s, 1);
  const p2 = stageProgress(s, 2);
  const p3 = stageProgress(s, 3);
  const ax = 420 + 1020 * clamp01(p1);
  const bx = 420 + 170 * clamp01(p2);
  const wallA = clamp01((p1 - 0.9) / 0.1);
  const wallB = clamp01((p2 - 0.9) / 0.1);
  return (
    <>
      <Path d="M420 330 H1440" color={MOTION.line} w={1} p={p0} />
      {[0, 1, 2, 3].map((v, i) => {
        const x = 420 + i * 340;
        return (
          <React.Fragment key={v}>
            <Path d={`M${x} 324 V336`} color={MOTION.line} w={1} p={p0} />
            <Txt x={x} y={300} size={18} color={MOTION.muted} anchor="middle" mono opacity={p0}>{v}</Txt>
          </React.Fragment>
        );
      })}
      <Txt x={1480} y={300} size={18} color={MOTION.muted} opacity={p0}>年</Txt>

      <Txt x={300} y={410} size={26} color={MOTION.muted} anchor="end" opacity={p0}>徘徊</Txt>
      <Path d="M420 410 H1440" color={MOTION.line} w={2} p={p0} />
      <Path d={`M420 410 H${ax}`} color={MOTION.muted} w={3} />
      <Dot cx={ax} cy={410} r={8} fill={MOTION.text} opacity={clamp01(p1 * 4)} />

      <Path d="M1440 370 V450" color={MOTION.red} w={2} opacity={wallA} />
      <Path d="M1428 398 L1452 422" color={MOTION.red} w={3} opacity={wallA} />
      <Path d="M1452 398 L1428 422" color={MOTION.red} w={3} opacity={wallA} />
      <Txt x={1480} y={410} size={24} color={MOTION.red} opacity={wallA}>3 年</Txt>
      <Txt x={1480} y={446} size={22} color={MOTION.muted} opacity={wallA}>死胡同</Txt>

      <Txt x={300} y={530} size={26} color={MOTION.muted} anchor="end" opacity={clamp01(p2 * 4)}>冲刺</Txt>
      <Path d="M420 530 H590" color={MOTION.line} w={2} p={p2} />
      <Path d={`M420 530 H${bx}`} color={MOTION.amber} w={3} opacity={clamp01(p2 * 4)} />
      <Dot cx={bx} cy={530} r={8} fill={MOTION.amber} opacity={clamp01(p2 * 4)} />
      <Path d="M590 490 V570" color={MOTION.red} w={2} opacity={wallB} />
      <Path d="M578 518 L602 542" color={MOTION.red} w={3} opacity={wallB} />
      <Path d="M602 518 L578 542" color={MOTION.red} w={3} opacity={wallB} />
      <Txt x={630} y={530} size={24} color={MOTION.amber} opacity={wallB}>0.5 年</Txt>

      <Path d="M590 600 V622 M590 622 H1440 M1440 622 V600" color={MOTION.amber} w={1.5} p={p3} />
      <Box x={590} y={604} w={850} h={32} fill={MOTION.amber} opacity={0.12 * p3} />
      <Txt x={1015} y={574} size={42} color={MOTION.amber} anchor="middle" opacity={p3}>2.5 年</Txt>
      <Txt x={1015} y={674} size={26} color={MOTION.muted} anchor="middle" opacity={p3}>转向的资本</Txt>
      <Path d="M590 530 V600" color={MOTION.unread} w={1} dash="4 6" opacity={0.8 * p3} />
      <Path d="M1440 410 V600" color={MOTION.unread} w={1} dash="4 6" opacity={0.8 * p3} />
    </>
  );
};

/* 05 闸门：红叉收成方块，依次穿过观察 / 反思 / 修正，出来转琥珀、变大，成为资源。 */
const GatesScene: React.FC<{ s: MotionState }> = ({ s }) => {
  const p0 = stageProgress(s, 0);
  const p1 = stageProgress(s, 1);
  const p2 = stageProgress(s, 2);
  const g = clamp01(s.gates / 3) * 3; // 0～3，过渡期间是小数
  const x = 820 + 260 * clamp01(g) + 130 * clamp01(g - 1) + 130 * clamp01(g - 2) + 140 * p2;
  const size = 22 + 42 * p2;
  const labels = ["观察", "反思", "修正"];
  const gatesIn = clamp01(s.stage);
  const leaving = 1 - 0.9 * p2; // 方块变成资源后，原先的红叉不再留在画面上
  return (
    <>
      <Path d="M260 640 H1520" color={MOTION.line} w={2} p={p0} />
      <Path d="M806 626 L834 654" color={MOTION.red} w={3} opacity={p0 * (1 - 0.7 * p0) * leaving} />
      <Path d="M834 626 L806 654" color={MOTION.red} w={3} opacity={p0 * (1 - 0.7 * p0) * leaving} />
      <Txt x={820} y={586} size={24} color={MOTION.red} anchor="middle" opacity={p0 * (1 - 0.35 * p0) * leaving}>错误</Txt>

      {labels.map((label, i) => {
        const gx = 1080 + i * 130;
        const passed = clamp01(g - i);
        const color = mix(MOTION.line, MOTION.amber, passed);
        return (
          <React.Fragment key={label}>
            <Path d={`M${gx} 560 V720`} color={color} w={2} opacity={gatesIn} />
            <Txt x={gx} y={530} size={28} color={passed > 0.5 ? MOTION.amber : MOTION.muted} anchor="middle" opacity={gatesIn}>{label}</Txt>
          </React.Fragment>
        );
      })}

      <Box x={x - size / 2} y={640 - size / 2} w={size} h={size} fill={mix(MOTION.red, MOTION.amber, clamp01(g / 3))} opacity={p0} />
      <Txt x={1480} y={722} size={32} color={MOTION.amber} anchor="middle" opacity={p2}>资源</Txt>
    </>
  );
};

const Scene: React.FC<{ s: MotionState }> = ({ s }) => {
  switch (s.kind) {
    case "标题": return <TitleScene s={s} />;
    case "路径": return <PathScene s={s} />;
    case "概率": return <ProbabilityScene s={s} />;
    case "时间轴": return <TimelineScene s={s} />;
    case "闸门": return <GatesScene s={s} />;
    default: return null;
  }
};

export const MotionStage: React.FC<{ steps: MotionStep[]; initial: MotionState }> = ({ steps, initial }) => {
  const frame = useCurrentFrame();
  const { state, prev, fade } = motionAt(steps, initial, frame);
  if (!state.kind) return null;
  return (
    <AbsoluteFill>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{ fontFamily: MOTION_FONT.sans, position: "absolute", inset: 0 }}>
        {prev && <g opacity={fade}><Scene s={prev} /></g>}
        <Scene s={state} />
      </svg>
    </AbsoluteFill>
  );
};
