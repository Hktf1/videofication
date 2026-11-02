import React from "react";
import { AbsoluteFill, getStaticFiles, Html5Audio, Sequence, staticFile } from "remotion";
import { ensureFont } from "./kit/Font";
import { GridCanvas } from "./kit/Grid";
import { GridSubtitle } from "./kit/GridSubtitle";
import { findEpisode } from "./episodes";
import { buildTimeline } from "./script/timeline";
import { GRID } from "./style/grid";
import { BGM_DEFAULT, resolveSfx, SFX, VOLUME } from "./style/sfx";

// 02-1 的网格样片：黑白红几何风格，只画前 count 屏。
export type GridEpisodeProps = { dir: string; count?: number };

const has = (p: string) => getStaticFiles().some((f) => f.name === p);
const Sound: React.FC<{ src: string; volume?: number; loop?: boolean }> = ({ src, volume = VOLUME.sfx, ...rest }) =>
  has(src) ? <Html5Audio src={staticFile(src)} volume={volume} {...rest} /> : null;

export const GridEpisode: React.FC<GridEpisodeProps> = ({ dir, count = 15 }) => {
  ensureFont();
  const ep = findEpisode(dir);
  if (!ep) return <AbsoluteFill style={{ background: GRID.paper, color: GRID.ink }}>找不到篇目：{dir}</AbsoluteFill>;
  const { items } = buildTimeline(ep.script, ep.voice);
  const cut = items.filter((it) => it.index < count);
  const last = cut[cut.length - 1];
  const total = last ? last.from + last.frames + 20 : 1;
  const bgm = ep.script.meta["BGM"] ? `bgm/${ep.script.meta["BGM"]}` : BGM_DEFAULT;

  return (
    <AbsoluteFill style={{ background: GRID.paper }}>
      <Sound src={bgm} volume={VOLUME.bgm} loop />
      <Sequence from={0} durationInFrames={total} name="网格图解">
        <GridCanvas slots={cut.map((it) => ({ from: it.from, frames: it.frames }))} />
      </Sequence>
      {cut.map((it) => {
        const s = it.screen;
        return (
          <Sequence key={it.index} from={it.from} durationInFrames={it.frames} name={`${it.index + 1} ${s.text}`}>
            <GridSubtitle text={s.text} {...it.timing} emColor={GRID.accent} />
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
