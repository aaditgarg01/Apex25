import {stepCar} from './physics.mjs';

export const INPUT_DT=1/60;
export const INPUT_VERSION=2;
export const decodeInput=([,steer,flags])=>({steer,throttle:!!(flags&1),brake:!!(flags&2),boost:!!(flags&4),park:!!(flags&8)});
export const encodeInput=(seq,c)=>[seq,Math.max(-1,Math.min(1,Number(c.steer)||0)),(c.throttle?1:0)|(c.brake?2:0)|(c.boost?4:0)|(c.park?8:0)];

// Each command represents exactly one simulation step. Server time pays for
// those steps; a fast or malicious client cannot purchase extra movement.
export class InputStream {
 constructor(car){this.queue=[];this.credit=0;this.received=0;this.lastCommandAt=null;this.idle=false;car.inputAck=0;car.inputEpoch=0;car.inputLag=0;car.inputTime=0;}
 accept(car,epoch,commands,elapsed){
  if(epoch!==car.inputEpoch||!Array.isArray(commands)||commands.length>8)return false;
  let previous=this.received;
  for(const c of commands){
   if(!Array.isArray(c)||c.length!==3||!Number.isSafeInteger(c[0])||c[0]<=previous||c[0]>this.received+120||!Number.isFinite(c[1])||Math.abs(c[1])>1||!Number.isInteger(c[2])||c[2]<0||c[2]>15)return false;
   previous=c[0];
  }
  if(this.queue.length+commands.length>120)return false;
  if(commands.length){this.queue.push(...commands);this.received=previous;this.lastCommandAt=elapsed;}
  return true;
 }
 reset(car,elapsed=car.inputTime||0){this.queue=[];this.credit=0;this.lastCommandAt=null;this.idle=true;car.inputAck=this.received;car.inputEpoch++;car.inputLag=0;car.inputTime=elapsed;}
 step(car,input,track,dt,elapsed,laps,afterStep=()=>{}){
  this.credit=Math.min(1,this.credit+dt);
  // A disconnected/background client eventually brakes on the server. Invalidate
  // the old input epoch so delayed commands cannot restart the car afterward.
  if(this.lastCommandAt!==null&&elapsed-this.lastCommandAt>1&&this.queue.length===0){
   this.reset(car,elapsed);
  }
  if(this.lastCommandAt===null){
   // Before the first input, preserve the same initial state the client predicts.
   // After a timeout, brake in real server time rather than banking idle steps.
   if(this.idle){this.credit=0;stepCar(car,{brake:true,park:true},track,dt,elapsed,laps);afterStep();car.inputTime=elapsed;}
   car.inputLag=this.credit;return;
  }
  this.idle=false;
  const slipstream=car.slipstream;
  let count=0;
  while(this.queue.length&&this.credit+1e-9>=INPUT_DT&&count<4&&!car.finished){
   const command=this.queue.shift();this.credit-=INPUT_DT;count++;
   car.slipstream=slipstream;
   // Commands in a delayed batch have distinct simulation times, including lap
   // and sector crossings. Never stamp the entire burst with its delivery time.
   car.inputTime=elapsed-this.credit;
   stepCar(car,decodeInput(command),track,INPUT_DT,car.inputTime,laps);
   afterStep();
   car.inputAck=command[0];
  }
  car.inputLag=car.finished?0:this.credit;
 }
}

// Live controls are state, not a queue of time slices. The server advances every
// car once on the shared clock even when a client renders or sends less often.
export const LIVE_INPUT_VERSION=3;
export class LiveInputStream {
 constructor(car){this.received=0;this.lastCommandAt=null;this.command=[0,0,10];car.inputAck=0;car.inputEpoch=0;car.inputLag=0;car.inputTime=0;}
 accept(car,epoch,commands,elapsed){
  if(epoch!==car.inputEpoch||!Array.isArray(commands)||!commands.length||commands.length>8)return false;
  let previous=this.received;
  for(const c of commands){
   if(!Array.isArray(c)||c.length!==3||!Number.isSafeInteger(c[0])||c[0]<=previous||!Number.isFinite(c[1])||Math.abs(c[1])>1||!Number.isInteger(c[2])||c[2]<0||c[2]>15)return false;
   previous=c[0];
  }
  this.command=[...commands.at(-1)];this.received=previous;this.lastCommandAt=elapsed;return true;
 }
 reset(car,elapsed=car.inputTime||0){this.lastCommandAt=null;this.command=[this.received,0,10];car.inputAck=this.received;car.inputEpoch++;car.inputLag=0;car.inputTime=elapsed;}
 step(car,_input,track,dt,elapsed,laps){
  if(this.lastCommandAt!==null&&elapsed-this.lastCommandAt>.7)this.reset(car,elapsed);
  stepCar(car,decodeInput(this.command),track,dt,elapsed,laps);
  car.inputTime=elapsed;car.inputLag=0;car.inputAck=this.received;
 }
}
