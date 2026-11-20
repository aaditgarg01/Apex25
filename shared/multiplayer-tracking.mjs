import {projectMotion,velocityOf} from './motion.mjs';
import {moveWithBarriers} from './barriers.mjs';
import {stepCar} from './physics.mjs';
import {angleDiff,nearest} from './tracks.mjs';
import {roadHalfWidth} from './baku.mjs';
import {pitPose,pitLayout} from './pits.mjs';
import {pitStopStation} from './pit-layout.mjs';

const active=s=>['race','qualifying','practice'].includes(s.phase)&&s.elapsed>=0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const copy=c=>({...c,tyreSetsUsed:{...c.tyreSetsUsed},sectors:[...(c.sectors||[])],lastSectors:[...(c.lastSectors||[])],bestSectors:[...(c.bestSectors||[])],lapHistory:[...(c.lapHistory||[])],lapValidHistory:[...(c.lapValidHistory||[])]});
const poseFields=['x','y','z','heading','motionHeading','v','steer','pitch','impactVX','impactVZ','impactYaw'];
const pose=(source,motion)=>Object.assign({...source,smoothMotion:true,physicsTime:motion.physicsTime??source.physicsTime},Object.fromEntries(poseFields.map(k=>[k,motion[k]??source[k]])));
const zero=()=>({x:0,y:0,z:0,heading:0});

// Predict local controls between snapshots, then replay from the full authority
// state. Reconciliation smoothing affects presentation, never physical steering.
// Only the server decides contacts, timing, penalties, tyres and classification.
export class MultiplayerTracking {
 constructor(track,id,{liveInput=false}={}){
  Object.assign(this,{track,id,liveInput,frames:[],timelines:new Map(),arrivals:[],interval:50,delay:110,rtt:100,remoteAt:null,session:null,local:null,reference:null,localAt:0,lastAt:0,correction:zero(),renderOffset:zero(),renderVelocity:zero(),renderAt:0,reconciliation:null,controls:[],sentTimes:new Map(),contactSequences:new Map(),contactLocks:new Map()});
 }
 setPing(ms){if(Number.isFinite(ms)&&ms>=0)this.rtt=this.rtt*.7+Math.min(ms,2000)*.3;}
 cacheFrame(frame){
  for(const car of frame.cars){const at=car.ai?frame.at:Math.min(frame.at,(car.inputTime??frame.at/1000)*1000),samples=this.timelines.get(car.id)||[],point={at,car,frameAt:frame.at};if(samples.at(-1)?.at===at)samples[samples.length-1]=point;else samples.push(point);this.timelines.set(car.id,samples);}
 }
 trimTimelines(){
  const oldest=this.frames[0]?.at??Infinity;
  for(const [id,samples]of this.timelines){while(samples.length&&samples[0].frameAt<oldest)samples.shift();if(!samples.length)this.timelines.delete(id);}
 }
 record(s,now){
  const at=s.elapsed*1000,last=this.frames.at(-1);
  if(this.phase===s.phase&&last&&at<last.at)return;
  if(this.phase!==s.phase){this.contactSequences.clear();this.contactLocks.clear();this.frames=[];this.timelines.clear();this.arrivals=[];this.interval=50;this.delay=110;this.remoteAt=null;}
  this.phase=s.phase;
  for(const car of s.cars){if((car.contactSequence||0)>(this.contactSequences.get(car.id)||0)){this.contactSequences.set(car.id,car.contactSequence);this.contactLocks.set(car.id,now+300);if(car.lastContactWith)this.contactLocks.set(car.lastContactWith,now+300);}}
  if(this.frames.at(-1)?.at===at){if(this.frames.at(-1).cars===s.cars)return;this.frames[this.frames.length-1]={at,cars:s.cars};this.timelines.clear();for(const frame of this.frames)this.cacheFrame(frame);return;}
  if(last&&at>last.at)this.interval+=(clamp(at-last.at,16,150)-this.interval)*.15;
  this.arrivals.push(now-at);if(this.arrivals.length>90)this.arrivals.shift();
  this.clockOffset=Math.min(...this.arrivals);
  if(this.arrivals.length>=6){const jitter=[...this.arrivals].sort((a,b)=>a-b),spread=jitter[Math.floor(jitter.length*.9)]-jitter[0];this.delay+=(Math.min(300,Math.max(110,this.interval*1.5)+spread)-this.delay)*.06;}
  const frame={at,cars:s.cars};this.frames.push(frame);if(this.frames.length>90)this.frames.shift();this.cacheFrame(frame);this.trimTimelines();
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
  // Compact packets carry current travel direction but not its angular rate.
  // Derive that rate from fresh samples instead of a stale full-state value.
  const samples=this.timelines.get(car.id),a=samples?.at(-2),b=samples?.at(-1),seconds=a&&b?(b.at-a.at)/1000:0;
  if(seconds>0&&seconds<=.35&&a.car.inputEpoch===b.car.inputEpoch&&a.car.pitState==='none'&&b.car.pitState==='none'&&(b.car.resetTimer||0)<=(a.car.resetTimer||0)+.3&&(a.car.contactSequence||0)===(b.car.contactSequence||0)){
   const from=a.car.motionHeading??a.car.heading,to=b.car.motionHeading??b.car.heading;
   if(Number.isFinite(from)&&Number.isFinite(to))car.motionYawRate=clamp(angleDiff(to,from)/seconds,-3,3);
  }
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
  if(Number.isFinite(a.physicsTime)&&Number.isFinite(b.physicsTime))c.physicsTime=a.physicsTime+(b.physicsTime-a.physicsTime)*t;
  c.heading=a.heading+angleDiff(b.heading,a.heading)*t;c.motionHeading=(a.motionHeading??a.heading)+angleDiff(b.motionHeading??b.heading,a.motionHeading??a.heading)*t;
  const travel=c.motionHeading??c.heading;c.v+=this.correction.x*Math.sin(travel)+this.correction.z*Math.cos(travel);
  return c;
 }
 boundRenderOffset(car,value){
  // Acknowledgement age can spike independently of ping. Preserve enough
  // forward display error to absorb that change without clipping a frame;
  // keep lateral error tight so smoothing cannot preserve a wrong course.
  const heading=car.motionHeading??car.heading,fx=Math.sin(heading),fz=Math.cos(heading),rx=Math.cos(heading),rz=-Math.sin(heading),forward=clamp(value.x*fx+value.z*fz,-80,80),lateral=clamp(value.x*rx+value.z*rz,-1.5,1.5),offset={x:fx*forward+rx*lateral,y:clamp(value.y,-.4,.4),z:fz*forward+rz*lateral,heading:clamp(value.heading,-.08,.08)};
  // Constrain only display error when the physical body is safely on the road.
  // Real runoff/kerb driving and collision forces remain authoritative.
  const road=nearest(this.track,car.x,car.z,car.s),half=roadHalfWidth(this.track,road.s)-1.3;
  if(!car.offtrack&&Math.abs(road.offset)<=half){const candidate=nearest(this.track,car.x+offset.x,car.z+offset.z,car.s),trim=candidate.offset-clamp(candidate.offset,-half,half);offset.x-=Math.cos(candidate.heading)*trim;offset.z+=Math.sin(candidate.heading)*trim;}
  return offset;
 }
 renderSpeedLimit(){return 3+Math.min(12,Math.max(0,Math.hypot(this.renderOffset.x,this.renderOffset.z)-8)*.5);}
 decayRenderOffset(now){
  let remaining=Math.min(.1,Math.max(0,now-this.renderAt)/1000);this.renderAt=now;
  while(remaining>1e-8){const dt=Math.min(remaining,1/120),ax=-64*this.renderOffset.x-16*this.renderVelocity.x,az=-64*this.renderOffset.z-16*this.renderVelocity.z,length=Math.hypot(ax,az),gain=Math.min(1,12/Math.max(length,.001));this.renderVelocity.x+=ax*gain*dt;this.renderVelocity.z+=az*gain*dt;const speed=Math.hypot(this.renderVelocity.x,this.renderVelocity.z),limit=Math.min(1,this.renderSpeedLimit()/Math.max(speed,.001));this.renderVelocity.x*=limit;this.renderVelocity.z*=limit;this.renderOffset.x+=this.renderVelocity.x*dt;this.renderOffset.z+=this.renderVelocity.z*dt;this.renderOffset.y*=Math.exp(-dt*12);this.renderOffset.heading*=Math.exp(-dt*12);remaining-=dt;}
 }
 presentedLocalPose(now){
  const car=this.localPose(now),offset=this.boundRenderOffset(car,this.renderOffset);
  car.x+=offset.x;car.y+=offset.y;car.z+=offset.z;car.heading+=offset.heading;car.motionHeading=(car.motionHeading??car.heading)+offset.heading;
  return car;
 }
 advance(until){
  if(!this.liveInput||!active(this.session)||!this.local||this.local.finished)return;
  const end=Math.min(until,this.lastAt+500),dt=1/60;
  while(this.localAt+dt*1000<=end+1e-6){
   this.previousLocal=copy(this.local);this.previousCorrection=zero();this.localAt+=dt*1000;
   stepCar(this.local,this.controlAt(this.localAt),this.track,dt,this.session.elapsed+(this.localAt-this.snapshotAt)/1000,Infinity);
  }
  this.reference=this.local;
 }
 receive(s,now,reset,receivedAt=now){
  const c=s.cars.find(car=>car.id===this.id);if(!c)return;
  if(this.session?.phase===s.phase&&s.elapsed<this.session.elapsed)return;
  const previous=this.session?.cars.find(car=>car.id===this.id);
  // Countdown time must never be caught up as driving time at lights out.
  const started=this.session&&!active(this.session)&&active(s);
  const discontinuity=reset||started||previous&&((c.contactSequence||0)>(previous.contactSequence||0)||(c.pitState||'none')!==(previous.pitState||'none')||Math.hypot((c.impactVX||0)-(previous.impactVX||0),(c.impactVZ||0)-(previous.impactVZ||0))>4||Math.abs((c.impactYaw||0)-(previous.impactYaw||0))>.6);
  this.decayRenderOffset(now);
  if(this.local&&!discontinuity)this.advance(now);
  const previousPresentation=this.local&&!discontinuity?this.presentedLocalPose(Math.min(now,this.lastAt+500)):null,previousVelocity=previousPresentation?velocityOf(previousPresentation):null;
  if(previousVelocity){previousVelocity.x+=this.renderVelocity.x;previousVelocity.z+=this.renderVelocity.z;}
  if(reset){this.contactSequences.clear();this.contactLocks.clear();this.sentTimes.clear();}
  this.record(s,receivedAt);this.session=s;this.lastAt=receivedAt;
  this.snapshotAt=s.elapsed*1000+this.clockOffset;
  if(reset)this.controls=[];
  const target=copy(c);target.conditions=s.conditions||c.conditions||'normal';if(s.weather){target.trackWetness=s.weather.wetness;target.rainIntensity=s.weather.rain;}
  const tick=1000/60,until=this.local&&!discontinuity&&active(s)?this.localAt+Math.floor(Math.max(0,now-this.localAt)/tick)*tick:now,ackAt=this.sentTimes.get(c.inputAck),held=Number.isFinite(c.inputAppliedAt)&&c.inputAppliedSequence===c.inputAck?Math.max(0,s.elapsed-c.inputAppliedAt)*1000:NaN;
  const inputAt=Number.isFinite(ackAt)&&Number.isFinite(held)?Math.min(until,ackAt+held):this.snapshotAt-(this.liveInput&&active(s)?clamp(this.rtt,0,250):0),base=Math.max(until-500,inputAt),previousAt=until-tick;
  let previousTarget=null;
  if(this.liveInput&&active(s))for(let at=base;at<until-1e-6;){let next=Math.min(until,at+tick);if(at<previousAt-1e-6&&next>previousAt)next=previousAt;stepCar(target,this.controlAt(next),this.track,(next-at)/1000,s.elapsed+(next-base)/1000,Infinity);if(Math.abs(next-previousAt)<1e-6)previousTarget=copy(target);at=next;}
  if(active(s)&&!discontinuity&&!previousTarget){previousTarget=copy(target);projectMotion(previousTarget,-1/60);if(Number.isFinite(previousTarget.physicsTime))previousTarget.physicsTime-=1/60;}
  const positionError=previousPresentation?Math.hypot(previousPresentation.x-target.x,previousPresentation.z-target.z):0;
  // Always reconcile the complete physics state, including heading and slip.
  // Smoothing belongs only to the displayed pose, never to steering/velocity.
  this.local=target;this.localAt=until;this.previousLocal=previousTarget;this.reference=this.local;this.correction=zero();this.previousCorrection=zero();this.renderOffset=zero();this.renderVelocity=zero();
  if(previousPresentation){const current=this.localPose(now);this.renderOffset=this.boundRenderOffset(current,{x:previousPresentation.x-current.x,y:previousPresentation.y-current.y,z:previousPresentation.z-current.z,heading:angleDiff(previousPresentation.heading,current.heading)});const currentVelocity=velocityOf(current),vx=previousVelocity.x-currentVelocity.x,vz=previousVelocity.z-currentVelocity.z,speed=Math.hypot(vx,vz),scale=Math.min(1,this.renderSpeedLimit()/Math.max(speed,.001));this.renderVelocity={x:vx*scale,y:0,z:vz*scale,heading:0};}

  this.renderAt=now;this.reconciliation={at:now,kind:discontinuity?'event':'snapshot',positionError,replayMilliseconds:active(s)?Math.max(0,until-base):0};
 }
 contactPose(car,now,local,near){
  const out={...car,smoothMotion:true},age=clamp((now-this.snapshotAt)/1000,0,.25);
  // A close car is advanced to the same reference clock as the local prediction.
  // A distant contact is shown as a pair on the fresh server timeline instead.
  const lead=near&&Number.isFinite(local.physicsTime)&&Number.isFinite(car.physicsTime)?clamp(local.physicsTime-car.physicsTime,0,.5):Math.min(.5,age+(near?clamp(this.rtt/1000,0,.25):0));
  this.project(out,lead);
  if(near&&this.reference){const dx=local.x-this.reference.x,dz=local.z-this.reference.z,n=Math.hypot(dx,dz),scale=Math.min(1,4/Math.max(n,.001));out.x+=dx*scale;out.z+=dz*scale;out.y+=clamp(local.y-this.reference.y,-.5,.5);}
  return out;
 }
 frame(now,dt,control){
  const s=this.session;if(!s)return [];
  this.remember(control,now);this.decayRenderOffset(now);this.advance(now);
  const own=s.cars.find(c=>c.id===this.id);
  const motion=this.liveInput?this.presentedLocalPose(Math.min(now,this.lastAt+500)):null;
  const local=motion?{...pose(own,motion),s:motion.s,progress:motion.progress,lateral:motion.lateral}:{...own,smoothMotion:true};
  const desired=now-this.clockOffset-this.delay,step=Math.max(0,dt)*1000;
  this.remoteAt=this.remoteAt===null||Math.abs(desired-this.remoteAt)>600?desired:this.remoteAt+step*clamp(1+(desired-this.remoteAt-step)*.002,.9,1.1);
  return s.cars.map(c=>{
   if(c.id===this.id)return local;
   if(c.finished||!active(s))return {...c,smoothMotion:true};
   const distance=Math.hypot(c.x-own.x,c.z-own.z),near=distance<60&&Math.abs(c.y-own.y)<3&&c.pitState==='none'&&own.pitState==='none';
   const locked=(this.contactLocks.get(c.id)||0)>now;
   const smoothPose=()=>{
   const samples=this.timelines.get(c.id)||[];
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
