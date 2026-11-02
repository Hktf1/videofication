import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneCue } from "../script/scene";
import { MOTION as C, MOTION_FONT } from "../style/motion";
import { P, Box, Dot, Txt, clamp01, easeOut, lerp } from "../kit/sceneKit";
export { C, P, Box, Dot, Txt, clamp01, easeOut, lerp };

export const useBeat = (cues: SceneCue[]) => {
  const f=useCurrentFrame(),{fps}=useVideoConfig();
  let current=cues.find(c=>c.beat);
  for(const cue of cues) if(cue.at<=f&&cue.beat)current=cue;
  return {section:current?.beat?.section??"",step:current?.beat?.step??"",f,fps,t:easeOut((f-(current?.at??0))/(fps*.8)),elapsed:Math.max(0,(f-(current?.at??0))/fps)};
};
export const Canvas:React.FC<{children:React.ReactNode;label?:string}>=({children,label})=><AbsoluteFill>
  <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{fontFamily:MOTION_FONT.sans}}>
    {label&&<><P d="M260 205 H302" color={C.amber}/><Txt x={320} y={205} size={26} color={C.muted}>{label}</Txt></>}
    {children}
  </svg>
</AbsoluteFill>;
export const Route:React.FC<{points:[number,number][];color?:string;p?:number;dash?:boolean;opacity?:number}>=({points,color=C.text,p=1,dash=false,opacity=1})=>{
 const a=points.at(-2)!,b=points.at(-1)!,angle=Math.atan2(b[1]-a[1],b[0]-a[0]);
 const tip=(offset:number):[number,number]=>[b[0]-16*Math.cos(angle)+offset*Math.sin(angle),b[1]-16*Math.sin(angle)-offset*Math.cos(angle)];
 return <g opacity={opacity}><P d={points.map(([x,y],i)=>`${i?"L":"M"}${x} ${y}`).join(" ")} color={color} w={2.5} p={p} {...(dash?{dash:"8 9"}:{} )}/>
 {p>.9&&<polygon points={[b,tip(7),tip(-7)].map(v=>v.join(",")).join(" ")} fill={color}/>}</g>;
};
export const Node:React.FC<{x:number;y:number;label:string;color?:string;active?:boolean;opacity?:number}>=({x,y,label,color=C.text,active=true,opacity=1})=><g opacity={opacity}>
 <Box x={x-92} y={y-42} w={184} h={84} stroke={active?color:C.line} sw={2} fill={C.ink}/>
 <Txt x={x} y={y} size={34} anchor="middle" color={active?color:C.muted}>{label}</Txt>
</g>;
export const Cross:React.FC<{x:number;y:number;size?:number;opacity?:number}>=({x,y,size=15,opacity=1})=><g opacity={opacity}><P d={`M${x-size} ${y-size} L${x+size} ${y+size} M${x-size} ${y+size} L${x+size} ${y-size}`} color={C.red} w={3}/></g>;
