import {cotaFootbridge} from './cota-structures.mjs';
import {sample} from './tracks.mjs';
import {pitLayout} from './pit-layout.mjs';
import {cotaTerrainHeight,cotaConstrainGround,COTA_CORNERS,cotaAccessCorridors} from './cota.mjs';
import {interlagosPlanner,localInterlagos,interlagosEnvelopeOverlap} from './interlagos-scenery.mjs';
export {cotaTerrainHeight,cotaConstrainGround} from './cota.mjs';
const cache=new WeakMap();
function closest(track,x,z){let best=Infinity,index=0;track.points.forEach((point,i)=>{const d=(point.x-x)**2+(point.z-z)**2;if(d<best){best=d;index=i;}});const p=track.points[index],across=(x-p.x)*Math.cos(p.heading)-(z-p.z)*Math.sin(p.heading);return {s:index*track.step,side:Math.sign(across)||1,road:p};}
export function planCota(track,data){
 if(cache.has(track))return cache.get(track);
 const planner=interlagosPlanner(track),pit=pitLayout(track),mapped=[],optionalSkipped=[],bridge=cotaFootbridge(track),nativeReserve=planner.reserve;
 if(bridge){for(const pier of bridge.piers)if(!nativeReserve(pier))planner.rejected.push(pier.id);planner.reserve=spec=>interlagosEnvelopeOverlap(spec,bridge,3)?null:nativeReserve(spec);}
 planner.roadside=spec=>{const p=sample(track,spec.s);for(let offset=spec.offset??track.width/2+spec.w/2+14;offset<(spec.kind==='camp'||spec.kind==='parking'?1000:500);offset+=7){const pose=sample(track,spec.s,spec.side*offset),site=planner.reserve({...spec,...pose,heading:spec.heading??p.heading});if(site)return site;}optionalSkipped.push(spec.id);return null;};
 function mappedSite(feature,kind){const env=feature.envelope,near=closest(track,env.x,env.z),isPit=kind==='pits',heading=isPit?pit.frame.heading:Math.cos(env.heading-near.road.heading)<0?env.heading+Math.PI:env.heading,base={...env,id:'osm-'+feature.way,kind,w:Math.max(14,env.w+3),d:env.d+3,heading,side:isPit?pit.side:near.side,s:near.s,sourceWay:feature.way,rows:isPit?0:Math.max(12,Math.min(28,Math.floor(env.w/.9))),roof:feature.way==='460658889',label:'HILL COUNTRY · GRANDSTAND',margin:isPit?2.5:5};let site=null;
  search:for(const scale of [1,.94,.85,.74,.6])for(const shift of [0,6,12,20,32,48,68,90])for(const along of [0,-10,10,-24,24,-45,45]){const h=isPit?heading:near.road.heading;site=planner.reserve({...base,w:base.w*scale,d:base.d*scale,x:env.x+Math.cos(h)*base.side*shift+Math.sin(h)*along,z:env.z-Math.sin(h)*base.side*shift+Math.cos(h)*along,approximateShift:Math.hypot(shift,along),approximateScale:scale});if(site)break search;}
  if(site)mapped.push(site);else optionalSkipped.push(base.id);return site;
 }
 const pitBuilding=mappedSite(data.features.find(f=>f.way==='376713391'),'pits');if(!pitBuilding)planner.rejected.push('pit-building');
 for(const f of data.features.filter(feature=>feature.tags.building==='grandstand'&&feature.envelope.w>=10))mappedSite(f,'stand');
 const towerPoint=localInterlagos(track,data.tower.location),tower=planner.reserve({id:'observation-tower',kind:'observation',...towerPoint,w:28,d:30,height:76.5,heading:2.2,margin:7,sourceNode:data.tower.node});if(!tower)planner.rejected.push('observation-tower');
 const stageFeature=data.features.find(f=>f.way==='847781223'),stage=mappedSite(stageFeature,'stage');if(!stage)planner.rejected.push('amphitheatre-stage');
 // Source stage and tower anchors are independently reserved. The fitted lawn
 // and fan plaza are optional complete rectangles; no unverified giant footprint.
 const plazaPoint=localInterlagos(track,data.plaza.location);let plaza=null;
 for(const shift of [0,20,-20,40,-40,65,-65]){plaza=planner.reserve({id:'grand-plaza',kind:'plaza',x:plazaPoint.x+shift,z:plazaPoint.z,w:52,d:62,heading:2.2,margin:5,approximate:true});if(plaza)break;}if(!plaza)optionalSkipped.push('grand-plaza');
 if(stage)for(const sign of [-1,1]){const site=planner.reserve({id:'amphitheatre-lawn',kind:'bank',x:stage.x+Math.cos(stage.heading)*sign*58,z:stage.z-Math.sin(stage.heading)*sign*58,w:55,d:65,heading:stage.heading,side:-sign,s:stage.s,rows:14,margin:5,label:'LIVE · LAWN',approximate:true});if(site)break;}
 for(const [i,s,side,w,d]of [[0,340,-1,38,160],[1,880,-1,28,150],[2,1390,-1,26,115],[3,2220,-1,30,105],[4,3500,-1,36,155],[5,3850,-1,34,120],[6,4930,-1,30,100]])planner.roadside({id:'viewing-bank-'+i,kind:i===4||i===5?'stand':'bank',s,side,w,d,rows:20,margin:12,label:i===0?'HILLTOP · TURN 1':i===4||i===5?'STADIUM · LIVE':'HILL COUNTRY · VIEWING',roof:false,approximate:true});
 for(const [i,s,side]of [[0,5300,pit.side],[1,3400,1],[2,4200,-1]])planner.roadside({id:'hospitality-'+i,kind:'hospitality',s,side,w:24,d:65,margin:12,approximate:true});
 for(const event of data.eventAnchors)planner.roadside(event);
 planner.roadside({id:'control-tower',kind:'tower',s:5480,side:pit.side,w:23,d:26,margin:8,approximate:true});
 for(let i=0;i<19;i++)planner.roadside({id:'official-'+i,kind:'official',s:120+i*track.length/19,side:i%2?1:-1,w:i%4===0?22:10,d:18,margin:8,crane:i%4===0});
 for(const corner of COTA_CORNERS){planner.roadside({id:'turn-'+corner.turn,kind:'board',s:corner.s-22,side:corner.side,w:2,d:1.3,margin:2,label:'T'+corner.turn});if([1,11,12,15,19,20].includes(corner.turn))for(const distance of [150,100,50])planner.roadside({id:'braking-'+corner.turn+'-'+distance,kind:'board',s:corner.s-distance,side:corner.side,w:2,d:1.3,margin:2,label:String(distance)});}
 for(let i=0;i<20;i++)planner.roadside({id:'banner-'+i,kind:'banner',s:160+i*track.length/20,side:i%2?1:-1,w:1.3,d:19,margin:5,label:['APEX · LONE STAR','HILL COUNTRY RACING','TEXAS · SPEED','OPEN WHEEL · 25'][i%4]});
 for(let i=0;i<65;i++)planner.roadside({id:'grass-'+i,kind:'grasspatch',s:i*track.length/65,side:i%2?1:-1,w:10,d:18,offset:60+i%4*25,margin:7});
 for(let i=0;i<12;i++)planner.roadside({id:'limestone-'+i,kind:i%2?'soil':'rockcut',s:180+i*track.length/12,side:i%2?1:-1,w:12,d:21,offset:90+i%4*18,margin:9,approximate:true});
 const trees=[];
 for(let i=0;i<14000&&trees.length<760;i++){const s=(i*.61803398875%1)*track.length,side=i%2?1:-1,scale=.65+i%7*.09,p=sample(track,s,side*(52+i%45*4.3)),site=planner.reserve({id:'tree-'+i,kind:'tree',...p,w:12*scale,d:12*scale,scale,heading:i*1.6,type:i%5===0?'pine':'broadleaf',margin:7});if(site)trees.push(site);}
 for(const [i,f]of data.houses.entries())planner.reserve({...f.envelope,id:'suburb-'+i,kind:'house',height:4+i%4,w:f.envelope.w+2,d:f.envelope.d+2,margin:6,sourceWay:f.way});
 for(let i=0;i<14;i++){const a=i*.16+1.8,r=2100,site=planner.reserve({id:'skyline-'+i,kind:'house',x:Math.sin(a)*r,z:Math.cos(a)*r,w:22,d:20,height:32+i%6*9,heading:0,margin:15,approximate:true});if(!site)optionalSkipped.push('skyline-'+i);}
 for(const site of planner.sites){if(site.kind==='bridge-pier')continue;site.y=cotaTerrainHeight(track,site.x,site.z)+(['pits','stand','bank','hospitality','stage','observation','tower','official','plaza'].includes(site.kind)?.65:0);}
 const foundations=planner.sites.filter(p=>['pits','stand','bank','hospitality','stage','observation','tower','official','plaza','camp','parking'].includes(p.kind));
 const result={...planner,bridge,pit,pitBuilding,tower,stage,plaza,mapped,trees,foundations,optionalSkipped,access:cotaAccessCorridors(track)};cache.set(track,result);return result;
}
