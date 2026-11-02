// 生成联络表：npm run sheet -- 01-1   → episodes/01-文章/01-1-章名/out/sheet.png
//             npm run sheet -- 样片   → seasons/out/sample-sheet.png + sample-sizes.png（改风格时用）
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { compositionId, epPath, resolveEpisode, ROOT } from "./lib";

const still = (id: string, out: string) =>
  execSync(`npx remotion still ${id} "${out}" --log=error`, { cwd: ROOT, stdio: "inherit" });

if (process.argv[2] === "样片") {
  const dir = path.join(ROOT, "seasons", "out");
  still("sample-sheet", path.join(dir, "sample-sheet.png"));
  still("sample-sizes", path.join(dir, "sample-sizes.png"));
  console.log("样片：seasons/out/sample-sheet.png、sample-sizes.png");
} else {
  const dir = resolveEpisode(process.argv[2]);
  const id = `${compositionId(dir)}-sheet`;
  fs.mkdirSync(epPath(dir, "out"), { recursive: true });
  still(id, epPath(dir, "out", "sheet.png"));
  // 用户不用联络表审画面，不改阶段
  console.log(`联络表：episodes/${dir}/out/sheet.png`);
}
