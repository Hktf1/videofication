// 音效按用途命名。处理稿「音效」列写语义名（中文或英文均可），这里映射到文件。
// 文件放 engine/public/sfx/，缺文件时静默跳过（check 会提示）。
export const SFX = {
  emphasis: "sfx/hit.mp3", // 重点
  drain: "sfx/drain.mp3", // 消耗
  lock: "sfx/lock.mp3", // 困住
  rise: "sfx/rise.mp3", // 出路
  glow: "sfx/glow.mp3", // 出路（柔）
  page: "sfx/page.mp3", // 章节
} as const;

export type SfxName = keyof typeof SFX;

export const SFX_ALIAS: Record<string, SfxName> = {
  重点: "emphasis", hit: "emphasis",
  消耗: "drain",
  困住: "lock",
  出路: "rise",
  亮起: "glow",
  翻页: "page", 章节: "page",
};

export const resolveSfx = (n: string): SfxName | undefined =>
  (n in SFX ? (n as SfxName) : SFX_ALIAS[n]);

export const BGM_DEFAULT = "bgm/default.mp3";
