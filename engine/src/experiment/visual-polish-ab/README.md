# 画面精修 A/B 样片

随机抽取《认知行动》的「印象与锚定」段落，时长 1169 帧 / 30fps，约 39 秒。

- A：现有原文版画面组件的冻结副本，没有人为降低质量。
- 截取开始前已进入「扎根」场景，A 补回这一历史状态，首帧不重新淡入；除此之外沿用原图形和原节拍。
- B：按 `画面脚本.md` 精修，逐词触发图形变化，贯穿同一水面与对象，最后完成下沉与定格。
- 两版共用连续截取的原配音、整句暖白字幕、BGM 和时长。没有重新请求 TTS。
- `excerpt.json` 保存候选池、抽取结果、来源 SHA-256、配音范围、逐字映射与字幕。
- `snapshot/` 保存取样时的原稿与基线源代码。正式文章未被改写。

准备素材：`npx tsx tools/visual-polish-ab.ts`（会重新从指定来源冻结素材；复现现有画面时无需重跑）。

预览：`npx remotion studio engine/src/experiment/visual-polish-ab/index.ts --no-open`

预览组合：`Compare` 为同步并排，`A-Baseline` / `B-Polished` 为全尺寸单版。

视频交付位置：`参考样片/画面精修AB-20261029/`。

导出：`npx tsx tools/render-visual-polish-ab.ts --videos`，先检查全部来源与节拍，再按顺序渲染三版，并共用正式渲染锁。

代码验证：`npm test -- --test-concurrency=1` 71 项通过，`npm run typecheck` 通过。第一次常规测试也为 71 项通过；中途复跑遇到全项目 Studio 文件监视与共享临时测试目录的争用，关闭本次启动的两个全项目 Studio 后，串行复跑通过。独立 A/B Studio 保持开启。

成片验证：两版均为 1920×1080、30fps、1169 帧；解码音轨 SHA-256 相同。最终交付的三版完整信息见视频旁的 manifest 和 `验收.json`。

本样片用于比较视觉制作方法，不自动修改正式风格规则或替换待发成片。
