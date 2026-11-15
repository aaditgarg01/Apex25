import {projectMotion} from './motion.mjs';
import {moveWithBarriers} from './barriers.mjs';
import {stepCar} from './physics.mjs';
import {angleDiff} from './tracks.mjs';
import {pitPose,pitLayout} from './pits.mjs';
import {pitStopStation} from './pit-layout.mjs';

const active=s=>['race','qualifying','practice'].includes(s.phase)&&s.elapsed>=0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const copy=c=>({...c,tyreSetsUsed:{...c.tyreSetsUsed},sectors:[...(c.sectors||[])],lastSectors:[...(c.lastSectors||[])],bestSectors:[...(c.bestSectors||[])],lapHistory:[...(c.lapHistory||[])],lapValidHistory:[...(c.lapValidHistory||[])]});
const zero=()=>({x:0,y:0,z:0,heading:0});
const poseFields=['x','y','z','heading','motionHeading','v','steer','pitch','impactVX','impactVZ','impactYaw'];
const pose=(source,motion)=>Object.assign({...source,smoothMotion:true},Object.fromEntries(poseFields.map(k=>[k,motion[k]??source[k]])));

// Presentation only: the server still owns contacts, timing and classification.
// Restore the earlier buffered rival tracking and reconciled local simulation,
// using the shared-clock input protocol rather than its old command queue.
export class MultiplayerTracking {
 constructor(track,id,{liveInput=false}={}){
  Object.assign(this,{track,id,liveInput,frames:[],arrivals:[],interval:50,delay:90,rtt:100,remoteAt:null,session:null,local:null,localAt:0,lastAt:0,error:zero(),controls:[]});
 }
 setPing(ms){if(Number.isFinite(ms)&&ms>=0)this.rtt=this.rtt*.7+Math.min(ms,2000)*.3;}
 record(s,now){
  const at=s.elapsed*1000,last=this.frames.at(-1);
  if(this.phase!==s.phase||last&&at<last.at){this.frames=[];this.arrivals=[];this.interval=50;this.delay=90;this.remoteAt=null;}
  this.phase=s.phase;
  if(this.frames.at(-1)?.at===at){this.frames[this.frames.length-1]={at,cars:s.cars};return;}
  if(last&&at>last.at)this.interval+=(clamp(at-last.at,16,100)-this.interval)*.15;
  this.arrivals.push(now-at);if(this.arrivals.length>90)this.arrivals.shift();
  this.clockOffset=Math.min(...this.arrivals);
  if(this.arrivals.length>=6){const jitter=[...this.arrivals].sort((a,b)=>a-b),spread=jitter[Math.floor(jitter.length*.9)]-jitter[0];this.delay+=(Math.min(260,Math.max(90,this.interval*1.25)+spread)-this.delay)*.08;}
  this.frames.push({at,cars:s.cars});if(this.frames.length>90)this.frames.shift();
 }
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
  const c=copy(this.local);this.project(c,clamp((now-this.localAt)/1000,0,1/60));
  for(const k of ['x','y','z','heading'])c[k]+=this.error[k];
  return c;
 }
 advance(until){
  if(!this.liveInput||!active(this.session)||this.local.finished)return;
  // Never keep driving a guess through a disconnected or badly stalled link.
  const end=Math.min(until,this.lastAt+250),dt=1/60;
  while(this.localAt+dt*1000<=end+1e-6){
   this.localAt+=dt*1000;
   stepCar(this.local,this.controlAt(this.localAt),this.track,dt,this.session.elapsed+(this.localAt-this.baseAt)/1000,Infinity);
  }
 }
 receive(s,now,reset,receivedAt=now){
  const c=s.cars.find(car=>car.id===this.id);if(!c)return;
  // Compare both poses at the same render time; comparing an older painted
  // position with a newer replay repeatedly adds latency to the correction.
  if(this.local&&!reset)this.advance(now);
  const old=this.local&&!reset?this.localPose(now):null;
  this.record(s,receivedAt);this.session=s;this.lastAt=receivedAt;
  if(reset){this.controls=[];this.error=zero();}
  this.local=copy(c);this.local.conditions=s.conditions||c.conditions||'normal';if(s.weather){this.local.trackWetness=s.weather.wetness;this.local.rainIntensity=s.weather.rain;}
  this.baseAt=receivedAt-(this.liveInput&&active(s)?clamp(this.rtt,0,250):0);this.localAt=this.baseAt;
  this.advance(now);
  const next=copy(this.local);this.project(next,clamp((now-this.localAt)/1000,0,1/60));
  const distance=old?Math.hypot(old.x-next.x,old.z-next.z):Infinity;
  this.error=old&&distance<12?{x:old.x-next.x,y:old.y-next.y,z:old.z-next.z,heading:angleDiff(old.heading,next.heading)}:zero();
 }
 frame(now,dt,control){
  const s=this.session;if(!s)return [];
  this.remember(control,now);this.advance(now);
  const seconds=Math.max(0,dt),decay=1-Math.exp(-seconds*10),distance=Math.hypot(this.error.x,this.error.z);
  // A delayed burst can leave several metres to reconcile. Bound correction
  // speed so catching up cannot briefly drive a moving car backwards.
  const correction=Math.min(decay,distance?Math.max(2,Math.abs(this.local.v)*.35)*seconds/distance:decay);
  for(const k of ['x','z'])this.error[k]*=1-correction;
  this.error.y*=1-decay;this.error.heading*=Math.exp(-seconds*16);
  const own=s.cars.find(c=>c.id===this.id);
  const local=this.liveInput?pose(own,this.localPose(Math.min(now,this.lastAt+250))):{...own,smoothMotion:true};
  const desired=now-this.clockOffset-this.delay;
  // Adjust playback speed gently when jitter changes the buffer target. Moving
  // the target must not freeze rivals for a frame or snap them forward.
  const step=Math.max(0,dt)*1000;
  this.remoteAt=this.remoteAt===null||Math.abs(desired-this.remoteAt)>500?desired:this.remoteAt+step*clamp(1+(desired-this.remoteAt-step)*.003,.85,1.15);
  return s.cars.map(c=>{
   if(c.id===this.id)return local;
   if(c.finished||!active(s))return {...c,smoothMotion:true};
   const samples=[];
   for(const f of this.frames){const car=f.cars.find(x=>x.id===c.id);if(!car)continue;const at=car.ai?f.at:Math.min(f.at,(car.inputTime??f.at/1000)*1000),sample={at,car};if(samples.at(-1)?.at===at)samples[samples.length-1]=sample;else samples.push(sample);}
   if(samples.length<2)return {...c,smoothMotion:true};
   const target=this.remoteAt;
   let a=samples[0],b=a;
   for(let i=1;i<samples.length;i++){b=samples[i];if(b.at>=target)break;a=b;}
   const ca=a.car,cb=b.car;
   if(cb.inputEpoch!==ca.inputEpoch||cb.finished!==ca.finished||cb.pitState!==ca.pitState||c.pitState!==cb.pitState||cb.resetTimer>(ca.resetTimer||0)+.3||Math.hypot(cb.x-ca.x,cb.z-ca.z)>30)return {...c,smoothMotion:true};
   // Do not interpolate through an older epoch after recovery or retirement.
   if(c.inputEpoch!==cb.inputEpoch)return {...c,smoothMotion:true};
   const t=b.at===a.at?1:clamp((target-a.at)/(b.at-a.at),0,1),out={...c,smoothMotion:true};
   for(const k of poseFields){const va=ca[k]??0,vb=cb[k]??va;out[k]=va+(k==='heading'||k==='motionHeading'?angleDiff(vb,va):vb-va)*t;}
   if(target>b.at)this.project(out,Math.min((target-b.at)/1000,.1));
   return out;
  });
 }
}
