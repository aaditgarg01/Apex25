import {sample} from './tracks.mjs';
import {pitLayout} from './pit-layout.mjs';
import {imolaTerrainHeight,IMOLA_CORNERS,imolaAccessCorridors,imolaDemHeight} from './imola.mjs';
import {imolaParkStructures} from './imola-structures.mjs';
import {interlagosPlanner,localInterlagos,interlagosEnvelopeOverlap,interlagosContains,interlagosFootprintClear} from './interlagos-scenery.mjs';
const cache=new WeakMap();
function closest(track,x,z){let best=Infinity,index=0;track.points.forEach((point,i)=>{const d=(point.x-x)**2+(point.z-z)**2;if(d<best){best=d;index=i;}});const p=track.points[index],across=(x-p.x)*Math.cos(p.heading)-(z-p.z)*Math.sin(p.heading);return {s:index*track.step,side:Math.sign(across)||1,road:p};}
export function planImola(track,data){
 if(cache.has(track))return cache.get(track);const planner=interlagosPlanner(track),pit=pitLayout(track),mapped=[],optionalSkipped=[],structures=imolaParkStructures(track),memorials=[],river=[],nativeReserve=planner.reserve;
 for(const s of structures.sites)if(!nativeReserve({...s}))planner.rejected.push(s.id);
 // Memorials retain mapped anchors; unsafe sites are omitted, never moved to
 // another corner. Their separate quiet buffers exclude smoke/signage/crowds.
 for(const reference of data.memorials){const p=localInterlagos(track,reference.location);let site=null;
  // Only the small original marker/flowers are represented. The mapped Senna
  // node sits on a reserved service-road envelope: set the model back within
  // its park vicinity rather than placing a structure in that road.
  search:for(const radius of [0,4,8,12,16,20])for(let i=0;i<(radius?16:1);i++){const a=i*Math.PI/8;site=nativeReserve({x:p.x+Math.cos(a)*radius,z:p.z+Math.sin(a)*radius,id:'memorial-'+reference.node,kind:'memorial',w:reference.model==='plaque'?1:5,d:reference.model==='plaque'?1:5,heading:0,margin:reference.model==='plaque'?.7:2,sourceNode:reference.node,model:reference.model,referenceName:reference.referenceName,approximateShift:radius});if(site)break search;}if(site)memorials.push(site);else optionalSkipped.push('memorial-'+reference.node);}
 planner.reserve=spec=>memorials.some(m=>['stand','bank','official','board','banner','camp','parking'].includes(spec.kind)&&interlagosEnvelopeOverlap(spec,{...m,w:m.w+55,d:m.d+55},2))?null:nativeReserve(spec);
 planner.roadside=spec=>{const p=sample(track,spec.s);for(let offset=spec.offset??track.width/2+spec.w/2+12;offset<(spec.kind==='camp'||spec.kind==='parking'?900:450);offset+=7){const pose=sample(track,spec.s,spec.side*offset),site=planner.reserve({...spec,...pose,heading:spec.heading??p.heading});if(site)return site;}optionalSkipped.push(spec.id);return null;};
 // River segments follow the mapped Santerno line; source width/depth are not
 // surveyed. Omit complete segments at every conflicting road/bridge approach.
 for(const source of data.river){const raw=source.points.map(p=>localInterlagos(track,p)),points=[raw[0]];let carry=0;for(let j=1;j<raw.length;j++){let a=raw[j-1],b=raw[j],length=Math.hypot(b.x-a.x,b.z-a.z);while(carry+length>=24){const t=(24-carry)/length,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};points.push(p);a=p;length=Math.hypot(b.x-a.x,b.z-a.z);carry=0;}carry+=length;}
  for(let j=0;j<points.length-1;j++){const a=points[j],b=points[j+1],x=(a.x+b.x)/2,z=(a.z+b.z)/2;if(Math.abs(x)>2000||Math.abs(z)>1600)continue;const site={id:'santerno-'+j,kind:'river',x,z,w:18,d:Math.hypot(b.x-a.x,b.z-a.z)+.4,heading:Math.atan2(b.x-a.x,b.z-a.z),margin:5,sourceWay:source.way};if(interlagosFootprintClear(track,site,5)&&!planner.sites.some(other=>other.kind!=='river'&&interlagosEnvelopeOverlap(site,other,2))){site.y=imolaDemHeight(track,x,z)-1;planner.sites.push(site);river.push(site);}}
 }
 function mappedSite(feature,kind){const env=feature.envelope,near=closest(track,env.x,env.z),isPit=kind==='pits',heading=isPit?pit.frame.heading:Math.cos(env.heading-near.road.heading)<0?env.heading+Math.PI:env.heading,base={...env,id:'osm-'+feature.way,kind,w:isPit?env.w+4:Math.max(14,env.w+3),d:env.d+3,heading,side:isPit?pit.side:near.side,s:near.s,sourceWay:feature.way,rows:isPit?0:Math.max(10,Math.min(23,Math.floor(env.w/.8))),roof:['59374219','84470512'].includes(feature.way),label:'IMOLA · GRANDSTAND',margin:isPit?2.5:5};let site=null;
  search:for(const scale of [1,.94,.85,.74,.62])for(const shift of [0,6,12,20,32,48,68])for(const along of [0,-10,10,-24,24,-45,45]){const h=isPit?heading:near.road.heading;site=planner.reserve({...base,w:base.w*scale,d:base.d*scale,x:env.x+Math.cos(h)*base.side*shift+Math.sin(h)*along,z:env.z-Math.sin(h)*base.side*shift+Math.cos(h)*along,approximateShift:Math.hypot(shift,along),approximateScale:scale});if(site)break search;}if(site)mapped.push(site);else optionalSkipped.push(base.id);return site;
 }
 const pitBuilding=mappedSite(data.features.find(f=>f.way==='60890960'),'pits');if(!pitBuilding)planner.rejected.push('pit-building');
 const controlTower=mappedSite(data.features.find(f=>f.way==='60890958'),'control');if(!controlTower)planner.rejected.push('mapped-control-tower');
 for(const f of data.features.filter(feature=>feature.tags.building==='grandstand'&&feature.envelope.w>=5))mappedSite(f,'stand');
 for(const [i,s,side,w,d]of [[0,680,-1,27,115],[1,1750,-1,32,120],[2,2390,-1,25,105],[3,2850,1,30,120],[4,3430,1,26,100],[5,4180,-1,36,150]])planner.roadside({id:'viewing-bank-'+i,kind:'bank',s,side,w,d,rows:16,margin:10,label:['TAMBURELLO · PARK','TOSA · HILLSIDE','PIRATELLA · VIEW','ACQUE MINERALI','VARIANTE ALTA','RIVAZZA · HILLSIDE'][i],approximate:true});
 for(const event of data.eventAnchors)planner.roadside(event);
 for(const [i,s]of [120,4700].entries())planner.roadside({id:'hospitality-'+i,kind:'hospitality',s,side:pit.side,w:22,d:55,margin:10,approximate:true});
 for(let i=0;i<17;i++)planner.roadside({id:'official-'+i,kind:'official',s:120+i*track.length/17,side:i%2?1:-1,w:i%4===0?22:10,d:18,margin:8,crane:i%4===0});
 for(const c of IMOLA_CORNERS){planner.roadside({id:'turn-'+c.turn,kind:'board',s:c.s-22,side:c.side,w:2,d:1.3,margin:2,label:'T'+c.turn});if([2,5,7,9,11,14,17].includes(c.turn))for(const d of [150,100,50])planner.roadside({id:'braking-'+c.turn+'-'+d,kind:'board',s:c.s-d,side:c.side,w:2,d:1.3,margin:2,label:String(d)});}
 for(let i=0;i<16;i++)planner.roadside({id:'banner-'+i,kind:'banner',s:140+i*track.length/16,side:i%2?1:-1,w:1.3,d:18,margin:5,label:['APEX · EMILIA','PARKLAND RACING','ITALIA · CORSE','OPEN WHEEL · 25'][i%4]});
 for(let i=0;i<55;i++)planner.roadside({id:'grass-'+i,kind:'grasspatch',s:i*track.length/55,side:i%2?1:-1,w:9,d:15,offset:50+i%4*22,margin:7});
 for(let i=0;i<22;i++)planner.roadside({id:'park-corner-'+i,kind:'park-furniture',s:100+i*track.length/22,side:i%2?1:-1,w:10,d:13,offset:90+i%3*30,margin:8,approximate:true});
 for(const [i,f]of data.houses.entries())planner.reserve({...f.envelope,id:'town-'+i,kind:'house',height:5+i%3*2,w:f.envelope.w+2,d:f.envelope.d+2,margin:5,sourceWay:f.way});
 const paths=[];for(const source of data.paths){const points=source.points.map(p=>localInterlagos(track,p));for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(length/12);for(let j=0;j<steps&&paths.length<180;j++){const site=planner.reserve({id:'path-'+source.way+'-'+i+'-'+j,kind:'park-path',x:a.x+(b.x-a.x)*(j+.5)/steps,z:a.z+(b.z-a.z)*(j+.5)/steps,w:2.4,d:length/steps,heading:Math.atan2(b.x-a.x,b.z-a.z),margin:3,sourceWay:source.way});if(site)paths.push(site);}}}
 const woods=data.woods.filter(f=>JSON.stringify(f.points[0])===JSON.stringify(f.points.at(-1))).map(f=>f.points.map(p=>localInterlagos(track,p))),trees=[];
 for(let i=0;i<150000&&trees.length<1600;i++){const x=(i*.61803398875%1-.5)*2900,z=(i*.41421356237%1-.5)*2850;if(!woods.some(p=>interlagosContains(p,x,z)))continue;const scale=.85+i%7*.08,site=planner.reserve({id:'tree-'+i,kind:'tree',x,z,w:12*scale,d:12*scale,scale,heading:i*1.6,type:i%12===0?'pine':'broadleaf',margin:5});if(site)trees.push(site);}
 for(const site of planner.sites){if(['river','park-bridge','park-gate'].includes(site.kind))continue;site.y=imolaTerrainHeight(track,site.x,site.z)+(['pits','stand','bank','hospitality','control','official','memorial'].includes(site.kind)?.65:0);}
 const foundations=planner.sites.filter(p=>['pits','stand','bank','hospitality','control','official','memorial','camp','parking'].includes(p.kind));
 const result={...planner,pit,pitBuilding,controlTower,mapped,trees,memorials,river,paths,structures,foundations,optionalSkipped,access:imolaAccessCorridors(track)};cache.set(track,result);return result;
}
