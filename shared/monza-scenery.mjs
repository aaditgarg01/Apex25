import {MONZA_PLACEMENT} from './monza-placement-data.mjs';
import {MONZA_ACCESS} from './monza-access.mjs';
import {monzaFootbridge} from './monza-structures.mjs';
import {sample,terrainHeight} from './tracks.mjs';
import {pitLayout} from './pit-layout.mjs';
import {monzaBoundaries,monzaAccessCorridors,MONZA_CORNERS} from './monza.mjs';
import {monzaBankingPlan} from './monza-banking.mjs';
import {interlagosPlanner,interlagosEnvelopeOverlap,interlagosContains,localInterlagos} from './interlagos-scenery.mjs';
const cache=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function monzaConstrainGround(track,x,z,y,cell=20){const rows=monzaBoundaries(track),pad=Math.SQRT2*cell+track.step;for(let i=0;i<track.points.length;i+=2){const p=track.points[i],dx=x-p.x,dz=z-p.z,along=dx*Math.sin(p.heading)+dz*Math.cos(p.heading),across=dx*Math.cos(p.heading)-dz*Math.sin(p.heading);if(Math.abs(along)<pad&&across>-rows[-1][i].offset-pad&&across<rows[1][i].offset+pad)y=Math.min(y,p.y-.85);}return y;}
export function monzaTerrainHeight(track,x,z,cell=20){return monzaConstrainGround(track,x,z,terrainHeight(track,x,z)-.85,cell);}
function nearest(track,x,z){let distance=Infinity,index=0;track.points.forEach((candidate,i)=>{const d=(candidate.x-x)**2+(candidate.z-z)**2;if(d<distance){distance=d;index=i;}});const p=track.points[index],offset=(x-p.x)*Math.cos(p.heading)-(z-p.z)*Math.sin(p.heading);return {s:index*track.step,offset:Math.abs(offset),side:Math.sign(offset)||1,road:p};}
// Bump this revision when placement rules or model envelope dimensions change.
export function monzaPlacementSignature(track,data){let hash=2166136261;const text=JSON.stringify([1,track.width,track.length,track.origin,track.points.map(p=>[p.x,p.y,p.z,p.heading]),MONZA_CORNERS,MONZA_ACCESS,data.features,data.woods,data.parking]);for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);return (hash>>>0).toString(16);}
export function planMonza(track,data){
 if(cache.has(track))return cache.get(track);
 if(MONZA_PLACEMENT?.signature===monzaPlacementSignature(track,data)){
  const sites=MONZA_PLACEMENT.sites.map(site=>({...site})),cachedPit=pitLayout(track),cachedMapped=sites.filter(site=>MONZA_PLACEMENT.mappedIds.includes(site.id)),cachedResult={sites,foundations:sites.filter(site=>MONZA_PLACEMENT.foundationIds.includes(site.id)),pit:cachedPit,pitBuilding:sites.find(site=>site.kind==='pits'),mapped:cachedMapped,trees:sites.filter(site=>site.kind==='tree'),banking:monzaBankingPlan(track),bridge:monzaFootbridge(track),optionalSkipped:MONZA_PLACEMENT.optionalSkipped,rejected:MONZA_PLACEMENT.rejected,access:monzaAccessCorridors(track),cachedPlacement:true};cache.set(track,cachedResult);return cachedResult;
 }
 const planner=interlagosPlanner(track),pit=pitLayout(track),banking=monzaBankingPlan(track),bridge=monzaFootbridge(track),mapped=[],optionalSkipped=[],nativeReserve=planner.reserve;
 planner.reserve=spec=>(bridge?[...banking.patches,bridge]:banking.patches).some(b=>interlagosEnvelopeOverlap(spec,b,2))?null:nativeReserve(spec);
 // roadside must route through the bank-aware reserve as well.
 if(bridge)for(const pier of bridge.piers){const site=nativeReserve(pier);if(!site)planner.rejected.push(pier.id);}
 planner.roadside=spec=>{const road=sample(track,spec.s),heading=spec.heading??road.heading,side=spec.side||1;for(let offset=spec.offset??track.width/2+spec.w/2+12;offset<480;offset+=7){const p=sample(track,spec.s,side*offset),placed=planner.reserve({...spec,...p,heading});if(placed)return placed;}optionalSkipped.push(spec.id);return null;};
 function mappedSite(feature,kind){const e=feature.envelope,near=nearest(track,e.x,e.z),isPit=kind==='pits',base={...e,id:'osm-'+feature.way,kind,w:isPit?e.w+4:Math.max(18,e.w+4),d:e.d+4,heading:isPit?pit.frame.heading:Math.cos(e.heading-near.road.heading)<0?e.heading+Math.PI:e.heading,side:isPit?pit.side:near.side,s:near.s,sourceWay:feature.way,label:kind==='stand'?'MONZA · GRANDSTAND':'PARK HOSPITALITY',rows:Math.max(10,Math.min(26,Math.floor((Math.max(18,e.w)-6)/.7))),roof:e.d>65,margin:isPit?2:4};let site=null;
  search:for(const scale of [1,.94,.85,.74])for(const shift of [0,5,10,16,24,36,50,68])for(const along of [0,-8,8,-20,20]){const h=near.road.heading;site=planner.reserve({...base,w:base.w*scale,d:base.d*scale,x:e.x+Math.cos(h)*near.side*shift+Math.sin(h)*along,z:e.z-Math.sin(h)*near.side*shift+Math.cos(h)*along,approximateShift:Math.hypot(shift,along),approximateScale:scale});if(site)break search;}
  if(!site)optionalSkipped.push(base.id);else mapped.push(site);return site;
 }
 const pitBuilding=mappedSite(data.features.find(f=>f.way==='34404652'),'pits');if(!pitBuilding)planner.rejected.push('pit-building');
 for(const feature of data.features.filter(f=>f.tags.building==='grandstand'))mappedSite(feature,'stand');
 for(const id of ['194458105','193647797','193647798','194458108']){const f=data.features.find(p=>p.way===id);if(f)mappedSite(f,id==='194458108'?'medical':'hospitality');}
 for(const [i,s,side]of [[0,690,1],[1,1850,-1],[2,2240,1],[3,2580,1],[4,3750,1],[5,5220,1]])planner.roadside({id:'viewing-bank-'+i,kind:'bank',s,side,w:26,d:95,rows:12,margin:10,approximate:true});
 for(const [i,s]of [300,2650].entries())planner.roadside({id:'camp-'+i,kind:'camp',s,side:i?1:-1,w:90,d:115,offset:190,margin:15,approximate:true});
 for(const [i,s]of [300,4700].entries())planner.roadside({id:'parking-'+i,kind:'parking',s,side:-1,w:90,d:100,offset:170,margin:12,approximate:true});
 for(const [i,feature]of data.parking.entries()){if(i>35||planner.sites.filter(p=>p.kind==='parking').length>=2)break;const points=feature.points.map(p=>localInterlagos(track,p)),x=points.reduce((sum,p)=>sum+p.x/points.length,0),z=points.reduce((sum,p)=>sum+p.z/points.length,0),near=nearest(track,x,z);for(const shift of [0,12,-12,24,-24]){if(planner.reserve({id:'mapped-parking-'+i,kind:'parking',x:x+shift,z,w:44,d:64,heading:near.road.heading,margin:5,sourceWay:feature.way,approximate:true}))break;}}
 planner.roadside({id:'control-tower',kind:'tower',s:200,side:pit.side,w:24,d:26,margin:10,approximate:true});
 for(let i=0;i<17;i++)planner.roadside({id:'official-'+i,kind:'official',s:100+i*track.length/17,side:i%2?1:-1,w:i%4===0?22:10,d:18,margin:8,crane:i%4===0});
 for(const corner of MONZA_CORNERS){planner.roadside({id:'turn-'+corner.turn,kind:'board',s:corner.s-20,side:corner.side,w:2,d:1.3,margin:2,label:'T'+corner.turn});if([1,4,6,7,8,11].includes(corner.turn))for(const distance of [150,100,50])planner.roadside({id:'braking-'+corner.turn+'-'+distance,kind:'board',s:corner.s-distance,side:corner.side,w:2,d:1.3,margin:2,label:String(distance)});}
 for(let i=0;i<20;i++)planner.roadside({id:'banner-'+i,kind:'banner',s:150+i*track.length/20,side:i%2?1:-1,w:1.3,d:18,margin:4,label:['APEX VELOCITA','ROYAL PARK RACING','MONZA · MOTORSPORT','ITALIA · CORSE'][i%4]});
 for(let i=0;i<55;i++)planner.roadside({id:'grass-'+i,kind:'grasspatch',s:i*track.length/55,side:i%2?1:-1,w:7,d:12,offset:50+i%4*18,margin:7});
 for(const [i,feature]of data.houses.entries()){const site=planner.reserve({...feature.envelope,id:'town-'+i,kind:'house',height:5+i%3*2,margin:5,sourceWay:feature.way});if(site)site.y=monzaTerrainHeight(track,site.x,site.z);}
 const woods=data.woods.map(f=>({outline:f.points.map(p=>localInterlagos(track,p)),holes:(f.holes||[]).map(h=>h.map(p=>localInterlagos(track,p)))})),trees=[];
 // Complete crowns use the same reservations as architecture. Near crowns are
 // detailed alpha-leaf instances, distant crowns simpler clustered geometry.
 for(let i=0;i<60000&&trees.length<2800;i++){
  const x=(i*.61803398875%1-.5)*2850,z=(i*.41421356237%1-.5)*3350;
  if(!woods.some(poly=>interlagosContains(poly.outline,x,z)&&!poly.holes.some(h=>interlagosContains(h,x,z))))continue;
  const scale=.9+i%7*.09,site=planner.reserve({id:'tree-'+i,kind:'tree',x,z,w:12*scale,d:12*scale,scale,heading:i*1.7,margin:4,type:i%11===0?'pine':'broadleaf'});if(site){site.y=monzaTerrainHeight(track,x,z);trees.push(site);}
 }
 for(const site of planner.sites)if(!['board','banner','bridge-pier'].includes(site.kind))site.y=monzaTerrainHeight(track,site.x,site.z)+(['pits','stand','hospitality','official','medical','tower'].includes(site.kind)?.7:0);
 const foundations=planner.sites.filter(site=>['pits','stand','bank','parking','camp','hospitality','medical','official','tower'].includes(site.kind));
 const result={...planner,foundations,pit,pitBuilding,mapped,trees,banking,bridge,optionalSkipped,access:monzaAccessCorridors(track)};cache.set(track,result);return result;
}
