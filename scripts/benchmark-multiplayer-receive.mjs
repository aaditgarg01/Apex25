// Actual eight-car packets through the room client + decoder; not the game suite.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {makeTracks} from '../shared/tracks.mjs';
import {createSession,stepSession} from '../shared/session.mjs';
import {encodeMotion,mergeMotionState} from '../shared/netcode.mjs';
import {RoomConnection} from '../public/room-connection.js';
const args=Object.fromEntries(process.argv.slice(2).map(v=>v.replace(/^--/,'').split('=')));
const before=args.before?await import(pathToFileURL(args.before)):null,PreviousConnection=args.connectionBefore?(await import(pathToFileURL(args.connectionBefore))).RoomConnection:null;
const track=makeTracks(JSON.parse(await readFile(new URL('../public/data/circuits.geojson',import.meta.url))),JSON.parse(await readFile(new URL('../public/data/elevations.json',import.meta.url)))).find(t=>t.id==='it-1922');
const session=createSession(track,Array.from({length:8},(_,i)=>({id:'receive-'+i,name:'Driver '+i,ai:i>1})),{mode:'race',laps:3});session.elapsed=1;
const base=structuredClone(session),packets=[];
for(let tick=0;tick<240;tick++){
 stepSession(session,{'receive-0':{throttle:true,steer:0},'receive-1':{throttle:true,boost:tick>90,steer:0}},track,1/60);
 if(tick%3===0)packets.push(encodeMotion(session));
}
let compared=0;
if(before){
 let a=base,b=base;
 for(const raw of packets){const packet=JSON.parse(raw),oldA=a,oldB=b,savedA=structuredClone(a),savedB=structuredClone(b);a=before.mergeMotionState(a,packet);b=mergeMotionState(b,packet);assert.deepEqual(b,a);assert.deepEqual(oldA,savedA);assert.deepEqual(oldB,savedB);compared++;}
 const packet=JSON.parse(packets.at(-1)),id=base.cars[0].id,full=structuredClone(packet.cars[0]),strategy=structuredClone(packet.strategy[0]);
 const cases=[
  {...packet,inputTiming:[[id,full[14],3.337],[id,'bad',4],null],contacts:[[id,3,3.337,'receive-1',2],[],null],pitMerges:[[id,{x:2,z:3}]],pitServices:[[id,2.337,2.337,3,1]],raceFinishes:[[id,3,73.337,4]],pitTyreServices:[[id,2.337]],strategy:[strategy]},
  {...packet,cars:[null,[],full,{bad:true},[...full.slice(0,1),4,...full.slice(2)]],strategy:[strategy,[id]],inputTiming:{bad:true},contacts:[null,[id,-1,1,'r',3]],pitServices:[null,[id,NaN,Infinity,undefined,null]],raceFinishes:[[id,3,NaN,4]],pitTyreServices:[null,[id,Infinity]],pitMerges:undefined},
  {...packet,phase:'wrong'}, {...packet,elapsed:-1}, {...packet,elapsed:NaN}, {...packet,cars:null},
 ];
 for(const fixture of cases){assert.deepEqual(mergeMotionState(base,fixture),before.mergeMotionState(base,fixture));compared++;}
}
const savedSocket=globalThis.WebSocket;
class Socket {static OPEN=1;static CONNECTING=0;constructor(){this.readyState=1;this.bufferedAmount=0;}close(){this.readyState=3;}send(){}}
let parseCount=0,modernParseCalls=0,forwardedPacket=false,legacyConsumerWorks=false;
const nativeParse=JSON.parse;
try{
 globalThis.WebSocket=Socket;
 const verify=new RoomConnection('ws://diagnostic');let decoded;
 JSON.parse=(...values)=>{parseCount++;return nativeParse(...values);};
 verify.onmessage=(event,parsed)=>{decoded=parsed??JSON.parse(event.data);forwardedPacket=!!parsed;};
 verify.socket.onmessage({data:packets[0]});assert.equal(decoded.type,'motion');assert.equal(parseCount,1);modernParseCalls=parseCount;assert(forwardedPacket);
 verify.onmessage=event=>{legacyConsumerWorks=JSON.parse(event.data).type==='motion';};verify.socket.onmessage({data:packets[1]});assert(legacyConsumerWorks);
 JSON.parse=nativeParse;
 const run=(Connection,merge,reuse)=>{
  const connection=new Connection('ws://diagnostic');let state=base,checksum=0;
  connection.onmessage=(event,parsed)=>{const packet=reuse?parsed??JSON.parse(event.data):JSON.parse(event.data);state=merge(state,packet);checksum+=state.cars[0].z;};
  const start=performance.now();for(let cycle=0;cycle<75;cycle++){state=base;for(const raw of packets)connection.socket.onmessage({data:raw});}
  return {milliseconds:performance.now()-start,checksum};
 };
 let performanceReport=null;
 if(before&&PreviousConnection){
  const samples={before:[],after:[]};run(PreviousConnection,before.mergeMotionState,false);run(RoomConnection,mergeMotionState,true);
  for(let trial=0;trial<5;trial++)for(const name of trial%2?['after','before']:['before','after']){const current=name==='after',r=run(current?RoomConnection:PreviousConnection,current?mergeMotionState:before.mergeMotionState,current);samples[name].push(r.milliseconds);}
  const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
  const old=median(samples.before),fresh=median(samples.after);performanceReport={packetsPerRun:packets.length*75,runs:samples,beforeMedianMs:old,afterMedianMs:fresh,reductionPercent:100*(1-fresh/old)};
 }
 const report={description:'Eight-car actual Monza motion packets through RoomConnection callbacks and mergeMotionState. Five alternating warmed runs; CPU-only, not total game FPS, ping or an internet trial.',comparedStates:compared,identicalDecodedStates:!!before,parseCallsPerModernPacket:modernParseCalls,parsedPacketForwarded:forwardedPacket,legacyConsumerWorks,performance:performanceReport};
 console.log(JSON.stringify(report,null,2));if(args.out)await writeFile(args.out,JSON.stringify(report,null,2)+'\n');
}finally{JSON.parse=nativeParse;globalThis.WebSocket=savedSocket;}
