// Focused input-route delay diagnostic; does not invoke the game test suite.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {writeFile} from 'node:fs/promises';
import {createCar} from '../shared/physics.mjs';
import {sample} from '../shared/tracks.mjs';
import {LiveInputStream,encodeInput} from '../shared/input-stream.mjs';
import {encodeMotion,mergeMotionState} from '../shared/netcode.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(v=>v.replace(/^--/,'').split('=')));
const {MultiplayerTracking}=await import(args.module?pathToFileURL(args.module):new URL('../shared/multiplayer-tracking.mjs',import.meta.url));
const points=[];
for(let edge=0;edge<4;edge++)for(let d=0;d<4000;d+=4){const p=edge===0?{x:0,z:d,heading:0}:edge===1?{x:d,z:4000,heading:Math.PI/2}:edge===2?{x:4000,z:4000-d,heading:Math.PI}:{x:4000-d,z:0,heading:-Math.PI/2};points.push({...p,y:0,pitch:0,grade:0,groundY:0});}
const track={id:'input-delay-diagnostic',points,length:16000,step:4,width:30,urban:false,arid:false};
const rows=[];
for(const delay of [650,1000]){
 const car=Object.assign(createCar(track,'p','Keyboard',0),sample(track,400),{s:400,progress:400,motionHeading:0}),stream=new LiveInputStream(car),tracking=new MultiplayerTracking(track,'p',{liveInput:true});car.practice=true;car.v=45;tracking.rtt=100;
 const state=elapsed=>({phase:'practice',conditions:'normal',elapsed,cars:[structuredClone(car)]});tracking.receive(state(0),0,true);
 let sequence=0,commands=[],packets=[],lastElapsed=-1,previous=null,maximumFrameMove=0,maximumReplay=0,maximumDisplayOffset=0;
 for(let frame=1;frame<=840;frame++){
  const time=frame/60,now=time*1000,control={steer:0,throttle:time<8||time>10,brake:time>=8&&time<=10,boost:time>=3&&time<7};tracking.remember(control,now);
  if(frame%3===0){const command=encodeInput(++sequence,control);tracking.sent(sequence,now);commands.push({at:now+(time>=5&&time<7?delay:60),command});}
  commands.sort((a,b)=>a.at-b.at);while(commands[0]?.at<=now){const command=commands.shift();stream.accept(car,car.inputEpoch,[command.command],time);}
  stream.step(car,{},track,1/60,time,Infinity);
  if(frame%3===0){const full=state(time);packets.push({at:now+60,state:mergeMotionState(full,JSON.parse(encodeMotion(full)))});}
  while(packets[0]?.at<=now){const packet=packets.shift();if(packet.state.elapsed<lastElapsed)continue;lastElapsed=packet.state.elapsed;tracking.receive(packet.state,now,false,packet.at);}
  const shown=tracking.frame(now,1/60,control)[0];if(previous)maximumFrameMove=Math.max(maximumFrameMove,Math.hypot(shown.x-previous.x,shown.z-previous.z));previous=shown;
  maximumReplay=Math.max(maximumReplay,tracking.reconciliation?.replayMilliseconds||0);maximumDisplayOffset=Math.max(maximumDisplayOffset,Math.hypot(tracking.renderOffset.x,tracking.renderOffset.z));assert(Math.abs(shown.heading)<.001,'Neutral steering rotated');
 }
 rows.push({inputRouteDelayMs:delay,gatewayRttMs:100,maximumFrameMove,maximumReplay,maximumDisplayOffset});
}
const report={description:'Actual shared physics and live-input stream, 20 Hz rounded motion snapshots; input route slows to 650/1000ms while snapshot/ping route remains fast, then recovers. Zero steering, acceleration, boost and braking. Synthetic diagnostic.',runs:rows};console.log(JSON.stringify(report,null,2));if(args.out)await writeFile(args.out,JSON.stringify(report,null,2)+'\n');if(!args.module)for(const row of rows)assert(row.maximumFrameMove<3,'Timing correction snapped the displayed car');
