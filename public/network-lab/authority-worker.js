import {PhotonLabAuthority} from '/shared/photon-lab-authority.mjs';
import {PHOTON_LAB_TRACK} from '/shared/photon-lab.mjs';
import {makeTracks,targetSpeed} from '/shared/tracks.mjs';
import {trackBarriers} from '/shared/barriers.mjs';
import {pitLayout} from '/shared/pits.mjs';
let authority,timer;
self.onmessage=async({data})=>{
 try{
  if(data.type==='load'){
   const [geo,elev]=await Promise.all([fetch('/data/circuits.geojson').then(r=>r.json()),fetch('/data/elevations.json').then(r=>r.json())]);
   const track=makeTracks(geo,elev).find(t=>t.id===PHOTON_LAB_TRACK);
   trackBarriers(track);pitLayout(track);for(let w=0;w<=20;w++)targetSpeed(track,0,'normal',w/20);
   authority=new PhotonLabAuthority(track,(message,reliable,target)=>postMessage({type:'broadcast',message,reliable,target}));
   timer=setInterval(()=>{try{authority.tick(performance.now());}catch(error){clearInterval(timer);postMessage({type:'error',message:error.message});}},1000/60);
   postMessage({type:'ready'});
  }else if(data.type==='players')authority.setPlayers(data.players);
  else if(data.type==='start')authority.start();
  else if(data.type==='request')authority.receive(data.number,data.message);
 }catch(error){postMessage({type:'error',message:error.message});}
};
