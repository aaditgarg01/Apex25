import {enterRaceCode} from '../shared/race-options.mjs';
import {validTyreChoice,normalizeTyreChoice,chooseStartingTyres,choosePitTyres} from '../shared/tyres.mjs';
import {requestPit} from '../shared/pits.mjs';
import {parseRoomCode,updatedRoomSettings} from '../shared/rooms.mjs';
import {normalizeLiveryIndex} from '../shared/liveries.mjs';
import {normalizeConditions} from '../shared/conditions.mjs';
import {resolveCarContacts} from '../shared/collisions.mjs';
import {encodeState,encodeMotion} from '../shared/netcode.mjs';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {WebSocketServer,WebSocket} from 'ws';
import {makeTracks} from '../shared/tracks.mjs';
import {InputStream,INPUT_VERSION,LiveInputStream,LIVE_INPUT_VERSION} from '../shared/input-stream.mjs';
import {stepCar,resetCar,retireCar} from '../shared/physics.mjs';
import {createSession,stepSession,endSession,advanceToRace,SESSION_MODES,normalizeLapCount,canJoinQualifying,addQualifyingDriver} from '../shared/session.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const [circuitData,elevationData]=await Promise.all([
 readFile(path.join(root,'public/data/circuits.geojson'),'utf8'),
 readFile(path.join(root,'public/data/elevations.json'),'utf8'),
]);
const tracks=makeTracks(JSON.parse(circuitData),JSON.parse(elevationData));
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
export const raceVersion=pkg.version;
export const raceFeatures={
 roomSettings:true,qualifyingJoin:true,preciseContacts:true,liveInput:true,compactMotion:true,
 pitStops:true,tyreSelection:true,externalPits:true,dynamicWeather:true,
};

export function createRaceEngine({server,canStep=()=>true,changed=()=>{}}={}){
const wss=server?new WebSocketServer({server,maxPayload:2048}):null;
const rooms=new Map(),clients=new Map(),peers=new Map();
const send=(ws,data)=>{if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<250000)ws.send(JSON.stringify(data));};
function broadcast(room,data){for(const p of room.players.values())send(p.ws,data);}
function inputStreamFor(player,car){return player?.inputVersion===LIVE_INPUT_VERSION?new LiveInputStream(car):player?.inputVersion===INPUT_VERSION?new InputStream(car):null;}
function prepareInputs(room){room.streams=new Map();for(const car of room.cars){const stream=inputStreamFor(room.players.get(car.id),car);if(stream)room.streams.set(car.id,stream);}}
function lobby(room){broadcast(room,{type:'lobby',code:room.code,host:room.host,trackId:room.track.id,laps:room.laps,mode:room.mode,conditions:room.conditions,aiCount:room.aiCount,gridOrder:room.gridOrder||[],practiceStart:room.practiceStart,joinable:room.players.size<8&&(room.state==='lobby'||canJoinQualifying(room.session)),players:[...room.players.values()].map(p=>({id:p.id,name:p.name,colorId:p.colorId,startTyre:p.startTyre})),state:room.state});}
function leave(ws){const c=clients.get(ws);if(!c?.room)return;const r=rooms.get(c.room);c.room=null;if(!r)return;r.players.delete(c.id);if(r.cars){r.streams?.delete(c.id);delete r.inputs[c.id];const car=r.cars.find(p=>p.id===c.id);if(car){car.inputLag=0;car.ai=true;car.name+=' · AI';}}if(!r.players.size)rooms.delete(r.code);else{if(r.host===c.id)r.host=r.players.keys().next().value;lobby(r);}}
function attachPeer(ws,{id=randomBytes(6).toString('hex'),key=null,resume=false}={}){
 const previous=resume?peers.get(id):null;
 if(resume&&(!previous?.room||!key||!previous.key||!timingSafeEqual(Buffer.from(key,'hex'),Buffer.from(previous.key,'hex')))){
  send(ws,{type:'resume-failed',message:'That room is no longer available.'});return false;
 }
 if(!resume&&(clients.size>=80||peers.has(id))){ws.close(1013,'Server full');return false;}
 const c=previous||{id,key,room:null,lastInput:0,requests:0,window:Date.now()};
 if(previous){clients.delete(c.ws);c.ws.close(4001,'Reconnected elsewhere');}
 c.ws=ws;c.lastSeen=Date.now();
 clients.set(ws,c);peers.set(id,c);
 ws._socket?.setNoDelay(true);
 if(!key)send(ws,{type:'welcome',id});
 ws.isAlive=true;ws.on('pong',()=>ws.isAlive=true);
 ws.on('message',raw=>{try{const m=JSON.parse(raw),c=clients.get(ws),now=Date.now();if(!c)return;c.lastSeen=now;if(now-c.window>1000){c.window=now;c.requests=0;}if(++c.requests>100)return;
 const error=message=>send(ws,{type:'error',message});
 if(m.type==='create'||m.type==='join'){
 if(c.room)return error('Leave your current room first.');
 const name=String(m.name||'Driver').replace(/[<>\x00-\x1f]/g,'').slice(0,18).trim()||'Driver';let r;
 if(m.type==='create'){if(rooms.size>=12)return error('All rooms are busy. Please try later.');let code;do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms.has(code));r={code,host:id,track:tracks.find(t=>t.id===m.trackId)||tracks[15],laps:normalizeLapCount(m.laps),mode:SESSION_MODES.includes(m.mode)?m.mode:'weekend',conditions:normalizeConditions(m.conditions),practiceStart:['start','sector2','sector3','eau-rouge','mexico-stadium'].includes(m.practiceStart)?m.practiceStart:'start',aiCount:Math.min(7,Math.max(0,Math.floor(Number(m.aiCount)||0))),players:new Map(),state:'lobby'};rooms.set(code,r);}else{r=rooms.get(parseRoomCode(m.code));if(!r)return error('Room not found. Check the six-character code.');if(r.state!=='lobby'&&!canJoinQualifying(r.session))return error('Join while qualifying is running, or wait for the host to return to the lobby.');if(r.players.size>=8)return error('This room is full.');}
 const player={id,name,startTyre:normalizeTyreChoice(m.startTyre),inputVersion:m.inputVersion===LIVE_INPUT_VERSION?LIVE_INPUT_VERSION:m.inputVersion===INPUT_VERSION?INPUT_VERSION:1,stateVersion:m.stateVersion===3?3:m.stateVersion===2?2:1,colorId:normalizeLiveryIndex(m.colorId,r.players.size),ws};
 let added=null;if(r.state==='racing'){added=addQualifyingDriver(r.session,r.track,player);if(!added)return error('Qualifying has closed to new drivers.');}
 c.room=r.code;c.lastInput=now;r.players.set(id,player);r.aiCount=Math.min(r.aiCount,8-r.players.size);
 if(added){if(added.replacedId){r.streams?.delete(added.replacedId);delete r.inputs[added.replacedId];}const stream=inputStreamFor(player,added.car);if(stream){stream.reset(added.car,Math.max(0,r.session.elapsed));r.streams.set(id,stream);}r.historySignature=null;}
 lobby(r);changed();if(added){send(ws,{type:'start',trackId:r.track.id,...r.session});for(const other of r.players.values())if(other.id!==id)send(other.ws,{type:'driver-joined',name});}
 }else if(m.type==='leave'){leave(ws);changed();}
 else if(m.type==='ping')send(ws,{type:'pong',time:m.time});
 else{const r=rooms.get(c.room);if(!r)return;
 if(m.type==='settings'){if(r.host!==id)return error('Only the host can change room settings.');if(r.state!=='lobby')return error('Return to the lobby before changing settings.');try{Object.assign(r,updatedRoomSettings(r,m,tracks));lobby(r);changed();}catch(e){error(e.message);}return;}
 if(m.type==='tyre-choice'){const player=r.players.get(id),car=r.cars?.find(p=>p.id===id);if(m.starting!==undefined){if(!validTyreChoice(m.starting))return error('Choose valid starting tyres.');if(r.state==='racing'&&(!car||!chooseStartingTyres(r.session,car,m.starting)))return error('Starting tyres are locked once the session begins.');player.startTyre=m.starting;}if(m.pit!==undefined&&(!car||!choosePitTyres(car,m.pit)))return error('Choose an available set before service: each dry compound has two sets per race, including the starting set.');if(r.state==='lobby')lobby(r);changed();return;}
 if(m.type==='start'&&r.host===id&&r.state==='lobby'){const aiNames=['NOVA','REEVES','SILVA','KIM','ROSSI','MARTIN','BLAKE'];const aiDrivers=r.mode==='practice'?[]:aiNames.slice(0,Math.min(r.aiCount,8-r.players.size)).map((name,i)=>({id:'ai'+i,name,ai:true}));r.session=createSession(r.track,[...r.players.values(),...aiDrivers],{mode:r.mode,laps:r.laps,practiceStart:r.practiceStart,conditions:r.conditions,gridOrder:r.gridOrder});r.cars=r.session.cars;r.inputs={};prepareInputs(r);r.state='racing';broadcast(r,{type:'start',trackId:r.track.id,...r.session});changed();}
 if(m.type==='countdown-key'&&r.state==='racing'){const car=r.cars.find(driver=>driver.id===id);if(enterRaceCode(r.session,car,m.key)){send(ws,{type:'race-code',active:true});changed();}return;}
 if(m.type==='commands'&&r.state==='racing'){const car=r.cars.find(p=>p.id===id),stream=r.streams?.get(id);if(car&&!car.finished&&stream&&stream.accept(car,m.epoch,m.commands,r.session.elapsed))c.lastInput=now;}
 if(m.type==='input'&&r.state==='racing'&&!r.streams?.has(id)){r.inputs[id]={throttle:!!m.throttle,brake:!!m.brake,boost:!!m.boost,park:!!m.park,steer:Number.isFinite(m.steer)?Math.max(-1,Math.min(1,m.steer)):0};c.lastInput=now;}
 if(m.type==='reset'&&r.state==='racing'){const car=r.cars.find(p=>p.id===id);if(r.session.phase==='qualifying')return error('Complete the lap and cross the line to start your next flying lap.');if(car&&!car.finished&&car.resetTimer<=0&&r.session.elapsed>=0&&['race','practice'].includes(r.session.phase)){if(resetCar(car,r.track,false,r.session.elapsed))r.streams?.get(id)?.reset(car,r.session.elapsed);}}
 if(m.type==='pit'&&r.state==='racing'){const car=r.cars.find(p=>p.id===id);if(r.session.elapsed<0||!['race','qualifying','practice'].includes(r.session.phase))return error('Pit stops are available during an active session.');if(!requestPit(car,m.compound))return error('Pit request unavailable: choose a remaining tyre set and wait until you leave the pit lane.');}
 if(m.type==='retire'&&r.state==='racing'){const car=r.cars.find(p=>p.id===id);if(car&&!car.finished&&r.session.phase==='race')retireCar(car);}
 if(m.type==='advance'&&r.host===id&&r.state==='racing'&&advanceToRace(r.session,r.track)){r.cars=r.session.cars;r.inputs={};prepareInputs(r);broadcast(r,{type:'start',trackId:r.track.id,...r.session});changed();}
 if(m.type==='end-session'&&r.host===id&&r.state==='racing')endSession(r.session);
 if(m.type==='rematch'&&r.host===id){r.state='lobby';r.cars=null;r.session=null;r.streams?.clear();r.inputs={};lobby(r);changed();}
 }
 }catch{send(ws,{type:'error',message:'Invalid request.'});}});
 ws.on('close',()=>{
  if(clients.get(ws)!==c)return;
  if(c.key&&c.room){c.lastSeen=Date.now();return;}
  leave(ws);clients.delete(ws);peers.delete(id);
 });
 ws.on('error',()=>{});
 if(resume){
  const room=rooms.get(c.room),player=room.players.get(id);
  player.ws=ws;
  const car=room.cars?.find(driver=>driver.id===id);
  if(car){room.inputs[id]={brake:true,park:true};room.streams?.get(id)?.reset(car,room.session.elapsed);}
  send(ws,{type:'resumed',id});
  lobby(room);
  if(room.state==='racing')send(ws,{type:'start',trackId:room.track.id,...room.session});
 }
 return true;
}
wss?.on('connection',ws=>attachPeer(ws));
function publishState(r,now){
 const signature=r.session.cars.map(c=>`${c.id}:${c.lapHistory.length}`).join('|');
 const history=signature!==r.historySignature||now-(r.historyAt||0)>2000;
 if(history){r.historySignature=signature;r.historyAt=now;}
 const complete=history||r.snapshotPhase!==r.session.phase||now-(r.snapshotAt||0)>=100;
 if(complete){r.snapshotPhase=r.session.phase;r.snapshotAt=now;}
 const legacy=[...r.players.values()].some(p=>p.stateVersion!==3);
 const data=complete||legacy?encodeState(r.session,history):null,motion=complete?null:encodeMotion(r.session);
 let full=history?data:null;
 for(const p of r.players.values()){
  // An unsent snapshot is obsolete once the next physics step completes.
  if(p.ws.readyState!==WebSocket.OPEN||p.ws.bufferedAmount!==0)continue;
  if(p.stateVersion===3)p.ws.send(complete?data:motion);
  else if(p.stateVersion===2)p.ws.send(data);
  else{full??=encodeState(r.session);p.ws.send(full);}
 }
}
let tick=0,last=performance.now(),accum=0;
const loop=setInterval(()=>{
 const now=performance.now();
 if(!canStep()){last=now;accum=0;return;}
 accum+=Math.min((now-last)/1000,.15);last=now;
 while(accum>=1/60){
  accum-=1/60;
  for(const r of rooms.values())if(r.state==='racing'&&r.session){
   for(const p of r.players.values()){const c=clients.get(p.ws);if(c&&Date.now()-c.lastInput>700)r.inputs[p.id]={brake:true,park:true};}
   stepSession(r.session,r.inputs,r.track,1/60,(car,input,track,dt,elapsed,laps)=>{
    const stream=!car.ai&&r.streams?.get(car.id);
    if(stream)stream.step(car,input,track,dt,elapsed,laps,stream instanceof InputStream?()=>{if(r.session.phase!=='qualifying')resolveCarContacts(r.cars,car.id,{time:car.physicsTime});}:undefined);
    else stepCar(car,input,track,dt,elapsed,laps);
   });
  }
  tick++;
 }
 if(tick>0){tick=0;for(const r of rooms.values())if(r.state==='racing')publishState(r,now);}
},1000/60);
const heartbeat=setInterval(()=>{
 for(const ws of wss?.clients||[]){if(!ws.isAlive)ws.terminate();else{ws.isAlive=false;ws.ping();}}
 for(const c of peers.values()){
  if(c.key&&Date.now()-c.lastSeen>30000){
   leave(c.ws);clients.delete(c.ws);peers.delete(c.id);c.ws.close(1012,'Connection expired');
  }
 }
},5000);

function checkpoint(){
 return [...rooms.values()].map(room=>{
  const {track,players,cars,streams,...state}=room;
  return {
   ...state,trackId:track.id,
   players:[...players.values()].map(({ws,...player})=>({
    ...player,key:clients.get(ws).key,lastSeen:clients.get(ws).lastSeen,
   })),
   streams:[...(streams||[])],
  };
 });
}

function restore(savedRooms){
 for(const saved of savedRooms){
  const {trackId,players,streams,...state}=saved;
  const track=tracks.find(candidate=>candidate.id===trackId);
  if(!track)continue;
  const room={...state,track,players:new Map(),streams:new Map(),cars:state.state==='racing'?state.session?.cars:null};
  for(const {key,lastSeen,...player} of players){
   const ws=new EventEmitter();
   ws.readyState=WebSocket.CLOSED;ws.close=()=>{};
   const c={id:player.id,key,ws,room:room.code,lastInput:0,lastSeen,requests:0,window:Date.now()};
   peers.set(c.id,c);clients.set(ws,c);
   room.players.set(player.id,{...player,ws});
  }
  for(const [id,state] of streams){
   const car=room.cars?.find(driver=>driver.id===id);
   if(!car)continue;
   const inputState={inputAck:car.inputAck,inputEpoch:car.inputEpoch,inputLag:car.inputLag,inputTime:car.inputTime};
   const stream=inputStreamFor(room.players.get(id),car);
   if(stream){Object.assign(car,inputState);Object.assign(stream,state);room.streams.set(id,stream);}
  }
  rooms.set(room.code,room);
 }
}

return {
 attachPeer,checkpoint,restore,
 touch(id){const c=peers.get(id);if(c)c.lastSeen=Date.now();},
 roomCount:()=>rooms.size,
 close(){clearInterval(loop);clearInterval(heartbeat);for(const ws of wss?.clients||[])ws.close();},
};
}
