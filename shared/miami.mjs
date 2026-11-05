// Original reference-fitted station widths. Colour/prop artwork is original.
// FIA 2025 map + organiser's T6–8 marina description; not surveyed runoff widths.
const cache=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
export const MIAMI_CORNERS=[
 {turn:1,s:290,span:115,side:1,paved:18,paint:12,grass:3},
 {turn:2,s:420,span:65,side:1,paved:4,paint:3,grass:2},
 {turn:3,s:525,span:75,side:1,paved:6,paint:4,grass:3},
 {turn:4,s:735,span:65,side:1,paved:5,paint:3,grass:3},
 {turn:5,s:990,span:85,side:-1,paved:12,paint:8,grass:3},
 {turn:6,s:1170,span:100,side:1,paved:26,paint:22,grass:3},
 {turn:7,s:1400,span:95,side:-1,paved:32,paint:28,grass:2},
 {turn:8,s:1550,span:95,side:-1,paved:25,paint:21,grass:3},
 {turn:9,s:1830,span:70,side:-1,paved:5,paint:3,grass:3},
 {turn:10,s:2240,span:90,side:-1,paved:5,paint:3,grass:2},
 {turn:11,s:2980,span:110,side:-1,paved:19,paint:14,grass:3},
 {turn:12,s:3100,span:75,side:1,paved:8,paint:5,grass:3},
 {turn:13,s:3210,span:65,side:-1,paved:4,paint:2,grass:2},
 {turn:14,s:3315,span:55,side:-1,paved:3,paint:2,grass:1},
 {turn:15,s:3390,span:55,side:1,paved:3,paint:2,grass:1},
 {turn:16,s:3490,span:65,side:-1,paved:5,paint:3,grass:2},
 {turn:17,s:4760,span:110,side:-1,paved:20,paint:15,grass:3},
 {turn:18,s:4990,span:65,side:-1,paved:5,paint:3,grass:2},
 {turn:19,s:5200,span:85,side:1,paved:6,paint:4,grass:2}
].map(p=>({...p,gravel:[1,17].includes(p.turn)?4:0,gravelApproximate:[1,17].includes(p.turn)})); // Small artistic gravel beds behind paved braking escapes; not surveyed locations.
export function miamiBoundaries(track){
 if(cache.has(track))return cache.get(track);const half=track.width/2,result={};
 for(const side of [-1,1])result[side]=track.points.map((p,i)=>{
  const s=i*track.step*5421.514544168808/track.length;let zone={turn:0,paved:1.8,paint:.5,gravel:0,grass:1.8};
  for(const corner of MIAMI_CORNERS){if(corner.side!==side)continue;const fade=smooth((corner.span-Math.abs(s-corner.s))/Math.min(40,corner.span*.5));if(fade>0)zone={...corner,paved:1.8+(corner.paved-1.8)*fade,paint:.5+(corner.paint-.5)*fade,grass:1.8+(corner.grass-1.8)*fade};}
  let limit=half+zone.paved+zone.gravel+zone.grass;
  for(let j=0;j<track.points.length;j+=2){const arc=Math.abs(j-i)*track.step;if(Math.min(arc,track.length-arc)<65)continue;const q=track.points[j],along=(q.x-p.x)*Math.sin(p.heading)+(q.z-p.z)*Math.cos(p.heading),across=((q.x-p.x)*Math.cos(p.heading)-(q.z-p.z)*Math.sin(p.heading))*side;if(Math.abs(along)<half+5&&across>half)limit=Math.min(limit,half+Math.max(1.4,(across-2*half-5)/2));}
  const next=track.points[(i+1)%track.points.length],curve=Math.atan2(Math.sin(next.heading-p.heading),Math.cos(next.heading-p.heading))/track.step;if(curve*side>0)limit=Math.min(limit,.72/Math.abs(curve));limit=Math.max(half+1.4,limit);
  const f=Math.min(1,(limit-half)/(zone.paved+zone.gravel+zone.grass));return {...zone,paved:zone.paved*f,paint:zone.paint*f,gravel:zone.gravel*f,grass:zone.grass*f,offset:limit};
 });
 for(const side of [-1,1])for(let pass=0;pass<3;pass++){const values=result[side].map(p=>p.offset);result[side].forEach((p,i)=>{const limit=Math.min(p.offset,(values[(i+values.length-1)%values.length]+p.offset*2+values[(i+1)%values.length])/4),f=(limit-half)/(p.offset-half);for(const k of ['paved','paint','gravel','grass'])p[k]*=f;p.offset=limit;});}
 cache.set(track,result);return result;
}
export function miamiBoundaryOffset(track,index,side){return miamiBoundaries(track)[side][index].offset;}
export function miamiSection(track,s,side){const f=((s%track.length)+track.length)%track.length/track.step,i=Math.floor(f),t=f-i,rows=miamiBoundaries(track)[side],a=rows[i],b=rows[(i+1)%rows.length],out={...a};for(const k of ['paved','paint','gravel','grass','offset'])out[k]=a[k]+(b[k]-a[k])*t;return out;}
export function miamiSurfaceAt(track,s,offset,wetness=0){
 const half=track.width/2,distance=Math.abs(offset),row=miamiSection(track,s,offset<0?-1:1);let kind=distance<=half+1.15?'asphalt':distance<=half+row.paint?'paint':distance<=half+row.paved?'tarmac':distance<=half+row.paved+row.gravel?'gravel':'grass';
 const profile={asphalt:{grip:1,drag:0},tarmac:{grip:1-wetness*.06,drag:.03},paint:{grip:.94-wetness*.28,drag:.06},gravel:{grip:.43-wetness*.12,drag:1+wetness*.35},grass:{grip:.65-wetness*.35,drag:.3+wetness*.25}}[kind];return {kind,...profile,boundary:row.offset,trackLimit:half+1};
}

export function miamiWallClear(track,a,b,width){
 const pad=track.width/2+width/2+.7;
 for(const p of [a,b,{x:(a.x+b.x)/2,z:(a.z+b.z)/2}])for(let i=0;i<track.points.length;i++){
  const u=track.points[i],v=track.points[(i+1)%track.points.length],dx=v.x-u.x,dz=v.z-u.z,t=clamp(((p.x-u.x)*dx+(p.z-u.z)*dz)/(dx*dx+dz*dz||1),0,1);
  if(Math.hypot(p.x-u.x-t*dx,p.z-u.z-t*dz)<pad)return false;
 }return true;
}
