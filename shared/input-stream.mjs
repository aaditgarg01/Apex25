import {stepCar} from './physics.mjs';

export const INPUT_DT=1/60;
export const INPUT_VERSION=2;
export const decodeInput=([,steer,flags])=>({steer,throttle:!!(flags&1),brake:!!(flags&2),boost:!!(flags&4),park:!!(flags&8)});
export const encodeInput=(seq,c)=>[seq,Math.max(-1,Math.min(1,Number(c.steer)||0)),(c.throttle?1:0)|(c.brake?2:0)|(c.boost?4:0)|(c.park?8:0)];

// Each command represents exactly one simulation step. Server time pays for
// those steps; a fast or malicious client cannot purchase extra movement.
export class InputStream {
 constructor(car){this.queue=[];this.credit=0;this.received=0;this.lastCommandAt=null;car.inputAck=0;car.inputEpoch=0;}
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
 reset(car){this.queue=[];this.credit=0;car.inputAck=this.received;car.inputEpoch++;}
 step(car,input,track,dt,elapsed,laps,afterStep=()=>{}){
  this.credit=Math.min(1,this.credit+dt);
  // A disconnected/background client eventually brakes on the server. Invalidate
  // the old input epoch so delayed commands cannot restart the car afterward.
  if(this.lastCommandAt!==null&&elapsed-this.lastCommandAt>1&&this.queue.length===0){
   this.reset(car);this.lastCommandAt=null;
  }
  if(this.lastCommandAt===null){stepCar(car,{brake:true,park:true},track,dt,elapsed,laps);afterStep();return;}
  const slipstream=car.slipstream;
  let count=0;
  while(this.queue.length&&this.credit+1e-9>=INPUT_DT&&count<8){
   const command=this.queue.shift();this.credit-=INPUT_DT;count++;
   car.slipstream=slipstream;
   stepCar(car,decodeInput(command),track,INPUT_DT,elapsed,laps);
   afterStep();
   car.inputAck=command[0];
  }
 }
}
