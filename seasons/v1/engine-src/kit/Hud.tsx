import React from "react";
import { C, FONT, LAYOUT, SIZE } from "../style/theme";

/** 左上章节路标：章节号 + 关键词 */
export const Hud: React.FC<{ no: number; title: string }> = ({ no, title }) => (
  <div
    style={{
      position: "absolute",
      left: LAYOUT.pad,
      top: LAYOUT.pad,
      display: "flex",
      alignItems: "baseline",
      gap: 20,
      color: C.muted,
      fontSize: SIZE.label,
    }}
  >
    <span style={{ fontFamily: FONT.sans, color: C.line }}>{String(no).padStart(2, "0")}</span>
    <span style={{ fontFamily: FONT.serif }}>{title}</span>
  </div>
);
