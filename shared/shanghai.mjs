import {angleDiff,wrap} from './tracks.mjs';
import {ribbonOffset} from './surface.mjs';

const cache=new WeakMap(),BASE=6.85,CELL=32;
export function shanghaiRunoff(track){
 if(cache.has(track))return cache.get(track);
 const n=track.points.length,extra={'-1':Array(n).fill(0),'1':Array(n).fill(0)},segments=new Map();
 for(let i=0;i<n;i++){
  const a=track.points[i],b=track.points[(i+1)%n];
  for(let x=Math.floor(Math.min(a.x,b.x)/CELL);x<=Math.floor(Math.max(a.x,b.x)/CELL);x++)for(let z=Math.floor(Math.min(a.z,b.z)/CELL);z<=Math.floor(Math.max(a.z,b.z)/CELL);z++){
   const key=x+':'+z;if(!segments.has(key))segments.set(key,[]);segments.get(key).push(i);
  }
  const curvature=angleDiff(track.points[wrap(i+4,n)].heading,track.points[wrap(i-4,n)].heading)/(8*track.step);
  if(Math.abs(curvature)<.003)continue;
  const side=-Math.sign(curvature),reach=Math.ceil(70/track.step),width=Math.min(25,7+Math.abs(curvature)*950);
  for(let d=-reach;d<=reach;d++){const j=wrap(i+d,n),taper=.5+.5*Math.cos(d/reach*Math.PI);extra[side][j]=Math.max(extra[side][j],width*taper);}
 }
 const clear=(x,z)=>{
  const pad=track.width/2+3.4,ids=new Set();
  for(let gx=Math.floor((x-pad)/CELL);gx<=Math.floor((x+pad)/CELL);gx++)for(let gz=Math.floor((z-pad)/CELL);gz<=Math.floor((z+pad)/CELL);gz++)for(const id of segments.get(gx+':'+gz)||[])ids.add(id);
  for(const i of ids){const a=track.points[i],b=track.points[(i+1)%n],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));if(Math.hypot(x-a.x-dx*t,z-a.z-dz*t)<pad)return false;}return true;
 };
 for(const side of [-1,1])for(let i=0;i<n;i++){
  const p=track.points[i],wanted=extra[side][i];let allowed=0;
  for(let width=1;width<=wanted;width++){const offset=side*(track.width/2+BASE+width);if(!clear(p.x+Math.cos(p.heading)*offset,p.z-Math.sin(p.heading)*offset))break;allowed=width;}
  const capped=Math.abs(ribbonOffset(track,i,side*(track.width/2+BASE+allowed+.35)));
  extra[side][i]=Math.max(0,Math.min(allowed,capped-track.width/2-BASE-.35));
 }
 // Cap every point by its neighbors' safe width: transitions cannot jump across
 // another road branch and do not grow a jagged wall at narrow clearance sites.
 for(const side of [-1,1]){
  for(let pass=0;pass<2;pass++){
   for(let i=0;i<n;i++)extra[side][i]=Math.min(extra[side][i],extra[side][wrap(i-1,n)]+track.step*.12);
   for(let i=n-1;i>=0;i--)extra[side][i]=Math.min(extra[side][i],extra[side][(i+1)%n]+track.step*.12);
  }
 }
 const result={extra,base:BASE};cache.set(track,result);return result;
}
export function shanghaiBoundaryOffset(track,index,side){return track.width/2+BASE+shanghaiRunoff(track).extra[side][index];}
