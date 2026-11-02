// 版本管理：npm run version -- 16 "极简动效v1"   新建版本（没写语言前缀时补「中文-」）并设为当前版本
//           npm run version -- 16                列出版本和当前版本
// 一个版本 = 一种语言 + 一种风格的整套脚本，放在 文章/版本/ 下，例如 16-标题/中文-极简动效v1/
import { articleNo, createVersion, currentVersion, die, listVersionChapters, listVersions, parseArgs, resolveArticle, versionStyle } from "./lib";
import { reuseVersion } from "./reuse";

const { positional, values } = parseArgs(process.argv.slice(2));
const q = positional[0];
if (!q) die("用法：npm run version -- 16 \"极简动效v1\"（新建）或 npm run version -- 16（列出现有版本）");
const article = resolveArticle(q);
const name = positional[1];

if (!name) {
  const versions = listVersions(article);
  if (!versions.length) {
    console.log(`「${article}」还没有版本（旧布局：章节直接挂在文章下）。`);
    console.log(`新建：npm run version -- ${articleNo(article) ?? q} "极简动效v1"`);
    process.exit(0);
  }
  const current = currentVersion(article);
  console.log(`${article}　${versions.length} 个版本${current ? `，当前 ${current}` : ""}`);
  for (const v of versions) {
    const chs = listVersionChapters(article, v);
    console.log(`  ${v}（${versionStyle(article, v)}）${v === current ? "　当前版本" : ""}　${chs.length} 章`);
  }
  process.exit(0);
}

let version: string;
try { version = values["--from"] ? reuseVersion(article, name, values["--from"]) : createVersion(article, name); }
catch (error) { die((error as Error).message); }
const no = articleNo(article) ?? q;
console.log(`下一步：npm run chapters -- ${no} --version ${version}（从 分章原文.txt 建这一版的章节）`);
