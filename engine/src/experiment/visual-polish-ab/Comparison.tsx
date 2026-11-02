import React from 'react';
import {AbsoluteFill, Composition, Html5Audio, Sequence, interpolate, staticFile, useVideoConfig} from 'remotion';
import {ensureFont, ensureSansFont} from '../../kit/Font';
import {MotionSubtitle} from '../../kit/MotionSubtitle';
import {MOTION as C, MOTION_FONT} from '../../style/motion';
import {BGM_DEFAULT, VOLUME} from '../../style/sfx';
import type {SceneCue} from '../../script/scene';
import {Scene as BaselineScene} from './BaselineScene';
import {PolishedScene} from './PolishedScene';

type Excerpt = {durationInFrames: number; fps: number; cues: SceneCue[]};
const data: Excerpt = require('./excerpt.json');
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const SharedSound: React.FC = () => {
  const {fps, durationInFrames} = useVideoConfig();
  return <>
    <Sequence name="两版共用原配音" from={0} durationInFrames={durationInFrames} premountFor={fps}>
      <Html5Audio src={staticFile('experiments/visual-polish-ab/voice.wav')} volume={VOLUME.voice}/>
    </Sequence>
    <Sequence name="两版共用背景音乐" from={0} durationInFrames={durationInFrames} premountFor={fps}>
      <Html5Audio src={staticFile(BGM_DEFAULT)} loop volume={f => VOLUME.bgm * Math.min(
        interpolate(f, [0, .6 * fps], [0, 1], clamp),
        interpolate(f, [durationInFrames - .6 * fps, durationInFrames], [1, 0], clamp))}/>
    </Sequence>
  </>;
};

const SharedCaptions: React.FC = () => {
  const {fps} = useVideoConfig();
  return <>{data.cues.map(cue => <Sequence key={cue.index} name={cue.text}
    from={cue.at} durationInFrames={cue.frames} premountFor={fps}>
    <MotionSubtitle text={cue.text} frames={cue.frames} fadeIn={Math.round(.2 * fps)}
      fadeOutAt={cue.frames} emphasis={[]} chars={cue.chars} speakEnd={cue.speakEnd}/>
  </Sequence>)}</>;
};

type Props = {mode: 'baseline' | 'polished' | 'comparison'};
export const VisualPolish: React.FC<Props> = ({mode}) => {
  ensureFont();
  ensureSansFont();
  const sceneProps = {cues: data.cues, total: data.durationInFrames};
  // 原片在摘录开始前已进入「扎根」场景；补回切片前状态，避免重播入场而让首帧变黑。
  const baselineProps = {...sceneProps, cues: [{index: -1, at: -data.fps, frames: data.fps,
    text: '', chars: [], speakEnd: 0, beat: {section: '扎根', step: '对照'}}, ...data.cues]};
  return <AbsoluteFill style={{background: C.bg, fontFamily: MOTION_FONT.sans}}>
    {mode === 'baseline' && <BaselineScene {...baselineProps}/>}
    {mode === 'polished' && <PolishedScene {...sceneProps}/>}
    {mode === 'comparison' && <>
      <div style={{position: 'absolute', left: 80, top: 85, fontSize: 32, color: C.text}}>A · 基础版</div>
      <div style={{position: 'absolute', left: 1040, top: 85, fontSize: 32, color: C.text}}>B · 优化版</div>
      <div style={{position: 'absolute', left: 959, top: 150, width: 2, height: 650, background: C.line}}/>
      <svg width={920} height={650} viewBox="220 160 1480 680" style={{position: 'absolute', left: 20, top: 170}}>
        <BaselineScene {...baselineProps}/>
      </svg>
      <svg width={920} height={650} viewBox="220 160 1480 680" style={{position: 'absolute', left: 980, top: 170}}>
        <PolishedScene {...sceneProps}/>
      </svg>
    </>}
    <SharedSound/>
    <SharedCaptions/>
  </AbsoluteFill>;
};

export const VisualPolishRoot: React.FC = () => <>
  <Composition id="Compare" component={VisualPolish} durationInFrames={data.durationInFrames}
    fps={30} width={1920} height={1080} defaultProps={{mode: 'comparison'}}/>
  <Composition id="A-Baseline" component={VisualPolish} durationInFrames={data.durationInFrames}
    fps={30} width={1920} height={1080} defaultProps={{mode: 'baseline'}}/>
  <Composition id="B-Polished" component={VisualPolish} durationInFrames={data.durationInFrames}
    fps={30} width={1920} height={1080} defaultProps={{mode: 'polished'}}/>
</>;
