import {sample,wrap,angleDiff} from './tracks.mjs';
import {clearImpact} from './motion.mjs';
import {TYRES,fitTyres} from './tyres.mjs';
const layouts=new WeakMap(),smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export const PIT_SPEED=80/3.6,PIT_SERVICE_SECONDS=3;
// Shared, marked service lanes on a straight near the start/finish. Their path
// stays on the existing paved ribbon so no trackside walls are crossed.
export function pitLayout(track){
 if(layouts.has(track))return layouts.get(track);
 const length=Math.min(240,track.length*.08),zone=Math.min(800,track.length*.20);let best=null;
 for(let center=-zone;center<=zone;center+=12){
  const p=sample(track,center);let bend=0;
  for(let d=-length/2;d<=length/2;d+=12)bend+=Math.abs(angleDiff(sample(track,center+d).heading,p.heading));
  const cost=bend+Math.abs(center)/zone*.35;
  if(!best||cost<best.cost)best={center,cost};
 }
 const plan={entry:wrap(best.center-length/2,track.length),length,box:length*.52,offset:-(track.width/2-2.1),width:3.8,taper:Math.min(45,length*.20)};
 layouts.set(track,plan);return plan;
}
export const pitAhead=(car,track)=>wrap(pitLayout(track).entry-car.s,track.length);
export function requestPit(car,compound){
 if(!car||car.finished||car.retired||!Number.isFinite(car.tyreLife)||car.pitState!=='none')return false;
 if(compound!==undefined&&!Object.hasOwn(TYRES,compound))return false;
 if(compound)car.pitCompound=compound;
 car.pitRequested=!car.pitRequested;return true;
}
export function tryPitEntry(car,track,previousS){
 if(!car.pitRequested||car.pitState!=='none'||car.v<0)return false;
 const layout=pitLayout(track),travel=wrap(car.s-previousS,track.length),ahead=wrap(layout.entry-previousS,track.length);
 if(travel>15||ahead>travel)return false;
 car.pitState='lane';car.pitRequested=false;car.pitTravel=travel-ahead;
 if(!Number.isFinite(car.tyreRaceLaps))car.invalidLap=true;
 car.pitEntryProgress=car.progress-car.pitTravel;car.pitEntryOffset=car.lateral||0;car.pitTimer=0;car.pitFitted=false;car.v=Math.min(PIT_SPEED,Math.max(0,car.v));clearImpact(car);
 return true;
}
export function pitPose(car,track,distance=car.pitTravel){
 const plan=pitLayout(track),at=d=>{const entry=smooth(d/plan.taper),exit=smooth((plan.length-d)/plan.taper),offset=(car.pitEntryOffset||0)*(1-entry)+plan.offset*entry*exit;return sample(track,plan.entry+d,offset);};
 const p=at(distance),a=at(distance-.2),b=at(distance+.2),dx=b.x-a.x,dz=b.z-a.z;
 return {...p,heading:Math.atan2(dx,dz),pitch:Math.atan2(b.y-a.y,Math.hypot(dx,dz))};
}
export function preparePitTraffic(cars){
 for(const c of cars){c.pitClearance=Infinity;if(c.pitState==='none')continue;for(const other of cars){if(c===other||other.finished||other.pitState==='none')continue;const gap=other.pitTravel-c.pitTravel;if(gap>=0&&(gap>0||c.index>other.index))c.pitClearance=Math.min(c.pitClearance,Math.max(0,gap-8));}}
}
export function stepPit(car,track,dt){
 if(!car.pitState||car.pitState==='none')return false;
 const plan=pitLayout(track);clearImpact(car);car.boostActive=false;car.steer=0;car.sliding=false;
 if(!Number.isFinite(car.tyreRaceLaps))car.invalidLap=true;
 car.offtrack=false;car.offtrackTime=0;car.offtrackPenalty=false;
 car.boost=Math.min(100,car.boost+dt*4);car.tyreImpactCooldown=Math.max(0,(car.tyreImpactCooldown||0)-dt);
 if(car.pitState==='service'){
  car.v=0;car.pitTimer=Math.max(0,car.pitTimer-dt);
  if(car.pitTimer===0){if(!car.pitFitted){fitTyres(car);car.pitFitted=true;}car.pitState='exit';}
 }else{
  const remaining=car.pitState==='lane'?plan.box-car.pitTravel:plan.length-car.pitTravel;
  const stopAtBox=car.pitState==='lane',safeSpeed=stopAtBox?Math.sqrt(Math.max(0,2*18*remaining)):PIT_SPEED;
  car.v=Math.min(PIT_SPEED,car.v+dt*8,safeSpeed);const move=Math.max(0,Math.min(car.v*dt,remaining,car.pitClearance??Infinity));
  if(move<car.v*dt-.001)car.v=move/dt;
  car.pitTravel+=move;
  if(remaining-move<.03){
   if(stopAtBox){car.pitTravel=plan.box;car.pitState='service';car.pitTimer=PIT_SERVICE_SECONDS;car.v=0;}
   else{car.pitTravel=plan.length;car.pitState='none';car.pitEntryOffset=0;}
  }
 }
 const p=pitPose(car,track);Object.assign(car,p);car.s=wrap(plan.entry+car.pitTravel,track.length);car.progress=car.pitEntryProgress+car.pitTravel;car.motionHeading=p.heading;car.motionYawRate=0;car.lateral=plan.offset;
 return true;
}
