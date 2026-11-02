import React from "react";
import { AbsoluteFill, getStaticFiles, Html5Audio, Sequence, staticFile } from "remotion";
import { Hud, Shake, Subtitle } from "./kit";
import { findEpisode } from "./episodes";
import { buildTimeline } from "./script/timeline";
import { AuthorBadge, AuthorCredit } from "./segments/AuthorCredit";
import { ChapterCard } from "./segments/ChapterCard";
import { TurnCard } from "./segments/TurnCard";
import { C, toneColor } from "./style/theme";
import { BGM_DEFAULT, resolveSfx, SFX } from "./style/sfx";
import { REGISTRY } from "./templates/registry";

export type EpisodeProps = { dir: string }; // episodes/ 下的文件夹名

// 缺音频文件时跳过，避免还没放素材就无法预览
const has = (p: string) => getStaticFiles().some((f) => f.name === p);
const Sound: React.FC<{ src: string; volume?: number; loop?: boolean }> = ({ src, ...rest }) =>
  has(src) ? <Html5Audio src={staticFile(src)} {...rest} /> : null;

export const Episode: React.FC<EpisodeProps> = ({ dir }) => {
  const ep = findEpisode(dir);
  if (!ep) return <AbsoluteFill style={{ background: C.bg, color: C.drain }}>找不到篇目：{dir}</AbsoluteFill>;
  const { script, scenes } = ep;
  const { items, creditEnd } = buildTimeline(script);
  const templates = { ...REGISTRY, ...scenes };
  const bgm = script.meta["BGM"] ? `bgm/${script.meta["BGM"]}` : BGM_DEFAULT;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Sound src={bgm} volume={0.35} loop />
      {items.map((it, i) => {
        if (it.kind === "credit")
          return (
            <Sequence key={i} from={it.from} durationInFrames={it.frames} name="署名">
              <AuthorCredit />
            </Sequence>
          );
        if (it.kind === "chapter")
          return (
            <Sequence key={i} from={it.from} durationInFrames={it.frames} name={`章节 ${it.no}`}>
              <ChapterCard no={it.no} title={it.title} />
              <Sound src={SFX.page} />
            </Sequence>
          );
        if (it.kind === "turn")
          return (
            <Sequence key={i} from={it.from} durationInFrames={it.frames} name="转折">
              <TurnCard title={it.title} />
              <Sound src={SFX.rise} />
            </Sequence>
          );

        const s = it.screen;
        const def = templates[s.template] ?? templates["留白"];
        const accent = toneColor(s.tone);
        const Comp = def.component;
        const shake = s.sfx.includes("shake") || s.sfx.includes("震动");
        const body = (
          <>
            <Comp screen={s} accent={accent} />
            {!def.ownSubtitle && <Subtitle text={s.text} accent={accent} />}
          </>
        );
        return (
          <Sequence key={i} from={it.from} durationInFrames={it.frames} name={`${it.index + 1} ${s.template}`}>
            {s.sectionKind === "chapter" && <Hud no={s.chapterNo} title={s.section} />}
            {shake ? <Shake>{body}</Shake> : body}
            {s.sfx.map((n) => {
              const k = resolveSfx(n);
              return k ? <Sound key={n} src={SFX[k]} /> : null;
            })}
          </Sequence>
        );
      })}
      <Sequence from={creditEnd}>
        <AuthorBadge />
      </Sequence>
    </AbsoluteFill>
  );
};
