// Claude Code hook（SessionStart / UserPromptSubmit）：
// 找出已开工、但还有章节缺 朗读稿.txt 的篇目，提醒 Claude 立即生成朗读稿。
// 只看制作区：episodes/制作中/ 的文章，兼容根目录和待制作里的旧文章（NN-标题）。
// 待制作/ 下直接放的 docx 是还没开工的收件箱，不算文章；待发/已发 里的篇目已经做完，不提醒。
import fs from "node:fs";
import path from "node:path";

const root = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "episodes");
const ARTICLE = /^\d+-/;
const CHAPTER = /^\d+-\d+-/;

const pending = [];
for (const base of [root, path.join(root, "制作中"), path.join(root, "待制作")]) {
  if (!fs.existsSync(base)) continue;
  for (const d of fs.readdirSync(base)) {
    if (!ARTICLE.test(d) || CHAPTER.test(d)) continue;
    const dir = path.join(base, d);
    if (!fs.statSync(dir).isDirectory()) continue;

    const label = base === root ? d : `${path.basename(base)}/${d}`;
    const no = d.match(/^(\d+)/)?.[1] ?? d;
    const files = fs.readdirSync(dir);
    if (!files.some((f) => f.toLowerCase().endsWith(".docx"))) continue;

    const chapters = files.filter((f) => CHAPTER.test(f) && fs.statSync(path.join(dir, f)).isDirectory());
    if (!chapters.length) {
      if (!files.includes("source.txt")) pending.push(`${label}（缺 source.txt，先 npm run extract -- ${no}）`);
      else if (!files.includes("分章原文.txt")) pending.push(`${label}（缺 分章原文.txt，先按章切分原文）`);
      else pending.push(`${label}（还没建章节，先 npm run chapters -- ${no}）`);
      continue;
    }

    const missing = chapters.filter((c) => !fs.existsSync(path.join(dir, c, "朗读稿.txt")));
    if (missing.length) pending.push(`${label}：${missing.join("、")}`);
  }
}
if (pending.length) {
  console.log(
    `[待生成朗读稿] ${pending.join("；")}。` +
      `请先立即生成朗读稿，按 CLAUDE.md 第 3 步只改标点、核对去标点后与 source.txt 一致，再处理用户的请求。`
  );
}
