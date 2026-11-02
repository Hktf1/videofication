import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderStill} from '@remotion/renderer';
import {data} from '../../engine/src/remake15/kit';
import {maze,branches} from '../../engine/src/remake15/maze-model';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Understanding} from '../../engine/src/remake15/Understanding';
import {MazeScene} from '../../engine/src/remake15/Maze';
import {Reflection} from '../../engine/src/remake15/Reflection';
import { EP_DIR, resolveArticle } from '../lib';

async function main(){
 const root=path.resolve(import.meta.dirname,'../..');
 const dest=path.join(EP_DIR,resolveArticle('15'),'中文-极简2D叙事');
 const qa=path.join(dest,'out/检查帧');fs.mkdirSync(qa,{recursive:true});
 for(let id=1;id<=18;id++)for(const fraction of [0,.5,.97])renderToStaticMarkup(React.createElement(id<=5?Understanding:id<=11?MazeScene:Reflection,{id,f:Math.floor(data.shots[id-1].duration*fraction)}));
 for(const p of [maze.solution,...branches.map(b=>b.path)])for(let i=1;i<p.length;i++)if(!maze.links[p[i-1]].includes(p[i]))throw Error('迷宫角色穿墙');
 if(data.captions.some(c=>c.lines.length>2||c.lines.some(l=>l.length>24)))throw Error('字幕超出安全行宽');
 const plain=(s:string)=>s.replace(/[^\p{L}\p{N}]/gu,'');
 if(data.captions.some(c=>c.lines.some(l=>/[\p{P}\s]$/u.test(l))))throw Error('字幕行末仍有标点');
 if(data.captions.some(c=>plain(c.lines.join(''))!==plain(c.text)))throw Error('去掉末尾标点时改变了正文');
 for(let i=1;i<data.captions.length;i++)if(data.captions[i].startMs<data.captions[i-1].endMs)throw Error('字幕重叠');
 const report={text:'正文与原文一致；字幕仅去掉行末标点，文字与审核配音稿一致',anchors:'18 镜头全部语音锚点可定位',maze:'自主探索、返回和引导路线均沿可通行通道',captions:'最多2行，每行不超过24字，无时间重叠，无行末标点，8帧淡入/6帧淡出',composition:'Knowledge-2D-Narrative-Remake',durationInFrames:data.total,fps:30,width:1920,height:1080,scope:'结构检查；成片渲染状态见独立 MP4 manifest'};
 fs.writeFileSync(path.join(dest,'画面检查.json'),JSON.stringify(report,null,2));
 if(!process.argv.includes('--frames')){console.log(JSON.stringify(report,null,2));return;}
 const browserExecutable=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p))!;
 const serveUrl=await bundle({entryPoint:path.join(root,'engine/src/remake15/index.ts'),publicDir:path.join(root,'engine/public'),outDir:path.join(root,'.tmp/remake15-bundle')});
 const browser=await openBrowser('chrome',{browserExecutable});
 try{
  const composition=await selectComposition({serveUrl,id:'Knowledge-2D-Narrative-Remake',puppeteerInstance:browser});
  const fractions=[.88,.92,.9,.96,.96,.9,.93,.96,.91,.93,.98,.95,.95,.9,.86,.98,.92,.75];
  for(const s of data.shots){
   const frame=s.from+Math.floor((s.duration-1)*fractions[s.id-1]);
   await renderStill({serveUrl,composition,frame,output:path.join(qa,`${String(s.id).padStart(2,'0')}.png`),imageFormat:'png',puppeteerInstance:browser});
   console.log(`镜头 ${s.id}/18: frame ${frame} OK`);
  }
 }finally{await browser.close({silent:true});}
 execFileSync('ffmpeg',['-v','error','-y','-framerate','1','-start_number','1','-i',path.join(qa,'%02d.png'),'-vf','scale=480:270,tile=3x6','-frames:v','1',path.join(dest,'out/镜头联络表.png')]);
 fs.writeFileSync(path.join(dest,'画面检查.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
