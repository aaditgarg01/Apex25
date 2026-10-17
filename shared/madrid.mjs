// Environment anchors fitted to the retained geographic centreline. References:
// https://www.madring.com/en/circuit
// https://www.madring.com/en/press-releases/new-renders-madring
// These are visual reconstructions, not surveyed construction drawings.
import {sample} from './tracks.mjs';
const cache=new WeakMap();
export function madridLayout(track){
 if(cache.has(track))return cache.get(track);
 const at=(lon,lat)=>{
  const x=(lon-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z=-(lat-track.origin.lat)*111320;
  let index=0,best=Infinity;track.points.forEach((p,i)=>{const d=(p.x-x)**2+(p.z-z)**2;if(d<best){best=d;index=i;}});return index*track.step;
 };
 const data={tunnels:[{name:'RIBERA DEL SENA',s:at(-3.62402,40.47167),length:110},{name:'NORTE · IFEMA',s:at(-3.61823,40.47192),length:112}],monumental:{start:at(-3.6247,40.47923)-50,end:at(-3.62255,40.47928)+45,side:1},crest:at(-3.62534,40.47478),north:at(-3.6159,40.4715),halls:at(-3.6127,40.4684),heights:track.points.filter((_,i)=>i%6===0)};
 cache.set(track,data);return data;
}
export function madridTunnelAt(track,s,extra=0){
 if(track.id!=='es-2026')return null;
 return madridLayout(track).tunnels.find(t=>Math.abs(((s-t.s+track.length*1.5)%track.length)-track.length/2)<t.length/2+extra)||null;
}
export function madridTunnelLayout(track,tunnel){
 const center=sample(track,tunnel.s),start=sample(track,tunnel.s-tunnel.length/2),end=sample(track,tunnel.s+tunnel.length/2),heading=Math.atan2(end.x-start.x,end.z-start.z),rx=Math.cos(heading),rz=-Math.sin(heading),fx=Math.sin(heading),fz=Math.cos(heading),points=[];
 for(let s=tunnel.s-tunnel.length/2-8;s<=tunnel.s+tunnel.length/2+8;s+=2){const p=sample(track,s);points.push({x:(p.x-center.x)*rx+(p.z-center.z)*rz,z:(p.x-center.x)*fx+(p.z-center.z)*fz,y:p.y});}
 const left=Math.min(...points.map(p=>p.x))-track.width/2-7,right=Math.max(...points.map(p=>p.x))+track.width/2+7,back=Math.min(...points.map(p=>p.z))+8,front=Math.max(...points.map(p=>p.z))-8,floor=Math.min(...points.map(p=>p.y))-.1,roof=Math.max(...points.map(p=>p.y))+7.2;
 const world=(x,z)=>({x:center.x+rx*x+fx*z,z:center.z+rz*x+fz*z,y:floor});
 const walls=[{a:world(left,back),b:world(left,front),width:.8,height:roof-floor,inward:{x:rx,z:rz}},{a:world(right,back),b:world(right,front),width:.8,height:roof-floor,inward:{x:-rx,z:-rz}}];
 return {center,heading,left,right,back,front,floor,roof,walls};
}
