import {moveWithBarriers,resolveBarrierContacts} from './barriers.mjs';
import {LIVERIES,normalizeLiveryIndex} from './liveries.mjs';
import {sampleGuide} from './racing-line.mjs';
import {conditionProfile,normalizeConditions,yawRate} from './conditions.mjs';
import {sample,nearest,wrap,clamp,angleDiff,targetSpeed,terrainHeight} from './tracks.mjs';
import {resolveCarContacts} from './collisions.mjs';
import {roadHalfWidth} from './baku.mjs';
export const TOP_SPEED=106,BOOST_TOP_SPEED=115;
export const COLORS=LIVERIES.map(livery=>livery.marker);
export const GRID_ROW_SPACING=13,GRID_LATERAL_OFFSET=3.6;
export function gridSlot(index){return {s:-12-Math.floor(index/2)*GRID_ROW_SPACING,offset:(index%2?1:-1)*GRID_LATERAL_OFFSET};}
export function createCar(track,id,name,index,ai=false,colorId=null,conditions='normal'){const {s,offset}=gridSlot(index),p=sample(track,s,offset),paint=normalizeLiveryIndex(colorId,index);return {id,name,index,ai,conditions:normalizeConditions(conditions),motionHeading:p.heading,motionYawRate:0,inputLag:0,surfaceGrip:1,cornerGrip:1,sliding:false,colorId:paint,color:COLORS[paint],x:p.x,z:p.z,y:p.y,heading:p.heading,pitch:p.pitch,s:wrap(s,track.length),progress:s,v:0,steer:0,lap:1,lastLap:0,bestLap:0,lapStart:0,finished:false,retired:false,finishTime:0,offtrack:false,offtrackPenalty:false,boost:100,penalty:0,resetTimer:0,invalidLap:false,offtrackTime:0,lastLapValid:true,outLap:false,sector:0,sectors:[],bestSectors:[],lastSectors:[],lapHistory:[],lapValidHistory:[],slipstream:0};}
export const QUALIFYING_RESTARTS=3;
export function retireCar(c){if(!c||c.finished)return false;c.retired=true;c.finished=true;c.finishTime=null;c.v=0;c.boostActive=false;c.sliding=false;return true;}
export function resetCar(c,track,isQualifying=false,elapsed=0){
 if(c.finished)return false;
 if(isQualifying){
  if((c.restarts||0)>=QUALIFYING_RESTARTS)return false;
  const p=sample(track,0);
  Object.assign(c,p,{restarts:(c.restarts||0)+1,v:45*conditionProfile(c.conditions).pace,motionHeading:p.heading,motionYawRate:0,surfaceGrip:1,cornerGrip:1,sliding:false,boost:100,penalty:0,s:0,progress:0,lap:1,lapStart:Math.max(0,elapsed),sector:0,sectors:[],lastSectors:[],invalidLap:false,outLap:false,offtrack:false,offtrackTime:0,offtrackPenalty:false,steer:0,resetTimer:1});
 }else{const p=sample(track,c.s);Object.assign(c,p,{v:0,motionHeading:p.heading,motionYawRate:0,surfaceGrip:1,cornerGrip:1,sliding:false,penalty:c.penalty+3,resetTimer:1,invalidLap:true});}
 return true;
}
export function stepCar(c,input,track,dt,elapsed,laps=3){
 if(c.finished)return;
 if(c.ai)c.inputLag=0;
 if(c.resetTimer>0)c.resetTimer-=dt;
 const prev=c.s,previousPose={x:c.x,z:c.z,heading:c.heading},conditions=conditionProfile(c.conditions);
 let throttle=input.throttle?1:0,brake=input.brake?1:0,steer=clamp(Number(input.steer)||0,-1,1);
 if(c.ai){const look=sampleGuide(track,c.s+Math.max(track.width<15?6:12,c.v*(track.width<15?.32:.5)));const lane=Math.sin(c.index*2+c.s*.003)*.35;look.x+=Math.cos(look.heading)*lane;look.z-=Math.sin(look.heading)*lane;const aim=Math.atan2(look.x-c.x,look.z-c.z);steer=clamp(angleDiff(aim,c.heading)*3,-1,1);const brakingLook=conditions.wetness?Math.max(0,c.v)*(1-conditions.braking)*2:0;const desired=Math.min(targetSpeed(track,c.s,c.conditions),targetSpeed(track,c.s+brakingLook,c.conditions))*(track.width<15?.65+c.index*.01:.78+c.index*.018);throttle=c.v<desired?1:.18;brake=c.v>desired+3?.65:0;}
 const boost=!!input.boost&&c.boost>0&&throttle&&!brake&&!c.offtrack;c.boostActive=!!boost;
 c.boost=clamp(c.boost+dt*(boost?-19:brake?12:4),0,100);
 const road=sample(track,c.s);
 const roadOffset=conditions.wetness?nearest(track,c.x,c.z,c.s).offset:0;
 c.surfaceGrip=conditions.wetness?(c.offtrack?.48:Math.abs(roadOffset)>roadHalfWidth(track,c.s)-.8?conditions.curbGrip:1):1;
 c.cornerGrip=1-conditions.wetness*(brake*.24+throttle*.10);
 const traction=conditions.traction*c.surfaceGrip,braking=33*conditions.braking*c.surfaceGrip;
 const accel=(boost?19:14)*traction*Math.max(.15,1-c.v/125),slip=c.slipstream||0,drag=(.55+c.v*c.v*.00032)*(1-slip*0.3)+(c.offtrack?c.v*.5:0);
 c.slipstream=0;
 const gravity=-9.81*Math.sin(road.pitch);
 if(input.park){if(c.v>0)c.v=Math.max(0,c.v-(braking+drag)*dt);else if(c.v<0)c.v=Math.min(0,c.v+(braking+drag)*dt);}
 else if(c.v>=0){
  if(c.v<=.2&&brake&&!throttle&&!c.ai){c.v=Math.max(-12,c.v-(7.5*traction-gravity)*dt);}
  else{const newV=c.v+(throttle*accel-brake*braking-drag+gravity)*dt;if(newV<0&&brake&&!throttle&&!c.ai)c.v=Math.max(-12,newV*.25);else c.v=Math.max(0,Math.min(boost?BOOST_TOP_SPEED:TOP_SPEED,newV));}
 }else{
  if(throttle){const newV=c.v+(braking+drag+gravity)*dt;c.v=newV>0?Math.min(boost?BOOST_TOP_SPEED:TOP_SPEED,newV):newV;}
  else if(brake){const revDrag=.8+Math.abs(c.v)*.25;c.v=Math.max(-12,c.v-(7.5*traction+revDrag-gravity)*dt);}
  else{const revDrag=2.5+Math.abs(c.v)*.5;c.v=Math.min(0,c.v+(revDrag+gravity)*dt);}
 }
 const speed=Math.abs(c.v);
 c.steer+=(steer-c.steer)*Math.min(1,dt*10);
 const rate=yawRate(c);
 c.heading+=rate*dt;
 const oldMotion=Number.isFinite(c.motionHeading)?c.motionHeading:c.heading;
 if(conditions.wetness&&speed>2){
  const alignment=conditions.alignment*c.surfaceGrip*(brake?.72:1);
  c.motionHeading=oldMotion+angleDiff(c.heading,oldMotion)*(1-Math.exp(-alignment*dt));
 }else c.motionHeading=c.heading;
 c.motionYawRate=angleDiff(c.motionHeading,oldMotion)/dt;
 c.sliding=conditions.wetness>0&&speed>8&&Math.abs(angleDiff(c.heading,c.motionHeading))>.10;
 c.x+=Math.sin(c.motionHeading)*c.v*Math.cos(road.pitch)*dt;c.z+=Math.cos(c.motionHeading)*c.v*Math.cos(road.pitch)*dt;
 moveWithBarriers(c,track,previousPose);
 const near=nearest(track,c.x,c.z,c.s);let delta=near.s-prev;if(delta>track.length/2)delta-=track.length;if(delta<-track.length/2)delta+=track.length;
 // No teleports or shortcuts: progress advances only near the expected ribbon.
 if(Math.abs(delta)<40&&near.distance<track.width/2+40){c.s=near.s;c.progress+=delta;}
 const half=roadHalfWidth(track,near.s);
 if(near.distance>half+1.0){if(!c.offtrack)c.offtrackTime=0;c.offtrack=true;c.offtrackTime+=dt;if(c.offtrackTime>.4&&!c.offtrackPenalty){c.penalty+=1;c.offtrackPenalty=true;c.invalidLap=true;}}else{c.offtrack=false;c.offtrackPenalty=false;}
 if(near.distance>half+24){c.v*=Math.exp(-dt*4);const p=sample(track,c.s);c.x+=(p.x-c.x)*dt*.6;c.z+=(p.z-c.z)*dt*.6;}
 const surface=sample(track,c.s);
 const fall=clamp(near.distance-(half+6.5),0,1);
 c.y=fall?surface.y*(1-fall)+(terrainHeight(track,c.x,c.z)-.9)*fall:surface.y;
 c.pitch=surface.pitch;
 const completed=Math.max(0,Math.floor(c.progress/track.length));
 const lapProgress=c.progress-(c.lap-1)*track.length;
 if(c.sector===0&&lapProgress>track.length/3){c.sectors[0]=elapsed-c.lapStart;c.sector=1;}
 else if(c.sector===1&&lapProgress>track.length*2/3){c.sectors[1]=elapsed-c.lapStart-c.sectors[0];c.sector=2;}
 if(completed>=c.lap){
  c.sectors[2]=elapsed-c.lapStart-(c.sectors[0]||0)-(c.sectors[1]||0);
  c.lastLap=elapsed-c.lapStart;c.lastLapValid=!c.invalidLap;
  if(c.lastLapValid){
   c.bestLap=c.bestLap?Math.min(c.bestLap,c.lastLap):c.lastLap;
   for(let i=0;i<3;i++)c.bestSectors[i]=c.bestSectors[i]?Math.min(c.bestSectors[i],c.sectors[i]):c.sectors[i];
  }
  c.lapHistory.push(c.lastLap);if(!c.lapValidHistory)c.lapValidHistory=[];c.lapValidHistory.push(c.lastLapValid);
  c.lastSectors=[...c.sectors];c.invalidLap=false;c.outLap=false;c.lapStart=elapsed;c.lap=completed+1;c.sector=0;c.sectors=[];
  if(completed>=laps){c.finished=true;c.finishTime=elapsed+c.penalty;c.v=0;c.boostActive=false;c.sliding=false;c.motionYawRate=0;c.inputLag=0;}
 }
}
export function draftStrength(c,cars){
 if(c.finished||c.retired)return 0;
 let strength=0;
 for(const o of cars){
  if(c.id===o.id||o.retired||o.finished)continue;
  const delta=o.progress-c.progress,dist=Math.hypot(o.x-c.x,o.z-c.z);
  if(delta>3&&delta<60&&dist<60&&Math.abs(dist-delta)<6)strength=Math.max(strength,1-delta/60);
 }
 return strength;
}
export function stepRace(cars,inputs,track,dt,elapsed,laps,stepDriver=stepCar){
 for(const c of cars){
  if(c.finished){c.slipstream=0;continue;}
  c.slipstream=draftStrength(c,cars);
  stepDriver(c,inputs[c.id]||{},track,dt,elapsed,laps);
 }
 resolveCarContacts(cars);
 for(const c of cars)resolveBarrierContacts(c,track);
}
export function standings(cars){return [...cars].sort((a,b)=>!!a.retired!==!!b.retired?(a.retired?1:-1):a.retired?b.progress-a.progress:a.finished&&b.finished?a.finishTime-b.finishTime:a.finished?-1:b.finished?1:b.progress-a.progress);}
