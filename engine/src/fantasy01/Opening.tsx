import React from "react";
import type { SceneProps } from "../script/scene";
import { Canvas,C,P,Dot,Txt,useBeat,lerp } from "./kit";
export const Opening:React.FC<SceneProps>=({cues})=>{
 const b=useBeat(cues),fall=b.step==="下坠"?b.t:0;
 const reality=lerp(510,690,fall),dream=lerp(450,290,b.step==="升起"?b.t:1);
 return <Canvas label="幻想 / 现实">
   <P d="M380 690 H1540" color={C.line}/>
   <P d={`M560 ${reality} L1360 ${dream}`} color={C.muted} dash="8 10" opacity={1-fall*.8}/>
   <Dot cx={1360} cy={dream} r={18} stroke={C.amber} sw={2}/><Dot cx={1360} cy={dream} r={5} fill={C.amber}/>
   <Txt x={1360} y={dream-62} size={36} anchor="middle" color={C.amber}>想象的终点</Txt>
   <Dot cx={560} cy={reality} r={10} fill={fall>.3?C.red:C.text}/>
   <Txt x={560} y={reality+57} size={36} anchor="middle">现实的位置</Txt>
   {fall>0&&<P d={`M560 510 V${reality-22}`} color={C.red} p={fall}/>}
 </Canvas>;
};
