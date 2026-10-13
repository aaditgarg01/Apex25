import {ribbonOffset} from './surface.mjs';
import {conditionProfile} from './conditions.mjs';
const wrap=(n,m)=>((n%m)+m)%m,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function roadSample(track,s){const f=wrap(s,track.length)/track.step,i=Math.floor(f),t=f-i,a=track.points[i],b=track.points[(i+1)%track.points.length];return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:a.y+(b.y-a.y)*t,pitch:a.pitch+(b.pitch-a.pitch)*t,heading:a.heading+angle(b.heading,a.heading)*t};}
export function prepareRacingLine(track){
 if(track.racingLine)return track.racingLine;
 const n=Math.max(32,Math.ceil(track.length/6)),step=track.length/n,base=Array.from({length:n},(_,i)=>roadSample(track,i*step)),at=i=>base[wrap(i,n)],limit=Math.max(.2,track.width/2-1.8);
 const bounds=base.map((p,i)=>{const index=Math.floor(i*step/track.step)%track.points.length;return {low:Math.max(-limit,ribbonOffset(track,index,-track.width/2)+2.1),high:Math.min(limit,ribbonOffset(track,index,track.width/2)-2.1)};});
 let curve=base.map((p,i)=>angle(at(i+4).heading,at(i-4).heading)/(8*step));
 for(let pass=0;pass<3;pass++)curve=curve.map((k,i)=>(curve[wrap(i-1,n)]+k*2+curve[(i+1)%n])/4);
 const candidates=[];for(let i=0;i<n;i++){const k=Math.abs(curve[i]);if(k<.0012)continue;let peak=true;for(let j=-5;j<=5;j++)if(Math.abs(curve[wrap(i+j,n)])>k){peak=false;break;}if(peak)candidates.push({s:i*step,k,sign:Math.sign(curve[i])});}
 candidates.sort((a,b)=>b.k-a.k);const turns=[];for(const c of candidates){if(turns.some(t=>t.sign===c.sign&&Math.abs(angle(c.s/track.length*Math.PI*2,t.s/track.length*Math.PI*2))*track.length/(Math.PI*2)<75))continue;turns.push(c);}
 const desired=base.map((p,i)=>{let offset=0,weight=0;for(const turn of turns){const d=wrap(i*step-turn.s+track.length/2,track.length)-track.length/2,width=clamp(.55/turn.k,28,90);if(Math.abs(d)>width*3.5)continue;const strength=clamp(turn.k/.014,.22,1),inside=Math.exp(-Math.pow(d/width,2)),entry=Math.exp(-Math.pow((d+width*1.65)/(width*.72),2)),exit=Math.exp(-Math.pow((d-width*1.85)/(width*.85),2));offset+=turn.sign*limit*strength*(inside-.82*entry-.82*exit);weight+=strength*Math.exp(-Math.pow(d/(width*2.5),2));}return clamp(offset/Math.max(1,weight),bounds[i].low,bounds[i].high);});
 let offsets=[...desired];
 // Smooth changes in curvature, constrained to the driving ribbon. The entry,
 // apex and exit seed prevents the solution simply hugging the inside edge.
 for(let pass=0;pass<32;pass++){
  const path=base.map((p,i)=>({x:p.x+Math.cos(p.heading)*offsets[i],z:p.z-Math.sin(p.heading)*offsets[i]}));
  offsets=offsets.map((offset,i)=>{const a=path[wrap(i-2,n)],b=path[wrap(i-1,n)],c=path[i],d=path[(i+1)%n],e=path[(i+2)%n],dx=a.x-4*b.x+6*c.x-4*d.x+e.x,dz=a.z-4*b.z+6*c.z-4*d.z+e.z,p=base[i];return clamp(offset-.045*(dx*Math.cos(p.heading)-dz*Math.sin(p.heading))+.025*(desired[i]-offset),bounds[i].low,bounds[i].high);});
 }
 const points=base.map((p,i)=>({...p,x:p.x+Math.cos(p.heading)*offsets[i],z:p.z-Math.sin(p.heading)*offsets[i],offset:offsets[i]}));
 points.forEach((p,i)=>{const a=points[wrap(i-2,n)],b=points[(i+2)%n];p.heading=Math.atan2(b.x-a.x,b.z-a.z);});
 let curvature=points.map((p,i)=>{const a=points[wrap(i-2,n)],b=points[(i+2)%n];return Math.abs(angle(b.heading,a.heading))/Math.max(step*2,Math.hypot(b.x-a.x,b.z-a.z));});
 for(let pass=0;pass<2;pass++)curvature=curvature.map((k,i)=>(curvature[wrap(i-1,n)]+k*2+curvature[(i+1)%n])/4);
 track.racingLine={points,curvature,step,length:track.length,speeds:new Map()};return track.racingLine;
}
export function sampleGuide(track,s){const line=prepareRacingLine(track),f=wrap(s,line.length)/line.step,i=Math.floor(f),t=f-i,a=line.points[i],b=line.points[(i+1)%line.points.length];return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,pitch:a.pitch+(b.pitch-a.pitch)*t,heading:a.heading+angle(b.heading,a.heading)*t,offset:a.offset+(b.offset-a.offset)*t};}
function speedProfile(track,value){
 const line=prepareRacingLine(track),condition=conditionProfile(value);if(line.speeds.has(condition.id))return line.speeds.get(condition.id);
 const wet=condition.wetness,base=20-10.5*wet,aero=.0042-.00255*wet,max=110*(1-.10*wet),n=line.points.length;
 const speeds=line.curvature.map(k=>{const corner=k>aero?Math.sqrt(base/(k-aero)):max;const steering=k>.025?3.8*condition.steering/(k+Math.sqrt(k*k+.19*k*condition.steering)):max;return clamp(Math.min(corner,steering),8,max);});
 // Backward braking and forward acceleration passes link corners to straights,
 // including the seam of the closed lap and uphill/downhill braking distances.
 for(let pass=0;pass<4;pass++){
  for(let i=n-1;i>=0;i--){const next=(i+1)%n,ds=Math.max(1,Math.hypot(line.points[next].x-line.points[i].x,line.points[next].z-line.points[i].z)),brake=Math.max(5,33*condition.braking+9.81*Math.sin(line.points[i].pitch));speeds[i]=Math.min(speeds[i],Math.sqrt(speeds[next]**2+2*brake*ds));}
  for(let i=0;i<n;i++){const previous=wrap(i-1,n),ds=Math.max(1,Math.hypot(line.points[i].x-line.points[previous].x,line.points[i].z-line.points[previous].z));speeds[i]=Math.min(speeds[i],Math.sqrt(speeds[previous]**2+2*9*condition.traction*ds));}
 }
 line.speeds.set(condition.id,speeds);return speeds;
}
export function racingSpeedAt(track,s,conditions='normal'){const line=prepareRacingLine(track),speeds=speedProfile(track,conditions),f=wrap(s,line.length)/line.step,i=Math.floor(f),t=f-i;return speeds[i]+(speeds[(i+1)%speeds.length]-speeds[i])*t;}
