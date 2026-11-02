// 暗调样片播放器：背景贯穿全片，每屏叠一行字幕 + 一个道具。
// 与 Episode 的区别只在视觉层：解析、节奏、字幕动效全部复用。
import React from "react";
import { AbsoluteFill, getStaticFiles, Html5Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { DarkProp } from "./kit/DarkProps";
import { DarkStage } from "./kit/DarkStage";
import { Subtitle } from "./kit/Subtitle";
import type { Script } from "./script/parse";
import type { VoiceMap } from "./script/sync";
import { buildTimeline } from "./script/timeline";
import { DARK, DL, SERIF } from "./style/dark";
import { BGM_DEFAULT, resolveSfx, SFX, VOLUME } from "./style/sfx";

export type DarkEpisodeProps = { script: Script; voice?: VoiceMap; audio?: string };

const has = (p: string) => getStaticFiles().some((f) => f.name === p);
const Sound: React.FC<{ src: string; volume?: number; loop?: boolean }> = ({ src, volume = VOLUME.sfx, ...rest }) =>
  has(src) ? <Html5Audio src={staticFile(src)} volume={volume} {...rest} /> : null;

export const DarkEpisode: React.FC<DarkEpisodeProps> = ({ script, voice, audio }) => {
  const { items } = buildTimeline(script, voice);
  const bgm = script.meta["BGM"] ? `bgm/${script.meta["BGM"]}` : BGM_DEFAULT;
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // 全片头尾压黑：开场从黑里浮出，结尾收回黑
  const fade = Math.max(
    interpolate(f, [0, 12], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    interpolate(f, [durationInFrames - 30, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );

  return (
    <AbsoluteFill style={{ backgroundColor: DARK.bg0 }}>
      <DarkStage />
      <Sound src={bgm} volume={VOLUME.bgm} loop />
      {items.map((it) => {
        const s = it.screen;
        return (
          <Sequence key={it.index} from={it.from} durationInFrames={it.frames} name={`${it.index + 1} ${s.text}`}>
            {s.prop && <DarkProp spec={s.prop} frames={it.frames} />}
            <Subtitle
              {...s}
              {...it.timing}
              size={DL.subtitleSize}
              y={DL.subtitleY}
              color={DARK.ink}
              emColor={DARK.red}
              font={SERIF}
              weight={500}
              shadow={DL.subtitleShadow}
              fadeOut={12}
            />
            {audio && it.audio && (
              <Html5Audio src={staticFile(audio)} volume={VOLUME.voice} trimBefore={it.audio.from} durationInFrames={it.audio.frames} />
            )}
            {s.sfx.map((n) => {
              const k = resolveSfx(n);
              return k ? <Sound key={n} src={SFX[k]} /> : null;
            })}
          </Sequence>
        );
      })}
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: fade, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
