import React from 'react';
import {Camera,Check,Dot,Fade,Follow,Network,P,Person,Stroke,W,clamp,mix,prog,shot,txt,word,type XY} from './kit';
import {MazeWalls} from './Maze';
import {maze,pts} from './maze-model';

const Mini:React.FC<{kind:number;x:number;y:number;scale?:number;opacity?:number}>=({kind,x,y,scale=.25,opacity=1})=><g transform={`translate(${x} ${y}) scale(${scale}) translate(-960 -430)`} opacity={opacity}>
 {kind%3===0?<><MazeWalls/><Stroke points={pts(maze.solution)} color={P.orange} width={12}/></>:kind%3===1?<Network x={960} y={430} scale={1.5}/>:<><Network x={640} y={430} color={P.green}/><Network x={1300} y={430} partial/><Stroke points={[[970,180],[970,730]]} color={P.line}/></>}
</g>;
const Player:React.FC<{p?:number}>=({p=1})=><g opacity={p}><rect x={640} y={190} width={640} height={360} fill={P.bg} stroke={P.muted} strokeWidth={4}/><Stroke points={[[665,524],[1255,524]]} color={P.line} width={4}/><Stroke points={[[665,524],[1155,524]]} color={P.orange} width={4}/><path d="M1224 210 l20 20 M1244 210 l-20 20" stroke={P.muted} strokeWidth={3}/></g>;

export const Reflection:React.FC<{id:number;f:number}>=({id,f})=>{
 if(id===12){
  const overlap=W(id,f,'作者的知识结构',45),remove=W(id,f,'作者的理解',38),own=W(id,f,'自己的知识结构',45);
  const ax=mix(530,960,overlap)-remove*530, lx=mix(1390,960,overlap)+remove*390;
  return <>
   <Network x={ax} y={420} scale={1.05} opacity={1-remove*.65}/>
   <Network x={lx} y={420} scale={1.05} partial color={own>.3?P.green:P.ink}/>
   {txt(ax,720,'作者的结构',34,P.ink,'middle',1-overlap*.75)}{txt(lx,720,'自己的结构',34,own>.3?P.green:P.muted)}
   <Stroke points={[[lx-110,545],[lx-20,480],[lx+130,420]]} color={P.green} p={own} width={4}/>
   <Person x={lx} y={790} scale={.7}/>
  </>;
 }
 if(id===13){
  const real=W(id,f,'实际问题',58),attempt=W(id,f,'应用',25);
  const original:XY[]=[[550,340],[850,280],[1150,340],[850,570],[1390,570]];
  const targets:XY[]=[[650,210],[520,650],[1160,590],[1410,280],[945,480]];
  const labels=['知识','关系','问题','条件','结果'];
  const positions=original.map(([x,y],i):XY=>[mix(x,targets[i][0],real),mix(y,targets[i][1],real)]);
  const edges=real>.5?[[0,4],[2,1],[4,3],[3,2]]:[[0,1],[1,2],[1,3],[2,4]];
  return <>
   {edges.map(([a,b],i)=><Stroke key={i} points={[positions[a],positions[b]]} color={P.ink} width={4} opacity={.45}/>) }
   {positions.map(([x,y],i)=><g key={i} opacity={i===2?1-real*.8:1}><circle cx={x} cy={y} r={23} fill={i===1?P.orange:P.ink}/>{txt(x,y-65,labels[i],32,P.ink,'middle',1-real)}</g>)}
   <rect x={1010} y={390} width={180} height={140} fill={P.bg} opacity={real*.95}/>
   <Network x={420} y={760} scale={.3} color={P.orange} opacity={attempt}/>
   <Stroke points={[[480,735],[620,590],[790,555]]} color={P.orange} p={attempt} dash/>
   <Stroke points={[[775,535],[805,565]]} color={P.red} p={attempt}/><Stroke points={[[805,535],[775,565]]} color={P.red} p={attempt}/>
  </>;
 }
 if(id===14){
  const pull=prog(f,10,75),line=W(id,f,'精心编排',27);
  return <>
   <Mini kind={1} x={mix(960,1450,pull)} y={430} scale={mix(1,.23,pull)}/>
   {[0,1,2,3].map((i)=><g key={i} opacity={pull}><rect x={170+i*320} y={300} width={280} height={250} stroke={P.line} strokeWidth={2} fill="none"/><Mini kind={i} x={310+i*320} y={430} scale={.21}/></g>)}
   <Stroke points={[[180,650],[1750,650]]} color={P.orange} p={pull} width={6}/>
   <Follow points={[[180,650],[1750,650]]} p={line}/>
  </>;
 }
 if(id===15){
  const mazeOn=W(id,f,'迷宫的比喻',25),trap=W(id,f,'顺畅阅读的陷阱',28),contrast=W(id,f,'两种学习者',25),logic=W(id,f,'逻辑层层递进',45),emotion=W(id,f,'情绪',35);
  const p=[mazeOn,trap,contrast];
  return <>
   {[0,1,2].map(i=><g key={i} opacity={mix(.22,1,p[i])}><Mini kind={i===1?1:i===2?2:0} x={450+i*510} y={mix(400,360,logic)} scale={mix(.32,.27,logic)}/><Stroke points={[[450+i*510,600],[450+i*510,675]]} color={P.orange} p={p[i]}/></g>)}
   <Stroke points={[[260,675],[1660,675]]} color={P.orange} p={Math.max(mazeOn*.33,trap*.66,contrast)} width={6}/>
   <Follow points={[[260,675],[1660,675]]} p={clamp(f/shot(id).duration)}/>
   <g opacity={logic}><rect x={180} y={140} width={1560} height={640} fill="none" stroke={P.muted} strokeWidth={3}/><Person x={960} y={mix(900,818,emotion)} scale={.65}/></g>
   <g opacity={emotion}><Stroke points={[[960,770],[960,690]]} color={P.orange} width={4}/><Dot x={960} y={690}/></g>
  </>;
 }
 if(id===16){
  const door=prog(f,0,24),open=W(id,f,'陷阱本身',27),mirror=prog(f,word(id,'陷阱本身')+12,27);
  return <Camera scale={mix(.88,1.12,door)}>
   <Stroke points={[[160,720],[960,720],[960,630]]} color={P.orange} width={7}/>
   <rect x={800} y={200} width={320} height={470} fill={P.bg} stroke={P.ink} strokeWidth={4}/>
   <g transform={`translate(800 200) scale(${1-open*.95} 1)`}><rect width={320} height={470} fill={P.bg} stroke={P.orange} strokeWidth={5}/>{txt(160,160,'我懂了',50)}<circle cx={280} cy={260} r={8} fill={P.orange}/></g>
   <g opacity={mirror}><rect x={835} y={235} width={250} height={390} fill={P.line} stroke={P.muted} strokeWidth={3}/><Person x={960} y={500} scale={1.2} color={P.muted}/><rect x={905} y={530} width={110} height={65} fill={P.bg} stroke={P.ink} strokeWidth={2}/><Stroke points={[[851,265],[1020,265],[851,510]]} color={P.ink} width={2} opacity={.2}/></g>
  </Camera>;
 }
 if(id===17){
  const satisfied=W(id,f,'说得太对',25),close=W(id,f,'关掉页面',22),loss=W(id,f,'并没有真正学到',35);
  return <>
   <Player p={1-close}/><Network x={960} y={360} scale={.65} opacity={1-close} color={P.orange}/>
   <Person x={960} y={720} scale={1.8}/><Check x={1175} y={640} p={satisfied*(1-loss)}/>
   <Network x={960} y={390} scale={.9} partial opacity={close*(1-loss)}/>
   <Stroke points={[[960,770],[960,790]]} color={P.muted} opacity={1-loss}/>
  </>;
 }
 const borrowed=W(id,f,'临时借用',40),light=W(id,f,'处理轻松',26),gone=W(id,f,'幻觉',Math.max(1,Math.min(18,shot(id).duration-word(id,'幻觉')-2)));
 return <>
  <Network x={540} y={410} scale={.9} opacity={1-gone}/>
  <Stroke points={[[540,410],[1420,410]]} color={P.orange} width={6} p={1} opacity={1-gone}/>
  {[0,1,2,3,4].map(i=><circle key={i} cx={mix(760+i*110,1000+i*90,borrowed)} cy={410} r={9} fill={P.orange} opacity={1-gone}/>)}
  <Network x={1420} y={610} scale={.6} partial opacity={.5*(1-gone)}/><Person x={1420} y={720} scale={1.05} opacity={1-gone}/>
  <Stroke points={[[1420,435],[1420,495]]} color={P.orange} dash opacity={borrowed*(1-gone)}/>
  <Check x={1420} y={290} p={light*(1-gone)}/>
 </>;
};
