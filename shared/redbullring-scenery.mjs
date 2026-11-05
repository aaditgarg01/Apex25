import {sample} from './tracks.mjs';
import {pitLayout} from './pit-layout.mjs';
import {redbullringTerrainHeight,redbullringAccessCorridors} from './redbullring.mjs';
export {redbullringTerrainHeight} from './redbullring.mjs';
import {interlagosPlanner,localInterlagos} from './interlagos-scenery.mjs';
const cache=new WeakMap();
function closestStation(track,x,z){let best=Infinity,index=0;track.points.forEach((candidate,i)=>{const distance=(candidate.x-x)**2+(candidate.z-z)**2;if(distance<best){best=distance;index=i;}});const roadPoint=track.points[index],offset=(x-roadPoint.x)*Math.cos(roadPoint.heading)-(z-roadPoint.z)*Math.sin(roadPoint.heading);return {s:index*track.step,side:Math.sign(offset)||1,offset:Math.abs(offset),road:roadPoint};}
export function planRedBullRing(track,data){
 if(cache.has(track))return cache.get(track);const planner=interlagosPlanner(track),pit=pitLayout(track),mapped=[],optionalSkipped=[];
 const nativeRoadside=planner.roadside;planner.roadside=spec=>{let site=nativeRoadside(spec);if(site)return site;planner.rejected.pop();site=nativeRoadside({...spec,w:spec.w*.75,d:spec.d*.75,side:-spec.side,approximateScale:.75});if(!site){planner.rejected.pop();optionalSkipped.push(spec.id);}return site;};
 function mappedSite(feature,kind){
  const envelope=feature.envelope,near=closestStation(track,envelope.x,envelope.z),isPits=kind==='pits',w=isPits?28:envelope.w+2,d=isPits?305:envelope.d+2,mappedHeading=isPits?pit.frame.heading:envelope.heading,heading=!isPits&&Math.cos(mappedHeading-near.road.heading)<0?mappedHeading+Math.PI:mappedHeading;
  const base={...envelope,id:'osm-'+feature.way,kind,w,d,heading,side:isPits?pit.side:near.side,s:near.s,sourceWay:feature.way,label:/Red Bull/.test(feature.tags.name||'')?'SPIELBERG GRANDSTAND':feature.tags.name||'SPIELBERG GARAGES',rows:Math.max(8,Math.min(22,Math.floor((w-6)/.8))),roof:!['Tribüne Nord','Tribüne Ost','Tribüne T10','Tribüne Mitte','Tribüne 13'].includes(feature.tags.name),margin:isPits?1:5};let site=null;
  search:for(const scale of (isPits?[1]:[1,.94,.86,.74,.62]))for(const shift of (isPits?[-12,-9,-15,-6,0,-18,-24]:Array.from({length:39},(_,i)=>i*6)))for(const along of (isPits?[12,6,18,0,-6,24]:[0,-12,12,-24,24,-48,48,-80,80])){const h=isPits?heading:near.road.heading,across=isPits?shift:near.side*shift;site=planner.reserve({...base,w:base.w*scale,d:base.d*scale,x:envelope.x+Math.cos(h)*across+Math.sin(h)*along,z:envelope.z-Math.sin(h)*across+Math.cos(h)*along,approximateShift:Math.hypot(shift,along),approximateScale:scale});if(site)break search;}
  if(!site&&kind==='stand'){site=planner.roadside({...base,w:12,d:48,rows:8,offset:near.offset,approximateScale:.4,approximateShift:true});}
  if(!site)planner.rejected.push(base.id);else mapped.push(site);return site;
 }
 const pitFeature=data.features.find(p=>p.way==='118364939'),pitBuilding=mappedSite(pitFeature,'pits');
 let bridge=null; // No unverified bridge or tunnel is added to the racing route.
 for(const feature of data.features.filter(p=>p!==pitFeature)){mappedSite(feature,feature.tags.building==='grandstand'?'stand':'hospitality');}
 for(const [i,s]of [260,1050,1390,2160,2780,3400].entries())planner.roadside({id:'viewing-bank-'+i,kind:'bank',s,side:i%2?1:-1,w:30,d:110,rows:11,margin:16});
 for(const [i,s]of [100,600,1780,3500].entries())planner.roadside({id:'hospitality-'+i,kind:'hospitality',s,side:-1,w:24,d:45,margin:15});
 for(const [i,s]of [800,1850,2850,3700].entries())planner.roadside({id:'camp-'+i,kind:'camp',s,side:1,w:120,d:150,offset:190,margin:22,approximate:true});
 for(const [i,s]of [200,1700,3200].entries())planner.roadside({id:'parking-'+i,kind:'parking',s,side:-1,w:110,d:140,offset:180,margin:22});
 planner.roadside({id:'control-tower',kind:'tower',s:50,side:pit.side,w:22,d:26,margin:14,approximate:true});
 for(let i=0;i<12;i++)planner.roadside({id:'official-'+i,kind:'official',s:100+i*track.length/12,side:i%2?1:-1,w:i%3===0?22:9,d:16,margin:12,crane:i%3===0});
 for(const corner of [330,1266,2070,3629])for(const distance of [150,100,50])planner.roadside({id:'distance-'+corner+'-'+distance,kind:'board',s:corner-distance,side:1,w:2,d:1.2,margin:3,label:String(distance)});
 for(let i=0;i<12;i++)planner.roadside({id:'banner-'+i,kind:'banner',s:160+i*track.length/12,side:i%2?1:-1,w:1.2,d:20,margin:8,label:['APEX ALPINE','SPIELBERG RACING','STYRIA MOTORSPORT','MOUNTAIN CIRCUIT'][i%4]});
 const trees=[];
 // Woodland blocks follow cached OSM woodland regions; individual tree spacing
 // and species are artistic. Every full crown is reserved independently.
 for(const [block,feature]of data.woods.entries()){const points=feature.points.map(p=>localInterlagos(track,p)),center=points.reduce((v,p)=>({x:v.x+p.x/points.length,z:v.z+p.z/points.length}),{x:0,z:0});if(Math.hypot(center.x,center.z)>2100)continue;for(let i=0;i<24;i++){const a=i*2.39996,r=8+Math.sqrt(i)*12,scale=.9+i%5*.1,x=center.x+Math.cos(a)*r,z=center.z+Math.sin(a)*r,site=planner.reserve({id:'woodland-'+block+'-'+i,kind:'tree',x,z,w:12*scale,d:12*scale,heading:a,scale,type:'broadleaf',margin:10});if(site){site.y=redbullringTerrainHeight(track,x,z);trees.push(site);}}if(trees.length>=500)break;}
 for(let i=0;i<3400;i++){const s=(i*.61803398875%1)*track.length,p=sample(track,s,(i%2?1:-1)*(45+i%37*5)),scale=.8+i%8*.09,site=planner.reserve({id:'tree-'+i,kind:'tree',...p,w:12*scale,d:12*scale,heading:i*1.4,scale,type:i%5===0?'pine':'broadleaf',margin:8});if(site){site.y=redbullringTerrainHeight(track,site.x,site.z);trees.push(site);}if(trees.length>=900)break;}
 // Extend the forested horizon only inside cached woodland polygons. The full
 // crown remains a normal road-clear reservation, just like foreground trees.
 const woodland=data.woods.map(feature=>feature.points.map(p=>localInterlagos(track,p))),inside=(poly,x,z)=>{let hit=false;for(let a=0,b=poly.length-1;a<poly.length;b=a++){const p=poly[a],q=poly[b];if((p.z>z)!==(q.z>z)&&x<(q.x-p.x)*(z-p.z)/(q.z-p.z)+p.x)hit=!hit;}return hit;};
 for(let i=0;i<7000&&trees.length<950;i++){const x=(i*.61803398875%1-.5)*3300,z=(i*.41421356237%1-.5)*3300;if(!woodland.some(poly=>inside(poly,x,z)))continue;const scale=.9+i%5*.12,site=planner.reserve({id:'ridge-tree-'+i,kind:'tree',x,z,w:12*scale,d:12*scale,heading:i*1.7,scale,type:'pine',margin:10});if(site){site.y=redbullringTerrainHeight(track,x,z);trees.push(site);}}
 for(let i=0;i<70;i++)planner.roadside({id:'grass-'+i,kind:'grasspatch',s:i*track.length/70,side:i%2?1:-1,w:9,d:18,offset:65+i%5*25,margin:12});
 for(const [i,feature]of data.houses.entries()){const site=planner.reserve({id:'farm-'+i,kind:'house',...feature.envelope,height:5+i%3,margin:8,sourceWay:feature.way});if(site)site.y=redbullringTerrainHeight(track,site.x,site.z);}
 for(const site of planner.sites)if(!['pits','board','banner','official'].includes(site.kind))site.y=redbullringTerrainHeight(track,site.x,site.z);
 const result={...planner,pit,pitBuilding,mapped,trees,bridge,optionalSkipped,access:redbullringAccessCorridors(track)};cache.set(track,result);return result;
}
