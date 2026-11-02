import { test } from "node:test";
import assert from "node:assert/strict";
import { FIGURE_ACTIONS } from "../../engine/src/script/figure";
import { figureMotion, figureTarget, type FigureSceneData } from "../../engine/src/script/figure-motion";

test("all action pairs carry position, pose and prop geometry across the cut", () => {
  for (const a of FIGURE_ACTIONS) for (const b of FIGURE_ACTIONS) {
    const scenes: FigureSceneData[] = [
      { from: 0, frames: 90, spec: { action: a } },
      { from: 90, frames: 90, spec: { action: b } },
    ];
    assert.deepEqual(figureMotion(scenes, 90, 30)!.state, figureMotion(scenes, 89, 30)!.state);
    assert.deepEqual(figureMotion(scenes, 120, 30)!.state, figureTarget(scenes[1].spec, 30, 90, 120, 30));
  }
});

test("short scenes and silent gaps preserve finite deterministic motion", () => {
  const scenes: FigureSceneData[] = [
    { from: 5, frames: 2, spec: { action: "重负" } },
    { from: 10, frames: 3, spec: { action: "放弃" } },
    { from: 13, frames: 60, spec: { action: "希望" } },
  ];
  assert.equal(figureMotion(scenes, 4, 30), null);
  assert.deepEqual(figureMotion(scenes, 9, 30)!.state, figureMotion(scenes, 6, 30)!.state);
  const expected = figureMotion(scenes, 14, 30);
  for (const frame of [72, 12, 5, 10, 13]) {
    const values = Object.values(figureMotion(scenes, frame, 30)!.state).flat();
    assert.ok(values.every(Number.isFinite));
  }
  assert.deepEqual(figureMotion(scenes, 14, 30), expected);
});
