import React from "react";
import { Composition, Folder } from "remotion";
import { DarkEpisode } from "./DarkEpisode";
import { GridEpisode } from "./GridEpisode";
import { InkEpisode } from "./InkEpisode";
import { MinimalEpisode } from "./MinimalEpisode";
import { MotionEpisode } from "./MotionEpisode";
import { MINIMAL03_DIR, minimalSample } from "./experiment/minimal03";
import { findEpisode } from "./episodes";
import { GRID_SCREENS } from "./experiment/grid02";
import { INK_SCREENS } from "./experiment/ink02";
import darkSample from "./experiment/darkSample.md";
import motionSample from "./experiment/motionSample.md";
import motionParts from "./experiment/motionParts.md";
import { DARK_VOICE } from "./experiment/darkSample.voice";
import { FPS, parseScript } from "./script/parse";
import { buildTimeline } from "./script/timeline";
import { LAYOUT } from "./style/theme";
import { CognitionReferenceComposition } from "./experiment/cognition-reference/CognitionReference";

// 风格实验：02-1 的暖纸墨线 vs 黑白红网格，两个样片并排比较
const DARK_SAMPLE = parseScript(darkSample);
const DARK_TOTAL = buildTimeline(DARK_SAMPLE, DARK_VOICE).total;
const DARK_AUDIO = "dark-sample/voice.mp3";

// V1 极简动效：一篇用真实配音（06-1），一篇没有配音、专门看图元
const MOTION_DIR = "06-错误/06-1-错误的方向，更应该全力以赴";
const MOTION_SCRIPT = parseScript(motionSample);
const MOTION_PARTS = parseScript(motionParts);

export const Experiment: React.FC = () => {
  const s = findEpisode("02-半途而废/02-1-为什么总是半途而废");
  const all = s ? buildTimeline(s.script, s.voice).items : [];
  const cut = all.filter((it) => it.index < INK_SCREENS);
  const last = cut[cut.length - 1];
  const m = findEpisode(MINIMAL03_DIR);
  const mCut = m ? minimalSample(buildTimeline(m.script, m.voice).items) : [];
  const mLast = mCut[mCut.length - 1];
  const mo = findEpisode(MOTION_DIR);
  return (
    <Folder name="实验">
      <CognitionReferenceComposition />
      <Composition id="实验-暗调-样片" component={DarkEpisode}
        durationInFrames={DARK_TOTAL} fps={FPS} width={LAYOUT.width} height={LAYOUT.height}
        defaultProps={{ script: DARK_SAMPLE, voice: DARK_VOICE, audio: DARK_AUDIO }} />
      {s && last && (
        <>
          <Composition id="实验-墨线-02-1" component={InkEpisode}
            durationInFrames={last.from + last.frames + 20}
            fps={FPS} width={LAYOUT.width} height={LAYOUT.height}
            defaultProps={{ dir: s.dir, count: INK_SCREENS }} />
          <Composition id="实验-网格-02-1" component={GridEpisode}
            durationInFrames={last.from + last.frames + 20}
            fps={FPS} width={LAYOUT.width} height={LAYOUT.height}
            defaultProps={{ dir: s.dir, count: GRID_SCREENS }} />
        </>
      )}
      {m && mLast && (
        <Composition id="实验-极简-03-3" component={MinimalEpisode}
          durationInFrames={mLast.from + mLast.frames + 20 - mCut[0].from}
          fps={FPS} width={LAYOUT.width} height={LAYOUT.height}
          defaultProps={{ dir: m.dir }} />
      )}
      {mo && (
        <Composition id="实验-动效-06-1" component={MotionEpisode}
          durationInFrames={buildTimeline(MOTION_SCRIPT, mo.voice).total}
          fps={FPS} width={LAYOUT.width} height={LAYOUT.height}
          defaultProps={{ script: MOTION_SCRIPT, voice: mo.voice, audio: mo.audio }} />
      )}
      <Composition id="实验-动效-图元" component={MotionEpisode}
        durationInFrames={buildTimeline(MOTION_PARTS).total}
        fps={FPS} width={LAYOUT.width} height={LAYOUT.height}
        defaultProps={{ script: MOTION_PARTS }} />
    </Folder>
  );
};

