import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { validateArticleName } from "../article-name";
import { EP_DIR, ROOT, listArticles, listInboxDocx } from "../lib";

test("新目录名中文不超过四字，按实际汉字数计数", () => {
  for (const name of ["幻想", "学用脱节", "AI-学习方法2", "English title", "𠮷野家"]) assert.doesNotThrow(() => validateArticleName(name));
  for (const name of ["为什么不学习", "AI学习方法总结", "学-习-方-法-论"]) assert.throws(() => validateArticleName(name), /最多 4 个字/);
});

test("过长名称在创建目录或移动收件箱 docx 前拒绝", () => {
  const inbox = listInboxDocx();
  const result = spawnSync(process.execPath, ["--import", "tsx", path.join(ROOT, "tools/new.ts"), "这是五个汉字"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 1); assert.match(result.stderr, /最多 4 个字/);
  assert.deepEqual(listInboxDocx(), inbox);
  assert.ok(!listArticles().some(a => a.endsWith("这是五个汉字")));
  assert.ok(!fs.readdirSync(path.join(EP_DIR, "待制作")).some(name => name.endsWith("这是五个汉字")));
});
