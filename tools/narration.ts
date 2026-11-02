// 备用：从 script.md 反推朗读稿 → episodes/01-文章/01-1-章名/朗读稿.txt（会覆盖！）
// 正常流程是直接按原文手写朗读稿（见 CLAUDE.md），这个工具只在需要和字幕逐屏对齐时用。
// 一屏一行；章节之间空一行（章节名不念）。
import fs from "node:fs";
import { epPath, loadScript, parseArgs, resolveEpisode, die } from "./lib";
import path from "node:path";

const { positional, values } = parseArgs(process.argv.slice(2));
const dir = resolveEpisode(positional[0], values["--version"]);
const inputFile = path.join(path.dirname(epPath(dir)), "制作输入.json");
if (fs.existsSync(inputFile) && JSON.parse(fs.readFileSync(inputFile, "utf8")).mode === "user-script")
  die("本版本使用用户脚本，禁止反推覆盖朗读稿；修改输入脚本后重新导入。");
const script = loadScript(dir);
const out: string[] = [];
let last: string | null = null;
for (const s of script.screens) {
  if (s.section !== last) {
    if (last !== null) out.push("");
    last = s.section;
  }
  out.push(s.spoken);
}
fs.writeFileSync(epPath(dir, "朗读稿.txt"), out.join("\n") + "\n");
const chars = script.screens.reduce((a, s) => a + s.spoken.length, 0);
console.log(`朗读稿：episodes/${dir}/朗读稿.txt（${script.screens.length} 句，约 ${chars} 字）`);
