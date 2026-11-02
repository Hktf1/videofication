import type {XY} from './kit';
export const COLS=13, ROWS=7, CELL=84, MX=414, MY=145;
type Edge=[number,number];
const key=(a:number,b:number)=>a<b?`${a}:${b}`:`${b}:${a}`;
function generate(seed:number){
 let state=seed;
 const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const links=Array.from({length:COLS*ROWS},()=>[] as number[]),edges=new Set<string>(),seen=new Set<number>([0]), stack=[0];
 while(stack.length){const a=stack.at(-1)!,x=a%COLS,y=Math.floor(a/COLS);const opts=[x>0?a-1:-1,x<COLS-1?a+1:-1,y>0?a-COLS:-1,y<ROWS-1?a+COLS:-1].filter(b=>b>=0&&!seen.has(b));if(!opts.length){stack.pop();continue;}const b=opts[Math.floor(rand()*opts.length)];links[a].push(b);links[b].push(a);edges.add(key(a,b));seen.add(b);stack.push(b);}
 const solve=(a:number,b:number)=>{const todo:number[][]=[[a]], vis=new Set<number>();while(todo.length){const p=todo.shift()!,n=p.at(-1)!;if(n===b)return p;vis.add(n);for(const m of links[n])if(!vis.has(m))todo.push([...p,m]);}return [];};
 const solution=solve(0,COLS*ROWS-1),ss=new Set(solution);
 const branches=solution.flatMap((a,at)=>links[a].filter(b=>!ss.has(b)).map(b=>{let path=[a,b];while(true){const n=path.at(-1)!,options=links[n].filter(x=>x!==path.at(-2));if(!options.length)break;path.push(options[0]);}return {at,path};}));
 return {links,edges,solution,branches,solve};
}
// Search a reproducible topology with two meaningful early dead ends.
let chosen=generate(1);
for(let i=1;i<10000;i++){const m=generate(i);const bs=m.branches.filter(b=>b.path.length>=3&&b.at>1&&b.at<m.solution.length*.65);if(bs.length>=2&&bs[0].at<12){chosen=m;break;}}
export const maze=chosen;
export const branches=maze.branches.filter(b=>b.path.length>=3&&b.at>1&&b.at<maze.solution.length*.65).slice(0,2);
export const point=(n:number):XY=>[MX+(n%COLS+.5)*CELL,MY+(Math.floor(n/COLS)+.5)*CELL];
export const pts=(ns:number[])=>ns.map(point);
export const WALLS:Edge[]=[];
for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const a=y*COLS+x;if(x<COLS-1&&!maze.edges.has(key(a,a+1))) WALLS.push([a,a+1]);if(y<ROWS-1&&!maze.edges.has(key(a,a+COLS)))WALLS.push([a,a+COLS]);}
export const wallPoints=([a,b]:Edge):XY[]=>{const [x,y]=point(a);return b===a+1?[[x+CELL/2,y-CELL/2],[x+CELL/2,y+CELL/2]]:[[x-CELL/2,y+CELL/2],[x+CELL/2,y+CELL/2]];};
