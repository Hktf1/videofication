import React from "react";
import { AbsoluteFill, getStaticFiles, Html5Audio, interpolate, Sequence, staticFile } from "remotion";
import { ensureSansFont } from "./kit/Font";
import { MotionStage } from "./kit/MotionStage";
import { MotionSubtitle } from "./kit/MotionSubtitle";
import { initialMotion, motionCues, motionTrack } from "./script/motion";
import { FPS, type Script } from "./script/parse";
import type { VoiceMap } from "./script/sync";
import { buildTimeline } from "./script/timeline";
import { MOTION } from "./style/motion";
import { BGM_DEFAULT, BGM_FADE, VOLUME } from "./style/sfx";

// V1 极简动效的实验样片：脚本来自 experiment/*.md，配音可以复用某一章已有素材。
export type MotionEpisodeProps = { script: Script; voice?: VoiceMap; audio?: string; bgm?: string };

const has = (p: string) => getStaticFiles().some((f) => f.name === p);

const Bgm: React.FC<{ src: string }> = ({ src }) => {
  if (!has(src)) return null;
  const fade = Math.round(BGM_FADE * FPS);
  return <Html5Audio src={staticFile(src)} loop
    volume={(f) => interpolate(f, [0, fade], [0, VOLUME.bgm], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />;
};

export const MotionEpisode: React.FC<MotionEpisodeProps> = ({ script, voice, audio, bgm }) => {
  ensureSansFont();
  const { items } = buildTimeline(script, voice);
  const initial = initialMotion(script.screens, items[0]?.index ?? 0);
  const steps = motionTrack(motionCues(items), initial);

  return (
    <AbsoluteFill style={{ background: MOTION.bg }}>
      <MotionStage steps={steps} initial={initial} />
      <Bgm src={bgm ?? BGM_DEFAULT} />
      {items.map((it) => (
        <Sequence key={it.index} from={it.from} durationInFrames={it.frames} name={`${it.index + 1} ${it.screen.text}`}>
          <MotionSubtitle text={it.screen.text} {...it.timing} />
          {audio && it.audio && (
            <Html5Audio src={audio} volume={VOLUME.voice} trimBefore={it.audio.from} durationInFrames={it.audio.frames} />
          )}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
