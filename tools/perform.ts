// 分段情绪控制：解析 朗读稿.演出.txt。
// Edge TTS 不接受 SSML（尖括号会被 escape 后当字念出来），所以逐句的语速 / 音调 /
// 音色 / 停顿都靠「按行分段合成 + 拼接」实现。每行文字是一段，行首 @ 指令对后面的文字生效。
export type Issue = { line: number; msg: string };

type Loudness = { rate: string; pitch: string; volume: string };
export type VoiceStyle = Loudness & { voice: string };

export type Part =
  | { kind: "text"; line: number; text: string; style: VoiceStyle }
  | { kind: "pause"; line: number; ms: number };

export type Performance = {
  parts: Part[];
  errors: Issue[];
  warnings: Issue[];
  text: string; // 所有朗读文字连起来（不含停顿），用于和 朗读稿.txt 逐字对照
  pauseMs: number;
};

export const DEFAULT_VOICE = "zh-CN-YunjianNeural";

/**
 * 预设只改语速 / 音调 / 音量，不改音色。
 * 语速收到 ±8%：Edge TTS 的减速靠拉长元音实现，超过 -10% 就开始发糊拖尾；
 * 「慢」的感觉交给停顿和屏长，不靠 rate。音调只做 ±3Hz：pitch 是整句平移，
 * 幅度一大就是「整句抬高」的假重音。
 */
export const PRESETS: Record<string, Loudness> = {
  默认: { rate: "+0%", pitch: "+0Hz", volume: "+0%" },
  正常: { rate: "+0%", pitch: "+0Hz", volume: "+0%" },
  沉稳: { rate: "-6%", pitch: "-3Hz", volume: "+0%" },
  低缓: { rate: "-8%", pitch: "-4Hz", volume: "-5%" },
  慢: { rate: "-6%", pitch: "+0Hz", volume: "+0%" },
  强调: { rate: "-2%", pitch: "+2Hz", volume: "+10%" },
  激动: { rate: "+15%", pitch: "+3Hz", volume: "+0%" },
  紧张: { rate: "+22%", pitch: "+3Hz", volume: "+0%" },
  温柔: { rate: "-6%", pitch: "+2Hz", volume: "-5%" },
  低语: { rate: "-8%", pitch: "-3Hz", volume: "-20%" },
};

/** 音色简称 → edge-tts 音色 ID */
export const VOICES: Record<string, string> = {
  云健: "zh-CN-YunjianNeural",
  云希: "zh-CN-YunxiNeural",
  云扬: "zh-CN-YunyangNeural",
  云夏: "zh-CN-YunxiaNeural",
  晓晓: "zh-CN-XiaoxiaoNeural",
  晓伊: "zh-CN-XiaoyiNeural",
  晓辰: "zh-CN-XiaochenNeural",
  晓涵: "zh-CN-XiaohanNeural",
};

const has = (o: object, k: string) => Object.hasOwn(o, k);

/** 对齐、校验都用它：只比字母、数字、汉字，标点和空白不算 */
export const textChars = (t: string) => [...t].filter((c) => /[\p{L}\p{N}]/u.test(c)).join("");

/** 段内最长字数；超出的会被切成多段，用同一套语速音色 */
export const MAX_SEGMENT_CHARS = 300;
export const MAX_PAUSE_MS = 1000; // 单处停顿上限（2026-10-24 用户定）：再长节奏就散了
/** Edge TTS 自带的标点停顿（实测）：句号约 700ms，逗号 130～420ms。分段插入的停顿要排在句号之上 */
export const TTS_PERIOD_PAUSE_MS = 700;

export function parsePerformance(src: string, narration?: string, defaultVoice = DEFAULT_VOICE): Performance {
  const style: VoiceStyle = { voice: defaultVoice, rate: "+0%", pitch: "+0Hz", volume: "+0%" };
  const parts: Part[] = [];
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  const fail = (line: number, msg: string) => errors.push({ line, msg });
  const warn = (line: number, msg: string) => warnings.push({ line, msg });

  const addPause = (line: number, ms: number) => {
    const last = parts.at(-1);
    if (last?.kind === "pause") last.ms += ms; // 连续两行停顿并成一处
    else parts.push({ kind: "pause", line, ms });
  };

  const directive = (body: string, line: number) => {
    const tokens = body.split(/\s+/).filter(Boolean);
    if (!tokens.length) return fail(line, "@ 后面要写指令，例如 @沉稳 或 @停顿 800ms");

    if (tokens[0] === "停顿") {
      if (tokens.length !== 2) return fail(line, "停顿只写一个时长，例如 @停顿 800ms");
      const ms = parsePause(tokens[1]);
      if (ms === null) return fail(line, `停顿时长「${tokens[1]}」看不懂，写成 800ms / 0.95s / 1s`);
      addPause(line, ms);
      return;
    }

    if (tokens[0] === "音色") {
      if (tokens.length !== 2) return fail(line, "音色只写一个名字，例如 @音色 云希");
      const id = resolveVoice(tokens[1]);
      if (!id) return fail(line, `音色「${tokens[1]}」不认识，可用：${Object.keys(VOICES).join("、")}，或直接写完整 ID`);
      style.voice = id;
      return;
    }

    // 预设名 + 可选 key=value 覆盖，例如 @沉稳 rate=-3%
    let preset: string | null = null;
    for (const tok of tokens) {
      const eq = tok.indexOf("=");
      if (eq < 0) {
        if (preset) return fail(line, `一行只能写一个预设，「${preset}」后面又出现「${tok}」`);
        if (!has(PRESETS, tok)) return fail(line, unknownPreset(tok));
        preset = tok;
        Object.assign(style, PRESETS[tok]);
        continue;
      }
      const key = tok.slice(0, eq).trim();
      const value = tok.slice(eq + 1).trim();
      const got = applyOverride(style, key, value);
      if (got) return fail(line, got);
    }
  };

  src.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    const t = raw.trim();
    if (!t || t.startsWith("#")) return;
    if (t.startsWith("@") && !t.startsWith("@@")) return directive(t.slice(1).trim(), line);

    const text = t.startsWith("@@") ? t.slice(1) : t; // @@ 开头的正文
    if (!textChars(text)) return warn(line, `这一行只有标点，跳过：「${text}」`);
    parts.push({ kind: "text", line, text, style: { ...style } });
  });

  const text = parts.map((p) => (p.kind === "text" ? p.text : "")).join("");
  if (!parts.some((p) => p.kind === "text")) errors.push({ line: 0, msg: "演出稿里没有要念的文字" });
  if (narration?.trim()) checkSameTexts(text, narration, errors);

  // 换行就是分段：以逗号收尾的下一行会重新起调，多半是排版折行
  parts.forEach((p, i) => {
    if (p.kind !== "text" || parts[i + 1]?.kind !== "text") return;
    const end = p.text.trim().at(-1) ?? "";
    if (/[，,、：:]/.test(end)) warn(p.line, `这一行以「${end}」结尾，下一行会另起一段；如果本是一句，请合并成一行`);
  });

  // 句号后插入的停顿比 TTS 自带的还短，听感反而像连读
  parts.forEach((p, i) => {
    if (p.kind !== "pause") return;
    const prev = parts[i - 1];
    if (prev?.kind !== "text") return;
    const end = prev.text.trim().at(-1) ?? "";
    if (/[。？！]/.test(end) && p.ms < 500)
      warn(
        p.line,
        `句号后只停 ${p.ms}ms，比 TTS 自带的句号停顿（约 ${TTS_PERIOD_PAUSE_MS}ms）还短，会听起来像连读；段落 800～850、结构转折 950～1000`
      );
  });

  // 参数范围守门：超出建议值不会报错，但听感会明显失真
  for (const p of parts) {
    if (p.kind !== "text") continue;
    const rate = parseInt(p.style.rate, 10);
    const pitch = parseInt(p.style.pitch, 10);
    if (Math.abs(rate) > 10)
      warn(p.line, `rate ${p.style.rate} 超出建议范围 ±10%：Edge TTS 靠拉长元音减速，再慢就发糊；需要更慢请用停顿`);
    if (Math.abs(pitch) > 6)
      warn(p.line, `pitch ${p.style.pitch} 超出建议范围 ±6Hz：整句平移幅度大了会变成「整句抬高」的假重音`);
  }

  // 合并之后再判上限：连续两行 600ms 会并成一处的 1.2s
  for (const p of parts) {
    if (p.kind === "pause" && p.ms > MAX_PAUSE_MS)
      fail(p.line, `停顿 ${p.ms}ms 超过 ${MAX_PAUSE_MS}ms 上限，节奏会散`);
  }

  return {
    parts,
    errors,
    warnings,
    text,
    pauseMs: parts.reduce((a, p) => a + (p.kind === "pause" ? p.ms : 0), 0),
  };
}

function parsePause(v: string): number | null {
  const m = v.match(/^(\d+(?:\.\d+)?)(ms|s)?$/);
  if (!m) return null;
  const ms = Math.round(parseFloat(m[1]) * (m[2] === "s" ? 1000 : 1));
  if (!Number.isFinite(ms) || ms <= 0 || ms > 10000) return null;
  return ms;
}

export function resolveVoice(v: string): string | null {
  if (has(VOICES, v)) return VOICES[v];
  if (/^[a-z]{2,3}-[A-Z]{2}-[A-Za-z0-9-]+Neural$/.test(v)) return v;
  return null;
}

const RANGE = { rate: [-50, 100], pitch: [-50, 50], volume: [-100, 100] } as const;

/** 把 key=value 写回 style；返回错误信息，成功返回 null */
function applyOverride(style: VoiceStyle, key: string, value: string): string | null {
  if (key === "voice") {
    const id = resolveVoice(value);
    if (!id) return `音色「${value}」不认识，可用：${Object.keys(VOICES).join("、")}，或直接写完整 ID`;
    style.voice = id;
    return null;
  }
  if (key !== "rate" && key !== "pitch" && key !== "volume")
    return `不支持的参数「${key}」，可用 rate / pitch / volume / voice`;
  const unit = key === "pitch" ? "Hz" : "%";
  const m = value.match(new RegExp(`^([+-]?)(\\d+)${unit}$`));
  if (!m) return `${key} 要写成 ${key === "pitch" ? "-3Hz" : "-6%"} 这样${key === "pitch" ? "（Hz）" : "（百分比）"}`;
  const n = (m[1] === "-" ? -1 : 1) * parseInt(m[2], 10);
  const [lo, hi] = RANGE[key];
  if (n < lo || n > hi) return `${key} ${value} 超出范围 ${lo}${unit} ～ +${hi}${unit}`;
  style[key] = `${n >= 0 ? "+" : ""}${n}${unit}`;
  return null;
}

function unknownPreset(tok: string): string {
  return `不认识的指令「${tok}」。可写预设 ${Object.keys(PRESETS).join(" / ")}，或 @停顿 600ms、@音色 云希，或直接写 rate=-20% pitch=-5Hz`;
}

/** 演出稿和朗读稿必须逐字一致，否则字幕时间会对歪 */
function checkSameTexts(performed: string, narration: string, errors: Issue[]) {
  const a = textChars(performed);
  const b = textChars(narration);
  if (a === b) return;
  let i = 0;
  const n = Math.min(a.length, b.length);
  while (i < n && a[i] === b[i]) i++;
  const near = (s: string) => `${s.slice(Math.max(0, i - 8), i)}【${s.slice(i, i + 8) || "（到头了）"}】`;
  errors.push({
    line: 0,
    msg: `演出稿与 朗读稿.txt 的文字不一致（从第 ${i + 1} 个字起，标点空白不算）\n  朗读稿：…${near(b)}\n  演出稿：…${near(a)}`,
  });
}

/** 打印用：云健 -15%/-4Hz（音量不为 0 时才带） */
export function describeStyle(style: VoiceStyle): string {
  const name = Object.keys(VOICES).find((k) => VOICES[k] === style.voice) ?? style.voice;
  const vol = style.volume === "+0%" ? "" : ` ${style.volume}`;
  return `${name} ${style.rate}/${style.pitch}${vol}`;
}

/** 一行概览：12 句、3 处停顿（共 2.4s） */
export function describePerformance(perf: Performance): string {
  const lines = perf.parts.filter((p) => p.kind === "text").length;
  const pauses = perf.parts.filter((p) => p.kind === "pause").length;
  const chars = textChars(perf.text).length;
  const sec = (perf.pauseMs / 1000).toFixed(1).replace(/\.0$/, "");
  return `${lines} 行（${chars} 字）${pauses ? `、${pauses} 处停顿（共 ${sec}s）` : ""}`;
}
