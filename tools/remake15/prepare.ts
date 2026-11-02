import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import mammoth from 'mammoth';
import { EP_DIR, resolveArticle } from '../lib';
import {alignVoice, type Word} from '../../engine/src/script/sync';

async function main() {
const root = path.resolve(import.meta.dirname, '../..');
const article = path.join(EP_DIR, resolveArticle('15'));
const dest = path.join(article, '中文-极简2D叙事');
const voiceSource = path.join(article, '中文-极简动效v1');
const out = path.join(root, 'engine/src/remake15');
const publicDir = path.join(root, 'engine/public/remake15');
for (const d of [dest, out, publicDir]) fs.mkdirSync(d, {recursive: true});
const read = (p: string) => fs.readFileSync(p, 'utf8');
const plain = (s: string) => [...s].filter(c => /[\p{L}\p{N}]/u.test(c)).join('');
const hash = (p: string) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const source = read(path.join(article, 'source.txt'));
const docx = await mammoth.extractRawText({path: path.join(article, '为什么听懂了知识但不会应用？.docx')});
if (source.replace(/\s/g, '') !== docx.value.replace(/\s/g, '')) throw Error('DOCX 与 source.txt 不一致');
let offset = 0;
let narrative = '';
const glyphs: {c: string; s: number; e: number}[] = [];
const audio: {src: string; from: number; duration: number; sha256: string}[] = [];
const reports: unknown[] = [];
for (const name of fs.readdirSync(voiceSource).filter(d => /^15-\d-/.test(d)).sort()) {
  const d = path.join(voiceSource, name);
  const text = read(path.join(d, '朗读稿.txt')).trim();
  const words: Word[] = JSON.parse(read(path.join(d, '字幕/逐字.json')));
  const aligned = alignVoice(text, words);
  if (aligned.missing.length || aligned.extra.length || aligned.coverage < .98) throw Error('配音缺段或对齐率不足');
  const file = path.join(d, '字幕/配音.mp3');
  const seconds = Number(execFileSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','csv=p=0',file], {encoding:'utf8'}));
  const duration = Math.ceil(seconds * 30);
  fs.copyFileSync(file, path.join(publicDir, `${audio.length + 1}.mp3`));
  audio.push({src: `remake15/${audio.length + 1}.mp3`, from: offset, duration, sha256: hash(file)});
  glyphs.push(...aligned.src.map((c,i) => ({c, s: aligned.start[i] + offset/30, e: aligned.end[i] + offset/30})));
  reports.push({chapter: name, coverage: aligned.coverage, missing: aligned.missing, extra: aligned.extra, seconds});
  narrative += (narrative ? '\n\n' : '') + text;
  offset += duration;
}
if (plain(narrative) !== plain(source)) throw Error('配音稿改动了原文正文');
const flat = plain(narrative);
const starts = [
 ['被别人讲懂','为什么听懂了知识'], ['不会应用的三种表现','某个知识，在学习'],
 ['借用作者的知识结构','当你通过阅读教材'], ['作者替你完成的工作','讲述知识的作者'],
 ['阅读顺畅造成误判','这会让你读起来'], ['第一次进入迷宫','这就像你需要'],
 ['探索与碰壁','你需要先试着走这条路'], ['建立自己的地图','就这样思考'],
 ['第二次进入迷宫','但是，如果有一个'], ['迷宫变成一条路','在你的感知里'],
 ['独立应用测试','并且，讽刺的是'], ['作者的地图不等于自己的地图','顺畅的阅读是因为'],
 ['真实问题不会提供标准提示','学习的时候，知识'], ['视频本身就是安排好的路线','同样的，你现在'],
 ['重新审视观看过程','我用迷宫的比喻'], ['陷阱','但这恰恰就是陷阱本身'],
 ['理解再次消失','如果你只是顺畅地'], ['结束','你只是又被我'],
];
let cursor = 0;
const shots = starts.map(([title, needle],i) => {
  const at = flat.indexOf(plain(needle), cursor);
  if (at < 0) throw Error(`镜头定位失败: ${title}`);
  cursor = at;
  return {id:i+1,title,at,from: i === 0 ? 0 : Math.round(glyphs[at].s * 30), duration:0};
});
shots.forEach((s,i) => s.duration = (shots[i+1]?.from ?? offset) - s.from);
const eventSpecs: [number,string,string][] = [
 [1,'而是','作者整理网络，学习者沿橙线前进'],[1,'讲懂','出现主观理解对勾'],
 [2,'遇到具体问题','引导中断，进入应用测试'],[2,'一脸茫然','知识节点熄暗，调用路径中断'],[2,'磕磕绊绊','节点错位，仅余模糊关联'],[2,'头头是道','方案卡连续输出，现实问题不变'],[2,'这就是在学习过程中','三个区域合并为知识理解幻觉'],
 [3,'借用作者的知识结构','作者网络抽出橙线，学习者沿线行动'],
 [4,'可以省略','删除次要枝节'],[4,'先讲什么','重新排列关键节点'],[4,'例子合适','案例接入逻辑主干'],[4,'逻辑紧密','知识链形成畅通道路'],
 [5,'顺畅','顺畅指标增长，自己的结构保持零散'],[5,'本能机制','主观对勾出现'],[5,'误判','对勾裂开'],
 [6,'迷宫','道路匹配至迷宫入口'],[6,'无人指导','角色进入迷宫'],[6,'分岔路口','角色停在第一个岔路'],[6,'判断','观察两条实际通道'],
 [7,'走不通','角色抵达第一处死墙'],[7,'标记','失败路线染红并留标记'],[7,'返回','沿原通道退回'],[7,'另一条路','选择另一支路'],[7,'下一个路口','抵达新的决策点'],[7,'你很可能','再次进入错误通道'],[7,'那条死路','第二次碰壁并标红'],[7,'再返回','再次回到路口'],
 [8,'再选择','继续尝试，已探索的路线保留'],[8,'走出迷宫','抵达出口，墙淡去，形成自己的地图'],
 [9,'直走100米','橙色指引从入口延伸'],[9,'左转','按指令跟随路线'],[9,'红色石头','红石地标出现'],[9,'右拐','按下一个指令移动'],[9,'一条河','河流出现'],[9,'三座桥','三座桥显现'],[9,'第二座桥','第二桥被指引点亮'],[9,'就是出口','跟随路线接近出口'],
 [10,'变成了一条路','墙退下，岔路消失，路径拉直'],[10,'十分顺利且快速','快速抵达，出现主观完成对勾'],
 [11,'前者','自主探索者自评效果差'],[11,'后者','接受指导者自评到位'],[11,'实际效果则是相反','进入同一新迷宫，左侧探索、右侧等待旧指引'],
 [12,'作者的知识结构','两张地图重叠'],[12,'作者的理解','作者地图移走，显露自己的残缺网络'],[12,'自己的知识结构','尝试建立自主连接'],
 [13,'实际问题','模型标签消失，关系与空间位置改变'],[13,'应用','套用接口无法对齐'],
 [14,'精心编排','拉远成视频时间轴，以橙线连接全部片段'],
 [15,'迷宫的比喻','重访迷宫图像'],[15,'顺畅阅读的陷阱','重访知识结构'],[15,'两种学习者','重访对比实验'],[15,'逻辑层层递进','片段连成理解路线'],[15,'情绪','观看者显现于路线下方'],
 [16,'陷阱本身','我懂了的门开启，门后出现观看者镜像'],
 [17,'说得太对','观看者头顶出现主观对勾'],[17,'关掉页面','视频关闭，屏幕知识网络熄灭'],[17,'并没有真正学到','残存节点和对勾消失'],
 [18,'临时借用','作者橙线靠近，但没有接入学习者网络'],[18,'处理轻松','再次出现主观理解对勾'],[18,'幻觉','橙线、对勾消散，画面渐暗'],
];
const events=eventSpecs.map(([id,phrase,event])=>{
 const s=shots[id-1],at=flat.indexOf(plain(phrase),s.at);
 if(at<s.at||(shots[id]&&at>=shots[id].at))throw Error(`事件锚点越界 ${id} ${phrase}`);
 return {shot:id,phrase,event,frame:Math.round(glyphs[at].s*30)};
});

// Keep the reviewed narration's punctuation. Groups are contiguous source slices.
const chunks: string[] = [];
for (const paragraph of narrative.split(/\n\s*\n/)) {
  const clauses = paragraph.match(/[^，。；：！？、]+[，。；：！？、]*[”’]*/g) ?? [paragraph];
  let buf = '';
  for (let clause of clauses) {
    while (clause.length > 30) {
      if (buf) {chunks.push(buf); buf = '';}
      chunks.push(clause.slice(0,26)); clause = clause.slice(26);
    }
    if (buf.length + clause.length > 30) {chunks.push(buf); buf = '';}
    buf += clause;
    if (buf.length >= 14 && /[，。；！？][”’]*$/.test(buf)) {chunks.push(buf); buf = '';}
  }
  if (buf) chunks.push(buf);
}
if (chunks.join('').replace(/\s/g,'') !== narrative.replace(/\s/g,'')) throw Error('字幕切分丢失标点或文字');
cursor = 0;
const captions = chunks.filter(t=>plain(t)).map(text => {
  const length = plain(text).length;
  const first = glyphs[cursor], last = glyphs[cursor + length-1];
  cursor += length;
  const lines = [text];
  if (text.length > 24) {
    let split = Math.ceil(text.length/2);
    const opts = [...text].map((c,i) => /[，；：、]/.test(c) ? i+1 : -1).filter(i => i>7 && i<24 && text.length-i <=24);
    if (opts.length) split = opts.sort((a,b)=>Math.abs(a-text.length/2)-Math.abs(b-text.length/2))[0];
    lines.splice(0,1,text.slice(0,split),text.slice(split));
  }
  // Only the displayed line endings change; narration, raw text and timing stay intact.
  const displayLines = lines.map(line => line.replace(/[\p{P}\s]+$/u, ''));
  return {text, lines:displayLines, startMs: Math.round(first.s*1000), endMs: Math.round(last.e*1000), timestampMs:null, confidence:null};
});
if (cursor !== glyphs.length) throw Error('字幕字数不完整');
captions.forEach((c,i) => c.endMs = Math.max(c.endMs, Math.min(c.endMs+180, captions[i+1]?.startMs ?? offset/30*1000)));
const data = {fps:30,width:1920,height:1080,total:offset,narrative,audio,shots, glyphs,captions,events};
fs.writeFileSync(path.join(out,'data.json'),JSON.stringify(data,null,2));
fs.writeFileSync(path.join(dest,'旁白与字幕.txt'),narrative);
fs.writeFileSync(path.join(dest,'时间轴.json'),JSON.stringify(data,null,2));
const stamp = (frame:number) => `${Math.floor(frame/1800).toString().padStart(2,'0')}:${(frame/30%60).toFixed(2).padStart(5,'0')}`;
let md = '# 2D 叙事重制版 · 旁白时间轴\n\n原文正文完整保留；旁白标点沿用已有审核朗读稿，底部字幕每行末尾标点隐藏，句中标点保留。表格保存旁白原始文本，实际字幕见同步字幕.srt。配音复制自原版，不重配、不改变语速。所有时间来自逐字语音对齐。\n\n';
md += '| 镜头 | 叙事 | 开始 | 结束 |\n|---|---|---|---|\n';
shots.forEach(s=>md+=`| ${s.id.toString().padStart(2,'0')} | ${s.title} | ${stamp(s.from)} | ${stamp(s.from+s.duration)} |\n`);
md += '\n每组字幕、旁白、镜头编号与关键语音锚点：\n\n| 开始 | 结束 | 镜头 | 原文字幕 | 动态事件 |\n|---|---|---|---|---|\n';
captions.forEach(c=>{const start=c.startMs*.03,end=c.endMs*.03;const ids=shots.filter(s=>s.from<end&&s.from+s.duration>start).map(s=>s.id);const ev=events.filter(e=>e.frame>=start&&e.frame<end);const previous=events.filter(e=>e.frame<=start).at(-1);md+=`| ${stamp(start)} | ${stamp(end)} | ${ids.join('→')} | ${c.text} | ${ev.map(e=>e.event).join('；')||previous?.event||'书与知识网络建立'} |\n`;});
md+='\n关键事件精确时刻：\n\n| 镜头 | 语音锚点 | 时刻 | 动作 |\n|---|---|---|---|\n';
events.forEach(e=>md+=`| ${e.shot} | ${e.phrase} | ${stamp(e.frame)} | ${e.event} |\n`);
fs.writeFileSync(path.join(dest,'旁白时间轴.md'),md);
const srtTime=(ms:number)=>new Date(ms).toISOString().slice(11,23).replace('.',',');
fs.writeFileSync(path.join(dest,'同步字幕.srt'),captions.map((c,i)=>`${i+1}\n${srtTime(c.startMs)} --> ${srtTime(c.endMs)}\n${c.lines.join('\n')}\n`).join('\n'));
fs.writeFileSync(path.join(dest,'文本与音频检查.json'),JSON.stringify({originalCharacters:flat.length,docxMatchesSource:true,narrationMatchesOriginal:true,captionTextMatchesNarration:true, punctuation:'旁白沿用已审稿；字幕隐藏每行末尾标点，句中标点保留',totalFrames:offset,seconds:offset/30,shots:18,captions:captions.length,reports,audio},null,2));
console.log(JSON.stringify({totalFrames:offset,seconds:offset/30,shots:shots.map(s=>({id:s.id,title:s.title,from:stamp(s.from),seconds:s.duration/30})),captions:captions.length,reports},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
