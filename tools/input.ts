import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import mammoth from "mammoth";
import { parseScript, plainText } from "../engine/src/script/parse";
import { isMotionStyle } from "../engine/src/script/motion";
import { articleNo, createVersion, currentVersion, epPath, languageOfVersion, listVersionChapters, listVersions, normalizeVersionName, resolveVersion, ROOT, setStatus, versionStyle } from "./lib";
import { parsePerformance } from "./perform";

export const textIdentity = (text: string) => text.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "");
export const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
export type InputRecord = {
  mode: "article" | "user-script";
  kind: "prose" | "production";
  source: string;
  snapshot: string;
  sha256: string;
  fingerprint: string;
  narrationIdentity: string;
  scriptSha256?: string;
};

/** 只做字幕切屏，不增删字词；优先在标点断开，英文保留词间空格。 */
export function proseScreens(text: string): string[] {
  const out: string[] = [];
  for (const line of text.replace(/\r\n/g, "\n").split(/\n+/).filter(l => l.trim())) {
    let pending = "";
    let count = 0;
    for (const unit of line.trim().match(/\S+\s*|\s+/g) ?? []) {
      // 中文没有词间空格，逐字符处理；英文按词处理。
      const pieces = /[\u3400-\u9fff]/.test(unit) ? [...unit] : [unit];
      for (const piece of pieces) {
        const length = textIdentity(piece).length;
        if (count + length > 18 && pending.trim()) {
          out.push(pending.trim()); pending = ""; count = 0;
        }
        if (length > 18) {
          for (const c of piece) {
            if (count >= 18) { out.push(pending.trim()); pending = ""; count = 0; }
            pending += c; count += textIdentity(c).length;
          }
        } else { pending += piece; count += length; }
        if (/[。！？!?；;，,]$/.test(pending) && count >= 8) {
          out.push(pending.trim()); pending = ""; count = 0;
        }
      }
    }
    if (pending.trim()) out.push(pending.trim());
  }
  return out;
}

async function readText(file: string): Promise<string> {
  if (path.extname(file).toLowerCase() === ".docx") return (await mammoth.extractRawText({ path: file })).value;
  if (!/\.(txt|md)$/i.test(file)) throw new Error("输入仅支持 .docx、.txt、.md；处理稿目录请指向其中的 script.md。");
  return fs.readFileSync(file, "utf8");
}

/** 只调整文件导入位置，用户画面代码与依赖仍按原设计执行。 */
export function relocateScene(source: string, from: string, to: string): string {
  return source.replace(/((?:from\s*|import\s*(?:\(\s*)?)["'])(\.{1,2}\/[^"']+)(["'])/g, (_match, before, specifier, after) => {
    const relative = path.relative(to, path.resolve(from, specifier)).replace(/\\/g, "/");
    return before + (relative.startsWith(".") ? relative : `./${relative}`) + after;
  });
}

export async function prepareArticle(article: string, options: { script?: string; version?: string; dry?: boolean } = {}) {
  let version = options.version ? resolveVersion(article, options.version) : currentVersion(article);
  let chapters = listVersionChapters(article, version);
  // 已准备好的章节原样继续，不按原文重新写稿。显式脚本始终优先。
  if (!options.script && chapters.length && (!version || versionStyle(article, version) === "v1")) {
    return { version, chapters, prepared: false };
  }
  const source = options.script ? path.resolve(options.script) : (() => {
    const txt = epPath(article, "source.txt");
    if (fs.existsSync(txt) && fs.readFileSync(txt, "utf8").trim()) return txt;
    const docs = fs.readdirSync(epPath(article)).filter(f => /\.docx$/i.test(f) && !f.startsWith("~$"));
    if (docs.length !== 1) throw new Error("请在指定文章目录放一份原始 .docx 或 source.txt；多个 docx 时先明确提取要使用的原文。");
    return epPath(article, docs[0]);
  })();
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) throw new Error(`输入文件不存在：${source}`);
  const bytes = fs.readFileSync(source);
  const text = await readText(source);
  if (!text.trim() || !textIdentity(text)) throw new Error("输入文章或脚本为空。");
  const parsed = parseScript(text);
  const production = !!options.script && (path.basename(source).toLowerCase() === "script.md" || /^\uFEFF?---\r?\n/.test(text) || /\|\s*(画面[:：]|停留|重点|亮起|金句|主旨|分段)/m.test(text));
  if (production && (!isMotionStyle(parsed.meta) || parsed.errors.length || !parsed.screens.length)) {
    throw new Error("用户处理稿格式或风格无效；保留原稿并停止，请修正输入，不会另写脚本替代。");
  }
  if (!production && /^(?:#{1,6}\s|\|)|^(?:镜头|画面|旁白|配音|时长|时间码)[：:]/m.test(text)) {
    throw new Error("输入含分镜表、Markdown 标题或旁白标签，请提供项目 script.md 格式或纯口播正文，避免把制作说明当作台词；原稿不会被改写。");
  }
  const narrationFile = path.join(path.dirname(source), "朗读稿.txt");
  const narration = production ? (fs.existsSync(narrationFile) ? fs.readFileSync(narrationFile, "utf8") : parsed.screens.map(s => s.spoken).join("\n")) : text;
  const lines = production ? parsed.screens.map(s => s.text) : proseScreens(text);
  if (!lines.length || textIdentity(lines.map(plainText).join("")) !== textIdentity(narration)) {
    throw new Error("处理稿与朗读稿的台词不一致；不会用原文覆盖用户脚本，请修正输入。");
  }
  const hash = sha256(bytes);
  const companions: Record<string, string> = {};
  if (production) for (const name of ["朗读稿.txt", "朗读稿.演出.txt", "画面.tsx", "画面脚本.md"]) {
    const file = path.join(path.dirname(source), name);
    if (fs.existsSync(file)) companions[name] = fs.readFileSync(file, "utf8");
  }
  const fingerprint = sha256(JSON.stringify({ source: hash, companions }));
  const mode = options.script ? "user-script" : "article";
  // 新输入进入独立版本，已有制作稿与配音不会被覆盖。
  const candidate = `${languageOfVersion(version)}-极简动效v1-${mode === "user-script" ? "用户脚本" : "原文"}-${fingerprint.slice(0, 10)}`;
  if (options.script || !version || versionStyle(article, version) !== "v1") version = candidate;
  if (options.version && version !== normalizeVersionName(options.version)) {
    // --version 是明确目标；只有空版本或同一输入的版本允许导入。
    version = resolveVersion(article, options.version);
    if (versionStyle(article, version) !== "v1") throw new Error("不能把新输入写入停用风格，请选择极简动效 V1 版本。");
  }
  const base = epPath(article, version);
  const chapter = `${articleNo(article)}-1-全文`;
  chapters = listVersionChapters(article, version);
  if (chapters.length) {
    const record = path.join(base, "制作输入.json");
    if (!fs.existsSync(record) || JSON.parse(fs.readFileSync(record, "utf8")).fingerprint !== fingerprint) {
      throw new Error("目标版本已有其他制作内容，不覆盖；请新建空版本后导入脚本。");
    }
    if (!options.dry) setStatus(article, "当前版本", version);
    return { version, chapters, prepared: false };
  }
  const dir = path.join(base, chapter);
  const relativeImport = path.relative(dir, path.join(ROOT, "engine/src/kit/ArticleScene")).replace(/\\/g, "/");
  const script = production ? text : `---\n风格：v1\n标题：${path.basename(article).replace(/^\d+-/, "")}\nBGM：default.mp3\n---\n## ${articleNo(article)}-1 全文\n${lines.join("\n")}\n`;
  if (textIdentity(parseScript(script).screens.map(s => plainText(s.text)).join("")) !== textIdentity(narration))
    throw new Error("正文含有会被解释为处理稿语法的符号，无法无损切屏；请提供明确的项目处理稿，不会省略或改写台词。");
  const sidecar = (name: string) => companions[name];
  const scene = sidecar("画面.tsx");
  const hasMarkers = production && parsed.screens.some(s => s.scene);
  if (sidecar("画面脚本.md")?.trim() && !scene && !hasMarkers)
    throw new Error("用户已提供画面设计但尚无画面实现；请按设计补齐画面.tsx，不会用基础画面替代用户分镜。");
  const performance = sidecar("朗读稿.演出.txt") ?? narration.split(/\r?\n/).map(l => l.startsWith("@") ? `@${l}` : l).join("\n");
  const performanceErrors = parsePerformance(performance, narration).errors;
  if (performanceErrors.length) throw new Error(`演出稿无效：${performanceErrors.map(e => e.msg).join("；")}。不会另写台词替代。`);
  const record: InputRecord = {
    mode, kind: production ? "production" : "prose", source, snapshot: `输入原稿${path.extname(source).toLowerCase()}`,
    sha256: hash, fingerprint, narrationIdentity: sha256(textIdentity(narration)),
    ...(production ? { scriptSha256: sha256(script) } : {}),
  };
  if (!options.dry) {
    if (!listVersions(article).includes(version)) createVersion(article, version);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(base, record.snapshot), bytes);
    if (Object.keys(companions).length) {
      fs.mkdirSync(path.join(base, "输入附件"), { recursive: true });
      for (const [name, content] of Object.entries(companions)) fs.writeFileSync(path.join(base, "输入附件", `${name}.txt`), content);
    }
    fs.writeFileSync(path.join(dir, "script.md"), script);
    fs.writeFileSync(path.join(dir, "朗读稿.txt"), narration);
    fs.writeFileSync(path.join(dir, "朗读稿.演出.txt"), performance);
    // 有用户分镜就直接读用户分镜；没有才使用中性基础画面。
    if (scene || !hasMarkers) fs.writeFileSync(path.join(dir, "画面.tsx"), scene ? relocateScene(scene, path.dirname(source), dir) : `export { ArticleScene as Scene } from ${JSON.stringify(relativeImport.startsWith(".") ? relativeImport : "./" + relativeImport)};\n`);
    fs.writeFileSync(path.join(dir, "画面脚本.md"), sidecar("画面脚本.md") ?? "# 基础动效\n\n按原稿逐屏展示文字与阅读进度，不生成额外论断。字幕和画面跟随真实配音时序。\n");
    fs.copyFileSync(path.join(ROOT, "episodes/_template-chapter/status.md"), path.join(dir, "status.md"));
    fs.writeFileSync(path.join(base, "制作输入.json"), JSON.stringify(record, null, 2));
    setStatus(article, "当前版本", version);
    setStatus(article, "阶段", "制作中");
  }
  console.log(`${options.dry ? "将准备" : "已准备"}：${article}/${version}，${record.mode === "user-script" ? "直接使用用户脚本" : "使用原始文章"}（${lines.length} 屏，${production ? "处理稿原样导入" : "只切屏，不改写正文"}）`);
  return { version, chapters: [chapter], prepared: true };
}

/** 用户脚本优先级是可检查的约束，防止后续工具又按文章重写台词。 */
export function checkInputContract(dir: string): string[] {
  const base = path.dirname(epPath(dir));
  const file = path.join(base, "制作输入.json");
  if (!fs.existsSync(file)) return [];
  try {
    const input: InputRecord = JSON.parse(fs.readFileSync(file, "utf8"));
    if (input.mode !== "user-script") return [];
    const errors: string[] = [];
    if (path.basename(input.snapshot) !== input.snapshot || sha256(fs.readFileSync(path.join(base, input.snapshot))) !== input.sha256) errors.push("用户脚本快照已改变，请重新导入原始脚本。");
    const narration = fs.readFileSync(epPath(dir, "朗读稿.txt"), "utf8");
    if (sha256(textIdentity(narration)) !== input.narrationIdentity) errors.push("朗读稿偏离用户脚本，禁止按文章另写台词。");
    const script = fs.readFileSync(epPath(dir, "script.md"), "utf8");
    if (textIdentity(parseScript(script).screens.map(s => plainText(s.text)).join("")) !== textIdentity(narration)) errors.push("字幕台词与用户脚本不一致。");
    if (input.scriptSha256 && sha256(script) !== input.scriptSha256) errors.push("用户提供的处理稿被修改，请恢复原稿或重新导入；不会自动重写。");
    return errors;
  } catch (error) { return [`无法验证用户脚本：${(error as Error).message}`]; }
}
