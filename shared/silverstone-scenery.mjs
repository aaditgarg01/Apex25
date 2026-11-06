import {nearestLandmarkOffsets} from './landmark-placement.mjs';
import {sample,terrainHeight} from './tracks.mjs';
import {pitLayout} from './pit-layout.mjs';
import {silverstoneBoundaries,silverstoneAccessCorridors} from './silverstone.mjs';
import {interlagosPlanner,localInterlagos} from './interlagos-scenery.mjs';
const cache=new WeakMap();
export function silverstoneTerrainHeight(track,x,z,cell=20){
 let y=terrainHeight(track,x,z)-.85;const rows=silverstoneBoundaries(track),pad=Math.SQRT2*cell+track.step;
 for(let i=0;i<track.points.length;i+=2){const p=track.points[i],dx=x-p.x,dz=z-p.z,along=dx*Math.sin(p.heading)+dz*Math.cos(p.heading),across=dx*Math.cos(p.heading)-dz*Math.sin(p.heading);if(Math.abs(along)<pad&&across>-rows[-1][i].offset-pad&&across<rows[1][i].offset+pad)y=Math.min(y,p.y-.85);}
 return y;
}
function closestStation(track,x,z){let best=Infinity,index=0;track.points.forEach((candidate,i)=>{const distance=(candidate.x-x)**2+(candidate.z-z)**2;if(distance<best){best=distance;index=i;}});const roadPoint=track.points[index],offset=(x-roadPoint.x)*Math.cos(roadPoint.heading)-(z-roadPoint.z)*Math.sin(roadPoint.heading);return {s:index*track.step,side:Math.sign(offset)||1,offset:Math.abs(offset),road:roadPoint};}
export function planSilverstone(track,data){
 if(cache.has(track))return cache.get(track);const planner=interlagosPlanner(track),pit=pitLayout(track),mapped=[],optionalSkipped=[];
 const nativeRoadside=planner.roadside;planner.roadside=spec=>{let site=nativeRoadside(spec);if(site)return site;planner.rejected.pop();site=nativeRoadside({...spec,w:spec.w*.75,d:spec.d*.75,side:-spec.side,approximateScale:.75});if(!site){planner.rejected.pop();optionalSkipped.push(spec.id);}return site;};
 function mappedSite(feature,kind){
  const envelope=feature.envelope,near=closestStation(track,envelope.x,envelope.z),isWing=kind==='wing',w=isWing?28:envelope.w+2,d=isWing?390:envelope.d+2,mappedHeading=isWing?pit.frame.heading:envelope.heading,heading=!isWing&&Math.cos(mappedHeading-near.road.heading)<0?mappedHeading+Math.PI:mappedHeading;
  const base={...envelope,id:'osm-'+feature.way,kind,w,d,heading,side:isWing?pit.side:near.side,s:near.s,sourceWay:feature.way,label:feature.tags.name||'NATIONAL GARAGES',rows:Math.max(8,Math.min(22,Math.floor((w-6)/.8))),roof:!['Stowe A','Stowe B','Stowe C','Chapel','Farm Curve','Village A'].includes(feature.tags.name),margin:isWing?1:5};let site=null;
  if(kind==='clubhouse'){close:for(const delta of nearestLandmarkOffsets(90,6))for(const scale of [1,.94,.86,.74,.62]){site=planner.reserve({...base,w:base.w*scale,d:base.d*scale,x:envelope.x+delta.x,z:envelope.z+delta.z,approximateShift:delta.distance,approximateScale:scale});if(site)break close;}}
  search:for(const scale of (isWing?[1]:[1,.94,.86,.74,.62]))for(const shift of (isWing?[-12,-9,-15,-6,0,-18,-24]:Array.from({length:39},(_,i)=>i*6)))for(const along of (isWing?[12,6,18,0,-6,24]:[0,-12,12,-24,24,-48,48,-80,80])){if(site)break search;const h=isWing?heading:near.road.heading,across=isWing?shift:near.side*shift;site=planner.reserve({...base,w:base.w*scale,d:base.d*scale,x:envelope.x+Math.cos(h)*across+Math.sin(h)*along,z:envelope.z-Math.sin(h)*across+Math.cos(h)*along,approximateShift:Math.hypot(shift,along),approximateScale:scale});if(site)break search;}
  if(!site&&kind==='stand'){site=planner.roadside({...base,w:12,d:48,rows:8,offset:near.offset,approximateScale:.4,approximateShift:true});}
  if(!site)planner.rejected.push(base.id);else mapped.push(site);return site;
 }
 const wingFeature=data.features.find(p=>p.way==='227332429'),wing=mappedSite(wingFeature,'wing');
 // A documented pedestrian bridge is placed only when its complete support
 // footprints can be reserved. The high deck is checked separately in Y.
 let bridge=null;for(const feature of data.bridges){const a=localInterlagos(track,feature.points[0]),b=localInterlagos(track,feature.points.at(-1)),x=(a.x+b.x)/2,z=(a.z+b.z)/2,length=Math.hypot(b.x-a.x,b.z-a.z),near=closestStation(track,x,z);if(near.offset>track.width/2+8||length<20||length>160)continue;const heading=Math.atan2(-(b.z-a.z),b.x-a.x),rx=Math.cos(heading),rz=-Math.sin(heading),supports=[];for(const side of [-1,1]){let pier=null;for(let offset=length/2+3;offset<length/2+125;offset+=6){const px=x+rx*side*offset,pz=z+rz*side*offset; // A real building connection may share the already-cleared Wing envelope.
 const inWing=wing&&Math.abs((px-wing.x)*Math.cos(wing.heading)-(pz-wing.z)*Math.sin(wing.heading))<wing.w/2-5&&Math.abs((px-wing.x)*Math.sin(wing.heading)+(pz-wing.z)*Math.cos(wing.heading))<wing.d/2-5;
 pier=inWing?{id:'wing-bridge-connection',x:px,z:pz,y:wing.y,embedded:true}:planner.reserve({id:'footbridge-pier-'+side,kind:'bridge-pier',x:px,z:pz,w:4,d:8,heading,margin:8});if(pier)break;}if(pier)supports.push(pier);}if(supports.length===2){const deckLength=Math.hypot(supports[0].x-supports[1].x,supports[0].z-supports[1].z),deckY=Math.max(...track.points.filter(p=>Math.abs((p.x-x)*Math.sin(heading)+(p.z-z)*Math.cos(heading))<10&&Math.abs((p.x-x)*rx+(p.z-z)*rz)<deckLength/2+5).map(p=>p.y),near.road.y)+10;bridge={x:(supports[0].x+supports[1].x)/2,z:(supports[0].z+supports[1].z)/2,heading,length:deckLength,width:5,deckY,supports,sourceWay:feature.way};break;}}

 for(const f of data.features.filter(p=>p!==wingFeature)){const name=f.tags.name||'',kind=f.tags.building==='grandstand'||/^(Stowe [ABC]|Club [AB]|Vale|Village A)$/.test(name)?'stand':f.way==='437429280'?'museum':f.way==='169852619'?'experience':f.way==='360603862'?'clubhouse':'national-pits';mappedSite(f,kind);}
 for(const [i,s]of [420,1310,2580,3650,4330,5080].entries())planner.roadside({id:'viewing-bank-'+i,kind:'bank',s,side:i%2?1:-1,w:30,d:100,rows:10,margin:15});
 for(const [i,s]of [80,620,2200,3120,4500,5650].entries())planner.roadside({id:'hospitality-'+i,kind:'hospitality',s,side:i%2?1:-1,w:25,d:48,margin:15});
 for(const [i,s]of [1220,2520,3350,4300,5150].entries()){let site=null;const source=i===0?data.camps?.[0]:null;if(source){const points=source.points.map(p=>localInterlagos(track,p)),center=points.reduce((v,p)=>({x:v.x+p.x/points.length,z:v.z+p.z/points.length}),{x:0,z:0});site=planner.reserve({id:'camp-'+i,kind:'camp',...center,w:120,d:150,heading:0,margin:22,sourceWay:source.way,approximate:true});}if(!site)planner.roadside({id:'camp-'+i,kind:'camp',s,side:1,w:120,d:150,offset:190,margin:22,approximate:true});}
 for(const [i,s]of [480,2640,4630].entries())planner.roadside({id:'parking-'+i,kind:'parking',s,side:-1,w:120,d:160,offset:210,margin:22});
 planner.roadside({id:'heritage-tower',kind:'tower',s:2620,side:-1,w:22,d:26,margin:15,approximate:true});
 planner.roadside({id:'heritage-hangar',kind:'hangar',s:4310,side:-1,w:36,d:65,margin:20,approximate:true});
 for(let i=0;i<14;i++)planner.roadside({id:'official-'+i,kind:'official',s:100+i*track.length/14,side:i%2?1:-1,w:i%4===0?22:9,d:16,margin:10,crane:i%4===0});
 for(const corner of [738,1845,2930,4905,5359])for(const distance of [150,100,50])planner.roadside({id:'distance-'+corner+'-'+distance,kind:'board',s:corner-distance,side:corner===1845||corner===5359?-1:1,w:2,d:1.2,margin:3,label:String(distance)});
 for(let i=0;i<16;i++)planner.roadside({id:'banner-'+i,kind:'banner',s:160+i*track.length/16,side:i%2?1:-1,w:1.2,d:20,margin:7,label:['APEX BRITANNIA','AIRFIELD MOTORSPORT','BRITISH RACING','CIRCUIT CLUB'][i%4]});
 const trees=[];
 // Woodland blocks follow cached OSM woodland regions; individual tree spacing
 // and species are artistic. Every full crown is reserved independently.
 for(const [block,feature]of data.woods.entries()){const points=feature.points.map(p=>localInterlagos(track,p)),center=points.reduce((v,p)=>({x:v.x+p.x/points.length,z:v.z+p.z/points.length}),{x:0,z:0});if(Math.hypot(center.x,center.z)>1900)continue;for(let i=0;i<18;i++){const a=i*2.39996,r=8+Math.sqrt(i)*12,scale=.9+i%5*.1,x=center.x+Math.cos(a)*r,z=center.z+Math.sin(a)*r,site=planner.reserve({id:'woodland-'+block+'-'+i,kind:'tree',x,z,w:12*scale,d:12*scale,heading:a,scale,type:'broadleaf',margin:10});if(site){site.y=silverstoneTerrainHeight(track,x,z);trees.push(site);}}if(trees.length>=300)break;}
 for(let i=0;i<2600;i++){const s=(i*.61803398875%1)*track.length,p=sample(track,s,(i%2?1:-1)*(45+i%37*5)),scale=.8+i%8*.09,site=planner.reserve({id:'tree-'+i,kind:'tree',...p,w:12*scale,d:12*scale,heading:i*1.4,scale,type:i%5===0?'pine':'broadleaf',margin:8});if(site){site.y=silverstoneTerrainHeight(track,site.x,site.z);trees.push(site);}if(trees.length>=540)break;}
 for(let i=0;i<90;i++)planner.roadside({id:'hedge-'+i,kind:'hedge',s:i*track.length/90,side:i%2?1:-1,w:4,d:25,offset:95+i%5*30,margin:12});
 for(let i=0;i<60;i++){const a=i*2.39996,r=1250+i%6*85,x=Math.sin(a)*r,z=Math.cos(a)*r,site=planner.reserve({id:'village-'+i,kind:i%19===0?'church':i%7===0?'farm':'house',x,z,w:i%19===0?28:20,d:24,heading:.3,height:i%19===0?12:5+i%3*1.4,margin:20});if(site)site.y=silverstoneTerrainHeight(track,x,z);}
 const result={...planner,pit,wing,mapped,trees,bridge,optionalSkipped,access:silverstoneAccessCorridors(track)};cache.set(track,result);return result;
}
