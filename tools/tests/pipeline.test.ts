import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { splitByLength } from "../split-text";
import { preflight } from "../preflight";
import { EP_DIR, moveArticle, findArticle, drawerOf } from "../lib";

test("长段落、换行和代理对切分后保持原文且不超长", () => {
  const text = "长段落😀".repeat(180) + "。\r\n\r\n下一段。";
  const chunks = splitByLength(text, 300);
  assert.equal(chunks.join(""), text);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(c => [...c].length <= 300));
  assert.deepEqual(splitByLength("", 300), []);
  assert.throws(() => splitByLength("正文", 0));
});

test("导出检查拒绝模板、缺失配音、过期及损坏的时间戳", () => {
  const dir = fs.mkdtempSync(path.join(EP_DIR, "_preflight-test-"));
  const name = path.basename(dir);
  try {
    fs.writeFileSync(path.join(dir, "script.md"), "## NN-M 章名\n这里写该章正文，一屏一行");
    assert.ok(preflight(name).some(e => e.includes("模板")));
    assert.ok(preflight(name).some(e => e.includes("配音")));
    fs.writeFileSync(path.join(dir, "script.md"), "---\n风格：v1\n---\n## 测试\n你好世界 | 画面:标题/入场");
    fs.writeFileSync(path.join(dir, "朗读稿.txt"), "你好世界");
    fs.writeFileSync(path.join(dir, "朗读稿.演出.txt"), "你好世界");
    fs.mkdirSync(path.join(dir, "字幕"));
    const audio = path.join(dir, "字幕/配音.mp3"), words = path.join(dir, "字幕/逐字.json");
    fs.writeFileSync(audio, "fixture");
    fs.writeFileSync(words, JSON.stringify([{ w: "你好世界", s: 0, e: 2 }]));
    fs.utimesSync(audio, 100, 100); fs.utimesSync(words, 200, 200);
    assert.deepEqual(preflight(name), []);
    fs.utimesSync(audio, 300, 300);
    assert.ok(preflight(name).some(e => e.includes("早于")));
    fs.writeFileSync(words, JSON.stringify([{ w: "你好", s: 3, e: 1 }]));
    assert.ok(preflight(name).some(e => e.includes("格式无效")));
  } finally { fs.rmSync(dir, { recursive: true }); }
});

test("整篇文章在抽屉之间搬移，文件夹名和编号不变", () => {
  const name = `99-搬移测试-${process.pid}`;
  const src = path.join(EP_DIR, "待制作", name);
  const dest = path.join(EP_DIR, "待发", name);
  const production = path.join(EP_DIR, "制作中", name);
  fs.mkdirSync(path.join(src, "99-1-章名"), { recursive: true });
  fs.writeFileSync(path.join(src, "source.txt"), "正文");
  try {
    assert.equal(moveArticle(`待制作/${name}`, "制作中"), `制作中/${name}`);
    assert.equal(findArticle(name), `制作中/${name}`);
    assert.equal(drawerOf(`制作中/${name}`), "制作中");
    assert.ok(fs.existsSync(path.join(production, "source.txt")));
    assert.equal(moveArticle(`制作中/${name}`, "待发"), `待发/${name}`);
    assert.ok(fs.existsSync(path.join(dest, "99-1-章名")));
    assert.ok(!fs.existsSync(src));
    // 目标已存在时拒绝，不覆盖已审文件
    fs.mkdirSync(src, { recursive: true });
    assert.throws(() => moveArticle(`待制作/${name}`, "待发"), /目标已存在/);
    fs.rmdirSync(src);
    assert.equal(moveArticle(`待发/${name}`, "待制作"), `待制作/${name}`);
    assert.ok(fs.existsSync(path.join(src, "source.txt")));
    assert.ok(!fs.existsSync(dest));
  } finally {
    fs.rmSync(src, { recursive: true, force: true });
    fs.rmSync(dest, { recursive: true, force: true });
    fs.rmSync(production, { recursive: true, force: true });
  }
});
