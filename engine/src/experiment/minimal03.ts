// 03-3 的极简抽象样片范围：正反馈 vs 负反馈两段。按整屏文字定位，避免行号漂移。
import type { Item } from "../script/timeline";

export const MINIMAL03_DIR = "03-坚持/03-3-反馈接管了你的行动";
export const SAMPLE_FROM = "而过于关注这件事的反馈";
export const SAMPLE_TO = "想要的结果吗？";

export const minimalSample = (items: Item[]): Item[] => {
  const from = items.findIndex((it) => it.screen.text === SAMPLE_FROM);
  const to = items.findIndex((it) => it.screen.text === SAMPLE_TO);
  return from >= 0 && to >= from ? items.slice(from, to + 1) : [];
};
