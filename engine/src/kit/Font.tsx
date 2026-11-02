import { continueRender, delayRender, staticFile } from "remotion";
import { KAI_FILE } from "../style/theme";
import { MOTION_FONT } from "../style/motion";

// 加载本地楷体，加载完成前暂停渲染，避免首帧用兜底字体
let started = false;
export function ensureFont() {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("加载字体");
  const face = new FontFace("Kai", `url(${staticFile(KAI_FILE)})`, { weight: "400" });
  face.load()
    .then((f) => document.fonts.add(f))
    .catch((e) => console.warn("字体加载失败，使用系统字体", e))
    .finally(() => continueRender(handle));
}

// V1 极简动效的画面标签用思源黑体，底部字幕用楷体。
let sansStarted = false;
export function ensureSansFont() {
  if (sansStarted || typeof document === "undefined") return;
  sansStarted = true;
  const handle = delayRender("加载黑体");
  const face = new FontFace(MOTION_FONT.family, `url(${staticFile(MOTION_FONT.file)})`, {
    weight: String(MOTION_FONT.weight),
  });
  face.load()
    .then((f) => document.fonts.add(f))
    .catch((e) => console.warn("思源黑体加载失败，使用系统字体", e))
    .finally(() => continueRender(handle));
}
