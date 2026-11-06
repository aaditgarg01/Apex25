import {nearestLandmarkOffsets} from './landmark-placement.mjs';
import {montrealStructures} from './montreal-structures.mjs';
import {sample} from './tracks.mjs';
import {pitLayout,pitRoadPose} from './pit-layout.mjs';
import {montrealTerrainHeight,MONTREAL_CORNERS,montrealAccessCorridors} from './montreal.mjs';
import {interlagosPlanner,interlagosContains,localInterlagos} from './interlagos-scenery.mjs';
const cache=new WeakMap();
export function planMontreal(track,data){
 if(cache.has(track))return cache.get(track);
 const base=interlagosPlanner(track),pit=pitLayout(track),waters=data.water.map(f=>({id:'water-'+f.way,way:f.way,outline:f.points.map(p=>localInterlagos(track,p)),holes:(f.holes||[]).map(ring=>ring.map(p=>localInterlagos(track,p)))})),mapped=[],optionalSkipped=[];
 const inWater=site=>waters.some(lake=>{const c=Math.cos(site.heading||0),s=Math.sin(site.heading||0);return [[0,0],[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].some(([x,z])=>interlagosContains(lake.outline,site.x+c*x*site.w+s*z*site.d,site.z-s*x*site.w+c*z*site.d)&&!lake.holes.some(hole=>interlagosContains(hole,site.x+c*x*site.w+s*z*site.d,site.z-s*x*site.w+c*z*site.d)));});
 const reserve=spec=>{const overWater=inWater(spec);return !['pits','pavilion','stand','riverbridge','rides','biosphere','skyline'].includes(spec.kind)&&overWater?null:base.reserve({...spec,overWater});};
 function roadside(spec){const road=sample(track,spec.s);for(let offset=spec.offset??track.width/2+spec.w/2+8;offset<(spec.kind==='horizon'?2500:400);offset+=5){const p=sample(track,spec.s,spec.side*offset),site=reserve({...spec,...p,heading:spec.heading??road.heading});if(site)return site;}optionalSkipped.push(spec.id);return null;}
 const planner={...base,reserve,roadside},builtStructures=montrealStructures(track);for(const site of builtStructures.sites)base.reserve(site);
 function mappedSite(f){const env=f.envelope,kind=f.kind;if(kind==='biosphere')return null;let near=0,best=Infinity;track.points.forEach((p,i)=>{const d=Math.hypot(env.x-p.x,env.z-p.z);if(d<best){best=d;near=i*track.step;}});const road=sample(track,near),side=kind==='pits'?pit.side:Math.sign((env.x-road.x)*Math.cos(road.heading)-(env.z-road.z)*Math.sin(road.heading))||1,heading=kind==='pits'?pit.frame.heading:env.heading,baseSpec={...env,id:'osm-'+f.way,kind,s:near,side,w:env.w+6,d:env.d+6,heading,sourceWay:f.way,margin:3,approximate:true};let site;
  search:for(const scale of [1,.92,.8,.66,.5])for(const shift of [0,6,12,24,40,60]){site=reserve({...baseSpec,w:baseSpec.w*scale,d:baseSpec.d*scale,x:env.x+Math.cos(heading)*side*shift,z:env.z-Math.sin(heading)*side*shift,approximateShift:shift,approximateScale:scale});if(site)break search;}
  if(!site&&kind==='pits'){const box=pitRoadPose(track,pit.box);pitSearch:for(const width of [30,24])for(const d of [300,240,180])for(const gap of [8,14,22,35,50]){site=reserve({...baseSpec,x:box.x+Math.cos(heading)*pit.side*(pit.width/2+width/2+gap),z:box.z-Math.sin(heading)*pit.side*(pit.width/2+width/2+gap),w:width,d,approximateScale:d/env.d});if(site)break pitSearch;}}
  if(!site&&kind==='pavilion'){outer:for(const delta of nearestLandmarkOffsets(100,8))for(const scale of [1,.92,.8,.66]){site=reserve({...baseSpec,x:env.x+delta.x,z:env.z+delta.z,w:baseSpec.w*scale,d:baseSpec.d*scale,approximateShift:delta.distance,approximateScale:scale});if(site)break outer;}}
  if(site)mapped.push(site);else optionalSkipped.push(baseSpec.id);return site;
 }
 const pitBuilding=mappedSite(data.features.find(f=>f.kind==='pits'));if(!pitBuilding)planner.rejected.push('pit-building');
 for(const f of data.features.filter(feature=>feature.kind==='pavilion'))mappedSite(f);
 // Distant landmarks are checked with their full envelope too.
 const skyline=[];for(const item of data.skyline){const p=localInterlagos(track,item.center);let site=reserve({...item,...p,heading:item.heading||0,margin:8});if(!site&&['biosphere','rides'].includes(item.kind)){outer:for(const delta of nearestLandmarkOffsets(80,8)){site=reserve({...item,x:p.x+delta.x,z:p.z+delta.z,heading:item.heading||0,margin:5,approximate:true,approximateShift:delta.distance});if(site)break outer;}}if(site)skyline.push(site);else optionalSkipped.push(item.id);}
 // Official stand identities/turn associations; temporary envelopes are fitted.
 for(const [id,s,side,w,d,rows,roof]of [['1',50,-1,34,190,25,false],['11',420,-1,30,110,24,false],['12',610,1,34,150,26,false],['10',680,-1,28,90,20,false],['32',1410,1,25,95,20,false],['33',1570,-1,25,95,20,false],['31',2220,1,32,120,24,false],['15',2880,1,38,165,28,false],['21',2760,-1,31,125,24,false],['24',3010,-1,34,140,25,false],['34',2935,-1,22,70,18,false],['46',3230,-1,24,100,20,false],['47',3290,1,24,100,20,false],['16',4235,-1,28,110,22,false],['covered',290,-1,28,95,20,true]])roadside({id:'stand-'+id,kind:'stand',s,side,w,d,rows,roof,margin:5,label:'STAND '+id.toUpperCase(),approximate:true});
 for(const [i,s,side,w,d]of [[0,900,1,18,80],[1,1920,-1,18,90],[2,2640,-1,18,80]])roadside({id:'viewing-'+i,kind:'bank',s,side,w,d,rows:9,margin:5,label:'PARK · VIEWING'});
 for(const [i,s,side]of [[0,850,1],[1,1800,-1],[2,2720,-1]])roadside({id:'fan-'+i,kind:'camp',s,side,w:48,d:80,margin:8});
 roadside({id:'hospitality-0',kind:'hospitality',s:track.length-160,side:pit.side,w:22,d:60,margin:6});
 roadside({id:'medical-0',kind:'medical',s:track.length-200,side:pit.side,w:22,d:28,margin:7});
 roadside({id:'timing-tower',kind:'tower',s:140,side:pit.side,w:12,d:13,margin:5});
 const beyond=[];
 for(let i=0;i<24;i++){const spec={id:'beyond-'+i,kind:'beyond',s:80+i*track.length/24,side:i%2?1:-1,w:9,d:20,margin:3,gate:i%3===0},site=roadside(spec);if(site)beyond.push(site);}
 for(let i=0;i<23;i++)roadside({id:'official-'+i,kind:'official',s:90+i*track.length/23,side:i%2?1:-1,w:i%4===0?23:11,d:19,margin:5,crane:i%4===0});
 for(let i=0;i<12;i++)roadside({id:'utility-'+i,kind:'utility',s:140+i*track.length/12,side:i%2?1:-1,w:9,d:14,margin:4});
 for(const c of MONTREAL_CORNERS){roadside({id:'turn-'+c.turn,kind:'board',s:c.s-18,side:c.side,w:2,d:1.3,margin:2,label:'T'+c.turn});if([1,3,6,8,10,13].includes(c.turn))for(const distance of [200,150,100,50].filter(d=>[1,10,13].includes(c.turn)||d!==200))roadside({id:'braking-'+c.turn+'-'+distance,kind:'board',s:c.s-distance,side:c.side,w:2,d:1.3,margin:2,label:String(distance)});}
 for(let i=0;i<18;i++)roadside({id:'banner-'+i,kind:'banner',s:40+i*track.length/18,side:i%2?1:-1,w:1.3,d:18,margin:3,label:['APEX · RIVER RACING','PRECISION · SPEED','ISLAND MOTORSPORT','OPEN WHEEL · 25'][i%4]});
 for(let i=0;i<65;i++)roadside({id:'grass-'+i,kind:'grasspatch',s:i*track.length/65,side:i%2?1:-1,w:9,d:16,offset:35+i%5*14,margin:4});
 const woods=data.woods.map(f=>f.points.map(p=>localInterlagos(track,p))),trees=[];
 for(let i=0;i<60000&&trees.length<1050;i++){const x=(i*.61803398875%1-.5)*1450,z=(i*.41421356237%1-.5)*3000;if(!woods.some(p=>interlagosContains(p,x,z))&&i%7)continue;const scale=.85+i%6*.08,site=reserve({id:'tree-'+i,kind:'tree',x,z,w:14*scale,d:14*scale,scale,heading:i*1.6,type:i%6===0?'pine':'broadleaf',margin:5});if(site)trees.push(site);}
 for(const site of planner.sites)site.y=montrealTerrainHeight(track,site.x,site.z)+(['pits','stand','bank','hospitality','medical','official','tower'].includes(site.kind)?.65:0);
 const structures={...builtStructures,beyond},foundations=planner.sites.filter(p=>!p.overWater&&['pits','stand','bank','hospitality','medical','official','camp'].includes(p.kind));
 const result={...planner,pit,pitBuilding,mapped,trees,waters,skyline,foundations,structures,beyond,optionalSkipped,access:montrealAccessCorridors(track)};cache.set(track,result);return result;
}
