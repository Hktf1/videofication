// 把处理稿展开成时间线：只有字幕屏，不放署名和章节名，换章不额外停顿。
// 转折行（行尾 >）之后插一段空屏停顿。引擎渲染和 tools（联络表、时长统计）共用。
//
// 有配音时（voice）：每屏切出自己那一段配音（上一屏结束 → 下一屏开口前），
// 字幕时刻全部取自逐字时间戳；停留、转折在这段配音之后补静音，所以配音不会被画面拖着走。
import { brandOf, FPS, type Script, type Screen } from "./parse";
import { PACE, screenTiming, TURN_GAP_FRAMES, voicedTiming, type ScreenTiming } from "./timing";
import type { VoiceMap } from "./sync";

export const TAIL_FRAMES = 45; // 无配音时的结尾留白
export const INTRO_FRAMES = 0; // 不留片头静场：第一帧就是第一屏，人声从 0 秒开始（2026-10-27 用户定）
export const OUTRO_FRAMES = 90; // 片尾卡 3 秒（engine/src/kit/Outro.tsx）；只有处理稿写了「片尾：是」才加，合并全片时只留最后一章
export const MAX_VOICE_GAP = 1.8; // 有配音时，任何一段没人声的时间上限（秒），含章与章拼起来的那一段

/** 本章片尾卡帧数：默认 0（不加），处理稿头部写「片尾：是」才加 */
export const outroFrames = (meta: Record<string, string>) => (brandOf(meta).outro ? OUTRO_FRAMES : 0);
const PRE_ROLL = 0.25; // 字比声音早出现的秒数（含淡入）
const TAIL_VOICE = 0.3; // 最后一屏念完后保留的配音尾巴
const VOICE_TAIL_FRAMES = 0; // 有配音时人声尾巴已经留出收尾，不再额外补黑
// ASR 的字边界比真实静音紧 0.2～0.36s（实测），按字时间戳算空白要留余量，否则上限会被吃掉
const VOICE_GAP_MARGIN = 0.4;

export type Item = {
  from: number;
  frames: number;
  screen: Screen;
  index: number;
  timing: ScreenTiming;
  audio?: { from: number; frames: number }; // 本屏播放的配音片段（配音里的帧位置、长度）
};

/** 每屏在配音里占的区间 [a, b)（秒）：从上一屏的边界到下一屏开口前 */
function voiceWindows(voice: VoiceMap) {
  const v = voice.screens;
  let prevB: number | undefined;
  return v.map((cur, i) => {
    if (!cur) return null;
    const next = v.slice(i + 1).find(Boolean);
    const a = prevB ?? Math.max(0, cur.s - PRE_ROLL);
    const b = next ? Math.max(cur.e, next.s - PRE_ROLL) : cur.e + TAIL_VOICE;
    prevB = b;
    return { a, b };
  });
}

export function buildTimeline(script: Script, voice?: VoiceMap, chapter?: number): { items: Item[]; total: number } {
  const items: Item[] = [];
  const windows = voice ? voiceWindows(voice) : [];
  const shown = (i: number) => !chapter || script.screens[i].chapterNo === chapter;
  // 本屏之后、下一个有配音的已渲染屏；没有就按章尾处理
  const nextVoiced = (i: number) => {
    for (let j = i + 1; j < script.screens.length; j++) if (shown(j)) return voice?.screens[j] ?? null;
    return null;
  };
  // 章尾到下一章第一个字：片头静场 + 预滚 + 一帧取整余量
  const END_GAP = INTRO_FRAMES / FPS + PRE_ROLL + 1 / FPS;
  let t = INTRO_FRAMES;

  script.screens.forEach((s, index) => {
    if (!shown(index)) return;
    const v = voice?.screens[index];
    const w = windows[index];
    let timing: ScreenTiming;
    let audio: Item["audio"];
    if (v && w) {
      // 停留/转折是配音之后的额外空白：按到下一个字的实际间隔压到上限内，
      // 章尾还要算上下一章的片头静场，这样拼接后也不会出现超长停顿
      const next = nextVoiced(index);
      const gap = next ? Math.max(0, next.s - v.e) + VOICE_GAP_MARGIN : END_GAP + TAIL_VOICE + VOICE_GAP_MARGIN;
      const turn = s.turn ? PACE.turnGap : 0;
      const hold = Math.min(s.hold, Math.max(0, MAX_VOICE_GAP - gap - turn));
      const rel = { s: v.s - w.a, e: v.e - w.a, chars: v.chars.map((c) => c - w.a) };
      timing = voicedTiming(hold === s.hold ? s : { ...s, hold }, rel, w.b - w.a); // 停留、转折停顿算进本屏，配音放完后补静音
      // 片段长度取绝对边界之差：本段终点与下一段起点严格相等，不会差一帧
      audio = { from: Math.round(w.a * FPS), frames: Math.round(w.b * FPS) - Math.round(w.a * FPS) };
      // 取整后片段可能比屏长一帧，屏要跟着放长，否则尾音会被切掉
      if (timing.frames < audio.frames) timing = { ...timing, frames: audio.frames };
    } else {
      timing = screenTiming(s);
    }
    items.push({ from: t, frames: timing.frames, screen: s, index, timing, audio });
    t += timing.frames;
    if (s.turn && !audio) t += TURN_GAP_FRAMES;
  });
  const end = Math.max(t + (voice ? VOICE_TAIL_FRAMES : TAIL_FRAMES), INTRO_FRAMES + FPS);
  return { items, total: end + outroFrames(script.meta) };
}

/** 处理稿里出现过的章节：编号 + 章名 */
export const chapters = (script: Script) =>
  [...new Map(script.screens.filter((s) => s.chapterNo).map((s) => [s.chapterNo, s.section])).entries()].map(
    ([no, name]) => ({ no, name }),
  );
