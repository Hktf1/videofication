import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePerformance, textChars } from "../perform";

test("逐行分段：预设、覆盖、停顿、音色都生效", () => {
  const p = parsePerformance(`# 注释行
@沉稳
第一句。
@停顿 600ms
@默认 rate=-20%
第二句。
@音色 云希
第三句。
`);
  assert.deepEqual(p.errors, []);
  assert.deepEqual(p.parts.map((x) => (x.kind === "text" ? x.text : `停顿${x.ms}`)), ["第一句。", "停顿600", "第二句。", "第三句。"]);
  const [a, , b, c] = p.parts;
  assert.ok(a.kind === "text");
  assert.deepEqual(a.style, { voice: "zh-CN-YunjianNeural", rate: "-6%", pitch: "-3Hz", volume: "+0%" });
  assert.ok(b.kind === "text");
  assert.equal(b.style.rate, "-20%");
  assert.equal(b.style.pitch, "+0Hz"); // 预设先把音调归零，再应用覆盖
  assert.ok(c.kind === "text");
  assert.equal(c.style.voice, "zh-CN-YunxiNeural");
  assert.equal(c.style.rate, "-20%"); // 音色不影响语速
  assert.equal(p.pauseMs, 600);
});

test("文字校验只比汉字和字母数字，标点空白不算", () => {
  const p = parsePerformance("你好世界！\n\n第二句。", "你好，世界！\n第二句");
  assert.deepEqual(p.errors, []);
  assert.equal(textChars(p.text), "你好世界第二句");
});

test("演出稿和朗读稿不一致时报出位置", () => {
  const p = parsePerformance("你好世界。", "你好，世界！\n第二句");
  assert.equal(p.errors.length, 1);
  assert.match(p.errors[0].msg, /不一致/);
  assert.match(p.errors[0].msg, /第 5 个字起/);
  assert.match(p.errors[0].msg, /朗读稿：…/);
});

test("写错的指令、越界的参数、看不懂的停顿时长分别报错", () => {
  const p = parsePerformance("@飞快\n一句。\n@rate=200%\n二句。\n@停顿 3分钟\n三句。");
  assert.equal(p.errors.length, 3);
  assert.match(p.errors[0].msg, /不认识的指令「飞快」/);
  assert.match(p.errors[1].msg, /超出范围/);
  assert.match(p.errors[2].msg, /停顿时长/);
});

test("连续停顿并成一处，零碎参数会归一化", () => {
  const p = parsePerformance("@停顿 300ms\n@停顿 0.2s\n@rate=0% pitch=0Hz\n一句。");
  assert.deepEqual(p.parts.map((x) => (x.kind === "pause" ? x.ms : x.text)), [500, "一句。"]);
  const a = p.parts[1];
  assert.ok(a.kind === "text");
  assert.equal(a.style.rate, "+0%");
  assert.equal(a.style.pitch, "+0Hz");
});

test("@@ 开头是正文，只读标点的行跳过并提示", () => {
  const p = parsePerformance("@@这是正文\n……\n一句。");
  assert.deepEqual(p.parts.map((x) => (x.kind === "text" ? x.text : "")), ["@这是正文", "一句。"]);
  assert.equal(p.warnings.length, 1);
  assert.match(p.warnings[0].msg, /只有标点/);
});

test("全空的演出稿直接报错", () => {
  const p = parsePerformance("# 只有注释\n\n");
  assert.match(p.errors[0].msg, /没有要念的文字/);
});

test("以逗号结尾又紧跟下一行时，提示可能是排版折行", () => {
  const p = parsePerformance("因为人类是一种需要，\n希望的生物。");
  assert.equal(p.warnings.length, 1);
  assert.match(p.warnings[0].msg, /合并成一行/);
  const q = parsePerformance("第一段，\n@停顿 500ms\n第二段。");
  assert.equal(q.warnings.length, 0);
});

test("句号后停顿比 TTS 自带的 700ms 还短时提示，逗号后不提示", () => {
  const p = parsePerformance("一句。\n@停顿 300ms\n二句。");
  assert.deepEqual(p.errors, []);
  assert.equal(p.warnings.length, 1);
  assert.match(p.warnings[0].msg, /像连读/);
  const q = parsePerformance("一句，\n@停顿 250ms\n二句；");
  assert.deepEqual(q.warnings, []);
});

test("语速、音调超出建议范围时提示，但不报错", () => {
  const p = parsePerformance("@默认 rate=-20% pitch=+9Hz\n一句。");
  assert.deepEqual(p.errors, []);
  assert.equal(p.warnings.length, 2);
  assert.match(p.warnings[0].msg, /rate/);
  assert.match(p.warnings[1].msg, /pitch/);
});

test("停顿上限 1 秒：单条超限和连续合并后超限都报错", () => {
  const a = parsePerformance("一句。\n@停顿 1200ms\n二句。");
  assert.equal(a.errors.length, 1);
  assert.match(a.errors[0].msg, /超过 1000ms/);
  const b = parsePerformance("一句。\n@停顿 600ms\n@停顿 600ms\n二句。");
  assert.equal(b.errors.length, 1);
  assert.match(b.errors[0].msg, /1200ms/);
  const ok = parsePerformance("一句。\n@停顿 1000ms\n二句。");
  assert.deepEqual(ok.errors, []);
});
