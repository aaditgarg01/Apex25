import {sample,nearest,wrap,clamp,angleDiff,targetSpeed,terrainHeight} from './tracks.mjs';
import {resolveCarContacts} from './collisions.mjs';
export const COLORS=['#ff502d','#37dcca','#67a5ff','#f9d648','#db78ff','#eef3f7','#ff85b2','#78da5b'];
export function createCar(track,id,name,index,ai=false,colorId=null){const s=-12-Math.floor(index/2)*10,offset=index%2?3.1:-3.1,p=sample(track,s,offset);return {id,name,index,ai,colorId:colorId!==null&&colorId!==undefined?colorId:index%8,color:COLORS[colorId!==null&&colorId!==undefined?colorId:index%8],x:p.x,z:p.z,y:p.y,heading:p.heading,pitch:p.pitch,s:wrap(s,track.length),progress:s,v:0,steer:0,lap:1,lastLap:0,bestLap:0,lapStart:0,finished:false,retired:false,finishTime:0,offtrack:false,offtrackPenalty:false,boost:100,penalty:0,resetTimer:0,invalidLap:false,offtrackTime:0,lastLapValid:true,outLap:false,sector:0,sectors:[],bestSectors:[],lastSectors:[],lapHistory:[],lapValidHistory:[],slipstream:0};}
export const QUALIFYING_RESTARTS=3;
export function retireCar(c){c.retired=true;c.finished=true;c.finishTime=null;c.v=0;}
export function resetCar(c,track,isQualifying=false,elapsed=0){
 if(c.finished)return false;
 if(isQualifying){
  if((c.restarts||0)>=QUALIFYING_RESTARTS)return false;
  const p=sample(track,0);
  Object.assign(c,p,{restarts:(c.restarts||0)+1,v:45,boost:100,penalty:0,s:0,progress:0,lap:1,lapStart:Math.max(0,elapsed),sector:0,sectors:[],lastSectors:[],invalidLap:false,outLap:false,offtrack:false,offtrackTime:0,offtrackPenalty:false,steer:0,resetTimer:1});
 }else{const p=sample(track,c.s);Object.assign(c,p,{v:0,penalty:c.penalty+3,resetTimer:1,invalidLap:true});}
 return true;
}
export function stepCar(c,input,track,dt,elapsed,laps=3){
 if(c.finished)return;
 if(c.resetTimer>0)c.resetTimer-=dt;
 const prev=c.s;
 let throttle=input.throttle?1:0,brake=input.brake?1:0,steer=clamp(Number(input.steer)||0,-1,1);
 if(c.ai){const look=sample(track,c.s+Math.max(track.width<15?8:15,c.v*(track.width<15?.38:.6)),Math.sin(c.index*2+c.s*.003)*1.2);const aim=Math.atan2(look.x-c.x,look.z-c.z);steer=clamp(angleDiff(aim,c.heading)*3,-1,1);const desired=targetSpeed(track,c.s)*(track.width<15?.65+c.index*.01:.78+c.index*.018);throttle=c.v<desired?1:.18;brake=c.v>desired+3?.65:0;}
 const boost=!!input.boost&&c.boost>0&&throttle&&!brake&&!c.offtrack;
 c.boost=clamp(c.boost+dt*(boost?-19:brake?12:4),0,100);
 const road=sample(track,c.s);
 const accel=(boost?18:13)*Math.max(.18,1-c.v/110),slip=c.slipstream||0,drag=(.6+c.v*c.v*.0012)*(1-slip*0.3)+(c.offtrack?c.v*.5:0);
 c.slipstream=0;
 const gravity=-9.81*Math.sin(road.pitch);
 if(input.park){if(c.v>0)c.v=Math.max(0,c.v-(33+drag)*dt);else if(c.v<0)c.v=Math.min(0,c.v+(33+drag)*dt);}
 else if(c.v>=0){
  if(c.v<=.2&&brake&&!throttle&&!c.ai){c.v=Math.max(-12,c.v-(7.5-gravity)*dt);}
  else{const newV=c.v+(throttle*accel-brake*33-drag+gravity)*dt;if(newV<0&&brake&&!throttle&&!c.ai)c.v=Math.max(-12,newV*.25);else c.v=Math.max(0,Math.min(boost?102:94,newV));}
 }else{
  if(throttle){const newV=c.v+(33+drag+gravity)*dt;c.v=newV>0?Math.min(boost?102:94,newV):newV;}
  else if(brake){const revDrag=.8+Math.abs(c.v)*.25;c.v=Math.max(-12,c.v-(7.5+revDrag-gravity)*dt);}
  else{const revDrag=2.5+Math.abs(c.v)*.5;c.v=Math.min(0,c.v+(revDrag+gravity)*dt);}
 }
 const speed=Math.abs(c.v),steeringRate=speed>1?clamp(speed/9,0,1)*(1.9/(1+speed*.025)):0;
 c.steer+=(steer-c.steer)*Math.min(1,dt*10);
 c.heading+=(c.v>=0?1:-1)*c.steer*steeringRate*dt;
 c.x+=Math.sin(c.heading)*c.v*Math.cos(road.pitch)*dt;c.z+=Math.cos(c.heading)*c.v*Math.cos(road.pitch)*dt;
 const near=nearest(track,c.x,c.z,c.s);let delta=near.s-prev;if(delta>track.length/2)delta-=track.length;if(delta<-track.length/2)delta+=track.length;
 // No teleports or shortcuts: progress advances only near the expected ribbon.
 if(Math.abs(delta)<40&&near.distance<track.width/2+40){c.s=near.s;c.progress+=delta;}
 if(near.distance>track.width/2+1.0){if(!c.offtrack)c.offtrackTime=0;c.offtrack=true;c.offtrackTime+=dt;if(c.offtrackTime>.4&&!c.offtrackPenalty){c.penalty+=1;c.offtrackPenalty=true;c.invalidLap=true;}}else{c.offtrack=false;c.offtrackPenalty=false;}
 if(near.distance>track.width/2+24){c.v*=Math.exp(-dt*4);const p=sample(track,c.s);c.x+=(p.x-c.x)*dt*.6;c.z+=(p.z-c.z)*dt*.6;}
 const surface=sample(track,c.s);
 const fall=clamp(near.distance-(track.width/2+6.5),0,1);
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
  if(completed>=laps){c.finished=true;c.finishTime=elapsed+c.penalty;}
 }
}
export function draftStrength(c,cars){
 let strength=0;
 for(const o of cars){
  if(c.id===o.id||o.retired)continue;
  const delta=o.progress-c.progress,dist=Math.hypot(o.x-c.x,o.z-c.z);
  if(delta>3&&delta<60&&dist<60&&Math.abs(dist-delta)<6)strength=Math.max(strength,1-delta/60);
 }
 return strength;
}
export function stepRace(cars,inputs,track,dt,elapsed,laps,stepDriver=stepCar){
 for(const c of cars){
  c.slipstream=draftStrength(c,cars);
  stepDriver(c,inputs[c.id]||{},track,dt,elapsed,laps);
  resolveCarContacts(cars,c.id);
 }
 resolveCarContacts(cars);
}
export function standings(cars){return [...cars].sort((a,b)=>!!a.retired!==!!b.retired?(a.retired?1:-1):a.retired?b.progress-a.progress:a.finished&&b.finished?a.finishTime-b.finishTime:a.finished?-1:b.finished?1:b.progress-a.progress);}
