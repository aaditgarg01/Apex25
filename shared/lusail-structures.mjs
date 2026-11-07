import {LUSAIL_ACCESS} from './lusail-access.mjs';
import {sample} from './tracks.mjs';
import {interlagosFootprintClear,interlagosEnvelopeOverlap} from './interlagos-scenery.mjs';
import {lusailLocal,lusailTerrainHeight} from './lusail.mjs';

const cache=new WeakMap();
export function lusailStructures(track){
 if(cache.has(track))return cache.get(track);
 const sites=[],solids=[],bridges=[],deckY=Math.max(...track.points.map(p=>p.y))+9.3;
 function makeSpan(id,a,b,width,kind,sourceWay){
  const heading=Math.atan2(b.x-a.x,b.z-a.z),tx=Math.sin(heading),tz=Math.cos(heading),piers=[];
  for(const [end,dir] of [[a,-1],[b,1]]){
   let pier;
   for(const shift of [0,2,4,6,9,13,18,25,32,42]){
    const x=end.x+tx*dir*shift,z=end.z+tz*dir*shift,spec={id:id+'-pier-'+dir,x,z,w:1.2,d:1.2,heading,kind:'pier',margin:1.5};
    if(interlagosFootprintClear(track,spec,spec.margin)&&![...sites,...piers].some(other=>interlagosEnvelopeOverlap(spec,other))){pier={...spec,y:lusailTerrainHeight(track,x,z)};break;}
   }
   if(!pier)return;piers.push(pier);
  }
  sites.push(...piers);
  for(const pier of piers){const p={x:pier.x,y:pier.y,z:pier.z};solids.push({a:{...p,x:p.x-tx*.55,z:p.z-tz*.55},b:{...p,x:p.x+tx*.55,z:p.z+tz*.55},width:1.1,height:deckY-p.y,kind:'lusail-pier'});}
  const [first,last]=piers,deck={a:{x:first.x,y:deckY,z:first.z},b:{x:last.x,y:deckY,z:last.z},width,height:kind==='gantry'?1.3:.52,kind:'lusail-deck'};
  solids.push(deck);bridges.push({...deck,id,kind,sourceWay,heading,length:Math.hypot(last.x-first.x,last.z-first.z)});
  if(kind!=='gantry')for(const side of [-1,1]){const r=side*(width/2-.09),move=v=>({x:v.x+tz*r,y:v.y+deck.height,z:v.z-tx*r});solids.push({a:move(deck.a),b:move(deck.b),width:.15,height:1.05,kind:'lusail-bridge-rail'});}
 }
 const startLeft=sample(track,0,-track.width/2-3),startRight=sample(track,0,track.width/2+3);makeSpan('start-gantry',startLeft,startRight,1.5,'gantry',null);
 for(const id of ['1316236372','1316236376','1316236368']){
  const way=LUSAIL_ACCESS.find(w=>w.way===id&&w.bridge);if(!way)continue;
  makeSpan('footbridge-'+id,lusailLocal(track,way.points[0]),lusailLocal(track,way.points.at(-1)),2.7,'footbridge',id);
 }
 const result={sites,solids,bridges};cache.set(track,result);return result;
}
