// Deterministic impairment diagnostic, independent of the game's test suite.
// A straight section isolates packet corrections from real cornering/contacts.
import {pathToFileURL} from 'node:url';
import {writeFile} from 'node:fs/promises';
import {createCar,stepCar} from '../shared/physics.mjs';
import {sample} from '../shared/tracks.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(v=>v.replace(/^--/,'').split('=')));
const {MultiplayerTracking}=await import(args.module?pathToFileURL(args.module):new URL('../shared/multiplayer-tracking.mjs',import.meta.url));
const points=[];const side=4000,step=4;
for(let edge=0;edge<4;edge++)for(let d=0;d<side;d+=step){const p=edge===0?{x:0,z:d,heading:0}:edge===1?{x:d,z:side,heading:Math.PI/2}:edge===2?{x:side,z:side-d,heading:Math.PI}:{x:side-d,z:0,heading:-Math.PI/2};points.push({...p,y:0,pitch:0,grade:0,groundY:0});}
const track={id:'network-diagnostic',points,length:4*side,step,width:20,urban:false,arid:false};
function make(id,s){const c=createCar(track,id,id,0);Object.assign(c,sample(track,s),{s,progress:s,v:40,inputEpoch:0,inputTime:1,pitState:'none'});return c;}
const drive=t=>({throttle:t<5||t>=6&&t<10||t>=11&&t<14,brake:t>=5&&t<6||t>=10&&t<11||t>=14&&t<15,boost:t>=2&&t<5||t>=6&&t<10,steer:0});
const percentile=(a,q)=>[...a].sort((x,y)=>x-y)[Math.floor((a.length-1)*q)];
function scenario(hz,fps,impaired){
 const server=make('p',300),rival=make('r',650),ideal=make('ideal',300),tracker=new MultiplayerTracking(track,'p',{liveInput:true});tracker.setPing(180);
 let tick=0,serial=0,nextSnapshot=0,previous=null,previousSpeed=null,previousAccel=null,maxError=0,queue=[],lastElapsed=-Infinity;const accels=[],jerks=[],errors=[];
 const state=()=>({phase:'race',conditions:'normal',elapsed:1+tick/60,cars:[structuredClone(server),structuredClone(rival)]});
 tracker.receive(state(),0,true,0);
 for(let frame=1;frame<=fps*18;frame++){
  const now=frame*1000/fps,time=now/1000,control=drive(time);tracker.remember(control,now);
  while((tick+1)/60<=time+1e-7){tick++;const t=tick/60;stepCar(server,drive(Math.max(0,t-.09)),track,1/60,1+t,3);stepCar(rival,{throttle:true,steer:0},track,1/60,1+t,3);stepCar(ideal,drive(t),track,1/60,1+t,3);server.inputTime=rival.inputTime=1+t;
   if(t+1e-7>=nextSnapshot){serial++;nextSnapshot+=1/hz;if(!impaired||serial%17!==0){const jitter=impaired?[0,15,65,5,130,10,5,20][serial%8]+(serial%53===0?175:0):0;queue.push({at:t*1000+90+jitter,state:state()});}}
  }
  queue.sort((a,b)=>a.at-b.at);
  while(queue.length&&queue[0].at<=now){const packet=queue.shift();if(packet.state.elapsed<=lastElapsed)continue;lastElapsed=packet.state.elapsed;tracker.record(packet.state,packet.at);tracker.receive(packet.state,now,false,packet.at);}
  const car=tracker.frame(now,1/fps,control).find(c=>c.id==='p');if(![car.x,car.z,car.v].every(Number.isFinite))throw Error('Non-finite rendered pose');
  const error=Math.hypot(car.x-ideal.x,car.z-ideal.z);if(time>2){errors.push(error);maxError=Math.max(maxError,error);}
  const speed=previous?(car.z-previous.z)*fps:null,accel=speed!==null&&previousSpeed!==null?(speed-previousSpeed)*fps:null;
  if(time>2&&accel!==null){accels.push(Math.abs(accel));if(previousAccel!==null)jerks.push(Math.abs((accel-previousAccel)*fps));}
  previous=car;previousSpeed=speed;previousAccel=accel;
 }
 return {snapshotsHz:hz,renderFps:fps,impaired,seconds:18,absoluteAccelerationP95:percentile(accels,.95),jerkP95:percentile(jerks,.95),jerkMax:Math.max(...jerks),instantInputReferenceErrorP95:percentile(errors,.95),maxReferenceError:maxError};
}
const report={description:'Synthetic deterministic packet-delay/jitter/drop diagnostic on actual shared car physics; not an internet benchmark or a substitute for two-device play.',runs:[[20,60,false],[20,60,true],[10,60,true],[20,30,true],[20,120,true]].map(v=>scenario(...v))};
console.log(JSON.stringify(report,null,2));if(args.out)await writeFile(args.out,JSON.stringify(report,null,2)+'\n');
