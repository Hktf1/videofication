// 联络表：把每屏中间那一帧缩小拼成一张图，用来一次性审画面。
import React from "react";
import { AbsoluteFill, Freeze } from "remotion";
import { Episode } from "./Episode";
import { findEpisode } from "./episodes";
import { buildTimeline } from "./script/timeline";
import { C, FONT, LAYOUT } from "./style/theme";

export const SHEET_COLS = 6;
export const THUMB_SCALE = 0.25;
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
  return buildTimeline(ep.script).items.flatMap((it) =>
    it.kind === "screen" ? [{ frame: it.from + Math.floor(it.frames * 0.6), line: it.screen.line, n: it.index + 1 }] : [],
  );
};

export const Sheet: React.FC<{ dir: string }> = ({ dir }) => (
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
              <Episode dir={dir} />
            </Freeze>
          </div>
        </div>
        <div style={{ height: LABEL, lineHeight: `${LABEL}px`, color: C.muted, fontFamily: FONT.sans, fontSize: 28 }}>
          #{t.n}　第{t.line}行
        </div>
      </div>
    ))}
  </AbsoluteFill>
);
