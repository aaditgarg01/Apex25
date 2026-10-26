import {wrap} from './tracks.mjs';
import {clearImpact} from './motion.mjs';
import {TYRES,fitTyres} from './tyres.mjs';
import {pitLayout,pitRoadPose} from './pit-layout.mjs';
export {pitLayout,pitRoadPose} from './pit-layout.mjs';
export const PIT_SPEED=80/3.6,PIT_SERVICE_SECONDS=3;
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
 // The booking does not pull a car across the racing line: steer to the
 // signed entrance at the edge before assistance takes over.
 if(layout.side*(car.lateral||0)<track.width/2-3.4)return false;
 car.pitState='lane';car.pitRequested=false;car.pitTravel=travel-ahead;
 if(!Number.isFinite(car.tyreRaceLaps))car.invalidLap=true;
 car.pitEntryProgress=car.progress-car.pitTravel;car.pitEntryOffset=car.lateral||0;car.pitTimer=0;car.pitFitted=false;car.v=Math.min(PIT_SPEED,Math.max(0,car.v));clearImpact(car);
 return true;
}
export function pitPose(car,track,distance=car.pitTravel){
 return pitRoadPose(track,distance,0,car.pitEntryOffset);
}
export function preparePitTraffic(cars,track){
 for(const c of cars){c.pitClearance=Infinity;if(c.pitState==='none')continue;for(const other of cars){if(c===other||other.finished||other.pitState==='none')continue;const gap=other.pitTravel-c.pitTravel;if(gap>=0&&(gap>0||c.index>other.index))c.pitClearance=Math.min(c.pitClearance,Math.max(0,gap-8));}}
 if(track){const plan=pitLayout(track);for(const c of cars)if(c.pitState==='exit'&&c.pitTravel>plan.length-plan.taper){for(const other of cars){if(c===other||other.finished||other.pitState!=='none'||other.v<5)continue;const ahead=wrap(plan.entry+plan.length-other.s,track.length);if(ahead<Math.max(35,other.v*1.1))c.pitClearance=Math.min(c.pitClearance,Math.max(0,plan.length-12-c.pitTravel));}}}
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
  car.v=Math.min(PIT_SPEED,car.v+dt*8,safeSpeed);const a=pitPose(car,track,car.pitTravel-.2),b=pitPose(car,track,car.pitTravel+.2),rate=Math.max(.4,Math.hypot(b.x-a.x,b.z-a.z)/.4),move=Math.max(0,Math.min(car.v*dt/rate,remaining,car.pitClearance??Infinity));
  if(move<car.v*dt/rate-.001)car.v=move*rate/dt;
  car.pitTravel+=move;
  if(remaining-move<.03){
   if(stopAtBox){car.pitTravel=plan.box;car.pitState='service';car.pitTimer=PIT_SERVICE_SECONDS;car.v=0;}
   else{car.pitTravel=plan.length;car.pitState='none';car.pitEntryOffset=0;}
  }
 }
 const p=pitPose(car,track);Object.assign(car,p);car.s=wrap(plan.entry+car.pitTravel,track.length);car.progress=car.pitEntryProgress+car.pitTravel;car.motionHeading=p.heading;car.motionYawRate=0;car.lateral=plan.offset;
 return true;
}
