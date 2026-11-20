// Deterministic Redis-RTT model of the real outbox; separate from game suite.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {RelayOutbox} from '../backend/relay-outbox.mjs';
import {sendRoomPacket} from '../backend/socket-options.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(v=>v.replace(/^--/,'').split('=')));
function clock(){let now=0,id=0;const tasks=new Map();return {get now(){return now;},schedule(fn,delay=0){tasks.set(++id,{at:now+delay,fn});return id;},async advance(end){for(;;){const first=[...tasks].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!first)break;tasks.delete(first[0]);now=first[1].at;first[1].fn();for(let i=0;i<6;i++)await Promise.resolve();}now=end;for(let i=0;i<6;i++)await Promise.resolve();}};}
async function scenario(limit){
 const time=clock(),delivered=[],reliable=[],ages=[];let active=0,maximumActive=0,maximumPending=0,lastCreated=0;
 const queue=new RelayOutbox({maxInFlight:limit,schedule:(fn,ms)=>time.schedule(fn,ms),publish(_worker,batch){active++;maximumActive=Math.max(maximumActive,active);time.schedule(()=>{for(const p of batch)if(p.kind==='input'){delivered.push(p.sequence);lastCreated=p.createdAt;}else reliable.push(p.sequence);},60);return new Promise(resolve=>time.schedule(()=>{active--;resolve();},120));}});
 for(let i=0;i<40;i++)time.schedule(()=>queue.enqueue('worker',{kind:'input',route:'driver',sequence:i,createdAt:time.now},true),i*50);
 for(let i=0;i<4;i++)time.schedule(()=>queue.enqueue('worker',{kind:'message',route:'driver',sequence:i}),125+i*75);
 for(let i=0;i<=230;i++){await time.advance(i*10);maximumPending=Math.max(maximumPending,queue.queues.get('worker')?.latest.size||0);if(i>=50&&i<=190)ages.push(time.now-lastCreated);}
 assert.deepEqual(reliable,[0,1,2,3]);assert.equal(delivered.at(-1),39);assert(delivered.every((seq,i)=>i===0||seq>delivered[i-1]));assert.equal(queue.queues.size,0);assert(maximumActive<=limit);assert(maximumPending<=1);
 ages.sort((a,b)=>a-b);return {inFlightLimit:limit,modelRedisRoundTripMs:120,deliveredInputStates:delivered.length,maximumInFlight:maximumActive,maximumUnsentInputStates:maximumPending,stateAgeP50Ms:ages[Math.floor(ages.length*.5)],stateAgeP95Ms:ages[Math.floor(ages.length*.95)],reliableOrderPreserved:true};
}
const serial=await scenario(1),pipeline=await scenario(2);assert(pipeline.stateAgeP95Ms<serial.stateAgeP95Ms);
const time=clock(),failures=[];const broken=new RelayOutbox({schedule:(fn,ms)=>time.schedule(fn,ms),publish(){throw Error('injected publish failure');},onFailure:(_worker,batch)=>failures.push(batch)});broken.enqueue('worker',{kind:'message',route:'driver'});await time.advance(0);assert.equal(failures.length,1);assert.equal(broken.queues.size,0);
const sent=[],closed=[],ws={readyState:1,bufferedAmount:300000,send:data=>sent.push(data),close:(...closeArgs)=>closed.push(closeArgs)};assert.equal(sendRoomPacket(ws,'motion',{snapshot:true}),false);assert.equal(closed.length,0);assert.equal(sendRoomPacket(ws,'start'),false);assert.equal(closed[0][0],1012);assert.equal(sent.length,0);ws.bufferedAmount=0;assert(sendRoomPacket(ws,'lobby'));assert.deepEqual(sent,['lobby']);
const report={description:'Actual outbox with a deterministic model: 20Hz controls, 120ms publication acknowledgement and 60ms subscriber delivery. Compares previous serial policy to bounded two-publication pipeline; not measured internet latency.',serial,pipeline,publishFailureHandled:true,congestedCriticalPacketReconnects:true,congestedMotionDropped:true};console.log(JSON.stringify(report,null,2));if(args.out)await writeFile(args.out,JSON.stringify(report,null,2)+'\n');
