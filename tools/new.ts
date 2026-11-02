// 新建一篇：npm run new -- 精神内耗 [极简动效v1]
//   → episodes/制作中/01-精神内耗/，自动编号并默认建 中文-极简动效v1。
// 待制作根目录里有 docx 时，把最新的那个移进新文章文件夹（原地不留副本）；
// 之后跑 npm run extract -- 01 提取原文。做完整篇再 npm run move -- 01 待发
import fs from "node:fs";
import path from "node:path";
import { articleNo, createVersion, die, EP_DIR, listArticles, listInboxDocx, parseArgs, PRODUCTION, WIP } from "./lib";
import { validateArticleName } from "./article-name";

const { positional, values } = parseArgs(process.argv.slice(2));
const name = positional[0]?.trim();
const versionName = positional[1] ?? values["--version"] ?? "中文-极简动效v1";
if (!name) die("用法：npm run new -- 标题 [版本名，如 极简动效v1]");
try { validateArticleName(name); } catch (error) { die((error as Error).message); }

const nums = listArticles().map((d) => parseInt(articleNo(d) ?? "", 10)).filter(Number.isFinite);
const no = String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, "0");
const folder = `${no}-${name}`;
const dest = path.join(EP_DIR, PRODUCTION, folder);
if (fs.existsSync(dest)) die(`episodes/${PRODUCTION}/${folder}/ 已存在`);
// 不用 fs.cpSync：它在 Windows 下会把中文目录名写成乱码
fs.mkdirSync(dest, { recursive: true });
for (const f of fs.readdirSync(path.join(EP_DIR, "_template")))
  fs.copyFileSync(path.join(EP_DIR, "_template", f), path.join(dest, f));

// 待制作里还没开工的 docx：取最新的那个移进来，其余留在收件箱
const docxs = listInboxDocx()
  .map((f) => ({ f, mtime: fs.statSync(path.join(EP_DIR, WIP, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);
let docx: string | undefined;
if (docxs.length) {
  docx = docxs[0].f;
  fs.renameSync(path.join(EP_DIR, WIP, docx), path.join(dest, docx));
  if (docxs.length > 1)
    console.log(`待制作里还有 ${docxs.length - 1} 个 docx 没动：${docxs.slice(1).map((d) => d.f).join("、")}`);
}

const article = `${PRODUCTION}/${folder}`;
createVersion(article, versionName);
console.log(`已创建 episodes/${article}/`);
if (docx) console.log(`原文已移入：${docx}。下一步 npm run extract -- ${no}`);
else console.log("把原文 docx 放进这个文件夹（文件名随意），然后让 Claude 做这篇");
