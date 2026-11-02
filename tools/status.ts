// 各篇进度一览：npm run status
// 除了根目录的旧文章，也列出 待制作 / 制作中 / 待发 / 已发 四个抽屉里的文章、每篇的版本和章节，
// 以及待制作里还没开工的 docx。
import fs from "node:fs";
import { episodeStyle } from "../engine/src/script/parse";
import { articleName, articleNo, currentVersion, epPath, listArticles, listChapters, listInboxDocx, listVersionChapters, listVersions, loadScript, readStatus, readVersion, versionStyle, WIP } from "./lib";

const inbox = listInboxDocx();
if (inbox.length)
  console.log(
    `${WIP}/ 里还有 ${inbox.length} 个未开工的 docx：${inbox.join("、")}\n` +
      "  开工：npm run new -- 标题（会把最新的 docx 移进新文章文件夹）\n",
  );

const articles = listArticles();
if (!articles.length) console.log("还没有文章。新建：npm run new -- 标题");

/** 一章的状态行 */
const chapterLine = (rel: string, name: string, mark = "") => {
  if (!fs.existsSync(epPath(rel, "status.md"))) {
    console.log(`    ${name}　新章节，运行 npm run tts -- ${name.match(/^\d+-\d+/)?.[0] ?? name} 开始${mark}`);
    return;
  }
  const s = readStatus(rel);
  console.log(`    ${name}　${s["阶段"] || "?"}${s["发布日期"] ? `　发布 ${s["发布日期"]}` : ""}${s["备注"] ? `　${s["备注"]}` : ""}${mark}`);
};

const chapterStyle = (rel: string) => {
  try {
    return episodeStyle(loadScript(rel).meta);
  } catch {
    return "?";
  }
};

for (const a of articles) {
  const no = articleNo(a);
  if (!/^\d+-/.test(articleName(a))) {
    console.log(`${a}　命名不对，需以编号开头，例如 01-${articleName(a)}`);
    continue;
  }
  const versions = listVersions(a);
  const legacy = listVersionChapters(a, "");
  const hasChapters = listChapters(a).length > 0;
  // 旧布局没有版本层，风格只能逐章看；各章不一致时标出「混合」
  const legacyStyles = new Set(legacy.map((c) => chapterStyle(`${a}/${c}`)));
  const legacyStyle = !versions.length && legacyStyles.size === 1 ? `　${[...legacyStyles][0]}` : "";

  if (!fs.existsSync(epPath(a, "status.md"))) {
    console.log(`${a}　新文件夹，把原文 docx 放进去后运行 npm run extract -- ${no}`);
  } else {
    const s = readStatus(a);
    console.log(`${a}　${s["阶段"] || "?"}${legacyStyle}${s["发布日期"] ? `　发布 ${s["发布日期"]}` : ""}${s["备注"] ? `　${s["备注"]}` : ""}`);
  }

  if (!hasChapters) {
    console.log(`  （还没有章节，运行 npm run chapters -- ${no ?? a}）`);
    continue;
  }

  if (versions.length) {
    const current = currentVersion(a);
    for (const v of versions) {
      const chs = listVersionChapters(a, v);
      const styles = new Set(chs.map((c) => chapterStyle(`${a}/${v}/${c}`)));
      const label = styles.size > 1 ? "混合" : versionStyle(a, v);
      const meta = readVersion(a, v);
      const chapterLabel = meta["章节稿件"] === "独立时间轴" ? "独立时间轴" : `${chs.length} 章稿件`;
      const archived = parseInt(meta["历史成片"] ?? "0", 10) > 0 ? `　另有 ${meta["历史成片"]} 历史成片` : "";
      console.log(`  ${v}（${label}）${v === current ? "　当前版本" : ""}　${chapterLabel}${archived}${meta["状态"] ? `　${meta["状态"]}` : ""}`);
      for (const c of chs) chapterLine(`${a}/${v}/${c}`, c);
    }
  }
  // 旧布局：章节直接挂在文章下，没有版本层
  for (const c of legacy) chapterLine(`${a}/${c}`, c, legacyStyles.size > 1 ? `　${chapterStyle(`${a}/${c}`)}` : "");
}
