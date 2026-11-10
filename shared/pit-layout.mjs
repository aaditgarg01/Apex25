import {sample,wrap,angleDiff} from './tracks.mjs';
const cache=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const BOX_COUNT=8,BOX_SPACING=9;

// Keep the old service anchor for scenery and transit timing. The row sits
// entirely between the tapers so each numbered stop is on the parallel lane.
function serviceBoxes(plan){
 const span=(BOX_COUNT-1)*BOX_SPACING;
 const first=clamp(plan.box-span/2,plan.taper+5,plan.length-plan.taper-5-span);
 return Array.from({length:BOX_COUNT},(_,index)=>first+index*BOX_SPACING);
}

export function pitStopStation(plan,car){
 // A checkpoint written before numbered boxes can already be in the lane.
 return plan.boxes[car.pitBoxIndex]??plan.box;
}

function point(track,plan,d,across=0,entryOffset=plan.entryOffset){
 const road=sample(track,plan.entry+d),frame=plan.frame,rx=Math.cos(frame.heading),rz=-Math.sin(frame.heading),fx=Math.sin(frame.heading),fz=Math.cos(frame.heading);
 const longitudinal=(road.x-frame.x)*fx+(road.z-frame.z)*fz,enter=smooth(d/plan.taper),leave=smooth((plan.length-d)/plan.taper),body=enter*leave;
 const start=sample(track,plan.entry+d,entryOffset),end=sample(track,plan.entry+d,plan.entryOffset),bx=frame.x+fx*longitudinal+rx*plan.offset,bz=frame.z+fz*longitudinal+rz*plan.offset;
 // The service corridor has one fixed axis. Only the two road connections bend.
 const nx=Math.cos(road.heading)*(1-body)+rx*body,nz=-Math.sin(road.heading)*(1-body)+rz*body,n=Math.hypot(nx,nz);
 return {...road,...(track.id==='nl-1948'?{y:start.y*(1-enter)+end.y*enter*(1-leave)+road.y*body}:{}),x:start.x*(1-enter)+end.x*enter*(1-leave)+bx*body+nx/n*across,z:start.z*(1-enter)+end.z*enter*(1-leave)+bz*body+nz/n*across};
}
function mainStraight(track){
 const bound=Math.min(1200,track.length*.23);let best=null;
 // Search only the segment containing the start/finish, never another nearby straight.
 for(let seed=-120;seed<=120;seed+=12){
  const heading=sample(track,seed).heading;let start=seed,end=seed;
  while(start-6>=-bound&&Math.abs(angleDiff(sample(track,start-6).heading,heading))<.12)start-=6;
  while(end+6<=bound&&Math.abs(angleDiff(sample(track,end+6).heading,heading))<.12)end+=6;
  if(start>0||end<0)continue;
  const length=end-start;if(!best||length>best.length)best={start,end,length};
 }
 return best||{start:-75,end:75,length:150};
}
// Match established mapped pit complexes. Other circuits prefer the infield.
// Service-box stations fitted to the existing pit-building assets (metres from start/finish).
const PIT_BOXES={'my-1999':-145,'cn-2004':-69,'jp-1962':-102,'be-1925':12,'sa-2021':-303,'az-2016':-150,'sg-2008':-36,'es-2026':-20,'mx-1962':65,'us-2023':-85};
const PIT_SIDES={'my-1999':-1,'in-2011':-1,'ca-1978':1,'it-1953':-1,'cn-2004':-1,'jp-1962':-1,'be-1925':-1,'sa-2021':1,'az-2016':1,'sg-2008':1,'es-2026':-1,'mx-1962':-1,'us-2023':-1,'mc-1929':-1};
export function pitLayout(track){
 if(cache.has(track))return cache.get(track);
 const straight=mainStraight(track),available=straight.length-24,lengths=[Math.min(650,available),520,400,280,180].filter((length,i,all)=>length<=available&&length>=120&&all.indexOf(length)===i);let best=null;
 if(!lengths.length)lengths.push(Math.max(90,available));
 const startFrame=sample(track,0),centroid=track.points.reduce((v,p)=>({x:v.x+p.x/track.points.length,z:v.z+p.z/track.points.length}),{x:0,z:0}),preferred=PIT_SIDES[track.id]||Math.sign((centroid.x-startFrame.x)*Math.cos(startFrame.heading)-(centroid.z-startFrame.z)*Math.sin(startFrame.heading))||1;
 for(const length of lengths){
  const anchor=PIT_BOXES[track.id]??0,center=clamp(anchor,straight.start+12+length/2,straight.end-12-length/2),entry=center-length/2,a=sample(track,entry),b=sample(track,entry+length),frame={...sample(track,center),heading:Math.atan2(b.x-a.x,b.z-a.z)},rx=Math.cos(frame.heading),rz=-Math.sin(frame.heading),taper=Math.min(95,length*.22);
  for(const side of [preferred,-preferred]){
   let edge=track.width/2;
   for(let d=taper;d<=length-taper;d+=6){const p=sample(track,entry+d),extent=side*((p.x-frame.x)*rx+(p.z-frame.z)*rz)+track.width/2;edge=Math.max(edge,extent);}
   const plan={entry:wrap(entry,track.length),length,box:PIT_BOXES[track.id]===undefined?length*.52:clamp(anchor-entry,taper+16,length-taper-16),offset:side*(edge+5),entryOffset:side*(track.width/2-1.8),side,width:6,taper,frame,straight};
   let cost=(650-length)*.002+(side===preferred?0:2);
   for(let d=taper;d<=length-taper;d+=12){const p=point(track,plan,d),s=wrap(plan.entry+d,track.length);for(let j=0;j<track.points.length;j+=4){const arc=Math.abs(j*track.step-s);if(Math.min(arc,track.length-arc)<80)continue;const q=track.points[j],distance=Math.hypot(p.x-q.x,p.z-q.z);if(Math.abs(p.y-q.y)<5&&distance<track.width/2+5)cost+=(track.width/2+5-distance)*1000;}}
   if(!best||cost<best.cost)best={...plan,cost};
  }
 }
 best.boxes=serviceBoxes(best);
 best.samples=[];best.grid=new Map();
 for(let d=0;d<=best.length;d+=3){const p={...point(track,best,d),d};best.samples.push(p);const key=Math.floor(p.x/16)+':'+Math.floor(p.z/16);if(!best.grid.has(key))best.grid.set(key,[]);best.grid.get(key).push(p);}
 cache.set(track,best);return best;
}
export function pitRoadPose(track,d,across=0,entryOffset){
 const plan=pitLayout(track),p=point(track,plan,d,across,entryOffset),a=point(track,plan,d-.2,across,entryOffset),b=point(track,plan,d+.2,across,entryOffset),dx=b.x-a.x,dz=b.z-a.z;
 return {...p,heading:Math.atan2(dx,dz),pitch:Math.atan2(b.y-a.y,Math.hypot(dx,dz))};
}
// Project onto the physical lane, independently of crossing its first station.
// The spatial grid keeps late-entry checks local and avoids neighboring branches.
export function locatePitLane(track,car){
 const plan=pitLayout(track);let best=null;
 for(let gx=Math.floor(car.x/16)-1;gx<=Math.floor(car.x/16)+1;gx++)for(let gz=Math.floor(car.z/16)-1;gz<=Math.floor(car.z/16)+1;gz++)for(const a of plan.grid.get(gx+':'+gz)||[]){
  const end=Math.min(plan.length,a.d+3);if(end===a.d)continue;
  const b=point(track,plan,end),dx=b.x-a.x,dz=b.z-a.z,t=clamp(((car.x-a.x)*dx+(car.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1),x=a.x+dx*t,z=a.z+dz*t,y=a.y+(b.y-a.y)*t,distance=Math.hypot(car.x-x,car.z-z);
  if(Math.abs((car.y??y)-y)>2||best&&distance>=best.distance)continue;
  best={d:a.d+(end-a.d)*t,x,y,z,distance,heading:Math.atan2(dx,dz)};
 }
 return best;
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
