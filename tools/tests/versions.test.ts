import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  articleOf,
  compositionId,
  currentVersion,
  EP_DIR,
  filmBase,
  listChapters,
  listVersionChapters,
  listVersions,
  resolveVersion,
  versionOf,
  versionStyle,
} from "../lib";
import { episodeId } from "../../engine/src/episodeId";

/** 造一篇带两个版本的文章：文章/中文-极简动效v4/99-1-章、文章/英文-极简动效v4/99-1-章 */
const makeArticle = () => {
  const article = path.join(EP_DIR, `_version-test-${process.pid}-${Math.random().toString(36).slice(2, 8)}`);
  const zh = path.join(article, "中文-极简动效v4");
  const en = path.join(article, "英文-极简动效v4");
  for (const dir of [zh, en]) fs.mkdirSync(path.join(dir, "99-1-章"), { recursive: true });
  fs.mkdirSync(path.join(article, "out"));
  fs.writeFileSync(path.join(zh, "版本.md"), "语言：中文\n风格：v4\n");
  fs.writeFileSync(path.join(en, "版本.md"), "语言：英文\n");
  fs.writeFileSync(path.join(article, "status.md"), "阶段：制作中\n");
  return article;
};

test("版本发现只认带 版本.md 的文件夹，章节按版本前缀返回", () => {
  const article = makeArticle();
  const rel = path.basename(article);
  try {
    assert.deepEqual(listVersions(rel), ["中文-极简动效v4", "英文-极简动效v4"].sort((a, b) => a.localeCompare(b, "zh")));
    assert.deepEqual(listVersionChapters(rel, "中文-极简动效v4"), ["99-1-章"]);
    assert.deepEqual(listChapters(rel), listVersions(rel).map((v) => `${v}/99-1-章`));
    // out/ 不算版本
    assert.ok(!listVersions(rel).includes("out"));
  } finally {
    fs.rmSync(article, { recursive: true, force: true });
  }
});

test("章节路径能拆回文章和版本", () => {
  assert.equal(versionOf("待发/16-标题/中文-极简动效v4/16-1-章"), "中文-极简动效v4");
  assert.equal(versionOf("待发/16-标题/16-1-章"), "");
  assert.equal(versionOf("16-标题/16-1-章"), "");
  assert.equal(articleOf("待发/16-标题/中文-极简动效v4/16-1-章"), "待发/16-标题");
  assert.equal(articleOf("16-标题/16-1-章"), "16-标题");
});

test("多版本同名章节的 composition id 不同，旧布局的 id 不变", () => {
  assert.equal(episodeId("16-1-章名"), "ep161章名");
  assert.notEqual(episodeId("16-1-章名", "中文-极简动效v4"), episodeId("16-1-章名", "英文-极简动效v4"));
  assert.equal(episodeId("16-1-章名", "中文-极简动效v4"), "ep中文极简动效v4161章名");
});

test("渲染用的 composition id 与引擎一致，带版本且支持分章", () => {
  assert.equal(compositionId("待发/16-标题/中文-极简动效v4/16-1-章名"), "ep中文极简动效v4161章名");
  assert.equal(compositionId("待发/16-标题/16-1-章名"), "ep161章名");
  assert.equal(compositionId("待发/16-标题/中文-极简动效v4/16-1-章名", 2), "ep中文极简动效v4161章名-c2");
});

test("版本风格读 版本.md，缺省时按名字推", () => {
  const article = makeArticle();
  const rel = path.basename(article);
  try {
    assert.equal(versionStyle(rel, "中文-极简动效v4"), "v1");
    assert.equal(versionStyle(rel, "英文-极简动效v4"), "v1");
    assert.equal(versionStyle(rel, resolveVersion(rel, "v4")), "v1");
    assert.equal(resolveVersion(rel, "英文"), "英文-极简动效v4");
  } finally {
    fs.rmSync(article, { recursive: true, force: true });
  }
});

test("当前版本优先看 status.md 的当前版本，其次取最近改过的", () => {
  const article = makeArticle();
  const rel = path.basename(article);
  try {
    fs.writeFileSync(path.join(article, "status.md"), "阶段：制作中\n当前版本：英文-极简动效v4\n");
    assert.equal(currentVersion(rel), "英文-极简动效v4");
    fs.writeFileSync(path.join(article, "status.md"), "阶段：制作中\n");
    // 两个版本里中文版刚改过
    const f = path.join(article, "中文-极简动效v4", "99-1-章", "script.md");
    fs.writeFileSync(f, "---\n风格：v4\n---\n");
    fs.utimesSync(f, new Date(), new Date(Date.now() + 60_000));
    assert.equal(currentVersion(rel), "中文-极简动效v4");
  } finally {
    fs.rmSync(article, { recursive: true, force: true });
  }
});

test("整片成片名带版本后缀，旧布局保持原名", () => {
  assert.equal(filmBase("待发/16-标题", "中文-极简动效v4"), "16-标题-中文-极简动效v4");
  assert.equal(filmBase("待发/16-标题", ""), "16-标题");
});
