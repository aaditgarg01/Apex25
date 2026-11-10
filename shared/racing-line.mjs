import {istanbulSurfaceAt} from './istanbul.mjs';
import {portimaoSurfaceAt} from './portimao.mjs';
import {paulRicardSurfaceAt} from './paulricard.mjs';
import {madridSurfaceAt} from './madrid-scenery.mjs';
import {sepangSurfaceAt} from './sepang.mjs';
import {buddhSurfaceAt} from './buddh.mjs';
import {singaporeSurfaceAt} from './singapore.mjs';
import {lusailSurfaceAt} from './lusail.mjs';
import {yasmarinaSurfaceAt} from './yasmarina.mjs';
import {montrealSurfaceAt} from './montreal.mjs';
import {barcelonaSurfaceAt} from './barcelona.mjs';
import {hungaroringSurfaceAt} from './hungaroring.mjs';
import {imolaSurfaceAt} from './imola.mjs';
import {cotaSurfaceAt} from './cota.mjs';
import {monzaSurfaceAt} from './monza.mjs';
import {mexicoSurfaceAt} from './mexico.mjs';
import {redbullringSurfaceAt} from './redbullring.mjs';
import {silverstoneSurfaceAt} from './silverstone.mjs';
import {miamiSurfaceAt} from './miami.mjs';
import {bankingAt,bankSupport} from './banked-road.mjs';
import {ribbonOffset} from './surface.mjs';
import {conditionProfile} from './conditions.mjs';
const wrap=(n,m)=>((n%m)+m)%m,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function roadSample(track,s){const f=wrap(s,track.length)/track.step,i=Math.floor(f),t=f-i,a=track.points[i],b=track.points[(i+1)%track.points.length];return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:a.y+(b.y-a.y)*t,pitch:a.pitch+(b.pitch-a.pitch)*t,heading:a.heading+angle(b.heading,a.heading)*t};}
// Sample the same road edge the renderer uses, including compressed hairpins.
export function guideBounds(track,s){
 const index=Math.floor(wrap(s,track.length)/track.step);
 const half=track.width/2;
 return {low:Math.min(0,ribbonOffset(track,index,-half)+1.8),high:Math.max(0,ribbonOffset(track,index,half)-1.8)};
}

export function prepareRacingLine(track){
 if(track.racingLine)return track.racingLine;
 const n=Math.max(32,Math.ceil(track.length/5)),step=track.length/n;
 const base=Array.from({length:n},(_,i)=>roadSample(track,i*step)),at=i=>base[wrap(i,n)];
 const bounds=base.map((_,i)=>guideBounds(track,i*step));
 const normals=base.map(p=>({x:Math.cos(p.heading),z:-Math.sin(p.heading)}));
 let curve=base.map((_,i)=>angle(at(i+4).heading,at(i-4).heading)/(8*step));
 for(let pass=0;pass<3;pass++)curve=curve.map((k,i)=>(curve[wrap(i-1,n)]+k*2+curve[(i+1)%n])/4);

 // Bias the apex later when a long acceleration zone follows. Overlapping
 // corners compete for the same road width, so an exit can set up the next apex.
 const turns=[];
 for(let i=0;i<n;i++){
  const k=Math.abs(curve[i]);
  if(k<.0014)continue;
  let peak=true;
  for(let d=-6;d<=6;d++){
   if(Math.abs(curve[wrap(i+d,n)])>k){peak=false;break;}
  }
  if(!peak)continue;
  const exitStraight=[45,70,100,130].every(d=>Math.abs(curve[wrap(i+Math.round(d/step),n)])<.0024);
  turns.push({s:i*step+(exitStraight?Math.min(12,Math.max(4,.09/k)):0),k,sign:Math.sign(curve[i]),exitStraight});
 }
 const reference=base.map((_,i)=>{
  let sum=0,weight=0;
  for(const turn of turns){
   const d=wrap(i*step-turn.s+track.length/2,track.length)-track.length/2;
   const radius=clamp(.38/turn.k,16,64);
   if(Math.abs(d)>radius*3.4)continue;
   const strength=clamp(turn.k/.008,.23,1.1);
   const inside=Math.exp(-((d/radius)**2));
   const entry=Math.exp(-(((d+radius*1.48)/(radius*.68))**2));
   const exit=Math.exp(-(((d-radius*1.6)/(radius*.8))**2));
   sum+=turn.sign*strength*(inside-1.18*entry-(turn.exitStraight?1.18:.76)*exit);
   weight+=strength*Math.exp(-((d/(radius*2))**2));
  }
  const offset=sum/Math.max(1,weight);
  return clamp(offset*(offset<0?-bounds[i].low:bounds[i].high),bounds[i].low,bounds[i].high);
 });

 // Fit lower curvature to the real path, where moving outward can increase
 // the bend radius. A small reference term preserves the exit-weighted line.
 const offsets=Float64Array.from(reference);
 const x=new Float64Array(n),z=new Float64Array(n),gradient=new Float64Array(n);
 const weights=base.map((_,i)=>1+Math.min(1,Math.abs(curve[i])/.012));
 for(let pass=0;pass<240;pass++){
  gradient.fill(0);
  for(let i=0;i<n;i++){
   x[i]=base[i].x+normals[i].x*offsets[i];
   z[i]=base[i].z+normals[i].z*offsets[i];
  }
  for(let i=0;i<n;i++){
   const a=wrap(i-2,n),b=wrap(i+2,n);
   const ux=x[i]-x[a],uz=z[i]-z[a],vx=x[b]-x[i],vz=z[b]-z[i];
   const wx=ux+vx,wz=uz+vz;
   const uu=Math.max(1,ux*ux+uz*uz),vv=Math.max(1,vx*vx+vz*vz),ww=Math.max(1,wx*wx+wz*wz);
   const cross=ux*vz-uz*vx,scale=8*step*step/Math.sqrt(uu*vv*ww);
   const factor=weights[i]*cross*scale*scale;
   const before=normals[a],center=normals[i],after=normals[b];
   gradient[a]+=factor*(-before.x*vz+before.z*vx+cross*((before.x*ux+before.z*uz)/uu+(before.x*wx+before.z*wz)/ww));
   gradient[i]+=factor*(center.x*wz-center.z*wx-cross*((center.x*ux+center.z*uz)/uu-(center.x*vx+center.z*vz)/vv));
   gradient[b]+=factor*(ux*after.z-uz*after.x-cross*((after.x*vx+after.z*vz)/vv+(after.x*wx+after.z*wz)/ww));
  }
  for(let i=0;i<n;i++){
   const smooth=2*offsets[i]-offsets[wrap(i-1,n)]-offsets[wrap(i+1,n)];
   const change=gradient[i]+.08*(offsets[i]-reference[i])+.24*smooth;
   x[i]=clamp(offsets[i]-.014*change,bounds[i].low,bounds[i].high);
  }
  offsets.set(x);
 }
 const points=base.map((p,i)=>({...p,y:p.y+bankingAt(track,i*step,offsets[i]).height,roll:bankingAt(track,i*step,offsets[i]).roll,x:p.x+Math.cos(p.heading)*offsets[i],z:p.z-Math.sin(p.heading)*offsets[i],offset:offsets[i]}));
 points.forEach((p,i)=>{const a=points[wrap(i-2,n)],b=points[(i+2)%n];p.heading=Math.atan2(b.x-a.x,b.z-a.z);if(track.id==='nl-1948')p.pitch=Math.atan2(b.y-a.y,Math.hypot(b.x-a.x,b.z-a.z));});
 let curvature=points.map((p,i)=>{const a=points[wrap(i-2,n)],b=points[(i+2)%n];return Math.abs(angle(b.heading,a.heading))/Math.max(step*2,Math.hypot(b.x-a.x,b.z-a.z));});
 for(let pass=0;pass<2;pass++)curvature=curvature.map((k,i)=>(curvature[wrap(i-1,n)]+k*2+curvature[(i+1)%n])/4);
 track.racingLine={points,curvature,step,length:track.length,speeds:new Map()};return track.racingLine;
}
export function sampleGuide(track,s){const line=prepareRacingLine(track),f=wrap(s,line.length)/line.step,i=Math.floor(f),t=f-i,a=line.points[i],b=line.points[(i+1)%line.points.length];return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,pitch:a.pitch+(b.pitch-a.pitch)*t,heading:a.heading+angle(b.heading,a.heading)*t,offset:a.offset+(b.offset-a.offset)*t,curvature:line.curvature[i]+(line.curvature[(i+1)%line.points.length]-line.curvature[i])*t,roll:(a.roll||0)+((b.roll||0)-(a.roll||0))*t};}
function speedProfile(track,value,wetness){
 const line=prepareRacingLine(track),condition=conditionProfile(value,Number.isFinite(wetness)?Math.round(wetness*20)/20:undefined),key=String(condition.wetness);if(line.speeds.has(key))return line.speeds.get(key);
 const wet=condition.wetness,base=20-10.5*wet,aero=(.0042-.00255*wet)*(track.id==='mx-1962'?.78:1),max=110*(1-.10*wet),n=line.points.length;
 const corners=line.curvature.map((k,i)=>{let corner=k>aero?Math.sqrt(base/(k-aero)):max,steering=k>.025?3.8*condition.steering/(k+Math.sqrt(k*k+.19*k*condition.steering)):max;if(track.id==='nl-1948'){const bank=bankingAt(track,i*line.step,line.points[i].offset);for(let pass=0;pass<3;pass++){const support=bankSupport(bank.bank,Math.min(corner,max),1/Math.max(.0001,k),wet),gain=1+support.gain;corner=k>aero*gain?Math.sqrt((base*gain+support.extraLateral)/(k-aero*gain)):max;steering=k>.025?3.8*condition.steering*(1+support.extraLateral/Math.max(base,1))/(k+Math.sqrt(k*k+.19*k*condition.steering)):max;}}const surface=track.id==='tr-2005'?istanbulSurfaceAt(track,i*line.step,line.points[i].offset,wet,line.points[i]):track.id==='pt-2008'?portimaoSurfaceAt(track,i*line.step,line.points[i].offset,wet,line.points[i]):track.id==='fr-1969'&&Math.abs(line.points[i].offset)>track.width/2?paulRicardSurfaceAt(track,i*line.step,line.points[i].offset,wet,line.points[i]):track.id==='es-2026'&&Math.abs(line.points[i].offset)>track.width/2?madridSurfaceAt(track,i*line.step,line.points[i].offset,wet):track.id==='my-1999'?sepangSurfaceAt(track,i*line.step,line.points[i].offset,wet):track.id==='in-2011'?buddhSurfaceAt(track,i*line.step,line.points[i].offset,wet):track.id==='sg-2008'?singaporeSurfaceAt(track,i*line.step,line.points[i].offset,wet):track.id==='us-2022'?miamiSurfaceAt(track,i*line.step,line.points[i].offset,wet):track.id==='gb-1948'?silverstoneSurfaceAt(track,i*line.step,line.points[i].offset,wet):track.id==='at-1969'?redbullringSurfaceAt(track,i*line.step,line.points[i].offset,wet):track.id==='qa-2004'?lusailSurfaceAt(track,i*line.step,line.points[i].offset,wet):track.id==='ae-2009'?yasmarinaSurfaceAt(track,i*line.step,line.points[i].offset,wet):track.id==='ca-1978'?montrealSurfaceAt(track,i*line.step,line.points[i].offset,wet):track.id==='es-1991'?barcelonaSurfaceAt(track,i*line.step,line.points[i].offset,wet):track.id==='hu-1986'?hungaroringSurfaceAt(track,i*line.step,line.points[i].offset,wet):track.id==='it-1953'?imolaSurfaceAt(track,i*line.step,line.points[i].offset,wet):track.id==='us-2012'?cotaSurfaceAt(track,i*line.step,line.points[i].offset,wet):track.id==='it-1922'?monzaSurfaceAt(track,i*line.step,line.points[i].offset,wet):track.id==='mx-1962'?mexicoSurfaceAt(track,i*line.step,line.points[i].offset,wet):null;return clamp(Math.min(corner,steering)*(surface?Math.sqrt(surface.grip):1),8,max);});
 // Backward braking and forward acceleration passes link corners to straights,
 // including the seam of the closed lap and uphill/downhill braking distances.
 const speeds=[...corners];
 const distance=line.points.map((p,i)=>{
  const next=line.points[(i+1)%n];
  return Math.max(1,Math.hypot(next.x-p.x,next.z-p.z));
 });
 const grade=line.points.map(p=>9.81*Math.sin(p.pitch));
 const longitudinal=(i,speed)=>line.curvature[i]<.0015?1:Math.sqrt(Math.max(.16,1-(speed/Math.max(1,corners[i]))**4));
 for(let pass=0;pass<4;pass++){
  for(let i=n-1;i>=0;i--){
   const next=(i+1)%n,brake=Math.max(4,29*condition.braking*longitudinal(next,speeds[next])+grade[i]);
   speeds[i]=Math.min(speeds[i],Math.sqrt(speeds[next]**2+2*brake*distance[i]));
  }
  for(let i=0;i<n;i++){
   const previous=wrap(i-1,n),v=speeds[previous];
   const power=14*condition.traction*Math.max(.15,1-v/125),drag=.55+v*v*.00032;
   const accel=Math.max(0,(power-drag)*longitudinal(previous,v)-grade[previous]);
   speeds[i]=Math.min(speeds[i],Math.sqrt(v*v+2*accel*distance[previous]));
  }
 }
 line.speeds.set(key,speeds);return speeds;
}
export function racingSpeedAt(track,s,conditions='normal',wetness){const line=prepareRacingLine(track),speeds=speedProfile(track,conditions,wetness),f=wrap(s,line.length)/line.step,i=Math.floor(f),t=f-i;return speeds[i]+(speeds[(i+1)%speeds.length]-speeds[i])*t;}
