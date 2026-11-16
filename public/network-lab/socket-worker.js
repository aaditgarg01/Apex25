import {RoomConnection} from '../room-connection.js';
import {multiplayerHosting} from '../hosting.js';
let connection,settings;
const emit=(message)=>postMessage({...message,at:performance.timeOrigin+performance.now()});
self.onmessage=async({data})=>{
 try{
  if(data.type==='open'){
   settings=data;const config=await multiplayerHosting();emit({type:'role',role:'server-client',region:['localhost','127.0.0.1'].includes(new URL(config.url).hostname)?'local Node server':'Vercel · configured Singapore'});connection=new RoomConnection(config.url);
   connection.onmessage=event=>{const packet=JSON.parse(event.data);emit({type:'packet',packet,bytes:new TextEncoder().encode(event.data).length});
    if(packet.type==='welcome')connection.send(JSON.stringify({type:settings.action,name:'Lab driver',trackId:'it-1922',mode:'race',laps:3,aiCount:6,conditions:'normal',inputVersion:3,stateVersion:3,code:settings.code}));
   };
   connection.onerror=()=>emit({type:'error',message:'The current APEX server could not connect.'});
   connection.onclose=()=>emit({type:'closed',message:'Connection closed.'});
   connection.onreconnecting=()=>emit({type:'status',message:'Reconnecting to the current server…'});
   connection.onresume=()=>emit({type:'resumed'});
  }else if(data.type==='send')connection?.send(JSON.stringify(data.message));
  else if(data.type==='close'){connection?.send(JSON.stringify({type:'leave'}));connection?.forgetRoom();connection?.socket.close();close();}
 }catch(error){emit({type:'error',message:error.message});}
};
