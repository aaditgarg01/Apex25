// Disposable two-client room on the chosen server; no credentials are logged.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import WS from 'ws';
import {RoomConnection} from '../public/room-connection.js';
const args=Object.fromEntries(process.argv.slice(2).map(v=>v.replace(/^--/,'').split('=')));
globalThis.WebSocket=class extends WS{constructor(url){super(url,{family:4,handshakeTimeout:20000});}};
const peers=[];let timer,cleaning=false;
async function until(check){const end=performance.now()+30000;while(!check()){const error=peers.find(p=>p.error)?.error;if(error)throw error;if(performance.now()>end)throw Error('Live reconnect verification timed out');await new Promise(resolve=>setTimeout(resolve,25));}}
async function peer(name){
 const p={id:null,lobby:null,elapsed:-Infinity,updates:0,resumes:0},connection=new RoomConnection(args.url||'wss://apex25-eight.vercel.app/api/race-socket');p.connection=connection;peers.push(p);
 connection.onerror=()=>{if(!cleaning&&!connection.reconnecting)p.error=Error('Diagnostic socket failed');};connection.onresume=()=>p.resumes++;
 connection.onmessage=event=>{const m=JSON.parse(event.data);if(m.type==='error')p.error=Error(m.message);if(m.type==='welcome')p.id=m.id;if(m.type==='lobby')p.lobby=m;if(['start','state','motion'].includes(m.type)&&Number.isFinite(m.elapsed)){p.elapsed=m.elapsed;p.updates++;}};
 await until(()=>p.id);p.send=m=>connection.send(JSON.stringify(m));p.name=name;return p;
}
try{
 const host=await peer('Reconnect host');host.send({type:'create',name:host.name,trackId:'it-1922',mode:'practice',laps:3,aiCount:0,inputVersion:3,stateVersion:3});await until(()=>host.lobby);
 const guest=await peer('Reconnect guest');guest.send({type:'join',name:guest.name,code:host.lobby.code,inputVersion:3,stateVersion:3});await until(()=>host.lobby?.players.length===2);host.send({type:'start'});
 timer=setInterval(()=>{for(const p of peers)p.send({type:'ping',time:performance.now()});},1000);
 await until(()=>host.elapsed>.2&&guest.elapsed>.2);const before={id:host.id,elapsed:host.elapsed,updates:host.updates,at:performance.now()};host.connection.socket.terminate();
 await until(()=>host.resumes===1&&host.elapsed>before.elapsed+.15&&host.updates>before.updates+2);
 assert.equal(host.id,before.id);assert(host.lobby.players.some(p=>p.id===before.id));assert.equal(host.lobby.players.length,2);
 const report={description:'Two diagnostic clients from one computer against the actual room gateway; host transport deliberately interrupted and resumed. Does not simulate a prolonged weak connection.',driverPreserved:true,rosterCount:host.lobby.players.length,resumeEvents:host.resumes,sessionContinued:true,updatesAfterResume:host.updates-before.updates,recoveryMilliseconds:Math.round(performance.now()-before.at)};
 console.log(JSON.stringify(report,null,2));if(args.out)await writeFile(args.out,JSON.stringify(report,null,2)+'\n');
}finally{cleaning=true;clearInterval(timer);for(const p of peers){if(p.connection.readyState===WebSocket.OPEN)p.send({type:'leave'});p.connection.forgetRoom();p.connection.socket.close();}}
