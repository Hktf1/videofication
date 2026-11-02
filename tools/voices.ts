// 试听音色：npm run voices [-- "试听文本"]
// 用 Edge TTS 把每个中文音色各合成一句，生成 audition/index.html 试听页
// 想只看列表：npm run voices -- --list
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "audition");
const htmlPath = path.join(outDir, "index.html");
const demo =
  process.argv.slice(2).filter((a) => !a.startsWith("--")).join(" ") ||
  "人坚持的，并不是对的方向，而是感觉对的方向。感觉即情绪，人非机器，所以情绪必有波动。";

type Voice = { id: string; gender: string; styles: string; traits: string; group: string };

const CN_NAMES: Record<string, string> = {
  "zh-CN-XiaoxiaoNeural": "晓晓",
  "zh-CN-XiaoyiNeural": "晓伊",
  "zh-CN-YunjianNeural": "云健",
  "zh-CN-YunxiNeural": "云希",
  "zh-CN-YunxiaNeural": "云夏",
  "zh-CN-YunyangNeural": "云扬",
  "zh-CN-liaoning-XiaobeiNeural": "晓北（东北话）",
  "zh-CN-shaanxi-XiaoniNeural": "晓妮（陕西话）",
  "zh-HK-HiuGaaiNeural": "曉佳",
  "zh-HK-HiuMaanNeural": "曉曼",
  "zh-HK-WanLungNeural": "雲龍",
  "zh-TW-HsiaoChenNeural": "曉臻",
  "zh-TW-HsiaoYuNeural": "曉雨",
  "zh-TW-YunJheNeural": "雲哲",
};

const raw = execFileSync("edge-tts", ["--list-voices"], { encoding: "utf8" });
const voices: Voice[] = raw
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => /^[a-z]{2}-[A-Z]{2}-[A-Za-z-]+Neural/.test(line))
  .map((line) => {
    const [id, gender, styles, ...traits] = line.split(/\s{2,}/);
    const group = id.startsWith("zh-CN")
      ? "普通话"
      : id.startsWith("zh-HK")
        ? "粤语"
        : id.startsWith("zh-TW")
          ? "台湾国语"
          : "多语种（可读中文）";
    return { id, gender, styles, traits: traits.join(" / "), group };
  })
  .filter((v) => v.id.startsWith("zh-") || v.id.includes("Multilingual"));

if (process.argv.includes("--list")) {
  for (const v of voices) console.log(`${v.group}\t${v.id}\t${v.gender}\t${v.styles}\t${v.traits}`);
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });
const order = ["普通话", "粤语", "台湾国语", "多语种（可读中文）"];
const rows: string[] = [];
const redo = process.argv.includes("--redo");
const CURRENT = "zh-CN-YunjianNeural"; // 与 tools/tts.ts 的 VOICE 保持一致

for (const v of voices) {
  const mp3 = `${v.id}.mp3`;
  const mp3Path = path.join(outDir, mp3);
  if (!redo && fs.existsSync(mp3Path)) {
    console.log(`跳过 ${v.id}（已有，--redo 重合成）`);
  } else {
    process.stdout.write(`合成 ${v.id} … `);
    execFileSync("edge-tts", ["--voice", v.id, "--text", demo, "--write-media", mp3Path], {
      stdio: "ignore",
    });
    console.log("ok");
  }
  const cn = CN_NAMES[v.id];
  const badge = v.id === CURRENT ? ` <span class="badge">当前使用</span>` : "";
  rows.push(
    `<tr data-group="${v.group}" data-id="${v.id}">` +
      `<td><div class="name">${cn ?? v.id}${badge}</div>` +
      `<code>${v.id}</code><div class="meta">${v.gender} · ${v.styles}${v.traits ? ` · ${v.traits}` : ""}</div></td>` +
      `<td><audio controls preload="none" src="${mp3}"></audio></td></tr>`
  );
}

const sections = order
  .map((g) => {
    const groupRows = rows.filter((r) => r.includes(`data-group="${g}"`));
    return groupRows.length ? `<h2>${g}</h2><table>${groupRows.join("")}</table>` : "";
  })
  .join("\n");

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Edge TTS 音色试听</title>
<style>
  :root { color-scheme: light dark; }
  body { max-width: 860px; margin: 32px auto; padding: 0 20px;
         font: 15px/1.6 system-ui, "Microsoft YaHei", sans-serif; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 15px; margin: 28px 0 8px; opacity: .6; font-weight: 600; }
  .demo { color: #888; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 10px 8px; border-bottom: 1px solid rgba(128,128,128,.22); vertical-align: middle; }
  td:last-child { width: 300px; }
  code { font-size: 13px; }
  .name { font-size: 15px; font-weight: 600; }
  .badge { font-size: 11px; font-weight: 400; color: #0a7; border: 1px solid currentColor;
           border-radius: 999px; padding: 0 7px; margin-left: 6px; vertical-align: 1px; }
  .meta { font-size: 12px; color: #888; margin-top: 2px; }
  audio { width: 100%; height: 34px; }
  button { font: inherit; padding: 6px 14px; border-radius: 8px; cursor: pointer;
           border: 1px solid rgba(128,128,128,.4); background: transparent; color: inherit; }
  tr.playing td { background: rgba(120,160,255,.12); }
</style></head><body>
<h1>Edge TTS 音色试听</h1>
<p class="demo">试听文本：${escapeHtml(demo)}</p>
<button id="playAll">依次播放全部</button>
${sections}
<script>
const audios = [...document.querySelectorAll("audio")];
document.getElementById("playAll").onclick = async (e) => {
  if (e.target.dataset.on === "1") { e.target.dataset.on = "0"; e.target.textContent = "依次播放全部"; return; }
  e.target.dataset.on = "1"; e.target.textContent = "停止";
  for (const a of audios) {
    if (e.target.dataset.on !== "1") break;
    document.querySelectorAll("tr.playing").forEach(t => t.classList.remove("playing"));
    a.closest("tr").classList.add("playing");
    await new Promise((resolve) => {
      a.onended = resolve;
      a.currentTime = 0;
      a.play().catch(resolve);
    });
  }
  e.target.dataset.on = "0"; e.target.textContent = "依次播放全部";
  document.querySelectorAll("tr.playing").forEach(t => t.classList.remove("playing"));
};
</script>
</body></html>
`;

fs.writeFileSync(htmlPath, html);
console.log(`\n✓ 试听页：${path.relative(root, htmlPath)}（${voices.length} 个音色）`);

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
