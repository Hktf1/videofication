import { test } from "node:test";
import assert from "node:assert/strict";
import { parseScript } from "../../engine/src/script/parse";
import {
  applyScene, EMPTY_MOTION, initialMotion, isMotionStyle, motionCues, motionTrack, stateAt,
} from "../../engine/src/script/motion";
import { beatAt, sceneCues } from "../../engine/src/script/scene";
import { buildTimeline } from "../../engine/src/script/timeline";

const SRC = `---
风格：v4
标题：测试
---
## 01-1 测试
第一句有画面 | 画面:路径/展开
第二句沿用上一个画面
第三句往前走 | 画面:路径/未知
第四句换一幅图 | 画面:概率/刻度
`;

test("画面标记按屏解析，没写的屏沿用上一个", () => {
  const s = parseScript(SRC);
  assert.equal(s.errors.length, 0);
  assert.deepEqual(s.screens.map((x) => x.scene), [
    { section: "路径", step: "展开" },
    undefined,
    { section: "路径", step: "未知" },
    { section: "概率", step: "刻度" },
  ]);
  assert.equal(isMotionStyle(s.meta), true);
  assert.equal(isMotionStyle({ 风格: "v1" }), true);
  assert.equal(isMotionStyle({}), true);
  assert.equal(isMotionStyle({ 风格: "legacy-text" }), false);
});

test("节名可以是这一章自定义的，不限于通用词表", () => {
  const s = parseScript("---\n风格：v4\n---\n正文 | 画面:恐惧/收益");
  assert.equal(s.errors.length, 0);
  assert.deepEqual(s.screens[0].scene, { section: "恐惧", step: "收益" });
});

test("画面标记必须是 节/步 两段", () => {
  const bad = parseScript("---\n风格：v4\n---\n正文 | 画面:路径");
  assert.equal(bad.errors.length, 1);
  assert.match(bad.errors[0].msg, /画面标记无效/);
  // 多写一段参数也算错，不静默丢掉
  const extra = parseScript("---\n风格：v4\n---\n正文 | 画面:路径/展开/多余");
  assert.equal(extra.errors.length, 1);
});

test("通用图元只认自己的五个类型，自定义节名跳过", () => {
  const mixed = parseScript("---\n风格：v4\n---\n甲 | 画面:路径/展开\n乙 | 画面:恐惧/收益\n丙 | 画面:概率/刻度");
  const cues = motionCues(buildTimeline(mixed).items);
  assert.deepEqual(cues.map((c) => c.spec.kind), ["路径", "概率"]);
});

test("阶段只往后走，过闸可以连着写", () => {
  let s = applyScene(EMPTY_MOTION, { kind: "闸门", stage: "错误" });
  assert.deepEqual(s, { kind: "闸门", stage: 0, gates: 0 });
  s = applyScene(s, { kind: "闸门", stage: "过闸" });
  assert.equal(s.gates, 1);
  s = applyScene(s, { kind: "闸门", stage: "过闸" });
  assert.equal(s.gates, 2);
  // 回退到更早的阶段不会撤销已画出的东西
  s = applyScene(s, { kind: "闸门", stage: "错误" });
  assert.equal(s.stage, 1);
  assert.equal(s.gates, 2);
});

test("换类型从空白重新画，不继承上一幅的进度", () => {
  const a = applyScene(EMPTY_MOTION, { kind: "路径", stage: "分叉" });
  const b = applyScene(a, { kind: "概率", stage: "刻度" });
  assert.deepEqual(b, { kind: "概率", stage: 0, gates: 0 });
});

test("分章/样片预览从之前的屏累积出初始画面", () => {
  const s = parseScript(SRC);
  assert.deepEqual(initialMotion(s.screens, 0), EMPTY_MOTION);
  assert.deepEqual(initialMotion(s.screens, 2), { kind: "路径", stage: 0, gates: 0 });
  assert.deepEqual(initialMotion(s.screens, 3), { kind: "路径", stage: 1, gates: 0 });
});

test("轨道按屏推进，最后一屏停在目标状态", () => {
  const s = parseScript(SRC);
  const { items, total } = buildTimeline(s);
  const initial = initialMotion(s.screens, 0);
  const track = motionTrack(motionCues(items), initial);
  assert.equal(track.length, 3);
  const end = stateAt(track, initial, total - 1);
  assert.equal(end.kind, "概率");
  assert.equal(end.stage, 0);
  // 第一屏刚开场还没画
  assert.equal(stateAt(track, initial, 0).stage, -1);
});

test("章节画面的 cue 带出节拍和逐字时刻", () => {
  const s = parseScript(SRC);
  const { items } = buildTimeline(s);
  const cues = sceneCues(items);
  assert.equal(cues.length, 4);
  assert.deepEqual(cues[0].beat, { section: "路径", step: "展开" });
  assert.equal(cues[1].beat, undefined);
  assert.equal(cues[0].chars.length, [...items[0].screen.text.replace(/[【】]/g, "")].length);
  assert.equal(beatAt(cues, "路径", "未知"), items[2].from);
  assert.equal(beatAt(cues, "恐惧", "收益"), Infinity);
});
