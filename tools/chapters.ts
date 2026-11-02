// 按分章原文建章节文件夹：npm run chapters -- 01 [--version 中文-极简动效v1]
// 读 文章/版本/分章原文.txt（版本里没有就用文章级的），建 01-1-章名/
// 并把该章原文预填进 朗读稿.txt（之后由 Claude 按口播调标点）
import fs from "node:fs";
import path from "node:path";
import { articleNo as noOf, die, epPath, parseArgs, resolveArticle, resolveVersion, setStatus, versionStyle } from "./lib";

const { positional, values } = parseArgs(process.argv.slice(2));
const article = resolveArticle(positional[0]);
const articleNo = noOf(article) ?? "01";
const version = resolveVersion(article, values["--version"]);
const style = versionStyle(article, version);
const base = version ? `${article}/${version}` : article;

const srcPath = [
  version ? epPath(article, version, "分章原文.txt") : undefined,
  epPath(article, "分章原文.txt"),
].find((f): f is string => !!f && fs.existsSync(f));
if (!srcPath) die(`缺 episodes/${article}/分章原文.txt${version ? `（也可以放 episodes/${base}/分章原文.txt）` : ""}`);
const src = fs.readFileSync(srcPath, "utf8");
if (src.includes("（这一章的原文）")) die("分章原文.txt 还是模板，先把 source.txt 按章切进去");

const heading = /^##\s+(?:(\d+)-)?(\d+)(?:\s+(.+?))?\s*$/gm;
const matches = [...src.matchAll(heading)];
if (!matches.length) die("分章原文.txt 里没有找到「## 01-1 章名」这样的章节标题");

const seen = new Set<string>();
const tpl = path.resolve(import.meta.dirname, "..", "episodes", "_template-chapter");

for (let i = 0; i < matches.length; i++) {
  const m = matches[i];
  const prefix = m[1];
  const no = m[2];
  const title = (m[3] ?? `第${no}章`).trim();
  const contentStart = (m.index ?? 0) + m[0].length;
  const contentEnd = i + 1 < matches.length ? (matches[i + 1].index ?? src.length) : src.length;
  const content = src.slice(contentStart, contentEnd).replace(/<!--[\s\S]*?-->/g, "").trim();

  if (prefix && prefix !== articleNo) die(`章节标题「## ${prefix}-${no}」的文章编号和「${article}」不一致`);
  if (seen.has(no)) die(`第 ${no} 章出现了两次`);
  seen.add(no);

  const safeTitle = title.replace(/[\/:*?"<>|]/g, "").replace(/\s+/g, "-").trim() || `第${no}章`;
  const folder = `${articleNo}-${no}-${safeTitle}`;
  const rel = `${base}/${folder}`;
  const dest = epPath(rel);

  if (fs.existsSync(dest)) {
    const narr = path.join(dest, "朗读稿.txt");
    if (!fs.existsSync(narr)) {
      fs.writeFileSync(narr, content ? `${content}\n` : "");
      console.log(`已存在，补写朗读稿原文：${rel}`);
    } else {
      console.log(`已存在，跳过：${rel}`);
    }
    continue;
  }

  fs.mkdirSync(dest);
  for (const f of fs.readdirSync(tpl)) {
    let text = fs.readFileSync(path.join(tpl, f), "utf8");
    if (f === "script.md") {
      text = text
        .replace(/^标题：.*$/m, `标题：${title}`)
        .replace(/^风格：.*$/m, `风格：${style}`)
        .replace(/^原文：.*$/m, `原文：${version ? "../" : ""}../分章原文.txt`)
        .replace(/^## NN-M .*$/m, `## ${articleNo}-${no} ${title}`);
    }
    fs.writeFileSync(path.join(dest, f), text);
  }
  // 先放该章原文，Claude 再按口播调标点
  fs.writeFileSync(path.join(dest, "朗读稿.txt"), content ? `${content}\n` : "");
  setStatus(rel, "阶段", "待朗读稿");
  console.log(`已创建：${rel}${content ? "（朗读稿已预填原文）" : "（该章原文为空，请检查分章原文.txt）"}`);
}

setStatus(article, "阶段", "制作中");
console.log("下一步：逐章润色 朗读稿.txt（原文不改，只调标点）");
