import { speechSettings } from "./language";
import { isMotionStyle, MOTION_KINDS, MOTION_STAGES, type MotionKind } from "../engine/src/script/motion";
import { checkSceneBeats } from "../engine/src/script/beats";
import fs from "node:fs";
import path from "node:path";
import { alignVoice, mapScreens, type Word } from "../engine/src/script/sync";
import { charCount, episodeStyle, isBrandValue } from "../engine/src/script/parse";
import { CHARS } from "../engine/src/style/theme";
import { resolveSfx } from "../engine/src/style/sfx";
import { epPath, loadScript, ROOT } from "./lib";
import { parsePerformance } from "./perform";
import { checkInputContract } from "./input";

/** 发布级检查，不写入稿件或状态。背景音乐缺失阻止导出：没有它整片会有大段绝对静音。 */
export function preflight(dir: string): string[] {
  const errors: string[] = [];
  errors.push(...checkInputContract(dir));
  const script = loadScript(dir);
  if (!isMotionStyle(script.meta) || /纯文字/.test(dir)) errors.push("正式制作只支持极简动效 V1；旧纯文字版本已停用，稿件、音频和字幕可复用到新动效版本。");
  // 水印、片尾默认都不加，只在用户明确要求时写「水印：是」「片尾：是」
  for (const k of ["水印", "片尾"])
    if (script.meta[k] !== undefined && !isBrandValue(script.meta[k]))
      errors.push(`「${k}：${script.meta[k]}」写法无效，只认 是 / 否（不写即否）`);
  // V1 的画面是这一风格的主体：要么章节目带 画面.tsx，要么用通用画面词表
  if (isMotionStyle(script.meta)) {
    const sceneFile = epPath(dir, "画面.tsx");
    const custom = fs.existsSync(sceneFile);
    const markers = script.screens.flatMap((s) => (s.scene ? [s.scene] : []));
    if (!custom) {
      if (!markers.length)
        errors.push("V1 章节要么带 画面.tsx，要么在标记列写「画面:节/步」；写法见 docs/风格/极简动效.md");
      for (const s of script.screens) {
        if (!s.scene) continue;
        const kind = s.scene.section as MotionKind;
        if (!(MOTION_KINDS as readonly string[]).includes(s.scene.section) || !MOTION_STAGES[kind]?.includes(s.scene.step))
          errors.push(`第${s.line}行：没有 画面.tsx 时只能用通用画面（${MOTION_KINDS.join("、")}）`);
      }
    } else {
      // 节拍名写错渲染不会报错（ctx.p 找不到那一拍就停在 0），这里反过来核对组件引用的每一拍都有标记
      errors.push(...checkSceneBeats(markers, fs.readFileSync(sceneFile, "utf8")));
    }
  }
  errors.push(...script.errors.map(e => `第${e.line}行：${e.msg}`));
  if (!script.screens.length) errors.push("处理稿为空");
  for (const s of script.screens) {
    if (s.text.includes("这里写该章正文") || s.section.includes("NN-M")) errors.push("处理稿仍含模板占位内容");
    if (!s.text || charCount(s.text) > CHARS.hardMax) errors.push(`第${s.line}行：文字为空或超过字数上限`);
    if (s.sfx.some(x => !resolveSfx(x))) errors.push(`第${s.line}行：未知音效标记`);
    if ((s.text.match(/【/g)?.length ?? 0) !== (s.text.match(/】/g)?.length ?? 0)) errors.push(`第${s.line}行：强调括号不配对`);
  }
  if (script.screens.at(-1)?.turn) errors.push("最后一屏不能标记转折");
  const bgmFile = `bgm/${script.meta["BGM"] ?? "default.mp3"}`;
  if (!fs.existsSync(path.join(ROOT, "engine", "public", bgmFile)))
    errors.push(`缺背景音乐 engine/public/${bgmFile}，请先运行 npm run bgm`);
  const audio = ["mp3", "wav", "m4a"].map(x => epPath(dir, "字幕", `配音.${x}`)).find(p => fs.existsSync(p) && fs.statSync(p).size > 0);
  const narr = epPath(dir, "朗读稿.txt"), words = epPath(dir, "字幕", "逐字.json");
  if (!audio) errors.push("缺少完整章节配音（配音.mp3/wav/m4a）");
  if (!fs.existsSync(narr)) errors.push("缺少朗读稿.txt");
  if (!fs.existsSync(words)) errors.push("缺少逐字.json，请先运行 voice");
  // 演出稿是配音的输入，也是每章的必做项；改过却没重新配音时导出会和对稿时间对不上
  const perf = epPath(dir, "朗读稿.演出.txt");
  if (!fs.existsSync(perf)) errors.push("缺少 朗读稿.演出.txt（每章必做，写法见 docs/配音情绪控制.md）");
  else if (fs.existsSync(narr)) {
    const p = parsePerformance(fs.readFileSync(perf, "utf8"), fs.readFileSync(narr, "utf8"), speechSettings(dir).voice);
    errors.push(...p.errors.map(e => `朗读稿.演出.txt${e.line ? `第${e.line}行` : ""}：${e.msg}`));
  }
  if (!audio || !fs.existsSync(narr) || !fs.existsSync(words)) return errors;
  if (fs.statSync(words).mtimeMs < fs.statSync(audio).mtimeMs) errors.push("逐字时间戳早于配音，请重新运行 voice");
  try {
    const data: Word[] = JSON.parse(fs.readFileSync(words, "utf8"));
    if (!Array.isArray(data) || !data.length || data.some((w, i) => !w || typeof w.w !== "string" || !Number.isFinite(w.s) || !Number.isFinite(w.e) || w.s < 0 || w.e < w.s || (i > 0 && w.s < data[i - 1].s))) {
      errors.push("逐字时间戳格式无效或时间顺序错误");
      return errors;
    }
    const al = alignVoice(fs.readFileSync(narr, "utf8"), data);
    const mapped = mapScreens(script, al);
    if (al.coverage < 0.9) errors.push(`配音匹配率仅 ${Math.round(al.coverage * 100)}%，要求至少 90%`);
    if (al.missing.length) errors.push(`配音存在 ${al.missing.length} 处缺段`);
    if (al.extra.length) errors.push(`配音存在 ${al.extra.length} 处多出内容或连续识别错误，请核对`);
    errors.push(...mapped.issues.map(i => `第${i.line}行：${i.msg}`));
    if (mapped.screens.some(s => !s || s.e <= s.s)) errors.push("存在无法对齐或时长无效的字幕屏");
  } catch (e) { errors.push(`无法读取对齐数据：${(e as Error).message}`); }
  return errors;
}
