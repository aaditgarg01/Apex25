// Focused live diagnostic, separate from the game's test suite. Node 22+.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve as resolvePath} from 'node:path';
import {performance} from 'node:perf_hooks';
import {makeTracks,targetSpeed,nearest,angleDiff} from '../shared/tracks.mjs';
import {trackBarriers} from '../shared/barriers.mjs';
import {pitLayout} from '../shared/pits.mjs';
import {NetworkMotion,mergeMotionState} from '../shared/netcode.mjs';
import {NetworkLabMetrics} from '../shared/network-lab-metrics.mjs';
import {networkLabDrive} from '../shared/network-lab-drive.mjs';
import {connectLabPhoton,labRoomName,PHOTON_LAB_APP_ID,PHOTON_LAB_EVENTS as EVENT,PHOTON_LAB_TRACK} from '../shared/photon-lab.mjs';
import {PhotonLabAuthority} from '../shared/photon-lab-authority.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(arg=>arg.replace(/^--/,'').split('='))),transport=args.transport||'current',seconds=Math.max(10,Math.min(120,Number(args.seconds)||60)),region=args.region||'asia';
if(!['current','photon'].includes(transport))throw Error('Use --transport=current or --transport=photon');
const tracks=makeTracks(JSON.parse(await readFile(new URL('../public/data/circuits.geojson',import.meta.url))),JSON.parse(await readFile(new URL('../public/data/elevations.json',import.meta.url)))),track=tracks.find(t=>t.id===PHOTON_LAB_TRACK);
trackBarriers(track);pitLayout(track);for(let w=0;w<=20;w++)targetSpeed(track,0,'normal',w/20);
const localEndpoint=args.url&&['localhost','127.0.0.1','[::1]'].includes(new URL(args.url).hostname),currentRegion=localEndpoint?'localhost':'Singapore';
const peers=[],cleanup=[];let frameTimer,pingTimer,authorityTimer;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate,timeout=45000){const end=performance.now()+timeout;while(!predicate()){if(performance.now()>end)throw Error('The comparison did not become ready before its timeout.');await sleep(20);}}
function peer(role){
 const p={id:null,role,metrics:new NetworkLabMetrics(),state:null,motion:null,timingPackets:0,straight:{serverMaxLateral:0,renderMaxLateral:0,serverOfftrack:false,maxHeadingChange:0,maximumFrameMove:0},messages:[],send:()=>{},queued:null,lastAt:performance.now()};peers.push(p);return p;
}
function receive(p,message,bytes=0){
 const now=performance.now(),m=typeof message==='string'?JSON.parse(message):message;p.messages.push(m);if(p.messages.length>40)p.messages.shift();
 if(m.type==='motion'&&m.inputTiming?.some(row=>row.length===3&&Number.isFinite(row[2])))p.timingPackets++;
 if(m.type==='welcome')p.id=m.id;
 if(m.type==='error')throw Error(m.message);
 if(m.type==='pong'){if(transport==='current')p.metrics.ping(now-m.time);p.motion?.setPing(now-m.time);}
 if(m.type==='start'){const resumes=p.metrics.resumes;p.state=m;p.motion=new NetworkMotion(track,p.id,{liveInput:true});p.motion.receive(m,now);p.metrics.reset();p.metrics.resumes=resumes;p.wireStart=undefined;p.wireSocket=null;return;}
 if(!p.state||!['state','motion'].includes(m.type))return;
 const counted=p.metrics.start!==null;if(counted)p.metrics.received(bytes);
 if(m.elapsed<p.state.elapsed)return;
 const base=p.queued?.state||p.state,next=m.type==='state'?m:mergeMotionState(base,m);if(next===base)return;
 if(args.drive==='straight'&&next.elapsed>=0){const car=next.cars.find(c=>c.id===p.id);p.straight.serverMaxLateral=Math.max(p.straight.serverMaxLateral,Math.abs(Number.isFinite(car.lateral)?car.lateral:nearest(track,car.x,car.z,car.s).offset));p.straight.serverOfftrack||=car.offtrack;}
 p.motion.record(next,now);p.queued={state:next,at:now};p.metrics.packet(next,next.cars.find(c=>c.id===p.id),now,counted?0:bytes);if(p.metrics.start!==null&&p.wireStart===undefined&&p.connection?.socket?._socket){p.wireStart=p.connection.socket._socket.bytesRead;p.wireSocket=p.connection.socket;}
}
try{
 let host,guest;
 if(transport==='current'){
  const {default:WS}=await import('ws');globalThis.WebSocket=class extends WS{constructor(url){super(url,{family:4,handshakeTimeout:25000});}};
  const {RoomConnection}=await import('../public/room-connection.js');
  async function socketPeer(role){
   const p=peer(role),connection=new RoomConnection(args.url||'wss://apex25-eight.vercel.app/api/race-socket');p.connection=connection;
   connection.onmessage=event=>receive(p,event.data,new TextEncoder().encode(event.data).length);
   connection.onresume=()=>{p.metrics.resumes++;};connection.onerror=()=>{};p.send=message=>connection.send(JSON.stringify(message));
   cleanup.push(()=>{p.send({type:'leave'});connection.forgetRoom();connection.socket.close();});await until(()=>p.id);return p;
  }
  host=await socketPeer('server-client');host.send({type:'create',name:'Lab host',trackId:track.id,mode:'race',laps:3,aiCount:args.drive==='straight'?0:6,conditions:'normal',inputVersion:3,stateVersion:3});
  await until(()=>host.messages.some(m=>m.type==='lobby'));const lobby=host.messages.find(m=>m.type==='lobby');
  guest=await socketPeer('server-client');guest.send({type:'join',code:lobby.code,name:'Lab guest',inputVersion:3,stateVersion:3});
  await until(()=>host.messages.some(m=>m.type==='lobby'&&m.players.length===2));host.send({type:'start'});
 }else{
  const {createRealtimeClient}=await import('@photonengine/realtime-core');
  async function photonPeer(role){
   const p=peer(role),client=await connectLabPhoton(createRealtimeClient,{appId:args.appId||PHOTON_LAB_APP_ID,region,name:'Lab '+role});p.client=client;cleanup.push(()=>client.dispose());return p;
  }
  host=await photonPeer('browser-host-emulation');const code=Array.from(crypto.getRandomValues(new Uint8Array(3)),v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
  await host.client.createRoom(labRoomName(code),{maxPlayers:8,isVisible:false,emptyRoomTtlMs:0});host.id='p'+host.client.localPlayer.number;
  const joined=host.client.once('playerJoined',{timeoutMs:20000});guest=await photonPeer('guest');await guest.client.joinRoom(labRoomName(code));guest.id='p'+guest.client.localPlayer.number;await joined;
  const authority=new PhotonLabAuthority(track,(message,reliable,target)=>{
   const data=typeof message==='string'?message:JSON.stringify(message);
   if(!target||target===host.client.localPlayer.number)receive(host,data,0);
   if(target===host.client.localPlayer.number)return;
   host.client.sendEvent(reliable?EVENT.reliable:EVENT.motion,data,{reliable,channel:0,...(target?{targetPlayers:[target]}:{receivers:'others'})});
  });
  authority.setPlayers(host.client.room.players);
  host.client.onEvent(EVENT.request,({senderNumber,data})=>authority.receive(senderNumber,JSON.parse(data)));
  for(const eventCode of [EVENT.reliable,EVENT.motion])guest.client.onEvent(eventCode,({senderNumber,data})=>{if(senderNumber===host.client.localPlayer.number)receive(guest,data,new TextEncoder().encode(data).length);});
  host.send=message=>authority.receive(host.client.localPlayer.number,message);
  guest.send=message=>guest.client.sendEvent(EVENT.request,JSON.stringify(message),{receivers:'masterClient',reliable:message.type!=='commands',channel:message.type==='commands'?1:0});
  authority.start();authorityTimer=setInterval(()=>authority.tick(performance.now()),1000/60);
 }
 frameTimer=setInterval(()=>{
  const now=performance.now();for(const p of peers){const dt=Math.min(.1,(now-p.lastAt)/1000);p.lastAt=now;if(!p.motion)continue;
   if(p.queued){p.state=p.queued.state;p.motion.receive(p.state,now,p.queued.at);p.queued=null;}
   const control=args.drive==='straight'?{throttle:(p.motion.visual?.progress??0)<450,brake:(p.motion.visual?.progress??0)>=450,park:(p.motion.visual?.progress??0)>=450,steer:0,boost:false}:networkLabDrive(track,p.motion.visual||p.state.cars.find(c=>c.id===p.id),p.state.elapsed),cars=p.motion.frame(now,dt,control),car=cars.find(c=>c.id===p.id);p.metrics.rendered(car,now,dt);if(args.drive==='straight'){if(p.previousRendered)p.straight.maximumFrameMove=Math.max(p.straight.maximumFrameMove,Math.hypot(car.x-p.previousRendered.x,car.z-p.previousRendered.z));p.previousRendered={x:car.x,z:car.z};}if(args.drive==='straight'&&p.state.elapsed>=0){p.initialHeading??=car.heading;p.straight.renderMaxLateral=Math.max(p.straight.renderMaxLateral,Math.abs(nearest(track,car.x,car.z,car.s).offset));p.straight.maxHeadingChange=Math.max(p.straight.maxHeadingChange,Math.abs(angleDiff(car.heading,p.initialHeading)));}
   const message=p.motion.takeCommands(now);if(message){p.metrics.sent(message.commands.at(-1)[0],now);p.send(message);}
  }
 },1000/60);
 pingTimer=setInterval(()=>{for(const p of peers){p.send({type:'ping',time:performance.now()});if(p.client)p.metrics.ping(p.client.stats.roundTripTimeMs);}},1000);
 await until(()=>peers.every(p=>p.metrics.start!==null));await sleep(seconds*1000);
 if(args.drive==='straight'&&peers.some(p=>p.straight.serverOfftrack||p.straight.renderMaxLateral+1.24>track.width/2||p.straight.maxHeadingChange>.001||p.straight.maximumFrameMove>8))throw Error('Straight driving left the Monza ribbon: '+JSON.stringify(peers.map(p=>p.straight)));
 if(args.requireInputTiming==='true'&&peers.some(p=>p.timingPackets===0))throw Error('Live room did not provide acknowledged input timing');
 const now=performance.now(),report={schema:'apex25-network-lab-v1',transport,durationRequested:seconds,webSocketByteNotes:'Node socket receive bytes include WebSocket framing/control after TLS decryption; exclude TLS/TCP overhead. A resumed session starts a new measurement segment.',authority:transport==='photon'?'Node-hosted emulation of browser-worker prototype':(localEndpoint?'local Node APEX server':'current Vercel APEX server'),limitation:localEndpoint?'Both diagnostic clients and server ran on this machine. This checks integration, not internet latency.':'Both diagnostic clients ran on one machine. Photon simulation host is on that machine; current server is in Singapore. These are not equivalent hosting placements or a two-device weak-link trial.',runs:peers.map(p=>p.metrics.report(now,{transport,role:p.role,...(args.drive==='straight'?{straightDriving:p.straight}:{}),inputTimingPackets:p.timingPackets,webSocketReceivedKBps:p.wireSocket===p.connection?.socket&&Number.isFinite(p.wireStart)&&p.metrics.start!==null?Math.round((p.connection.socket._socket.bytesRead-p.wireStart)/(now-p.metrics.start)*1000/1024*100)/100:null,compressionNegotiated:!!p.connection?.socket?.extensions?.includes('permessage-deflate'),region:transport==='photon'?region:currentRegion,track:track.id,cars:p.state.cars.length,repeatableDrive:true,snapshotTargetHz:20,renderer:'headless 60 Hz presentation loop; no GPU rendering'}))};
 const json=JSON.stringify(report,null,2);if(args.out){const path=pathToFileURL(resolvePath(args.out));await mkdir(new URL('.',path),{recursive:true});await writeFile(path,json+'\n');}console.log(json);
}finally{clearInterval(frameTimer);clearInterval(pingTimer);clearInterval(authorityTimer);for(const close of cleanup.reverse())close();}
