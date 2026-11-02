import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import narration from './narration.json';
import { EP_DIR, resolveArticle } from '../lib';

const root=path.resolve(import.meta.dirname,'../..');
const assets=path.join(root,'engine/public/english15');
const dest=path.join(EP_DIR,resolveArticle('15'),'英文-极简2D叙事');
const plain=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
let from=0;
const scenes=narration.map(scene=>{
 const audio=path.join(assets,`${scene.id}.mp3`);
 const words: {w:string;s:number;e:number}[]=JSON.parse(fs.readFileSync(path.join(assets,`${scene.id}.words.json`),'utf8'));
 if(plain(words.map(w=>w.w).join(''))!==plain(scene.text))throw Error(`Scene ${scene.id}: word metadata does not match narration`);
 const seconds=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',audio],{encoding:'utf8'}));
 if(!Number.isFinite(seconds)||seconds<=0)throw Error('Invalid audio duration');
 const duration=Math.ceil(seconds*30);
 let at=0;
 const timed=words.map(w=>{const start=at;at+=plain(w.w).length;return {...w,start,end:at};});
 const boundary=(at:number)=>timed.find(w=>at>=w.start&&at<w.end)??timed.at(-1)!;
 const flat=plain(scene.text);
 const anchors=Object.fromEntries(Object.entries(scene.anchors).map(([key,phrase])=>{
  const at=flat.indexOf(plain(phrase));
  if(at<0)throw Error(`Missing semantic anchor: ${phrase}`);
  return [key,Math.round(boundary(at).s*30)];
 }));
 // Group source words at phrase boundaries; never split an English word.
 const chunks:string[]=[];
 let buf:string[]=[];
 for(const word of scene.text.split(/\s+/)){
  if([...buf,word].join(' ').length>86&&buf.length){chunks.push(buf.join(' '));buf=[];}
  buf.push(word);
  if(/[.?!]$/.test(word)||(buf.length>=5&&/[,;:]$/.test(word))){chunks.push(buf.join(' '));buf=[];}
 }
 if(buf.length)chunks.push(buf.join(' '));
 const phrases=scene.captions??chunks;
 if(phrases.join(' ')!==scene.text)throw Error(`Scene ${scene.id}: caption phrases change narration`);
 let cursor=0;
 const captions=phrases.map(text=>{
  const start=boundary(cursor).s;
  const end=boundary(cursor+plain(text).length-1).e;
  cursor+=plain(text).length;
  let lines=[text];
  if(text.length>46){
   const spaces=[...text.matchAll(/ /g)].map(m=>m.index!);
   const cost=(at:number)=>Math.abs(at-text.length/2)+(/\b(the|of|to|a|an|for|and|in|your|you've|you|it|is)$/i.test(text.slice(0,at))?22:0)+(Math.max(at,text.length-at-1)>53?100:0);
   const split=spaces.sort((a,b)=>cost(a)-cost(b))[0];
   lines=[text.slice(0,split),text.slice(split+1)];
  }
  return {text,lines,startMs:Math.round(start*1000),endMs:Math.round(end*1000),timestampMs:null,confidence:null};
 });
 captions.forEach((c,i)=>c.endMs=Math.min(Math.round(seconds*1000),captions[i+1]?.startMs??seconds*1000,c.endMs+180));
 if(cursor!==flat.length||captions.some(c=>c.lines.some(l=>l.length>53)||c.endMs<=c.startMs))throw Error('Invalid captions');
 if(words.some((w,i)=>w.s<0||w.e<=w.s||w.e>seconds+.05||(i>0&&w.s<words[i-1].s)))throw Error('Invalid word timing');
 const result={...scene,anchors,from,duration,seconds,src:`english15/${scene.id}.mp3`,sha256:createHash('sha256').update(fs.readFileSync(audio)).digest('hex'),words,captions};
 from+=duration;
 return result;
});
const data={fps:30,width:1920,height:1080,total:from,language:'en-US',voice:'en-US-GuyNeural',scenes};
fs.mkdirSync(dest,{recursive:true});
fs.mkdirSync(path.join(root,'engine/src/english15'),{recursive:true});
fs.writeFileSync(path.join(root,'engine/src/english15/data.json'),JSON.stringify(data,null,2));
fs.writeFileSync(path.join(dest,'时间轴.json'),JSON.stringify(data,null,2));
fs.writeFileSync(path.join(dest,'英文朗读稿.txt'),scenes.map(s=>s.text).join('\n\n'));
const stamp=(ms:number)=>new Date(ms).toISOString().slice(11,23).replace('.',',');
const captions=scenes.flatMap(s=>s.captions.map(c=>({...c,startMs:c.startMs+s.from/30*1000,endMs:c.endMs+s.from/30*1000})));
fs.writeFileSync(path.join(dest,'英文字幕.srt'),captions.map((c,i)=>`${i+1}\n${stamp(c.startMs)} --> ${stamp(c.endMs)}\n${c.lines.join('\n')}\n`).join('\n'));
const report={seconds:from/30,scenes:scenes.length,words:scenes.reduce((n,s)=>n+s.words.length,0),captions:captions.length,wordMetadataMatchesNarration:true,timingSource:'Microsoft Edge TTS WordBoundary; no estimated Chinese timings',renderedVideo:false,voice:data.voice};
fs.writeFileSync(path.join(dest,'检查.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
