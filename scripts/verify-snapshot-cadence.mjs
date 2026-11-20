// Actual race engine on a controlled clock; separate from game test suite.
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {pathToFileURL} from 'node:url';
import {writeFile} from 'node:fs/promises';
import {createRaceEngine} from '../backend/race-engine.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(v=>v.replace(/^--/,'').split('='))),Before=args.before?(await import(pathToFileURL(args.before))).createRaceEngine:createRaceEngine;
const original={performance:globalThis.performance,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval,dateNow:Date.now};
function scenario(factory,settings,blocked=false){
 let now=0,id=0,reads=0;const timers=new Map(),sockets=[];
 globalThis.performance={now:()=>now};Date.now=()=>1700000000000+now;globalThis.setInterval=(fn,ms)=>{const key=++id;timers.set(key,{fn,ms});return key;};globalThis.clearInterval=key=>timers.delete(key);
 const engine=factory();
 try{
  const peer=index=>{const ws=new EventEmitter();Object.assign(ws,{readyState:1,bufferedAmount:0,messages:[],send(raw){this.messages.push(JSON.parse(raw));},close(){this.readyState=3;}});engine.attachPeer(ws,{id:'cadence'+index});sockets.push(ws);return ws;};
  const send=(ws,data)=>ws.emit('message',Buffer.from(JSON.stringify(data))),host=peer(0);send(host,{type:'create',name:'Cadence',trackId:'it-1922',mode:'race',laps:3,aiCount:0,inputVersion:3,stateVersion:settings[0].version||3});const code=host.messages.find(m=>m.type==='lobby').code;
  for(let i=1;i<settings.length;i++){const ws=peer(i);send(ws,{type:'join',name:'Cadence '+i,code,inputVersion:3,stateVersion:settings[i].version||3});}
  send(host,{type:'start'});for(let i=0;i<settings.length;i++)send(sockets[i],{type:'delivery',hz:settings[i].hz});
  const session=engine.checkpoint()[0].session,car=session.cars[0];let x=car.x;Object.defineProperty(car,'x',{enumerable:true,configurable:true,get(){reads++;return x;},set(value){x=value;}});for(const ws of sockets){ws.messages=[];if(blocked)ws.bufferedAmount=1000;}
  const loop=[...timers.values()].find(t=>t.ms<20).fn;
  for(let tick=1;tick<=120;tick++){now=tick*1000/60+.00001;loop();}
  const serializedPackets=reads,delivered=sockets.map(ws=>ws.messages.filter(m=>['state','motion'].includes(m.type)).map(m=>({type:m.type,elapsed:m.elapsed})));
  for(const ws of sockets)ws.bufferedAmount=0;
  const count=ws=>ws.messages.filter(m=>m.type==='state').length,previous=sockets.map(count);car.lapHistory.push(80);now+=1000/60;loop();assert(sockets.every((ws,i)=>count(ws)>previous[i]),'Lap-history keyframe was delayed by reduced cadence');
  const previousPhase=sockets.map(count);session.phase='race-results';now+=1000/60;loop();assert(sockets.every((ws,i)=>count(ws)>previousPhase[i]&&ws.messages.at(-1).phase==='race-results'),'Phase keyframe was delayed');
  return {serializedPackets,delivered,historyKeyframeImmediate:true,phaseKeyframeImmediate:true};
 }finally{engine.close();globalThis.performance=original.performance;globalThis.setInterval=original.setInterval;globalThis.clearInterval=original.clearInterval;Date.now=original.dateNow;}
}
const cases=[{name:'all modern 20 Hz',settings:[{hz:20},{hz:20}]},{name:'all modern 10 Hz',settings:[{hz:10},{hz:10}]},{name:'mixed 10/20 Hz',settings:[{hz:10},{hz:20}]},{name:'legacy unchanged',settings:[{hz:10,version:2}]},{name:'blocked modern sockets',settings:[{hz:20}],blocked:true}],runs=[];
for(const spec of cases){const before=scenario(Before,spec.settings,spec.blocked),after=scenario(createRaceEngine,spec.settings,spec.blocked);assert.deepEqual(after.delivered,before.delivered,spec.name+' changed delivered snapshots');if(args.before&&spec.name==='all modern 10 Hz')assert(after.serializedPackets<before.serializedPackets,'Unsent 20 Hz encodings still generated');runs.push({name:spec.name,beforeSerializedPackets:before.serializedPackets,afterSerializedPackets:after.serializedPackets,deliveredPackets:after.delivered.map(a=>a.length),identicalDelivery:true,historyKeyframeImmediate:after.historyKeyframeImmediate,phaseKeyframeImmediate:after.phaseKeyframeImmediate});}
const report={description:'Actual Node race engine, two simulated seconds in countdown with 60 Hz physics clock; a counted position getter measures serialization only. Compares delivered timestamps/types, mixed rates, legacy compatibility and immediate keyframes. Not a network-latency test.',runs};console.log(JSON.stringify(report,null,2));if(args.out)await writeFile(args.out,JSON.stringify(report,null,2)+'\n');
