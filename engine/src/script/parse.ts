import { ABSTRACT_KINDS, type AbstractKind, type AbstractSpec } from "./minimal";
import { scriptStyle } from "./style";
// 处理稿 script.md 解析器：引擎和 tools 共用，不依赖 Node API。
//
// 格式（v1）：
//   ---            头部（键：值）
//   标题：精神内耗
//   ---
//   ## 两种痛苦      章节标题：只用来分章（换章时空屏停顿），不出现在画面里
//   文字 | 标记(可选)
//
// 文字：一屏一行，10～18 字，按语义断开；【】包住强调词（朗读到时变强调色）
//       行尾标点一律不显示；句中标点照常显示（不再用空隙代替）
// 行尾 >：与下一屏构成转折/对比，两屏之间多停顿
// 标记列（空格分隔，顺序随意）：
//   停留 / 停留1.0   重要观点，念完多停 0.7 秒（或指定秒数）
//   3.5s           手动指定本屏总秒数（有配音后用来对齐）
//   金句           逐字显现（跟朗读节奏，由虚到实）；每篇和主旨合计 3～5 处
//   主旨           逐字显现 + 字距收拢，念完整句转强调色并至少停 1.2 秒；每篇 1 处
//   分段           按顿号分段依次出现（含顿号的行自动分段）
// 自动动效：转折后一句由虚到实浮现；省略号逐点出现、整屏淡入淡出放慢
//   重点 翻页 …     音效，见 style/sfx.ts
//   画面:节/步      V1 极简动效的画面节拍（见 docs/风格/极简动效.md）；节名由该章的画面文件定义，
//                   只写在画面要变的那一屏，后面沿用，直到下一个「画面:」
//   道具标记（暗调样片用）：大字:尴尬 / 纸卡:标题/条目1/条目2 / 标题:正题/眉题
//   类型：大字 人群 纸卡 选项 计时 节点 警报 标题；参数用 / 分隔

export type SectionKind = "hook" | "chapter" | "ending";

/** V1 的画面节拍：这一屏推进到哪一节的哪一步。节名由该章的画面文件自己定义。 */
export type Beat = { section: string; step: string };

export type PropKind = "大字" | "人群" | "纸卡" | "选项" | "计时" | "节点" | "警报" | "标题";
export type PropSpec = { kind: PropKind; args: string[] };
const PROP_RE = /^(大字|人群|纸卡|选项|计时|节点|警报|标题)[:：](.+)$/;

export type Screen = {
  line: number; // 在 script.md 中的行号，check 报错用
  text: string; // 已去掉句末标点，保留【】
  spoken: string; // 朗读稿用：去掉【】，保留标点，句末补齐
  turn: boolean; // 行尾 >：与下一屏构成转折
  hold: number; // 念完后额外停留的秒数
  seconds?: number; // 手动指定总秒数
  sfx: string[];
  sfxDelay: number; // 音效相对本屏开头的延迟秒数（音效标记写 @秒）
  noSubtitle: boolean; // 无字幕：这一屏只保留中央画面/文字，不显示底部字幕
  fx?: "金句" | "主旨"; // 关键句动效
  abstract?: AbstractSpec; // 极简抽象风格：关键语义屏的画面动作
  scene?: Beat; // V1 极简动效：这一屏推进到哪一节的哪一步（没写的屏沿用上一个）
  prop?: PropSpec; // 画面道具（暗调风格）
  segments: boolean; // 按顿号分段出现
  afterTurn: boolean; // 前一屏是转折（行尾 >）
  section: string;
  sectionKind: SectionKind;
  chapterNo: number; // 0 表示不属于编号章节
};

export type Script = {
  meta: Record<string, string>;
  screens: Screen[];
  errors: { line: number; msg: string }[];
};

const SPECIAL: Record<string, SectionKind> = { 钩子: "hook", 结尾: "ending" };
export const HOLD_DEFAULT = 0.7;
export const HOLD_THEME = 1.2; // 主旨句最少停留

export function parseScript(src: string): Script {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const meta: Record<string, string> = {};
  const screens: Screen[] = [];
  const errors: Script["errors"] = [];
  let i = 0;

  if (lines[0]?.trim() === "---") {
    for (i = 1; i < lines.length && lines[i].trim() !== "---"; i++) {
      const m = lines[i].match(/^\s*([^：:]+)[：:]\s*(.*)$/);
      if (m) meta[m[1].trim()] = m[2].trim();
    }
    i++;
  }

  let section = "";
  let sectionKind: SectionKind = "chapter";
  let chapterNo = 0;

  let inComment = false;
  for (; i < lines.length; i++) {
    const raw = lines[i].trim();
    // 跳过 <!-- --> 注释（可跨行）
    if (inComment || raw.startsWith("<!--")) {
      inComment = !raw.includes("-->");
      continue;
    }
    if (!raw) continue;

    const h = raw.match(/^##\s+(.+)$/);
    if (h) {
      const [name] = h[1].split("|").map((c) => c.trim());
      section = name;
      sectionKind = SPECIAL[section] ?? "chapter";
      if (sectionKind === "chapter") chapterNo++;
      continue;
    }

    const [textCol, markCol = ""] = raw.split("|").map((c) => c.trim());
    let text = textCol;
    let turn = false;
    if (/[>＞]$/.test(text)) {
      turn = true;
      text = text.slice(0, -1).trim();
    }
    const plain = plainText(text);
    // 朗读稿保留行尾标点（句中断屏写逗号，配音只短停），没有就补句号；画面上行尾一律不显示标点
    const spoken = /[。！？!?…；;，,、：:]$/.test(plain) ? plain : plain + "。";
    text = text.replace(/[。；;.，,、：:—？！?!]+(?=】?$)/, "");

    let hold = 0;
    let seconds: number | undefined;
    let noSubtitle = false;
    let sfxDelay = 0;
    const sfx: string[] = [];
    let fx: Screen["fx"];
    let prop: PropSpec | undefined;
    let abstract: AbstractSpec | undefined;
    let scene: Beat | undefined;
    let segments = text.includes("、");
    for (const tok of markCol.split(/\s+/).filter(Boolean)) {
      const hm = tok.match(/^停留([\d.]+)?s?$/);
      const sm = tok.match(/^([\d.]+)s$/);
      const pm = tok.match(PROP_RE);
      if (/^画面[:：]/.test(tok)) {
        const parts = tok.slice(3).split("/").map((x) => x.trim());
        const [section, step] = parts;
        if (!section || !step || parts.length !== 2)
          errors.push({ line: i + 1, msg: "画面标记无效：写成 画面:节/步，如 画面:恐惧/路径" });
        else scene = { section, step };
      }
      else if (/^抽象[:：]/.test(tok)) {
        const [kind, stage, ...extra] = tok.slice(3).split("/");
        if (!(ABSTRACT_KINDS as readonly string[]).includes(kind) || extra.length)
          errors.push({ line: i + 1, msg: "抽象标记无效：类型须为" + ABSTRACT_KINDS.join("、") + "，可选一个阶段参数" });
        else abstract = { kind: kind as AbstractKind, stage: stage || undefined };
      }
      else if (hm) hold = hm[1] ? Number(hm[1]) : HOLD_DEFAULT;
      else if (sm) seconds = Number(sm[1]);
      else if (tok === "金句" || tok === "主旨") fx = tok;
      else if (tok === "无字幕") noSubtitle = true;
      else if (tok === "分段") segments = true;
      else if (pm) prop = { kind: pm[1] as PropKind, args: pm[2].split("/").map((a) => a.trim()).filter(Boolean) };
      else if (/^音效[:：]/.test(tok) || /^[^@\s]+@[\d.]+s?$/.test(tok)) {
        const raw = tok.replace(/^音效[:：]/, "");
        const [name, delayRaw] = raw.split("@");
        if (!name) errors.push({ line: i + 1, msg: "音效标记缺少名称" });
        else sfx.push(name);
        if (delayRaw !== undefined) {
          const v = Number(delayRaw.replace(/s$/, ""));
          if (!Number.isFinite(v) || v < 0 || v > 5) errors.push({ line: i + 1, msg: `音效延迟无效：${delayRaw}（0～5 秒）` });
          else sfxDelay = Math.max(sfxDelay, v);
        }
      }
      else sfx.push(tok);
      if ((hm && !Number.isFinite(hold)) || (sm && !Number.isFinite(seconds)))
        errors.push({ line: i + 1, msg: `数字无效：${tok}` });
    }

    if (fx === "主旨") hold = Math.max(hold, HOLD_THEME);
    if (fx) segments = false; // 逐字显现已包含分段的效果

    screens.push({
      line: i + 1,
      text,
      spoken,
      turn,
      hold,
      seconds,
      sfx,
      sfxDelay,
      noSubtitle,
      fx,
      prop,
      abstract,
      scene,
      segments,
      afterTurn: screens[screens.length - 1]?.turn ?? false,
      section,
      sectionKind,
      chapterNo: sectionKind === "chapter" ? chapterNo : 0,
    });
  }
  return { meta, screens, errors };
}

/** 章节风格，未填写时按 v1 处理 */
export const episodeStyle = scriptStyle;

// 署名开关（2026-10-27 用户要求）：水印和片尾默认都不加，只有本人明确要求时才在头部写「水印：是」「片尾：是」
const ON_VALUES = new Set(["是", "开", "有", "加", "1", "on", "true"]);
const OFF_VALUES = new Set(["", "否", "关", "无", "不", "0", "off", "false"]);
const flagValue = (v: string | undefined) => (v ?? "").trim().toLowerCase();
export const isBrandOn = (v: string | undefined) => ON_VALUES.has(flagValue(v));
export const isBrandValue = (v: string | undefined) => ON_VALUES.has(flagValue(v)) || OFF_VALUES.has(flagValue(v));

/** 本章要不要右下角水印、要不要片尾卡 */
export const brandOf = (meta: Record<string, string>) => ({
  watermark: isBrandOn(meta["水印"]),
  outro: isBrandOn(meta["片尾"]),
});

/** 去掉强调标记后的纯文字 */
export const plainText = (t: string) => t.replace(/[【】]/g, "");

/** 可见字数（不算标点和空格），用于字数规则和时长估算 */
export const charCount = (t: string) => plainText(t).replace(/[\s\p{P}]/gu, "").length;

/** 拆成普通段和强调段，供字幕渲染与强调定时 */
export const splitEmphasis = (t: string) =>
  t.split(/(【[^】]*】)/).filter(Boolean).map((p) =>
    p.startsWith("【") ? { text: p.slice(1, -1), em: true } : { text: p, em: false },
  );

export const FPS = 30;
