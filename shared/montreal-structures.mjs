import {MONTREAL_ACCESS} from './montreal-access.mjs';
import {montrealTerrainHeight} from './montreal.mjs';
import {interlagosFootprintClear,localInterlagos} from './interlagos-scenery.mjs';
const cache=new WeakMap();
export function montrealStructures(track){
 if(cache.has(track))return cache.get(track);const sites=[],solids=[],bridges=[];
 for(const way of MONTREAL_ACCESS.filter(r=>r.bridge&&['footway','pedestrian','path'].includes(r.kind))){
  const a=localInterlagos(track,way.points[0]),b=localInterlagos(track,way.points.at(-1)),length=Math.hypot(b.x-a.x,b.z-a.z),x=(a.x+b.x)/2,z=(a.z+b.z)/2,distance=Math.min(...track.points.map(p=>Math.hypot(p.x-x,p.z-z)));
  if(length<15||length>65||distance>120||bridges.length>=4)continue;
  const heading=Math.atan2(b.x-a.x,b.z-a.z),width=3.2,deckY=Math.max(...track.points.filter(p=>Math.hypot(p.x-x,p.z-z)<length/2+20).map(p=>p.y),montrealTerrainHeight(track,x,z))+8.5,piers=[];
  for(const end of [-1,1]){let chosen=null;outer:for(const along of [length/2,length/2+4,length/2+8])for(const side of [-1,1])for(const offset of [4,6,8,10]){const site={id:'bridge-'+way.way+'-'+end,kind:'bridge-pier',x:x+Math.sin(heading)*along*end+Math.cos(heading)*offset*side,z:z+Math.cos(heading)*along*end-Math.sin(heading)*offset*side,w:2,d:2,heading,margin:2,sourceWay:way.way};if(interlagosFootprintClear(track,site,2)){chosen=site;break outer;}}if(chosen)piers.push(chosen);}
  if(piers.length!==2)continue;
  const bridge={id:'bridge-'+way.way,sourceWay:way.way,x,z,heading,length,width,deckY,piers,approximate:true};bridges.push(bridge);sites.push(...piers);
  const at=(along,across,y)=>({x:x+Math.sin(heading)*along+Math.cos(heading)*across,z:z+Math.cos(heading)*along-Math.sin(heading)*across,y});
  solids.push({a:at(-length/2,0,deckY),b:at(length/2,0,deckY),width,height:.5,kind:'canal-bridge'});
  for(const side of [-1,1])solids.push({a:at(-length/2,side*(width/2-.12),deckY+.5),b:at(length/2,side*(width/2-.12),deckY+.5),width:.16,height:1.1,kind:'canal-bridge-rail'});
  for(const site of piers){site.y=montrealTerrainHeight(track,site.x,site.z);solids.push({a:{x:site.x-Math.sin(heading)*.9,z:site.z-Math.cos(heading)*.9,y:site.y},b:{x:site.x+Math.sin(heading)*.9,z:site.z+Math.cos(heading)*.9,y:site.y},width:1.8,height:deckY-site.y,kind:'canal-bridge-pier'});}
 }
 const result={sites,bridges,solids};cache.set(track,result);return result;
}
