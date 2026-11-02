import { test } from "node:test";
import assert from "node:assert/strict";
import { parseScript } from "../../engine/src/script/parse";
import {
  ABSTRACT_DUR, EMPTY_ABSTRACT, abstractCues, abstractTrack, applyAbstract, initialAbstract, isMinimalStyle, stateAt,
} from "../../engine/src/script/minimal";
import type { Item } from "../../engine/src/script/timeline";
import { minimalSample } from "../../engine/src/experiment/minimal03";

const fake = (text: string, i: number, extra: Record<string, unknown> = {}) =>
  ({ index: i, from: i * 100, frames: 100, screen: { text, ...extra } }) as unknown as Item;

test("极简风格解析抽象标记，不进音效", () => {
  const script = parseScript(`---\n风格：极简\n---\n普通屏\n起点 | 抽象:路径/起点\n反馈 | 抽象:反馈/接入`);
  assert.equal(isMinimalStyle(script.meta), true);
  assert.equal(script.screens[0].abstract, undefined);
  assert.deepEqual(script.screens[1].abstract, { kind: "路径", stage: "起点" });
  assert.deepEqual(script.screens[2].abstract, { kind: "反馈", stage: "接入" });
  assert.deepEqual(script.screens.flatMap((s) => s.sfx), []);
  assert.deepEqual(script.errors, []);
});

test("未知抽象类型会报错", () => {
  assert.equal(parseScript("正文 | 抽象:未知/阶段").errors.length, 1);
});

test("abstractCues 按帧排序并支持片段偏移", () => {
  const items = [
    fake("甲", 0, { abstract: { kind: "路径", stage: "起点" } }),
    fake("乙", 1),
    fake("丙", 2, { abstract: { kind: "分叉", stage: "展开" } }),
  ];
  const cues = abstractCues(items, 150);
  assert.deepEqual(cues.map((c) => c.at), [0, 50]);
  assert.equal(cues[0].dur, ABSTRACT_DUR);
  assert.equal(cues[0].index, 0);
});

test("轨道累积状态，过渡结束后保持", () => {
  const cues = abstractCues([
    fake("甲", 0, { abstract: { kind: "路径", stage: "起点" } }),
    fake("乙", 1, { abstract: { kind: "路径", stage: "停滞" } }),
  ]);
  const track = abstractTrack(cues, EMPTY_ABSTRACT);
  assert.equal(stateAt(track, EMPTY_ABSTRACT, 0).spine, 0);
  assert.equal(stateAt(track, EMPTY_ABSTRACT, ABSTRACT_DUR).spine, 1);
  assert.equal(stateAt(track, EMPTY_ABSTRACT, 100).stall, 0);
  assert.equal(stateAt(track, EMPTY_ABSTRACT, 118).stall, 1);
  assert.equal(track.length, 2);
});

test("initialAbstract 取片段起点之前的最后一个状态", () => {
  const script = parseScript(`---\n风格：极简\n---\n甲 | 抽象:路径/起点\n乙 | 抽象:分叉/展开\n丙`);
  assert.equal(initialAbstract(script.screens, 0).spine, 0);
  assert.equal(initialAbstract(script.screens, 1).spine, 1);
  assert.equal(initialAbstract(script.screens, 1).branches, 0);
  assert.equal(initialAbstract(script.screens, 2).branches, 1);
});

test("未知阶段不改变状态", () => {
  assert.deepEqual(applyAbstract(EMPTY_ABSTRACT, { kind: "路径", stage: "不存在" }), EMPTY_ABSTRACT);
});

test("minimalSample 按整屏文字取闭区间", () => {
  const items = ["前", "而过于关注这件事的反馈", "中间", "想要的结果吗？", "后"].map((t, i) => fake(t, i));
  const cut = minimalSample(items);
  assert.equal(cut.length, 3);
  assert.equal(cut[0].screen.text, "而过于关注这件事的反馈");
  assert.equal(cut.at(-1)?.screen.text, "想要的结果吗？");
  assert.deepEqual(minimalSample([fake("别的", 0)]), []);
});
