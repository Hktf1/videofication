# 机制图形风格（已归档）

2026-10-28 用户要求删除 v3 机制图形风格，整体归档于此，不再参与正式制作、检查、渲染和 Studio 预览。同日纯文字风格的程序标识由 `v2` 改为 `v1`，正式风格名录里只剩纯文字一种。

归档时保留的完整文件：

```
docs/机制图形.md                          风格文字规范
engine/src/script/mechanism.ts            机制类型、风格判定
engine/src/style/mechanism.ts             机制画面色板与字幕位置
engine/src/kit/MechanismScene.tsx         机制画面组件（门槛 / 状态 / 反馈）
tools/tests/mechanism.test.ts             解析测试
```

归档前使用过该风格的稿件与渲染产物（未搬动，仅作记录）：

- `backup/03-3-v3/`：03-3《站在前人的肩膀上》的 v3 处理稿与进度。
- `seasons/out/03-3-v3-check/`：该章的静帧核对图。

恢复方式（如需重新启用）：

1. 把上述文件按原路径放回。
2. 在 `engine/src/script/parse.ts` 恢复 `mechanism` 字段与 `机制:` 标记解析。
3. 恢复 `engine/src/Episode.tsx` 中的机制分支（背景、字幕位置与字号）。
4. 在 `tools/preflight.ts` 的风格白名单加回 `"v3"` 及其分镜必填检查。
5. 恢复 `docs/风格/机制图形.md` 与 README 表格行、`CLAUDE.md` 的风格说明。
