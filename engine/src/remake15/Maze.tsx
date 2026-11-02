import React from 'react';
import {Camera,Check,Dot,Fade,Follow,Network,P,Stroke,W,clamp,mix,prog,shot,txt,word,type XY} from './kit';
import {CELL,COLS,MX,MY,ROWS,WALLS,branches,maze,point,pts,wallPoints} from './maze-model';

export const MazeWalls:React.FC<{opacity?:number;collapse?:number}>=({opacity=1,collapse=0})=><g opacity={opacity*(1-collapse)}>
 <path d={`M${MX},${MY+CELL} V${MY+ROWS*CELL} H${MX+COLS*CELL} M${MX},${MY} H${MX+COLS*CELL} V${MY+ROWS*CELL-CELL}`} fill="none" stroke={P.ink} strokeWidth={4} opacity={.55}/>
 {WALLS.map((w,i)=><Stroke key={i} points={wallPoints(w).map(([x,y])=>[x,y+collapse*45] as XY)} color={P.ink} width={4} opacity={.32}/>)}
 </g>;
const route=pts(maze.solution), b1=branches[0],b2=branches[1];
const toB1=pts(maze.solution.slice(0,b1.at+1));
const between=pts(maze.solution.slice(b1.at,b2.at+1));
const rest=pts(maze.solution.slice(b2.at));
const Trail:React.FC<{path:XY[];p?:number;color?:string}>=({path,p=1,color=P.green})=><Stroke points={path} p={p} color={color} width={8}/>;
function motion(f:number,a:number,b:number,path:XY[]){return <Follow points={path} p={clamp((f-a)/Math.max(1,b-a))} color={P.orange}/>;}
export const MazeScene:React.FC<{id:number;f:number}>=({id,f})=>{
 if(id===6){const enter=W(id,f,'迷宫',35),walk=prog(f,word(id,'无人指导'),word(id,'分岔路口')-word(id,'无人指导'));
  const q=word(id,'判断');return <>
   <MazeWalls opacity={mix(.1,1,enter)}/><Trail path={toB1} p={walk}/><Follow points={toB1} p={walk}/>
   {maze.links[maze.solution[b1.at]].filter(n=>n!==maze.solution[b1.at-1]).map((n,i)=>{const [x,y]=point(maze.solution[b1.at]),[nx,ny]=point(n);return <Stroke key={i} points={[[x,y],[mix(x,nx,.7),mix(y,ny,.7)]]} color={P.orange} p={prog(f,q+i*12,18)} dash/>;})}
   {txt(960,805,'观察 · 判断',34,P.ink,'middle',prog(f,q,20))}
  </>;
 }
 if(id===7){
  const t1=word(id,'走不通'),t2=word(id,'标记'),t3=word(id,'返回'),t4=word(id,'另一条路'),t5=word(id,'下一个路口'),t6=word(id,'你很可能'),t7=word(id,'那条死路'),t8=word(id,'再返回');
  const back1=[...pts(b1.path)].reverse(),back2=[...pts(b2.path)].reverse();
  let player=motion(f,0,t1,pts(b1.path));
  if(f>=t3)player=motion(f,t3,t4,back1);
  if(f>=t4)player=motion(f,t4,t5,between);
  if(f>=t6)player=motion(f,t6,t7,pts(b2.path));
  if(f>=t8)player=motion(f,t8,shot(id).duration,back2);
  return <>
   <MazeWalls/><Trail path={toB1}/><Trail path={between} p={clamp((f-t4)/(t5-t4))}/>
   <Trail path={pts(b1.path)} p={clamp(f/t1)} color={f>=t2?P.red:P.orange}/>
   <Trail path={pts(b2.path)} p={clamp((f-t6)/(t7-t6))} color={f>=t7?P.red:P.orange}/>
   {[{path:b1.path,t:t2},{path:b2.path,t:t7}].map(({path,t},i)=>{const [x,y]=point(path.at(-1)!);return <g key={i} opacity={prog(f,t,8)}><Stroke points={[[x-12,y-12],[x+12,y+12]]} color={P.red} width={5}/><Stroke points={[[x+12,y-12],[x-12,y+12]]} color={P.red} width={5}/></g>;})}
   {player}
  </>;
 }
 if(id===8){
  const exit=word(id,'走出迷宫'),move=clamp((f-word(id,'再选择'))/Math.max(1,exit-word(id,'再选择'))),map=prog(f,exit,28);
  return <Camera scale={mix(1,.88,map)}>
   <MazeWalls opacity={1-map*.9}/><Trail path={toB1}/><Trail path={between}/><Trail path={pts(b1.path)} color={P.red}/><Trail path={pts(b2.path)} color={P.red}/><Trail path={rest} p={move}/><Follow points={rest} p={move} color={P.green}/>
   <g opacity={map}><rect x={MX-18} y={MY-18} width={COLS*CELL+36} height={ROWS*CELL+36} fill="none" stroke={P.green} strokeWidth={3}/></g>
   {txt(960,805,'自己的地图',38,P.green,'middle',map)}
  </Camera>;
 }
 if(id===9){
  const start=word(id,'直走100米'),left=word(id,'左转'),stone=word(id,'红色石头'),right=word(id,'右拐'),river=word(id,'一条河'),bridge=word(id,'三座桥'),second=word(id,'第二座桥'),exit=word(id,'就是出口');
  const at=[0,start,left,stone,right,river,bridge,second,exit,shot(id).duration];
  const values=[0,0,.12,.25,.35,.48,.55,.63,.95,.95];
  let p=0;for(let i=0;i<at.length-1;i++)if(f>=at[i])p=mix(values[i],values[i+1],clamp((f-at[i])/Math.max(1,at[i+1]-at[i])));
  const stonePoint=route[Math.round(route.length*.25)],riverPoint=route[Math.round(route.length*.55)];
  return <>
   <MazeWalls/><Trail path={route} p={Math.min(1,p+.1)} color={P.orange}/><Follow points={route} p={p}/>
   <g opacity={prog(f,stone,15)}><path d={`M${stonePoint[0]-12},${stonePoint[1]-25} l-10,-16 13,-15 18,9 -3,22 z`} fill={P.red}/></g>
   <g opacity={prog(f,river,15)}><path d={`M${riverPoint[0]-35},${riverPoint[1]-38} Q${riverPoint[0]-10},${riverPoint[1]} ${riverPoint[0]-35},${riverPoint[1]+38} M${riverPoint[0]-16},${riverPoint[1]-38} Q${riverPoint[0]+9},${riverPoint[1]} ${riverPoint[0]-16},${riverPoint[1]+38}`} stroke={P.muted} strokeWidth={5} fill="none"/>
    {[-25,0,25].map((y,i)=><g key={i} opacity={prog(f,bridge,16)}><rect x={riverPoint[0]-46} y={riverPoint[1]+y-5} width={49} height={10} fill={P.bg} stroke={i===1&&f>=second?P.orange:P.ink} strokeWidth={3}/></g>)}
   </g>
  </>;
 }
 if(id===10){
  const straight=W(id,f,'变成了一条路',55),fast=W(id,f,'十分顺利且快速',40);
  const morphed=route.map(([x,y],i):XY=>[mix(x,420+i/(route.length-1)*1080,straight),mix(y,440,straight)]);
  return <>
   <MazeWalls collapse={straight}/><Trail path={morphed} color={P.orange}/><Follow points={morphed} p={mix(.95,1,fast)}/>
   <Check x={1580} y={440} p={fast}/>{txt(960,660,'迷宫 → 一条路',44,P.ink,'middle',straight)}
  </>;
 }
 // A new topology is produced by mirroring the same valid maze, preserving comparison fairness.
 const compare=W(id,f,'实际效果则是相反',40),self=W(id,f,'前者'),guided=W(id,f,'后者');
 return <>
  <Stroke points={[[960,155],[960,800]]} color={P.line} width={2}/>
  {txt(475,175,'自主探索',36,P.green)}{txt(1445,175,'接受指导',36,P.orange)}
  <g opacity={1-compare}>{txt(475,430,'学习效果差',54,P.muted,'middle',self)}{txt(1445,430,'学习非常到位',54,P.ink,'middle',guided)}<Check x={1445} y={565} p={guided}/><Network x={475} y={600} scale={.35} color={P.green} opacity={self}/></g>
  <g opacity={compare}>
   {[0,1].map(i=><g key={i} transform={`translate(${i===0?-155:815} 270) scale(.57)`}>
    <g transform={`translate(${MX*2+COLS*CELL} 0) scale(-1 1)`}><MazeWalls/>
     {i===0?<><Trail path={toB1} p={compare}/><Trail path={pts(b1.path)} p={Math.max(0,(compare-.65)*2.86)} color={P.red}/><Follow points={toB1} p={compare} color={P.green}/></>:<><Dot x={point(0)[0]} y={point(0)[1]}/><Stroke points={route} color={P.orange} opacity={.4*(1-compare)} dash/>{txt(point(0)[0]+40,point(0)[1],'？',55,P.orange)}</>}
    </g>
   </g>)}
  </g>
 </>;
};
