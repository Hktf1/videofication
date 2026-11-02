import { initialMotion, isMotionStyle, motionCues, motionTrack } from "./script/motion";
import { sceneCues } from "./script/scene";
import { MOTION } from "./style/motion";
import { MotionStage } from "./kit/MotionStage";
import { MotionSubtitle } from "./kit/MotionSubtitle";
import React from "react";
import { AbsoluteFill, getStaticFiles, Html5Audio, interpolate, Sequence, staticFile } from "remotion";
import { ensureFont, ensureSansFont } from "./kit/Font";
import { Watermark } from "./kit/Watermark";
import { Outro } from "./kit/Outro";
import { findEpisode } from "./episodes";
import { brandOf } from "./script/parse";
import { buildTimeline, OUTRO_FRAMES, outroFrames } from "./script/timeline";
import { FPS } from "./script/parse";
import { C } from "./style/theme";
import { BGM_DEFAULT, BGM_FADE, resolveSfx, SFX, VOLUME } from "./style/sfx";

export type EpisodeProps = { dir: string; size?: number; chapter?: number }; // dir：相对 episodes/ 的章节路径；size：字号试样用；chapter：只放第几章（studio 分章预览）

// 缺音频文件时跳过，避免还没放素材就无法预览
const has = (p: string) => getStaticFiles().some((f) => f.name === p);
const Sound: React.FC<{ src: string; volume?: number; loop?: boolean }> = ({ src, volume = VOLUME.sfx, ...rest }) =>
  has(src) ? <Html5Audio src={staticFile(src)} volume={volume} {...rest} /> : null;

// 背景音乐整片铺底；片头先淡入，避免第一帧突兀出声
const Bgm: React.FC<{ src: string }> = ({ src }) => {
  if (!has(src)) return null;
  const fade = Math.round(BGM_FADE * FPS);
  return <Html5Audio src={staticFile(src)} loop
    volume={(f) => interpolate(f, [0, fade], [0, VOLUME.bgm], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />;
};

export const Episode: React.FC<EpisodeProps> = ({ dir, size, chapter }) => {
  ensureFont();

  const ep = findEpisode(dir);
  if (!ep) return <AbsoluteFill style={{ background: C.bg, color: C.ink }}>找不到篇目：{dir}</AbsoluteFill>;
  const motion = isMotionStyle(ep.script.meta);
  if (!motion) throw new Error("该稿件不是正式的极简动效 V1；旧纯文字素材仅保留供复用，请新建动效版本制作。");
  if (motion) ensureSansFont();
  const { items, total } = buildTimeline(ep.script, ep.voice, chapter);
  // 水印和片尾默认都不加，处理稿头部写了「水印：是」「片尾：是」才渲染
  const brand = brandOf(ep.script.meta);
  const outro = outroFrames(ep.script.meta);
  const outroFrom = total - outro;
  // V1：画面从本章之前的屏累积起步，分章预览也不会空场
  const motionInitial = motion ? initialMotion(ep.script.screens, items[0]?.index ?? 0) : undefined;
  const motionSteps = motion ? motionTrack(motionCues(items), motionInitial!) : [];
  // 章节自带画面（画面.tsx）时优先用它；没有才退回通用图元
  const ChapterScene = motion ? ep.Scene : undefined;
  const cues = ChapterScene ? sceneCues(items) : [];
  const bgm = ep.script.meta["BGM"] ? `bgm/${ep.script.meta["BGM"]}` : BGM_DEFAULT;

  return (
    <AbsoluteFill style={{ background: motion ? MOTION.bg : C.bg }}>
      {ChapterScene ? (
        <ChapterScene cues={cues} total={total} />
      ) : (
        motion && <MotionStage steps={motionSteps} initial={motionInitial!} />
      )}
      <Bgm src={bgm} />
      {items.map((it, i) => {
        const s = it.screen;
        return (
          <Sequence key={i} from={it.from} durationInFrames={it.frames} name={`${it.index + 1} ${s.text}`}>
            {!s.noSubtitle && <MotionSubtitle text={s.text} {...it.timing} size={size} />}
            {/* 本屏配音片段：从 audio.from 帧开始，播放 audio.frames 帧 */}
            {ep.audio && it.audio && (
              <Html5Audio src={ep.audio} volume={VOLUME.voice} trimBefore={it.audio.from} durationInFrames={it.audio.frames} />
            )}
          </Sequence>
        );
      })}
      {items.flatMap((it) => {
        const s = it.screen;
        const delay = Math.round((s.sfxDelay ?? 0) * FPS);
        return s.sfx.map((n) => {
          const k = resolveSfx(n);
          return k ? (
            <Sequence key={`${it.index}-${n}`} from={it.from + delay} durationInFrames={Math.round(3 * FPS)} name={`音效 ${n}`}>
              <Sound src={SFX[k]} />
            </Sequence>
          ) : null;
        });
      })}
      {/* 水印铺到片尾卡前：片尾卡单独居中署名，这时不再重复右下角；两者都按处理稿开关渲染 */}
      {brand.watermark && (
        <Sequence from={0} durationInFrames={outroFrom} name="水印">
          <Watermark />
        </Sequence>
      )}
      {brand.outro && (
        <Sequence from={outroFrom} durationInFrames={OUTRO_FRAMES} name="片尾">
          <Outro />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
