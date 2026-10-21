import {INPUT_DT,encodeInput} from './input-stream.mjs';
const active=s=>['race','qualifying','practice'].includes(s.phase)&&s.elapsed>=0;
// Online poses come only from the latest server snapshot. Controls are queued
// independently: no replay, dead reckoning, render lag or speculative contacts.
export class NetworkMotion {
 constructor(_track,id){this.id=id;this.session=null;this.visual=null;this.acc=0;this.lastAt=-Infinity;this.pending=[];this.outgoing=[];this.sequence=0;this.epoch=0;}
 receive(s,now){
  const car=s.cars.find(c=>c.id===this.id);if(!car)return;
  const previous=this.session,old=previous?.cars.find(c=>c.id===this.id);
  const reset=!previous||previous.phase!==s.phase||s.elapsed<previous.elapsed||car.inputEpoch!==old?.inputEpoch||car.finished!==old?.finished||car.restarts!==old?.restarts||car.resetTimer>(old?.resetTimer||0)+.3;
  if(reset){this.pending=[];this.outgoing=[];this.acc=0;}
  this.epoch=car.inputEpoch||0;this.sequence=Math.max(this.sequence,car.inputAck||0);
  const ack=car.inputAck||0;
  this.pending=this.pending.filter(command=>command[0]>ack);
  this.outgoing=this.outgoing.filter(command=>command[0]>ack);
  this.session=s;this.lastAt=now;this.visual={...car,smoothMotion:true};
 }
 takeCommands(){if(!this.outgoing.length)return null;return {type:'commands',epoch:this.epoch,commands:this.outgoing.splice(0,8)};}
 frame(now,dt,control){
  if(!this.session)return [];
  const s=this.session,car=s.cars.find(c=>c.id===this.id),stale=now-this.lastAt>1000;
  if(active(s)&&!car.finished&&!stale&&this.pending.length<120){
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
