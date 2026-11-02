# 认知行动参考样片实验

时长 28.633 秒，1920×1080，30fps。实验编号：`实验-认知行动-参考样片`。

在项目根目录运行：

```powershell
npm run studio:experiments -- --port 3011 --no-open
```

打开 [独立实验预览](http://localhost:3011/实验-认知行动-参考样片)，点击播放即可查看带原配音和背景音乐的动效。此实验只在 `ExperimentRoot.tsx` 注册，正式入口不引用。

- [画面脚本](画面脚本.md)：台词落点、状态变化、参考依据。
- [原稿摘录](原稿摘录.txt)：11 屏原台词，内容不改写。
- `excerpt.json`：原始来源、文件摘要、字幕和逐字节拍。
- `CognitionReference.tsx`：独立实验画面与播放组件。
- 实验音频：`engine/public/experiments/cognition-reference/voice.wav`，从既有配音的 95.300～123.933 秒连续提取，24000Hz 单声道 PCM。未调用 TTS。
- `out/实验预览.jpg`、`out/检查.json`：画面证据和检查记录。

参考样片为根目录 `参考样片/极简线条.mp4`，采用持续关系图、相对尺寸收缩和信息移入的表达方法。字幕继续整句暖白渐显。正式 V1 规范、原文章目录与正式成片均未修改；本次未导出实验 MP4。
