import {MONZA_CROSSINGS} from './monza-access.mjs';
import {monzaBankFootprintClear} from './monza-banking.mjs';
import {terrainHeight} from './tracks.mjs';
const cache=new WeakMap();
export function monzaFootbridge(track){
 if(cache.has(track))return cache.get(track);const source=MONZA_CROSSINGS[0];if(!source){cache.set(track,null);return null;}
 const local=p=>({x:(p[0]-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(p[1]-track.origin.lat)*111320}),a=local(source.points[0]),b=local(source.points.at(-1)),center={x:(a.x+b.x)/2,z:(a.z+b.z)/2},h=Math.atan2(-(b.z-a.z),b.x-a.x),nx=Math.cos(h),nz=-Math.sin(h);let piers=null;
 for(let span=64;span<=160;span+=8){const sites=[-1,1].map(sign=>({id:'bridge-pier-'+sign,kind:'bridge-pier',x:center.x+nx*sign*span/2,z:center.z+nz*sign*span/2,w:4,d:6,heading:h,margin:3}));if(sites.every(site=>monzaBankFootprintClear(track,site,3,true))){piers=sites;break;}}
 if(!piers){cache.set(track,null);return null;}
 const length=Math.hypot(piers[0].x-piers[1].x,piers[0].z-piers[1].z),roadHeights=track.points.filter(p=>Math.hypot(p.x-center.x,p.z-center.z)<length/2+15).map(p=>p.y),deckY=Math.max(...roadHeights,terrainHeight(track,center.x,center.z))+8.5,solids=[],add=(pa,pb,width,height,kind)=>solids.push({a:pa,b:pb,width,height,kind});
 for(const pier of piers){pier.y=terrainHeight(track,pier.x,pier.z)-.85;const height=deckY-pier.y;add({x:pier.x-nx*2,z:pier.z-nz*2,y:pier.y},{x:pier.x+nx*2,z:pier.z+nz*2,y:pier.y},6,height,'footbridge');}
 add({...piers[0],y:deckY},{...piers[1],y:deckY},4,.6,'footbridge');for(const side of [-1,1]){const x=-nz*side*2,z=nx*side*2;add({x:piers[0].x+x,z:piers[0].z+z,y:deckY+.6},{x:piers[1].x+x,z:piers[1].z+z,y:deckY+.6},.1,1.1,'footbridge-rail');}
 const result={...center,id:'mapped-footbridge',kind:'overhead-bridge',w:length+4,d:6,heading:h,width:4,length,deckY,sourceWay:source.way,piers,solids,approximate:'OSM position; fitted support spacing and 8.5m road clearance, not surveyed height'};cache.set(track,result);return result;
}
