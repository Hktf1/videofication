// 提取原文：npm run extract -- 01   → episodes/01-文章/source.txt
// 文章文件夹里的 docx 文件名随意；有多个时取最新修改的那个
import fs from "node:fs";
import mammoth from "mammoth";
import { articleNo, die, epPath, resolveArticle, setStatus } from "./lib";

const dir = resolveArticle(process.argv[2]);
const docxs = fs.readdirSync(epPath(dir))
  .filter((f) => f.toLowerCase().endsWith(".docx") && !f.startsWith("~$"))
  .map((f) => ({ f, mtime: fs.statSync(epPath(dir, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

if (!docxs.length) die(`episodes/${dir}/ 里没有 .docx 原文`);
const docx = docxs[0].f;
if (docxs.length > 1) console.log(`发现 ${docxs.length} 个 docx，使用最新的：${docx}`);

mammoth.extractRawText({ path: epPath(dir, docx) }).then(({ value }) => {
  const text = value.replace(/\n{3,}/g, "\n\n").trim();
  fs.writeFileSync(epPath(dir, "source.txt"), text + "\n");
  setStatus(dir, "阶段", "待分章");
  const chars = text.replace(/\s/g, "").length;
  console.log(`已提取 ${docx} → source.txt（${chars} 字）`);
  console.log(`下一步由 Claude 读 source.txt 分章，写 分章原文.txt，再跑 npm run chapters -- ${articleNo(dir) ?? "01"}`);
});
