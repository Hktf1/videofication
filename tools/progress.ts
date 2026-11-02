// 进度看板：npm run progress -- 12 [--watch]
//       npm run progress          整库总览（每篇的成片进度）
// 只读：看 朗读稿 / 演出稿 / 配音 / 字幕 / 成片 和 .tmp 里的锁文件，不改任何东西。
// --watch 每 2 秒刷新一次，渲染或全自动跑着的时候可以挂在旁边看。
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chapterNumber } from "./concat";
import { articleName, articleNo, articleStyle, currentVersion, drawerOf, epPath, findArticle, findFilm, listArticles, listChapters, listInboxDocx, listVersions, loadScript, readStatus, ROOT, versionOf, versionStyle, WIP } from "./lib";
import { episodeStyle } from "../engine/src/script/parse";

const argv = process.argv.slice(2);
const watch = argv.includes("--watch");
const q = argv.find((a) => !a.startsWith("--"));

/** 终端里的显示宽度：中日韩字符算两格 */
const width = (s: string) => [...s].reduce((n, ch) => n + (/[ᄀ-ᅟ⺀-꓏ꥠ-꥿가-힣豈-﫿︐-︙︰-﹯＀-｠￠-￦]/.test(ch) ? 2 : 1), 0);
const pad = (s: string, n: number) => s + " ".repeat(Math.max(0, n - width(s)));
const mmss = (sec: number) => {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const has = (file: string) => fs.existsSync(file) && fs.statSync(file).size > 0;
const mtime = (file: string) => (fs.existsSync(file) ? fs.statSync(file).mtimeMs : 0);

/** 媒体时长（秒）；ffprobe 不可用时返回 null，不影响看板 */
function duration(file: string): number | null {
  if (!has(file)) return null;
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
    const n = Number(out.trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

type Lock = { kind: string; pid: number; started: number } | null;

/** render.ts 正在写的帧进度（.tmp/progress.json）；超过 20 秒没更新就当它已经结束 */
type FrameProgress = {
  label: string;
  composition: string;
  frames: number;
  total: number;
  percent: number;
  etaMs: number | null;
  startedAt: number;
  updatedAt: number;
  done: boolean;
};

function frameProgress(): FrameProgress | null {
  try {
    const p = JSON.parse(fs.readFileSync(path.join(ROOT, ".tmp", "progress.json"), "utf8")) as FrameProgress;
    if (p.done || !(p.total > 0) || Date.now() - p.updatedAt > 20000) return null;
    return p;
  } catch {
    return null;
  }
}

/** .tmp/auto.lock、render.lock 里记着 PID 和启动时间；进程还活着才算数 */
function runningLock(): Lock {
  for (const kind of ["auto", "render"]) {
    const file = path.join(ROOT, ".tmp", `${kind}.lock`);
    if (!fs.existsSync(file)) continue;
    const [pidLine, timeLine] = fs.readFileSync(file, "utf8").split(/\r?\n/);
    const pid = Number(pidLine);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    try {
      process.kill(pid, 0);
    } catch {
      continue;
    }
    const started = timeLine ? new Date(timeLine).getTime() : NaN;
    return { kind, pid, started: Number.isFinite(started) ? started : Date.now() };
  }
  return null;
}

type ChapterState = {
  name: string;
  rel: string;
  narr: boolean;
  perf: boolean;
  voice: boolean;
  subs: boolean;
  film: string | null;
  filmMs: number;
  filmSec: number | null;
  voiceSec: number | null;
  pct: number;
  stage: string;
  updated: number;
};

/** 按版本分组再按章号排序：路径可能是 中文-极简动效v1/16-1-章，章号看最后一段 */
const orderByChapter = <T extends string>(article: string, paths: T[]): T[] => {
  const order = [...listVersions(article), ""];
  const no = (p: string) => chapterNumber(p.split("/").pop()!);
  return [...paths].sort(
    (a, b) => order.indexOf(versionOf(a)) - order.indexOf(versionOf(b)) || no(a) - no(b) || a.localeCompare(b, "zh"),
  );
};

const bar = (pct: number, cells = 12) => {
  const n = Math.round((pct / 100) * cells);
  return "█".repeat(n) + "░".repeat(cells - n);
};

const tick = (on: boolean) => (on ? "✓" : "·");

/** 整篇风格：统一时 v1/v4，各章不一致「混合」，没有章节留空 */
const styleLabel = (article: string) => {
  const s = articleStyle(article);
  return s === "mixed" ? "混合" : s === "?" ? "" : s;
};
const chapterStyleLabel = (rel: string) => {
  try {
    return episodeStyle(loadScript(rel).meta);
  } catch {
    return "?";
  }
};

function chapterState(article: string, path: string): ChapterState {
  const rel = `${article}/${path}`;
  // 章节文件夹名（带版本时 path 形如 中文-极简动效v1/16-1-章）
  const name = path.split("/").pop()!;
  const mp3 = epPath(rel, "字幕", "配音.mp3");
  const srt = epPath(rel, "字幕", "校正.srt");
  // 同一章可能因换风格留下多支成片（如 -v4.mp4），进度只看最新的那一支
  const outMp4 = findFilm(epPath(rel, "out"), name) ?? epPath(rel, "out", `${name}.mp4`);
  const narr = has(epPath(rel, "朗读稿.txt"));
  const perf = has(epPath(rel, "朗读稿.演出.txt"));
  const voice = has(mp3);
  const subs = has(srt) && has(epPath(rel, "字幕", "逐字.json"));
  const film = has(outMp4) ? outMp4 : null;
  // 稿 25 + 配音 25 + 字幕 10 + 成片 40：成片之前按里程碑累加，渲染中停在 60
  const pct = (narr && perf ? 25 : 0) + (voice ? 25 : 0) + (subs ? 10 : 0) + (film ? 40 : 0);
  const status = fs.existsSync(epPath(rel, "status.md")) ? readStatus(rel) : {};
  return {
    name,
    rel,
    narr: narr && perf,
    perf,
    voice,
    subs,
    film,
    filmMs: mtime(outMp4),
    filmSec: film ? duration(outMp4) : null,
    voiceSec: voice ? duration(mp3) : null,
    pct,
    stage: status["阶段"] ?? "",
    updated: Math.max(mtime(outMp4), mtime(mp3), mtime(epPath(rel, "script.md"))),
  };
}

function renderArticle(article: string) {
  const chapters = orderByChapter(article, listChapters(article)).map((n) => chapterState(article, n));
  const status = fs.existsSync(epPath(article, "status.md")) ? readStatus(article) : {};
  const lock = runningLock();
  const done = chapters.filter((c) => c.film);
  const mean = chapters.length ? Math.round(chapters.reduce((s, c) => s + c.pct, 0) / chapters.length) : 0;
  const merged = !!findFilm(epPath(article, "out"), articleName(article));
  const totalFilm = done.reduce((s, c) => s + (c.filmSec ?? 0), 0);
  const pending = chapters.find((c) => !c.film);
  const style = chapters.length ? styleLabel(article) : "";
  const versions = listVersions(article);
  const current = currentVersion(article);
  const vlabel = versions.length ? `${versions.length} 个版本${current ? `　当前 ${current}` : ""}` : style;

  console.log(`示例账号 · 进度　${article}${status["阶段"] ? `　${status["阶段"]}` : ""}　${chapters.length} 章${vlabel ? `　${vlabel}` : ""}`);
  if (!chapters.length) {
    console.log("  还没有章节文件夹");
    return;
  }
  // 混合风格时逐章标出，看得出哪几章还没转
  if (style === "混合")
    console.log(`  风格：${chapters.map((c) => `${c.name.match(/^\d+-\d+/)?.[0] ?? c.name} ${chapterStyleLabel(c.rel)}`).join("、")}`);
  const head =
    `  ${pad("章节", 26)}${pad("稿", 4)}${pad("配音", 6)}${pad("字幕", 6)}${pad("成片", 6)}` +
    `${pad("成片时长", 10)}${pad("进度", 17)}更新`;
  console.log(head);
  let lastVersion: string | undefined;
  for (const c of chapters) {
    const v = versionOf(c.rel);
    if (versions.length && v !== lastVersion) {
      // 多版本时按版本分组，同一章的 v1/v4 各占一段
      const name = v ? `${v}（${versionStyle(article, v)}）${v === current ? "　当前版本" : ""}` : "旧布局（没有版本层）";
      console.log(`  ${name}`);
      lastVersion = v;
    }
    const now = lock && pending?.name === c.name ? "　← 进行中" : "";
    const label = c.name.replace(/^(\d+-\d+)-/, "$1 ");
    console.log(
      `  ${pad(label, 26)}${pad(c.narr ? "✓" : "·", 4)}${pad(tick(c.voice), 6)}${pad(tick(c.subs), 6)}${pad(tick(!!c.film), 6)}` +
        `${pad(c.filmSec ? mmss(c.filmSec) : "—", 10)}${bar(c.pct)} ${String(c.pct).padStart(3)}%　${c.updated ? hhmm(c.updated) : "—"}${now}`,
    );
  }
  console.log(
    `\n  整篇　${bar(mean)} ${String(mean).padStart(3)}%　${done.length}/${chapters.length} 章成片` +
      `　成片合计 ${totalFilm ? mmss(totalFilm) : "—"}${merged ? "　全片已合并" : "　全片未合并"}`,
  );
  if (lock) {
    const mins = Math.floor((Date.now() - lock.started) / 60000);
    const secs = Math.floor(((Date.now() - lock.started) % 60000) / 1000);
    const fp = frameProgress();
    if (fp) {
      const eta = fp.etaMs && fp.etaMs > 1000 ? `　预计还剩 ${mmss(fp.etaMs / 1000)}` : "";
      console.log(`  已渲：${fp.label}　${bar(fp.percent)} ${fp.frames}/${fp.total} 帧 · ${fp.percent}%${eta}`);
    }
    console.log(`  运行中：${lock.kind === "auto" ? "全自动" : "渲染"}（PID ${lock.pid}，启动于 ${hhmm(lock.started)}，已 ${mins} 分 ${String(secs).padStart(2, "0")} 秒）`);
  }
}

function renderOverview() {
  const inbox = listInboxDocx();
  const articles = listArticles();
  const lock = runningLock();
  console.log(`示例账号 · 进度　${articles.length} 篇${inbox.length ? `　${WIP}/ 还有 ${inbox.length} 个未开工 docx` : ""}`);
  for (const a of articles) {
    const chapters = orderByChapter(a, listChapters(a)).map((n) => chapterState(a, n));
    if (!chapters.length) {
      console.log(`  ${pad(a, 34)} 还没有章节`);
      continue;
    }
    const done = chapters.filter((c) => c.film);
    const mean = Math.round(chapters.reduce((s, c) => s + c.pct, 0) / chapters.length);
    const merged = !!findFilm(epPath(a, "out"), articleName(a));
    const drawer = drawerOf(a) || "根";
    const style = styleLabel(a) || "—";
    console.log(
      `  ${pad(a, 34)} ${pad(drawer, 5)} ${pad(style, 5)} ${String(done.length).padStart(2)}/${String(chapters.length).padEnd(2)} 章　` +
        `${bar(mean)} ${String(mean).padStart(3)}%${merged ? "　已合并" : ""}`,
    );
  }
  if (lock) {
    const fp = frameProgress();
    if (fp) {
      const eta = fp.etaMs && fp.etaMs > 1000 ? `　预计还剩 ${mmss(fp.etaMs / 1000)}` : "";
      console.log(`\n  已渲：${fp.label}　${bar(fp.percent)} ${fp.frames}/${fp.total} 帧 · ${fp.percent}%${eta}`);
    }
    console.log(`\n  运行中：${lock.kind === "auto" ? "全自动" : "渲染"}（PID ${lock.pid}，启动于 ${hhmm(lock.started)}）`);
  }
}

function draw() {
  if (q) {
    const article = findArticle(q);
    if (!article) {
      console.error(`找不到文章「${q}」`);
      process.exit(1);
    }
    renderArticle(article);
  } else {
    renderOverview();
  }
}

if (watch) {
  const tickDraw = () => {
    process.stdout.write("\x1b[2J\x1b[H");
    draw();
    console.log(`\n  每 2 秒刷新 · ${hhmm(Date.now())}（Ctrl+C 退出）`);
  };
  tickDraw();
  setInterval(tickDraw, 2000);
} else {
  draw();
}
