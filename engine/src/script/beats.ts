// 画面.tsx ↔ script.md 的节拍对账。
// 章节自带画面时，节拍名写错不会报错：ctx.p/at/cueOf 找不到那一拍就返回 0 / Infinity，
// 画面停在起点，成片照样出。所以导出前反过来核对：组件引用到的每一拍，标记列里必须有。
export type BeatRef = { section: string; step: string };

/** 组件里引用节拍的字面量写法：ctx.at / ctx.p / ctx.cueOf("节", "步")，第三个参数（时长）不参与 */
const BEAT_CALL = /ctx\.(?:at|p|cueOf)\(\s*["'`]([^"'`\n]+)["'`]\s*,\s*["'`]([^"'`\n]+)["'`]/g;

export const beatRefs = (source: string): BeatRef[] =>
  [...source.matchAll(BEAT_CALL)].map((m) => ({ section: m[1]!, step: m[2]! }));

/**
 * 标记列必须覆盖组件的每一次节拍引用。
 * 反方向（标记写了、组件没引用）不报错：像 06-1 的「恐惧/读数」由 ctx.word 驱动，属于正常写法。
 */
export function checkSceneBeats(markers: BeatRef[], source: string): string[] {
  const has = new Set(markers.map((m) => `${m.section}/${m.step}`));
  const missing = new Map<string, BeatRef>();
  for (const r of beatRefs(source)) {
    const key = `${r.section}/${r.step}`;
    if (!has.has(key)) missing.set(key, r);
  }
  return [...missing.values()].map(
    (r) =>
      `画面.tsx 引用了节拍「${r.section}/${r.step}」，script.md 里没有 画面:${r.section}/${r.step}（节名或步名对不上时画面会停在起点）`,
  );
}
