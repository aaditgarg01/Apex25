import {MONTREAL_GROUND} from './montreal-ground-data.mjs';
import {MONTREAL_FINAL_WALL} from './montreal-wall-data.mjs';
import {pitLayout,pitRoadPose} from './pit-layout.mjs';
import {sample,nearest} from './tracks.mjs';
import {ribbonOffset} from './surface.mjs';
import {MONTREAL_ACCESS} from './montreal-access.mjs';
const cache=new WeakMap(),accessCache=new WeakMap(),polygonCache=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
import {MONTREAL_CORNERS,MONTREAL_EDGES} from './montreal-runoff-data.mjs';
export {MONTREAL_CORNERS,MONTREAL_EDGES} from './montreal-runoff-data.mjs';
function pointDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
export function montrealAccessCorridors(track){
 if(accessCache.has(track))return accessCache.get(track);const local=p=>({x:(p[0]-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(p[1]-track.origin.lat)*111320}),edges=[];
 for(const road of MONTREAL_ACCESS){const points=road.points.map(local);for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2};let distance=Infinity,roadHeading=0;for(let j=0;j<track.points.length;j+=3){const d=pointDistance(mid,track.points[j],track.points[(j+3)%track.points.length]);if(d<distance){distance=d;roadHeading=track.points[j].heading;}}const length=Math.hypot(b.x-a.x,b.z-a.z),parallel=length>0?Math.abs(((b.x-a.x)*Math.sin(roadHeading)+(b.z-a.z)*Math.cos(roadHeading))/length):1;if(road.kind==='raceway'&&distance<track.width/2+5&&parallel>.96)continue;edges.push({a,b,half:road.kind==='raceway'?Math.min(8,road.width/2+1):road.width/2,kind:'access',way:road.way,name:road.name,bridge:road.bridge});}}
 accessCache.set(track,edges);return edges;
}
function polygonOverlap(a,b){for(const polygon of [a,b])for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length],nx=q.z-p.z,nz=p.x-q.x,project=v=>v.x*nx+v.z*nz,aa=a.map(project),bb=b.map(project);if(Math.max(...aa)<Math.min(...bb)-1e-5||Math.max(...bb)<Math.min(...aa)-1e-5)return false;}return true;}
function accessPolygons(track){if(polygonCache.has(track))return polygonCache.get(track);const polygons=montrealAccessCorridors(track).map(edge=>{const dx=edge.b.x-edge.a.x,dz=edge.b.z-edge.a.z,n=Math.hypot(dx,dz)||1,nx=dz/n*edge.half,nz=-dx/n*edge.half,poly=[{x:edge.a.x-nx,z:edge.a.z-nz},{x:edge.b.x-nx,z:edge.b.z-nz},{x:edge.b.x+nx,z:edge.b.z+nz},{x:edge.a.x+nx,z:edge.a.z+nz}];return {poly,minX:Math.min(...poly.map(p=>p.x)),maxX:Math.max(...poly.map(p=>p.x)),minZ:Math.min(...poly.map(p=>p.z)),maxZ:Math.max(...poly.map(p=>p.z))};});polygonCache.set(track,polygons);return polygons;}
function overlapsAccess(poly,access){const minX=Math.min(...poly.map(p=>p.x)),maxX=Math.max(...poly.map(p=>p.x)),minZ=Math.min(...poly.map(p=>p.z)),maxZ=Math.max(...poly.map(p=>p.z));return access.some(e=>maxX>=e.minX&&minX<=e.maxX&&maxZ>=e.minZ&&minZ<=e.maxZ&&polygonOverlap(poly,e.poly));}
export function montrealWallClear(track,a,b,width){const dx=b.x-a.x,dz=b.z-a.z,n=Math.hypot(dx,dz)||1,nx=dz/n*(width/2+.2),nz=-dx/n*(width/2+.2);return !overlapsAccess([{x:a.x-nx,z:a.z-nz},{x:b.x-nx,z:b.z-nz},{x:b.x+nx,z:b.z+nz},{x:a.x+nx,z:a.z+nz}],accessPolygons(track))&&!overlapsAccess([{x:a.x-nx,z:a.z-nz},{x:b.x-nx,z:b.z-nz},{x:b.x+nx,z:b.z+nz},{x:a.x+nx,z:a.z+nz}],racingPolygons(track))&&!overlapsAccess([{x:a.x-nx,z:a.z-nz},{x:b.x-nx,z:b.z-nz},{x:b.x+nx,z:b.z+nz},{x:a.x+nx,z:a.z+nz}],pitPolygons(track));}
export function montrealBoundaries(track){
 if(cache.has(track))return cache.get(track);const half=track.width/2,result={},access=montrealAccessCorridors(track);
 for(const side of [-1,1])result[side]=track.points.map((p,i)=>{
  const s=i*track.step;let zone={turn:0,name:'Park verge',paved:1.8,paint:.8,gravel:0,grass:1.5,barrier:'concrete'};
  for(const edge of MONTREAL_EDGES)if(edge.start<edge.end?s>=edge.start&&s<=edge.end:s>=edge.start||s<=edge.end)zone={...zone,...edge};
  for(const corner of MONTREAL_CORNERS){if(corner.side!==side)continue;const fade=smooth((corner.span-Math.abs(s-corner.s))/Math.min(45,corner.span*.5));if(fade>0)zone={...corner,paved:1.8+(corner.paved-1.8)*fade,paint:.8+(corner.paint-.8)*fade,gravel:corner.gravel*fade,grass:1.5+(corner.grass-1.5)*fade};}

  let limit=half+zone.paved+zone.gravel+zone.grass;
  const cap=(q,pad,divide=2)=>{const along=(q.x-p.x)*Math.sin(p.heading)+(q.z-p.z)*Math.cos(p.heading),across=((q.x-p.x)*Math.cos(p.heading)-(q.z-p.z)*Math.sin(p.heading))*side;if(Math.abs(along)<half+6&&across>half)limit=Math.min(limit,half+Math.max(1.4,(across-half-pad-2)/divide));};
  for(let j=0;j<track.points.length;j+=2){const arc=Math.abs(j-i)*track.step;if(Math.min(arc,track.length-arc)<65)continue;cap(track.points[j],half);}
  for(const edge of access)for(const q of [edge.a,edge.b,{x:(edge.a.x+edge.b.x)/2,z:(edge.a.z+edge.b.z)/2}])cap(q,edge.half,1);
  const next=track.points[(i+1)%track.points.length],curve=Math.atan2(Math.sin(next.heading-p.heading),Math.cos(next.heading-p.heading))/track.step;if(curve*side>0)limit=Math.min(limit,.72/Math.abs(curve));limit=Math.max(half+1.4,limit);
  const f=Math.min(1,(limit-half)/(zone.paved+zone.gravel+zone.grass));return {...zone,paved:zone.paved*f,paint:zone.paint*f,gravel:zone.gravel*f,grass:zone.grass*f,offset:limit};
 });
 for(const side of [-1,1])for(let pass=0;pass<3;pass++){const values=result[side].map(p=>p.offset);result[side].forEach((p,i)=>{const limit=Math.min(p.offset,(values[(i+values.length-1)%values.length]+p.offset*2+values[(i+1)%values.length])/4),f=(limit-half)/(p.offset-half);for(const key of ['paved','paint','gravel','grass'])p[key]*=f;p.offset=limit;});}
 const corridors=accessPolygons(track),at=(i,offset)=>{const p=track.points[i],o=ribbonOffset(track,i,offset);return {x:p.x+Math.cos(p.heading)*o,z:p.z-Math.sin(p.heading)*o};};
 for(const side of [-1,1])for(let i=0;i<track.points.length;i++){const j=(i+1)%track.points.length;result[side][i].blocked=overlapsAccess([at(i,side*half),at(j,side*half),at(j,side*result[side][j].offset),at(i,side*result[side][i].offset)],corridors);}
 cache.set(track,result);return result;
}
export function montrealRunoffAllowed(track,index,side){return montrealBoundaries(track)[side][index].offset>track.width/2;}
export function montrealBoundaryOffset(track,index,side){return montrealBoundaries(track)[side][index].offset;}
export function montrealSection(track,s,side){const f=((s%track.length)+track.length)%track.length/track.step,i=Math.floor(f),t=f-i,rows=montrealBoundaries(track)[side],a=rows[i],b=rows[(i+1)%rows.length],out={...a};for(const key of ['paved','paint','gravel','grass','offset'])out[key]=a[key]+(b[key]-a[key])*t;return out;}
export function montrealSurfaceAt(track,s,offset,wetness=0){
 const half=track.width/2,d=Math.abs(offset),row=montrealSection(track,s,offset<0?-1:1),kind=d<=half+1.15?'asphalt':montrealPointReserved(track,s,offset)?'asphalt':d<=half+row.paint?'paint':d<=half+row.paved?'tarmac':d<=half+row.paved+row.gravel?'gravel':montrealServiceGravel(track,sample(track,s,offset).x,sample(track,s,offset).z)?'gravel':'grass',profile={asphalt:{grip:1,drag:0},tarmac:{grip:1-wetness*.06,drag:.03},paint:{grip:.94-wetness*.28,drag:.06},gravel:{grip:.43-wetness*.12,drag:1+wetness*.35},grass:{grip:.65-wetness*.35,drag:.3+wetness*.25}}[kind];return {kind,...profile,grip:profile.grip*(kind==='grass'?1-Math.min(.18,Math.abs(montrealSurfaceY(track,s,offset+1)-montrealSurfaceY(track,s,offset-1))*.5*(.2+wetness*.9)):1),boundary:row.offset,trackLimit:half+1};
}

// Keep the original smoothed road anchors; no new road heights or invented hills.
export function montrealSurfaceY(track,s){return sample(track,s).y;}
export function montrealConstrainGround(track,x,z,y,cell=18){const pad=track.width/2+Math.SQRT2*cell+track.step;for(let i=0;i<track.points.length;i+=2){const p=track.points[i];if(Math.abs(x-p.x)<pad&&Math.abs(z-p.z)<pad)y=Math.min(y,p.y-.86);}return y;}
export function montrealTerrainHeight(track,x,z,cell=18){let total=0,weights=0;for(let i=0;i<track.points.length;i+=12){const p=track.points[i],w=1/(25+(x-p.x)**2+(z-p.z)**2);total+=(p.y-.9)*w;weights+=w;}return montrealConstrainGround(track,x,z,total/weights,cell);}

const pitPolygonCache=new WeakMap();
function pitPolygons(track){if(pitPolygonCache.has(track))return pitPolygonCache.get(track);const pit=pitLayout(track),polygons=[];for(let d=0;d<pit.length;d+=3){const end=Math.min(pit.length,d+3),poly=[pitRoadPose(track,d,-pit.width/2-.3),pitRoadPose(track,end,-pit.width/2-.3),pitRoadPose(track,end,pit.width/2+.3),pitRoadPose(track,d,pit.width/2+.3)];polygons.push({poly,minX:Math.min(...poly.map(p=>p.x)),maxX:Math.max(...poly.map(p=>p.x)),minZ:Math.min(...poly.map(p=>p.z)),maxZ:Math.max(...poly.map(p=>p.z))});}pitPolygonCache.set(track,polygons);return polygons;}
const racingPolygonCache=new WeakMap();
function racingPolygons(track){if(racingPolygonCache.has(track))return racingPolygonCache.get(track);const polygons=[];for(let i=0;i<track.points.length;i++){const j=(i+1)%track.points.length,h=track.width/2-.035,at=(n,o)=>{const p=track.points[n],v=ribbonOffset(track,n,o);return {x:p.x+Math.cos(p.heading)*v,z:p.z-Math.sin(p.heading)*v};},poly=[at(i,-h),at(j,-h),at(j,h),at(i,h)];polygons.push({poly,minX:Math.min(...poly.map(p=>p.x)),maxX:Math.max(...poly.map(p=>p.x)),minZ:Math.min(...poly.map(p=>p.z)),maxZ:Math.max(...poly.map(p=>p.z))});}racingPolygonCache.set(track,polygons);return polygons;}
export function montrealQuadClear(track,poly){return !overlapsAccess(poly,accessPolygons(track))&&!overlapsAccess(poly,pitPolygons(track))&&!overlapsAccess(poly,racingPolygons(track));}
export function montrealPointReserved(track,s,offset){const p=sample(track,s,offset),r=.02;return !montrealQuadClear(track,[{x:p.x-r,z:p.z-r},{x:p.x+r,z:p.z-r},{x:p.x+r,z:p.z+r},{x:p.x-r,z:p.z+r}]);}
// Split broad surface bands before the shared complete-quad road mask. This
// preserves the T1 gravel outside the mapped motorcycle long-lap branch.
export function montrealRunoffQuads(track,index,side,kind){
 const rows=montrealBoundaries(track)[side],j=(index+1)%rows.length,half=track.width/2;
 const range=p=>kind==='asphalt'?[half,half+p.paved]:kind==='paint'?[half+1.25,half+p.paint]:kind==='accent'?[half+Math.max(1.6,p.paint-.55),half+p.paint-.2]:kind==='gravel-edge'?[half+p.paved,half+p.paved+([1,9].includes(p.turn)?Math.min(2.5,p.gravel):0)]:kind==='gravel'?[half+p.paved,half+p.paved+p.gravel]:[half+p.paved+p.gravel,p.offset];
 const a=range(rows[index],index*track.step),b=range(rows[j],j*track.step),width=Math.max(a[1]-a[0],b[1]-b[0]),out=[];if(Math.min(a[1]-a[0],b[1]-b[0])<.08)return out;
 const count=Math.max(1,Math.ceil(width/3));for(let strip=0;strip<count;strip++){const f=strip/count,g=(strip+1)/count,at=(n,o)=>{const p=track.points[n],offset=ribbonOffset(track,n,side*o);return {x:p.x+Math.cos(p.heading)*offset,y:montrealSurfaceY(track,n*track.step,offset)+(kind==='accent'?.054:kind==='paint'?.049:kind==='gravel-edge'?.038:.028),z:p.z-Math.sin(p.heading)*offset};},poly=[at(index,a[0]+(a[1]-a[0])*f),at(j,b[0]+(b[1]-b[0])*f),at(j,b[0]+(b[1]-b[0])*g),at(index,a[0]+(a[1]-a[0])*g)];if(montrealQuadClear(track,poly))out.push(poly);}return out;
}

const finalWallCache=new WeakMap();
export function montrealFinalWall(track){
 if(finalWallCache.has(track))return finalWallCache.get(track);const points=MONTREAL_FINAL_WALL.points.map(p=>({x:(p[0]-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(p[1]-track.origin.lat)*111320})),fitted=[];
 for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2);for(let j=0;j<=steps;j++){const p={x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps},seed=track.points.reduce((best,q,index)=>Math.hypot(q.x-p.x,q.z-p.z)<best.distance?{s:index*track.step,distance:Math.hypot(q.x-p.x,q.z-p.z)}:best,{s:0,distance:Infinity}),near=nearest(track,p.x,p.z,seed.s),offset=-Math.max(Math.abs(near.offset),track.width/2+1.85),road=sample(track,near.s,offset);fitted.push({...road,source:p,shift:Math.hypot(p.x-road.x,p.z-road.z),s:near.s});}}
 const walls=[];for(let i=0;i<fitted.length-1;i++){const a=fitted[i],b=fitted[i+1];if(Math.hypot(a.x-b.x,a.z-b.z)<.05||!montrealWallClear(track,a,b,.5))continue;walls.push({a:{...a,y:a.y+.04},b:{...b,y:b.y+.04},width:.5,height:MONTREAL_FINAL_WALL.height,kind:'track',style:'concrete',sourceWay:MONTREAL_FINAL_WALL.way,finalWall:true,inward:{x:Math.cos(a.heading),z:-Math.sin(a.heading)}});}
 const result={walls,points:fitted,maximumShift:Math.max(...fitted.map(p=>p.shift)),greeting:MONTREAL_FINAL_WALL.greeting};finalWallCache.set(track,result);return result;
}

const gravelCache=new WeakMap();
function groundPolygons(track){if(gravelCache.has(track))return gravelCache.get(track);const polygons=MONTREAL_GROUND.gravel.map(f=>f.points.map(p=>({x:(p[0]-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(p[1]-track.origin.lat)*111320})));gravelCache.set(track,polygons);return polygons;}
export function montrealServiceGravel(track,x,z){return groundPolygons(track).some(poly=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;}return inside;});}
export function montrealCanalRails(track){const walls=[];for(const lake of MONTREAL_GROUND.water){if(lake.way==='129924946')continue;const points=lake.points.map(p=>({x:(p[0]-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(p[1]-track.origin.lat)*111320}));for(let i=0;i<points.length-1;i++){const a={...points[i],y:montrealTerrainHeight(track,points[i].x,points[i].z)+.02},b={...points[i+1],y:montrealTerrainHeight(track,points[i+1].x,points[i+1].z)+.02};if(montrealWallClear(track,a,b,.15))walls.push({a,b,width:.15,height:1,kind:'canal-rail',style:'armco'});}}return walls;}
