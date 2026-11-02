import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { prepareArticle, checkInputContract, proseScreens, textIdentity, relocateScene } from "../input";
import { EP_DIR, ROOT, createVersion, epPath, normalizeVersionName } from "../lib";
import { parseScript, charCount } from "../../engine/src/script/parse";
import { reuseVersion, reusedAudioIsCurrent } from "../reuse";

function fixture(t: { after: (fn: () => void) => void }) {
  const folder = fs.mkdtempSync(path.join(EP_DIR, "999997-input-"));
  t.after(() => {
    assert.equal(path.dirname(folder), path.resolve(EP_DIR));
    fs.rmSync(folder, { recursive: true, force: true });
  });
  fs.writeFileSync(path.join(folder, "status.md"), "阶段：待原文\n");
  return { folder, article: path.basename(folder) };
}
const cli = (file: string, args: string[]) => spawnSync(process.execPath, ["--import", "tsx", path.join(ROOT, "tools", file), ...args], { cwd: ROOT, encoding: "utf8" });

test("切屏保留完整台词与英文单词间隔，不产生超长屏", () => {
  const source = "首行标题也要读。\n" + "这是一段没有标点的原文".repeat(8) + "。\nHello world, this is an English script.\nSupercalifragilisticexpialidocious";
  const screens = proseScreens(source);
  assert.equal(textIdentity(screens.join("")), textIdentity(source));
  assert.ok(screens.every(s => charCount(s) <= 18));
  assert.ok(screens.includes("首行标题也要读。"));
  assert.ok(screens.some(s => s.includes("Hello world")));
});

test("指定文章加用户脚本直接使用脚本，原文与旧稿不覆盖", async t => {
  const { folder, article } = fixture(t);
  fs.writeFileSync(path.join(folder, "source.txt"), "这是原始文章，不是要朗读的脚本。");
  const old = createVersion(article, "极简动效v1");
  const oldChapter = epPath(article, old, "999997-1-旧稿");
  fs.mkdirSync(oldChapter); fs.writeFileSync(path.join(oldChapter, "script.md"), "旧稿不可覆盖");
  const source = "这是我提供的台词。\n必须保持顺序和文字，不重新创作。";
  const input = path.join(folder, "用户稿.txt"); fs.writeFileSync(input, source);
  const result = await prepareArticle(article, { script: input });
  const dir = `${article}/${result.version}/${result.chapters[0]}`;
  assert.equal(fs.readFileSync(epPath(dir, "朗读稿.txt"), "utf8"), source);
  assert.equal(fs.readFileSync(path.join(oldChapter, "script.md"), "utf8"), "旧稿不可覆盖");
  assert.equal(textIdentity(parseScript(fs.readFileSync(epPath(dir, "script.md"), "utf8")).screens.map(s => s.text).join("")), textIdentity(source));
  assert.deepEqual(checkInputContract(dir), []);
  const again = await prepareArticle(article, { script: input });
  assert.equal(again.version, result.version); assert.equal(again.prepared, false);
  fs.writeFileSync(input, "这是更新后的用户台词。");
  const changed = await prepareArticle(article, { script: input });
  assert.notEqual(changed.version, result.version);
  assert.equal(fs.readFileSync(epPath(dir, "朗读稿.txt"), "utf8"), source);
});

test("用户项目处理稿逐字节导入，画面标记与配套演出稿保留", async t => {
  const { folder, article } = fixture(t);
  const input = path.join(folder, "script.md");
  const source = "---\r\n风格：v4\r\n标题：原稿\r\n---\r\n## 开头\r\n这是【用户】台词 | 画面:路径/展开\r\n不许重新写稿 | 停留\r\n";
  fs.writeFileSync(input, source);
  fs.writeFileSync(path.join(folder, "朗读稿.txt"), "这是用户台词。不许重新写稿。");
  fs.writeFileSync(path.join(folder, "朗读稿.演出.txt"), "@沉稳\n这是用户台词。不许重新写稿。");
  const result = await prepareArticle(article, { script: input });
  const dir = `${article}/${result.version}/${result.chapters[0]}`;
  assert.equal(fs.readFileSync(epPath(dir, "script.md"), "utf8"), source);
  assert.match(fs.readFileSync(epPath(dir, "朗读稿.演出.txt"), "utf8"), /@沉稳/);
  assert.deepEqual(checkInputContract(dir), []);
  fs.appendFileSync(epPath(dir, "script.md"), "擅自增加的内容\n");
  assert.ok(checkInputContract(dir).some(e => e.includes("被修改")));
  const narration = cli("narration.ts", [dir]);
  assert.equal(narration.status, 1); assert.match(narration.stderr, /禁止/);
});

test("用户稿被改成文章正文时校验阻止继续", async t => {
  const { folder, article } = fixture(t);
  const input = path.join(folder, "用户稿.txt"); fs.writeFileSync(input, "原始用户台词。");
  const result = await prepareArticle(article, { script: input });
  const dir = `${article}/${result.version}/${result.chapters[0]}`;
  fs.writeFileSync(epPath(dir, "朗读稿.txt"), "根据原文另写的内容。");
  assert.ok(checkInputContract(dir).some(e => e.includes("偏离用户脚本")));
});

test("原始文章可直接准备，全文标题和正文都进入朗读稿", async t => {
  const { folder, article } = fixture(t);
  const text = "这是文章标题\n\n这是正文，不省略标题。";
  fs.writeFileSync(path.join(folder, "source.txt"), text);
  const result = await prepareArticle(article);
  const dir = `${article}/${result.version}/${result.chapters[0]}`;
  assert.equal(fs.readFileSync(epPath(dir, "朗读稿.txt"), "utf8"), text);
  assert.ok(fs.existsSync(epPath(dir, "画面.tsx")));
  assert.equal((await prepareArticle(article)).prepared, false);
});

test("auto 从原文和用户脚本预览完整计划，无文件写入", t => {
  const { folder, article } = fixture(t);
  fs.writeFileSync(path.join(folder, "source.txt"), "这是原始文章正文。");
  const script = path.join(folder, "口播.txt"); fs.writeFileSync(script, "直接使用我的脚本。");
  const before = fs.readdirSync(folder, { recursive: true }).map(String).sort();
  for (const args of [[article, "--dry"], [article, "--script", script, "--dry"]]) {
    const result = cli("auto.ts", args);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /merge.ts/); assert.match(result.stdout, /render.ts/);
  }
  assert.deepEqual(fs.readdirSync(folder, { recursive: true }).map(String).sort(), before);
});

test("无效用户稿明确停止，不回退到原文自行写稿", async t => {
  const { folder, article } = fixture(t);
  fs.writeFileSync(path.join(folder, "source.txt"), "可用的文章。");
  const script = path.join(folder, "分镜.txt"); fs.writeFileSync(script, "画面：一个圆\n旁白：这是台词");
  await assert.rejects(prepareArticle(article, { script }), /旁白|分镜/);
  await assert.rejects(prepareArticle(article, { script: path.join(folder, "不存在.txt") }), /不存在/);
  assert.ok(!fs.readdirSync(folder).some(f => f.includes("极简动效")));
});

test("旧纯文字声音可复用到独立动效版，不复制旧视频", t => {
  const { folder, article } = fixture(t);
  const old = "中文-纯文字v1", chapter = "999997-1-旧章节";
  const source = path.join(folder, old, chapter);
  fs.mkdirSync(path.join(source, "字幕"), { recursive: true });
  fs.mkdirSync(path.join(source, "out"));
  fs.writeFileSync(path.join(folder, old, "版本.md"), "语言：中文\n风格：legacy-text\n音色：云健\n");
  const script = "---\n风格：legacy-text\n---\n## 旧章节\n旧稿台词保持不变\n";
  fs.writeFileSync(path.join(source, "script.md"), script);
  fs.writeFileSync(path.join(source, "朗读稿.txt"), "旧稿台词保持不变。");
  fs.writeFileSync(path.join(source, "朗读稿.演出.txt"), "旧稿台词保持不变。");
  fs.writeFileSync(path.join(source, "字幕/配音.mp3"), "unchanged-audio");
  fs.writeFileSync(path.join(source, "字幕/逐字.json"), "[]");
  fs.writeFileSync(path.join(source, "out/旧片.mp4"), "historical");
  const version = reuseVersion(article, "极简动效v1", old);
  const dir = `${article}/${version}/${chapter}`;
  assert.equal(fs.readFileSync(path.join(source, "script.md"), "utf8"), script);
  assert.equal(fs.readFileSync(epPath(dir, "字幕/配音.mp3"), "utf8"), "unchanged-audio");
  assert.ok(!fs.existsSync(epPath(dir, "out")));
  assert.equal(reusedAudioIsCurrent(dir), true);
  fs.appendFileSync(epPath(dir, "朗读稿.txt"), "新增台词");
  assert.equal(reusedAudioIsCurrent(dir), false);
});

test("纯文字不能再创建为正式版本，旧 V4 名称归一为新 V1", t => {
  const { article } = fixture(t);
  assert.equal(normalizeVersionName("极简动效v4"), "中文-极简动效v1");
  const result = cli("version.ts", [article, "纯文字v1"]);
  assert.equal(result.status, 1); assert.match(result.stderr, /已删除/);
});

test("修改用户的画面附件会导入新版本，原画面与相对依赖保留", async t => {
  const { folder, article } = fixture(t);
  const input = path.join(folder, "script.md");
  fs.writeFileSync(input, "\uFEFF---\n风格：v1\n---\n## 开头\n只读用户台词\n");
  const sceneFile = path.join(folder, "画面.tsx");
  const original = 'export { Scene } from "./custom-scene";\n';
  fs.writeFileSync(sceneFile, original);
  const first = await prepareArticle(article, { script: input });
  const firstDir = epPath(article, first.version, first.chapters[0]);
  const relocated = fs.readFileSync(path.join(firstDir, "画面.tsx"), "utf8");
  const specifier = relocated.match(/from "([^"]+)"/)![1];
  assert.equal(path.resolve(firstDir, specifier), path.resolve(folder, "custom-scene"));
  assert.equal(fs.readFileSync(epPath(article, first.version, "输入附件/画面.tsx.txt"), "utf8"), original);
  fs.appendFileSync(sceneFile, "// 用户更新设计\n");
  const second = await prepareArticle(article, { script: input });
  assert.notEqual(first.version, second.version);
  assert.equal(fs.readFileSync(path.join(firstDir, "画面.tsx"), "utf8"), relocated);
});

test("画面迁移支持静态与动态相对导入，包名不改", () => {
  const from = path.join(ROOT, "scripts"), to = path.join(ROOT, "episodes/测试");
  const code = 'import React from "react"; import "./side-effect"; export { Scene } from "../shared"; const c = import("./part");';
  const result = relocateScene(code, from, to);
  assert.match(result, /from "react"/);
  assert.match(result, /import "\.\.\/\.\.\/scripts\/side-effect"/);
  assert.match(result, /from "\.\.\/\.\.\/shared"/);
  assert.match(result, /import\("\.\.\/\.\.\/scripts\/part"\)/);
});
