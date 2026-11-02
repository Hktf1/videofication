import React from 'react';
import {AbsoluteFill,Audio,Composition,Folder,Sequence,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {Understanding,type UnderstandingPresentation} from '../remake15/Understanding';
import {P,prog,clamp,shot as originalShot,txt} from '../remake15/kit';
import data from './data.json';

const labels:Record<string,string>={
 '听懂了，为什么用不出来？':"You understand it. Why can't you use it?",
 '无法调用':"Can't apply it",'回忆模糊':'Vague recall','方案无效':'No real progress',
 '知识理解幻觉':'The illusion of understanding',
 '作者的知识结构':"The author's knowledge structure",'学习者':'The learner',
 '案例':'Example','清晰的逻辑连接':'Connected reasoning','安排顺序':'Putting ideas in order',
 '保留关键':'Keeping what matters','完整的知识结构':'The full knowledge structure',
 '阅读顺畅':'Reading feels easy','自己的结构':'Your own structure','我懂了':'I get it',
};

const presentation:UnderstandingPresentation={
 word:(id,needle)=>{
  const s=data.scenes[id-1];
  const at=(s.anchors as Record<string,number|undefined>)[needle];
  if(at===undefined)throw Error(`Missing English anchor ${id}: ${needle}`);
  return at;
 },
 W:(id,f,needle,d=24)=>prog(f,presentation.word(id,needle),d),
 shot:id=>({...originalShot(id),duration:data.scenes[id-1].duration,from:data.scenes[id-1].from}),
 txt:(x,y,text,size=36,color=P.ink,anchor='middle',opacity=1)=>{
  if(!labels[text])throw Error(`Missing English label: ${text}`);
  const display=labels[text];
  const adjusted=text==='知识理解幻觉'?64:text==='阅读顺畅'?26:text==='作者的知识结构'?30:size;
  return txt(x,y,display,adjusted,color,anchor,opacity);
 },
};

export const EnglishScene:React.FC<{id:number}>=({id})=>{
 const f=useCurrentFrame(),{fps}=useVideoConfig(),s=data.scenes[id-1];
 return <AbsoluteFill style={{background:P.bg}}>
  <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{position:'absolute',fontFamily:'Arial, sans-serif'}}>
   <Understanding id={id} f={f} presentation={presentation}/>
  </svg>
  <Audio src={staticFile(s.src)}/>
  {s.captions.filter(c=>f>=c.startMs*fps/1000&&f<c.endMs*fps/1000).map(c=><div key={c.startMs} style={{position:'absolute',bottom:82,left:180,width:1560,textAlign:'center',fontFamily:'Georgia, "Times New Roman", serif',fontSize:50,lineHeight:1.3,color:P.ink,textShadow:'0 2px 5px rgba(0,0,0,.65)',whiteSpace:'pre-wrap',opacity:Math.min(prog(f,c.startMs*fps/1000,8),clamp((c.endMs*fps/1000-f)/6))}}>{c.lines.join('\n')}</div>)}
 </AbsoluteFill>;
};

export const EnglishFilm=()=>{
 const f=useCurrentFrame(),{fps}=useVideoConfig();
 return <AbsoluteFill style={{background:P.bg}}>
  <Sequence name="01 Someone else's explanation" from={data.scenes[0].from} durationInFrames={data.scenes[0].duration} premountFor={fps}><EnglishScene id={1}/></Sequence>
  <Sequence name="02 Three signs of an illusion" from={data.scenes[1].from} durationInFrames={data.scenes[1].duration} premountFor={fps}><EnglishScene id={2}/></Sequence>
  <Sequence name="03 Borrowing the author's structure" from={data.scenes[2].from} durationInFrames={data.scenes[2].duration} premountFor={fps}><EnglishScene id={3}/></Sequence>
  <Sequence name="04 The author's work" from={data.scenes[3].from} durationInFrames={data.scenes[3].duration} premountFor={fps}><EnglishScene id={4}/></Sequence>
  <Sequence name="05 Mistaking fluency for understanding" from={data.scenes[4].from} durationInFrames={data.scenes[4].duration} premountFor={fps}><EnglishScene id={5}/></Sequence>
  <Audio src={staticFile('bgm/default.mp3')} loop volume={Math.min(.18,f/18*.18,(data.total-f)/22*.18)}/>
 </AbsoluteFill>;
};

export const English15Compositions=()=><Folder name="15-English-Preview">
 <Composition id="Knowledge-English-Chapter-1" component={EnglishFilm} durationInFrames={data.total} fps={30} width={1920} height={1080}/>
 {/* All scene previews intentionally use the same data-controlled template. */}
 <Folder name="English-Scenes">{data.scenes.map(s=><Composition key={s.id} id={`Knowledge-English-Scene-${s.id}`} component={EnglishScene} durationInFrames={s.duration} fps={30} width={1920} height={1080} defaultProps={{id:s.id}}/>)}</Folder>
</Folder>;
