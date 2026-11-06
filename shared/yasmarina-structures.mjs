import {YASMARINA_HOTEL} from './yasmarina-landmark-data.mjs';
import {pitLayout,pitRoadPose} from './pit-layout.mjs';
import {yasmarinaTerrainHeight,yasmarinaWallClear} from './yasmarina.mjs';
import {interlagosFootprintClear,interlagosEnvelopeOverlap} from './interlagos-scenery.mjs';
const cache=new WeakMap();
export function yasmarinaStructures(track){
 if(cache.has(track))return cache.get(track);const sites=[],solids=[],hotels=[];
 const elevated=[];
 for(const feature of YASMARINA_HOTEL){const env=feature.envelope,deckY=Math.max(...track.points.filter(p=>Math.hypot(p.x-env.x,p.z-env.z)<120).map(p=>p.y))+12,site={...env,id:'hotel-'+feature.way,kind:'hotel',w:env.w+5,d:env.d+5,y:deckY,height:feature.height-12,sourceWay:feature.way,approximate:true,overhead:true};
  const c=Math.cos(env.heading),sn=Math.sin(env.heading),candidates=[];for(let z=-env.d*.42;z<=env.d*.42;z+=6)for(let x=-env.w*.4;x<=env.w*.4;x+=4){const spec={id:site.id+'-pier-'+candidates.length,kind:'hotel-pier',x:env.x+c*x+sn*z,z:env.z-sn*x+c*z,w:2.2,d:2.2,heading:env.heading,margin:1.5};if(interlagosFootprintClear(track,spec,1.5)&&!sites.some(other=>interlagosEnvelopeOverlap(other,spec,2)))candidates.push(spec);}
  for(const pier of candidates.filter((p,i)=>i%Math.max(1,Math.floor(candidates.length/4))===0).slice(0,4)){pier.y=yasmarinaTerrainHeight(track,pier.x,pier.z);sites.push(pier);solids.push({a:{x:pier.x-Math.sin(pier.heading)*.9,z:pier.z-Math.cos(pier.heading)*.9,y:pier.y},b:{x:pier.x+Math.sin(pier.heading)*.9,z:pier.z+Math.cos(pier.heading)*.9,y:pier.y},width:1.8,height:deckY-pier.y,kind:'hotel-podium'});}
  // Upper hotel wings are volume-checked above every road, including the
  // mapped access passages. Their supports alone occupy ground footprints.
  hotels.push(site);elevated.push(site);
 }
 let bridge=null;if(hotels.length===2){const a=hotels[0],b=hotels[1],heading=Math.atan2(b.x-a.x,b.z-a.z),length=Math.hypot(b.x-a.x,b.z-a.z),x=(a.x+b.x)/2,z=(a.z+b.z)/2,deckY=Math.max(...track.points.filter(p=>Math.hypot(p.x-x,p.z-z)<length/2+30).map(p=>p.y))+18;
  bridge={x,z,heading,length,width:12,deckY,minimumClearance:18,approximate:true};solids.push({a:{x:a.x,z:a.z,y:deckY},b:{x:b.x,z:b.z,y:deckY},width:12,height:5,kind:'hotel-link'});
 }
 // A short covered approach on the existing straight pit body. No road dip,
 // rerouting, limiter or timing changes: the real under-T1 exit is not simulated.
 const pit=pitLayout(track);let portal=null;
 for(let start=pit.length-pit.taper-55;start>pit.taper+10&&!portal;start-=5){const end=start+12,columns=[],roofY=Math.max(...track.points.map(p=>p.y))+10;let maximumOffset=0;
  for(const distance of [start,end])for(const side of [-1,1]){for(const offset of [4.15,4.8,5.5,6.5,8,10,12]){const a=pitRoadPose(track,distance-.35,side*offset),b=pitRoadPose(track,distance+.35,side*offset);if(yasmarinaWallClear(track,a,b,.4)){columns.push({a,b,width:.4,height:roofY-Math.min(a.y,b.y),kind:'pit-portal-wall'});maximumOffset=Math.max(maximumOffset,offset);break;}}}
  if(columns.length===4){solids.push(...columns);const a=pitRoadPose(track,start-.8),b=pitRoadPose(track,end+.8);solids.push({a:{...a,y:roofY},b:{...b,y:roofY},width:maximumOffset*2+.7,height:.6,kind:'pit-portal-roof'});portal={start,end,roofY,maximumOffset,approximate:true};}
 }
 const result={sites,solids,hotels,elevated,bridges:[],bridge,portal};cache.set(track,result);return result;
}
