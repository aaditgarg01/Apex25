import {ZANDVOORT_SURFACE_PLAN,ZANDVOORT_BANKING} from './zandvoort-road-data.mjs';
import {bankingAt} from './banked-road.mjs';
const cache=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
export function zandvoortBoundaries(track){
 if(cache.has(track))return cache.get(track);const half=track.width/2,result={};
 for(const side of [-1,1])result[side]=track.points.map((p,i)=>{
  const station=i*track.step*ZANDVOORT_BANKING.nominalLength/track.length;let shape={turn:0,name:'Dune verge',tarmac:1.6,gravel:0,grass:3,sand:5};
  for(const zone of ZANDVOORT_SURFACE_PLAN){if(zone.side!==side)continue;const blend=smooth((zone.span-Math.abs(station-zone.s))/Math.min(40,zone.span*.45));if(blend>0)shape={...zone,tarmac:1.6+(zone.tarmac-1.6)*blend,gravel:zone.gravel*blend,grass:3+(zone.grass-3)*blend,sand:5+(zone.sand-5)*blend};}
  const requested=shape.tarmac+shape.gravel+shape.grass+shape.sand;let offset=half+requested;
  // Expand only into clear space, using every other branch, not just this bend.
  for(let j=0;j<track.points.length;j+=2){const arc=Math.abs(j-i)*track.step;if(Math.min(arc,track.length-arc)<150)continue;const q=track.points[j],along=(q.x-p.x)*Math.sin(p.heading)+(q.z-p.z)*Math.cos(p.heading),across=((q.x-p.x)*Math.cos(p.heading)-(q.z-p.z)*Math.sin(p.heading))*side;if(Math.abs(along)<half+6&&across>half)offset=Math.min(offset,half+Math.max(2,(across-2*half-6)/2));}
  const next=track.points[(i+1)%track.points.length],k=Math.atan2(Math.sin(next.heading-p.heading),Math.cos(next.heading-p.heading))/track.step;if(k*side>0)offset=Math.min(offset,.74/Math.abs(k));
  offset=Math.max(half+1.8,offset);const scale=Math.min(1,(offset-half)/requested);for(const key of ['tarmac','gravel','grass','sand'])shape[key]*=scale;return {...shape,offset};
 });
 for(const side of [-1,1])for(let pass=0;pass<3;pass++){const heights=result[side].map(p=>p.offset);result[side].forEach((p,i)=>{const next=Math.min(p.offset,(heights[(i+heights.length-1)%heights.length]+2*heights[i]+heights[(i+1)%heights.length])/4),scale=(next-half)/(p.offset-half);p.offset=next;for(const key of ['tarmac','gravel','grass','sand'])p[key]*=scale;});}
 cache.set(track,result);return result;
}
export function zandvoortBoundaryOffset(track,index,side){return zandvoortBoundaries(track)[side][index].offset;}
export function zandvoortSection(track,station,side){const f=((station%track.length)+track.length)%track.length/track.step,i=Math.floor(f),t=f-i,rows=zandvoortBoundaries(track)[side],a=rows[i],b=rows[(i+1)%rows.length],out={...a};for(const k of ['tarmac','gravel','grass','sand','offset'])out[k]=a[k]+(b[k]-a[k])*t;return out;}
export function zandvoortSurfaceAt(track,station,offset,wetness=0){
 const distance=Math.abs(offset),half=track.width/2,side=offset<0?-1:1,section=zandvoortSection(track,station,side);let kind='asphalt';
 if(distance>half+1.2){let edge=half;kind='dune';for(const type of ['tarmac','gravel','grass','sand']){edge+=section[type];if(distance<=edge){kind=type;break;}}}
 const settings={asphalt:{grip:1,drag:0,pace:1},tarmac:{grip:1-wetness*.08,drag:.035,pace:.98},gravel:{grip:.43-wetness*.12,drag:.95+wetness*.4,pace:.45},grass:{grip:.63-wetness*.35,drag:.28+wetness*.25,pace:.65},sand:{grip:.30-wetness*.1,drag:1.4+wetness*.3,pace:.3},dune:{grip:.14,drag:3.8,pace:.1}}[kind];
 return {kind,...settings,boundary:section.offset,trackLimit:half+1,bank:bankingAt(track,station,offset)};
}
