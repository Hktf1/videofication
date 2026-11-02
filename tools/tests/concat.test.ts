import { test } from "node:test";
import assert from "node:assert/strict";
import { chapterNumber, chapterOrder, checkCompatible, concatList, parseProbe, totalDuration, type MediaInfo } from "../concat";

const info = (width = 1920, height = 1080, fps = "30/1", duration = 10): MediaInfo => ({
  duration,
  video: { codec: "h264", width, height, fps },
  audio: { codec: "aac", sampleRate: 48000, channels: 2 },
});

test("章节按章号排序，10 不排在 2 前面", () => {
  assert.equal(chapterNumber("03-10-收尾"), 10);
  assert.equal(chapterNumber("03-2-起点"), 2);
  assert.deepEqual(chapterOrder(["03-10-尾", "03-2-中", "03-1-首"]), ["03-1-首", "03-2-中", "03-10-尾"]);
});

test("ffprobe 输出解析出画面、音频和时长", () => {
  const parsed = parseProbe({
    format: { duration: "72.384000" },
    streams: [
      { codec_type: "video", codec_name: "h264", width: 1920, height: 1080, r_frame_rate: "30/1" },
      { codec_type: "audio", codec_name: "aac", sample_rate: "48000", channels: 2 },
    ],
  });
  assert.equal(parsed.duration, 72.384);
  assert.deepEqual(parsed.video, { codec: "h264", width: 1920, height: 1080, fps: "30/1" });
  assert.deepEqual(parsed.audio, { codec: "aac", sampleRate: 48000, channels: 2 });
  assert.throws(() => parseProbe({ streams: [] }), /视频流/);
  assert.throws(() => parseProbe({ format: { duration: "0" }, streams: [{ codec_type: "video" }] }), /时长/);
});

test("参数一致的成片可以合并，尺寸或音轨不同会报出来", () => {
  assert.deepEqual(checkCompatible([{ name: "a", info: info() }, { name: "b", info: info() }]), []);
  const bad = checkCompatible([
    { name: "03-1", info: info() },
    { name: "03-2", info: info(1280, 720) },
    { name: "03-3", info: { ...info(), audio: null } },
  ]);
  assert.equal(bad.length, 2);
  assert.match(bad[0], /03-2.*不一致/);
  assert.match(bad[1], /03-3.*没有音轨/);
  assert.deepEqual(checkCompatible([]), ["没有可合并的章节"]);
});

test("concat 清单用正斜杠并转义单引号", () => {
  assert.equal(concatList(["D:\\a\\b.mp4"]), "file 'D:/a/b.mp4'\n");
  assert.equal(concatList(["/tmp/it's.mp4"]), "file '/tmp/it'\\''s.mp4'\n");
  assert.equal(totalDuration([info(1920, 1080, "30/1", 10.5), info(1920, 1080, "30/1", 4.5)]), 15);
});
