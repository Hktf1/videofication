import { test } from "node:test";
import assert from "node:assert/strict";
import { beatRefs, checkSceneBeats } from "../../engine/src/script/beats";

const source = `
  const a = ctx.at("恐惧", "路径");
  const b = ctx.p("多走几步", "遮罩", 36);
  const c = ctx.cueOf("问句", "游标");
  const d = ctx.word(ctx.cueWith("错误的方向"), "全力以赴");
`;

test("只抠出 ctx.at / ctx.p / ctx.cueOf 的字面量节拍", () => {
  assert.deepEqual(beatRefs(source), [
    { section: "恐惧", step: "路径" },
    { section: "多走几步", step: "遮罩" },
    { section: "问句", step: "游标" },
  ]);
});

test("组件引用的节拍都能在标记列里找到时不报错", () => {
  assert.deepEqual(checkSceneBeats(beatRefs(source), source), []);
});

test("组件引用了标记列里没有的节拍时报错并指出是哪一拍", () => {
  const markers = [
    { section: "恐惧", step: "路经" },
    { section: "多走几步", step: "遮罩" },
    { section: "问句", step: "游标" },
  ];
  const errors = checkSceneBeats(markers, source);
  assert.equal(errors.length, 1);
  assert.match(errors[0]!, /恐惧\/路径/);
});

test("标记写了、组件没引用（由词驱动）不算错", () => {
  const markers = [...beatRefs(source), { section: "恐惧", step: "读数" }];
  assert.deepEqual(checkSceneBeats(markers, source), []);
});

test("没有节拍引用时没有可核对的对象", () => {
  assert.deepEqual(checkSceneBeats([{ section: "标题", step: "入场" }], "const x = ctx.word(cue, \"词\");"), []);
});
