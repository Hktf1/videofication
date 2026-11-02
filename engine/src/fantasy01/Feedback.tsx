import React from "react";
import type { SceneProps } from "../script/scene";
import { Canvas,C,P,Box,Dot,Txt,Node,Route,Cross,useBeat,lerp,clamp01 } from "./kit";
export const Feedback:React.FC<SceneProps>=({cues})=>{
 const b=useBeat(cues);
 if(["进步","反馈","幻想"].includes(b.section)){
   const bypass=b.section==="幻想",accumulate=b.step==="积累";
   return <Canvas label={bypass?"绕过现实的捷径，绕过了反馈":"真正的希望，从小进步中生长"}>
     <Node x={470} y={470} label="行动" color={bypass?C.muted:C.text}/><Node x={960} y={470} label="反馈" color={bypass?C.muted:C.green}/><Node x={1450} y={470} label="修正" color={bypass?C.muted:C.text}/>
     <Route points={[[570,470],[860,470]]} color={bypass?C.line:C.green} p={b.section==="进步"?.2:1}/>
     <Route points={[[1060,470],[1350,470]]} color={bypass?C.line:C.green} p={b.section==="进步"?0:b.t}/>
     <Route points={[[1450,525],[1450,660],[470,660],[470,525]]} color={bypass?C.line:C.green} p={b.section==="进步"?0:1}/>
     {[0,1,2,3,4].map(i=><Box key={i} x={775+i*75} y={740} w={50} h={22} fill={C.green} opacity={bypass?.1:accumulate?clamp01(b.t*5-i):.12}/>)}
     <Txt x={960} y={805} size={30} anchor="middle" color={C.muted}>真实积累</Txt>
     {bypass&&<><Route points={[[470,415],[470,290],[1450,290],[1450,415]]} color={C.amber} dash p={b.t}/><Txt x={960} y={250} size={34} anchor="middle" color={C.amber}>虚构的终点</Txt></>}
   </Canvas>;
 }
 if(b.section==="夹缝"){
   const close=b.step==="卡住"?1:b.t;
   return <Canvas label="现实与幻想之间，越来越窄的空间">
     <Box x={lerp(380,705,close)} y={300} w={45} h={425} fill={C.muted}/>
     <Box x={lerp(1495,1170,close)} y={300} w={45} h={425} stroke={C.amber} sw={2} dash="8 10"/>
     <Dot cx={960} cy={510} r={11} fill={C.text}/><P d="M900 510 H1020" color={C.text}/>
     <Txt x={lerp(400,725,close)} y={245} size={36} anchor="middle" color={C.muted}>现实</Txt>
     <Txt x={lerp(1515,1190,close)} y={245} size={36} anchor="middle" color={C.amber}>幻想</Txt>
   </Canvas>;
 }
 if(b.section==="隔绝"||b.section==="能力"){
   const wall=b.step!=="麻醉",loss=b.section==="能力";
   return <Canvas label={loss?"学习、调整、恢复，逐渐失去回应":"从提振，到遮蔽，再到隔绝"}>
     <Dot cx={580} cy={510} r={11} fill={C.text}/><Txt x={580} y={715} size={34} anchor="middle">当下</Txt>
     <Box x={wall?875:lerp(1080,875,b.t)} y={300} w={wall?75:280} h={430} fill={C.muted} opacity={wall?.9:.18}/>
     <Txt x={wall?913:1040} y={245} size={36} anchor="middle" color={C.muted}>{wall?"隔离墙":"麻醉"}</Txt>
     {["学习","调整","恢复"].map((text,i)=><g key={text} opacity={loss?1-clamp01(b.elapsed*.4-i*.22)*.85:1}><Route points={[[960,390+i*120],[1210,390+i*120]]} color={C.line}/><Dot cx={1270} cy={390+i*120} r={7} fill={C.green}/><Txt x={1330} y={390+i*120} size={34} color={C.muted}>{text}</Txt></g>)}
   </Canvas>;
 }
 const empty=b.step==="耗尽"||b.step==="落点"||b.step==="消耗";
 const remaining=b.step==="耗尽"?Math.max(0,.2-b.t*.2):empty?0:1;
 return <Canvas label="幻想消耗的，正是希望本身">
   <Box x={540} y={390} w={840} h={210} stroke={C.muted} sw={2}/>
   <Box x={555} y={405} w={Math.max(0,810*remaining)} h={180} fill={C.amber} opacity={.85}/>
   <Txt x={960} y={325} size={42} anchor="middle" color={C.amber}>希望</Txt>
   <Route points={[[1380,495],[1560,495]]} color={C.amber} opacity={b.step==="落点"?.2:1}/>
   <Txt x={1530} y={595} size={30} anchor="middle" color={C.muted}>维持幻想</Txt>
   <P d="M555 710 H1365" color={C.line}/>
   {b.step==="消耗"&&<Txt x={960} y={745} size={36} anchor="middle" opacity={b.t}>没有现实反馈，就没有新的补充</Txt>}
 </Canvas>;
};
