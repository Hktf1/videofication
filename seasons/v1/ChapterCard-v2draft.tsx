import React from "react";
import { CHAPTER_FRAMES } from "../script/timeline";
import { Line } from "../kit/Subtitle";
import { C, LAYOUT, SIZE } from "../style/theme";

/** 章节卡：小号序号 + 章节名，纯文字，自动带翻页音效 */
export const ChapterCard: React.FC<{ no: number; title: string }> = ({ no, title }) => {
  const props = { frames: CHAPTER_FRAMES, fadeIn: 8, fadeOutAt: CHAPTER_FRAMES - 8 };
  return (
    <>
      <Line {...props} size={SIZE.chapterNo} color={C.dim} y={LAYOUT.centerY - 90}>
        {String(no).padStart(2, "0")}
      </Line>
      <Line {...props} size={SIZE.chapter}>{title}</Line>
    </>
  );
};
