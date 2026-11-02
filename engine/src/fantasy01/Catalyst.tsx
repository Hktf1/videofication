import React from "react";
import type { SceneProps } from "../script/scene";
import { Canvas,C,P,Box,Dot,Txt,Route,Cross,useBeat,lerp,clamp01 } from "./kit";
export const Catalyst:React.FC<SceneProps>=({cues})=>{
 const b=useBeat(cues);
 if(b.section==="差距"){
   const gap=b.step==="天堑"?lerp(100,320,b.t):b.step==="挑战"?150:lerp(50,150,b.t);
   const y1=500+gap*.5,y2=500-gap*.5;
   return <Canvas label="同一个差距，改变了意义">
     <P d={`M360 ${y1} H760 M1160 ${y2} H1560`} color={C.muted} w={2}/>
     <Dot cx={570} cy={y1} r={10} fill={C.text}/><Txt x={570} y={y1+65} size={34} anchor="middle">当下</Txt>
     <Dot cx={1370} cy={y2} r={12} stroke={C.amber} sw={3}/><Txt x={1370} y={y2-65} size={34} anchor="middle" color={C.amber}>想象的成功</Txt>
     <P d={`M990 ${y2} H1010 V${y1} H990`} color={b.step==="天堑"?C.red:C.amber} p={b.t}/>
     <Txt x={1060} y={500} size={38} color={b.step==="天堑"?C.red:C.amber}>{b.step==="天堑"?"天堑":b.step==="挑战"?"挑战":"落差"}</Txt>
     {b.step==="挑战"&&<Route points={[[760,y1],[850,y1],[850,500],[925,500],[925,y2],[1160,y2]]} p={b.t} color={C.amber}/>}
     {b.step==="天堑"&&<><P d="M795 720 L835 740 L875 720 L915 740" color={C.red} p={b.t}/><Cross x={960} y={665} opacity={b.t}/></>}
   </Canvas>;
 }
 if(b.section==="来源")return <Canvas label="希望从哪里来">
   <Box x={350} y={350} w={430} h={300} stroke={C.line} sw={2}/><Txt x={565} y={440} size={40} anchor="middle">现实</Txt>
   <P d="M425 565 H700" color={C.muted}/><Dot cx={450} cy={565} r={8} fill={C.muted}/>
   <Box x={1120} y={350} w={430} h={300} stroke={C.amber} dash="8 10"/>
   <Txt x={1335} y={440} size={40} anchor="middle" color={C.amber}>制造的希望</Txt>
   <P d="M1195 565 H1475" color={C.amber} dash="7 9"/>
   <P d="M780 500 H1120" color={C.line}/><Cross x={950} y={500} opacity={b.t}/>
   <Txt x={1335} y={720} size={34} anchor="middle" color={C.muted} opacity={b.t}>匮乏</Txt>
 </Canvas>;
 const active=b.section==="强心剂",tolerance=b.step==="耐受";
 const pulse=active?(tolerance?.25+.25*Math.max(0,Math.sin(b.elapsed*2.2)):.5+.5*Math.max(0,Math.sin(b.elapsed*1.7))):.05;
 return <Canvas label={active?"暂时振作，效果却在减弱":"困境中的希望"}>
   <Box x={380} y={340} w={440} h={320} stroke={C.line} sw={2}/>
   <Dot cx={600} cy={500} r={10+5*pulse} fill={active?C.amber:C.text}/>
   <Dot cx={600} cy={500} r={44+24*pulse} stroke={active?C.amber:C.muted} sw={1.5} opacity={active?pulse:.3}/>
   <Txt x={600} y={715} anchor="middle" size={36}>当下</Txt>
   <Dot cx={1350} cy={390} r={18} stroke={C.amber} sw={2} dash="7 8"/>
   <Txt x={1350} y={310} anchor="middle" size={36} color={C.amber}>成功的想象</Txt>
   {active&&<><Route points={[[1320,400],[1120,400],[1120,500],[825,500]]} color={C.amber} p={b.t} opacity={tolerance?.4:1}/>
     {[0,1,2].map(i=><Box key={i} x={1020+i*90} y={610} w={50} h={lerp(80,26,i/2)} fill={C.amber} opacity={(tolerance?[.55,.3,.12]:[.9,.9,.9])[i]*clamp01(b.t*3-i)}/>)}
     <Txt x={1135} y={735} size={30} anchor="middle" color={C.muted}>{tolerance?"重复之后，提振减弱":"短暂的提振"}</Txt></>}
 </Canvas>;
};
