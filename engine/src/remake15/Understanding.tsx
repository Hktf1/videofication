import React from 'react';
import {Camera,Check,Dot,Fade,Follow,Network,P,Person,Stroke,W as defaultW,clamp,ease,mix,prog,shot as defaultShot,txt as defaultTxt,word as defaultWord,type XY} from './kit';

export type UnderstandingPresentation = {
 W: typeof defaultW;
 word: typeof defaultWord;
 shot: typeof defaultShot;
 txt: typeof defaultTxt;
};

const road:XY[]=[[370,485],[650,485],[930,485],[1210,485],[1490,485]];
export const Understanding:React.FC<{id:number;f:number;presentation?:UnderstandingPresentation}>=({id,f,presentation})=>{
 const {W,word,shot,txt}=presentation??{W:defaultW,word:defaultWord,shot:defaultShot,txt:defaultTxt};
 if(id===1){
  const guide=W(id,f,'而是',20), network=prog(f,0,40), title=1-prog(f,75,25);
  return <>
   <g opacity={1-guide*.7}><path d="M310 570 Q430 540 550 590 Q670 540 790 570 L790 690 Q670 660 550 710 Q430 660 310 690 Z" stroke={P.ink} strokeWidth={4} fill="none"/><Stroke points={[[550,590],[550,710]]} width={3}/></g>
   <Network x={550} y={400} scale={.7} reveal={network} chain={guide}/>
   <Stroke points={[[350,400],[1530,400]]} p={guide} color={P.orange} width={5}/>
   <Person x={mix(1100,1440,guide)} y={465} scale={.85}/>
   <Check x={1440} y={320} p={prog(f,word(id,'讲懂'),12)}/>
   {txt(960,205,'听懂了，为什么用不出来？',56,P.ink,'middle',title)}
  </>;
 }
 if(id===2){
  const fail=W(id,f,'一脸茫然'), blurred=W(id,f,'磕磕绊绊'), cards=W(id,f,'头头是道'), merge=W(id,f,'这就是在学习过程中',35);
  const problem=W(id,f,'遇到具体问题',20);
  return <>
   <Fade p={1-merge}>
    <Stroke points={[[640,240],[640,730]]} color={P.line} width={2}/><Stroke points={[[1280,240],[1280,730]]} color={P.line} width={2}/>
    <Network x={330} y={410} scale={.57} color={P.muted} opacity={mix(1,.25,fail)}/>
    <Network x={960} y={410} scale={.57} partial={true} scatter={blurred*35+Math.sin(f/12)*blurred*4}/>
    <Stroke points={[[250,580],[350,580],[350,670]]} color={P.orange} p={problem} opacity={1-fail*.75}/>
    <Person x={330} y={710} scale={.8}/><Person x={960} y={710} scale={.8}/>
    <Stroke points={[[305,525],[355,575],[305,625],[355,675]]} color={P.red} width={5} p={fail}/>
    {txt(330,240,'无法调用',34,P.muted,'middle',fail)}{txt(960,240,'回忆模糊',34,P.muted,'middle',blurred)}{txt(1590,240,'方案无效',34,P.muted,'middle',cards)}
    {[0,1,2].map(i=>{const p=prog(f,word(id,'头头是道')+i*38,40);return <g key={i} opacity={p} transform={`translate(${mix(1410,1440+i*50,p)} ${420-i*50})`}><rect width={240} height={135} stroke={P.ink} fill={P.bg} strokeWidth={3}/><Stroke points={[[28,40],[180,40]]} color={P.orange}/><Stroke points={[[28,75],[140,75]]} width={3}/></g>;})}
    <rect x={1495} y={640} width={185} height={90} fill="none" stroke={P.red} strokeWidth={4}/>
    <Stroke points={[[1590,550],[1590,620]]} color={P.orange} p={cards}/><Stroke points={[[1570,600],[1610,640]]} color={P.red} p={cards}/>
   </Fade>
   <Fade p={merge}><Network x={960} y={430} scale={1.1} opacity={.25} partial/>{txt(960,450,'知识理解幻觉',76)}<Stroke points={[[750,525],[1170,525]]} color={P.orange} p={merge}/></Fade>
  </>;
 }
 if(id===3){
  const extract=W(id,f,'借用作者的知识结构',50),move=prog(f,word(id,'借用')+40,65);
  return <>
   <Network x={500} y={420} scale={.95}/>{txt(500,720,'作者的知识结构',34)}
   <Stroke points={[[500,420],[1450,420]]} color={P.orange} width={6} p={extract}/>
   {[0,1,2,3,4].map(i=><circle key={i} cx={mix(500+i*20,710+i*150,extract)} cy={mix(400+i%2*40,420,extract)} r={9} fill={P.orange} opacity={extract}/>)}
   <Person x={mix(1040,1450,move)} y={500} scale={.8}/><Network x={1450} y={420} scale={.7} partial opacity={.25}/>
   {txt(1450,720,'学习者',34)}
  </>;
 }
 if(id===4){
  const remove=W(id,f,'可以省略',34), arrange=W(id,f,'先讲什么',45),example=W(id,f,'例子合适',30),logic=W(id,f,'逻辑紧密',28);
  const nodeXY:XY[]=[[-520,-80],[-350,140],[-190,-170],[30,20],[240,-100],[420,150]];
  return <>
   <g opacity={1-remove}><Network x={960} y={440} scale={1.65} color={P.muted} opacity={.45}/></g>
   {nodeXY.map(([x,y],i)=>{const px=mix(960+x,460+i*200,arrange),py=mix(440+y,460,arrange);return <g key={i}><circle cx={px} cy={py} r={18} fill={i===2||i===4?P.orange:P.ink}/>{i<5&&<Stroke points={[[px,py],[mix(960+nodeXY[i+1][0],460+(i+1)*200,arrange),mix(440+nodeXY[i+1][1],460,arrange)]]} p={logic} color={P.orange} width={6}/>}</g>;})}
   <g opacity={example}><rect x={780} y={590} width={160} height={110} fill={P.bg} stroke={P.ink} strokeWidth={3}/>{txt(860,647,'案例',32)}<Stroke points={[[860,590],[860,490]]} color={P.orange} p={example}/></g>
   {txt(960,220,logic>.2?'清晰的逻辑连接':arrange>.2?'安排顺序':remove>.2?'保留关键':'完整的知识结构',42)}
   <Stroke points={[[380,460],[1540,460]]} p={logic} color={P.orange} width={6}/>
   <Fade p={logic}><Follow points={[[400,460],[1500,460]]} p={prog(f,word(id,'逻辑紧密'),75)}/></Fade>
  </>;
 }
 const smooth=W(id,f,'顺畅',65),native=W(id,f,'本能机制',40),judge=W(id,f,'误判',25);
 const dotProgress=(f/shot(id).duration)*.9;
 return <>
  <Stroke points={road} color={P.orange} width={6}/><Follow points={road} p={dotProgress}/>
  <g transform="translate(440 240)">{txt(0,0,'阅读顺畅',34,P.ink,'start')}<Stroke points={[[290,0],[1000,0]]} color={P.line} width={14}/><Stroke points={[[290,0],[290+710*smooth,0]]} color={P.orange} width={14}/></g>
  <Network x={960} y={650} scale={.55} partial color={P.muted}/>{txt(500,650,'自己的结构',32,P.muted,'end')}
  <Stroke points={[[1380,270],[1380,400]]} color={P.orange} p={native} dash/>
  <Check x={1380} y={390} p={native} crack={judge}/>{txt(1460,390,'我懂了',36,P.ink,'start',native)}
 </>;
};
