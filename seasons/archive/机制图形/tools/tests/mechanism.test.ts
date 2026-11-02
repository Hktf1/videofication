import { test } from "node:test";
import assert from "node:assert/strict";
import { parseScript } from "../../engine/src/script/parse";
import { isMechanismStyle } from "../../engine/src/script/mechanism";

test("v3 只把显式标记的屏解析为机制图形", () => {
  const script = parseScript(`---\n风格：v3\n---\n普通屏\n受阻 | 机制:门槛/受阻\n稀缺 | 机制:状态/稀缺`);
  assert.equal(isMechanismStyle(script.meta), true);
  assert.equal(script.screens[0].mechanism, undefined);
  assert.deepEqual(script.screens[1].mechanism, { kind: "门槛", stage: "受阻" });
  assert.deepEqual(script.screens[2].mechanism, { kind: "状态", stage: "稀缺" });
  assert.deepEqual(script.errors, []);
  assert.deepEqual(script.screens.flatMap((s) => s.sfx), []);
});

test("未知机制类型会报错", () => {
  assert.equal(parseScript("正文 | 机制:未知/阶段").errors.length, 1);
});

