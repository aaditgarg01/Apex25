import {sample} from './tracks.mjs';
import {pitLayout} from './pit-layout.mjs';
import {hungaroringTerrainHeight,HUNGARORING_CORNERS,hungaroringAccessCorridors} from './hungaroring.mjs';
import {hungaroringStructures} from './hungaroring-structures.mjs';
import {interlagosPlanner,interlagosContains,localInterlagos} from './interlagos-scenery.mjs';
const cache=new WeakMap();
function closest(track,x,z){let best=Infinity,index=0;track.points.forEach((point,i)=>{const d=(point.x-x)**2+(point.z-z)**2;if(d<best){best=d;index=i;}});const p=track.points[index];return {s:index*track.step,side:Math.sign((x-p.x)*Math.cos(p.heading)-(z-p.z)*Math.sin(p.heading))||1,road:p};}
export function planHungaroring(track,data){
 if(cache.has(track))return cache.get(track);const planner=interlagosPlanner(track),pit=pitLayout(track),mapped=[],optionalSkipped=[],structures=hungaroringStructures(track);for(const site of structures.sites)if(!planner.reserve({...site}))planner.rejected.push(site.id);
 planner.roadside=spec=>{const p=sample(track,spec.s);for(let offset=spec.offset??track.width/2+spec.w/2+12;offset<(spec.kind==='camp'||spec.kind==='parking'?950:spec.kind==='horizon'?1600:550);offset+=7){const pose=sample(track,spec.s,spec.side*offset),site=planner.reserve({...spec,...pose,heading:spec.heading??p.heading});if(site)return site;}optionalSkipped.push(spec.id);return null;};
 function mappedSite(f,kind){const env=f.envelope,near=closest(track,env.x,env.z),isPit=kind==='pits',heading=isPit?pit.frame.heading:Math.cos(env.heading-near.road.heading)<0?env.heading+Math.PI:env.heading,main=f.way==='230979479',base={...env,id:'osm-'+f.way,kind,w:isPit?env.w+8:Math.max(14,env.w+4),d:env.d+6,heading,side:isPit?pit.side:near.side,s:near.s,sourceWay:f.way,rows:main?30:14,roof:main,label:main?'MOGYOROD · MAIN STAND':'BOWL · GRANDSTAND',margin:isPit?2.5:5};let site=null;
  search:for(const scale of [1,.94,.85,.74,.62])for(const shift of [0,6,12,20,32,48,68,90])for(const along of [0,-10,10,-24,24,-45,45]){const h=isPit?heading:near.road.heading;site=planner.reserve({...base,w:base.w*scale,d:base.d*scale,x:env.x+Math.cos(h)*base.side*shift+Math.sin(h)*along,z:env.z-Math.sin(h)*base.side*shift+Math.cos(h)*along,approximateShift:Math.hypot(shift,along),approximateScale:scale});if(site)break search;}if(site)mapped.push(site);else optionalSkipped.push(base.id);return site;
 }
 const pitBuilding=mappedSite(data.features.find(f=>f.way==='123905481'),'pits');if(!pitBuilding)planner.rejected.push('pit-building');
 for(const f of data.features.filter(feature=>['230979479','230979485','230979500'].includes(feature.way)))mappedSite(f,'stand');
 for(const [i,s,side,w,d]of [[0,350,1,36,140],[1,850,-1,28,110],[2,1800,1,28,100],[3,2300,-1,28,110],[4,2860,1,30,120],[5,3500,-1,30,105],[6,3800,1,30,120]])planner.roadside({id:'viewing-bank-'+i,kind:'bank',s,side,w,d,rows:18,margin:10,label:['TURN 1 · HILLSIDE','EARLY CORNERS','TURN 5 · BOWL','INFIELD · VIEW','TURN 11 · HILL','FINAL SECTOR','FINAL CORNER'][i],approximate:true});
 for(const event of data.eventAnchors)planner.roadside(event);
 planner.roadside({id:'hospitality-0',kind:'hospitality',s:track.length-160,side:pit.side,w:24,d:60,margin:9});
 planner.roadside({id:'medical-0',kind:'medical',s:600,side:-1,w:22,d:28,margin:10,approximate:true});
 for(let i=0;i<20;i++)planner.roadside({id:'official-'+i,kind:'official',s:90+i*track.length/20,side:i%2?1:-1,w:i%4===0?23:11,d:19,margin:8,crane:i%4===0});
 for(let i=0;i<12;i++)planner.roadside({id:'utility-'+i,kind:'utility',s:140+i*track.length/12,side:i%2?1:-1,w:9,d:14,margin:5});
 for(const c of HUNGARORING_CORNERS){planner.roadside({id:'turn-'+c.turn,kind:'board',s:c.s-20,side:c.side,w:2,d:1.3,margin:2,label:'T'+c.turn});if([1,2,6,12,13].includes(c.turn))for(const distance of [200,150,100,50].filter(d=>c.turn===1||d!==200))planner.roadside({id:'braking-'+c.turn+'-'+distance,kind:'board',s:c.s-distance,side:c.side,w:2,d:1.3,margin:2,label:String(distance)});}
 for(let i=0;i<20;i++)planner.roadside({id:'banner-'+i,kind:'banner',s:40+i*track.length/20,side:i%2?1:-1,w:1.3,d:18,margin:5,label:['APEX · MAGYAR','SUMMER RACING','MOGYOROD · 25','OPEN WHEEL'][i%4]});
 for(let i=0;i<90;i++)planner.roadside({id:'grass-'+i,kind:'grasspatch',s:i*track.length/90,side:i%2?1:-1,w:9,d:16,offset:48+i%5*18,margin:6});
 for(let i=0;i<14;i++)planner.roadside({id:'horizon-'+i,kind:'horizon',s:i*track.length/14,side:i%2?1:-1,w:24,d:25,offset:700+i%3*100,margin:10,utilityType:i%3,approximate:true});
 for(const [i,f]of data.houses.entries())planner.reserve({...f.envelope,id:'village-'+i,kind:'house',height:5+i%3*2,w:f.envelope.w+3,d:f.envelope.d+3,margin:5,sourceWay:f.way});
 const woods=data.woods.filter(f=>JSON.stringify(f.points[0])===JSON.stringify(f.points.at(-1))).map(f=>f.points.map(p=>localInterlagos(track,p))),trees=[];
 for(let i=0;i<65000&&trees.length<950;i++){const x=(i*.61803398875%1-.5)*2900,z=(i*.41421356237%1-.5)*2900;if(!woods.some(p=>interlagosContains(p,x,z))&&i%5)continue;const scale=.85+i%6*.08,site=planner.reserve({id:'tree-'+i,kind:'tree',x,z,w:12*scale,d:12*scale,scale,heading:i*1.6,type:i%13===0?'pine':'broadleaf',margin:6});if(site)trees.push(site);}
 for(const site of planner.sites){if(site.kind==='bridge-pier')continue;site.y=hungaroringTerrainHeight(track,site.x,site.z)+(['pits','stand','bank','hospitality','medical','official'].includes(site.kind)?.65:0);}
 const foundations=planner.sites.filter(p=>['pits','stand','bank','hospitality','medical','official','camp','parking'].includes(p.kind));const result={...planner,pit,pitBuilding,mapped,trees,foundations,structures,bridge:structures.bridge,beyond:structures.beyond,optionalSkipped,access:hungaroringAccessCorridors(track)};cache.set(track,result);return result;
}
