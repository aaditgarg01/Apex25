import {sample} from './tracks.mjs';
import {pitLayout,pitRoadPose} from './pit-layout.mjs';
import {interlagosPlanner,interlagosEnvelopeOverlap} from './interlagos-scenery.mjs';
import {nearestLandmarkOffsets} from './landmark-placement.mjs';
import {LUSAIL_CORNERS,lusailTerrainHeight,lusailBoundaryOffset,lusailLawns,lusailAccessCorridors} from './lusail.mjs';
import {LUSAIL_LIGHTING} from './lusail-lighting-data.mjs';
import {lusailStructures} from './lusail-structures.mjs';
const cache=new WeakMap();

export function planLusail(track,data){
 if(cache.has(track))return cache.get(track);
 const base=interlagosPlanner(track),pit=pitLayout(track),structures=lusailStructures(track),optionalSkipped=[],mapped=[],beyond=[],trees=[],masts=[],foundations=[];
 const overhead=structures.bridges.map(span=>({x:(span.a.x+span.b.x)/2,z:(span.a.z+span.b.z)/2,w:span.width+2,d:span.length,heading:span.heading}));
 const low=['board','banner','beyond','lawn'];
 base.sites.push(...structures.sites,...lusailLawns(track));foundations.push(...lusailLawns(track));
 function reserve(spec){if(!low.includes(spec.kind)&&overhead.some(span=>interlagosEnvelopeOverlap(span,spec)))return null;const site=base.reserve({...spec,y:lusailTerrainHeight(track,spec.x,spec.z)+.12});if(site&&['pits','stand','bank','camp','parking','hospitality','media','medical','building','tower','lawn'].includes(site.kind))foundations.push(site);return site;}
 function roadside(spec){
  const p=sample(track,spec.s),station=((spec.s%track.length)+track.length)%track.length,i=Math.floor(station/track.step),offset=spec.offset??lusailBoundaryOffset(track,i,spec.side)+spec.w/2+4;
  for(let d=offset;d<(spec.maxOffset??220);d+=4){const q=sample(track,spec.s,spec.side*d),site=reserve({...spec,...q,heading:spec.heading??p.heading});if(site)return site;}return null;
 }
 function sideAt(spec){let best=Infinity,side=1;for(const p of track.points){const x=spec.x-p.x,z=spec.z-p.z,d=x*x+z*z;if(d<best){best=d;side=Math.sign(x*Math.cos(p.heading)-z*Math.sin(p.heading))||1;}}return side;}
 function fit(feature){
  const env=feature.envelope,isPit=feature.kind==='pits',isStand=feature.kind==='stand',side=isPit?pit.side:sideAt(env),heading=isPit?pit.frame.heading:env.heading;
  const source={id:'osm-'+feature.way,label:feature.label,kind:feature.kind,sourceWay:feature.way,side,heading,margin:isPit?2:3,rows:isStand?26:0,roof:isStand};
  // Use the mapped anchor; trim the rectangle to its buildable footprint
  // before considering a nearby fallback. No distant placement jumps.
  for(const delta of nearestLandmarkOffsets(isPit?54:42,6))for(const scale of [1,.9,.78,.65,.53]){
   const w=(isPit?Math.min(env.w,31):env.w)*scale,d=env.d*scale;if(w<(isPit?15:isStand?13:7))continue;
   const site=reserve({...source,w,d,x:env.x+delta.x,z:env.z+delta.z,approximateShift:delta.distance,approximateScale:scale});if(site){mapped.push(site);return site;}
  }
  if(isPit){const q=pitRoadPose(track,pit.box);for(const d of [370,300,245,190,150])for(const offset of [20,27,35,44,56]){const x=q.x+Math.cos(heading)*side*offset,z=q.z-Math.sin(heading)*side*offset,site=reserve({...source,w:22,d,x,z,approximateShift:Math.hypot(x-env.x,z-env.z),approximateScale:d/env.d});if(site){mapped.push(site);return site;}}}
  optionalSkipped.push(feature.way);return null;
 }
 const pitBuilding=fit(data.features.find(f=>f.kind==='pits')),mainStand=fit(data.features.find(f=>f.kind==='stand'));
 if(!mainStand)for(const [i,s] of [5125,5220,5320,5420].entries()){
  const spec={id:'main-stand-bay-'+i,kind:'stand',label:'MAIN GRANDSTAND',s,side:1,w:16,d:84,rows:24,roof:true,margin:3,maxOffset:150};
  let site;
  search:for(const d of [84,66,45,34])for(const shift of [0,20,-20,40,-40]){site=roadside({...spec,s:s+shift,d,w:d<46?13:16,rows:d<46?20:24});if(site)break search;}
  if(!site)optionalSkipped.push(spec.id);
 }
 for(const f of data.features.filter(p=>!['pits','stand'].includes(p.kind)))fit(f);
 for(const [id,label,s,side,w,d,rows] of [['north','NORTH GRANDSTAND',330,1,25,128,24],['turn2','TURN 2 GRANDSTAND',815,-1,24,128,24],['turn3','TURN 3 GRANDSTAND',1085,1,23,112,22],['turn16','TURN 16 GRANDSTAND',4695,1,25,141,25],['hill','DESERT VIEWING TERRACE',4500,-1,20,90,12]]){
  const spec={id,kind:id==='hill'?'bank':'stand',label,s,side,w,d,rows,roof:true,margin:3,maxOffset:125};let site;
  search:for(const scale of [1,.82,.68,.56])for(const shift of [0,35,-35,70,-70,105,-105]){site=roadside({...spec,s:s+shift,w:w*scale,d:d*scale,rows:Math.round(rows*scale),maxOffset:155});if(site)break search;}
  if(!site&&id==='turn16')for(const shift of [0,50,-50,100,-100,150,-150]){site=roadside({...spec,s:s+shift,side:-side,w:14,d:46,rows:16,maxOffset:175});if(site)break;}
  if(!site)optionalSkipped.push(id);
 }
 for(const f of data.parking.slice(0,4))fit(f);
 if(!base.sites.some(p=>p.kind==='parking'))roadside({id:'event-parking',kind:'parking',s:5100,side:1,w:72,d:114,margin:6,maxOffset:270});
 for(const spec of [{id:'control-tower',kind:'tower',s:95,side:-1,w:12,d:14,margin:4},{id:'medical',kind:'medical',s:5050,side:-1,w:19,d:22,margin:3},{id:'fan-zone',kind:'camp',s:4920,side:1,w:56,d:96,margin:5,maxOffset:270}]){let site=roadside(spec);if(!site)for(const shift of [75,-75,150,-150]){site=roadside({...spec,s:spec.s+shift,w:spec.kind==='camp'?45:spec.w,d:spec.kind==='camp'?68:spec.d});if(site)break;}if(!site)optionalSkipped.push(spec.id);}
 for(let i=0;i<24;i++){
  const s=(i+.4)*track.length/24,side=i%2?-1:1,site=roadside({id:'service-'+i,kind:'beyond',s,side,w:11,d:26,margin:2.5,gate:i%3===0});if(site)beyond.push(site);
  roadside({id:'marshal-'+i,kind:'official',s:s+31,side,w:i%4===0?22:11,d:19,margin:3,crane:i%4===0});
  if(i%2===0)roadside({id:'utility-'+i,kind:'utility',s:s+61,side:-side,w:10,d:16,margin:3});
  if(i%2===0)roadside({id:'board-wall-'+i,kind:'banner',s:s+25,side:-side,w:2.3,d:20,margin:2,label:['NIGHT CIRCUIT','DESERT SPEED','APEX · MOTORSPORT'][i%3]});
 }
 for(const c of LUSAIL_CORNERS){
  roadside({id:'corner-board-'+c.turn,kind:'board',s:c.s-18,side:c.side,w:1.6,d:2,margin:1.6,label:'T'+c.turn});
  if([1,4,6,7,10,15,16].includes(c.turn))for(const d of c.turn===1?[200,150,100,50]:[150,100,50])roadside({id:'brake-'+c.turn+'-'+d,kind:'board',s:c.s-d,side:c.side,w:1.6,d:2,margin:1.6,label:String(d)});
 }
 for(const [i,a] of LUSAIL_LIGHTING.masts.entries()){
  const spec={id:'mast-'+i,kind:'mast',s:a.s,side:a.side,w:11,d:11,height:a.height,margin:1.8,maxOffset:115},site=roadside(spec)||roadside({...spec,side:-a.side});if(site)masts.push(site);
 }
 const buildings=base.sites.filter(p=>['pits','hospitality','media','camp','lawn'].includes(p.kind));
 for(let i=0;i<1800&&trees.length<440;i++){
  const palm=i<65&&buildings.length,seed=buildings[i%Math.max(1,buildings.length)],p=palm?{x:seed.x+Math.sin(i*2.4)*(seed.w*.65+10+i%10*4),z:seed.z+Math.cos(i*2.4)*(seed.d*.55+8+i%8*4)}:sample(track,(i*.61803398875%1)*track.length,(i%2?-1:1)*(29+i%37*6));
  const scale=.65+i%5*.12,size=palm?10*scale:3.6*scale,spec={id:'plant-'+i,kind:'plant',...p,w:size,d:size,heading:i*.67,scale,type:palm?'palm':'scrub',margin:2.5},site=reserve(spec);if(site)trees.push(site);
 }
 // Utility silhouettes, not an unverified Lusail City skyline.
 for(let i=0;i<5;i++){const p=sample(track,1900+i*690,(i%2?-1:1)*(410+i*18));reserve({id:'desert-mast-'+i,kind:'horizon',...p,w:18,d:18,heading:0,utilityType:i%2,margin:5});}
 // Assert reserved pier positions did not get repurposed as optional scenery.
 for(const pier of structures.sites)if(base.sites.some(site=>site!==pier&&interlagosEnvelopeOverlap(site,pier)))throw new Error('Lusail support reservation lost');
 const plan={...base,access:lusailAccessCorridors(track),pit,pitBuilding,mapped,beyond,trees,masts,foundations,structures,optionalSkipped};cache.set(track,plan);return plan;
}
