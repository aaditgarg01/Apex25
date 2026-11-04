// Original reference-fitted verges, based on the FIA map and official aerials.
// Distances use the existing game loop; not a surveyed runoff-width dataset.
// Outside zones: paved escape first, optional gravel behind it, then grass.
const cache=new WeakMap();
const ZONES=[
 {name:'Senna S T1',s:305,span:135,side:-1,paint:24,paved:29,gravel:0,grass:7},
 {name:'Senna S T2',s:485,span:95,side:1,paint:15,paved:19,gravel:0,grass:5},
 {name:'Curva do Sol T3',s:685,span:135,side:-1,paint:12,paved:16,gravel:0,grass:9},
 {name:'Descida do Lago T4',s:1390,span:150,side:-1,paint:13,paved:23,gravel:19,grass:7},
 {name:'Ferradura T6',s:2120,span:135,side:-1,paint:7,paved:12,gravel:13,grass:7},
 {name:'Pinheirinho T8',s:2440,span:95,side:1,paint:5,paved:8,gravel:0,grass:10},
 {name:'Bico de Pato T10',s:2790,span:95,side:-1,paint:5,paved:8,gravel:0,grass:8},
 {name:'Junção T12',s:3340,span:120,side:-1,paint:10,paved:15,gravel:0,grass:7},
 {name:'Subida dos Boxes',s:3850,span:180,side:-1,paint:5,paved:7,gravel:0,grass:8}
];
export const INTERLAGOS_RUNOFF_ZONES=ZONES;
function smooth(v){v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);}
function candidate(track,i,side){const s=i*track.step;let best={paint:0,paved:1.6,gravel:0,grass:4.8,name:'Grass verge'};for(const zone of ZONES){if(zone.side!==side)continue;const delta=Math.abs(s-zone.s),fade=smooth((zone.span-delta)/Math.min(45,zone.span*.4));if(fade<=0)continue;if(zone.paved*fade>best.paved)best={name:zone.name,paint:zone.paint*fade,paved:1.6+(zone.paved-1.6)*fade,gravel:zone.gravel*fade,grass:zone.grass};}return best;}
export function interlagosBoundaries(track){
 if(cache.has(track))return cache.get(track);const half=track.width/2,result={};
 for(const side of [-1,1])result[side]=track.points.map((p,i)=>{
  const zone=candidate(track,i,side),rx=Math.cos(p.heading)*side,rz=-Math.sin(p.heading)*side;let limit=half+zone.paved+zone.gravel+zone.grass;
  // Cap against EVERY other road branch, even the infield inside an escape.
  for(let j=0;j<track.points.length;j+=2){const arc=Math.abs(j-i)*track.step;if(Math.min(arc,track.length-arc)<160)continue;const q=track.points[j],along=(q.x-p.x)*Math.sin(p.heading)+(q.z-p.z)*Math.cos(p.heading),lateral=(q.x-p.x)*rx+(q.z-p.z)*rz;if(Math.abs(along)<half+4&&lateral>half)limit=Math.min(limit,Math.max(half+2,(lateral-half-5)*.5));}
  const delta=track.points[(i+1)%track.points.length].heading-p.heading,k=Math.atan2(Math.sin(delta),Math.cos(delta))/track.step;if(k*side>0)limit=Math.min(limit,.72/Math.abs(k));
  limit=Math.max(half+1.6,limit);const available=Math.max(0,limit-half-2),scale=Math.min(1,available/(zone.paved+zone.gravel||1));return {...zone,paint:Math.min(zone.paint*scale,zone.paved*scale),paved:zone.paved*scale,gravel:zone.gravel*scale,offset:limit};
 });
 // Smooth the safety line conservatively: never expand a locally capped value.
 for(const side of [-1,1])for(let pass=0;pass<3;pass++){const values=result[side].map(p=>p.offset);result[side].forEach((p,i)=>{p.offset=Math.min(p.offset,(values[(i+values.length-1)%values.length]+values[i]*2+values[(i+1)%values.length])/4);const room=Math.max(0,p.offset-half-2),total=p.paved+p.gravel;if(total>room){const f=room/total;p.paved*=f;p.paint*=f;p.gravel*=f;}});}
 cache.set(track,result);return result;
}
export function interlagosBoundaryOffset(track,index,side){return interlagosBoundaries(track)[side][index].offset;}
