import pkg from '../package.json' with {type:'json'};
import {hasRoomStorage} from '../backend/room-storage.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 try{
  if(!process.env.APEX_MULTIPLAYER_ORIGIN){
   if(!hasRoomStorage())throw Error('Room storage unavailable');
   const host=req.headers.host;
   const local=/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
   const url=new URL('/api/race-socket',(local?'ws://':'wss://')+host);
   return res.status(200).json({
    url:url.href,backendVersion:pkg.version,resumable:true,roomSettings:true,
    qualifyingJoin:true,liveInput:true,compactMotion:true,pitStops:true,
    tyreSelection:true,externalPits:true,dynamicWeather:true,
   });
  }
  const origin=new URL(process.env.APEX_MULTIPLAYER_ORIGIN);if(origin.protocol!=='https:')throw Error('HTTPS origin required');
  const response=await fetch(new URL('/health',origin),{signal:AbortSignal.timeout(6000),cache:'no-store'});if(!response.ok)throw Error('Backend unavailable');const health=await response.json();if(health.game!=='apex-25'||!health.ok)throw Error('Invalid backend');
  const [major,minor]=String(health.version||'').split('.').map(Number),modern=major>2||(major===2&&minor>=24);origin.protocol='wss:';origin.pathname='/';origin.search='';origin.hash='';
  return res.status(200).json({url:origin.href,backendVersion:health.version,roomSettings:health.features?.roomSettings??modern,qualifyingJoin:health.features?.qualifyingJoin??modern,liveInput:health.features?.liveInput===true,compactMotion:health.features?.compactMotion===true,pitStops:health.features?.pitStops===true,tyreSelection:health.features?.tyreSelection===true,externalPits:health.features?.externalPits===true,dynamicWeather:health.features?.dynamicWeather===true});
 }catch{return res.status(503).json({error:'Multiplayer temporarily unavailable'});}
}
