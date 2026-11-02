#  文章视频化

把原始文章或用户脚本制作成带配音、字幕、背景音乐和定制动效的 16:9 视频。项目使用 **Remotion + React + TypeScript** 实现画面，默认使用 Microsoft Edge TTS 云健音色，通过本机 faster-whisper 生成逐字时间戳并对稿，最后按章节渲染、合并 MP4。

本项目是一套由 Agent 配合命令行完成的制作工作台。唯一正式风格为 **V1 极简动效**：深蓝黑底、统一字体与语义色，按内容使用物体、简化人物、界面、图解和动态文字；底部字幕约 0.2 秒整句渐显，始终保持暖白。

## 开始之前

先读 [完整制作流程](CLAUDE.md)、[风格入口](docs/风格/README.md) 和 [V1 极简动效规范](docs/风格/极简动效.md)。本 README 提供上手路径，具体制作和验收以这些文档为准。

输入遵守以下优先级：

- **提供用户脚本时，直接使用脚本。** 保留原稿快照，只补缺少的制作层，不根据文章另写台词。
- 只有原始文章时，保留完整正文，按语义分章；docx 首行标题句也是正文，需要朗读。
- 续做已有章节时，沿用当前稿件和已通过的素材，不用原文覆盖制作稿。

## 环境准备

当前工具按 Windows 本机制作环境配置。

| 依赖 | 用途与要求 |
| --- | --- |
| Node.js 与 npm | 执行 TypeScript 工具和 Remotion；具体依赖版本见 `package-lock.json` |
| Python 与 `edge-tts` | 在线生成配音；`edge-tts` 命令须在 PATH 中可用 |
| FFmpeg 与 FFprobe | 音频处理、节奏检查、媒体参数核对与合并；两个命令均须在 PATH 中可用 |
| Python 与 `faster-whisper` | 本机识别、逐字对稿；使用 `large-v3`，优先 CUDA，失败后回退 CPU |
| Chrome 或 Edge | Studio 预览与渲染；配置会尝试使用 Windows 常见安装路径 |
| 字体、BGM 和其他媒体 | 放在对应素材位置；默认 BGM 必需，音效按实际使用检查 |

安装 JavaScript 依赖及 TTS 工具：

```powershell
npm ci
python -m pip install edge-tts
```

ASR 当前在 `tools/voice.ts` 中指定 Python 路径为 `D:/WorkSpace/asr-venv/Scripts/python.exe`。新机器需要准备该虚拟环境并安装 `faster-whisper`，或调整脚本中的 `PY` 路径；CUDA 环境还需匹配的运行库。首次识别需要下载模型，CPU 回退会明显更慢。

可先检查命令是否可用：

```powershell
node --version
npm --version
edge-tts --help
ffmpeg -version
ffprobe -version
```

Git 仓库不包含完整媒体素材。依赖、输出视频、配音、原始 docx、图片、字体和备份等内容的跟踪情况以 `.gitignore` 为准；恢复项目时还要恢复所需本地素材，见 [GitHub 备份与恢复](docs/GitHub备份与恢复.md)。

## 快速上手

以下 `NN` 是文章编号，`NN-M` 是文章与章节编号，例如 `01`、`01-1`。请替换成实际编号。

### 从原始文章开始

1. 将待制作 docx 放入 `episodes/待制作/`。
2. 新建文章并提取原文：

```powershell
npm run new -- "学用脱节"
npm run extract -- NN
```

`new` 自动编号，在 `episodes/制作中/` 建立文章和默认的 `中文-极简动效v1` 版本。短名按主题概括，其中中文总数不超过 4 个字；原始 docx 文件名和正文保留。**收件箱有多份 docx 时，当前命令会选修改时间最新的一份**，执行前应核对目标文件。

提取后，按语义编写 `分章原文.txt`，再运行：

```powershell
npm run chapters -- NN
```

然后按下方逐章流程制作。也可使用 `npm run prepare -- NN` 准备基础制作文件，具体行为见 [全自动流程](docs/全自动流程.md)。

### 已有用户脚本

在目标文章上导入脚本，仅准备文件：

```powershell
npm run prepare -- NN --script "D:/稿件/口播.txt"
```

支持纯口播 txt/md/docx 和项目 `script.md`。纯口播稿原样成为朗读稿，字幕只切屏；项目处理稿及同目录配套朗读稿、演出稿、分镜和画面代码优先复用。新输入进入独立版本，来源、摘要和原稿快照用于后续校验。

分镜表、时间码稿或画面与旁白混合稿需要先识别格式并无损转换，不能把画面说明直接送去朗读。用户脚本变化后重新导入，不能修改处理稿绕过原稿约束。

## 逐章制作与预览

先明确分章和每章论证骨架，再一次完成一章：

1. 准备 `朗读稿.txt`、`朗读稿.演出.txt` 与 `script.md`，检查台词一致性。
2. 生成配音、识别对稿，按真实声音安排字幕和画面节拍。
3. 写动态 `画面脚本.md` 并由 Agent 自检，再实现 `画面.tsx`。
4. 完成技术与布局检查，用真实配音和 BGM 连续播放，核对动态和理解效果。
5. 打开预览，由用户确认本章后继续下一章。仅用户本次明确要求先审分镜时，才停在分镜阶段。

常用执行顺序：

```powershell
npm run tts -- NN-M --dry
npm run tts -- NN-M
npm run voice -- NN-M
npm run pace -- NN-M
# 完成分镜与画面代码后检查
npm run check -- NN-M --ready
npm run studio -- NN
```

代码变更还需运行 `npm test` 和 `npm run typecheck`。首章或环境变化时，应在集中实现前先确认 Studio 能加载目标章节。预览默认用 Studio 连续播放；技术通过和静态抽帧不能代替完整动态验收。

台词、演出和音色未变时复用配音与逐字时间戳；只改画面无需重新配音。底部字幕按语义切屏，建议每屏 10～18 字，上限 21 字，不逐字高亮；逐字时间戳仍用于对稿与动作同步。

所有章节定稿后，再渲染和合并：

```powershell
npm run render -- NN
npm run merge -- NN
npm run move -- NN 待发
```

整片输出在文章目录的 `out/` 下，命名为 `NN-标题-版本.mp4`。发布后可运行 `npm run move -- NN 已发` 归档。

## 全自动模式

用户明确要求“全自动 / 不用确认 / 直接出片”时，制作范围包含准备、配音、检查、预览验收、渲染、合并和移入待发，中途不逐章确认。

```powershell
# 先查看计划，不写文件、不配音、不渲染、不搬文章
npm run auto -- NN --dry

# 从文章开始，或优先使用用户脚本
npm run auto -- NN
npm run auto -- NN --script "D:/稿件/script.md"
```

**`auto` 命令不等于已经完成正式视觉制作。** 无制作章节时，程序会从 `source.txt` 或唯一一份 docx 准备全文一章和基础画面；正式交付仍须由 Agent 补齐逐篇动态设计、画面实现及技术、布局、动态、理解四类验收。当前 `auto` 不会自动启动 Studio，也不会核验动态验收记录。

| 参数 | 行为 |
| --- | --- |
| `--dry` | 只读输入并打印计划，不创建版本或搬动素材 |
| `--chapter M` | 仅处理指定章节，不合并、不搬文章 |
| `--version 版本名` | 指定制作版本 |
| `--force` | 强制配音与渲染，不授权改写用户脚本 |

失败后修复问题并重跑同一命令，已完成步骤按输入新鲜度跳过。完整执行包含重试、锁和步骤超时；合并成功后整篇移入待发。详见 [全自动流程](docs/全自动流程.md)。

## 项目结构

```text
episodes/
  _template/                 文章模板
  待制作/                    未开工素材
  制作中/NN-短名/
    原始文件.docx
    source.txt               完整原文
    分章原文.txt
    status.md                文章状态与当前版本
    中文-极简动效v1/
      版本.md                语言、风格、音色
      修改意见.md            本版本逐章反馈
      NN-M-章名/
        朗读稿.txt
        朗读稿.演出.txt
        script.md            字幕切屏与画面标记
        画面脚本.md           动态分镜
        画面.tsx             定制画面
        status.md
        字幕/                配音、逐字 JSON、校正 SRT
        out/                 章节输出
    out/                     整片输出
  待发/                      已完成待发布
  已发/                      发布归档
engine/src/                  Remotion 引擎、组件、解析与时间线
engine/public/               字体、BGM、音效等公共素材
tools/                       制作命令、ASR 与测试
docs/                        风格、制作与验收文档
seasons/                     历史风格资料
experiments/                 实验内容
backup/                      本地备份与历史归档
```

旧文章可能仍在 `episodes/` 根目录，工具保留兼容查找。制作命令默认使用文章当前版本，可通过 `--version` 或 `NN-M@版本名` 显式选择。

## 其他常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run status` | 查看文章和制作状态 |
| `npm run progress -- NN` | 查看目标文章进度 |
| `npm run voices` | 查看配音音色 |
| `npm run version -- NN "极简动效v1" --from "中文-纯文字v1"` | 建立独立动效版本，复用可用稿件、声音与字幕 |
| `npm run studio:experiments` | 打开实验预览入口 |
| `npm test` | 运行工具与核心逻辑测试 |
| `npm run typecheck` | 运行 TypeScript 类型检查 |

历史纯文字风格已停用，旧视频不能算作动效 V1 成片。旧 V4 输入兼容读取为动效 V1；新成片标记为 `style: v1`、`styleId: motion`。重做应建立独立版本，保留历史素材，见 [旧文章重做](docs/旧文章重做.md)。

## 文档导航

- [CLAUDE.md](CLAUDE.md)：完整制作流程、输入优先级与维护约束。
- [风格入口](docs/风格/README.md) / [极简动效](docs/风格/极简动效.md)：正式视觉和分镜规则。
- [开发与导出检查](docs/开发与导出检查.md)：技术门槛、布局、动态与理解验收。
- [全自动流程](docs/全自动流程.md)：输入、执行顺序、参数与失败恢复。
- [版本与语言](docs/版本与语言.md)：多版本、语言和音色配置。
- [TTS 使用说明](docs/TTS使用说明.md) / [配音情绪控制](docs/配音情绪控制.md)：配音与演出稿。
- [节奏谱](docs/节奏谱.md) / [背景音乐](docs/背景音乐.md)：字幕节奏、停顿与 BGM。
- [旧文章重做](docs/旧文章重做.md)：历史稿件与媒体复用。
- [GitHub 备份与恢复](docs/GitHub备份与恢复.md)：代码备份及本地素材恢复。

## 维护约定

保留已有未提交修改，代码变更后运行 `npm test` 与 `npm run typecheck`。仅改文档和状态备注时无需运行代码测试。未要求制作视频时，不调用真实配音或整片渲染。

水印和片尾默认关闭，明确要求时才添加；片尾仅放最后一章。默认 BGM 必需，`bgm` 命令仅生成 room-tone，不替代默认音乐。渲染使用项目 `.tmp/` 作为临时目录，同一时间不要启动两条渲染任务。
