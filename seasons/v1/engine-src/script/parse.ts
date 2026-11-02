// 处理稿 script.md 解析器：引擎和 tools 共用，不依赖 Node API。
//
// 格式：
//   ---            头部（键：值）
//   标题：精神内耗
//   ---
//   ## 钩子          章节标题；「钩子」「转折」「结尾」是特殊章节，其余按顺序编号
//   文字 | 画面 | 音效 | 秒数(可选)
//
// 画面列：模板名 [色调] [参数...]，色调用中文语义名（能量/消耗/理性/解决/回忆）
// 文字里用【】包住要强调的词，强调色取本屏色调。

export type Tone = "energy" | "drain" | "reason" | "solve" | "muted";

export const TONE_NAMES: Record<string, Tone> = {
  能量: "energy",
  消耗: "drain",
  理性: "reason",
  解决: "solve",
  回忆: "muted",
};

export type SectionKind = "hook" | "chapter" | "turn" | "ending";

export type Screen = {
  line: number; // 在 script.md 中的行号，check 报错用
  text: string;
  template: string;
  tone?: Tone;
  args: string[];
  sfx: string[];
  seconds?: number;
  section: string;
  sectionKind: SectionKind;
  chapterNo: number; // 0 表示不属于编号章节
};

export type Script = {
  meta: Record<string, string>;
  screens: Screen[];
  errors: { line: number; msg: string }[];
};

const SPECIAL: Record<string, SectionKind> = { 钩子: "hook", 转折: "turn", 结尾: "ending" };

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
    // 跳过 <!-- --> 注释（可跨行）和 > 引用行
    if (inComment || raw.startsWith("<!--")) {
      inComment = !raw.includes("-->");
      continue;
    }
    if (!raw || raw.startsWith(">")) continue;

    const h = raw.match(/^##\s+(.+)$/);
    if (h) {
      section = h[1].trim();
      sectionKind = SPECIAL[section] ?? "chapter";
      if (sectionKind === "chapter") chapterNo++;
      continue;
    }

    const cols = raw.split("|").map((c) => c.trim());
    if (cols.length < 2) {
      errors.push({ line: i + 1, msg: "缺少「画面」列" });
      continue;
    }
    const [text, scene, sfxCol = "", secCol = ""] = cols;
    const parts = scene.split(/\s+/).filter(Boolean);
    const template = parts.shift() ?? "";
    let tone: Tone | undefined;
    if (parts[0] && TONE_NAMES[parts[0]]) tone = TONE_NAMES[parts.shift()!];
    const seconds = secCol ? Number(secCol.replace(/s$/, "")) : undefined;
    if (secCol && !Number.isFinite(seconds)) errors.push({ line: i + 1, msg: `秒数无效：${secCol}` });

    screens.push({
      line: i + 1,
      text,
      template,
      tone,
      args: parts,
      sfx: sfxCol.split(/[\s,，]+/).filter(Boolean),
      seconds,
      section,
      sectionKind,
      chapterNo: sectionKind === "chapter" ? chapterNo : 0,
    });
  }
  return { meta, screens, errors };
}

/** 去掉强调标记后的纯文字 */
export const plainText = (t: string) => t.replace(/[【】]/g, "");

/** 可见字数（不算标点和空格），用于 ≤20 字规则和时长估算 */
export const charCount = (t: string) =>
  plainText(t).replace(/[\s\p{P}]/gu, "").length;

export const FPS = 30;

/** 每屏时长：未指定秒数时按字数估算（读速约 4.5 字/秒，最短 2 秒） */
export function screenFrames(s: Screen): number {
  const sec = s.seconds ?? Math.max(2, 1 + charCount(s.text) * 0.22);
  return Math.round(sec * FPS);
}
