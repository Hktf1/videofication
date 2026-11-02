import React from "react";
import { AbsoluteFill, getStaticFiles, Html5Audio, Img, Sequence, staticFile } from "remotion";
import { ensureFont } from "./kit/Font";
import { FigureCanvas } from "./kit/InkFigure";
import { Subtitle } from "./kit/Subtitle";
import { findEpisode } from "./episodes";
import { FIGURE_FROM, FIGURE_TO } from "./experiment/figure02";
import { buildTimeline } from "./script/timeline";
import { INK, INK_LAYOUT } from "./style/ink";
import { BGM_DEFAULT, resolveSfx, SFX, VOLUME } from "./style/sfx";

// 02-1 的小人样片：只取第 FIGURE_FROM–FIGURE_TO 屏，时间轴整体平移到 0 开始。
export type FigureEpisodeProps = { dir: string };

const has = (p: string) => getStaticFiles().some((f) => f.name === p);
const Sound: React.FC<{ src: string; volume?: number; loop?: boolean }> = ({ src, volume = VOLUME.sfx, ...rest }) =>
  has(src) ? <Html5Audio src={staticFile(src)} volume={volume} {...rest} /> : null;

export const FigureEpisode: React.FC<FigureEpisodeProps> = ({ dir }) => {
  ensureFont();
  const ep = findEpisode(dir);
  if (!ep) return <AbsoluteFill style={{ background: INK.paper, color: INK.ink }}>找不到篇目：{dir}</AbsoluteFill>;
  const { items } = buildTimeline(ep.script, ep.voice);
  const cut = items.filter((it) => it.index >= FIGURE_FROM && it.index <= FIGURE_TO);
  const off = cut[0]?.from ?? 0;
  const last = cut[cut.length - 1];
  const total = last ? last.from + last.frames + 20 - off : 1;
  const bgm = ep.script.meta["BGM"] ? `bgm/${ep.script.meta["BGM"]}` : BGM_DEFAULT;

  return (
    <AbsoluteFill style={{ background: INK.paper }}>
      {has("ink/paper.jpg")
        ? <Img src={staticFile("ink/paper.jpg")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        : null}
      <Sound src={bgm} volume={VOLUME.bgm} loop />
      <Sequence from={0} durationInFrames={total} name="小人">
        <FigureCanvas slots={cut.map((it) => ({ from: it.from - off, frames: it.frames, chars: it.timing.chars }))} />
      </Sequence>
      {cut.map((it) => {
        const s = it.screen;
        // 最后一屏字幕在墨色上，改用纸色
        const dark = it.index === FIGURE_TO;
        return (
          <Sequence key={it.index} from={it.from - off} durationInFrames={it.frames} name={`${it.index + 1} ${s.text}`}>
            <Subtitle {...s} {...it.timing} size={INK_LAYOUT.textSize} y={INK_LAYOUT.textY}
              color={dark ? INK.paper : INK.ink} emColor={INK.accent} />
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
