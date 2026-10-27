import {wrap,angleDiff} from './tracks.mjs';
import {clearImpact} from './motion.mjs';
import {TYRES,fitTyres} from './tyres.mjs';
import {pitLayout,pitRoadPose,locatePitLane} from './pit-layout.mjs';
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
 if(!car.pitRequested||car.pitState!=='none'||car.v<0||car.finished||car.retired)return false;
 const layout=pitLayout(track),travel=wrap(car.s-previousS,track.length),ahead=wrap(layout.entry-previousS,track.length),lane=locatePitLane(track,car);
 if(!lane||Math.cos(angleDiff(car.heading,lane.heading))<=0)return false;
 const branch=wrap(layout.entry+lane.d-car.s,track.length);if(Math.min(branch,track.length-branch)>30)return false;
 const gate=travel<=15&&ahead<=travel&&layout.side*(car.lateral||0)>=track.width/2-3.4&&lane.distance<=layout.width/2+1;
 // Beyond the marked entrance, the car must actually be inside the pit ribbon.
 // Proximity on the racing track cannot activate a stop or grant skipped progress.
 const late=lane.d>.05&&lane.d<layout.length-layout.taper&&lane.distance<=layout.width/2-.65;
 if(!gate&&!late)return false;
 car.pitTravel=gate?Math.max(0,travel-ahead):lane.d;
 car.pitState=car.pitTravel<layout.box-.03?'lane':'exit';car.pitRequested=false;
 car.pitEntryOffset=gate?(car.lateral||0):layout.entryOffset;
 car.pitMerge=null;
 if(!gate){const p=pitRoadPose(track,car.pitTravel);car.pitMerge={start:car.pitTravel,length:Math.min(24,(car.pitState==='lane'?layout.box:layout.length)-car.pitTravel),x:car.x-p.x,y:car.y-p.y,z:car.z-p.z};}
 if(!Number.isFinite(car.tyreRaceLaps))car.invalidLap=true;
 car.pitEntryProgress=car.progress-car.pitTravel;car.pitTimer=0;car.pitFitted=false;car.v=Math.min(PIT_SPEED,Math.max(0,car.v));clearImpact(car);
 car.offtrack=false;car.offtrackTime=0;car.offtrackPenalty=false;car.boostActive=false;
 return true;
}
export function pitPose(car,track,distance=car.pitTravel){
 const p=pitRoadPose(track,distance,0,car.pitEntryOffset),merge=car.pitMerge;if(!merge)return p;
 const weight=d=>{const t=Math.max(0,Math.min(1,(d-merge.start)/Math.max(.1,merge.length)));return 1-t*t*(3-2*t);};
 const shifted=d=>{const base=pitRoadPose(track,d,0,car.pitEntryOffset),w=weight(d);return {...base,x:base.x+merge.x*w,y:base.y+merge.y*w,z:base.z+merge.z*w};};
 const w=weight(distance),a=shifted(distance-.2),b=shifted(distance+.2),current={...p,x:p.x+merge.x*w,y:p.y+merge.y*w,z:p.z+merge.z*w},dx=b.x-a.x,dz=b.z-a.z;
 return {...current,heading:Math.atan2(dx,dz),pitch:Math.atan2(b.y-a.y,Math.hypot(dx,dz))};
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
 if(car.pitMerge&&car.pitTravel>=car.pitMerge.start+car.pitMerge.length)car.pitMerge=null;
 return true;
}
