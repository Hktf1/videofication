# 小人风格（已归档）

2026-10-24 用户要求删除小人风格，整体归档于此，不再参与正式制作、检查、渲染和 Studio 预览。

归档时保留的完整文件：

```
docs/小人.md                         风格文字规范
engine/src/script/figure.ts          动作类型、风格判定、分镜合并
engine/src/script/figure-motion.ts   动作间几何过渡
engine/src/kit/FigureScene.tsx       正式小人画面组件
engine/src/kit/InkElements.tsx       墨线人物基础元素
engine/src/kit/InkUtils.tsx          几何工具
engine/src/kit/InkFigure.tsx         实验用小人画布
engine/src/kit/InkFigureFull.tsx     Full 草稿用完整画布
engine/src/kit/InkStoryboard.ts      分镜数据
engine/src/FigureEpisode.tsx         小人实验入口
engine/src/figure-sample.md          八动作模板稿
engine/src/experiment/figure02.ts    02-1 小人样片配置
engine/src/episodes/02-1-Full.tsx.draft  Full 草稿
tools/tests/figure.test.ts           解析与分镜测试
tools/tests/figure-motion.test.ts    过渡测试
```

未归档、仍留在正式代码中的共享部分：

- `engine/src/style/ink.ts`：墨线实验（`InkEpisode.tsx` / `Ink.tsx`）仍在用，故保留。
- `engine/public/ink/`、`engine/public/paper.jpg`：墨线实验素材。

恢复方式（如需重新启用）：

1. 把上述文件按原路径放回。
2. 在 `engine/src/script/parse.ts` 恢复 `figure` 字段与 `小人:` 标记解析；`episodeStyle` 现已位于该文件。
3. 恢复 `engine/src/Episode.tsx` 中的小人分支与 `Paper` 背景、`engine/src/episodes.ts` 的 `FIGURE_SAMPLE`、`engine/src/Root.tsx` 的「小人模板」文件夹、`engine/src/ExperimentRoot.tsx` 的「实验-小人-02-1」。
4. 在 `tools/preflight.ts` 的风格白名单加回 `"小人"` 及其分镜必填检查。
5. 恢复 `docs/风格/小人.md` 与 README 表格行、`CLAUDE.md` 的小人章节。

相关章节：03-4《你只是推迟了判决》按小人风格完成的朗读稿与配音保留在 `episodes/03-坚持/03-4-你只是推迟了判决/`，`script.md` 头部风格已清空待重选。
