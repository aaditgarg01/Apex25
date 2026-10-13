import test from 'node:test';import assert from 'node:assert/strict';import WebSocket from 'ws';
import {carContact} from '../shared/collisions.mjs';
const base=process.env.TEST_URL||'http://localhost:3333';
async function client(){const ws=new WebSocket(base.replace(/^http/,'ws')),queue=[],waiters=[];ws.on('message',b=>{const m=JSON.parse(b);const i=waiters.findIndex(w=>w.type===m.type);if(i>=0){const w=waiters.splice(i,1)[0];clearTimeout(w.timer);w.resolve(m);}else queue.push(m);});const next=type=>{const i=queue.findIndex(m=>m.type===type);if(i>=0)return Promise.resolve(queue.splice(i,1)[0]);return new Promise((resolve,reject)=>{const w={type,resolve};w.timer=setTimeout(()=>{waiters.splice(waiters.indexOf(w),1);reject(new Error('Timeout: '+type));},10000);waiters.push(w);});};await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});const welcome=await next('welcome');return {ws,next,id:welcome.id,send:m=>ws.send(JSON.stringify(m))};}
test('static assets served; project files stay private',async()=>{for(const p of ['/','/app.js','/scene.js','/shared/tracks.mjs','/vendor/three.module.js','/data/circuits.geojson'])assert.equal((await fetch(base+p)).status,200,p);for(const p of ['/server.mjs','/package.json','/.env'])assert.equal((await fetch(base+p)).status,404,p);});
test('two clients join, host starts, input moves car, host migration and rematch work',async()=>{const a=await client(),b=await client();try{a.send({type:'create',name:'Host',trackId:'it-1922',mode:'race',laps:1});const room=await a.next('lobby');assert.match(room.code,/^[A-F0-9]{6}$/);b.send({type:'join',name:'Guest',code:room.code});const joined=await b.next('lobby');assert.equal(joined.players.length,2);await a.next('lobby');b.send({type:'start'});b.send({type:'ping',time:42});assert.equal((await b.next('pong')).time,42);a.send({type:'start'});assert.equal((await a.next('start')).cars.length,2);await b.next('start');const timer=setInterval(()=>a.send({type:'input',throttle:true}),50);let state;for(let i=0;i<150;i++){state=await a.next('state');if(state.elapsed>1)break;}clearInterval(timer);assert(state.cars.find(c=>c.id===a.id).v>5);a.send({type:'reset'});do{state=await a.next('state');}while(state.cars.find(c=>c.id===a.id).penalty<3);assert.equal(state.cars.find(c=>c.id===a.id).penalty,3);a.ws.close();let migrated=await b.next('lobby');assert.equal(migrated.host,b.id);b.send({type:'rematch'});const lobby=await b.next('lobby');assert.equal(lobby.state,'lobby');}finally{a.ws.close();b.ws.close();}});
test('unknown room returns a clear error',async()=>{const c=await client();try{c.send({type:'join',name:'Test',code:'ZZZZZZ'});assert.match((await c.next('error')).message,/not found/);}finally{c.ws.close();}});
test('online race rear-end contact blocks a following player instead of ghosting',async()=>{
 const front=await client(),side=await client(),rear=await client();let timer;
 try{
  front.send({type:'create',inputVersion:2,name:'Front',trackId:'it-1922',mode:'race',laps:3});const room=await front.next('lobby');
  for(const c of [side,rear]){c.send({type:'join',inputVersion:2,name:'Contact test',code:room.code});await c.next('lobby');}
  front.send({type:'start'});await front.next('start');let state;do{state=await front.next('state');}while(state.elapsed<0);
  let seq=0;timer=setInterval(()=>{const first=++seq,last=++seq;for(const c of [front,side,rear])c.send({type:'commands',epoch:0,commands:[[first,0,c===rear?1:2],[last,0,c===rear?1:2]]});},1000/30);
  let touched=false;
  do{
   state=await front.next('state');const a=state.cars.find(c=>c.id===front.id),b=state.cars.find(c=>c.id===rear.id);
   const gap=(a.x-b.x)*Math.sin(a.heading)+(a.z-b.z)*Math.cos(a.heading);
   assert(gap>4.9,'rear car must stay behind the full car body');
   const overlap=carContact(a,b);assert(!overlap||overlap.depth<.02,'allow only wire rounding tolerance');
   if(gap<5.4&&b.v<5)touched=true;
  }while(state.elapsed<3.5);
  assert(touched,'rear driver should reach and slow against front driver');
 }finally{clearInterval(timer);for(const c of [front,side,rear])c.ws.close();}
});
test('two modern clients receive acknowledgments only after their movement is simulated',async()=>{
 const a=await client(),b=await client();let timer;
 try{
  a.send({type:'create',inputVersion:2,name:'Input host',trackId:'it-1922',mode:'race',laps:2,aiCount:2});const room=await a.next('lobby');
  b.send({type:'join',inputVersion:2,name:'Input guest',code:room.code});await b.next('lobby');await a.next('lobby');
  a.send({type:'start'});const start=await a.next('start');await b.next('start');
  assert(start.cars.filter(c=>!c.ai).every(c=>c.inputAck===0&&c.inputEpoch===0));
  let state;do{state=await a.next('state');}while(state.elapsed<0);
  let seq=0;timer=setInterval(()=>{const commands=[[++seq,.1,1],[++seq,.1,1]];a.send({type:'commands',epoch:0,commands});b.send({type:'commands',epoch:0,commands});},1000/30);
  do{state=await a.next('state');}while(state.cars.filter(c=>!c.ai).some(c=>c.inputAck<60));
  clearInterval(timer);timer=null;
  for(const c of state.cars.filter(c=>!c.ai)){assert(c.v>8);assert(c.inputAck<=seq);assert(c.steer>.08);}
  a.send({type:'reset'});do{state=await a.next('state');}while(state.cars.find(c=>c.id===a.id).inputEpoch===0);
  const reset=state.cars.find(c=>c.id===a.id);assert.equal(reset.penalty,3);assert.equal(reset.inputEpoch,1);
  // Old commands in flight must not be applied after recovery.
  a.send({type:'commands',epoch:0,commands:[[seq+1,1,1]]});a.send({type:'ping',time:123});await a.next('pong');
  a.send({type:'commands',epoch:1,commands:[[seq+2,-1,1]]});
  do{state=await a.next('state');}while(state.cars.find(c=>c.id===a.id).inputAck<seq+2);
  assert.equal(state.cars.find(c=>c.id===a.id).inputAck,seq+2);
 }finally{clearInterval(timer);a.ws.close();b.ws.close();}
});
test('online weekend moves from qualifying through classification to a synchronized race',async()=>{const a=await client(),b=await client();try{a.send({type:'create',name:'Host',trackId:'in-2011',mode:'weekend',laps:78});const r=await a.next('lobby');assert.equal(r.laps,78);b.send({type:'join',name:'Guest',code:r.code});await b.next('lobby');await a.next('lobby');a.send({type:'start'});const q=await a.next('start');await b.next('start');assert.equal(q.phase,'qualifying');assert.equal(q.trackId,'in-2011');assert.equal(q.mode,'weekend');a.send({type:'end-session'});let state;do{state=await a.next('state');}while(state.phase!=='qualifying-results');b.send({type:'advance'});b.send({type:'ping',time:91});assert.equal((await b.next('pong')).time,91);a.send({type:'advance'});const race=await a.next('start');const guestRace=await b.next('start');assert.equal(race.phase,'race');assert.equal(race.laps,78);assert.equal(guestRace.laps,78);assert.equal(race.elapsed,-4);assert.equal(race.cars.length,2);assert.deepEqual(race.cars.map(c=>c.id),guestRace.cars.map(c=>c.id));assert(race.cars.every(c=>c.v===0&&!c.finished));}finally{a.ws.close();b.ws.close();}});
test('online practice can start at Eau Rouge and stop without starting a race',async()=>{const a=await client();try{a.send({type:'create',name:'Driver',trackId:'be-1925',mode:'practice',practiceStart:'eau-rouge'});await a.next('lobby');a.send({type:'start'});const p=await a.next('start');assert.equal(p.phase,'practice');assert(p.cars[0].s>600&&p.cars[0].s<700);assert(p.cars[0].pitch<0);a.send({type:'end-session'});let state;do{state=await a.next('state');}while(state.phase!=='practice-results');assert.equal(state.cars[0].bestLap,0);}finally{a.ws.close();}});

test('online opponents, retirement, and three qualifying restarts are authoritative',async()=>{const a=await client();try{a.send({type:'create',name:'Host',trackId:'mc-1929',mode:'weekend',aiCount:2,laps:7});await a.next('lobby');a.send({type:'start'});const q=await a.next('start');assert.equal(q.cars.length,3);assert.equal(q.cars.filter(c=>c.ai).length,2);let state;do{state=await a.next('state');}while(state.elapsed<.1);for(let i=1;i<=3;i++){a.send({type:'reset'});do{state=await a.next('state');}while(state.cars[0].restarts!==i);assert.equal(state.cars[0].lap,1);assert(!state.cars[0].invalidLap);do{state=await a.next('state');}while(state.cars[0].resetTimer>0);}a.send({type:'reset'});a.send({type:'ping',time:99});await a.next('pong');state=await a.next('state');assert.equal(state.cars[0].restarts,3);a.send({type:'end-session'});do{state=await a.next('state');}while(state.phase!=='qualifying-results');a.send({type:'advance'});await a.next('start');a.send({type:'retire'});do{state=await a.next('state');}while(!state.cars.find(c=>c.id===a.id).retired);assert.equal(state.cars.find(c=>c.id===a.id).finishTime,null);}finally{a.ws.close();}});

test('online qualifying restart refills a depleted overtake battery',async()=>{
 const c=await client();let timer;
 try{
  c.send({type:'create',name:'Battery test',trackId:'it-1922',mode:'weekend',aiCount:0});await c.next('lobby');c.send({type:'start'});await c.next('start');
  let state;do{state=await c.next('state');}while(state.elapsed<0);
  timer=setInterval(()=>c.send({type:'input',throttle:true,boost:true}),50);
  do{state=await c.next('state');}while(state.cars.find(p=>p.id===c.id).boost>90);
  clearInterval(timer);timer=null;c.send({type:'input'});c.send({type:'reset'});
  do{state=await c.next('state');}while(state.cars.find(p=>p.id===c.id).restarts!==1);
  assert.equal(state.cars.find(p=>p.id===c.id).boost,100);
 }finally{clearInterval(timer);c.ws.close();}
});
