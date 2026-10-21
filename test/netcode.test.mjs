import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {NetworkMotion,encodeState} from '../shared/netcode.mjs';
import {createSession} from '../shared/session.mjs';
import {makeTracks} from '../shared/tracks.mjs';
import {InputStream,INPUT_DT,encodeInput} from '../shared/input-stream.mjs';
const tracks=makeTracks(JSON.parse(await readFile(new URL('../public/data/circuits.geojson',import.meta.url))),JSON.parse(await readFile(new URL('../public/data/elevations.json',import.meta.url))));
const track=tracks[15];
function session(){const s=createSession(track,[{id:'p',name:'Player'},{id:'q',name:'Remote'}],{mode:'race'});s.elapsed=1;return s;}
test('controls queue immediately while every online pose stays server-authoritative',()=>{
 const s=session(),original=JSON.stringify(s),n=new NetworkMotion(track,'p');n.receive(s,0);
 for(let i=1;i<=6;i++){
  const rendered=n.frame(i*1000/60,INPUT_DT,{throttle:true,steer:1});
  for(const [j,c]of rendered.entries()){assert.equal(c.x,s.cars[j].x);assert.equal(c.z,s.cars[j].z);assert.equal(c.heading,s.cars[j].heading);assert.equal(c.smoothMotion,true);}
 }
 assert.equal(n.pending.length,6);assert.equal(n.takeCommands().commands.length,6);assert.equal(JSON.stringify(s),original);
});
test('new snapshots display exactly without interpolation or heading offsets',()=>{
 const a=session(),b=structuredClone(a);a.cars[1].heading=Math.PI-.1;b.cars[1].x+=10;b.cars[1].heading=-Math.PI+.1;b.elapsed+=.1;
 const n=new NetworkMotion(track,'p');n.receive(a,0);n.frame(50,INPUT_DT,{});n.receive(b,100);
 const remote=n.frame(100,0,{}).find(c=>c.id==='q');assert.equal(remote.x,b.cars[1].x);assert.equal(remote.heading,b.cars[1].heading);
});
test('nearby and overlapping cars receive no client-only contact displacement',()=>{
 const s=session();Object.assign(s.cars[1],{x:s.cars[0].x+.3,z:s.cars[0].z,v:50,steer:1});
 const n=new NetworkMotion(track,'p');n.receive(s,0);const original=JSON.stringify(s);
 for(const c of n.frame(350,.1,{throttle:true})){const source=s.cars.find(x=>x.id===c.id);assert.equal(c.x,source.x);assert.equal(c.z,source.z);assert.equal(c.v,source.v);assert.equal(c.heading,source.heading);}
 assert.equal(JSON.stringify(s),original);
});
test('stalled snapshots hold their last positions and stop queuing stale controls',()=>{
 const s=session();s.cars.forEach(c=>Object.assign(c,{v:70,steer:.7,impactVX:4,impactVZ:3}));const n=new NetworkMotion(track,'p');n.receive(s,0);
 n.frame(200,INPUT_DT,{throttle:true});const count=n.pending.length;
 for(const now of [1001,2000,10000])for(const [i,c]of n.frame(now,INPUT_DT,{throttle:true}).entries()){assert.equal(c.x,s.cars[i].x);assert.equal(c.z,s.cars[i].z);assert.equal(c.heading,s.cars[i].heading);}
 assert.equal(n.pending.length,count);
});
test('wire snapshots retain classification and history while shortening float tails',()=>{const s=session();s.cars[0].x=123.123456789;s.cars[0].lapHistory=[80.1234567];s.cars[1].retired=true;s.cars[1].finished=true;s.cars[1].finishTime=null;const decoded=JSON.parse(encodeState(s));assert.equal(decoded.cars[0].x,123.123);assert.deepEqual(decoded.cars[0].lapHistory,[80.123]);assert(decoded.cars[1].retired);assert.equal(decoded.cars[1].finishTime,null);assert(encodeState(s).length<JSON.stringify({type:'state',...s}).length);});

test('acknowledged commands advance only the server and clear the client backlog',()=>{
 const s=session();s.phase='practice';const car=s.cars[0],stream=new InputStream(car),n=new NetworkMotion(track,'p');n.receive(structuredClone(s),0);
 n.frame(17,INPUT_DT,{throttle:true,steer:.5});const packet=n.takeCommands();assert(stream.accept(car,packet.epoch,packet.commands,s.elapsed));
 const before=n.visual.x;stream.step(car,{},track,INPUT_DT,s.elapsed,Infinity);s.elapsed+=INPUT_DT;
 assert.equal(n.visual.x,before);n.receive(structuredClone(s),34);assert.equal(n.pending.length,0);
 assert.equal(n.frame(34,0,{}).find(c=>c.id==='p').v,car.v);assert(car.v>0);
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
 assert.equal(n.pending.length,0);assert.equal(n.visual.x,car.x);assert.equal(n.takeCommands(),null);
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

test('coalesced packets display the newest snapshot without retaining old poses',()=>{
 const n=new NetworkMotion(track,'p'),a=session();a.phase='qualifying';a.cars[1].x=0;n.receive(structuredClone(a),0);
 for(let i=1;i<=3;i++){const b=structuredClone(a);b.elapsed+=i*.05;b.cars[1].x=i*5;n.receive(b,150);}
 const remote=n.frame(150,0,{}).find(c=>c.id==='q');assert.equal(remote.x,15);
});
test('command queues stay bounded and reset on a new input epoch',()=>{
 const s=session(),n=new NetworkMotion(track,'p');n.receive(s,0);
 for(let i=0;i<200;i++)n.frame(500,INPUT_DT,{throttle:true});assert.equal(n.pending.length,120);
 const next=structuredClone(s);next.cars[0].inputEpoch=2;next.cars[0].inputAck=120;n.receive(next,1000);
 assert.equal(n.pending.length,0);assert.equal(n.takeCommands(),null);n.frame(1017,INPUT_DT,{brake:true});const packet=n.takeCommands();assert.equal(packet.epoch,2);assert.equal(packet.commands[0][0],121);
});
