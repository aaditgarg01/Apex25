const fallback='https://apex-25-production.up.railway.app';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 try{
  const origin=new URL(process.env.APEX_MULTIPLAYER_ORIGIN||fallback);if(origin.protocol!=='https:')throw Error('HTTPS origin required');
  const response=await fetch(new URL('/health',origin),{signal:AbortSignal.timeout(6000),cache:'no-store'});if(!response.ok)throw Error('Backend unavailable');const health=await response.json();if(health.game!=='apex-25'||!health.ok)throw Error('Invalid backend');
  const [major,minor]=String(health.version||'').split('.').map(Number),modern=major>2||(major===2&&minor>=24);origin.protocol='wss:';origin.pathname='/';origin.search='';origin.hash='';
  return res.status(200).json({url:origin.href,backendVersion:health.version,roomSettings:health.features?.roomSettings??modern,qualifyingJoin:health.features?.qualifyingJoin??modern,liveInput:health.features?.liveInput===true,compactMotion:health.features?.compactMotion===true,pitStops:health.features?.pitStops===true,tyreSelection:health.features?.tyreSelection===true,externalPits:health.features?.externalPits===true});
 }catch{return res.status(503).json({error:'Multiplayer temporarily unavailable'});}
}
