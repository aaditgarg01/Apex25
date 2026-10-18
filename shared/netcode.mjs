import {dampImpact,impactDamping,setVelocity} from './motion.mjs';
import {moveWithBarriers,resolveBarrierContacts} from './barriers.mjs';
import {yawRate} from './conditions.mjs';
import {stepCar,draftStrength} from './physics.mjs';
import {resolveCarContacts} from './collisions.mjs';
import {INPUT_DT,encodeInput,decodeInput} from './input-stream.mjs';
import {angleDiff} from './tracks.mjs';
const copyCar=c=>({...c,sectors:[...c.sectors],lastSectors:[...c.lastSectors],bestSectors:[...c.bestSectors],lapHistory:[...c.lapHistory],lapValidHistory:[...(c.lapValidHistory||[])]});
const lerp=(a,b,t)=>a+(b-a)*t;
const zeroError=()=>({x:0,y:0,z:0,heading:0});
const corrected=(c,error)=>({...c,x:c.x+(error?.x||0),y:c.y+(error?.y||0),z:c.z+(error?.z||0),heading:c.heading+(error?.heading||0)});
function correction(old,next,reset){
 const distance=old?Math.hypot(old.x-next.x,old.z-next.z):Infinity;
 return !reset&&distance>.02&&distance<40?{x:old.x-next.x,y:old.y-next.y,z:old.z-next.z,heading:angleDiff(old.heading,next.heading)}:zeroError();
}
// Dead reckoning follows the same yaw model as physics, including reverse.
// A straight tangent would put a turning rival across the player's path.
export function advanceRemote(c,dt,track=null){
 if(c.finished)return;const previousPose={x:c.x,z:c.z,heading:c.heading};
 const yaw=yawRate(c)+(c.impactYaw||0),travel=Number.isFinite(c.motionHeading)?c.motionHeading:c.heading,motionYaw=Number.isFinite(c.motionYawRate)?c.motionYawRate:yaw;
 const hasImpact=Math.hypot(c.impactVX||0,c.impactVZ||0)>.01||Math.abs(c.impactYaw||0)>.001,middle=travel+(hasImpact?0:motionYaw*dt/2),distance=c.v*dt,driftTime=dt>0?(1-Math.exp(-impactDamping(c)*dt))/impactDamping(c):dt;
 const longitudinal={x:Math.sin(travel)*c.v,z:Math.cos(travel)*c.v};
 c.x+=Math.sin(middle)*distance*Math.cos(c.pitch||0)+(c.impactVX||0)*driftTime;
 c.z+=Math.cos(middle)*distance*Math.cos(c.pitch||0)+(c.impactVZ||0)*driftTime;
 c.y+=Math.sin(c.pitch||0)*distance;c.heading+=yaw*dt;c.motionHeading=travel+motionYaw*dt;
 if(dt>0)dampImpact(c,dt);
 if(hasImpact)setVelocity(c,longitudinal.x+(c.impactVX||0),longitudinal.z+(c.impactVZ||0));
 if(track&&dt>0)moveWithBarriers(c,track,previousPose);
 c.progress+=distance;
}
const active=s=>['race','qualifying','practice'].includes(s.phase)&&s.elapsed>=0;
// Prediction only affects presentation. Lap times and results remain server-authoritative.
export class NetworkMotion {
 constructor(track,id){this.track=track;this.id=id;this.frames=[];this.local=null;this.visual=null;this.error=zeroError();this.remoteErrors=new Map();this.remoteTimes=new Map();this.acc=0;this.lastAt=-Infinity;this.pending=[];this.outgoing=[];this.sequence=0;this.epoch=0;this.rtt=100;this.arrivals=[];this.delay=90;this.remoteAt=null;}
 setPing(ms){if(Number.isFinite(ms)&&ms>=0)this.rtt=this.rtt*.7+Math.min(ms,2000)*.3;}
 record(s,now){
  const last=this.frames.at(-1),at=s.elapsed*1000;
  if(last&&last.at===at&&this.bufferPhase===s.phase)return;
  if(this.bufferPhase!==s.phase||last&&at<last.at){this.frames=[];this.arrivals=[];this.delay=90;this.remoteAt=null;this.remoteTimes.clear();}
  this.bufferPhase=s.phase;
  // Keep every sample, even when TCP delivers several snapshots in one paint.
  this.arrivals.push(now-at);if(this.arrivals.length>90)this.arrivals.shift();
  this.clockOffset=Math.min(...this.arrivals);
  if(this.arrivals.length>=6){const jitter=[...this.arrivals].sort((a,b)=>a-b),spread=jitter[Math.floor(jitter.length*.9)]-jitter[0];this.delay+=(Math.min(220,90+spread)-this.delay)*.08;}
  this.frames.push({at,cars:s.cars});if(this.frames.length>90)this.frames.shift();
 }
 receive(s,now){
  const previous=this.session,car=s.cars.find(c=>c.id===this.id);if(!car)return;
  // Compare fixed-step poses, not the fractional render pose. Comparing with
  // last frame's camera pose repeatedly feeds render lag back into prediction.
  const old=this.local?corrected(this.local,this.error):null,oldCar=previous?.cars.find(c=>c.id===this.id);
  const oldOthers=new Map((this.others||[]).map(c=>[c.id,corrected(c,this.remoteErrors.get(c.id))]));
  const reset=!previous||previous.phase!==s.phase||s.elapsed<previous.elapsed||car.finished!==oldCar?.finished||car.inputEpoch!==oldCar?.inputEpoch||car.restarts!==oldCar?.restarts||car.resetTimer>(oldCar?.resetTimer||0)+.3;
  if(reset){this.remoteErrors.clear();this.pending=[];this.outgoing=[];this.acc=0;this.epoch=car.inputEpoch||0;this.sequence=Math.max(this.sequence,car.inputAck||0);}
  this.record(s,now);
  this.session=s;this.lastAt=now;this.local=copyCar(car);this.local.conditions=s.conditions||car.conditions||'normal';this.others=s.cars.filter(c=>c.id!==this.id).map(copyCar);this.predictionTime=0;
  // Align each rival to the local authoritative simulation time before replay.
  // Human states lag their input transit; AI is already at server time.
  for(const other of this.others)advanceRemote(other,Math.max(-.5,Math.min(.5,(other.inputLag||0)-(car.inputLag||0))),this.track);
  // Replay the actual unacknowledged controls, in order. Never estimate them
  // from RTT or apply today's steering to an old authoritative position.
  this.pending=this.pending.filter(command=>command[0]>(car.inputAck||0));
  if(active(s))for(const [i,command] of this.pending.entries())this.predict(command,this.inputTime()+(i+1)*INPUT_DT);
  this.error=correction(old,this.local,reset);
  for(const other of this.others){
   const prior=previous?.cars.find(c=>c.id===other.id),jump=reset||prior?.inputEpoch!==other.inputEpoch||prior?.finished!==other.finished||other.resetTimer>(prior?.resetTimer||0)+.3;
   this.remoteErrors.set(other.id,correction(oldOthers.get(other.id),other,jump));
  }
  if(reset)this.visual={...this.local};
 }
 inputTime(){const car=this.session.cars.find(c=>c.id===this.id);return car.inputTime??Math.max(0,this.session.elapsed-(car.inputLag||0));}
 lapLimit(){return this.session.phase==='race'?this.session.laps:Infinity;}
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
    this.predict(command,this.inputTime()+this.pending.length*INPUT_DT);
   }
  }else this.acc=0;
  for(const error of [this.error,...this.remoteErrors.values()])for(const k of Object.keys(error))error[k]*=Math.exp(-Math.min(dt,.1)*(k==='heading'?16:10));
  this.visual={...corrected(this.local,this.error),smoothMotion:true};
  // Fill the fraction between physics ticks without changing acknowledged state.
  if(active(s)&&!stale)advanceRemote(this.visual,this.acc,this.track);
  const desired=now-this.clockOffset-this.delay;this.remoteAt=this.remoteAt===null?desired:Math.max(this.remoteAt,Math.min(desired,this.remoteAt+Math.max(0,dt)*1100));
  const rendered=s.cars.map(c=>{
   if(c.id===this.id)return this.visual;
   // A driver's position advances on consumed commands, not on packet arrival.
   // Duplicate stationary samples during an uplink stall must not cause a
   // freeze-then-jump when the command batch finally reaches the server.
   const samples=[];
   for(const frame of this.frames){const car=frame.cars.find(x=>x.id===c.id);if(!car)continue;const at=car.ai?frame.at:Math.min(frame.at,(car.inputTime??frame.at/1000-(car.inputLag||0))*1000),sample={at,car};if(samples.at(-1)?.at===at)samples[samples.length-1]=sample;else samples.push(sample);}
   const lags=this.frames.slice(-12).map(f=>f.cars.find(x=>x.id===c.id)?.inputLag||0).sort((a,b)=>a-b),lag=c.ai?0:lags[Math.floor(lags.length/2)]*1000;
   const desiredTime=this.remoteAt-lag,priorTime=this.remoteTimes.get(c.id),target=priorTime===undefined?desiredTime:Math.max(priorTime,Math.min(desiredTime,priorTime+Math.max(0,dt)*1100));this.remoteTimes.set(c.id,target);
   let a=samples[0],b=samples.at(-1);
   for(let i=1;i<samples.length;i++){if(samples[i].at>=target){a=samples[i-1];b=samples[i];break;}a=samples[i];}
   const ca=a.car,cb=b.car,t=b.at===a.at?1:Math.max(0,Math.min(1,(target-a.at)/(b.at-a.at)));
   if(c.finished||cb.inputEpoch!==ca.inputEpoch||cb.resetTimer>ca.resetTimer+.3||Math.hypot(cb.x-ca.x,cb.z-ca.z)>30)return {...c,smoothMotion:true};
   const out={...c,smoothMotion:true};for(const k of ['x','y','z','v','steer','pitch','impactVX','impactVZ','impactYaw'])out[k]=lerp(ca[k]??0,cb[k]??0,t);out.heading=ca.heading+angleDiff(cb.heading,ca.heading)*t;out.motionHeading=(ca.motionHeading??ca.heading)+angleDiff(cb.motionHeading??cb.heading,ca.motionHeading??ca.heading)*t;
   // Bridge a missing packet briefly; never extrapolate indefinitely after a disconnect.
   if(target>b.at&&active(s))advanceRemote(out,Math.min((target-b.at)/1000,.1),this.track);
   // Nearby cars must be shown at the same predicted time as the player, or
   // visible contact happens behind the actual collision. Blend at the boundary.
   if(s.phase==='race'||s.phase==='practice'){
    const predicted=this.others.find(o=>o.id===c.id),other=corrected(predicted,this.remoteErrors.get(c.id)),distance=Math.hypot(other.x-this.local.x,other.z-this.local.z),blend=Math.max(0,Math.min(1,(35-distance)/20));
    advanceRemote(other,this.acc,this.track);
    for(const key of ['x','y','z','v','pitch','impactVX','impactVZ','impactYaw'])out[key]=lerp(out[key]??0,other[key]??0,blend);
    out.heading+=angleDiff(other.heading,out.heading)*blend;out.motionHeading+=angleDiff(other.motionHeading??other.heading,out.motionHeading)*blend;
   }
   return out;
  });
  // Position correction smoothing must not draw cars inside each other.
  if(active(s)&&s.phase!=='qualifying')resolveCarContacts(rendered,null,{impulses:false,maxCorrection:.35,fixedIds:new Set([this.id])});
  for(const c of rendered)resolveBarrierContacts(c,this.track,{impulses:false});
  return rendered;
 }
}
export const encodeState=(session,history=true)=>JSON.stringify({type:'state',...session},(key,v)=>!history&&(key==='lapHistory'||key==='lapValidHistory')?undefined:typeof v==='number'&&!Number.isInteger(v)?Math.round(v*1000)/1000:v);
