import {sample,wrap,angleDiff} from './tracks.mjs';
const cache=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
function point(track,plan,d,across=0,entryOffset=plan.entryOffset){
 const enter=smooth(d/plan.taper),leave=smooth((plan.length-d)/plan.taper);
 const offset=entryOffset*(1-enter)+plan.offset*enter*leave+plan.entryOffset*(1-leave);
 return sample(track,plan.entry+d,offset+across);
}
// A dedicated off-track lane, with two gradual connections to the road edge.
// Search both sides near the start line to avoid neighboring circuit branches.
export function pitLayout(track){
 if(cache.has(track))return cache.get(track);
 const length=Math.min(400,track.length*.12),taper=Math.min(95,length*.25),zone=Math.min(1000,track.length*.23),candidates=[];
 for(let center=-zone;center<=zone;center+=18){const p=sample(track,center);let bend=0;for(let d=-length/2;d<=length/2;d+=15)bend+=Math.abs(angleDiff(sample(track,center+d).heading,p.heading));candidates.push({center,cost:bend+Math.abs(center)/zone*.3});}
 candidates.sort((a,b)=>a.cost-b.cost);let best=null;
 for(const candidate of candidates.slice(0,12))for(const side of [-1,1]){
  const plan={entry:wrap(candidate.center-length/2,track.length),length,box:length*.52,offset:side*(track.width/2+5),entryOffset:side*(track.width/2-1.8),side,width:6,taper};
  let cost=candidate.cost;
  for(let d=taper;d<=length-taper;d+=15){const p=point(track,plan,d),s=wrap(plan.entry+d,track.length);for(let j=0;j<track.points.length;j+=8){const arc=Math.abs(j*track.step-s);if(Math.min(arc,track.length-arc)<110)continue;const q=track.points[j],distance=Math.hypot(p.x-q.x,p.z-q.z);if(Math.abs(p.y-q.y)<5&&distance<track.width/2+8)cost+=(track.width/2+8-distance)*5;}}
  if(!best||cost<best.cost)best={...plan,cost};
 }
 best.samples=[];best.grid=new Map();
 for(let d=0;d<=best.length;d+=3){const p={...point(track,best,d),d};best.samples.push(p);const key=Math.floor(p.x/16)+':'+Math.floor(p.z/16);if(!best.grid.has(key))best.grid.set(key,[]);best.grid.get(key).push(p);}
 cache.set(track,best);return best;
}
export function pitRoadPose(track,d,across=0,entryOffset){
 const plan=pitLayout(track),p=point(track,plan,d,across,entryOffset),a=point(track,plan,d-.2,across,entryOffset),b=point(track,plan,d+.2,across,entryOffset),dx=b.x-a.x,dz=b.z-a.z;
 return {...p,heading:Math.atan2(dx,dz),pitch:Math.atan2(b.y-a.y,Math.hypot(dx,dz))};
}
export function pitGroundHeight(track,x,z,height){
 const plan=pitLayout(track);let best=Infinity,closest=null;
 for(let gx=Math.floor(x/16)-1;gx<=Math.floor(x/16)+1;gx++)for(let gz=Math.floor(z/16)-1;gz<=Math.floor(z/16)+1;gz++)for(const p of plan.grid.get(gx+':'+gz)||[]){const d=Math.hypot(x-p.x,z-p.z);if(d<best){best=d;closest=p;}}
 if(!closest||best>plan.width/2+20)return height;
 const blend=1-smooth((best-plan.width/2-10)/10);
 return height+(closest.y-.08-height)*blend;
}
export function pitBoundary(track,s){
 const plan=pitLayout(track),d=wrap(s-plan.entry,track.length);if(d>plan.length)return null;
 const p=point(track,plan,d),road=sample(track,s),lateral=(p.x-road.x)*Math.cos(road.heading)-(p.z-road.z)*Math.sin(road.heading);
 return {side:plan.side,d,outer:Math.max(track.width/2+.8,Math.abs(lateral)+plan.width/2+.45),divider:d>plan.taper+6&&d<plan.length-plan.taper-6};
}
export function pitReserved(track,x,z,padding=5){
 const plan=pitLayout(track);
 for(let gx=Math.floor(x/16)-1;gx<=Math.floor(x/16)+1;gx++)for(let gz=Math.floor(z/16)-1;gz<=Math.floor(z/16)+1;gz++)for(const p of plan.grid.get(gx+':'+gz)||[])if(Math.hypot(x-p.x,z-p.z)<padding)return true;
 return false;
}
