import {nearestLandmarkOffsets} from './landmark-placement.mjs';
import {YASMARINA_LIGHTING} from './yasmarina-lighting-data.mjs';
import {sample} from './tracks.mjs';
import {pitLayout,pitRoadPose} from './pit-layout.mjs';
import {yasmarinaTerrainHeight,YASMARINA_CORNERS,yasmarinaAccessCorridors} from './yasmarina.mjs';
import {yasmarinaStructures} from './yasmarina-structures.mjs';
import {interlagosPlanner,interlagosContains,interlagosEnvelopeOverlap,localInterlagos} from './interlagos-scenery.mjs';
const cache=new WeakMap();
export function planYasmarina(track,data){
 if(cache.has(track))return cache.get(track);const base=interlagosPlanner(track),pit=pitLayout(track),waters=data.water.map(f=>({id:'water-'+f.way,outline:f.points.map(p=>localInterlagos(track,p)),holes:[]})),optionalSkipped=[],mapped=[];
 const waterCorners=spec=>{const c=Math.cos(spec.heading||0),sn=Math.sin(spec.heading||0);return [[0,0],[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([x,z])=>({x:spec.x+c*x*spec.w+sn*z*spec.d,z:spec.z-sn*x*spec.w+c*z*spec.d}));};
 const shoreOverlap=spec=>waters.some(lake=>lake.outline.some((a,i)=>{const b=lake.outline[(i+1)%lake.outline.length];return interlagosEnvelopeOverlap(spec,{x:(a.x+b.x)/2,z:(a.z+b.z)/2,w:.05,d:Math.hypot(a.x-b.x,a.z-b.z),heading:Math.atan2(b.x-a.x,b.z-a.z)},0);}));
 const inWater=spec=>waterCorners(spec).some(p=>waters.some(lake=>interlagosContains(lake.outline,p.x,p.z)))||shoreOverlap(spec);
 const whollyWater=spec=>!shoreOverlap(spec)&&waterCorners(spec).every(p=>waters.some(lake=>interlagosContains(lake.outline,p.x,p.z)));
 // Full oriented footprints checked against every road branch, not just anchors.
 const reserve=spec=>inWater(spec)&&!['hotel','yacht','dock'].includes(spec.kind)?null:base.reserve(spec);
 function roadside(spec){const road=sample(track,spec.s);for(let offset=spec.offset??track.width/2+spec.w/2+8;offset<700;offset+=5){const p=sample(track,spec.s,spec.side*offset),site=reserve({...spec,...p,heading:spec.heading??road.heading});if(site)return site;}optionalSkipped.push(spec.id);return null;}
 const structures=yasmarinaStructures(track);base.sites.push(...structures.sites);
 function mappedSite(f){const env=f.envelope,kind=f.kind;if(kind==='hotel')return;let near=0,best=Infinity;track.points.forEach((p,i)=>{const distance=Math.hypot(env.x-p.x,env.z-p.z);if(distance<best){best=distance;near=i*track.step;}});const road=sample(track,near),side=kind==='pits'?pit.side:Math.sign((env.x-road.x)*Math.cos(road.heading)-(env.z-road.z)*Math.sin(road.heading))||1,heading=kind==='pits'?pit.frame.heading:env.heading,large=kind==='stand'&&env.w>60,baseSpec={...env,id:'osm-'+f.way,kind,s:near,side,heading,w:large?38:env.w+6,d:env.d+6,sourceWay:f.way,margin:3,height:f.height,rows:large?28:22,roof:true,label:'YAS ISLAND · GRANDSTAND',approximate:true};let site;
  search:for(const scale of [1,.92,.8,.66,.5])for(const shift of [0,6,12,24,40,60,90]){site=reserve({...baseSpec,w:baseSpec.w*scale,d:baseSpec.d*scale,x:env.x+Math.cos(heading)*side*shift,z:env.z-Math.sin(heading)*side*shift,approximateShift:shift,approximateScale:scale});if(site)break search;}
  if(!site&&kind==='pits'){const box=pitRoadPose(track,pit.box);outer:for(const w of [30,24])for(const d of [350,280,210])for(const gap of [8,16,28,48]){site=reserve({...baseSpec,x:box.x+Math.cos(heading)*pit.side*(pit.width/2+w/2+gap),z:box.z-Math.sin(heading)*pit.side*(pit.width/2+w/2+gap),w,d,approximateShift:Math.hypot(box.x-env.x,box.z-env.z),approximateScale:d/env.d});if(site)break outer;}}
  if(!site&&kind==='stand'){outer:for(const delta of nearestLandmarkOffsets(90,6))for(const scale of [.65,.5,.4]){site=reserve({...baseSpec,x:env.x+delta.x,z:env.z+delta.z,w:28*scale,d:140*scale,rows:20,margin:3,approximateShift:delta.distance,approximateScale:scale});if(site)break outer;}}if(!site&&kind==='mall'){outer:for(const delta of nearestLandmarkOffsets(120,12))for(const scale of [.3,.2]){site=reserve({...baseSpec,x:env.x+delta.x,z:env.z+delta.z,w:env.w*scale,d:env.d*scale,approximateShift:delta.distance,approximateScale:scale});if(site)break outer;}}if(site)mapped.push(site);else optionalSkipped.push(baseSpec.id);return site;
 }
 const pitBuilding=mappedSite(data.features.find(f=>f.kind==='pits'));for(const feature of data.features.filter(item=>item.kind!=='pits'))mappedSite(feature);
 for(const [i,s,side]of [[0,180,-1],[1,1260,-1],[2,3550,-1],[3,4700,1]])roadside({id:'fan-'+i,kind:'camp',s,side,w:52,d:85,margin:5});
 roadside({id:'timing-tower',kind:'tower',s:100,side:pit.side,w:12,d:13,margin:4});for(const station of [5100,100,4800,3500])if(roadside({id:'medical',kind:'medical',s:station,side:pit.side,w:16,d:22,margin:4}))break;
 const beyond=[];for(let i=0;i<24;i++){const site=roadside({id:'beyond-'+i,kind:'beyond',s:70+i*track.length/24,side:i%2?1:-1,w:9,d:20,margin:3,gate:i%3===0});if(site)beyond.push(site);}
 for(let i=0;i<26;i++)roadside({id:'official-'+i,kind:'official',s:90+i*track.length/26,side:i%2?1:-1,w:i%4===0?23:11,d:19,margin:4,crane:i%4===0});
 for(let i=0;i<12;i++)roadside({id:'utility-'+i,kind:'utility',s:140+i*track.length/12,side:i%2?1:-1,w:9,d:14,margin:3});
 for(const corner of YASMARINA_CORNERS){roadside({id:'turn-'+corner.turn,kind:'board',s:corner.s-18,side:corner.side,w:2,d:1.3,margin:2,label:'T'+corner.turn});if([1,5,6,9,12,16].includes(corner.turn))for(const distance of [200,150,100,50])roadside({id:'braking-'+corner.turn+'-'+distance,kind:'board',s:corner.s-distance,side:corner.side,w:2,d:1.3,margin:2,label:String(distance)});}
 for(let i=0;i<18;i++)roadside({id:'banner-'+i,kind:'banner',s:40+i*track.length/18,side:i%2?1:-1,w:1.3,d:18,margin:3,label:['APEX · AFTERGLOW','PRECISION · SPEED','ISLAND MOTORSPORT','OPEN WHEEL · 25'][i%4]});
 const masts=[];for(const [i,anchor]of YASMARINA_LIGHTING.masts.entries()){const site=roadside({id:'mast-'+i,kind:'mast',s:anchor.s,side:anchor.side,w:12,d:12,margin:2});if(site)masts.push(site);}
 const yachts=[],docks=[];for(let i=0;i<1500&&yachts.length<65;i++){const x=40+(i*.61803398875%1)*520,z=135+(i*.41421356237%1)*480,spec={id:'yacht-'+i,kind:'yacht',x,z,w:10,d:24+i%3*6,heading:.18,margin:4};if(!whollyWater(spec))continue;const site=reserve(spec);if(site)yachts.push(site);}
 for(let i=0;i<12;i++){const spec={id:'dock-'+i,kind:'dock',x:165+i%4*60,z:170+Math.floor(i/4)*115,w:3,d:65,heading:.18,margin:3};if(whollyWater(spec)){const site=reserve(spec);if(site)docks.push(site);}}
 const trees=[];for(let i=0;i<18000&&trees.length<900;i++){const s=(i*.61803398875%1)*track.length,side=i%2?1:-1,scale=.85+i%5*.09,p=sample(track,s,side*(32+i%50*7)),site=reserve({id:'tree-'+i,kind:'tree',...p,w:12*scale,d:12*scale,heading:i*1.7,scale,type:i%12?'palm':'broadleaf',margin:3});if(site)trees.push(site);}
 for(let i=0;i<35;i++)roadside({id:'grass-'+i,kind:'grasspatch',s:i*track.length/35,side:i%2?1:-1,w:9,d:16,offset:40+i%5*14,margin:3});
 for(const site of base.sites)site.y=yasmarinaTerrainHeight(track,site.x,site.z)+(['pits','stand','hospitality','medical','official','tower'].includes(site.kind)?.65:0);
 for(const site of [...yachts,...docks])site.y=Math.min(...track.points.map(p=>p.y))-1.5;
 const result={...base,reserve,roadside,pit,pitBuilding,mapped,trees,waters,skyline:[],foundations:base.sites.filter(p=>['pits','stand','hospitality','camp','medical'].includes(p.kind)),structures,beyond,masts,yachts,docks,optionalSkipped,access:yasmarinaAccessCorridors(track)};cache.set(track,result);return result;
}
