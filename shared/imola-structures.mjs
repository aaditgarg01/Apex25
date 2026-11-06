import {IMOLA_PARK_BRIDGES,IMOLA_PARK_GATES} from './imola-access.mjs';
import {imolaTerrainHeight} from './imola.mjs';
import {interlagosFootprintClear,localInterlagos,interlagosEnvelopeOverlap} from './interlagos-scenery.mjs';
const cache=new WeakMap();
export function imolaParkStructures(track){
 if(cache.has(track))return cache.get(track);const sites=[],solids=[],skipped=[];
 const add=(a,b,width,height,kind)=>solids.push({a,b,width,height,kind});
 for(const source of IMOLA_PARK_BRIDGES){const a=localInterlagos(track,source.points[0]),b=localInterlagos(track,source.points.at(-1)),length=Math.hypot(b.x-a.x,b.z-a.z),heading=Math.atan2(-(b.z-a.z),b.x-a.x),site={id:'park-bridge-'+source.way,kind:'park-bridge',x:(a.x+b.x)/2,z:(a.z+b.z)/2,w:length+3,d:5,heading,margin:4,sourceWay:source.way,approximate:true};if(!interlagosFootprintClear(track,site,4)){skipped.push(site.id);continue;}
  site.y=imolaTerrainHeight(track,site.x,site.z);const deck=Math.max(imolaTerrainHeight(track,a.x,a.z),imolaTerrainHeight(track,b.x,b.z))+1.1,normal={x:-(b.z-a.z)/(length||1),z:(b.x-a.x)/(length||1)};
  add({...a,y:deck},{...b,y:deck},2.7,.24,'park-masonry');for(const sign of [-1,1])add({x:a.x+normal.x*sign*1.4,z:a.z+normal.z*sign*1.4,y:deck+.24},{x:b.x+normal.x*sign*1.4,z:b.z+normal.z*sign*1.4,y:deck+.24},.12,.85,'park-rail');sites.push(site);
 }
 for(const source of IMOLA_PARK_GATES){if(sites.filter(s=>s.kind==='park-gate').length>=3)break;const p=localInterlagos(track,source.location),site={...p,id:'park-gate-'+source.node,kind:'park-gate',w:9,d:4,heading:0,margin:5,sourceNode:source.node,approximate:true};if(!interlagosFootprintClear(track,site,5)||sites.some(s=>interlagosEnvelopeOverlap(site,s,4))){skipped.push(site.id);continue;}site.y=imolaTerrainHeight(track,p.x,p.z);for(const sign of [-1,1]){const x=p.x+sign*3.5;add({x:x-.4,z:p.z,y:site.y},{x:x+.4,z:p.z,y:site.y},.8,2.3,'park-masonry');add({x:x-sign*1.9,z:p.z,y:site.y+.35},{x:x-sign*.7,z:p.z,y:site.y+.35},.12,1,'park-rail');}sites.push(site);}
 const result={sites,solids,skipped};cache.set(track,result);return result;
}
