import {INPUT_DT,encodeInput} from './input-stream.mjs';
const active=s=>['race','qualifying','practice'].includes(s.phase)&&s.elapsed>=0;
// Online poses come only from the latest server snapshot. Live controls replace
// older unsent controls; no replay, dead reckoning or speculative contacts.
export class NetworkMotion {
 constructor(_track,id,{liveInput=false}={}){this.liveInput=liveInput;this.control=null;this.sentKey=null;this.sentAt=-Infinity;this.id=id;this.session=null;this.visual=null;this.acc=0;this.lastAt=-Infinity;this.pending=[];this.outgoing=[];this.sequence=0;this.epoch=0;}
 receive(s,now){
  const car=s.cars.find(c=>c.id===this.id);if(!car)return;
  const previous=this.session,old=previous?.cars.find(c=>c.id===this.id);
  const reset=!previous||previous.phase!==s.phase||s.elapsed<previous.elapsed||car.inputEpoch!==old?.inputEpoch||car.finished!==old?.finished||car.restarts!==old?.restarts||car.resetTimer>(old?.resetTimer||0)+.3;
  if(reset){this.pending=[];this.outgoing=[];this.acc=0;this.control=null;this.sentKey=null;this.sentAt=-Infinity;}
  this.epoch=car.inputEpoch||0;this.sequence=Math.max(this.sequence,car.inputAck||0);
  const ack=car.inputAck||0;
  this.pending=this.pending.filter(command=>command[0]>ack);
  this.outgoing=this.outgoing.filter(command=>command[0]>ack);
  this.session=s;this.lastAt=now;this.visual={...car,smoothMotion:true};
 }
 takeCommands(now=0){
  if(this.liveInput){
   if(!this.control)return null;const key=this.control.slice(1).join(':');
   if(now-this.sentAt<12.5||key===this.sentKey&&now-this.sentAt<50)return null;
   this.sentKey=key;this.sentAt=now;const command=[++this.sequence,...this.control.slice(1)];
   return {type:'commands',epoch:this.epoch,commands:[command]};
  }
  if(!this.outgoing.length)return null;return {type:'commands',epoch:this.epoch,commands:this.outgoing.splice(0,8)};
 }
 frame(now,dt,control){
  if(!this.session)return [];
  const s=this.session,car=s.cars.find(c=>c.id===this.id),stale=now-this.lastAt>1000;
  if(this.liveInput){
   this.control=['race','qualifying','practice'].includes(s.phase)&&!car.finished&&!stale?encodeInput(0,control):null;
  }else if(active(s)&&!car.finished&&!stale&&this.pending.length<120){
   this.acc+=Math.min(Math.max(0,dt),.1);
   while(this.acc+1e-9>=INPUT_DT&&this.pending.length<120){
    this.acc-=INPUT_DT;const command=encodeInput(++this.sequence,control);
    this.pending.push(command);this.outgoing.push(command);
   }
  }else this.acc=0;
  // smoothMotion bypasses the scene's generic position lerp. Even nearby cars
  // and cars in contact retain the exact position and heading the server sent.
  const rendered=s.cars.map(c=>({...c,smoothMotion:true}));
  this.visual=rendered.find(c=>c.id===this.id);
  return rendered;
 }
}
export const encodeState=(session,history=true)=>JSON.stringify({type:'state',...session},(key,v)=>!history&&(key==='lapHistory'||key==='lapValidHistory')?undefined:typeof v==='number'&&!Number.isInteger(v)?Math.round(v*1000)/1000:v);

// Positions remain exact server samples. Only frequently changing motion/telemetry fields
// travel at 60 Hz; standings and complete lap history travel less frequently.
export const MOTION_FIELDS=['id','x','y','z','heading','pitch','v','steer','motionHeading','impactVX','impactVZ','impactYaw','inputTime','physicsTime','inputAck','inputEpoch','progress','s','lateral','boost','finished','retired','resetTimer'];
export const encodeMotion=session=>JSON.stringify({type:'motion',phase:session.phase,elapsed:Math.round(session.elapsed*1000)/1000,cars:session.cars.map(c=>MOTION_FIELDS.map(k=>{const value=c[k];return typeof value==='number'&&!Number.isInteger(value)?Math.round(value*1000)/1000:value;}))});
export function mergeMotionState(base,packet){
 if(!base||base.phase!==packet.phase||!Number.isFinite(packet.elapsed)||packet.elapsed<base.elapsed||!Array.isArray(packet.cars))return base;
 const poses=new Map(packet.cars.filter(row=>Array.isArray(row)&&row.length===MOTION_FIELDS.length).map(row=>[row[0],row]));
 return {...base,elapsed:packet.elapsed,cars:base.cars.map(c=>{const row=poses.get(c.id);if(!row)return c;const next={...c};for(let i=1;i<MOTION_FIELDS.length;i++)if(row[i]!==null&&row[i]!==undefined)next[MOTION_FIELDS[i]]=row[i];return next;})};
}
