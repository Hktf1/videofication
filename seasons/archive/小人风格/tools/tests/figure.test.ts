import { test } from "node:test";
import assert from "node:assert/strict";
import { parseScript } from "../../engine/src/script/parse";
import { buildTimeline } from "../../engine/src/script/timeline";
import { figureScenes, isFigureStyle, FIGURE_ACTIONS } from "../../engine/src/script/figure";

test("旧稿保留 v2，新稿解析小人动作，错误动作明确报错", () => {
  assert.equal(isFigureStyle(parseScript("旧稿").meta), false);
  for (const action of FIGURE_ACTIONS) {
    const s = parseScript(`---\n风格：小人\n---\n正文 | 小人:${action}/目标 停留`);
    assert.equal(isFigureStyle(s.meta), true);
    assert.deepEqual(s.errors, []);
    assert.equal(s.screens[0].figure?.action, action);
    assert.deepEqual(s.screens[0].sfx, []);
  }
  assert.equal(parseScript("正文 | 小人:不存在").errors.length, 1);
  assert.equal(parseScript("正文 | 小人:前进/123456789").errors.length, 1);
});

test("同一分镜跨字幕连续，动作切换不改变配音时间线", () => {
  const script = parseScript("第一句 | 小人:前进\n第二句\n第三句 | 小人:受阻");
  const voice = { screens: [0, 2, 4].map(s => ({ s, e: s + 1.5, chars: [s, s + 0.5, s + 1] })), issues: [] };
  const timeline = buildTimeline(script, voice);
  const scenes = figureScenes(timeline.items);
  assert.equal(scenes.length, 2);
  assert.equal(scenes[0].frames, timeline.items[0].frames + timeline.items[1].frames);
  assert.equal(scenes[1].from, timeline.items[2].from);
  assert.equal(scenes[1].spec.action, "受阻");
  const plain = parseScript("第一句\n第二句\n第三句");
  assert.equal(buildTimeline(plain, voice).total, timeline.total);
  assert.deepEqual(buildTimeline(plain, voice).items.map(i => i.audio), timeline.items.map(i => i.audio));
});
