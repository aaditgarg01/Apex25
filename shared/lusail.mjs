import {LUSAIL_ACCESS} from './lusail-access.mjs';
import {LUSAIL_CORNERS,LUSAIL_EDGES} from './lusail-runoff-data.mjs';
import {pitLayout,pitRoadPose} from './pit-layout.mjs';
import {sample,wrap,angleDiff} from './tracks.mjs';
import {ribbonOffset} from './surface.mjs';
export {LUSAIL_CORNERS,LUSAIL_EDGES};

const lawnCache=new WeakMap(),accessCache=new WeakMap(),roadCache=new WeakMap(),boundaryCache=new WeakMap(),quadCache=new WeakMap();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
const mainWays=new Set(['152483595','1316236347','1316236348']);
function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
export function lusailLocal(track,[lon,lat]){return {x:(lon-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(lat-track.origin.lat)*111320};}
export function lusailAccessCorridors(track){
 if(accessCache.has(track))return accessCache.get(track);const edges=[];
 for(const way of LUSAIL_ACCESS){const points=way.points.map(p=>lusailLocal(track,p));for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],length=Math.hypot(b.x-a.x,b.z-a.z);if(length<.02)continue;
  // Only explicitly identified copies of the main raceway can be deduplicated.
  // Pit entries, the motorcycle penalty loop, karting and access ways stay reserved.
  if(mainWays.has(way.way)){const mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2};let d=Infinity,heading=0;for(let j=0;j<track.points.length;j+=3){const p=track.points[j],gap=segmentDistance(mid,p,track.points[(j+3)%track.points.length]);if(gap<d){d=gap;heading=p.heading;}}if(d<4&&Math.abs(((b.x-a.x)*Math.sin(heading)+(b.z-a.z)*Math.cos(heading))/length)>.94)continue;}
  edges.push({a,b,half:way.width/2,kind:'access',roadType:way.kind,way:way.way,bridge:way.bridge,name:way.name});
 }}
 accessCache.set(track,edges);return edges;
}
function rect(a,b,half){const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,nx=dz/l*half,nz=-dx/l*half;return [{x:a.x-nx,z:a.z-nz},{x:b.x-nx,z:b.z-nz},{x:b.x+nx,z:b.z+nz},{x:a.x+nx,z:a.z+nz}];}
function bounds(poly){return {minX:Math.min(...poly.map(p=>p.x)),maxX:Math.max(...poly.map(p=>p.x)),minZ:Math.min(...poly.map(p=>p.z)),maxZ:Math.max(...poly.map(p=>p.z))};}
function overlap(a,b){for(const ring of [a,b])for(let i=0;i<ring.length;i++){const p=ring[i],q=ring[(i+1)%ring.length],nx=q.z-p.z,nz=p.x-q.x,project=v=>v.x*nx+v.z*nz,aa=a.map(project),bb=b.map(project);if(Math.max(...aa)<Math.min(...bb)-1e-6||Math.max(...bb)<Math.min(...aa)-1e-6)return false;}return true;}
function vertex(track,i,offset){const p=track.points[i],v=ribbonOffset(track,i,offset);return {x:p.x+Math.cos(p.heading)*v,y:p.y,z:p.z-Math.sin(p.heading)*v};}
const CELL=50;
function cells(box,visit){for(let x=Math.floor(box.minX/CELL);x<=Math.floor(box.maxX/CELL);x++)for(let z=Math.floor(box.minZ/CELL);z<=Math.floor(box.maxZ/CELL);z++)visit(x+':'+z);}
function roadPolygons(track){
 if(roadCache.has(track))return roadCache.get(track);const grid=new Map(),add=(poly,kind)=>{const item={poly,kind,...bounds(poly)};cells(item,key=>{if(!grid.has(key))grid.set(key,[]);grid.get(key).push(item);});};
 const half=track.width/2-.018,pit=pitLayout(track);
 track.points.forEach((_,i)=>{const j=(i+1)%track.points.length;add([vertex(track,i,-half),vertex(track,j,-half),vertex(track,j,half),vertex(track,i,half)],'race');});
 for(let d=0;d<pit.length;d+=3){const e=Math.min(pit.length,d+3),h=pit.width/2+.15;add([pitRoadPose(track,d,-h),pitRoadPose(track,e,-h),pitRoadPose(track,e,h),pitRoadPose(track,d,h)],'pit');}
 for(const edge of lusailAccessCorridors(track))add(rect(edge.a,edge.b,edge.half),'access');
 roadCache.set(track,grid);return grid;
}
function hitsRoad(track,poly,filter=()=>true){
 const box=bounds(poly),grid=roadPolygons(track),found=new Set();cells(box,key=>{for(const edge of grid.get(key)||[])found.add(edge);});
 return [...found].some(e=>filter(e)&&box.maxX>=e.minX&&box.minX<=e.maxX&&box.maxZ>=e.minZ&&box.minZ<=e.maxZ&&overlap(poly,e.poly));
}
export const lusailQuadClear=(track,poly)=>!hitsRoad(track,poly);
export const lusailWallClear=(track,a,b,width)=>lusailQuadClear(track,rect(a,b,width/2+.18));
// Render local mapped service/access ribbons only where they can sit on the
// ground, leaving every racing and pit crossing open. Overpasses are separate.
export function lusailAccessSurfaces(track){
 const result=[],raceMinX=Math.min(...track.points.map(p=>p.x))-240,raceMaxX=Math.max(...track.points.map(p=>p.x))+240,raceMinZ=Math.min(...track.points.map(p=>p.z))-240,raceMaxZ=Math.max(...track.points.map(p=>p.z))+240;
 for(const edge of lusailAccessCorridors(track)){
  if(edge.bridge||!['service','primary','secondary','tertiary','residential','track','raceway'].includes(edge.roadType))continue;
  const a=edge.a,b=edge.b,length=Math.hypot(b.x-a.x,b.z-a.z);
  if(Math.max(a.x,b.x)<raceMinX||Math.min(a.x,b.x)>raceMaxX||Math.max(a.z,b.z)<raceMinZ||Math.min(a.z,b.z)>raceMaxZ)continue;
  const at=t=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}),steps=Math.max(1,Math.ceil(length/10));
  for(let i=0;i<steps;i++){
   const poly=rect(at(i/steps),at((i+1)/steps),edge.half*.96);
   if(hitsRoad(track,poly,row=>row.kind!=='access'))continue;
   result.push({way:edge.way,dirt:edge.roadType==='track',poly:poly.map(p=>({...p,y:lusailTerrainHeight(track,p.x,p.z)+.19}))});
  }
 }
 return result;
}

export function lusailBoundaries(track){
 if(boundaryCache.has(track))return boundaryCache.get(track);const half=track.width/2,rows={},access=lusailAccessCorridors(track),probes=access.flatMap(({a,b,half:pad})=>[{...a,pad},{...b,pad},{x:(a.x+b.x)/2,z:(a.z+b.z)/2,pad}]);
 for(const side of [-1,1])rows[side]=track.points.map((p,i)=>{
  const s=i*track.step,base={turn:0,name:'Desert verge',paved:4,paint:1.4,gravel:0,sand:4,grass:0,barrier:'armco',gravelDepth:0,beyond:'service path / drainage / access'};
  const edge=LUSAIL_EDGES.find(e=>e.start<=e.end?s>=e.start&&s<=e.end:s>=e.start||s<=e.end);if(edge)Object.assign(base,edge);
  const corner=LUSAIL_CORNERS.filter(c=>c.side===side&&Math.abs(c.s-s)<c.span).sort((a,b)=>Math.abs(a.s-s)-Math.abs(b.s-s))[0];
  const fade=corner?smooth((corner.span-Math.abs(corner.s-s))/44):0,zone={...base};
  if(corner){Object.assign(zone,corner,{paved:base.paved+(corner.paved-base.paved)*fade,paint:base.paint+(corner.paint-base.paint)*fade,gravel:corner.gravel*fade,sand:base.sand+(corner.sand-base.sand)*fade});if(corner.nearGravel){
    const distance=s-corner.s,starts=corner.turn===10?-40:corner.turn===14?-13:3;zone.gravel*=smooth((distance-starts)/14);
  }}
  const apex=LUSAIL_CORNERS.find(c=>c.side!==side&&Math.abs(c.s-s)<(c.turn===11?40:52)),exitKerb=corner&&s>corner.s-10&&s<corner.s+62;
  const kerb=apex?.kerb||(exitKerb?corner.kerb:null),outer=half+zone.paved+zone.gravel+zone.sand,tx=Math.sin(p.heading),tz=Math.cos(p.heading);let limit=outer;
  function cap(q,pad,divisor){const dx=q.x-p.x,dz=q.z-p.z;if(Math.abs(dx)>outer+30||Math.abs(dz)>outer+30)return;const along=dx*tx+dz*tz,across=(dx*tz-dz*tx)*side;if(Math.abs(along)<half+6&&across>half)limit=Math.min(limit,half+Math.max(1.5,(across-half-pad-2)/divisor));}
  for(let j=0;j<track.points.length;j+=3){const arc=Math.abs(j-i)*track.step;if(Math.min(arc,track.length-arc)>=65)cap(track.points[j],half,2);}
  for(const q of probes)cap(q,q.pad,1);
  const curve=angleDiff(track.points[(i+1)%track.points.length].heading,p.heading)/track.step;if(curve*side>0)limit=Math.min(limit,Math.max(half+1.4,.72/Math.abs(curve)));
  const factor=(limit-half)/(outer-half);
  for(const k of ['paved','paint','gravel','sand'])zone[k]*=factor;
  return {...zone,kerb,offset:limit,nearGravel:zone.nearGravel&&zone.gravel>.06};
 });
 for(const side of [-1,1])for(let pass=0;pass<3;pass++){const old=rows[side].map(r=>r.offset);rows[side].forEach((r,i)=>{const n=old.length,v=Math.min(r.offset,(old[(i+n-1)%n]+2*r.offset+old[(i+1)%n])/4),f=(v-half)/(r.offset-half);for(const k of ['paved','paint','gravel','sand'])r[k]*=f;r.offset=v;});}
 boundaryCache.set(track,rows);return rows;
}
export const lusailBoundaryOffset=(track,i,side)=>lusailBoundaries(track)[side][i].offset;
export const lusailSection=(track,s,side)=>lusailBoundaries(track)[side][Math.floor(wrap(s,track.length)/track.step)];
// Small, isolated paddock lawns use the same footprint in play and in the scene.
export function lusailLawns(track){
 if(lawnCache.has(track))return lawnCache.get(track);
 const lawns=[];
 for(const [id,s,side,w,d] of [['paddock-garden',5100,-1,14,32],['north-garden',250,1,13,25]]){
  for(let offset=45;offset<150;offset+=4){
   const p=sample(track,s,side*offset),margin=3,c=Math.cos(p.heading),sin=Math.sin(p.heading);
   const corners=[[-1,-1],[-1,1],[1,1],[1,-1]].map(([u,v])=>({x:p.x+c*u*(w/2+margin)+sin*v*(d/2+margin),z:p.z-sin*u*(w/2+margin)+c*v*(d/2+margin)}));
   if(!lusailQuadClear(track,corners))continue;
   lawns.push({id,kind:'lawn',x:p.x,z:p.z,y:lusailTerrainHeight(track,p.x,p.z)+.12,w,d,heading:p.heading,margin});break;
  }
 }
 lawnCache.set(track,lawns);return lawns;
}

export function lusailRunoffQuads(track,i,side,kind){
 if(!quadCache.has(track))quadCache.set(track,new Map());const cache=quadCache.get(track),key=kind+':'+side+':'+i;if(cache.has(key))return cache.get(key);
 const rows=lusailBoundaries(track)[side],j=(i+1)%rows.length,half=track.width/2,out=[];
 function range(row){
  const near=row.nearGravel,lead=near?Math.min(row.paved,1.65):row.paved,gravelEnd=lead+row.gravel;
  if(kind==='asphalt')return [[0,lead],[gravelEnd,row.paved+row.gravel]];
  if(kind==='gravel')return [[lead,gravelEnd]];
  if(kind==='sand')return [[row.paved+row.gravel,row.paved+row.gravel+row.sand]];
  if(kind==='paint')return [[.2,Math.min(lead,row.paint,1.65)]];
  if(kind==='accent')return [[Math.min(lead,row.paint,1.65)-.2,Math.min(lead,row.paint,1.65)]];
  if(kind==='kerb')return [[.14,row.kerb?Math.min(lead,row.kerb==='flat'?.88:1.22):.14]];
  return [];
 }
 const A=range(rows[i]),B=range(rows[j]),at=(n,o)=>{const p=vertex(track,n,side*(half+o)),row=rows[n];p.y+=kind==='kerb'?.074+(row.kerb==='rounded'&&n%2?.035:0):kind==='accent'?.056:kind==='paint'?.05:kind==='gravel'?.025:.03;return p;};
 A.forEach((a,k)=>{const b=B[k],width=Math.max(a[1]-a[0],b[1]-b[0]);if(Math.min(a[1]-a[0],b[1]-b[0])<.06)return;const count=Math.ceil(width/2.8);for(let z=0;z<count;z++){const f=z/count,g=(z+1)/count,poly=[at(i,a[0]+(a[1]-a[0])*f),at(j,b[0]+(b[1]-b[0])*f),at(j,b[0]+(b[1]-b[0])*g),at(i,a[0]+(a[1]-a[0])*g)];if(lusailQuadClear(track,poly))out.push(poly);}});
 cache.set(key,out);return out;
}
function contains(poly,p){let pos=false,neg=false;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],c=(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);pos||=c>1e-5;neg||=c< -1e-5;if(pos&&neg)return false;}return true;}
const surfaceProfiles={asphalt:[1,0,0,0],tarmac:[1,.06,.03,.02],paint:[.95,.26,.04,.04],gravel:[.43,.12,1.08,.28],sand:[.28,.06,1.63,.22],grass:[.65,.36,.32,.23]};
export function lusailSurfaceAt(track,s,offset,wetness=0){
 const half=track.width/2,side=offset<0?-1:1,row=lusailSection(track,s,side);let kind='asphalt';
 if(Math.abs(offset)>half){const p=sample(track,s,offset),i=Math.floor(wrap(s,track.length)/track.step),n=track.points.length;kind='sand';
  const r=.015;if(hitsRoad(track,rect({x:p.x-r,z:p.z},{x:p.x+r,z:p.z},r),e=>e.kind!=='race'))kind='asphalt';
  else surfaces:for(const band of ['kerb','paint','gravel','asphalt'])for(const d of [0,-1,1,-2,2])for(const poly of lusailRunoffQuads(track,(i+d+n)%n,side,band))if(contains(poly,p)){kind=band==='asphalt'?'tarmac':band==='kerb'?'paint':band;break surfaces;}
  if(kind==='sand'&&lusailLawns(track).some(lawn=>{const c=Math.cos(lawn.heading),sin=Math.sin(lawn.heading),dx=p.x-lawn.x,dz=p.z-lawn.z;return Math.abs(dx*c-dz*sin)<(lawn.w-.6)/2&&Math.abs(dx*sin+dz*c)<(lawn.d-.6)/2;}))kind='grass';
 }
 const [dry,loss,drag,wetDrag]=surfaceProfiles[kind];return {kind,grip:dry-wetness*loss,drag:drag+wetness*wetDrag,boundary:row.offset,trackLimit:half+1};
}
export const lusailSurfaceY=(track,s)=>sample(track,s).y;
export function lusailConstrainGround(track,x,z,y,cell=18){const pad=track.width/2+Math.SQRT2*cell+track.step;for(let i=0;i<track.points.length;i+=2){const p=track.points[i];if(Math.abs(x-p.x)<pad&&Math.abs(z-p.z)<pad)y=Math.min(y,p.y-.82);}return y;}
export function lusailTerrainHeight(track,x,z,cell=18){let total=0,weight=0;for(let i=0;i<track.points.length;i+=12){const p=track.points[i],w=1/(25+(x-p.x)**2+(z-p.z)**2);total+=(p.y-.86)*w;weight+=w;}return lusailConstrainGround(track,x,z,total/weight,cell);}
