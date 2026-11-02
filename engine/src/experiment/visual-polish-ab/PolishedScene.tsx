import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {sceneCtx, type SceneProps} from '../../script/scene';
import {P, Dot, Txt, easeInOut, easeOut, lerp} from '../../kit/sceneKit';
import {MOTION as C, MOTION_FONT} from '../../style/motion';

// 此实验的几何参数集中维护；不修改正式引擎的色板或默认图元。
const G = {left: 575, right: 1345, surface: 412, bed: 770, stroke: 2.5, label: 32};

export const PolishedScene: React.FC<SceneProps> = ({cues}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ctx = sceneCtx(cues, frame);
  const at = (cue: string, word: string) => ctx.word(ctx.cueWith(cue), word);
  const progress = (start: number, seconds = .65) => easeInOut(ctx.grow(start, Math.round(seconds * fps)));
  const sense = progress(at('被动接收', '感性印象'));
  const consequence = progress(at('偶尔瞥见', '后果'), .45);
  const advice = progress(at('偶尔瞥见', '道理'), .45);
  const illusion = progress(at('情绪上头', '幻觉'), .45);
  const noRoot = progress(at('没有根', '没有根'), .45);
  const waveAt = at('一阵轻微', '情绪波动');
  const wave = progress(waveAt, 1.0);
  const scatterAt = at('就足以', '连根拔起');
  const scatter = progress(scatterAt, .75);
  const rational = progress(at('而理性认知', '理性认知'), .6);
  const resources = progress(at('而理性认知', '投入'), .8);
  const drill = progress(at('反复钻研', '钻研'), .55);
  const deduce = progress(at('反复钻研', '推演'), .55);
  const internalize = progress(at('反复钻研', '内化'), .6);
  const doIt = progress(at('直到那幅', '做了'), .5);
  const notDo = progress(at('不做会怎样', '不做'), .5);
  const clear = progress(at('刀刻一样清晰', '清晰'), .5);
  const foam = progress(at('水面的泡沫', '泡沫'), .45);
  const sink = progress(at('沉入水底', '沉入'), .75);
  const depth = 92 * sink;
  const activeLeft = 1 - rational * .45;
  const bubbleXs = [440, 575, 710];
  const bubbleRs = [29, 43, 32];
  const labels = ['瞥见的后果', '别人的道理', '情绪幻觉'];
  const labelProgress = [consequence, advice, illusion];

  return <svg width={1920} height={900} viewBox="0 0 1920 900"
    style={{position: 'absolute', left: 0, top: 0, fontFamily: MOTION_FONT.sans}}>
    <Txt x={G.left} y={218} anchor="middle" size={G.label} color={C.text} opacity={activeLeft}>感性印象</Txt>
    <Txt x={G.right} y={218} anchor="middle" size={G.label} opacity={rational}>理性认知</Txt>

    {/* 水面一直保留；改变对象的状态，而不是切换整个场景。 */}
    <P d={`M 300 ${G.surface} H 1620`} color={C.line} w={2}/>
    {bubbleXs.map((x, i) => {
      const born = i === 0 ? 1 : sense;
      const leave = easeOut(ctx.grow(scatterAt + i * .07 * fps, .65 * fps));
      const r = bubbleRs[i];
      const cy = G.surface - r - 5;
      const emphasis = labelProgress[i] * (1 - (labelProgress[i + 1] ?? 0));
      return <g key={i} opacity={born * (1 - leave) * activeLeft}>
        <Dot cx={x + leave * (120 + i * 38)} cy={cy - leave * (48 + i * 22)} r={r}
          stroke={C.muted} sw={G.stroke} opacity={.65 + emphasis * .35}/>
        <Txt x={x} y={290} anchor="middle" size={26} color={C.muted}
          opacity={labelProgress[i] * (1 - scatter)}>{labels[i]}</Txt>
        <P d={`M ${x} ${G.surface + 18} v 20 m 0 17 v 20`} dash="4 8" color={C.muted}
          w={1.5} opacity={noRoot * (1 - leave) * .6}/>
      </g>;
    })}

    <g opacity={wave * (1 - scatter)}>
      <P d={`M 300 350 H ${lerp(300, 760, wave)} l 15 -15 l 18 30 l 15 -15 h 35`}
        color={C.muted} w={1.8} p={wave}/>
    </g>

    {/* 右侧依次建立主干、横梁、托底与锚爪；动作与三个词分开对应。 */}
    <g opacity={rational}>
      <P d={`M ${G.right} ${G.surface} V ${346 + depth}`} color={C.muted} w={1.8} opacity={sink}/>
      <g transform={`translate(0 ${depth})`}>
        <Dot cx={G.right} cy={346} r={16} stroke={C.amber} sw={G.stroke}/>
        <P d={`M ${G.right} 362 V 590`} color={C.amber} w={G.stroke} p={resources}/>
        <P d={`M ${G.right - 52} 436 H ${G.right + 52}`} color={C.amber} w={G.stroke} p={drill}/>
        <P d={`M ${G.right - 115} 542 Q ${G.right - 98} 633 ${G.right} 634 Q ${G.right + 98} 633 ${G.right + 115} 542`}
          color={C.amber} w={G.stroke} p={deduce}/>
        <P d={`M ${G.right - 115} 542 v 42 m 0 -42 l 39 18 M ${G.right + 115} 542 v 42 m 0 -42 l -39 18`}
          color={C.amber} w={G.stroke} p={internalize}/>
        <P d={`M ${G.right} 590 V 634`} color={C.amber} w={G.stroke} p={internalize}/>
        <Dot cx={G.right - 115} cy={542} r={5} fill={C.amber} opacity={doIt * (1 - foam)}/>
        <Dot cx={G.right + 115} cy={542} r={5} fill={C.amber} opacity={notDo * (1 - foam)}/>
        <Txt x={G.right - 155} y={505} anchor="middle" size={25} color={C.muted}
          opacity={doIt * (1 - foam)}>做</Txt>
        <Txt x={G.right + 155} y={505} anchor="middle" size={25} color={C.muted}
          opacity={notDo * (1 - foam)}>不做</Txt>
        <P d={`M ${G.right - 135} 665 H ${G.right + 135}`} color={C.amber} w={1.5} p={clear}
          opacity={clear * (1 - foam) * .6}/>
      </g>
    </g>

    {/* 原文最后回到泡沫与锚：回显左侧对象，保留两种状态供定格阅读。 */}
    <g opacity={foam * .8}>
      <Dot cx={G.left} cy={G.surface - 43} r={38} stroke={C.muted} sw={G.stroke}/>
    </g>
    <P d={`M ${G.right - 175} ${G.bed} H ${G.right + 175}`} color={C.line} w={2} p={sink}/>
  </svg>;
};
