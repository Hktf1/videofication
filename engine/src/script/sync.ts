// 配音对齐：朗读稿 ↔ 识别出的逐字时间戳（字幕/逐字.json），得到每屏的真实起止时刻。
// 引擎（画面跟配音走）和 tools（对稿报告、check）共用，不依赖 Node API。
import { plainText, type Script } from "./parse";

export type Word = { w: string; s: number; e: number };

const isChar = (c: string) => /[\p{L}\p{N}]/u.test(c);
const chars = (t: string) => [...t].filter(isChar);

export type Aligned = {
  src: string[]; // 朗读稿去标点后的逐字
  start: number[]; // 每个字开口的秒数（没对上的按前后插值）
  end: number[];
  hit: boolean[]; // 是否在配音里找到
  missing: { at: number; text: string }[]; // 朗读稿有、配音没有（≥4 字的连续段）——要补配
  misheard: { at: number; text: string; heard: string }[]; // 同一位置字数相近、字不同：识别错，不用管
  extra: { at: number; text: string }[]; // 配音有、朗读稿没有（≥4 字）
  coverage: number;
};

const RUN = 4;

// 数字归一：TTS 把「1000」念成「一千」，ASR 写回的是汉字；两边先换成同一个写法再对齐，
// 避免把读对的数字判成缺段。只在内部使用，Aligned.src 仍是朗读稿原字。
const NUM_CH = /[0-9零〇一二两三四五六七八九十百千万亿]/;
const CN_DIGIT: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const CN_UNIT: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };

function parseNum(s: string): number | null {
  let total = 0, section = 0, num = 0, seen = false;
  for (const ch of s) {
    if (/[0-9]/.test(ch)) { num = num * 10 + Number(ch); seen = true; }
    else if (ch in CN_DIGIT) { num = CN_DIGIT[ch]; seen = true; }
    else if (ch in CN_UNIT) { section += (num || 1) * CN_UNIT[ch]; num = 0; seen = true; }
    else if (ch === "万") { total += (section + num || 1) * 1e4; section = 0; num = 0; seen = true; }
    else if (ch === "亿") { total = (total + section + num || 1) * 1e8; section = 0; num = 0; seen = true; }
    else return null;
  }
  return seen ? total + section + num : null;
}

function canonRun(run: string): string {
  const v = parseNum(run);
  if (v === null || !Number.isFinite(v) || v < 0) return run;
  if (run.includes("亿")) { const q = v / 1e8; return Number.isInteger(q) && q > 0 ? q + "亿" : String(v); }
  if (run.includes("万")) { const q = v / 1e4; return Number.isInteger(q) && q > 0 ? q + "万" : String(v); }
  return String(v);
}

type CChar = { c: string; s: number; e: number; lo: number; hi: number };

/** 把连续的数字串换成一个写法的字符序列；lo/hi 指回原序列下标，命中时可以标回整段 */
function canonSeq(list: { c: string; s?: number; e?: number }[]): CChar[] {
  const out: CChar[] = [];
  for (let i = 0; i < list.length; ) {
    if (!NUM_CH.test(list[i].c)) {
      out.push({ c: list[i].c, s: list[i].s ?? NaN, e: list[i].e ?? NaN, lo: i, hi: i });
      i++;
      continue;
    }
    let k = i;
    while (k < list.length && NUM_CH.test(list[k].c)) k++;
    const run = list.slice(i, k).map((x) => x.c).join("");
    const t = canonRun(run);
    if (t === run) {
      for (let x = 0; x < run.length; x++)
        out.push({ c: run[x], s: list[i + x].s ?? NaN, e: list[i + x].e ?? NaN, lo: i + x, hi: i + x });
    } else {
      const haveT = Number.isFinite(list[i].s) || Number.isFinite(list[i].e);
      const a = haveT ? (list[i].s ?? NaN) : NaN;
      const b = haveT ? (list[k - 1].e ?? NaN) : NaN;
      for (let x = 0; x < t.length; x++)
        out.push({ c: t[x], s: a + ((b - a) * x) / t.length, e: a + ((b - a) * (x + 1)) / t.length, lo: i, hi: k - 1 });
    }
    i = k;
  }
  return out;
}

/** 最长公共子序列对齐：朗读稿逐字 ↔ 识别逐字（一个词的时间在字间均分） */
export function alignVoice(source: string, words: Word[]): Aligned {
  const src = chars(source);
  const asr: { c: string; s: number; e: number }[] = [];
  for (const w of words) {
    const cs = chars(w.w);
    const step = (w.e - w.s) / (cs.length || 1);
    cs.forEach((c, k) => asr.push({ c, s: w.s + k * step, e: w.s + (k + 1) * step }));
  }
  const sseq = canonSeq(src.map((c) => ({ c })));
  const aseq = canonSeq(asr);
  const n = sseq.length, m = aseq.length, W = m + 1;
  const dp = new Uint32Array((n + 1) * W);
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i * W + j] = sseq[i].c.toLowerCase() === aseq[j].c.toLowerCase() ? dp[(i + 1) * W + j + 1] + 1 : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1]);

  const cmatch = new Array<number>(n).fill(-1);
  const cused = new Array<boolean>(m).fill(false);
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (sseq[i].c.toLowerCase() === aseq[j].c.toLowerCase()) { cmatch[i] = j; cused[j] = true; i++; j++; }
    else if (dp[(i + 1) * W + j] >= dp[i * W + j + 1]) i++;
    else j++;
  }

  // 命中的归一字符标回朗读稿原字；一个数字串只要对上，整段的字都算命中
  const hit = new Array<boolean>(src.length).fill(false);
  const start = new Array<number>(src.length).fill(NaN);
  const end = new Array<number>(src.length).fill(NaN);
  const match = new Array<number>(src.length).fill(-1);
  for (let i = 0; i < n; i++) {
    const j = cmatch[i];
    if (j < 0) continue;
    const sc = sseq[i], ac = aseq[j];
    for (let o = sc.lo; o <= sc.hi; o++) {
      hit[o] = true;
      match[o] = ac.lo;
      start[o] = Number.isFinite(start[o]) ? Math.min(start[o], ac.s) : ac.s;
      end[o] = Number.isFinite(end[o]) ? Math.max(end[o], ac.e) : ac.e;
    }
  }
  const used = new Array<boolean>(asr.length).fill(false);
  for (let j = 0; j < m; j++)
    if (cused[j]) for (let o = aseq[j].lo; o <= aseq[j].hi; o++) used[o] = true;

  // 没对上的字：在前一个已对上字的结尾和后一个的开头之间均分
  for (let i = 0; i < src.length; ) {
    if (hit[i]) { i++; continue; }
    let k = i;
    while (k < src.length && !hit[k]) k++;
    const a = i > 0 ? end[i - 1] : k < src.length ? start[k] : 0;
    const b = k < src.length ? start[k] : a;
    for (let x = i; x < k; x++) {
      start[x] = a + ((b - a) * (x - i)) / (k - i);
      end[x] = a + ((b - a) * (x - i + 1)) / (k - i);
    }
    i = k;
  }

  // 朗读稿里没对上的连续段，看配音同一位置夹着多少没对上的识别字：字数相近 = 识别错，明显更少 = 缺段
  const missing: Aligned["missing"] = [], misheard: Aligned["misheard"] = [];
  const claimed = new Array<boolean>(m).fill(false);
  for (let i = 0; i < src.length; ) {
    if (hit[i]) { i++; continue; }
    let k = i;
    while (k < src.length && !hit[k]) k++;
    const lo = i > 0 ? match[i - 1] + 1 : 0, hi = k < src.length ? match[k] : asr.length; // 配音里的空档 [lo, hi)
    const text = src.slice(i, k).join("");
    // 纯数字/纯字母没对上、同一位置却有识别字：是 TTS 的读法（一千 / 欧运）或识别错，不是缺段
    const spokenAs = hi > lo && (/^[0-9]+$/.test(text) || /^[A-Za-z]+$/.test(text));
    if (hi - lo >= (k - i) * 0.6) {
      for (let j = lo; j < hi; j++) claimed[j] = true;
      if (k - i >= RUN) misheard.push({ at: start[i], text, heard: asr.slice(lo, hi).map((x) => x.c).join("") });
    } else if (k - i >= RUN && !spokenAs) missing.push({ at: start[i], text });
    else if (k - i >= RUN && spokenAs) misheard.push({ at: start[i], text, heard: asr.slice(lo, hi).map((x) => x.c).join("") });
    i = k;
  }
  const extra: Aligned["extra"] = [];
  for (let j = 0; j < asr.length; ) {
    if (used[j] || claimed[j]) { j++; continue; }
    let k = j;
    while (k < asr.length && !used[k] && !claimed[k]) k++;
    if (k - j >= RUN) extra.push({ at: asr[j].s, text: asr.slice(j, k).map((x) => x.c).join("") });
    j = k;
  }
  return { src, start, end, hit, missing, misheard, extra, coverage: src.length ? hit.filter(Boolean).length / src.length : 0 };
}

/** 一屏在配音里的时刻（秒）：开口、念完、去掉【】后每个字符念到的时刻 */
export type ScreenVoice = { s: number; e: number; chars: number[] };

export type VoiceMap = {
  screens: (ScreenVoice | null)[]; // 与 script.screens 一一对应；null = 配音里没有 / 找不到
  issues: { line: number; msg: string }[];
};

/** 每屏文字按顺序在朗读稿里定位（字幕取自原文，所以能逐字找到），再取配音时刻 */
export function mapScreens(script: Script, al: Aligned): VoiceMap {
  const flat = al.src.join("");
  const issues: VoiceMap["issues"] = [];
  let cursor = 0;
  const screens = script.screens.map((sc) => {
    const glyphs = [...plainText(sc.text)];
    const key = glyphs.filter(isChar).join("");
    if (!key) return null;
    const at = flat.indexOf(key, cursor);
    if (at < 0) {
      issues.push({ line: sc.line, msg: `在朗读稿里找不到「${plainText(sc.text)}」，这屏没法对上配音` });
      return null;
    }
    const pos = [...flat.slice(0, at)].length; // 字符下标（避免代理对）
    const len = [...key].length;
    cursor = at + key.length;
    const got = al.hit.slice(pos, pos + len).filter(Boolean).length;
    if (got / len < 0.5) {
      issues.push({ line: sc.line, msg: `配音里没有「${plainText(sc.text)}」（只对上 ${got}/${len} 字）` });
      return null;
    }
    const t: number[] = [];
    let k = pos;
    for (const g of glyphs) t.push(isChar(g) ? al.start[k++] : al.end[Math.max(pos, k - 1)]);
    return { s: al.start[pos], e: al.end[pos + len - 1], chars: t };
  });
  return { screens, issues };
}
