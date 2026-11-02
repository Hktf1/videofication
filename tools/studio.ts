import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { articleOf, chapterName as nameOf, DRAWERS, EP_DIR, ROOT, die, drawerOf, findArticle, listArticles, listChapters, listEpisodes, resolveEpisode, resolveVersion, versionOf } from "./lib";

// 预览：npm run studio            优先「制作中」里的文章，兼容待制作旧目录；否则看最近改过的一篇
//       npm run studio -- 12      只预览 12 号文章（待发/已发 里的也能指定）
//       npm run studio -- 12-1    只预览 12-1 这一章
//       npm run studio -- 待发     整个抽屉
//       npm run studio -- all     全部章节
// 范围通过 VIDEOFICATION_STUDIO 传给引擎，由 engine/src/episodes.ts 过滤（换范围要重启 studio）
// 第一个参数是范围；以 - 开头的参数（如 --port 3111）原样转给 remotion studio

type Scope = { articles: string[]; chapters?: string[] };

const argv = process.argv.slice(2);
const arg = argv[0] && !argv[0].startsWith("-") ? argv[0] : undefined;
const extra = arg ? argv.slice(1) : argv;

const articles = listArticles();
const withChapters = (arts: string[]) => arts.filter((a) => listChapters(a).length);
// 文章最近一次改动的时间（各章 script.md 里最新的那个）
const touchedAt = (article: string) =>
  Math.max(
    0,
    ...listChapters(article).map((c) => {
      try {
        return fs.statSync(path.join(EP_DIR, article, c, "script.md")).mtimeMs;
      } catch {
        return 0;
      }
    }),
  );

let scope: Scope | null = null;
if (!arg) {
  const active = withChapters(articles.filter((a) => drawerOf(a) === "制作中"));
  const wip = active.length ? active : withChapters(articles.filter((a) => drawerOf(a) === "待制作"));
  if (wip.length) {
    scope = { articles: wip };
  } else {
    // 没有在做的文章时（做完的都堆在 待发/ 已发/ 了），只看最近改过的那篇
    const latest = articles.map((a) => ({ a, t: touchedAt(a) })).sort((x, y) => y.t - x.t)[0];
    if (latest?.t) scope = { articles: [latest.a] };
  }
} else if (arg === "all" || arg === "全部") {
  scope = null;
} else if ((DRAWERS as readonly string[]).includes(arg)) {
  const arts = withChapters(articles.filter((a) => drawerOf(a) === arg));
  if (!arts.length) die(`${arg}/ 里还没有做完稿的章节`);
  scope = { articles: arts };
} else {
  // 16-1 在当前版本里找；16-1@中文-极简动效v1 指定版本；16@版本 预览该版本的所有章节
  const [rawArg, at] = arg.split("@");
  const episodes = listEpisodes();
  // rawArg 本身就是文章（16）时不能按章节模糊匹配，否则 16-1 会把整篇当成一章
  const articleHit = findArticle(rawArg);
  const chapter = articleHit ? undefined : resolveEpisode(arg);
  const article = articleHit ?? (chapter ? articleOf(chapter) : undefined);
  if (!article) die(`找不到文章或章节「${arg}」。现有文章：${articles.join("、") || "（无）"}`);
  if (chapter) {
    scope = { articles: [article], chapters: [chapter] };
  } else if (at) {
    const selectedVersion = resolveVersion(article, at);
    const chs = episodes.filter((d) => articleOf(d) === article && versionOf(d) === selectedVersion);
    if (!chs.length) die(`「${article}」下没有版本「${at}」的章节。现有：${listChapters(article).join("、")}`);
    scope = { articles: [article], chapters: chs };
  } else {
    scope = { articles: [article] };
  }
}

const inScope = (d: string) =>
  !scope || (scope.articles.includes(articleOf(d)) && (!scope.chapters || scope.chapters.includes(d)));
const shown = listEpisodes().filter(inScope);
if (!shown.length) die("选中的范围里还没有章节，换个范围或先建章节");

if (scope) {
  console.log(`只预览：${shown.join("、")}`);
  console.log("要看全部章节：npm run studio -- all");
} else {
  console.log(`预览全部 ${shown.length} 章`);
}

const cli = path.join(ROOT, "node_modules/@remotion/cli/remotion-cli.js");
const child = spawn(process.execPath, [cli, "studio", ...extra], {
  cwd: ROOT,
  stdio: "inherit",
  env: { ...process.env, VIDEOFICATION_STUDIO: JSON.stringify(scope) },
});
child.on("exit", (code) => process.exit(code ?? 0));
