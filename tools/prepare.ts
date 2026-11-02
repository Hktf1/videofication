import { findArticle, parseArgs, die } from "./lib";
import { prepareArticle } from "./input";

const { positional, flags, values } = parseArgs(process.argv.slice(2));
const q = positional[0];
if (values["--script"] !== undefined && !values["--script"]) die("--script 后必须提供文件路径。");
if (!q) die("用法：npm run prepare -- NN [--script 文件.txt或script.md] [--version 版本] [--dry]");
const article = findArticle(q.split("@")[0]);
if (!article) die(`找不到文章：${q}`);
prepareArticle(article, { script: values["--script"], version: q.split("@")[1] ?? values["--version"], dry: flags.has("--dry") })
  .catch(error => die((error as Error).message));
