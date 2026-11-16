import {createRealtimeClient} from '../vendor/photon/index.js';
import {connectLabPhoton,PHOTON_LAB_EVENTS as EVENT,labRoomName} from '/shared/photon-lab.mjs';
let client,authorityWorker,hostNumber,statsTimer,creating=false,ended=false,started=false;
const emit=message=>postMessage({...message,at:performance.timeOrigin+performance.now()});
function packet(message,bytes=0){emit({type:'packet',packet:typeof message==='string'?JSON.parse(message):message,bytes});}
function publish(message,reliable=true,target){
 const text=typeof message==='string'?message:JSON.stringify(message),own=client.localPlayer.number;
 if(!target||target===own)packet(text,0);
 if(target===own)return;
 client.sendEvent(reliable?EVENT.reliable:EVENT.motion,text,{reliable,channel:0,...(target?{targetPlayers:[target]}:{receivers:'others'})});
}
function roster(){
 if(!client?.room||!hostNumber)return;
 authorityWorker?.postMessage({type:'players',players:client.room.players});
 if(creating)publish({type:'lobby',code:client.room.name.slice(-6),host:'p'+hostNumber,state:started?'racing':'lobby',players:client.room.players.filter(p=>!p.isInactive).map(p=>({id:'p'+p.number,name:p.name||'Driver '+p.number}))});
}
self.onmessage=async({data})=>{
 try{
  if(data.type==='open'){
   creating=data.action==='create';
   if(creating){
    emit({type:'status',message:'Preparing the same APEX track and physics…'});
    authorityWorker=new Worker('/network-lab/authority-worker.js',{type:'module'});
    await new Promise((resolve,reject)=>{
     authorityWorker.onerror=()=>reject(Error('The simulation worker could not start.'));
     authorityWorker.onmessage=({data})=>{
      if(data.type==='ready')resolve();
      if(data.type==='broadcast')publish(data.message,data.reliable,data.target);
      if(data.type==='error'){emit(data);reject(Error(data.message));}
     };
     authorityWorker.postMessage({type:'load'});
    });
   }
   emit({type:'status',message:'Connecting to Photon…'});client=await connectLabPhoton(createRealtimeClient,data);
   client.on('disconnected',({cause})=>{if(!ended)emit({type:'closed',message:'Photon disconnected: '+cause});});
   client.on('error',error=>emit({type:'error',message:error.message}));
   client.on('playerJoined',roster);client.on('playerLeft',roster);
   const room=creating?await client.createRoom(labRoomName(data.code),{maxPlayers:8,isVisible:false,isOpen:true,emptyRoomTtlMs:0,playerTtlMs:0}):await client.joinRoom(labRoomName(data.code));
   hostNumber=room.masterClientNumber;
   client.on('masterClientChanged',()=>{if(!ended){ended=true;authorityWorker?.terminate();emit({type:'closed',message:'The Photon browser host left. This prototype does not migrate hosts.'});setTimeout(()=>client.dispose(),0);}});
   packet({type:'welcome',id:'p'+client.localPlayer.number});
   emit({type:'role',role:creating?'browser-host':'guest',region:client.bestRegion});
   for(const code of [EVENT.reliable,EVENT.motion])client.onEvent(code,({senderNumber,data:text})=>{
    if(senderNumber!==hostNumber||typeof text!=='string'||text.length>200000)return;
    packet(text,new TextEncoder().encode(text).length);
   });
   client.onEvent(EVENT.request,({senderNumber,data:message})=>{
    if(!creating||!authorityWorker||typeof message!=='string'||message.length>2048)return;
    try{authorityWorker.postMessage({type:'request',number:senderNumber,message:JSON.parse(message)});}catch{}
   });

   roster();if(!creating)packet({type:'lobby',code:data.code,host:'p'+hostNumber,state:room.customProperties.started?'racing':'lobby',players:room.players.map(p=>({id:'p'+p.number,name:p.name}))});
   statsTimer=setInterval(()=>{if(!client.isDisposed)emit({type:'stats',ping:client.stats.roundTripTimeMs,photonBytesIn:client.stats.bytesIn,region:client.bestRegion});},1000);
  }else if(data.type==='send'&&client?.isInRoom){
   const message=data.message;
   if(creating&&message.type==='start'){if(client.room.playerCount<2)throw Error('Join with a second driver first.');client.room.setOpen(false);client.room.setProperties({started:true});started=true;authorityWorker.postMessage({type:'start'});}
   else if(creating)authorityWorker.postMessage({type:'request',number:client.localPlayer.number,message});
   else if(JSON.stringify(message).length<=2048)client.sendEvent(EVENT.request,JSON.stringify(message),{receivers:'masterClient',reliable:message.type!=='commands',channel:message.type==='commands'?1:0});
  }else if(data.type==='close'){
   ended=true;authorityWorker?.terminate();clearInterval(statsTimer);client?.dispose();close();
  }
 }catch(error){emit({type:'error',message:error.message});if(data.type==='open'){ended=true;authorityWorker?.terminate();clearInterval(statsTimer);client?.dispose();}}
};
