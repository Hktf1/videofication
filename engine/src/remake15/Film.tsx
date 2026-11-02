import React from 'react';
import {AbsoluteFill,Audio,Composition,Folder,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {ensureFont,ensureSansFont} from '../kit/Font';
import {data,P,clamp,prog,shot} from './kit';
import {Understanding} from './Understanding';
import {MazeScene} from './Maze';
import {Reflection} from './Reflection';
import {English15Compositions} from '../english15/Film';

export const CAPTION_STYLE={fontSize:50,bottom:82,width:1560,fadeInFrames:8,fadeOutFrames:6,lineHeight:1.3};
export const Captions:React.FC<{offset?:number}>=({offset=0})=>{
 const f=useCurrentFrame()+offset;
 const visible=data.captions.filter(c=>f>=c.startMs*.03&&f<c.endMs*.03);
 return <>{visible.map((c)=><div key={c.startMs} style={{position:'absolute',bottom:CAPTION_STYLE.bottom,left:(1920-CAPTION_STYLE.width)/2,width:CAPTION_STYLE.width,textAlign:'center',fontFamily:'"Kai", "KaiTi", serif',fontSize:CAPTION_STYLE.fontSize,lineHeight:CAPTION_STYLE.lineHeight,color:P.ink,textShadow:'0 2px 5px rgba(0,0,0,.65)',opacity:Math.min(prog(f,c.startMs*.03,CAPTION_STYLE.fadeInFrames),clamp((c.endMs*.03-f)/CAPTION_STYLE.fadeOutFrames))}}>{c.lines.map((l,i)=><React.Fragment key={i}>{i>0&&<br/>}{l}</React.Fragment>)}</div>)}</>;
};

export const Shot:React.FC<{id:number;standalone?:boolean}>=({id,standalone=false})=>{
 ensureFont();ensureSansFont();
 const f=useCurrentFrame(),s=shot(id);
 return <AbsoluteFill style={{background:P.bg}}>
  <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{position:'absolute'}}>
   {id<=5?<Understanding id={id} f={f}/>:id<=11?<MazeScene id={id} f={f}/>:<Reflection id={id} f={f}/>}
  </svg>
  {standalone&&<><Captions offset={s.from}/>{data.audio.map((a,i)=>{const start=Math.max(a.from,s.from),end=Math.min(a.from+a.duration,s.from+s.duration);return end>start?<Sequence key={i} from={start-s.from} durationInFrames={end-start}><Audio src={staticFile(a.src)} trimBefore={start-a.from}/></Sequence>:null;})}</>}
 </AbsoluteFill>;
};
export const Film=()=>{
 const frame=useCurrentFrame();
 return <AbsoluteFill style={{background:P.bg}}>
  <Sequence name="01 被别人讲懂" from={data.shots[0].from} durationInFrames={data.shots[0].duration}><Shot id={1}/></Sequence>
  <Sequence name="02 不会应用的三种表现" from={data.shots[1].from} durationInFrames={data.shots[1].duration}><Shot id={2}/></Sequence>
  <Sequence name="03 借用作者的知识结构" from={data.shots[2].from} durationInFrames={data.shots[2].duration}><Shot id={3}/></Sequence>
  <Sequence name="04 作者替你完成的工作" from={data.shots[3].from} durationInFrames={data.shots[3].duration}><Shot id={4}/></Sequence>
  <Sequence name="05 阅读顺畅造成误判" from={data.shots[4].from} durationInFrames={data.shots[4].duration}><Shot id={5}/></Sequence>
  <Sequence name="06 第一次进入迷宫" from={data.shots[5].from} durationInFrames={data.shots[5].duration}><Shot id={6}/></Sequence>
  <Sequence name="07 探索与碰壁" from={data.shots[6].from} durationInFrames={data.shots[6].duration}><Shot id={7}/></Sequence>
  <Sequence name="08 建立自己的地图" from={data.shots[7].from} durationInFrames={data.shots[7].duration}><Shot id={8}/></Sequence>
  <Sequence name="09 第二次进入迷宫" from={data.shots[8].from} durationInFrames={data.shots[8].duration}><Shot id={9}/></Sequence>
  <Sequence name="10 迷宫变成一条路" from={data.shots[9].from} durationInFrames={data.shots[9].duration}><Shot id={10}/></Sequence>
  <Sequence name="11 独立应用测试" from={data.shots[10].from} durationInFrames={data.shots[10].duration}><Shot id={11}/></Sequence>
  <Sequence name="12 作者地图与自己的地图" from={data.shots[11].from} durationInFrames={data.shots[11].duration}><Shot id={12}/></Sequence>
  <Sequence name="13 真实问题" from={data.shots[12].from} durationInFrames={data.shots[12].duration}><Shot id={13}/></Sequence>
  <Sequence name="14 拉远视频时间轴" from={data.shots[13].from} durationInFrames={data.shots[13].duration}><Shot id={14}/></Sequence>
  <Sequence name="15 重新审视观看" from={data.shots[14].from} durationInFrames={data.shots[14].duration}><Shot id={15}/></Sequence>
  <Sequence name="16 陷阱与镜子" from={data.shots[15].from} durationInFrames={data.shots[15].duration}><Shot id={16}/></Sequence>
  <Sequence name="17 关闭页面" from={data.shots[16].from} durationInFrames={data.shots[16].duration}><Shot id={17}/></Sequence>
  <Sequence name="18 引导消散" from={data.shots[17].from} durationInFrames={data.shots[17].duration}><Shot id={18}/></Sequence>
  <Sequence name="配音 第1章" from={data.audio[0].from} durationInFrames={data.audio[0].duration}><Audio src={staticFile(data.audio[0].src)}/></Sequence>
  <Sequence name="配音 第2章" from={data.audio[1].from} durationInFrames={data.audio[1].duration}><Audio src={staticFile(data.audio[1].src)}/></Sequence>
  <Sequence name="配音 第3章" from={data.audio[2].from} durationInFrames={data.audio[2].duration}><Audio src={staticFile(data.audio[2].src)}/></Sequence>
  <Audio src={staticFile('bgm/default.mp3')} loop volume={Math.min(.18,frame/18*.18,(data.total-frame)/22*.18)}/>
  <Captions/>
 </AbsoluteFill>;
};

// These scene previews share one deliberately data-controlled timing template.
export const Remake15Compositions=()=><><English15Compositions/><Folder name="15-2D-Remake">
 <Composition id="Knowledge-2D-Narrative-Remake" component={Film} durationInFrames={data.total} fps={30} width={1920} height={1080}/>
 <Folder name="Shots">{data.shots.map(s=><Composition key={s.id} id={`Knowledge-2D-Shot-${String(s.id).padStart(2,'0')}`} component={Shot} durationInFrames={s.duration} fps={30} width={1920} height={1080} defaultProps={{id:s.id,standalone:true}}/>)}</Folder>
</Folder></>;
