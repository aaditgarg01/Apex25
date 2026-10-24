import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LiveInputStream,INPUT_DT,encodeInput} from '../shared/input-stream.mjs';
import {NetworkMotion,encodeMotion,mergeMotionState,encodeState} from '../shared/netcode.mjs';
import {createSession} from '../shared/session.mjs';
import {makeTracks} from '../shared/tracks.mjs';
import {stepCar} from '../shared/physics.mjs';
const tracks=makeTracks(JSON.parse(await readFile(new URL('../public/data/circuits.geojson',import.meta.url))),JSON.parse(await readFile(new URL('../public/data/elevations.json',import.meta.url))));
const track=tracks[15],session=()=>{const s=createSession(track,[{id:'p',name:'Player'}],{mode:'practice'});s.elapsed=0;return s;};
test('15 Hz and 60 Hz clients advance identically on the 60 Hz server clock',()=>{
 const a=session().cars[0],b=structuredClone(a),fast=new LiveInputStream(a),slow=new LiveInputStream(b);let seq=0;
 for(let i=0;i<36;i++){const at=i*INPUT_DT;assert(fast.accept(a,a.inputEpoch,[encodeInput(i+1,{throttle:true})],at));if(i%4===0)assert(slow.accept(b,b.inputEpoch,[encodeInput(++seq,{throttle:true})],at));fast.step(a,{},track,INPUT_DT,at+INPUT_DT,Infinity);slow.step(b,{},track,INPUT_DT,at+INPUT_DT,Infinity);assert.equal(a.x,b.x);assert.equal(a.z,b.z);assert.equal(a.v,b.v);assert.equal(b.inputLag,0);assert.equal(b.inputTime,at+INPUT_DT);}
});
test('a delayed batch replaces controls without purchasing extra simulation time',()=>{
 const c=session().cars[0],expected=structuredClone(c),stream=new LiveInputStream(c),controls={throttle:true,steer:.4};
 assert(stream.accept(c,0,Array.from({length:8},(_,i)=>encodeInput(i+1,controls)),0));stream.step(c,{},track,INPUT_DT,INPUT_DT,Infinity);stepCar(expected,controls,track,INPUT_DT,INPUT_DT,Infinity);
 assert.equal(c.x,expected.x);assert.equal(c.z,expected.z);assert.equal(c.v,expected.v);assert.equal(c.inputAck,8);assert.equal(c.inputTime,INPUT_DT);
});
test('timeout brakes once and requires controls from the new epoch',()=>{
 const c=session().cars[0],stream=new LiveInputStream(c);assert(stream.accept(c,0,[encodeInput(1,{throttle:true})],0));stream.step(c,{},track,INPUT_DT,.1,Infinity);stream.step(c,{},track,INPUT_DT,.8,Infinity);assert.equal(c.inputEpoch,1);assert(!stream.accept(c,0,[encodeInput(2,{throttle:true})],.8));stream.step(c,{},track,INPUT_DT,.9,Infinity);assert.equal(c.inputEpoch,1);assert(stream.accept(c,1,[encodeInput(2,{brake:true})],.9));
});
test('live controls reject malformed data without corrupting the last valid input',()=>{
 const c=session().cars[0],stream=new LiveInputStream(c);assert(stream.accept(c,0,[[1,0,1]],0));
 for(const command of [[1,0,1],[2,NaN,1],[2,2,1],[2,0,16],[2,0,-1],[Infinity,0,1]])assert(!stream.accept(c,0,[command],.1));assert.equal(stream.received,1);assert.deepEqual(stream.command,[1,0,1]);
});
test('changed steering sends immediately, even between heartbeat intervals',()=>{
 const s=session(),n=new NetworkMotion(track,'p',{liveInput:true});n.receive(s,0);n.frame(0,0,{throttle:true});assert(n.takeCommands(0));assert.equal(n.takeCommands(10),null);n.frame(16,.016,{throttle:true,steer:1});assert.equal(n.takeCommands(16).commands[0][1],1);assert.equal(n.takeCommands(40),null);assert(n.takeCommands(66));assert.equal(n.pending.length,0);
});
test('backpressure coalesces unsent controls instead of replaying a stale backlog',()=>{
 const s=session(),original=JSON.stringify(s),n=new NetworkMotion(track,'p',{liveInput:true});n.receive(s,0);n.frame(0,0,{throttle:true});n.takeCommands(0);n.frame(10,.01,{steer:-1});n.frame(20,.01,{steer:1,brake:true});const next=n.takeCommands(20);assert.deepEqual(next.commands,[[2,1,2]]);assert.equal(n.pending.length,0);assert.equal(n.outgoing.length,0);assert.equal(JSON.stringify(s),original);assert(Number.isFinite(n.visual.x));
});
test('compact motion preserves histories and applies exact server poses immutably',()=>{
 const base=session();base.cars[0].lapHistory=[83.5];base.cars[0].bestLap=83.5;const next=structuredClone(base);next.elapsed=.1;Object.assign(next.cars[0],{x:123.1234,z:7.7778,heading:-3.13,v:41,inputEpoch:3,inputAck:11,boost:44});const original=JSON.stringify(base),packet=JSON.parse(encodeMotion(next)),merged=mergeMotionState(base,packet);
 assert.equal(merged.cars[0].x,123.123);assert.equal(merged.cars[0].z,7.778);assert.equal(merged.cars[0].heading,-3.13);assert.equal(merged.cars[0].inputEpoch,3);assert.deepEqual(merged.cars[0].lapHistory,[83.5]);assert.equal(merged.cars[0].bestLap,83.5);assert.equal(JSON.stringify(base),original);assert.equal(mergeMotionState(merged,{...packet,elapsed:.05}),merged);assert.equal(mergeMotionState(base,{...packet,phase:'race-results'}),base);
});
test('compact updates cut bandwidth while preserving terminal car status',()=>{
 const s=createSession(track,Array.from({length:8},(_,i)=>({id:'p'+i,name:'Player '+i})),{mode:'race'});s.elapsed=20;for(const c of s.cars){c.lapHistory=[82,83,81];c.lapValidHistory=[true,true,true];c.x+=123.45678;c.progress=1234.56789;}s.cars[1].finished=true;s.cars[2].retired=true;const packet=JSON.parse(encodeMotion(s)),merged=mergeMotionState(s,packet),full=encodeState(s,false).length,small=encodeMotion(s).length;
 assert(small<full*.5,`motion ${small} vs full ${full}`);assert(merged.cars[1].finished);assert(merged.cars[2].retired);
 console.log(`Motion packet ${small} bytes vs ${full} bytes full snapshot; estimated 60 Hz traffic ${Math.round((10*full+50*small)/(60*full)*100)}% of previous.`);
});

test('high frame rates cannot flood the server request budget',()=>{
 const n=new NetworkMotion(track,'p',{liveInput:true});n.receive(session(),0);let sent=0;
 for(let ms=0;ms<1000;ms++){n.frame(ms,.001,{steer:Math.sin(ms)});if(n.takeCommands(ms))sent++;}
 assert(sent<=80,`sent ${sent} packets`);assert(sent>60);
});
