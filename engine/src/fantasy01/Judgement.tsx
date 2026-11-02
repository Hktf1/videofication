import React from "react";
import type { SceneProps } from "../script/scene";
import { Canvas,C,P,Box,Dot,Txt,Node,Route,Cross,useBeat,lerp } from "./kit";
export const Judgement:React.FC<SceneProps>=({cues})=>{
 const b=useBeat(cues);
 if(b.section==="判断"||b.section==="资源"){
   const tilt=b.step==="倾斜"?b.t:0;
   const cardX=b.section==="资源"?lerp(450,1270,b.t):b.step==="倾斜"?1270:450;
   return <Canvas label="把想象当作已经拥有的资源">
     <Box x={330} y={300} w={440} h={335} stroke={C.muted}/><Txt x={550} y={245} size={34} anchor="middle" color={C.muted}>尚未发生</Txt>
     <Box x={1150} y={300} w={440} h={335} stroke={C.text}/><Txt x={1370} y={245} size={34} anchor="middle">现实资源</Txt>
     <Box x={cardX} y={410} w={200} h={100} stroke={C.amber} sw={2} dash="8 8"/>
     <Txt x={cardX+100} y={460} size={34} anchor="middle" color={C.amber}>未来成功</Txt>
     <Route points={[[800,465],[1110,465]]} color={C.amber} dash/>
     <P d={`M700 ${725-tilt*45} L1220 ${725+tilt*45}`} color={C.red} w={3}/><P d="M960 705 L930 765 H990 Z" color={C.muted}/>
   </Canvas>;
 }
 if(b.section==="分叉")return <Canvas label="失真的预估，带来两种行动">
   <Dot cx={380} cy={510} r={10} fill={C.text}/>
   <Route points={[[380,510],[720,510],[720,350],[1510,350]]} color={b.step==="冒险"?C.amber:C.line}/>
   <Route points={[[720,510],[720,680],[1510,680]]} color={b.step==="停滞"?C.amber:C.line}/>
   <Box x={1120} y={325} w={100} h={50} fill={C.bg}/><Cross x={1170} y={350}/>
   <Txt x={1430} y={290} size={36} anchor="middle" color={C.amber}>过度冒险</Txt>
   {[0,1,2,3].map(i=><Box key={i} x={900+i*110} y={650} w={60} h={60} stroke={C.muted}/>)}
   <P d="M895 720 L1295 620" color={C.red} p={b.step==="停滞"?b.t:0}/><Txt x={1430} y={760} size={36} anchor="middle" color={C.muted}>拒绝积累</Txt>
 </Canvas>;
 if(b.section==="归因")return <Canvas label="结果不符，却绕开了自我修正">
   <Node x={500} y={510} label="现实结果" color={C.red}/><Node x={1130} y={510} label="修正判断" active={false}/>
   <Route points={[[600,510],[1025,510]]} color={C.line}/><Cross x={820} y={510}/>
   <Route points={[[500,455],[500,310],[1370,310],[1370,420]]} color={C.amber} p={b.t}/>
   <Txt x={1330} y={485} size={36} anchor="middle" color={C.amber}>时机 / 环境</Txt>
   <P d="M500 565 V700 H1510" color={C.line}/>
 </Canvas>;
 if(b.section==="反馈")return <Canvas label="最昂贵的损失，是反馈回路断开">
   <Node x={480} y={490} label="行动"/><Node x={960} y={490} label="反馈"/><Node x={1440} y={490} label="修正"/>
   <Route points={[[580,490],[860,490]]}/><Route points={[[1060,490],[1340,490]]}/>
   <Route points={[[1440,545],[1440,700],[1060,700]]} color={C.muted}/><Route points={[[860,700],[480,700],[480,545]]} color={C.muted}/><Cross x={960} y={700} size={23} opacity={b.t}/>
 </Canvas>;
 return <Canvas label="等待转机，还是走出一小步">
   <P d="M370 630 H1540" color={C.line}/><Dot cx={530} cy={630} r={10} fill={C.text}/>
   <Box x={740} y={585} w={100} h={45} stroke={b.step==="小步"?C.green:C.muted} sw={2}/>
   <Txt x={790} y={705} size={34} anchor="middle" color={b.step==="小步"?C.green:C.muted}>可操作的一步</Txt>
   <Dot cx={1400} cy={360} r={65} stroke={C.amber} dash="8 10"/>
   <Txt x={1400} y={360} size={36} anchor="middle" color={C.amber}>转机</Txt>
   <P d="M530 610 L1360 405" color={C.muted} dash="8 10"/>
   {b.step==="小步"&&<Cross x={1000} y={475} opacity={b.t}/>}
 </Canvas>;
};
