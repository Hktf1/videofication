// 搬文章：npm run move -- 01 待发   → episodes/待发/01-标题/
//         npm run move -- 01 已发   → episodes/已发/01-标题/（阶段改「已发布」，发布日期空着就补今天）
//         npm run move -- 01 制作中 → 搬入制作中的文章目录
//         npm run move -- 01 待制作 → 搬回未开工区
//         npm run move -- 01 根     → 搬回 episodes/ 根目录
// 整篇文章文件夹一起搬（稿件、字幕、成片全跟着走），编号和文件夹名都不变。
import fs from "node:fs";
import path from "node:path";
import { articleName, die, DRAWERS, type Drawer, EP_DIR, findArticle, moveArticle, readStatus, setStatus } from "./lib";

const [q, to] = process.argv.slice(2);
if (!q || !to) die("用法：npm run move -- 01 待发（目标：待制作 / 制作中 / 待发 / 已发 / 根；待发布 = 待发）");

const target: "" | Drawer = ["根", "根目录"].includes(to) ? "" : to === "待发布" ? "待发" : (to as Drawer);
if (target && !(DRAWERS as readonly string[]).includes(target))
  die(`不认识的目标「${to}」，只能是：${DRAWERS.join(" / ")} / 根`);

const article = findArticle(q);
if (!article) die(`找不到文章「${q}」。现有：${fs.existsSync(EP_DIR) ? "见 npm run status" : "（无）"}`);
if (to === "已发" && !fs.existsSync(path.join(EP_DIR, article, "out")))
  console.warn("提示：这篇还没有 out/ 成片目录，确认真的要标成「已发」吗？");

const name = articleName(article);
if ((target ? `${target}/${name}` : name) === article) {
  console.log(`已经在 episodes/${article}/ 了，不用搬`);
  process.exit(0);
}

let dest: string;
try {
  dest = moveArticle(article, target);
} catch (err) {
  die((err as Error).message);
}

// 已发：记一笔发布状态（发布日期已有就不覆盖）；从已发搬回待发时把阶段退回「已整合」
if (fs.existsSync(path.join(EP_DIR, dest, "status.md"))) {
  if (target === "已发") {
    setStatus(dest, "阶段", "已发布");
    if (!readStatus(dest)["发布日期"]) setStatus(dest, "发布日期", new Date().toLocaleDateString("sv-SE"));
  } else if (readStatus(dest)["阶段"] === "已发布") {
    setStatus(dest, "阶段", "已整合");
  }
}

console.log(`已搬走：episodes/${article}/ → episodes/${dest}/`);
if (target === "待发") console.log("下一步：发布后用 npm run move -- " + (name.match(/^(\d+)/)?.[1] ?? name) + " 已发 归档");
