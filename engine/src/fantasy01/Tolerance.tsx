import React from "react";
import type { SceneProps } from "../script/scene";
import { Canvas,C,P,Box,Dot,Txt,Node,Route,Cross,useBeat,lerp,clamp01 } from "./kit";
export const Tolerance:React.FC<SceneProps>=({cues})=>{
 const b=useBeat(cues);
 if(["循环","耐受","逃避"].includes(b.section)){
   const bigger=b.section==="耐受",closed=b.section==="逃避";
   const dx=bigger?lerp(0,95,b.t):0;
   return <Canvas label={closed?"逃避成为仅剩的用途":bigger?"幻想加码，现实没有前进":"虚假希望的闭环"}>
     <Node x={960} y={320} label="幻想" color={C.amber}/><Node x={1320+dx} y={510} label="反差" color={C.red}/>
     <Node x={960} y={700} label="羞耻" color={C.red}/><Node x={600-dx} y={510} label="逃避" color={C.muted}/>
     <Route points={[[1060,320],[1320+dx,320],[1320+dx,460]]} color={C.amber}/>
     <Route points={[[1320+dx,560],[1320+dx,700],[1060,700]]} color={C.red}/>
     <Route points={[[860,700],[600-dx,700],[600-dx,560]]} color={C.muted}/>
     <Route points={[[600-dx,460],[600-dx,320],[860,320]]} color={C.amber} p={b.step==="羞耻"?.2:1}/>
     <Dot cx={960} cy={510} r={9} fill={C.text}/><Txt x={960} y={565} size={32} anchor="middle" color={C.muted}>现实停在原处</Txt>
     {bigger&&[0,1,2].map(i=><P key={i} d={`M${890-i*28} ${265-i*20} H${1030+i*28}`} color={C.amber} opacity={b.step==="衰减"?(.5-i*.15):clamp01(b.t*3-i)}/>)}
     {closed&&<Box x={770} y={405} w={380} h={230} stroke={C.muted} sw={3} opacity={b.t}/>}
   </Canvas>;
 }
 if(b.section==="现实"||b.section==="落差"){
   const heavy=b.section==="落差";
   return <Canvas label={heavy?"终点越清晰，第一步越沉重":"行动遇到现实"}>
     <P d="M300 655 H1610" color={C.line}/><Dot cx={380} cy={655} r={10} fill={C.text}/>
     {["成本","不确定","失败"].map((label,i)=><g key={label}><Box x={640+i*310} y={heavy?465:400} w={35} h={heavy?190:255} fill={i===1?C.muted:C.red} opacity={heavy?.6:.75}/><Txt x={658+i*310} y={heavy?415:350} size={34} anchor="middle" color={C.muted}>{label}</Txt></g>)}
     <P d="M380 655 H620" color={C.amber} p={b.t}/>
     <Box x={1360} y={270} w={180} h={110} stroke={C.amber} dash="7 10"/>
     <Txt x={1450} y={325} size={34} anchor="middle" color={C.amber}>想象的终点</Txt>
     {heavy&&<><Box x={345} y={lerp(395,520,b.t)} w={70} h={110} fill={C.muted}/><P d="M380 520 V640" color={C.red} w={3} p={b.t}/></>}
   </Canvas>;
 }
 if(b.section==="对照")return <Canvas label="想象完成，现实停滞">
   <Txt x={420} y={360} size={36} color={C.amber}>想象</Txt><Route points={[[560,360],[1460,360]]} color={C.amber}/><Dot cx={1490} cy={360} r={10} fill={C.amber}/>
   <Txt x={420} y={640} size={36}>现实</Txt><P d="M560 640 H1490" color={C.line}/><Dot cx={560} cy={640} r={10} fill={C.text}/>
   <P d="M1490 420 V580" color={C.red} dash="5 9"/>
 </Canvas>;
 const advance=b.section==="预支";
 return <Canvas label={advance?"提前支取的希望":"希望需要真实反馈"}>
   <Node x={520} y={500} label="行动"/><Node x={1040} y={500} label={advance?"想象终点":"现实反馈"} color={advance?C.amber:C.text}/>
   <Route points={[[620,500],[940,500]]} color={advance?C.amber:C.text} dash={advance} p={advance?b.t:1}/>
   <Route points={[[1040,550],[1040,690],[520,690],[520,550]]} color={advance?C.line:C.green}/>
   {advance?<Cross x={780} y={690} opacity={b.t}/>:<Txt x={780} y={735} size={32} anchor="middle" color={C.green}>反馈才能修正行动</Txt>}
   {b.step==="缓解"&&<Dot cx={520} cy={500} r={82+15*Math.sin(b.elapsed*1.5)} stroke={C.amber} opacity={.3}/>}
 </Canvas>;
};
