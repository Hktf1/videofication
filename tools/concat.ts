// 合并全片的纯函数：章节排序、ffprobe 结果、参数一致性、concat 清单。
// 测试见 tools/tests/concat.test.ts。

export type MediaInfo = {
  duration: number;
  video: { codec: string; width: number; height: number; fps: string };
  audio: { codec: string; sampleRate: number; channels: number } | null;
};

/** 章节文件夹名里的章号：03-12-标题 → 12 */
export const chapterNumber = (name: string) => {
  const m = name.match(/^\d+-(\d+)(?:-|$)/);
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
};

/** 按章号排序，避免 03-10 排在 03-2 前面；章号相同时按名称排 */
export const chapterOrder = <T extends string>(names: T[]): T[] =>
  [...names].sort((a, b) => chapterNumber(a) - chapterNumber(b) || a.localeCompare(b, "zh"));

/** ffprobe -print_format json 的输出 → 合并需要的字段 */
export function parseProbe(json: any): MediaInfo {
  const streams: any[] = Array.isArray(json?.streams) ? json.streams : [];
  const v = streams.find((s) => s?.codec_type === "video");
  const a = streams.find((s) => s?.codec_type === "audio");
  if (!v) throw new Error("没有视频流");
  const duration = Number(json?.format?.duration ?? v.duration ?? 0);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("读不到时长");
  return {
    duration,
    video: {
      codec: String(v.codec_name ?? ""),
      width: Number(v.width ?? 0),
      height: Number(v.height ?? 0),
      fps: String(v.r_frame_rate ?? ""),
    },
    audio: a
      ? { codec: String(a.codec_name ?? ""), sampleRate: Number(a.sample_rate ?? 0), channels: Number(a.channels ?? 0) }
      : null,
  };
}

const describe = (i: MediaInfo) =>
  `${i.video.width}×${i.video.height} ${i.video.fps} fps ${i.video.codec}` +
  (i.audio ? ` / ${i.audio.codec} ${i.audio.sampleRate}Hz ${i.audio.channels}ch` : " / 无音轨");

/** 各章成片能否直接拼接；返回逐条问题（空数组表示可以） */
export function checkCompatible(items: { name: string; info: MediaInfo }[]): string[] {
  if (!items.length) return ["没有可合并的章节"];
  const errors: string[] = [];
  const first = items[0];
  for (const it of items) {
    if (!it.info.audio) errors.push(`${it.name}：没有音轨，无法合并`);
    if (
      it.info.video.codec !== first.info.video.codec ||
      it.info.video.width !== first.info.video.width ||
      it.info.video.height !== first.info.video.height ||
      it.info.video.fps !== first.info.video.fps
    )
      errors.push(`${it.name}：画面参数 ${describe(it.info)} 与第 1 章 ${describe(first.info)} 不一致，请统一后重新渲染`);
    if (
      it.info.audio && first.info.audio &&
      (it.info.audio.codec !== first.info.audio.codec ||
        it.info.audio.sampleRate !== first.info.audio.sampleRate ||
        it.info.audio.channels !== first.info.audio.channels)
    )
      errors.push(`${it.name}：音频参数 ${describe(it.info)} 与第 1 章 ${describe(first.info)} 不一致，请统一后重新渲染`);
  }
  return errors;
}

export const totalDuration = (infos: MediaInfo[]) => infos.reduce((n, i) => n + i.duration, 0);

/** ffmpeg concat 清单；路径统一正斜杠，单引号按 ffmpeg 规则转义 */
export function concatList(files: string[]): string {
  return files.map((f) => `file '${f.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n") + "\n";
}
