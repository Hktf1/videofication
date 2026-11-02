import fs from "node:fs";
import path from "node:path";
import { createVersion, epPath, listVersionChapters, normalizeVersionName, readVersion, resolveVersion, ROOT, setStatus } from "./lib";
import { speechSettings } from "./language";
import { sha256 } from "./input";

export function reuseVersion(article: string, targetName: string, sourceHint: string) {
  const source = resolveVersion(article, sourceHint);
  const target = normalizeVersionName(targetName);
  if (source === target || /纯文字/.test(target)) throw new Error("重做需要独立的极简动效 V1 版本。");
  if (listVersionChapters(article, target).length) throw new Error("目标版本已有章节，不覆盖；请换一个新版本名。");
  const meta = readVersion(article, source);
  if (Number(meta["历史成片"] ?? 0) > 0) throw new Error("旧版本部分章节只剩成片；请先补齐这些章节的台词，不能只复制现存章节制作缺章全片。旧视频和其他素材均保留。");
  const chapters = listVersionChapters(article, source);
  if (!chapters.length) throw new Error("来源版本没有可复用章节。");
  for (const name of chapters) {
    for (const file of ["script.md", "朗读稿.txt"]) {
      if (!fs.existsSync(epPath(article, source, name, file))) throw new Error(`${name} 缺少 ${file}，先补齐原稿。`);
    }
  }
  createVersion(article, target);
  for (const [key, value] of Object.entries(meta)) {
    if (["语言", "语言代码", "音色"].includes(key)) {
      const file = epPath(article, target, "版本.md");
      let text = fs.readFileSync(file, "utf8");
      const re = new RegExp(`^${key}[：:].*$`, "m");
      text = re.test(text) ? text.replace(re, `${key}：${value}`) : `${text.trimEnd()}\n${key}：${value}\n`;
      fs.writeFileSync(file, text);
    }
  }
  for (const name of chapters) {
    const old = epPath(article, source, name), dest = epPath(article, target, name);
    fs.mkdirSync(dest, { recursive: true });
    const copy = (relative: string) => {
      const from = path.join(old, relative), to = path.join(dest, relative);
      if (!fs.existsSync(from)) return;
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
      const stat = fs.statSync(from); fs.utimesSync(to, stat.atime, stat.mtime);
    };
    for (const file of ["朗读稿.txt", "朗读稿.演出.txt"]) copy(file);
    for (const file of ["配音.mp3", "配音.wav", "配音.m4a", "逐字.json", "校正.srt", "识别配置.json"]) copy(`字幕/${file}`);
    let script = fs.readFileSync(path.join(old, "script.md"), "utf8");
    if (/^---\r?\n/.test(script)) {
      script = /^风格[：:].*$/m.test(script) ? script.replace(/^风格[：:].*$/m, "风格：v1") : script.replace(/^---\r?\n/, "---\n风格：v1\n");
    } else script = `---\n风格：v1\n---\n${script}`;
    fs.writeFileSync(path.join(dest, "script.md"), script);
    // 仅复用台词与声音；新版本的画面重新制作，不复制旧排版或旧视频。
    const sceneImport = path.relative(dest, path.join(ROOT, "engine/src/kit/ArticleScene")).replace(/\\/g, "/");
    fs.writeFileSync(path.join(dest, "画面.tsx"), `export { ArticleScene as Scene } from ${JSON.stringify(sceneImport)};\n`);
    fs.writeFileSync(path.join(dest, "画面脚本.md"), "# 重做画面\n\n当前使用基础动效，可按台词替换为定制分镜。旧居中文字排版和旧视频不作为新画面来源。\n");
    fs.copyFileSync(path.join(ROOT, "episodes/_template-chapter/status.md"), path.join(dest, "status.md"));
    const dir = `${article}/${target}/${name}`;
    fs.writeFileSync(path.join(dest, "复用配音.json"), JSON.stringify({ source: `${source}/${name}`, speech: speechSettings(dir), inputs: audioInputs(dir) }, null, 2));
  }
  setStatus(article, "阶段", "制作中");
  return target;
}

export function audioInputs(dir: string) {
  return Object.fromEntries(["朗读稿.txt", "朗读稿.演出.txt", "字幕/配音.mp3", "字幕/配音.wav", "字幕/配音.m4a"].filter(f => fs.existsSync(epPath(dir, f))).map(f => [f, sha256(fs.readFileSync(epPath(dir, f)))]));
}

export function reusedAudioIsCurrent(dir: string): boolean {
  try {
    const record = JSON.parse(fs.readFileSync(epPath(dir, "复用配音.json"), "utf8"));
    return JSON.stringify(record.inputs) === JSON.stringify(audioInputs(dir)) && JSON.stringify(record.speech) === JSON.stringify(speechSettings(dir));
  } catch { return false; }
}
