import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { episodeStyle, parseScript } from "../engine/src/script/parse";
import { episodeId } from "../engine/src/episodeId";
import { manifestStyle, scriptStyle, LEGACY_TEXT_STYLE } from "../engine/src/script/style";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const EP_DIR = path.join(ROOT, "episodes");

/** 章节文件夹名：NN-M-章名 */
const CHAPTER_DIR = /^\d+-\d+(?:-|$)/;
/** 文章文件夹名：NN-标题 */
const ARTICLE_DIR = /^\d+-/;
/** 版本文件夹的标记文件：`npm run version` 建的版本目录里都有一份 版本.md */
export const VERSION_MARKER = "版本.md";

/**
 * 文章的四个抽屉。文章路径一律是相对 episodes/ 的路径，例如
 * 「01-幻想」（留在根目录的旧文章）、「待制作/09-标题」「待发/05-改变」「已发/03-思维」。
 * 待制作放还没开工的 docx，制作中放开工文章；兼容待制作里的旧文章目录。
 */
export const DRAWERS = ["待制作", "制作中", "待发", "已发"] as const;
export type Drawer = (typeof DRAWERS)[number];
export const WIP = "待制作";
export const PRODUCTION = "制作中";

export const articleName = (dir: string) => dir.split("/").pop()!;
/** 文章编号（01、09 …）；没有编号时 undefined */
export const articleNo = (dir: string) => articleName(dir).match(/^(\d+)/)?.[1];
/** 文章所在抽屉；留在根目录的返回空串 */
export const drawerOf = (dir: string) =>
  (DRAWERS as readonly string[]).includes(dir.split("/")[0]) ? dir.split("/")[0] : "";

const articlesIn = (folder: string, prefix = "") => {
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder, { withFileTypes: true })
    .filter((d) => d.isDirectory() && ARTICLE_DIR.test(d.name) && !CHAPTER_DIR.test(d.name))
    .map((d) => prefix + d.name);
};

/** 所有文章文件夹（根目录 + 待制作/制作中/待发/已发），按编号排序 */
export const listArticles = () =>
  [
    ...articlesIn(EP_DIR),
    ...DRAWERS.flatMap((d) => articlesIn(path.join(EP_DIR, d), `${d}/`)),
  ].sort((a, b) => (articleNo(a) ?? "").localeCompare(articleNo(b) ?? "") || a.localeCompare(b, "zh"));

/** 待制作里还没开工的 docx（不在任何文章文件夹里） */
export const listInboxDocx = () => {
  const inbox = path.join(EP_DIR, WIP);
  if (!fs.existsSync(inbox)) return [];
  return fs.readdirSync(inbox)
    .filter((f) => f.toLowerCase().endsWith(".docx") && !f.startsWith("~$"))
    .sort();
};

/** 目录里直接放的章节文件夹名 */
const chapterDirsIn = (folder: string): string[] => {
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith(".") && CHAPTER_DIR.test(d.name))
    .map((d) => d.name)
    .sort();
};

/** 文章下的版本目录（带 版本.md 的文件夹），如 中文-极简动效v1、英文-极简动效v1 */
export const listVersions = (article: string): string[] => {
  const base = path.join(EP_DIR, article);
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith(".") && d.name !== "out" && !CHAPTER_DIR.test(d.name))
    .map((d) => d.name)
    .filter((name) => fs.existsSync(path.join(base, name, VERSION_MARKER)))
    .sort((a, b) => a.localeCompare(b, "zh"));
};

/** 某个版本下的章节文件夹名；version 为空串表示旧布局（章节直接挂在文章下） */
export const listVersionChapters = (article: string, version: string): string[] =>
  chapterDirsIn(version ? path.join(EP_DIR, article, version) : path.join(EP_DIR, article));

/**
 * 某篇文章的章节（相对文章文件夹的路径）。新布局带版本前缀：
 * 中文-极简动效v1/01-1-现象；旧布局没有版本层，直接是 01-1-现象。
 * 版本按名字排在前，旧布局的章节排最后。
 */
export const listChapters = (article: string): string[] => [
  ...listVersions(article).flatMap((v) => listVersionChapters(article, v).map((c) => `${v}/${c}`)),
  ...listVersionChapters(article, ""),
];

/** 章节路径所属版本：16-标题/中文-v1/16-1-章 → 中文-v1；旧布局返回空串 */
export const versionOf = (dir: string): string => {
  const parts = dir.split("/");
  parts.pop();
  const parent = parts.pop() ?? "";
  return parent && !ARTICLE_DIR.test(parent) ? parent : "";
};

/** 章节路径所属文章：待发/16-标题/中文-v1/16-1-章 → 待发/16-标题 */
export const articleOf = (dir: string): string => {
  const parts = dir.split("/");
  parts.pop();
  const parent = parts.pop() ?? "";
  return parent && !ARTICLE_DIR.test(parent) ? parts.join("/") : [...parts, parent].join("/");
};

/** 路径最后一段（章节或文章文件夹名） */
export const chapterName = (dir: string) => dir.split("/").pop()!;

/** 所有章节（相对 episodes/ 的路径：01-收藏/01-1-现象） */
export const listEpisodes = () =>
  listArticles().flatMap((a) => listChapters(a).map((c) => `${a}/${c}`));

/** 按编号、标题或路径找文章 */
export function findArticle(q: string): string | undefined {
  const all = listArticles();
  const want = q.replace(/\\/g, "/").replace(/\/$/, "");
  return all.find((d) => d === want)
    ?? all.find((d) => articleName(d) === want)
    ?? (/^\d+$/.test(want) ? all.find((d) => articleNo(d) === want.padStart(2, "0")) : undefined)
    ?? all.find((d) => articleName(d).includes(want));
}

export function resolveArticle(q: string | undefined): string {
  if (!q) die("请指定文章，例如：01 或 收藏");
  const hit = findArticle(q);
  if (!hit) die(`找不到文章「${q}」。现有：${listArticles().join("、") || "（无）"}`);
  ensureArticle(hit);
  return hit;
}

/**
 * 按编号、标题或相对路径找章节。
 * `q` 里可以用 @版本 指定版本（如 16-1@中文-极简动效v1）；多版本重名时优先当前版本。
 */
export function resolveEpisode(q: string | undefined, versionHint?: string): string {
  if (!q) die("请指定章节，例如：01-1 或 01-1-收藏-现象");
  const [raw, at] = q.split("@");
  const hint = at ?? versionHint;
  const want = raw.replace(/\\/g, "/").replace(/\/$/, "");
  const all = listEpisodes();
  const base = want.split("/").pop()!;
  // 完整路径显式指定版本；简写只能在选定版本内找，不能缺章时落到其他版本。
  const exact = all.find(d => d === want);
  if (want.includes('/') && !exact) die(`找不到章节路径「${want}」，请核对完整路径`);
  const pool = all.filter(d => exact ? d === exact : chapterName(d).includes(base)).filter(d => exact ? d === exact && (!hint || versionOf(d) === resolveVersion(articleOf(d), hint))
    : versionOf(d) === resolveVersion(articleOf(d), hint));
  const current = (d: string) => versionOf(d) === currentVersion(articleOf(d));
  const hit =
    pool.find((d) => d === want) ??
    pool.filter((d) => d.split("/").pop() === base).find(current) ??
    pool.filter((d) => d.split("/").pop() === base)[0] ??
    pool.filter((d) => d.split("/").pop()!.startsWith(base + "-")).find(current) ??
    pool.filter((d) => d.split("/").pop()!.startsWith(base + "-"))[0] ??
    pool.filter((d) => d.split("/").pop()!.includes(base)).find(current) ??
    pool.filter((d) => d.split("/").pop()!.includes(base))[0];
  if (hit) {
    ensureChapter(hit);
    return hit;
  }

  // 也可以直接给文章名：只有一章时就用它，多章时列出来
  const art = findArticle(raw);
  if (art) {
    const v = resolveVersion(art, hint);
    const chs = listVersionChapters(art, v).map(c => v ? `${v}/${c}` : c);
    if (chs.length === 1) {
      const one = `${art}/${chs[0]}`;
      ensureChapter(one);
      return one;
    }
    const versions = listVersions(art);
    die(
      `「${art}」有 ${chs.length} 章${versions.length ? `（版本：${versions.join("、")}）` : ""}，请指定章节：` +
        chs.map((c) => c.match(/\d+-\d+/)?.[0] ?? c).join("、"),
    );
  }
  die(`找不到章节「${q}」。现有：${all.join("、") || "（无）"}`);
}

/**
 * 给命令用的目标解析：文章 → 它当前版本的章节；章节 → 它自己。
 * 用 `--version 中文-极简动效v1` 或在 q 里写 16@版本 可以指定版本。
 */
export function resolveChapters(q: string | undefined, chapterNo?: number | null, versionHint?: string): string[] {
  if (!q) die("请指定文章或章节，例如：01 或 01-1");
  const [raw, at] = q.split("@");
  const hint = at ?? versionHint;
  const art = findArticle(raw);
  if (art) {
    const versions = listVersions(art);
    if (!versions.length) {
      // 旧布局：章节直接挂在文章下
      return pickChapters(art, listVersionChapters(art, "").map((c) => `${art}/${c}`), chapterNo, raw);
    }
    const version = resolveVersion(art, hint);
    const chs = listVersionChapters(art, version).map((c) => `${art}/${version}/${c}`);
    if (!chs.length)
      die(
        `「${art}」的版本「${version}」下还没有章节文件夹，先写好 分章原文.txt 再跑 ` +
          `npm run chapters -- ${articleNo(art) ?? raw} --version ${version}`,
      );
    return pickChapters(art, chs, chapterNo, raw);
  }
  return [resolveEpisode(q, hint)];
}

function pickChapters(article: string, chs: string[], chapterNo: number | null | undefined, q: string): string[] {
  if (chapterNo === undefined || chapterNo === null) {
    chs.forEach(ensureChapter);
    return chs;
  }
  const want = `${articleNo(article) ?? "01"}-${chapterNo}`;
  const hit = chs.find((d) => {
    const name = d.split("/").pop()!;
    return name === want || name.startsWith(want + "-");
  });
  if (!hit) die(`「${article}」下找不到第 ${chapterNo} 章（应为 ${want}-章名，见 ${q}）`);
  ensureChapter(hit);
  return [hit];
}

/** 文章里的版本名 → 完整目录名；hint 可以写全名、片段或风格代码（v1/v4） */
export function resolveVersion(article: string, hint?: string): string {
  const versions = listVersions(article);
  if (!versions.length) {
    if (hint) die(`「${article}」没有版本「${hint}」，请核对版本名`);
    return "";
  }
  if (!hint) return currentVersion(article);
  const current = currentVersion(article);
  const code = hint === "v4" ? "v1" : hint;
  const byCode = versions.filter((v) => versionStyle(article, v) === code);
  const candidates = byCode.length ? byCode : versions.filter(v => v.includes(hint));
  const hit = versions.find(v => v === hint) ?? (candidates.includes(current) ? current : candidates.length === 1 ? candidates[0] : undefined);
  if (!hit && candidates.length > 1) die(`版本「${hint}」不唯一，请指定完整版本名：${candidates.join("、")}`);
  if (!hit) die(`「${article}」下没有版本「${hint}」。现有：${versions.join("、")}`);
  return hit;
}

/**
 * 当前版本：status.md 的「当前版本」优先；只有一个版本就用它；
 * 有多个时取最近改过的那一个（章节 script.md / 朗读稿的最新时间）。
 */
export function currentVersion(article: string): string {
  const versions = listVersions(article);
  if (!versions.length) return "";
  const want = readStatus(article)["当前版本"];
  if (want && versions.includes(want)) return want;
  if (versions.length === 1) return versions[0]!;
  const touched = (v: string) => {
    let t = 0;
    for (const c of listVersionChapters(article, v)) {
      for (const f of ["script.md", "朗读稿.txt", "朗读稿.演出.txt"]) {
        try {
          t = Math.max(t, fs.statSync(epPath(article, `${v}/${c}`, f)).mtimeMs);
        } catch {}
      }
    }
    return t;
  };
  return versions.map((v) => ({ v, t: touched(v) })).sort((a, b) => b.t - a.t)[0]!.v;
}

/** 手动建的文章文件夹：检查命名，并补齐缺少的模板文件（已有的不覆盖） */
export function ensureArticle(dir: string) {
  const name = articleName(dir);
  if (!ARTICLE_DIR.test(name)) die(`文件夹「${dir}」需以编号开头，例如 01-${name}`);
  const tpl = path.join(EP_DIR, "_template");
  const added: string[] = [];
  for (const f of fs.readdirSync(tpl)) {
    const dest = epPath(dir, f);
    if (fs.existsSync(dest)) continue;
    fs.copyFileSync(path.join(tpl, f), dest);
    added.push(f);
  }
  if (added.length) console.log(`已为 ${dir} 补齐：${added.join("、")}`);
}

/** 手动建的章节文件夹：检查命名，并补齐缺少的模板文件（已有的不覆盖） */
export function ensureChapter(dir: string) {
  const name = dir.split("/").pop()!;
  if (!dir.includes("/")) die(`章节「${dir}」应放在文章文件夹下，例如 01-收藏/${dir}`);
  if (!CHAPTER_DIR.test(name)) die(`章节文件夹「${dir}」需命名为 NN-M-章名，例如 01-1-现象`);
  const tpl = path.join(EP_DIR, "_template-chapter");
  const added: string[] = [];
  for (const f of fs.readdirSync(tpl)) {
    const dest = epPath(dir, f);
    if (fs.existsSync(dest)) continue;
    let text = fs.readFileSync(path.join(tpl, f), "utf8");
    if (f === "script.md") text = text.replace(/^标题：.*$/m, `标题：${name.replace(/^\d+-\d+-?/, "")}`);
    fs.writeFileSync(dest, text);
    added.push(f);
  }
  if (added.length) console.log(`已为 ${dir} 补齐：${added.join("、")}`);
}

/** 兼容旧调用：按路径判断是文章还是章节 */
export function ensureEpisode(dir: string) {
  if (dir.includes("/")) ensureChapter(dir);
  else ensureArticle(dir);
}

export const epPath = (dir: string, ...p: string[]) => path.join(EP_DIR, dir, ...p);

/**
 * 成片按风格并存：同一章用新风格重做时，不覆盖旧风格的成片，而是给新成片加风格后缀
 * （06-1-标题.mp4 与 06-1-标题-v4.mp4 并存）。风格记在成片的 .manifest.json 里。
 */
export const outputStyle = (file: string): string | null => {
  try {
    const m = JSON.parse(fs.readFileSync(file + ".manifest.json", "utf8"));
    if (typeof m?.style === "string" || m?.styleId) return manifestStyle(m);
    // 全片 manifest 没有 style 字段，从各章 sources 推；混风格记 mixed
    if (Array.isArray(m?.sources)) {
      const set = new Set<string>(m.sources.map((s: any) => manifestStyle(s ?? {})).filter((s: any) => typeof s === "string"));
      if (set.size === 1) return [...set][0]!;
      if (set.size > 1) return "mixed";
    }
    return null;
  } catch {
    return null;
  }
};

/** out/ 目录下属于这个名称的成片（base.mp4 或 base-*.mp4） */
const filmsIn = (dir: string, base: string): string[] =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".mp4") && (f === `${base}.mp4` || f.startsWith(`${base}-`)))
        .map((f) => path.join(dir, f))
    : [];

/** 写新成片的位置：同名称下已有别的风格的成片时加风格后缀，避免覆盖 */
export const outputFor = (dir: string, base: string, style: string): string => {
  const conflict = filmsIn(dir, base).some((f) => {
    const s = outputStyle(f);
    return s !== style;
  });
  if (!conflict) return path.join(dir, `${base}.mp4`);
  let candidate = path.join(dir, `${base}-${style}.mp4`);
  let n = 2;
  while (fs.existsSync(candidate) && outputStyle(candidate) !== style)
    candidate = path.join(dir, `${base}-${style}-${n++}.mp4`);
  return candidate;
};

/** 找这一章（或这一篇）当前该用的成片：优先当前风格，其次没有风格记录的旧文件 */
export const outputOf = (dir: string, base: string, style: string): string | undefined => {
  const list = filmsIn(dir, base);
  const suffix = path.join(dir, `${base}-${style}.mp4`);
  if (list.includes(suffix) && outputStyle(suffix) === style) return suffix;
  const same = list.find((f) => outputStyle(f) === style);
  if (same) return same;
  // 未知风格的旧成片不能当作动效成片复用，否则可能合入纯文字视频。
  return style === "v1" ? undefined : list.find((f) => outputStyle(f) === null);
};

/** 目录里最新的成片（进度展示用，不判断风格） */
export const findFilm = (dir: string, base: string): string | undefined =>
  filmsIn(dir, base).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];

/** 一条 key：value 文本（status.md、版本.md 共用） */
export function readKV(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(file)) return out;
  for (const l of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = l.match(/^([^<：:]+)[：:]\s*(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

/** 版本目录里的 版本.md；旧布局（version 为空）没有 */
export const readVersion = (article: string, version: string): Record<string, string> =>
  version ? readKV(epPath(article, version, VERSION_MARKER)) : {};

/** 版本对应的风格代码：纯文字素材为 legacy-text，正式动效为 v1。 */
export const versionStyle = (article: string, version: string): string => {
  if (!version) return "v1";
  const meta = readVersion(article, version);
  if (/纯文字/.test(version)) return LEGACY_TEXT_STYLE;
  if (meta["风格"]) return scriptStyle(meta);
  return styleFromName(version);
};

/** 版本策略：写在版本名里的风格对应的代码 */
export const styleFromName = (version: string): string => {
  if (/纯文字/.test(version)) return LEGACY_TEXT_STYLE;
  if (/极简/.test(version)) return "v1";
  return "v1";
};

/** 版本名里的语言：英文… 视为 en，其余中文 */
export const languageOfVersion = (version: string): string => (/^(英文|English|EN)/.test(version) ? "英文" : "中文");

/**
 * 当前版本统一的风格；各章不一致时记 mixed。
 * 旧布局（没有版本层）看直接挂着的章节。
 */
export const articleStyle = (article: string, version = currentVersion(article)): string => {
  const names = listVersionChapters(article, version);
  const set = new Set(
    names.map((name) => {
      try {
        return episodeStyle(loadScript(`${article}/${version ? `${version}/` : ""}${name}`).meta);
      } catch {
        return "?";
      }
    }),
  );
  if (set.size === 1) return [...set][0]!;
  if (!set.size) return versionStyle(article, version);
  return "mixed";
};

/** 整片成片的文件名主干：带版本时加版本后缀，如 16-标题-中文-极简动效v1 */
export const filmBase = (article: string, version: string): string =>
  version ? `${articleName(article)}-${version}` : articleName(article);

/** 章节对应的 Remotion composition id（和 engine/src/episodes.ts 用同一个规则） */
export const compositionId = (dir: string, chapter?: string | number): string => {
  const id = episodeId(chapterName(dir), versionOf(dir));
  return chapter ? `${id}-c${chapter}` : id;
};


/** 整目录搬移；同一磁盘直接改名，跨磁盘退回复制后删除（cpSync 在 Windows 下会写乱中文目录名） */
export function moveDir(from: string, to: string) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  try {
    fs.renameSync(from, to);
    return;
  } catch (err: any) {
    if (err?.code !== "EXDEV") throw err;
  }
  const walk = (src: string, dst: string) => {
    fs.mkdirSync(dst, { recursive: true });
    for (const d of fs.readdirSync(src, { withFileTypes: true })) {
      const s = path.join(src, d.name), t = path.join(dst, d.name);
      if (d.isDirectory()) walk(s, t);
      else fs.copyFileSync(s, t);
    }
  };
  walk(from, to);
  fs.rmSync(from, { recursive: true, force: true });
}

/**
 * 把整篇文章文件夹搬进另一个抽屉（"" 表示 episodes/ 根目录），文件夹名和编号都不变。
 * 返回搬完后相对 episodes/ 的路径；已经在目标位置时原样返回。
 * 目标已存在时抛错，由调用方决定是中止还是只提示。
 */
export function moveArticle(dir: string, target: "" | Drawer): string {
  const name = articleName(dir);
  const dest = target ? `${target}/${name}` : name;
  if (dest === dir) return dir;
  const destAbs = path.join(EP_DIR, dest);
  if (fs.existsSync(destAbs)) throw new Error(`目标已存在：episodes/${dest}/`);
  moveDir(path.join(EP_DIR, dir), destAbs);
  return dest;
}

export const loadScript = (dir: string) =>
  parseScript(fs.readFileSync(epPath(dir, "script.md"), "utf8"));

export const readStatus = (dir: string): Record<string, string> => readKV(epPath(dir, "status.md"));

export function setStatus(dir: string, key: string, value: string) {
  const f = epPath(dir, "status.md");
  const src = fs.readFileSync(f, "utf8");
  const re = new RegExp(`^${key}[：:].*$`, "m");
  fs.writeFileSync(f, re.test(src) ? src.replace(re, `${key}：${value}`) : `${src.trimEnd()}\n${key}：${value}\n`);
}

/** 版本名规范化：没写语言前缀时补「中文-」；英文版写「英文-」 */
export function normalizeVersionName(raw: string): string {
  const s = raw.trim().replace(/\s+/g, "").replace(/极简动效v4/g, "极简动效v1");
  if (!s) die("版本名不能为空，例如：中文-极简动效v1");
  if (/[\\/:*?"<>|@]/.test(s)) die("版本名里不能有 \\ / : * ? \" < > | @");
  if (/^\d+-/.test(s)) die(`版本名「${s}」不能以编号开头（会被当成文章文件夹）`);
  const lang = /^(英文|English)/.test(s) ? "英文" : "中文";
  if (s.includes("-")) return s;
  return `${lang}-${s.replace(/^(英文|English)/, "")}`;
}

/** 新建版本文件夹（套 _template-version），并设为文章当前版本；已存在就只切换当前版本 */
export function createVersion(article: string, raw: string): string {
  const name = normalizeVersionName(raw);
  if (/纯文字/.test(name)) die("纯文字风格已删除，请使用「极简动效v1」；历史稿件和音频可复制到新版本复用。");
  ensureArticle(article);
  if (listVersions(article).includes(name)) {
    setStatus(article, "当前版本", name);
    console.log(`版本已存在：episodes/${article}/${name}/（已设为当前版本）`);
    return name;
  }
  const dest = path.join(EP_DIR, article, name);
  fs.mkdirSync(dest, { recursive: true });
  const style = styleFromName(name);
  const styleName = style === "v1" ? "极简动效" : style;
  for (const f of fs.readdirSync(path.join(EP_DIR, "_template-version"))) {
    let text = fs.readFileSync(path.join(EP_DIR, "_template-version", f), "utf8");
    if (f === VERSION_MARKER)
      text = text
        .replace(/^语言：.*$/m, `语言：${languageOfVersion(name)}`)
        .replace(/^风格：.*$/m, `风格：${style}`)
        .replace(/^风格名称：.*$/m, `风格名称：${styleName}`);
    fs.writeFileSync(path.join(dest, f), text);
  }
  setStatus(article, "当前版本", name);
  console.log(`已建版本：episodes/${article}/${name}/（风格 ${style}，已设为当前版本）`);
  return name;
}

/** 命令参数：位置参数、开关（--dry）、带值选项（--version X / --version=X） */
export function parseArgs(argv: string[], valued: readonly string[] = ["--version", "--chapter", "--from", "--script"]) {
  const positional: string[] = [];
  const flags = new Set<string>();
  const values: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith("--")) {
      positional.push(a);
      continue;
    }
    const eq = a.indexOf("=");
    const key = eq >= 0 ? a.slice(0, eq) : a;
    if (valued.includes(key)) values[key] = eq >= 0 ? a.slice(eq + 1) : (argv[++i] ?? "");
    else flags.add(a);
  }
  return { positional, flags, values };
}

export function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

/**
 * 流水线互斥锁：两条 auto（或两次 render）同时跑会各开一个 Chrome、共用 .tmp 里的
 * puppeteer 配置目录，互相踩到页面被关掉，然后无限期挂住。启动时先占锁，退出时释放。
 */
export function acquireLock(name: string): void {
  const file = path.join(ROOT, ".tmp", `${name}.lock`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) {
    const [pidText, started] = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
    const pid = Number(pidText);
    if (pid && pid !== process.pid && isAlive(pid)) {
      die(
        `已经有一条「${name}」在跑（PID ${pid}，${started || "时间未知"}）。等它结束，` +
          `或确认它已经卡死后结束该进程再重跑（锁文件：.tmp/${name}.lock）`,
      );
    }
  }
  fs.writeFileSync(file, `${process.pid}\n${new Date().toLocaleString("zh-CN", { hour12: false })}\n`);
  process.on("exit", () => {
    try {
      if (fs.readFileSync(file, "utf8").startsWith(String(process.pid))) fs.unlinkSync(file);
    } catch {}
  });
  for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => process.exit(1));
}

function isAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** 结束整棵进程树：Windows 上只杀 node 会把 Remotion 的 Chrome 留成孤儿 */
export function killTree(pid: number): void {
  try {
    if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(-pid, "SIGKILL");
  } catch {}
}
