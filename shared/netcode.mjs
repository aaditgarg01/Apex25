import {moveWithBarriers,resolveBarrierContacts} from './barriers.mjs';
import {yawRate} from './conditions.mjs';
import {stepCar,draftStrength} from './physics.mjs';
import {resolveCarContacts} from './collisions.mjs';
import {INPUT_DT,encodeInput,decodeInput} from './input-stream.mjs';
import {angleDiff} from './tracks.mjs';
const copyCar=c=>({...c,sectors:[...c.sectors],lastSectors:[...c.lastSectors],bestSectors:[...c.bestSectors],lapHistory:[...c.lapHistory],lapValidHistory:[...(c.lapValidHistory||[])]});
const lerp=(a,b,t)=>a+(b-a)*t;
// Dead reckoning follows the same yaw model as physics, including reverse.
// A straight tangent would put a turning rival across the player's path.
export function advanceRemote(c,dt,track=null){
 if(c.finished)return;const previousPose={x:c.x,z:c.z,heading:c.heading};
 const yaw=yawRate(c),travel=Number.isFinite(c.motionHeading)?c.motionHeading:c.heading,motionYaw=Number.isFinite(c.motionYawRate)?c.motionYawRate:yaw;
 const middle=travel+motionYaw*dt/2,distance=c.v*dt;
 c.x+=Math.sin(middle)*distance*Math.cos(c.pitch||0);
 c.z+=Math.cos(middle)*distance*Math.cos(c.pitch||0);
 c.y+=Math.sin(c.pitch||0)*distance;c.heading+=yaw*dt;c.motionHeading=travel+motionYaw*dt;
 if(track&&dt>0)moveWithBarriers(c,track,previousPose);
 c.progress+=distance;
}
const active=s=>['race','qualifying','practice'].includes(s.phase)&&s.elapsed>=0;
// Prediction only affects presentation. Lap times and results remain server-authoritative.
export class NetworkMotion {
 constructor(track,id){this.track=track;this.id=id;this.frames=[];this.local=null;this.visual=null;this.error={x:0,y:0,z:0,heading:0};this.acc=0;this.lastAt=-Infinity;this.pending=[];this.outgoing=[];this.sequence=0;this.epoch=0;this.rtt=100;this.arrivals=[];this.delay=60;this.remoteAt=null;}
 setPing(ms){if(Number.isFinite(ms)&&ms>=0)this.rtt=this.rtt*.7+Math.min(ms,2000)*.3;}
 receive(s,now){
  const previous=this.session,car=s.cars.find(c=>c.id===this.id);if(!car)return;
  const old=this.visual,oldCar=previous?.cars.find(c=>c.id===this.id);
  const reset=!previous||previous.phase!==s.phase||s.elapsed<previous.elapsed||car.finished!==oldCar?.finished||car.inputEpoch!==oldCar?.inputEpoch||car.restarts!==oldCar?.restarts||car.resetTimer>(oldCar?.resetTimer||0)+.3;
  if(reset){this.frames=[];this.arrivals=[];this.delay=60;this.remoteAt=null;this.pending=[];this.outgoing=[];this.acc=0;this.epoch=car.inputEpoch||0;this.sequence=Math.max(this.sequence,car.inputAck||0);}
  // Use simulation time rather than delivery time: TCP may deliver several
  // 50ms snapshots together after a stall, but they are not simultaneous poses.
  this.arrivals.push(now-s.elapsed*1000);if(this.arrivals.length>60)this.arrivals.shift();
  this.clockOffset=Math.min(...this.arrivals);
  if(this.arrivals.length>=6){const jitter=[...this.arrivals].sort((a,b)=>a-b),spread=jitter[Math.floor(jitter.length*.9)]-jitter[0];this.delay+=(Math.min(150,60+spread)-this.delay)*.1;}
  this.frames.push({at:s.elapsed*1000,cars:s.cars});if(this.frames.length>48)this.frames.shift();
  this.session=s;this.lastAt=now;this.local=copyCar(car);this.local.conditions=s.conditions||car.conditions||'normal';this.others=s.cars.filter(c=>c.id!==this.id).map(copyCar);this.predictionTime=0;
  // Align each rival to the local authoritative simulation time before replay.
  // Human states lag their input transit; AI is already at server time.
  for(const other of this.others)advanceRemote(other,Math.max(-.5,Math.min(.5,(other.inputLag||0)-(car.inputLag||0))),this.track);
  // Replay the actual unacknowledged controls, in order. Never estimate them
  // from RTT or apply today's steering to an old authoritative position.
  this.pending=this.pending.filter(command=>command[0]>(car.inputAck||0));
  if(active(s))for(const [i,command] of this.pending.entries())this.predict(command,s.elapsed+(i+1)*INPUT_DT);
  const distance=old?Math.hypot(old.x-this.local.x,old.z-this.local.z):Infinity;
  this.error=old&&!reset&&distance>.06&&distance<15?{x:old.x-this.local.x,y:old.y-this.local.y,z:old.z-this.local.z,heading:angleDiff(old.heading,this.local.heading)}:{x:0,y:0,z:0,heading:0};
  if(reset)this.visual={...this.local};
 }
 lapLimit(){return this.session.phase==='practice'?Infinity:this.session.phase==='qualifying'?1:this.session.laps;}
 predict(command,elapsed){
  const solid=this.session.phase==='race'||this.session.phase==='practice';
  if(solid&&this.predictionTime<.75)for(const other of this.others)advanceRemote(other,INPUT_DT,this.track);
  this.local.slipstream=solid?draftStrength(this.local,this.others):0;
  this.predictionTime+=INPUT_DT;
  stepCar(this.local,decodeInput(command),this.track,INPUT_DT,elapsed,this.lapLimit());
  if(solid)resolveCarContacts([this.local,...this.others],this.id);
  resolveBarrierContacts(this.local,this.track);
 }
 takeCommands(){if(!this.outgoing.length)return null;return {type:'commands',epoch:this.epoch,commands:this.outgoing.splice(0,8)};}
 frame(now,dt,control){
  if(!this.session)return [];
  const s=this.session,stale=now-this.lastAt>1000;
  if(active(s)&&!this.local.finished&&!stale&&this.pending.length<120){
   this.acc+=Math.min(dt,.1);
   while(this.acc+1e-9>=INPUT_DT&&this.pending.length<120){
    this.acc-=INPUT_DT;const command=encodeInput(++this.sequence,control);
    this.pending.push(command);this.outgoing.push(command);
    this.predict(command,s.elapsed+this.pending.length*INPUT_DT);
   }
  }else this.acc=0;
  for(const k of Object.keys(this.error))this.error[k]*=Math.exp(-Math.min(dt,.1)*(k==='heading'?16:10));
  this.visual={...this.local,x:this.local.x+this.error.x,y:this.local.y+this.error.y,z:this.local.z+this.error.z,heading:this.local.heading+this.error.heading,smoothMotion:true};
  const desired=now-this.clockOffset-this.delay;this.remoteAt=this.remoteAt===null?desired:Math.max(this.remoteAt,Math.min(desired,this.remoteAt+Math.max(0,dt)*1150));const target=this.remoteAt;let a=this.frames[0],b=this.frames.at(-1);
  for(let i=1;i<this.frames.length;i++){if(this.frames[i].at>=target){a=this.frames[i-1];b=this.frames[i];break;}a=this.frames[i];}
  const t=b.at===a.at?1:Math.max(0,Math.min(1,(target-a.at)/(b.at-a.at)));
  const rendered=s.cars.map(c=>{
   if(c.id===this.id)return this.visual;
   const ca=a.cars.find(x=>x.id===c.id)||c,cb=b.cars.find(x=>x.id===c.id)||c;
   if(c.finished||cb.restarts!==ca.restarts||cb.resetTimer>ca.resetTimer+.3||Math.hypot(cb.x-ca.x,cb.z-ca.z)>30)return {...c,smoothMotion:true};
   const out={...c,smoothMotion:true};for(const k of ['x','y','z','v','steer','pitch'])out[k]=lerp(ca[k],cb[k],t);out.heading=ca.heading+angleDiff(cb.heading,ca.heading)*t;out.motionHeading=(ca.motionHeading??ca.heading)+angleDiff(cb.motionHeading??cb.heading,ca.motionHeading??ca.heading)*t;
   // Bridge a missing packet briefly; never extrapolate indefinitely after a disconnect.
   if(target>b.at&&active(s))advanceRemote(out,Math.min((target-b.at)/1000,.1),this.track);
   // Nearby cars must be shown at the same predicted time as the player, or
   // visible contact happens behind the actual collision. Blend at the boundary.
   if(s.phase==='race'||s.phase==='practice'){
    const other=this.others.find(o=>o.id===c.id),distance=Math.hypot(other.x-this.local.x,other.z-this.local.z),blend=Math.max(0,Math.min(1,(30-distance)/15));
    for(const key of ['x','y','z','v','pitch'])out[key]=lerp(out[key],other[key],blend);
    out.heading+=angleDiff(other.heading,out.heading)*blend;out.motionHeading+=angleDiff(other.motionHeading??other.heading,out.motionHeading)*blend;
   }
   return out;
  });
  // Position correction smoothing must not draw cars inside each other.
  if(active(s)&&s.phase!=='qualifying')resolveCarContacts(rendered,null,{impulses:false,maxCorrection:.35});
  for(const c of rendered)resolveBarrierContacts(c,this.track,{impulses:false});
  return rendered;
 }
}
export const encodeState=(session,history=true)=>JSON.stringify({type:'state',...session},(key,v)=>!history&&(key==='lapHistory'||key==='lapValidHistory')?undefined:typeof v==='number'&&!Number.isInteger(v)?Math.round(v*1000)/1000:v);
