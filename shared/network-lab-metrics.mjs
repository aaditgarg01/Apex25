const percentile=(values,q)=>{if(!values.length)return null;const a=[...values].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor((a.length-1)*q))];};
const round=v=>Number.isFinite(v)?Math.round(v*100)/100:null;
const push=(list,value)=>{if(Number.isFinite(value)){list.push(value);if(list.length>20000)list.shift();}};
export class NetworkLabMetrics{
 constructor(){this.reset();}
 reset(){this.start=null;this.last=null;this.lastSimulation=null;this.firstSimulation=null;this.bytes=0;this.updates=0;this.gaps=[];this.pings=[];this.inputs=[];this.frames=[];this.jerks=[];this.commands=new Map();this.previousAck=0;this.previousPose=null;this.previousSpeed=null;this.previousAcceleration=null;this.previousEpoch=null;this.resumes=0;}
 received(bytes){if(this.start!==null&&Number.isFinite(bytes)&&bytes>0)this.bytes+=bytes;}
 sent(sequence,now){this.commands.set(sequence,now);while(this.commands.size>300)this.commands.delete(this.commands.keys().next().value);}
 packet(state,car,now,bytes){
  if(state.elapsed<1)return;
  if(this.start===null){this.start=now;this.firstSimulation=state.elapsed;}
  this.bytes+=bytes;
  if(this.lastSimulation!==null&&state.elapsed<=this.lastSimulation)return;
  if(this.last!==null)push(this.gaps,now-this.last);
  this.last=now;this.lastSimulation=state.elapsed;this.updates++;
  const ack=car?.inputAck||0;
  if(ack>this.previousAck){if(this.commands.has(ack))push(this.inputs,now-this.commands.get(ack));this.previousAck=ack;for(const seq of this.commands.keys())if(seq<=ack)this.commands.delete(seq);}
 }
 rendered(car,now,dt){
  if(this.start===null||dt<=0)return;
  push(this.frames,dt*1000);
  const previous=this.previousPose,continuous=previous&&car.inputEpoch===this.previousEpoch&&car.pitState===previous.pitState&&car.finished===previous.finished&&Math.hypot(car.x-previous.x,car.z-previous.z)<8&&dt<.1;
  if(continuous){const speed=((car.x-previous.x)*Math.sin(car.heading)+(car.z-previous.z)*Math.cos(car.heading))/dt;
   if(this.previousSpeed!==null){const acceleration=(speed-this.previousSpeed)/dt;if(this.previousAcceleration!==null)push(this.jerks,Math.abs((acceleration-this.previousAcceleration)/dt));this.previousAcceleration=acceleration;}
   this.previousSpeed=speed;
  }else{this.previousSpeed=null;this.previousAcceleration=null;}
  this.previousPose={x:car.x,z:car.z,pitState:car.pitState,finished:car.finished};this.previousEpoch=car.inputEpoch;
 }
 ping(ms){if(this.start!==null)push(this.pings,ms);}
 report(now,details={}){
  const seconds=this.start===null?0:Math.max(0,(now-this.start)/1000),ratio=this.last!==null&&this.last>this.start?(this.lastSimulation-this.firstSimulation)/((this.last-this.start)/1000):null;
  return {...details,measuredAt:new Date().toISOString(),durationSeconds:round(seconds),updates:this.updates,updatesPerSecond:round(seconds?this.updates/seconds:0),simulationRatio:round(ratio),decodedKBps:round(seconds?this.bytes/seconds/1024:0),connectionPingMs:{p50:round(percentile(this.pings,.5)),p95:round(percentile(this.pings,.95))},latestInputAckMs:{p50:round(percentile(this.inputs,.5)),p95:round(percentile(this.inputs,.95))},updateGapMs:{p50:round(percentile(this.gaps,.5)),p95:round(percentile(this.gaps,.95)),max:round(this.gaps.length?Math.max(...this.gaps):null)},frameMs:{p50:round(percentile(this.frames,.5)),p95:round(percentile(this.frames,.95))},visualJerkP95:round(percentile(this.jerks,.95)),resumes:this.resumes,measurementNotes:['Decoded JSON payload is not compressed wire traffic.','Latest acknowledged command latency is not the latency of every input.','Visual jerk includes driving actions, collisions and frame-time variation.']};
 }
}
