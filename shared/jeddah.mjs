// Narrow street-circuit runoff and concrete wall boundary envelope for Jeddah Corniche Circuit; the driving mesh is unchanged.
import {angleDiff,wrap,sample} from './tracks.mjs';
import {ribbonOffset} from './surface.mjs';

const cache=new WeakMap(),BASE=3.85,CELL=28;
export function jeddahRunoff(track){
 if(cache.has(track))return cache.get(track);
 const n=track.points.length,extra={'-1':Array(n).fill(0),'1':Array(n).fill(0)},segments=new Map();
 for(let i=0;i<n;i++){
  const a=track.points[i],b=track.points[(i+1)%n];
  for(let x=Math.floor(Math.min(a.x,b.x)/CELL);x<=Math.floor(Math.max(a.x,b.x)/CELL);x++)for(let z=Math.floor(Math.min(a.z,b.z)/CELL);z<=Math.floor(Math.max(a.z,b.z)/CELL);z++){
   const key=x+':'+z;if(!segments.has(key))segments.set(key,[]);segments.get(key).push(i);
  }
  const curvature=angleDiff(track.points[wrap(i+4,n)].heading,track.points[wrap(i-4,n)].heading)/(8*track.step);
  if(Math.abs(curvature)<.0042)continue;
  const side=-Math.sign(curvature),reach=Math.ceil(36/track.step),width=Math.min(4.8,1.4+Math.abs(curvature)*320);
  for(let d=-reach;d<=reach;d++){const j=wrap(i+d,n),taper=.5+.5*Math.cos(d/reach*Math.PI);extra[side][j]=Math.max(extra[side][j],width*taper);}
 }
 const clear=(x,z)=>{
  const pad=track.width/2+3.4,ids=new Set();
  for(let gx=Math.floor((x-pad)/CELL);gx<=Math.floor((x+pad)/CELL);gx++)for(let gz=Math.floor((z-pad)/CELL);gz<=Math.floor((z+pad)/CELL);gz++)for(const id of segments.get(gx+':'+gz)||[])ids.add(id);
  for(const i of ids){const a=track.points[i],b=track.points[(i+1)%n],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));if(Math.hypot(x-a.x-dx*t,z-a.z-dz*t)<pad)return false;}
  return true;
 };
 for(const side of [-1,1])for(let i=0;i<n;i++){
  const p=track.points[i],wanted=extra[side][i];let allowed=0;
  for(let width=.5;width<=wanted;width+=.5){const offset=side*(track.width/2+BASE+width);if(!clear(p.x+Math.cos(p.heading)*offset,p.z-Math.sin(p.heading)*offset))break;allowed=width;}
  const capped=Math.abs(ribbonOffset(track,i,side*(track.width/2+BASE+allowed+.35)));
  extra[side][i]=Math.max(0,Math.min(allowed,capped-track.width/2-BASE-.35));
 }
 for(const side of [-1,1])for(let pass=0;pass<2;pass++){
  for(let i=0;i<n;i++)extra[side][i]=Math.min(extra[side][i],extra[side][wrap(i-1,n)]+track.step*.09);
  for(let i=n-1;i>=0;i--)extra[side][i]=Math.min(extra[side][i],extra[side][(i+1)%n]+track.step*.09);
 }
 const result={extra,base:BASE};cache.set(track,result);return result;
}
export function jeddahBoundaryOffset(track,index,side){return track.width/2+BASE+jeddahRunoff(track).extra[side][index];}

// A single block layout feeds both the renderer and the client/server colliders.
export const JEDDAH_TECPRO={width:.82,height:.94,length:2.15,inset:.78,spacing:2.35};
const tecproCache=new WeakMap(),tecproRanges=[
 [185,335,-1],[435,640,1],[680,890,-1],[950,1180,1],[1290,1520,-1],[1610,1860,1],
 [2300,2590,1],[2740,2960,-1],[3120,3360,1],[3580,3840,-1],[4080,4350,1],[4610,4890,-1],[5140,5420,1]
];
export function jeddahTecproBlocks(track){
 if(tecproCache.has(track))return tecproCache.get(track);
 const blocks=[],{width,height,length,inset,spacing}=JEDDAH_TECPRO;
 for(const [start,end,side] of tecproRanges)for(let s=start,k=0;s<=end;s+=spacing,k++){
  const index=Math.floor(wrap(s,track.length)/track.step),offset=ribbonOffset(track,index,side*(jeddahBoundaryOffset(track,index,side)-inset)),p=sample(track,s,offset);
  const tx=Math.sin(p.heading),tz=Math.cos(p.heading),bottom=p.y+.01;
  blocks.push({x:p.x,y:bottom+height/2,z:p.z,heading:p.heading,width,height,length,color:['red','white','blue'][k%3],
   a:{x:p.x-tx*length/2,y:bottom,z:p.z-tz*length/2},b:{x:p.x+tx*length/2,y:bottom,z:p.z+tz*length/2},
   inward:{x:-Math.cos(p.heading)*side,z:Math.sin(p.heading)*side}});
 }
 tecproCache.set(track,blocks);return blocks;
}
