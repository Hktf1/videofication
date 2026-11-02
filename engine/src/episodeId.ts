// Composition id：Remotion 只允许 a-z A-Z 0-9 汉字和 -，章节文件夹名里的中文标点必须去掉。
// 引擎（Root/episodes）和 tools/render 共用这一个规则，改错一处就会渲染失败。
// 带版本层时把版本也编进去：16-标题/中文-v1/16-1-章 和 .../英文-v1/16-1-章 章节名相同，
// 不加版本会撞出重复的 composition id，studio 直接报错。
const clean = (s: string) => s.replace(/[-\s]/g, "").replace(/[^a-zA-Z0-9一-鿿]/g, "");
export const episodeId = (name: string, version = "") => `ep${clean(version)}${clean(name)}`;
