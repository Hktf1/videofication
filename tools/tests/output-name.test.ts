import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { outputFor, outputOf, outputStyle } from "../lib";

const film = (dir: string, name: string, manifest: object) => {
  const file = path.join(dir, `${name}.mp4`);
  fs.writeFileSync(file, "");
  fs.writeFileSync(file + ".manifest.json", JSON.stringify(manifest));
  return file;
};
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "vf-out-"));

test("新动效 V1 不覆盖历史纯文字 V1", t => {
  const dir = tmp(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const old = film(dir, "06-1-标题", { style: "v1" });
  assert.equal(outputStyle(old), "legacy-text");
  assert.equal(path.basename(outputFor(dir, "06-1-标题", "v1")), "06-1-标题-v1.mp4");
  assert.equal(outputOf(dir, "06-1-标题", "v1"), undefined);
  const current = film(dir, "06-1-标题-v1", { style: "v1", styleId: "motion" });
  assert.equal(outputStyle(current), "v1");
  assert.equal(outputOf(dir, "06-1-标题", "v1"), current);
  assert.equal(outputOf(dir, "06-1-标题", "legacy-text"), old);
});

test("旧 V4 动效成片仍可读取，manifest 保持原样", t => {
  const dir = tmp(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const current = film(dir, "06-1-标题-v4", { style: "v4" });
  assert.equal(outputStyle(current), "v1");
  assert.equal(outputOf(dir, "06-1-标题", "v1"), current);
  assert.equal(JSON.parse(fs.readFileSync(current + ".manifest.json", "utf8")).style, "v4");
});

test("未知风格的旧视频不作为新动效复用或直接覆盖", t => {
  const dir = tmp(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, "06-1-标题.mp4"), "historical");
  assert.equal(outputOf(dir, "06-1-标题", "v1"), undefined);
  assert.equal(path.basename(outputFor(dir, "06-1-标题", "v1")), "06-1-标题-v1.mp4");
});

test("历史文件即使占用新后缀也不能被覆盖或误选", t => {
  const dir = tmp(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  film(dir, "06-1-标题", { style: "v2" });
  film(dir, "06-1-标题-v1", { style: "v1" });
  assert.equal(outputOf(dir, "06-1-标题", "v1"), undefined);
  assert.equal(path.basename(outputFor(dir, "06-1-标题", "v1")), "06-1-标题-v1-2.mp4");
});

test("无旧片时保持普通命名，同风格可重复导出", t => {
  const dir = tmp(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const out = outputFor(dir, "06-1-标题", "v1");
  assert.equal(path.basename(out), "06-1-标题.mp4");
  film(dir, "06-1-标题", { style: "v1", styleId: "motion" });
  assert.equal(outputFor(dir, "06-1-标题", "v1"), out);
});

test("旧 v2 和旧 v1 都认作历史纯文字，不改写 manifest", t => {
  const dir = tmp(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const old = film(dir, "旧片", { sources: [{ style: "v2" }, { style: "v1" }] });
  assert.equal(outputStyle(old), "legacy-text");
  const mixed = film(dir, "混合", { sources: [{ style: "v1" }, { style: "v4" }] });
  assert.equal(outputStyle(mixed), "mixed");
  const motion = film(dir, "动效", { sources: [{ style: "v4" }, { style: "v1", styleId: "motion" }] });
  assert.equal(outputStyle(motion), "v1");
});
