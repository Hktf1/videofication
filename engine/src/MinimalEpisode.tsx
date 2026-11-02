import React from "react";
import { AbsoluteFill, getStaticFiles, Html5Audio, Sequence, staticFile } from "remotion";
import { ensureFont } from "./kit/Font";
import { MinimalCanvas } from "./kit/MinimalCanvas";
import { Subtitle } from "./kit/Subtitle";
import { findEpisode } from "./episodes";
import { SAMPLE_FROM, SAMPLE_TO, minimalSample } from "./experiment/minimal03";
import { abstractCues, abstractTrack, initialAbstract } from "./script/minimal";
import { buildTimeline } from "./script/timeline";
import { MIN, minimalFade } from "./style/minimal";
import { BGM_DEFAULT, resolveSfx, SFX, VOLUME } from "./style/sfx";

// 03-3 的极简抽象样片：只取「正反馈 vs 负反馈」两段，时间轴整体平移到 0 开始。
export type MinimalEpisodeProps = { dir: string };

const has = (p: string) => getStaticFiles().some((f) => f.name === p);
const Sound: React.FC<{ src: string; volume?: number; loop?: boolean }> = ({ src, volume = VOLUME.sfx, ...rest }) =>
  has(src) ? <Html5Audio src={staticFile(src)} volume={volume} {...rest} /> : null;

export const MinimalEpisode: React.FC<MinimalEpisodeProps> = ({ dir }) => {
  ensureFont();
  const ep = findEpisode(dir);
  if (!ep) return <AbsoluteFill style={{ background: MIN.bg, color: MIN.ink }}>找不到篇目：{dir}</AbsoluteFill>;

  const { items } = buildTimeline(ep.script, ep.voice);
  const cut = minimalSample(items);
  if (!cut.length) {
    return <AbsoluteFill style={{ background: MIN.bg, color: MIN.ink, padding: 80, fontSize: 40 }}>
      样片范围找不到：{SAMPLE_FROM} → {SAMPLE_TO}
    </AbsoluteFill>;
  }

  const off = cut[0].from;
  const last = cut[cut.length - 1];
  const total = last.from + last.frames + 20 - off;
  const initial = initialAbstract(ep.script.screens, cut[0].index);
  const track = abstractTrack(abstractCues(cut, off), initial);
  const bgm = ep.script.meta["BGM"] ? `bgm/${ep.script.meta["BGM"]}` : BGM_DEFAULT;

  return (
    <AbsoluteFill style={{ background: MIN.bg }}>
      <Sound src={bgm} volume={VOLUME.bgm} loop />
      <Sequence from={0} durationInFrames={total} name="极简抽象">
        <MinimalCanvas steps={track} initial={initial} />
      </Sequence>
      {cut.map((it) => {
        const s = it.screen;
        return (
          <Sequence key={it.index} from={it.from - off} durationInFrames={it.frames} name={`${it.index + 1} ${s.text}`}>
            <Subtitle {...s} {...it.timing} fadeIn={minimalFade(it.frames)} fadeOut={minimalFade(it.frames)} afterTurn={false}
              scaleFrom={s.fx ? 0.985 : undefined} color={MIN.ink} emColor={MIN.accent} />
            {ep.audio && it.audio && (
              <Html5Audio src={ep.audio} volume={VOLUME.voice} trimBefore={it.audio.from} durationInFrames={it.audio.frames} />
            )}
            {s.sfx.map((n) => {
              const k = resolveSfx(n);
              return k ? <Sound key={n} src={SFX[k]} /> : null;
            })}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
