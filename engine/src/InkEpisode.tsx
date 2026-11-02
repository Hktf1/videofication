import React from "react";
import { AbsoluteFill, getStaticFiles, Html5Audio, Img, Sequence, staticFile } from "remotion";
import { ensureFont } from "./kit/Font";
import { InkCanvas } from "./kit/Ink";
import { Subtitle } from "./kit/Subtitle";
import { findEpisode } from "./episodes";
import { buildTimeline } from "./script/timeline";
import { INK, INK_LAYOUT } from "./style/ink";
import { BGM_DEFAULT, resolveSfx, SFX, VOLUME } from "./style/sfx";

// 02-1 的墨线样片：暖纸底 + 手绘墨线，只画前 count 屏。
export type InkEpisodeProps = { dir: string; count?: number };

const has = (p: string) => getStaticFiles().some((f) => f.name === p);
const Sound: React.FC<{ src: string; volume?: number; loop?: boolean }> = ({ src, volume = VOLUME.sfx, ...rest }) =>
  has(src) ? <Html5Audio src={staticFile(src)} volume={volume} {...rest} /> : null;

export const InkEpisode: React.FC<InkEpisodeProps> = ({ dir, count = 15 }) => {
  ensureFont();
  const ep = findEpisode(dir);
  if (!ep) return <AbsoluteFill style={{ background: INK.paper, color: INK.ink }}>找不到篇目：{dir}</AbsoluteFill>;
  const { items } = buildTimeline(ep.script, ep.voice);
  const cut = items.filter((it) => it.index < count);
  const last = cut[cut.length - 1];
  const total = last ? last.from + last.frames + 20 : 1;
  const bgm = ep.script.meta["BGM"] ? `bgm/${ep.script.meta["BGM"]}` : BGM_DEFAULT;

  return (
    <AbsoluteFill style={{ background: INK.paper }}>
      {has("ink/paper.jpg")
        ? <Img src={staticFile("ink/paper.jpg")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        : null}
      <Sound src={bgm} volume={VOLUME.bgm} loop />
      <Sequence from={0} durationInFrames={total} name="墨线图解">
        <InkCanvas slots={cut.map((it) => ({ from: it.from, frames: it.frames }))} />
      </Sequence>
      {cut.map((it) => {
        const s = it.screen;
        return (
          <Sequence key={it.index} from={it.from} durationInFrames={it.frames} name={`${it.index + 1} ${s.text}`}>
            <Subtitle {...s} {...it.timing} size={INK_LAYOUT.textSize} y={INK_LAYOUT.textY}
              color={INK.ink} emColor={INK.accent} />
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
