// 联络表：把每屏缩小拼成一张图，用来一次性审画面。
// 每屏取淡出前一刻（强调词已变色）。
import React from "react";
import { AbsoluteFill, Freeze } from "remotion";
import { Episode } from "./Episode";
import { findEpisode } from "./episodes";
import { buildTimeline } from "./script/timeline";
import { C, FONT, LAYOUT } from "./style/theme";

export const SHEET_COLS = 4;
export const THUMB_SCALE = 0.3;
const TW = LAYOUT.width * THUMB_SCALE;
const TH = LAYOUT.height * THUMB_SCALE;
const LABEL = 44;
const GAP = 16;

export const sheetSize = (n: number) => ({
  width: SHEET_COLS * (TW + GAP) + GAP,
  height: Math.max(1, Math.ceil(n / SHEET_COLS)) * (TH + LABEL + GAP) + GAP,
});

export const sheetFrames = (dir: string) => {
  const ep = findEpisode(dir);
  if (!ep) return [];
  // 正式联络表使用动效 V1，在本屏结束前抽帧。
  return buildTimeline(ep.script, ep.voice).items.map((it) => ({
    frame: it.from + Math.max(0, it.timing.fadeOutAt - 1),
    label: `#${it.index + 1}　第${it.screen.line}行　${(it.frames / 30).toFixed(1)}s`,
  }));
};

export const Sheet: React.FC<{ dir: string; size?: number }> = ({ dir, size }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    {sheetFrames(dir).map((t, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: GAP + (i % SHEET_COLS) * (TW + GAP),
          top: GAP + Math.floor(i / SHEET_COLS) * (TH + LABEL + GAP),
          width: TW,
        }}
      >
        <div style={{ width: TW, height: TH, overflow: "hidden", position: "relative" }}>
          <div style={{ width: LAYOUT.width, height: LAYOUT.height, transform: `scale(${THUMB_SCALE})`, transformOrigin: "0 0" }}>
            <Freeze frame={t.frame}>
              <Episode dir={dir} size={size} />
            </Freeze>
          </div>
        </div>
        <div style={{ height: LABEL, lineHeight: `${LABEL}px`, color: C.dim, fontFamily: FONT.kai, fontSize: 26 }}>
          {t.label}
        </div>
      </div>
    ))}
  </AbsoluteFill>
);

/** 字号试样：同一屏用不同字号各渲一张，上下排列 */
export const SIZE_SAMPLES = [44, 52, 60];
export const SizeSheet: React.FC<{ dir: string; at: number }> = ({ dir, at }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    {SIZE_SAMPLES.map((s, i) => (
      <div key={s} style={{ position: "absolute", top: i * (LAYOUT.height / 2 + 8), width: LAYOUT.width / 2, height: LAYOUT.height / 2, overflow: "hidden" }}>
        <div style={{ width: LAYOUT.width, height: LAYOUT.height, transform: "scale(0.5)", transformOrigin: "0 0" }}>
          <Freeze frame={at}>
            <Episode dir={dir} size={s} />
          </Freeze>
        </div>
        <div style={{ position: "absolute", left: 16, top: 12, color: C.dim, fontFamily: FONT.kai, fontSize: 24 }}>{s}px</div>
      </div>
    ))}
  </AbsoluteFill>
);
