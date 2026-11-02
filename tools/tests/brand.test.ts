import { test } from "node:test";
import assert from "node:assert/strict";
import { brandOf, parseScript } from "../../engine/src/script/parse";
import { buildTimeline, OUTRO_FRAMES, outroFrames } from "../../engine/src/script/timeline";

test("水印和片尾默认都不加", () => {
  const meta = parseScript("---\n标题：测试\n---\n正文").meta;
  assert.deepEqual(brandOf(meta), { watermark: false, outro: false });
  assert.equal(outroFrames(meta), 0);
  const plain = buildTimeline(parseScript("---\n标题：测试\n---\n正文"));
  const outro = buildTimeline(parseScript("---\n标题：测试\n片尾：是\n---\n正文"));
  assert.equal(outro.total - plain.total, OUTRO_FRAMES);
});

test("头部写「水印：是」「片尾：是」才开启", () => {
  const meta = parseScript("---\n水印：是\n片尾：是\n---\n正文").meta;
  assert.deepEqual(brandOf(meta), { watermark: true, outro: true });
  assert.equal(outroFrames(meta), OUTRO_FRAMES);
});

test("写「否」或留空都按不加处理", () => {
  const meta = parseScript("---\n水印：否\n片尾：\n---\n正文").meta;
  assert.deepEqual(brandOf(meta), { watermark: false, outro: false });
});
