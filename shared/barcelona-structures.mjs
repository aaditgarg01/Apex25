import {BARCELONA_CROSSINGS} from './barcelona-access.mjs';
import {barcelonaTerrainHeight,barcelonaBoundaryOffset} from './barcelona.mjs';
import {interlagosFootprintClear,interlagosEnvelopeOverlap,localInterlagos} from './interlagos-scenery.mjs';
import {sample} from './tracks.mjs';
const cache=new WeakMap();
export function barcelonaStructures(track){
 if(cache.has(track))return cache.get(track);const sites=[],solids=[],skipped=[],bridges=[];
 const add=(a,b,width,height,kind)=>solids.push({a,b,width,height,kind});
 // Rooftop envelope OSM 1372681544; the final span fits checked supports on
 // opposite sides of all reserved branches. Envelope/height are approximate.
 const sources=[{id:'rooftop',way:'1372681544',x:276.8,z:-360.5,heading:3.7,width:25,span:72,roof:true},...BARCELONA_CROSSINGS.filter(p=>p.way==='152013463').map(p=>{const a=localInterlagos(track,p.points[0]),b=localInterlagos(track,p.points.at(-1));return {id:'footbridge',way:p.way,x:(a.x+b.x)/2,z:(a.z+b.z)/2,heading:Math.atan2(b.x-a.x,b.z-a.z),width:3.2,span:Math.hypot(b.x-a.x,b.z-a.z),roof:false};})];
 for(const source of sources){let {x,z}=source;const nx=Math.sin(source.heading),nz=Math.cos(source.heading);let piers=null,sourceShift=0;
  search:for(let span=Math.max(40,source.span);span<=320;span+=8)for(const size of source.roof?[9,6,4]:[4])for(const shift of [0,10,-10,24,-24,40,-40]){const cx=source.x+nz*shift,cz=source.z-nx*shift,candidates=[-1,1].map(side=>({id:source.id+'-pier-'+side,kind:'bridge-pier',x:cx+nx*side*span/2,z:cz+nz*side*span/2,w:size,d:size+2,heading:source.heading,margin:3}));if(candidates.every(p=>interlagosFootprintClear(track,p,3))){piers=candidates;x=cx;z=cz;sourceShift=shift;break search;}}
  if(!piers){skipped.push(source.id);continue;}const length=Math.hypot(piers[0].x-piers[1].x,piers[0].z-piers[1].z),heights=track.points.filter(p=>Math.hypot(p.x-x,p.z-z)<length/2+20).map(p=>p.y),deckY=Math.max(...heights,barcelonaTerrainHeight(track,x,z))+(source.roof?12:8.5),width=source.width;
  for(const p of piers){p.y=barcelonaTerrainHeight(track,p.x,p.z)-.6;const a={x:p.x-nx*(p.d-1)/2,z:p.z-nz*(p.d-1)/2,y:p.y},b={x:p.x+nx*(p.d-1)/2,z:p.z+nz*(p.d-1)/2,y:p.y};add(a,b,p.w-1,source.roof?Math.max(deckY-p.y+9,30):deckY-p.y,'service-bridge');sites.push(p);}
  add({...piers[0],y:deckY},{...piers[1],y:deckY},width,.65,'service-bridge');
  for(const side of [-1,1])add({x:piers[0].x-nz*side*width/2,z:piers[0].z+nx*side*width/2,y:deckY+.65},{x:piers[1].x-nz*side*width/2,z:piers[1].z+nx*side*width/2,y:deckY+.65},.12,1.1,'service-bridge-rail');
  if(source.roof){for(const level of [4.5,8.5])add({...piers[0],y:deckY+level},{...piers[1],y:deckY+level},width,.4,'rooftop-roof');for(const side of [-1,1])add({x:piers[0].x-nz*side*(width/2-.3),z:piers[0].z+nx*side*(width/2-.3),y:deckY+.7},{x:piers[1].x-nz*side*(width/2-.3),z:piers[1].z+nx*side*(width/2-.3),y:deckY+.7},.15,7.8,'rooftop-glass');}
  bridges.push({...source,x,z,sourceShift,length,deckY,piers,sourceWay:source.way,approximate:true});
 }
 const priorityPit={...sample(track,-20,-40),w:36,d:260};
 const beyond=[];for(let i=0;i<28;i++){const s=i*track.length/28,side=i%2?1:-1,index=Math.floor(s/track.step),offset=barcelonaBoundaryOffset(track,index,side);for(let extra=10;extra<=90;extra+=8){const p=sample(track,s,side*(offset+extra)),site={...p,id:'beyond-'+i,kind:'beyond',w:9,d:23,heading:p.heading,margin:3,s,side,gate:i%5===0,approximate:true};if(interlagosEnvelopeOverlap(site,priorityPit,5)||!interlagosFootprintClear(track,site,3)||sites.some(other=>interlagosEnvelopeOverlap(site,other,3)))continue;site.y=barcelonaTerrainHeight(track,site.x,site.z);sites.push(site);beyond.push(site);if(site.gate){const c=Math.cos(site.heading),h=Math.sin(site.heading),at=(dx,dz)=>({x:site.x+c*dx+h*dz,z:site.z-h*dx+c*dz,y:site.y});for(const direction of [-1,1]){add(at(-3.8,direction*8),at(-3.8,direction*3.5),.1,1.3,'spectator-fence');add(at(-4,direction*3.5),at(-3.6,direction*3.5),.4,1.7,'access-gate');}}break;}}
 const result={sites,solids,bridge:bridges[0]||null,bridges,beyond,skipped};cache.set(track,result);return result;
}
