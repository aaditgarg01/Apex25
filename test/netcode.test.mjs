import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {NetworkMotion,encodeState} from '../shared/netcode.mjs';
import {createSession} from '../shared/session.mjs';
import {makeTracks} from '../shared/tracks.mjs';
import {stepCar} from '../shared/physics.mjs';
import {InputStream,INPUT_DT,encodeInput} from '../shared/input-stream.mjs';
const tracks=makeTracks(JSON.parse(await readFile(new URL('../public/data/circuits.geojson',import.meta.url))),JSON.parse(await readFile(new URL('../public/data/elevations.json',import.meta.url))));
const track=tracks[15];
function session(){const s=createSession(track,[{id:'p',name:'Player'},{id:'q',name:'Remote'}],{mode:'race'});s.elapsed=1;return s;}
test('local throttle and steering move on the next frame without awaiting a packet',()=>{const s=session(),original=JSON.stringify(s),n=new NetworkMotion(track,'p');n.receive(s,0);let cars;for(let i=1;i<=6;i++)cars=n.frame(i*1000/60,1/60,{throttle:true,steer:1});assert(cars[0].v>0);assert(Math.hypot(cars[0].x-s.cars[0].x,cars[0].z-s.cars[0].z)>0);assert.equal(JSON.stringify(s),original);});
test('remote cars interpolate positions and wrap heading through the short arc',()=>{const a=session(),b=structuredClone(a);a.cars[1].x=0;a.cars[1].heading=Math.PI-.1;b.cars[1].x=10;b.cars[1].heading=-Math.PI+.1;b.elapsed+=.1;const n=new NetworkMotion(track,'p');n.receive(a,0);n.receive(b,100);const remote=n.frame(125,1/60,{}).find(c=>c.id==='q');assert(Math.abs(remote.x-5)<1e-8);assert(Math.abs(Math.abs(remote.heading)-Math.PI)<1e-8);});
test('countdown, retirement, and recovery never receive phantom predicted motion',()=>{let s=session();s.elapsed=-2;const n=new NetworkMotion(track,'p');n.receive(s,0);assert.equal(n.frame(16,1/60,{throttle:true})[0].v,0);s=structuredClone(s);s.elapsed=1;s.cars[0].resetTimer=1;s.cars[0].x+=100;n.receive(s,100);assert.equal(n.frame(100,0,{})[0].x,s.cars[0].x);s=structuredClone(s);s.cars[0].finished=true;s.cars[0].retired=true;n.receive(s,200);assert.equal(n.frame(220,1/60,{throttle:true})[0].x,s.cars[0].x);});
test('long packet loss freezes prediction and caps remote extrapolation',()=>{const s=session();s.cars[0].v=40;s.cars[1].v=40;const n=new NetworkMotion(track,'p');n.receive(s,0);const first=n.frame(1000,1/60,{throttle:true}),second=n.frame(2000,1/60,{throttle:true});assert.equal(first[0].x,second[0].x);assert.equal(first[0].z,second[0].z);assert(Math.hypot(first[1].x-s.cars[1].x,first[1].z-s.cars[1].z)<=4.001);assert.equal(first[1].x,second[1].x);});
test('wire snapshots retain classification and history while shortening float tails',()=>{const s=session();s.cars[0].x=123.123456789;s.cars[0].lapHistory=[80.1234567];s.cars[1].retired=true;s.cars[1].finished=true;s.cars[1].finishTime=null;const decoded=JSON.parse(encodeState(s));assert.equal(decoded.cars[0].x,123.123);assert.deepEqual(decoded.cars[0].lapHistory,[80.123]);assert(decoded.cars[1].retired);assert.equal(decoded.cars[1].finishTime,null);assert(encodeState(s).length<JSON.stringify({type:'state',...s}).length);});

// Both directions obey WebSocket ordering, including head-of-line stalls. This
// runs real server command processing and client replay, not mocked positions.
for(const scenario of [{rtt:100,jitter:0},{rtt:300,jitter:80},{rtt:500,jitter:130,stall:500}])test(`recorded steering survives ${scenario.rtt}ms RTT, ${scenario.jitter}ms jitter and ${scenario.stall||0}ms stalls`,()=>{
 const s=session();s.phase='practice';s.elapsed=0;s.cars=[s.cars[0]];
 const car=s.cars[0],stream=new InputStream(car),n=new NetworkMotion(track,'p'),expected=structuredClone(car);
 n.receive(structuredClone(s),0);
 const up=[],down=[];let lastUp=0,lastDown=0,maxCorrection=0,maxError=0,maxPending=0,instantChanges=0;
 for(let tick=1;tick<=720;tick++){
  const now=tick*1000/60;
  while(up.length&&up[0].at<=now){const p=up.shift().packet;assert(stream.accept(car,p.epoch,p.commands,s.elapsed));}
  s.elapsed+=INPUT_DT;stream.step(car,{},track,INPUT_DT,s.elapsed,Infinity);
  if(tick%3===0){const jitter=scenario.jitter*(1+Math.sin(tick*1.73))/2,stall=scenario.stall&&tick===240?scenario.stall:0;lastDown=Math.max(lastDown,now+scenario.rtt/2+jitter+stall);down.push({at:lastDown,state:JSON.parse(encodeState(s))});}
  while(down.length&&down[0].at<=now){const before={...n.local};n.receive(down.shift().state,now);maxCorrection=Math.max(maxCorrection,Math.hypot(n.local.x-before.x,n.local.z-before.z));}
  const control={throttle:tick<480,brake:tick>=480,steer:tick<120?0:tick%90<45?.15:-.15};
  const beforeSteer=n.local.steer;
  n.frame(now,INPUT_DT,control);
  if(tick>120&&tick<480&&tick%45===0){assert(Math.sign(n.local.steer-beforeSteer)===Math.sign(control.steer));instantChanges++;}
  stepCar(expected,control,track,INPUT_DT,tick*INPUT_DT,Infinity);
  maxError=Math.max(maxError,Math.hypot(n.visual.x-expected.x,n.visual.z-expected.z));maxPending=Math.max(maxPending,n.pending.length);
  if(tick%2===0){const packet=n.takeCommands();if(packet){const jitter=scenario.jitter*(1+Math.cos(tick*1.31))/2,stall=scenario.stall&&tick===240?scenario.stall:0;lastUp=Math.max(lastUp,now+scenario.rtt/2+jitter+stall);up.push({at:lastUp,packet});}}
 }
 assert(instantChanges>=7);
 assert(maxCorrection<.3,`correction ${maxCorrection.toFixed(3)}m`);
 assert(maxError<.5,`deviation from immediate controls ${maxError.toFixed(3)}m`);
 assert(maxPending<120,`input backlog ${maxPending}`);
 console.log(`  RTT ${scenario.rtt}ms: max correction ${maxCorrection.toFixed(3)}m; path deviation ${maxError.toFixed(3)}m; pending ${maxPending}`);
});

test('server rejects malformed, duplicate and old-epoch commands and bounds simulation speed',()=>{
 const s=session(),car=s.cars[0],stream=new InputStream(car);
 assert(!stream.accept(car,0,[[1,NaN,1]],1));assert(!stream.accept(car,0,[[1,0,16]],1));
 assert(stream.accept(car,0,Array.from({length:8},(_,i)=>[i+1,0,1]),1));
 assert(!stream.accept(car,0,[[8,0,1]],1));
 stream.step(car,{},track,INPUT_DT,1,3);assert.equal(car.inputAck,1);
 stream.reset(car);assert.equal(car.inputAck,8);assert.equal(car.inputEpoch,1);
 assert(!stream.accept(car,0,[[9,0,1]],1));assert(stream.accept(car,1,[[9,0,1]],1));
 stream.step(car,{},track,INPUT_DT,1,3);assert.equal(car.inputAck,9);
});

test('recovery discards pending old inputs and disconnect braking cannot resurrect them',()=>{
 const s=session(),car=s.cars[0],stream=new InputStream(car),n=new NetworkMotion(track,'p');n.receive(structuredClone(s),0);
 n.frame(17,INPUT_DT,{throttle:true,steer:1});const packet=n.takeCommands();assert(stream.accept(car,packet.epoch,packet.commands,s.elapsed));
 stream.reset(car);car.x+=100;car.resetTimer=1;n.receive(structuredClone(s),50);
 assert.equal(n.pending.length,0);assert.equal(n.local.x,car.x);assert.equal(n.takeCommands(),null);
 assert(!stream.accept(car,packet.epoch,packet.commands,s.elapsed));
 n.frame(67,INPUT_DT,{brake:true});const next=n.takeCommands();assert(stream.accept(car,next.epoch,next.commands,s.elapsed));
 stream.step(car,{},track,INPUT_DT,s.elapsed,3);stream.step(car,{},track,INPUT_DT,s.elapsed+1.1,3);
 assert.equal(car.inputEpoch,2);assert(!stream.accept(car,next.epoch,[[next.commands[0][0]+1,0,1]],s.elapsed+1.1));
});

test('parking survives command encoding and stops without selecting reverse',()=>{
 const c=session().cars[0],stream=new InputStream(c);c.v=5;
 for(let i=0;i<180;i++){
  const commands=[encodeInput(i+1,{brake:true,park:true})];assert(stream.accept(c,c.inputEpoch,commands,i/60));stream.step(c,{},tracks[15],INPUT_DT,i/60,3);
 }
 assert.equal(c.v,0);
});

test('coalesced packets retain simulation spacing instead of collapsing to one arrival instant',()=>{
 const n=new NetworkMotion(track,'p'),a=session();a.phase='qualifying';a.cars[1].x=0;n.receive(structuredClone(a),0);
 for(let i=1;i<=3;i++){const b=structuredClone(a);b.elapsed+=i*.05;b.cars[1].x=i*5;n.receive(b,150);}
 const remote=n.frame(150,0,{}).find(c=>c.id==='q');assert(Math.abs(remote.x-7.5)<.0001,`remote x ${remote.x}`);
});
test('turning traffic follows curved motion and carries heading into nearby rendering',async()=>{
 const {advanceRemote}=await import('../shared/netcode.mjs');const c={x:0,y:0,z:0,heading:0,pitch:0,v:45,steer:.7,progress:0};const start={...c};
 for(let i=0;i<30;i++)advanceRemote(c,INPUT_DT);
 assert(c.x>2,'a turning car must leave the straight tangent');assert(c.heading>.25);assert.equal(c.progress,22.5);
 const reverse={...start,v:-12};advanceRemote(reverse,.1);assert(reverse.heading<0);assert(reverse.z<0);
});
test('local replay applies the same drafting force as the server beside traffic',async()=>{
 const {draftStrength}=await import('../shared/physics.mjs');const {sample}=await import('../shared/tracks.mjs');
 const s=session();s.phase='practice';s.elapsed=1;for(const [i,c]of s.cars.entries()){Object.assign(c,sample(track,100+i*20),{s:100+i*20,progress:100+i*20,v:65});}
 const n=new NetworkMotion(track,'p');n.receive(structuredClone(s),0);
 const expected=structuredClone(s.cars[0]),front=structuredClone(s.cars[1]);const {advanceRemote}=await import('../shared/netcode.mjs');advanceRemote(front,INPUT_DT);expected.slipstream=draftStrength(expected,[front]);assert(expected.slipstream>.5);
 stepCar(expected,{throttle:true},track,INPUT_DT,s.elapsed+INPUT_DT,Infinity);n.frame(1000/60,INPUT_DT,{throttle:true});assert(Math.abs(n.local.v-expected.v)<1e-9);
});
