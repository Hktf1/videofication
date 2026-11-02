import React from 'react';
import {AbsoluteFill,Composition,Folder,Sequence,Series,useVideoConfig} from 'remotion';
import {EPISODES,STUDIO_EPISODES,type EpisodeEntry} from './episodes';
import {buildTimeline} from './script/timeline';
import {sceneCues} from './script/scene';
import {Episode} from './Episode';
import {MotionSubtitle} from './kit/MotionSubtitle';
import {MOTION,MOTION_FONT} from './style/motion';

const article='05-理解幻觉';
const aVersion='中文-极简动效v1',bVersion='中文-极简动效v1-少字动作';
const belongs=(e:EpisodeEntry)=>e.article?.split('/').at(-1)===article;
const find=(version:string)=>EPISODES.filter(e=>belongs(e)&&e.version===version).sort((a,b)=>a.name.localeCompare(b.name,'zh',{numeric:true}));

const Visual:React.FC<{entry:EpisodeEntry}>=({entry})=>{
 const {items,total}=buildTimeline(entry.script,entry.voice),Scene=entry.Scene;
 const {fps}=useVideoConfig();
 return <AbsoluteFill style={{background:MOTION.bg}}>
  {Scene?<Scene cues={sceneCues(items)} total={total}/>:null}
  {items.map(item=><Sequence key={item.index} from={item.from} durationInFrames={item.frames} premountFor={fps} name={`字幕 ${item.index+1}`}>
   {!item.screen.noSubtitle?<MotionSubtitle text={item.screen.text} {...item.timing}/>:null}
  </Sequence>)}
 </AbsoluteFill>;
};

const ChapterComparison:React.FC<{a:EpisodeEntry;b:EpisodeEntry}>=({a,b})=><AbsoluteFill style={{background:MOTION.bg,fontFamily:MOTION_FONT.sans,color:MOTION.text}}>
 {/* 比较页只有A提供真实音轨；视觉面板不挂音频，避免双声或双倍响度。 */}
 <AbsoluteFill style={{opacity:0,pointerEvents:'none'}}><Episode dir={a.dir}/></AbsoluteFill>
 <div style={{position:'absolute',left:55,top:170,fontSize:42}}>A 原版 · 文字图解</div>
 <div style={{position:'absolute',left:1000,top:170,fontSize:42,color:MOTION.amber}}>B 新版 · 少字动作</div>
 <div style={{position:'absolute',left:55,top:270,width:900,height:506,overflow:'hidden',border:`1px solid ${MOTION.line}`}}>
  <div style={{width:1920,height:1080,transform:'scale(0.46875)',transformOrigin:'top left'}}><Visual entry={a}/></div>
 </div>
 <div style={{position:'absolute',left:1000,top:270,width:900,height:506,overflow:'hidden',border:`1px solid ${MOTION.line}`}}>
  <div style={{width:1920,height:1080,transform:'scale(0.46875)',transformOrigin:'top left'}}><Visual entry={b}/></div>
 </div>
 <div style={{position:'absolute',left:55,top:835,fontSize:30,color:MOTION.muted}}>同步画面 · 相同配音、字幕、BGM与音效 · 可拖动时间线逐段比较</div>
</AbsoluteFill>;

const Comparison:React.FC=()=>{
 const a=find(aVersion),b=find(bVersion),{fps}=useVideoConfig();
 return <Series>{a.map((entry,i)=><Series.Sequence key={entry.id} name={`对比 ${entry.name}`} durationInFrames={buildTimeline(entry.script,entry.voice).total} premountFor={fps}>
  <ChapterComparison a={entry} b={b[i]}/>
 </Series.Sequence>)}</Series>;
};

export const Compare05Registration:React.FC=()=>{
 const a=find(aVersion),b=find(bVersion);
 if(a.length!==3||b.length!==3||!STUDIO_EPISODES.some(belongs))return null;
 // 同声逐帧对比成立的前提是两版字幕切屏与声音时间线完全相同。
 for(let i=0;i<3;i++)if(buildTimeline(a[i].script,a[i].voice).total!==buildTimeline(b[i].script,b[i].voice).total)throw Error('05 两版时长不同，无法同步对比');
 return <Folder name="05-版本对比"><Composition id="compare05-less-text" component={Comparison} width={1920} height={1080} fps={30} durationInFrames={a.reduce((sum,e)=>sum+buildTimeline(e.script,e.voice).total,0)}/></Folder>;
};
