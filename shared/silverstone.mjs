import {ribbonOffset} from './surface.mjs';
import {SILVERSTONE_ACCESS} from './silverstone-access.mjs';
const cache=new WeakMap(),accessCache=new WeakMap(),polygonCache=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
// Original widths fitted to retained geometry. Names/order: F1/FIA; surface
// changes: Silverstone maintenance guide and FIA 2024 event notes. Not survey data.
export const SILVERSTONE_CORNERS=[
 [1,'Abbey',249,150,1,44,0,6], [2,'Farm',489,90,-1,5,0,12],
 [3,'Village',738,100,1,12,14,6], [4,'The Loop',882,85,-1,10,0,10],
 [5,'Aintree',1086,110,-1,9,0,10], [6,'Brooklands',1845,115,-1,13,22,7],
 [7,'Luffield',2040,145,1,3,26,8], [8,'Woodcote',2335,110,1,8,0,10],
 [9,'Copse',2930,165,1,40,0,10], [10,'Maggotts',3452,85,-1,13,9,6],
 [11,'Maggotts',3560,90,1,17,12,7], [12,'Becketts',3743,95,-1,17,15,7],
 [13,'Becketts',3878,85,1,19,16,6], [14,'Chapel',4037,115,1,4,22,8],
 [15,'Stowe',4905,160,1,4,32,8], [16,'Vale',5359,75,-1,1.7,18,6],
 [17,'Club',5456,65,1,16,0,7], [18,'Club',5609,100,1,12,0,8]
].map(([turn,name,s,span,side,paved,gravel,grass])=>({turn,name,s,span,side,paved,gravel,grass,paint:Math.min(2.2,paved)}));
function pointDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
export function silverstoneAccessCorridors(track){
 if(accessCache.has(track))return accessCache.get(track);const local=p=>({x:(p[0]-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(p[1]-track.origin.lat)*111320}),edges=[];
 for(const road of SILVERSTONE_ACCESS){const points=road.points.map(local);for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2};let distance=Infinity;for(let j=0;j<track.points.length;j+=3)distance=Math.min(distance,pointDistance(mid,track.points[j],track.points[(j+3)%track.points.length]));if(distance<track.width/2+5)continue;edges.push({a,b,half:road.kind==='raceway'?Math.min(8,road.width/2+1):road.width/2,kind:'access',way:road.way,name:road.name,bridge:road.bridge});}}
 accessCache.set(track,edges);return edges;
}
function polygonOverlap(a,b){for(const polygon of [a,b])for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length],nx=q.z-p.z,nz=p.x-q.x,project=v=>v.x*nx+v.z*nz,aa=a.map(project),bb=b.map(project);if(Math.max(...aa)<Math.min(...bb)-1e-5||Math.max(...bb)<Math.min(...aa)-1e-5)return false;}return true;}
function accessPolygons(track){if(polygonCache.has(track))return polygonCache.get(track);const polygons=silverstoneAccessCorridors(track).map(edge=>{const dx=edge.b.x-edge.a.x,dz=edge.b.z-edge.a.z,n=Math.hypot(dx,dz)||1,nx=dz/n*edge.half,nz=-dx/n*edge.half,poly=[{x:edge.a.x-nx,z:edge.a.z-nz},{x:edge.b.x-nx,z:edge.b.z-nz},{x:edge.b.x+nx,z:edge.b.z+nz},{x:edge.a.x+nx,z:edge.a.z+nz}];return {poly,minX:Math.min(...poly.map(p=>p.x)),maxX:Math.max(...poly.map(p=>p.x)),minZ:Math.min(...poly.map(p=>p.z)),maxZ:Math.max(...poly.map(p=>p.z))};});polygonCache.set(track,polygons);return polygons;}
function overlapsAccess(poly,access){const minX=Math.min(...poly.map(p=>p.x)),maxX=Math.max(...poly.map(p=>p.x)),minZ=Math.min(...poly.map(p=>p.z)),maxZ=Math.max(...poly.map(p=>p.z));return access.some(e=>maxX>=e.minX&&minX<=e.maxX&&maxZ>=e.minZ&&minZ<=e.maxZ&&polygonOverlap(poly,e.poly));}
export function silverstoneWallClear(track,a,b,width){const dx=b.x-a.x,dz=b.z-a.z,n=Math.hypot(dx,dz)||1,nx=dz/n*(width/2+.2),nz=-dx/n*(width/2+.2);return !overlapsAccess([{x:a.x-nx,z:a.z-nz},{x:b.x-nx,z:b.z-nz},{x:b.x+nx,z:b.z+nz},{x:a.x+nx,z:a.z+nz}],accessPolygons(track));}
export function silverstoneBoundaries(track){
 if(cache.has(track))return cache.get(track);const half=track.width/2,result={},access=silverstoneAccessCorridors(track);
 for(const side of [-1,1])result[side]=track.points.map((p,i)=>{
  const s=i*track.step*5884.436018217554/track.length;let zone={turn:0,name:'Grass verge',paved:1.6,paint:.6,gravel:0,grass:12};
  for(const corner of SILVERSTONE_CORNERS){if(corner.side!==side)continue;const fade=smooth((corner.span-Math.abs(s-corner.s))/Math.min(45,corner.span*.5));if(fade>0)zone={...corner,paved:1.6+(corner.paved-1.6)*fade,paint:.6+(corner.paint-.6)*fade,gravel:corner.gravel*fade,grass:12+(corner.grass-12)*fade};}
  let limit=half+zone.paved+zone.gravel+zone.grass;
  const cap=(q,pad)=>{const along=(q.x-p.x)*Math.sin(p.heading)+(q.z-p.z)*Math.cos(p.heading),across=((q.x-p.x)*Math.cos(p.heading)-(q.z-p.z)*Math.sin(p.heading))*side;if(Math.abs(along)<half+6&&across>half)limit=Math.min(limit,half+Math.max(1.4,(across-half-pad-5)/2));};
  for(let j=0;j<track.points.length;j+=2){const arc=Math.abs(j-i)*track.step;if(Math.min(arc,track.length-arc)<65)continue;cap(track.points[j],half);}
  for(const edge of access)for(const q of [edge.a,edge.b,{x:(edge.a.x+edge.b.x)/2,z:(edge.a.z+edge.b.z)/2}])cap(q,edge.half);
  const next=track.points[(i+1)%track.points.length],curve=Math.atan2(Math.sin(next.heading-p.heading),Math.cos(next.heading-p.heading))/track.step;if(curve*side>0)limit=Math.min(limit,.72/Math.abs(curve));limit=Math.max(half+1.4,limit);
  const f=Math.min(1,(limit-half)/(zone.paved+zone.gravel+zone.grass));return {...zone,paved:zone.paved*f,paint:zone.paint*f,gravel:zone.gravel*f,grass:zone.grass*f,offset:limit};
 });
 for(const side of [-1,1])for(let pass=0;pass<3;pass++){const values=result[side].map(p=>p.offset);result[side].forEach((p,i)=>{const limit=Math.min(p.offset,(values[(i+values.length-1)%values.length]+p.offset*2+values[(i+1)%values.length])/4),f=(limit-half)/(p.offset-half);for(const key of ['paved','paint','gravel','grass'])p[key]*=f;p.offset=limit;});}
 const corridors=accessPolygons(track),at=(i,offset)=>{const p=track.points[i],o=ribbonOffset(track,i,offset);return {x:p.x+Math.cos(p.heading)*o,z:p.z-Math.sin(p.heading)*o};};
 for(const side of [-1,1])for(let i=0;i<track.points.length;i++){const j=(i+1)%track.points.length;result[side][i].blocked=overlapsAccess([at(i,side*half),at(j,side*half),at(j,side*result[side][j].offset),at(i,side*result[side][i].offset)],corridors);}
 cache.set(track,result);return result;
}
export function silverstoneRunoffAllowed(track,index,side){return !silverstoneBoundaries(track)[side][index].blocked;}
export function silverstoneBoundaryOffset(track,index,side){return silverstoneBoundaries(track)[side][index].offset;}
export function silverstoneSection(track,s,side){const f=((s%track.length)+track.length)%track.length/track.step,i=Math.floor(f),t=f-i,rows=silverstoneBoundaries(track)[side],a=rows[i],b=rows[(i+1)%rows.length],out={...a};for(const key of ['paved','paint','gravel','grass','offset'])out[key]=a[key]+(b[key]-a[key])*t;return out;}
export function silverstoneSurfaceAt(track,s,offset,wetness=0){
 const half=track.width/2,d=Math.abs(offset),row=silverstoneSection(track,s,offset<0?-1:1),kind=d<=half+1.15?'asphalt':row.blocked?'grass':d<=half+row.paint?'paint':d<=half+row.paved?'tarmac':d<=half+row.paved+row.gravel?'gravel':'grass',profile={asphalt:{grip:1,drag:0},tarmac:{grip:1-wetness*.06,drag:.03},paint:{grip:.94-wetness*.28,drag:.06},gravel:{grip:.43-wetness*.12,drag:1+wetness*.35},grass:{grip:.65-wetness*.35,drag:.3+wetness*.25}}[kind];return {kind,...profile,boundary:row.offset,trackLimit:half+1};
}
