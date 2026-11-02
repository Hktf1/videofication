import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderMedia} from '@remotion/renderer';
import {acquireLock, EP_DIR, resolveArticle} from '../lib';
import data from '../../engine/src/remake15/data.json';

async function main(){
 const root=path.resolve(import.meta.dirname,'../..');
 const article=path.join(EP_DIR,resolveArticle('15'));
 const version=path.join(article,'中文-极简2D叙事');
 const outputDir=path.join(article,'out');
 const temp=path.join(root,'.tmp/remake15-render-temp');
 fs.mkdirSync(outputDir,{recursive:true});fs.mkdirSync(temp,{recursive:true});
 process.env.TEMP=temp;process.env.TMP=temp;process.env.TMPDIR=temp;
 acquireLock('render');
 const sha=(p:string)=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 const base='15-为什么听懂了知识但不会应用-中文-极简2D叙事';
 let output=path.join(outputDir,base+'.mp4');
 for(let i=2;fs.existsSync(output);i++)output=path.join(outputDir,`${base}-v${i}.mp4`);
 const existingVideos=fs.readdirSync(article,{recursive:true}).map(String).filter(f=>f.endsWith('.mp4'));
 const originalHashes=Object.fromEntries(existingVideos.map(f=>[f,sha(path.join(article,f))]));
 const textReport=JSON.parse(fs.readFileSync(path.join(version,'文本与音频检查.json'),'utf8'));
 if(!textReport.narrationMatchesOriginal||!textReport.captionTextMatchesNarration)throw Error('文本检查未通过');
 const plain=(s:string)=>s.replace(/[^\p{L}\p{N}]/gu,'');
 if(data.captions.some(c=>c.lines.some(l=>/[\p{P}\s]$/u.test(l))||plain(c.lines.join(''))!==plain(c.text)))throw Error('字幕末尾标点或正文校验失败');
 const browserExecutable=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
 if(!browserExecutable)throw Error('找不到本机 Chrome / Edge');
 console.log(`独立输出：${output}`);
 const serveUrl=await bundle({entryPoint:path.join(root,'engine/src/remake15/index.ts'),publicDir:path.join(root,'engine/public'),outDir:path.join(root,'.tmp/remake15-render-bundle')});
 const browser=await openBrowser('chrome',{browserExecutable});
 try{
  const composition=await selectComposition({serveUrl,id:'Knowledge-2D-Narrative-Remake',puppeteerInstance:browser});
  let last=0;
  await renderMedia({serveUrl,composition,puppeteerInstance:browser,outputLocation:output,overwrite:false,
   codec:'h264',audioCodec:'aac',audioBitrate:'192k',sampleRate:48000,crf:18,x264Preset:'veryfast',pixelFormat:'yuv420p',
   concurrency:Math.min(8,os.availableParallelism()),imageFormat:'jpeg',jpegQuality:95,logLevel:'warn',
   onProgress:p=>{if(Date.now()-last<8000&&p.progress<1)return;last=Date.now();const state={output,frames:p.renderedFrames,total:data.total,percent:Math.round(p.progress*100),done:p.progress===1};fs.writeFileSync(path.join(root,'.tmp/remake15-render-progress.json'),JSON.stringify(state));console.log(`进度 ${state.percent}% · ${state.frames}/${data.total} 帧`);}
  });
 }finally{await browser.close({silent:true});}
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',output],{encoding:'utf8'}));
 const video=probe.streams.find((s:any)=>s.codec_type==='video');const audio=probe.streams.find((s:any)=>s.codec_type==='audio');
 if(video?.width!==1920||video?.height!==1080||video?.r_frame_rate!=='30/1'||!audio||Math.abs(Number(probe.format.duration)-data.total/30)>.1)throw Error('导出参数或音轨不符合要求');
 execFileSync('ffmpeg',['-v','error','-i',output,'-f','null','-'],{stdio:['ignore','ignore','pipe']});
 for(const [f,hash] of Object.entries(originalHashes))if(sha(path.join(article,f))!==hash)throw Error(`已有视频被意外改动：${f}`);
 const inputs=Object.fromEntries(['engine/src/remake15/data.json','engine/public/remake15/1.mp3','engine/public/remake15/2.mp3','engine/public/remake15/3.mp3','engine/public/bgm/default.mp3','engine/public/fonts/simkai.ttf'].map(f=>[f,sha(path.join(root,f))]));
 const engineHash=createHash('sha256');for(const f of fs.readdirSync(path.join(root,'engine/src/remake15')).sort())engineHash.update(f).update(fs.readFileSync(path.join(root,'engine/src/remake15',f)));
 const manifest={renderedAt:new Date().toISOString(),composition:'Knowledge-2D-Narrative-Remake',style:'极简2D动态叙事',captions:'底部楷体，行末无标点，句中标点保留，整组淡入淡出',frames:data.total,fps:30,width:1920,height:1080,seconds:Number(probe.format.duration),bytes:Number(probe.format.size),inputs,engineSha256:engineHash.digest('hex'),dependencies:sha(path.join(root,'package-lock.json')),originalVideosUnchanged:true,originalHashes,decodeCheck:'passed',audioCodec:audio.codec_name,videoCodec:video.codec_name,outputSha256:sha(output)};
 fs.writeFileSync(output+'.manifest.json',JSON.stringify(manifest,null,2));
 fs.writeFileSync(path.join(version,'导出检查.json'),JSON.stringify({...manifest,output},null,2));
 console.log(`完成：${output}\n${manifest.seconds} 秒，${(manifest.bytes/1024/1024).toFixed(1)} MiB，完整解码通过，原视频哈希未变化`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
