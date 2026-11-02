// 音效按用途命名。处理稿标记列写语义名，这里映射到文件。
// v1 风格以安静为主：音效只在少数重点处用。
// 文件放 engine/public/sfx/，缺文件时静默跳过（check 会提示）。
export const SFX = {
  understandTick: "sfx/understand-tick.mp3", // 本轮重制：结构接通
  understandStop: "sfx/understand-stop.mp3", // 本轮重制：碰壁
  understandTurn: "sfx/understand-turn.mp3", // 本轮重制：推断反转
  understandRetract: "sfx/understand-retract.mp3", // 本轮重制：结构撤回
  emphasis: "sfx/hit.mp3", // 重点
  glow: "sfx/glow.mp3", // 出路/亮起
  iron: "sfx/iron.mp3", // 铁律落定
  weight: "sfx/weight.mp3", // 额外消耗 / 负反馈重量
  supply: "sfx/supply.mp3", // 正反馈补给
  gavel: "sfx/gavel.mp3", // 法槌
  collapse: "sfx/collapse.mp3", // 路板散落
  motionClick: "sfx/motion-click.mp3", // 极简图解落定
  motionWhoosh: "sfx/motion-whoosh.mp3", // 关系断开 / 能量转移
  motionTone: "sfx/motion-tone.mp3", // 反馈连接
} as const;

export type SfxName = keyof typeof SFX;

export const SFX_ALIAS: Record<string, SfxName> = {
  重点: "emphasis",
  亮起: "glow", 出路: "glow",
  铁律: "iron",
  重量: "weight",
  补给: "supply",
  法槌: "gavel",
  散落: "collapse",
  轻点: "motionClick",
  轻扫: "motionWhoosh",
  反馈音: "motionTone",
};

export const resolveSfx = (n: string): SfxName | undefined =>
  (n in SFX ? (n as SfxName) : SFX_ALIAS[n]);

export const BGM_DEFAULT = "bgm/default.mp3";
// 有人声，BGM 压低。default.mp3（time is broken）已标准化到 -23 LUFS，
// 乘 0.18 后约 -38 LUFS，比配音（-24 LUFS）低 14 dB；换曲子先量响度再改这个值。
export const VOLUME = { bgm: 0.18, sfx: 0.5, voice: 1 };
export const BGM_FADE = 0.6; // 片头 BGM 淡入秒数，避免第一帧直接出声
