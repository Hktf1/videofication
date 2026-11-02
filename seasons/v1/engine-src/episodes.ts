// 自动发现 episodes/ 下的所有篇目（_ 开头的文件夹除外），无需手动注册。
// 文件夹名「01-精神内耗」→ Composition id「ep01」。
import { parseScript, type Script } from "./script/parse";
import type { TemplateDef } from "./templates/types";

declare const require: {
  context(dir: string, deep: boolean, re: RegExp): { keys(): string[]; (k: string): any };
};

const scripts = require.context("../../episodes", true, /^\.\/[^_][^/]*\/script\.md$/);
const sceneMods = require.context("../../episodes", true, /^\.\/[^_][^/]*\/scenes\.tsx$/);
const sceneKeys = new Set(sceneMods.keys());

export type EpisodeEntry = { id: string; dir: string; script: Script; scenes: Record<string, TemplateDef> };

export const EPISODES: EpisodeEntry[] = scripts.keys().map((k) => {
  const dir = k.split("/")[1];
  const mod = scripts(k);
  const src: string = typeof mod === "string" ? mod : mod.default;
  const sk = `./${dir}/scenes.tsx`;
  const scenes = sceneKeys.has(sk) ? (sceneMods(sk).scenes ?? {}) : {};
  const no = dir.match(/^(\d+)/)?.[1] ?? dir;
  return { id: `ep${no}`, dir, script: parseScript(src), scenes };
});

export const findEpisode = (dir: string) => EPISODES.find((e) => e.dir === dir);
