// 自动发现 episodes/ 下的所有章节（_ 开头的文件夹除外），无需手动注册。
// 结构：episodes/01-文章/01-1-章名/script.md
// 文件夹名「01-1-收藏-现象」→ Composition id「ep011收藏现象」。
// 有配音（字幕/配音.mp3 + 字幕/逐字.json + 朗读稿.txt）时，字幕时刻跟配音走。
import { parseScript, type Script } from "./script/parse";
import { alignVoice, mapScreens, type VoiceMap, type Word } from "./script/sync";
import type { SceneProps } from "./script/scene";
import { episodeId } from "./episodeId";
import type { ComponentType } from "react";
import sample from "./sample.md";
import { ArticleScene } from "./kit/ArticleScene";

declare const require: {
  context(dir: string, deep: boolean, re: RegExp): { keys(): string[]; (k: string): any };
};

// 同时兼容「文章/章节」两级、旧的一级目录，以及 待制作/制作中/待发/已发 抽屉下的三级路径
const scripts = require.context("../../episodes", true, /^\.\/[^_][^/]*\/(?:[^_][^/]*\/){0,3}script\.md$/);
const narrations = require.context("../../episodes", true, /^\.\/[^_][^/]*\/(?:[^_][^/]*\/){0,3}朗读稿\.txt$/);
const wordFiles = require.context("../../episodes", true, /^\.\/[^_][^/]*\/(?:[^_][^/]*\/){0,3}字幕\/逐字\.json$/);
const audios = require.context("../../episodes", true, /^\.\/[^_][^/]*\/(?:[^_][^/]*\/){0,3}字幕\/(配音|配音-章\d+)\.(mp3|wav|m4a)$/);
// V1 的章节自定义画面：章节文件夹里的 画面.tsx，导出一个 Scene 组件（或 default）
const sceneFiles = require.context("../../episodes", true, /^\.\/[^_][^/]*\/(?:[^_][^/]*\/){0,3}画面\.tsx$/);

export type EpisodeEntry = {
  id: string;
  dir: string; // 相对 episodes/ 的路径，如 01-收藏/01-1-现象、待发/15-标题/中文-极简动效v1/15-1-章
  name: string; // 章节文件夹名，如 01-1-现象
  article?: string; // 所属文章文件夹，如 01-收藏、待发/15-标题
  version?: string; // 版本文件夹名，如 中文-极简动效v1；旧布局没有版本层
  script: Script;
  voice?: VoiceMap;
  audio?: string;
  Scene?: ComponentType<SceneProps>; // 该章自己的画面（没有时用通用图元）
};

const text = (m: any): string => (typeof m === "string" ? m : m.default);
const dirOf = (k: string, file: string) => k.slice(2, -(file.length + 1));
const find = (ctx: ReturnType<typeof require.context>, dir: string, file: string) =>
  ctx.keys().find((k) => k === `./${dir}/${file}`);
// 优先找 配音.mp3（全篇），没有时找任意单章配音（预览用）
const findAudio = (ctx: ReturnType<typeof require.context>, dir: string) => {
  const keys = ctx.keys().filter((k) => k.startsWith(`./${dir}/字幕/`));
  return keys.find((k) => k.includes("/配音.")) ?? keys[0];
};

// 文章根目录可放用户提供的 script.md；只有编号章节里的脚本才注册为成片。
export const EPISODES: EpisodeEntry[] = scripts.keys().filter(k => /^\d+-\d+(?:-|$)/.test(k.split("/").at(-2) ?? "")).map((k) => {
  const dir = dirOf(k, "script.md");
  const parts = dir.split("/");
  const name = parts.pop()!;
  // 父目录不是「NN-文章」时就是版本层（中文-极简动效v1）；旧布局章节直接挂在文章下
  const parent = parts.pop() ?? "";
  const version = parent && !/^\d+-/.test(parent) ? parent : "";
  // 所属文章文件夹：01-收藏；抽屉里的形如 待发/09-标题
  const article = (version ? parts.join("/") : [...parts, parent].join("/")) || undefined;
  const script = parseScript(text(scripts(k)));
  // 生成唯一 ID：章节文件夹名 + 版本（多版本同名章节靠版本区分），只保留数字和中文
  const id = episodeId(name, version);
  const n = find(narrations, dir, "朗读稿.txt");
  const w = find(wordFiles, dir, "字幕/逐字.json");
  const a = findAudio(audios, dir);
  const sc = find(sceneFiles, dir, "画面.tsx");
  const sceneModule = sc ? sceneFiles(sc) : undefined;
  const Scene = (sceneModule?.Scene ?? sceneModule?.default) as ComponentType<SceneProps> | undefined;
  let voice: VoiceMap | undefined;
  if (n && w && a) {
    const words: Word[] = wordFiles(w);
    voice = mapScreens(script, alignVoice(text(narrations(n)), (words as any).default ?? words));
  }
  return { id, dir, name, article, version, script, voice, audio: voice && a ? text(audios(a)) : undefined, Scene };
}).sort((a, b) => a.dir.localeCompare(b.dir, "zh"));

// 风格样片：不属于任何一篇，改风格时用来出联络表对比
export const SAMPLE: EpisodeEntry = { id: "sample", dir: "样片", name: "样片", script: parseScript(sample), Scene: ArticleScene };

/**
 * studio 的预览范围。npm run studio 会把要看的文章/章节写进 VIDEOFICATION_STUDIO
 * （remotion.config.ts 用 DefinePlugin 注进包里），避免做过的片子把列表塞满。
 * 不设或设为 null 时预览全部；渲染时不设，始终用 EPISODES 全量。
 */
type StudioScope = { articles: string[]; chapters?: string[] };

const studioScope = (): StudioScope | null => {
  const raw = process.env.VIDEOFICATION_STUDIO;
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as StudioScope | null;
    return s?.articles?.length ? s : null;
  } catch {
    return null;
  }
};

export const STUDIO_EPISODES: EpisodeEntry[] = (() => {
  const scope = studioScope();
  if (!scope) return EPISODES;
  // chapters 里放的是完整章节路径（可能有多个版本同名章节，光比文件夹名分不开）
  return EPISODES.filter(
    (e) => scope.articles.includes(e.article ?? "") && (!scope.chapters || scope.chapters.includes(e.dir)),
  );
})();

export const findEpisode = (dir: string) =>
  dir === SAMPLE.dir
    ? SAMPLE
    : EPISODES.find((e) => e.dir === dir || e.name === dir || e.dir.endsWith(`/${dir}`));
