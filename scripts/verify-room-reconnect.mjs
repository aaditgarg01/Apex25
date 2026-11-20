// Deterministic socket lifecycle diagnostic; no real network or game suite.
import assert from 'node:assert/strict';
import {RoomConnection} from '../public/room-connection.js';
const original={WebSocket:globalThis.WebSocket,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,performance:globalThis.performance};
let now=0,nextId=0;const timers=new Map(),sockets=[];
function advance(ms){const end=now+ms;for(;;){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;timers.delete(due[0]);now=due[1].at;due[1].fn();}now=end;}
class Socket {
 static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
 constructor(){this.readyState=0;this.bufferedAmount=0;this.sent=[];sockets.push(this);}
 open(){this.readyState=1;this.onopen?.({});}
 message(data){this.onmessage?.({data:JSON.stringify(data)});}
 send(data){this.sent.push(JSON.parse(data));}
 close(){if(this.readyState<2)this.readyState=2;}
 closed(code=1006){this.readyState=3;this.onclose?.({code});}
}
try{
 globalThis.WebSocket=Socket;globalThis.performance={now:()=>now};globalThis.setTimeout=(fn,ms)=>{const id=++nextId;timers.set(id,{fn,at:now+ms});return id;};globalThis.clearTimeout=id=>timers.delete(id);
 const connection=new RoomConnection('ws://diagnostic'),first=sockets.at(-1);let closes=0,resumes=0;connection.onclose=()=>closes++;connection.onresume=()=>resumes++;
 first.open();first.message({type:'welcome',id:'driver',resumeToken:'private'});first.message({type:'lobby'});first.closed();assert(connection.reconnecting);
 connection.forgetRoom();assert.equal(connection.reconnecting,false,'Leaving preserves reconnecting state');assert.equal(connection.readyState,Socket.CLOSED);advance(2000);assert.equal(sockets.length,1,'Cancelled room still reconnects');assert.equal(closes,0,'Cancelled retry fires terminal close');
 const active=new RoomConnection('ws://diagnostic'),source=sockets.at(-1);active.onresume=()=>resumes++;source.open();source.message({type:'welcome',id:'driver2',resumeToken:'private2'});source.message({type:'lobby'});source.closed();advance(250);const replacement=sockets.at(-1);replacement.open();assert.deepEqual(replacement.sent,[{type:'resume',id:'driver2',token:'private2'}]);replacement.message({type:'resumed'});assert.equal(active.reconnecting,false);assert.equal(resumes,1);source.closed();assert.equal(active.reconnecting,false,'Old socket close restarts replacement');advance(7000);assert.equal(replacement.readyState,Socket.OPEN,'Successful resume timeout was not cancelled');
 replacement.closed();advance(250);const abandoned=sockets.at(-1);active.forgetRoom();const socketCount=sockets.length;abandoned.open();abandoned.message({type:'resumed'});abandoned.closed();advance(10000);assert.equal(sockets.length,socketCount,'Abandoned attempt rescheduled');assert.equal(resumes,1,'Abandoned socket emits resumed');
 const reusable=new RoomConnection('ws://diagnostic'),open=sockets.at(-1);open.open();open.message({type:'lobby'});reusable.forgetRoom();assert.equal(reusable.readyState,Socket.OPEN,'Leaving a healthy room closes the reusable connection');
 console.log(JSON.stringify({leaveCancelsPendingRetry:true,leaveCancelsConnectingResume:true,oldSocketEventsIgnored:true,successfulResume:true,healthyConnectionReusable:true}));
}finally{Object.assign(globalThis,original);}
