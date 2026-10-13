import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {carContact,resolveCarContacts} from '../shared/collisions.mjs';
import {makeTracks,sample} from '../shared/tracks.mjs';
import {createSession,stepSession} from '../shared/session.mjs';
import {InputStream,INPUT_DT} from '../shared/input-stream.mjs';
import {NetworkMotion} from '../shared/netcode.mjs';
const tracks=makeTracks(JSON.parse(await readFile(new URL('../public/data/circuits.geojson',import.meta.url))),JSON.parse(await readFile(new URL('../public/data/elevations.json',import.meta.url)))),track=tracks[15];
const body=(id,x,z,v=0,heading=0)=>({id,x,y:0,z,v,heading,finished:false});
test('full-length rear-end impacts separate cars and transfer closing speed',()=>{
 const a=body('a',0,0,70),b=body('b',0,4,20);assert(carContact(a,b));resolveCarContacts([a,b]);
 assert(!carContact(a,b));assert(a.z<b.z);assert(a.v<70);assert(b.v>20);assert(Math.abs(a.v-b.v)<.001);
});
test('side, angled and coincident cars are solid while retired cars are cleared off track',()=>{
 for(const pair of [[body('a',0,0),body('b',2,0)],[body('a',0,0,30),body('b',2,1,20,Math.PI/3)],[body('a',0,0),body('b',0,0)]]){
  assert(carContact(...pair));resolveCarContacts(pair);assert(!carContact(...pair));assert(pair.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.v)));
 }
 const moving=body('a',0,0,80),retired={...body('b',0,4),finished:true,retired:true};
 const contacts=resolveCarContacts([moving,retired]);
 assert.equal(contacts,0);
 assert.equal(moving.v,80);
});
test('cars on separate elevations do not collide at track crossings',()=>{const a=body('a',0,0,30),b={...body('b',0,0,30),y:6};assert(!carContact(a,b));assert.equal(resolveCarContacts([a,b]),0);});
test('only qualifying is ghosted; race and practice resolve identical overlap',()=>{
 for(const mode of ['weekend','race','practice']){
  const s=createSession(track,[{id:'a',name:'A'},{id:'b',name:'B'}],{mode});s.elapsed=1;
  const p=sample(track,100);for(const c of s.cars)Object.assign(c,p,{s:100,progress:100,v:0});
  stepSession(s,{},track,INPUT_DT);
  assert.equal(!!carContact(...s.cars),mode==='weekend',mode);
 }
 const practice=createSession(track,Array.from({length:8},(_,i)=>({id:String(i),name:'Driver'})),{mode:'practice'});
 for(let i=0;i<practice.cars.length;i++)for(let j=i+1;j<practice.cars.length;j++)assert(!carContact(practice.cars[i],practice.cars[j]));
});
test('batched high-speed commands cannot tunnel through a car',()=>{
 const s=createSession(track,[{id:'a',name:'A'},{id:'b',name:'B'}],{mode:'race'}),[a,b]=s.cars;
 Object.assign(a,sample(track,100),{s:100,progress:100,v:94});Object.assign(b,sample(track,108),{s:108,progress:108,v:0,finished:true});
 const stream=new InputStream(a);stream.credit=.2;assert(stream.accept(a,0,Array.from({length:8},(_,i)=>[i+1,0,1]),1));
 stream.step(a,{},track,INPUT_DT,1,3,()=>resolveCarContacts(s.cars,a.id));
 const ahead=(b.x-a.x)*Math.sin(a.heading)+(b.z-a.z)*Math.cos(a.heading);
 assert(ahead>5);assert(a.v<1);assert(!carContact(a,b));assert.equal(a.inputAck,8);
});
test('online prediction blocks immediately in races and allows qualifying pass-through',()=>{
 for(const mode of ['race','weekend']){
  const s=createSession(track,[{id:'a',name:'A'},{id:'b',name:'B'}],{mode}),[a,b]=s.cars;s.elapsed=1;
  Object.assign(a,sample(track,100),{s:100,progress:100,v:70});Object.assign(b,sample(track,107),{s:107,progress:107,v:0,finished:true});
  new InputStream(a);const before=JSON.stringify(s),n=new NetworkMotion(track,'a');n.receive(s,0);
  let rendered;for(let i=1;i<=20;i++)rendered=n.frame(i*1000/60,INPUT_DT,{throttle:true});
  const ahead=(b.x-n.local.x)*Math.sin(a.heading)+(b.z-n.local.z)*Math.cos(a.heading);
  if(mode==='race'){assert(ahead>5);assert(n.local.v<1);assert(!carContact(...rendered));}else assert(ahead<0);
  assert.equal(JSON.stringify(s),before,'prediction must not mutate server state');
 }
});

test('a reversing impact retains signed motion while slowing against a parked car',()=>{
 const reversing=body('reverse',0,4,-8),parked=body('parked',0,0,0);assert(carContact(reversing,parked));
 resolveCarContacts([reversing,parked]);assert(!carContact(reversing,parked));assert(reversing.v<0&&reversing.v>-8);assert(parked.v<0);
});
