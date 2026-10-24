// Local/Node deployments use their own persistent server. Vercel provides an
// explicit public endpoint and capabilities through its small config function.
export async function multiplayerHosting(){
 const response=await fetch('/api/multiplayer-config',{cache:'no-store'});
 if(response.status===404)return {url:`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}`,roomSettings:true,qualifyingJoin:true,liveInput:true,compactMotion:true};
 if(!response.ok)throw Error('The multiplayer server is temporarily unavailable. Free Play is available.');
 const config=await response.json(),url=new URL(config.url);
 if(!['ws:','wss:'].includes(url.protocol)||(location.protocol==='https:'&&url.protocol!=='wss:'))throw Error('The multiplayer server address is invalid.');
 return {url:url.href,roomSettings:config.roomSettings===true,qualifyingJoin:config.qualifyingJoin===true,liveInput:config.liveInput===true,compactMotion:config.compactMotion===true,backendVersion:config.backendVersion};
}
