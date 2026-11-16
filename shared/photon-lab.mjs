// A separate development app/version/room namespace. Never join normal APEX rooms.
export const PHOTON_LAB_APP_ID='079dde50-b0d5-4bd6-8aba-bd23156aa58e';
export const PHOTON_LAB_VERSION='apex25-network-lab-1';
export const PHOTON_LAB_EVENTS={request:40,reliable:41,motion:42};
export const PHOTON_LAB_TRACK='it-1922';
export const validLabCode=code=>/^[A-F0-9]{6}$/.test(code);
export const labRoomName=code=>{if(!validLabCode(code))throw Error('Enter the six-character test room code.');return 'apex25-lab-'+code;};
export async function connectLabPhoton(createClient,{appId=PHOTON_LAB_APP_ID,region='asia',name='Lab driver'}={}){
 if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(appId))throw Error('A valid Photon Realtime App ID is required.');
 if(!['asia','in','eu','us'].includes(region))throw Error('Choose a supported test region.');
 const client=await createClient({appId,appVersion:PHOTON_LAB_VERSION,protocol:'wss',regionSelection:'select',pingIntervalMs:1000,disconnectTimeoutMs:20000});
 let timer;
 try{
  const operation=(async()=>{
   const available=client.availableRegions(),connected=client.connect({username:name});
   connected.catch(()=>{});
   const regions=await available;
   if(!regions.some(r=>r.code===region))throw Error('This Photon app does not offer the selected region.');
   await client.selectRegion(region);await connected;
   client.setTrafficStatsEnabled(true);return client;
  })();
  return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Photon connection timed out. Check the app and region.')),30000);})]);
 }catch(error){client.dispose();throw error;}finally{clearTimeout(timer);}
}
