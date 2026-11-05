import {sample} from './tracks.mjs';
import {REDBULLRING_DEM} from './redbullring-terrain-data.mjs';
import {ribbonOffset} from './surface.mjs';
import {REDBULLRING_ACCESS} from './redbullring-access.mjs';
const cache=new WeakMap(),accessCache=new WeakMap(),polygonCache=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
// Original widths fitted to retained geometry. Names/order: F1/FIA; surface
// changes: Formula 1 gravel update (2024) and FIA circuit map. Not survey data.
export const REDBULLRING_CORNERS=[
 [1,'Turn 1 · uphill',330,120,1,18,18,8], [2,'Turn 2 · climb',984,95,-1,3,0,9],
 [3,'Turn 3 · crest',1266,120,1,12,25,8], [4,'Turn 4 · downhill',2070,145,1,1.7,30,8],
 [5,'Turn 5',2318,85,1,5,0,10], [6,'Turn 6',2606,125,-1,5,25,9],
 [7,'Turn 7',2930,140,-1,4,22,8], [8,'Turn 8',3158,95,1,10,0,9],
 [9,'Jochen Rindt · Turn 9',3629,130,1,1.4,18,7], [10,'Turn 10',3860,110,1,1.4,18,8]
].map(([turn,name,s,span,side,paved,gravel,grass])=>({turn,name,s,span,side,paved,gravel,grass,paint:Math.min(2.2,paved)}));
function pointDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
export function redbullringAccessCorridors(track){
 if(accessCache.has(track))return accessCache.get(track);const local=p=>({x:(p[0]-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(p[1]-track.origin.lat)*111320}),edges=[];
 for(const road of REDBULLRING_ACCESS){const points=road.points.map(local);for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2};let distance=Infinity,roadHeading=0;for(let j=0;j<track.points.length;j+=3){const d=pointDistance(mid,track.points[j],track.points[(j+3)%track.points.length]);if(d<distance){distance=d;roadHeading=track.points[j].heading;}}const length=Math.hypot(b.x-a.x,b.z-a.z),parallel=length>0?Math.abs(((b.x-a.x)*Math.sin(roadHeading)+(b.z-a.z)*Math.cos(roadHeading))/length):1;if(road.kind==='raceway'&&distance<track.width/2+5&&parallel>.96)continue;edges.push({a,b,half:road.kind==='raceway'?Math.min(8,road.width/2+1):road.width/2,kind:'access',way:road.way,name:road.name,bridge:road.bridge});}}
 accessCache.set(track,edges);return edges;
}
function polygonOverlap(a,b){for(const polygon of [a,b])for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length],nx=q.z-p.z,nz=p.x-q.x,project=v=>v.x*nx+v.z*nz,aa=a.map(project),bb=b.map(project);if(Math.max(...aa)<Math.min(...bb)-1e-5||Math.max(...bb)<Math.min(...aa)-1e-5)return false;}return true;}
function accessPolygons(track){if(polygonCache.has(track))return polygonCache.get(track);const polygons=redbullringAccessCorridors(track).map(edge=>{const dx=edge.b.x-edge.a.x,dz=edge.b.z-edge.a.z,n=Math.hypot(dx,dz)||1,nx=dz/n*edge.half,nz=-dx/n*edge.half,poly=[{x:edge.a.x-nx,z:edge.a.z-nz},{x:edge.b.x-nx,z:edge.b.z-nz},{x:edge.b.x+nx,z:edge.b.z+nz},{x:edge.a.x+nx,z:edge.a.z+nz}];return {poly,minX:Math.min(...poly.map(p=>p.x)),maxX:Math.max(...poly.map(p=>p.x)),minZ:Math.min(...poly.map(p=>p.z)),maxZ:Math.max(...poly.map(p=>p.z))};});polygonCache.set(track,polygons);return polygons;}
function overlapsAccess(poly,access){const minX=Math.min(...poly.map(p=>p.x)),maxX=Math.max(...poly.map(p=>p.x)),minZ=Math.min(...poly.map(p=>p.z)),maxZ=Math.max(...poly.map(p=>p.z));return access.some(e=>maxX>=e.minX&&minX<=e.maxX&&maxZ>=e.minZ&&minZ<=e.maxZ&&polygonOverlap(poly,e.poly));}
export function redbullringWallClear(track,a,b,width){const dx=b.x-a.x,dz=b.z-a.z,n=Math.hypot(dx,dz)||1,nx=dz/n*(width/2+.2),nz=-dx/n*(width/2+.2);return !overlapsAccess([{x:a.x-nx,z:a.z-nz},{x:b.x-nx,z:b.z-nz},{x:b.x+nx,z:b.z+nz},{x:a.x+nx,z:a.z+nz}],accessPolygons(track));}
export function redbullringBoundaries(track){
 if(cache.has(track))return cache.get(track);const half=track.width/2,result={},access=redbullringAccessCorridors(track);
 for(const side of [-1,1])result[side]=track.points.map((p,i)=>{
  const s=i*track.step*4307.069507245204/track.length;let zone={turn:0,name:'Grass verge',paved:1.6,paint:.6,gravel:0,grass:12};
  for(const corner of REDBULLRING_CORNERS){if(corner.side!==side)continue;const fade=smooth((corner.span-Math.abs(s-corner.s))/Math.min(45,corner.span*.5));if(fade>0)zone={...corner,paved:1.6+(corner.paved-1.6)*fade,paint:.6+(corner.paint-.6)*fade,gravel:corner.gravel*fade,grass:12+(corner.grass-12)*fade};}
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
export function redbullringRunoffAllowed(track,index,side){return !redbullringBoundaries(track)[side][index].blocked;}
export function redbullringBoundaryOffset(track,index,side){return redbullringBoundaries(track)[side][index].offset;}
export function redbullringSection(track,s,side){const f=((s%track.length)+track.length)%track.length/track.step,i=Math.floor(f),t=f-i,rows=redbullringBoundaries(track)[side],a=rows[i],b=rows[(i+1)%rows.length],out={...a};for(const key of ['paved','paint','gravel','grass','offset'])out[key]=a[key]+(b[key]-a[key])*t;return out;}
export function redbullringSurfaceAt(track,s,offset,wetness=0){
 const half=track.width/2,d=Math.abs(offset),row=redbullringSection(track,s,offset<0?-1:1),kind=d<=half+1.15?'asphalt':row.blocked?'grass':d<=half+row.paint?'paint':d<=half+row.paved?'tarmac':d<=half+row.paved+row.gravel?'gravel':'grass',profile={asphalt:{grip:1,drag:0},tarmac:{grip:1-wetness*.06,drag:.03},paint:{grip:.94-wetness*.28,drag:.06},gravel:{grip:.43-wetness*.12,drag:1+wetness*.35},grass:{grip:.65-wetness*.35,drag:.3+wetness*.25}}[kind];return {kind,...profile,grip:profile.grip*(kind==='grass'?1-Math.min(.18,Math.abs(redbullringSurfaceY(track,s,offset+1)-redbullringSurfaceY(track,s,offset-1))*.5*(.2+wetness*.9)):1),boundary:row.offset,trackLimit:half+1};
}

// Bilinear sampling of the locally cached terrain grid. Raw DEM is not assumed
// to be a surveyed racing surface; the road keeps its separate refined anchors.
export function redbullringDemHeight(track,x,z){const grid=REDBULLRING_DEM.grid,fx=clamp((x-grid.minX)/grid.spacing,0,grid.width-1),fz=clamp((z-grid.minZ)/grid.spacing,0,grid.height-1),ix=Math.min(grid.width-2,Math.floor(fx)),iz=Math.min(grid.height-2,Math.floor(fz)),tx=fx-ix,tz=fz-iz,at=(a,b)=>grid.values[b*grid.width+a];return (at(ix,iz)*(1-tx)+at(ix+1,iz)*tx)*(1-tz)+(at(ix,iz+1)*(1-tx)+at(ix+1,iz+1)*tx)*tz-track.elevation.min;}
export function redbullringSurfaceY(track,s,offset){const p=sample(track,s),x=p.x+Math.cos(p.heading)*offset,z=p.z-Math.sin(p.heading)*offset,distance=Math.max(0,Math.abs(offset)-track.width/2-1.15),delta=redbullringDemHeight(track,x,z)-redbullringDemHeight(track,p.x,p.z);return p.y+clamp(delta,-distance*.12,distance*.12)*smooth(distance/18);}
export function redbullringConstrainGround(track,x,z,y,cell=18){const rows=redbullringBoundaries(track),pad=Math.SQRT2*cell+track.step;for(let i=0;i<track.points.length;i+=2){const p=track.points[i],dx=x-p.x,dz=z-p.z,along=dx*Math.sin(p.heading)+dz*Math.cos(p.heading),across=dx*Math.cos(p.heading)-dz*Math.sin(p.heading);if(Math.abs(along)<pad&&across>-rows[-1][i].offset-pad&&across<rows[1][i].offset+pad)y=Math.min(y,redbullringSurfaceY(track,i*track.step,across)-.85);}return y;}
export function redbullringTerrainHeight(track,x,z,cell=18){let best=Infinity,index=0;for(let i=0;i<track.points.length;i+=3){const candidate=track.points[i],d=(candidate.x-x)**2+(candidate.z-z)**2;if(d<best){best=d;index=i;}}const p=track.points[index],across=(x-p.x)*Math.cos(p.heading)-(z-p.z)*Math.sin(p.heading),row=redbullringBoundaries(track)[across<0?-1:1][index],distance=Math.sqrt(best),blend=smooth((distance-row.offset)/85),near=redbullringSurfaceY(track,index*track.step,across)-.85;return redbullringConstrainGround(track,x,z,near*(1-blend)+redbullringDemHeight(track,x,z)*blend,cell);}
