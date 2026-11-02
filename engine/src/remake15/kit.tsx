import React from 'react';
import {interpolate} from 'remotion';
import data from './data.json';
export {data};
export const P = {bg:'#111318', ink:'#F2EFE6', orange:'#F5A623', red:'#94534F', green:'#799D83', muted:'#727780', line:'#373C44'};
export const sans = '"SansSC", "Microsoft YaHei", sans-serif';
export type XY = [number,number];
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export const ease=(t:number)=>{const p=clamp(t);return p*p*(3-2*p);};
export const prog=(f:number,at:number,d=30)=>ease((f-at)/d);
export const shot=(id:number)=>data.shots[id-1];
export const word=(id:number,needle:string,n=0)=>{
 const sh=shot(id); const all=data.glyphs.map(g=>g.c).join('');
 const key=[...needle].filter(c=>/[\p{L}\p{N}]/u.test(c)).join('');
 let at=sh.at-1;
 for(let i=0;i<=n;i++) at=all.indexOf(key,at+1);
 if(at<sh.at || (data.shots[id] && at>=data.shots[id].at)) throw Error(`镜头${id}缺少锚点${needle}`);
 return Math.round(data.glyphs[at].s*30)-sh.from;
};
export const W=(id:number,f:number,needle:string,d=24,n=0)=>prog(f,word(id,needle,n),d);
export const txt=(x:number,y:number,text:string,size=36,color=P.ink,anchor:'start'|'middle'|'end'='middle',opacity=1)=><text x={x} y={y} textAnchor={anchor} fill={color} opacity={opacity} fontSize={size} fontFamily={sans} dominantBaseline="middle">{text}</text>;
export const lineD=(pts:XY[])=>pts.map(([x,y],i)=>`${i?'L':'M'}${x},${y}`).join(' ');
export const Stroke:React.FC<{points?:XY[];d?:string;color?:string;width?:number;p?:number;opacity?:number;dash?:boolean}>=({points,d,color=P.ink,width=5,p=1,opacity=1,dash=false})=><path d={d??lineD(points??[])} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} pathLength={1} strokeDasharray={dash?'.014 .015':1} strokeDashoffset={dash?0:1-clamp(p)}/>;
export const Dot:React.FC<{x:number;y:number;color?:string;r?:number;opacity?:number}>=({x,y,color=P.orange,r=13,opacity=1})=><g opacity={opacity}><circle cx={x} cy={y} r={r+7} fill={P.bg}/><circle cx={x} cy={y} r={r} fill={color}/><circle cx={x} cy={y} r={3} fill={P.ink}/></g>;
export const Check:React.FC<{x:number;y:number;p?:number;crack?:number;scale?:number}>=({x,y,p=1,crack=0,scale=1})=><g transform={`translate(${x} ${y}) scale(${scale})`} opacity={p}><circle r={38} fill={P.bg} stroke={P.green} strokeWidth={3}/><Stroke points={[[-17,0],[-3,14],[20,-15]]} color={P.green} width={6}/><path d="M 3 -38 L -4 -13 L 8 -3 L -3 15 L 2 38" stroke={P.bg} strokeWidth={7} fill="none" opacity={crack}/></g>;
export const Person:React.FC<{x:number;y:number;color?:string;scale?:number;opacity?:number}>=({x,y,color=P.ink,scale=1,opacity=1})=><g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}><circle cy={-47} r={20} fill={color}/><path d="M-33,20 Q-32,-18 0,-18 Q32,-18 33,20 Z" fill={color}/><path d="M-14,20 L-14,49 M14,20 L14,49" stroke={color} strokeWidth={12} strokeLinecap="round"/></g>;
const nodes:XY[]=[[-260,0],[-185,-135],[-170,120],[-75,-215],[-60,-60],[-45,195],[45,65],[90,-155],[185,-65],[210,150],[275,5],[300,-190]];
const edges=[ [0,1],[0,2],[1,3],[1,4],[2,4],[2,5],[3,7],[4,7],[4,6],[5,6],[6,8],[6,9],[7,8],[7,11],[8,10],[8,11],[9,10] ];
export const Network:React.FC<{x:number;y:number;scale?:number;reveal?:number;chain?:number;opacity?:number;color?:string;partial?:boolean;scatter?:number}>=({x,y,scale=1,reveal=1,chain=0,opacity=1,color=P.ink,partial=false,scatter=0})=>{
 const pts=nodes.map(([a,b],i):XY=>[mix(a,-270+i*50,chain)+Math.sin(i*2)*scatter,mix(b,0,chain)+Math.cos(i*3)*scatter]);
 return <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
 {edges.map(([a,b],i)=><Stroke key={i} points={[pts[a],pts[b]]} color={chain>.7?P.orange:color} width={3} p={clamp(reveal*1.5-i*.025)} opacity={partial?.07:.4}/>)}
 {pts.map(([a,b],i)=><circle key={i} cx={a} cy={b} r={i%3===0?11:8} fill={partial&&i%4!==0?P.line:(chain>.7?P.orange:color)} opacity={clamp(reveal*1.6-i*.045)*(partial&&i%4!==0?.22:1)}/>)}
 </g>;
};
export const Follow:React.FC<{points:XY[];p:number;color?:string}>=({points,p,color=P.orange})=>{
 const q=clamp(p)*(points.length-1), i=Math.min(points.length-2,Math.floor(q)), f=q-i;
 return <Dot x={mix(points[i][0],points[i+1][0],f)} y={mix(points[i][1],points[i+1][1],f)} color={color}/>;
};
export const Camera:React.FC<{children:React.ReactNode;scale?:number;x?:number;y?:number}>=({children,scale=1,x=960,y=430})=><g transform={`translate(960 430) scale(${scale}) translate(${-x} ${-y})`}>{children}</g>;
export const Fade:React.FC<{children:React.ReactNode;p:number}>=({children,p})=><g opacity={clamp(p)}>{children}</g>;
