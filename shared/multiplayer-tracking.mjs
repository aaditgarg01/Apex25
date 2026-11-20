import {projectMotion,velocityOf} from './motion.mjs';
import {moveWithBarriers} from './barriers.mjs';
import {stepCar} from './physics.mjs';
import {angleDiff} from './tracks.mjs';
import {pitPose,pitLayout} from './pits.mjs';
import {pitStopStation} from './pit-layout.mjs';

const active=s=>['race','qualifying','practice'].includes(s.phase)&&s.elapsed>=0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const copy=c=>({...c,tyreSetsUsed:{...c.tyreSetsUsed},sectors:[...(c.sectors||[])],lastSectors:[...(c.lastSectors||[])],bestSectors:[...(c.bestSectors||[])],lapHistory:[...(c.lapHistory||[])],lapValidHistory:[...(c.lapValidHistory||[])]});
const poseFields=['x','y','z','heading','motionHeading','v','steer','pitch','impactVX','impactVZ','impactYaw'];
const pose=(source,motion)=>Object.assign({...source,smoothMotion:true},Object.fromEntries(poseFields.map(k=>[k,motion[k]??source[k]])));
const movingFields=['x','y','z','heading','motionHeading','v','steer','pitch','roll','s','progress','lateral','impactVX','impactVZ','impactYaw','motionYawRate','physicsTime'];
const zero=()=>({x:0,y:0,z:0,heading:0});

// The local simulation runs continuously from the driver's controls. Network
// snapshots supply a separate reference, never a new starting pose every paint.
// Only the server decides contacts, timing, penalties, tyres and classification.
export class MultiplayerTracking {
 constructor(track,id,{liveInput=false}={}){
  Object.assign(this,{track,id,liveInput,frames:[],arrivals:[],interval:50,delay:110,rtt:100,remoteAt:null,session:null,local:null,reference:null,localAt:0,lastAt:0,correction:zero(),controls:[],sentTimes:new Map(),contactSequences:new Map(),contactLocks:new Map()});
 }
 setPing(ms){if(Number.isFinite(ms)&&ms>=0)this.rtt=this.rtt*.7+Math.min(ms,2000)*.3;}
 record(s,now){
  const at=s.elapsed*1000,last=this.frames.at(-1);
  if(this.phase===s.phase&&last&&at<last.at)return;
  if(this.phase!==s.phase){this.contactSequences.clear();this.contactLocks.clear();this.frames=[];this.arrivals=[];this.interval=50;this.delay=110;this.remoteAt=null;}
  this.phase=s.phase;
  for(const car of s.cars){if((car.contactSequence||0)>(this.contactSequences.get(car.id)||0)){this.contactSequences.set(car.id,car.contactSequence);this.contactLocks.set(car.id,now+300);if(car.lastContactWith)this.contactLocks.set(car.lastContactWith,now+300);}}
  if(this.frames.at(-1)?.at===at){this.frames[this.frames.length-1]={at,cars:s.cars};return;}
  if(last&&at>last.at)this.interval+=(clamp(at-last.at,16,150)-this.interval)*.15;
  this.arrivals.push(now-at);if(this.arrivals.length>90)this.arrivals.shift();
  this.clockOffset=Math.min(...this.arrivals);
  if(this.arrivals.length>=6){const jitter=[...this.arrivals].sort((a,b)=>a-b),spread=jitter[Math.floor(jitter.length*.9)]-jitter[0];this.delay+=(Math.min(300,Math.max(110,this.interval*1.5)+spread)-this.delay)*.06;}
  this.frames.push({at,cars:s.cars});if(this.frames.length>90)this.frames.shift();
 }
 sent(sequence,now){this.sentTimes.set(sequence,now);for(const [key,at]of this.sentTimes)if(at<now-2500)this.sentTimes.delete(key);}
 remember(control,now){
  const last=this.controls.at(-1),next={steer:Number(control.steer)||0,throttle:!!control.throttle,brake:!!control.brake,boost:!!control.boost,park:!!control.park};
  if(!last||Object.keys(next).some(k=>next[k]!==last.control[k]))this.controls.push({at:now,control:next});
  while(this.controls.length>1&&this.controls[1].at<now-2000)this.controls.shift();
 }
 controlAt(at){
  for(let i=this.controls.length-1;i>=0;i--)if(this.controls[i].at<=at)return this.controls[i].control;
  return {brake:true,park:true};
 }
 project(car,dt){
  if(!active(this.session)||dt<=0||car.finished)return;
  if(car.pitState&&car.pitState!=='none'){const plan=pitLayout(this.track),end=car.pitState==='lane'?pitStopStation(plan,car):car.pitState==='service'?car.pitTravel:plan.length;Object.assign(car,pitPose(car,this.track,Math.min(end,car.pitTravel+car.v*dt)));return;}
  const before={x:car.x,z:car.z,heading:car.heading};projectMotion(car,dt);moveWithBarriers(car,this.track,before);
 }
 localPose(now){
  if(!this.previousLocal||!active(this.session))return copy(this.local);
  // Interpolate the two completed fixed physics steps. Projecting a partial
  // step at the old speed caused alternating long/short frames at 90/120 Hz.
  // One fixed step of presentation delay keeps position and velocity continuous.
  const a=this.previousLocal,b=this.local,t=clamp((now-this.localAt)/(1000/60),0,1),t2=t*t,t3=t2*t,c=copy(b),va=velocityOf(a),vb=velocityOf(b),dt=1/60;
  for(const k of ['x','z']){const m0=(va[k]+(this.previousCorrection?.[k]||0))*dt,m1=(vb[k]+this.correction[k])*dt;c[k]=(2*t3-3*t2+1)*a[k]+(t3-2*t2+t)*m0+(-2*t3+3*t2)*b[k]+(t3-t2)*m1;}
  for(const k of ['y','pitch','v','steer'])c[k]=(a[k]||0)+((b[k]||0)-(a[k]||0))*t;
  c.heading=a.heading+angleDiff(b.heading,a.heading)*t;c.motionHeading=(a.motionHeading??a.heading)+angleDiff(b.motionHeading??b.heading,a.motionHeading??a.heading)*t;
  const travel=c.motionHeading??c.heading;c.v+=this.correction.x*Math.sin(travel)+this.correction.z*Math.cos(travel);
  return c;
 }
 advance(until){
  if(!this.liveInput||!active(this.session)||!this.local||this.local.finished)return;
  const end=Math.min(until,this.lastAt+500),dt=1/60;
  while(this.localAt+dt*1000<=end+1e-6){
   this.previousLocal=copy(this.local);this.previousCorrection={...this.correction};
   this.localAt+=dt*1000;
   const control=this.controlAt(this.localAt),elapsed=this.session.elapsed+(this.localAt-this.snapshotAt)/1000;
   stepCar(this.local,control,this.track,dt,elapsed,Infinity);
   stepCar(this.reference,control,this.track,dt,elapsed,Infinity);
   if(this.local.pitState!=='none'||this.reference.pitState!=='none'){this.correction=zero();if(this.local.pitState===this.reference.pitState&&this.local.pitState!=='service'){this.local.pitTravel+=clamp(this.reference.pitTravel-this.local.pitTravel,-.8*dt,.8*dt);Object.assign(this.local,pitPose(this.local,this.track));}continue;}
   const dx=this.reference.x-this.local.x,dz=this.reference.z-this.local.z,length=Math.hypot(dx,dz),gain=Math.min(1.6,3/Math.max(.001,length)),blend=1-Math.exp(-dt*6);
   const neutral=Math.abs(control.steer||0)<.03,heading=this.local.motionHeading??this.local.heading,rx=Math.cos(heading),rz=-Math.sin(heading),target={x:dx*gain,z:dz*gain,y:clamp((this.reference.y-this.local.y)*2,-1,1),heading:neutral?0:clamp(angleDiff(this.reference.heading,this.local.heading)*2,-.03,.03)};
   // A network correction is not a steering command. With centred controls,
   // preserve the driver's heading and bound only the reconciliation's side
   // velocity; real physics/impact velocities are untouched.
   if(neutral){this.correction.heading=0;const lateral=target.x*rx+target.z*rz,trim=lateral-clamp(lateral,-.25,.25);target.x-=rx*trim;target.z-=rz*trim;}
   for(const k of ['x','y','z','heading'])this.correction[k]+=(target[k]-this.correction[k])*blend;
   const before={x:this.local.x,z:this.local.z,heading:this.local.heading};
   this.local.x+=this.correction.x*dt;this.local.y+=this.correction.y*dt;this.local.z+=this.correction.z*dt;
   const turn=this.correction.heading*dt;this.local.heading+=turn;this.local.motionHeading=(this.local.motionHeading??this.local.heading)+turn;
   // Limit velocity correction acceleration; a delayed brake/boost snapshot
   // cannot instantaneously change local speed or cancel the next key press.
   this.local.v+=clamp((this.reference.v-this.local.v)*1.6,-2,2)*dt;
   moveWithBarriers(this.local,this.track,before);
  }
 }
 receive(s,now,reset,receivedAt=now){
  const c=s.cars.find(car=>car.id===this.id);if(!c)return;
  if(this.session?.phase===s.phase&&s.elapsed<this.session.elapsed)return;
  const previous=this.session?.cars.find(car=>car.id===this.id);
  // Countdown time must never be caught up as driving time at lights out.
  const started=this.session&&!active(this.session)&&active(s);
  const discontinuity=reset||started||previous&&((c.contactSequence||0)>(previous.contactSequence||0)||(c.pitState||'none')!==(previous.pitState||'none')||Math.hypot((c.impactVX||0)-(previous.impactVX||0),(c.impactVZ||0)-(previous.impactVZ||0))>4||Math.abs((c.impactYaw||0)-(previous.impactYaw||0))>.6);
  if(this.local&&!discontinuity)this.advance(now);
  if(reset){this.contactSequences.clear();this.contactLocks.clear();this.sentTimes.clear();}
  this.record(s,receivedAt);this.session=s;this.lastAt=receivedAt;
  this.snapshotAt=s.elapsed*1000+this.clockOffset;
  if(reset)this.controls=[];
  const target=copy(c);target.conditions=s.conditions||c.conditions||'normal';if(s.weather){target.trackWetness=s.weather.wetness;target.rainIntensity=s.weather.rain;}
  // Replay a bounded reference to the local clock. Jitter changes this reference,
  // while the car being displayed continues on its existing physics timeline.
  const until=this.local&&!discontinuity?this.localAt:now,ackAt=this.sentTimes.get(c.inputAck),held=Number.isFinite(c.inputAppliedAt)&&c.inputAppliedSequence===c.inputAck?Math.max(0,s.elapsed-c.inputAppliedAt)*1000:NaN;
  // Map the authoritative pose to the controls the server actually accepted.
  // Gateway ping alone misses variable room-relay/input delay and replayed old
  // steering after the driver had already released it.
  const inputAt=Number.isFinite(ackAt)&&Number.isFinite(held)?Math.min(until,ackAt+held):this.snapshotAt-(this.liveInput&&active(s)?clamp(this.rtt,0,250):0),base=Math.max(until-500,inputAt);
  if(this.liveInput&&active(s))for(let at=Math.max(base,until-500);at<until-1e-6;){const next=Math.min(until,at+1000/60),dt=(next-at)/1000;stepCar(target,this.controlAt(next),this.track,dt,s.elapsed+(next-base)/1000,Infinity);at=next;}
  const distance=this.local?Math.hypot(this.local.x-target.x,this.local.z-target.z):Infinity;
  if(!this.local||discontinuity||distance>Math.max(18,Math.min(45,Math.abs(c.v)*.5))){this.local=copy(target);this.localAt=now;this.correction=zero();this.previousLocal=null;this.previousCorrection=zero();}
  else{
   const movement=Object.fromEntries(movingFields.map(k=>[k,this.local[k]]));
   if(c.pitState!=='none'&&this.local.pitState===c.pitState)movement.pitTravel=this.local.pitTravel;
   Object.assign(this.local,copy(target),movement);
  }
  this.reference=target;
 }
 contactPose(car,now,local,near){
  const out={...car,smoothMotion:true},age=clamp((now-this.snapshotAt)/1000,0,.25);
  // A close car is advanced to the same reference clock as the local prediction.
  // A distant contact is shown as a pair on the fresh server timeline instead.
  this.project(out,Math.min(.5,age+(near?clamp(this.rtt/1000,0,.25):0)));
  if(near&&this.reference){const dx=local.x-this.reference.x,dz=local.z-this.reference.z,n=Math.hypot(dx,dz),scale=Math.min(1,4/Math.max(n,.001));out.x+=dx*scale;out.z+=dz*scale;out.y+=clamp(local.y-this.reference.y,-.5,.5);}
  return out;
 }
 frame(now,dt,control){
  const s=this.session;if(!s)return [];
  this.remember(control,now);this.advance(now);
  const own=s.cars.find(c=>c.id===this.id);
  const local=this.liveInput?pose(own,this.localPose(Math.min(now,this.lastAt+500))):{...own,smoothMotion:true};
  const desired=now-this.clockOffset-this.delay,step=Math.max(0,dt)*1000;
  this.remoteAt=this.remoteAt===null||Math.abs(desired-this.remoteAt)>600?desired:this.remoteAt+step*clamp(1+(desired-this.remoteAt-step)*.002,.9,1.1);
  return s.cars.map(c=>{
   if(c.id===this.id)return local;
   if(c.finished||!active(s))return {...c,smoothMotion:true};
   const distance=Math.hypot(c.x-own.x,c.z-own.z),near=distance<60&&Math.abs(c.y-own.y)<3&&c.pitState==='none'&&own.pitState==='none';
   const locked=(this.contactLocks.get(c.id)||0)>now;
   const smoothPose=()=>{
   const samples=[];
   for(const f of this.frames){const car=f.cars.find(x=>x.id===c.id);if(!car)continue;const at=car.ai?f.at:Math.min(f.at,(car.inputTime??f.at/1000)*1000),sample={at,car};if(samples.at(-1)?.at===at)samples[samples.length-1]=sample;else samples.push(sample);}
   if(samples.length<2)return {...c,smoothMotion:true};
   const target=this.remoteAt;let a=samples[0],b=a;
   for(let i=1;i<samples.length;i++){b=samples[i];if(b.at>=target)break;a=b;}
   const ca=a.car,cb=b.car,seconds=(b.at-a.at)/1000;
   if(cb.inputEpoch!==ca.inputEpoch||cb.finished!==ca.finished||cb.pitState!==ca.pitState||c.pitState!==cb.pitState||cb.resetTimer>(ca.resetTimer||0)+.3||Math.hypot(cb.x-ca.x,cb.z-ca.z)>Math.max(30,Math.max(Math.abs(ca.v),Math.abs(cb.v))*seconds*1.75+5))return {...c,smoothMotion:true};
   if(c.inputEpoch!==cb.inputEpoch)return {...c,smoothMotion:true};
   const t=b.at===a.at?1:clamp((target-a.at)/(b.at-a.at),0,1),out={...c,smoothMotion:true};
   for(const k of poseFields){const va=ca[k]??0,vb=cb[k]??va;out[k]=va+(k==='heading'||k==='motionHeading'?angleDiff(vb,va):vb-va)*t;}
   // Velocity-aware curves preserve acceleration through packet boundaries.
   // Bound tangents and the curve so cornering cannot overshoot an escape area.
   if(seconds>0&&seconds<=.35&&ca.pitState==='none'&&cb.pitState==='none'){
    const va=velocityOf(ca),vb=velocityOf(cb),t2=t*t,t3=t2*t;
    for(const k of ['x','z']){const extent=Math.abs(cb[k]-ca[k])+1,m0=clamp(va[k]*seconds,-extent*2,extent*2),m1=clamp(vb[k]*seconds,-extent*2,extent*2);out[k]=clamp((2*t3-3*t2+1)*ca[k]+(t3-2*t2+t)*m0+(-2*t3+3*t2)*cb[k]+(t3-t2)*m1,Math.min(ca[k],cb[k])-1,Math.max(ca[k],cb[k])+1);}
   }
   if(target>b.at)this.project(out,Math.min((target-b.at)/1000,.15));
   return out;
   };
   const buffered=smoothPose();
   if(locked)return this.contactPose(c,now,local,near);
   if(!near)return buffered;
   const current=this.contactPose(c,now,local,true),blend=clamp((60-distance)/30,0,1);
   for(const field of poseFields){const from=buffered[field]??0,to=current[field]??from;buffered[field]=from+(field==='heading'||field==='motionHeading'?angleDiff(to,from):to-from)*blend;}
   return buffered;
  });
 }
}
