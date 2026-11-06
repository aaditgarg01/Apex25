import {YASMARINA_COAST} from './yasmarina-coast-data.mjs';
import {pitLayout,pitRoadPose} from './pit-layout.mjs';
import {sample,nearest} from './tracks.mjs';
import {ribbonOffset} from './surface.mjs';
import {YASMARINA_ACCESS} from './yasmarina-access.mjs';
const cache=new WeakMap(),accessCache=new WeakMap(),polygonCache=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
import {YASMARINA_CORNERS,YASMARINA_EDGES} from './yasmarina-runoff-data.mjs';
export {YASMARINA_CORNERS,YASMARINA_EDGES} from './yasmarina-runoff-data.mjs';
function pointDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
export function yasmarinaAccessCorridors(track){
 if(accessCache.has(track))return accessCache.get(track);const local=p=>({x:(p[0]-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(p[1]-track.origin.lat)*111320}),edges=[];
 for(const road of YASMARINA_ACCESS){const points=road.points.map(local);for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2};let distance=Infinity,roadHeading=0;for(let j=0;j<track.points.length;j+=3){const d=pointDistance(mid,track.points[j],track.points[(j+3)%track.points.length]);if(d<distance){distance=d;roadHeading=track.points[j].heading;}}const length=Math.hypot(b.x-a.x,b.z-a.z),parallel=length>0?Math.abs(((b.x-a.x)*Math.sin(roadHeading)+(b.z-a.z)*Math.cos(roadHeading))/length):1;if(road.kind==='raceway'&&distance<track.width/2+5&&parallel>.96)continue;edges.push({a,b,half:road.kind==='raceway'?Math.min(8,road.width/2+1):['footway','path','steps','pedestrian'].includes(road.kind)?1.3:road.width/2,kind:'access',way:road.way,name:road.name,bridge:road.bridge});}}
 accessCache.set(track,edges);return edges;
}
function polygonOverlap(a,b){for(const polygon of [a,b])for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length],nx=q.z-p.z,nz=p.x-q.x,project=v=>v.x*nx+v.z*nz,aa=a.map(project),bb=b.map(project);if(Math.max(...aa)<Math.min(...bb)-1e-5||Math.max(...bb)<Math.min(...aa)-1e-5)return false;}return true;}
function accessPolygons(track){if(polygonCache.has(track))return polygonCache.get(track);const polygons=yasmarinaAccessCorridors(track).map(edge=>{const dx=edge.b.x-edge.a.x,dz=edge.b.z-edge.a.z,n=Math.hypot(dx,dz)||1,nx=dz/n*edge.half,nz=-dx/n*edge.half,poly=[{x:edge.a.x-nx,z:edge.a.z-nz},{x:edge.b.x-nx,z:edge.b.z-nz},{x:edge.b.x+nx,z:edge.b.z+nz},{x:edge.a.x+nx,z:edge.a.z+nz}];return {poly,minX:Math.min(...poly.map(p=>p.x)),maxX:Math.max(...poly.map(p=>p.x)),minZ:Math.min(...poly.map(p=>p.z)),maxZ:Math.max(...poly.map(p=>p.z))};});polygonCache.set(track,polygons);return polygons;}
function overlapsAccess(poly,access){const minX=Math.min(...poly.map(p=>p.x)),maxX=Math.max(...poly.map(p=>p.x)),minZ=Math.min(...poly.map(p=>p.z)),maxZ=Math.max(...poly.map(p=>p.z));return access.some(e=>maxX>=e.minX&&minX<=e.maxX&&maxZ>=e.minZ&&minZ<=e.maxZ&&polygonOverlap(poly,e.poly));}
export function yasmarinaWallClear(track,a,b,width){const dx=b.x-a.x,dz=b.z-a.z,n=Math.hypot(dx,dz)||1,nx=dz/n*(width/2+.2),nz=-dx/n*(width/2+.2);return !overlapsAccess([{x:a.x-nx,z:a.z-nz},{x:b.x-nx,z:b.z-nz},{x:b.x+nx,z:b.z+nz},{x:a.x+nx,z:a.z+nz}],accessPolygons(track))&&!overlapsAccess([{x:a.x-nx,z:a.z-nz},{x:b.x-nx,z:b.z-nz},{x:b.x+nx,z:b.z+nz},{x:a.x+nx,z:a.z+nz}],racingPolygons(track))&&!overlapsAccess([{x:a.x-nx,z:a.z-nz},{x:b.x-nx,z:b.z-nz},{x:b.x+nx,z:b.z+nz},{x:a.x+nx,z:a.z+nz}],pitPolygons(track));}
export function yasmarinaBoundaries(track){
 if(cache.has(track))return cache.get(track);const half=track.width/2,result={},access=yasmarinaAccessCorridors(track);
 for(const side of [-1,1])result[side]=track.points.map((p,i)=>{
  const s=i*track.step;let zone={turn:0,name:'Island verge',paved:3,paint:1.8,gravel:0,grass:2,sand:3,barrier:'concrete'};
  for(const edge of YASMARINA_EDGES)if(edge.start<edge.end?s>=edge.start&&s<=edge.end:s>=edge.start||s<=edge.end)zone={...zone,...edge};
  for(const corner of YASMARINA_CORNERS){if(corner.side!==side)continue;const fade=smooth((corner.span-Math.abs(s-corner.s))/Math.min(45,corner.span*.5));if(fade>0)zone={...corner,paved:1.8+(corner.paved-1.8)*fade,paint:.8+(corner.paint-.8)*fade,gravel:corner.gravel*fade,sand:3+(corner.sand-3)*fade,grass:1.5+(corner.grass-1.5)*fade};}

  let limit=half+zone.paved+zone.gravel+zone.grass+zone.sand;
  const cap=(q,pad,divide=2)=>{const along=(q.x-p.x)*Math.sin(p.heading)+(q.z-p.z)*Math.cos(p.heading),across=((q.x-p.x)*Math.cos(p.heading)-(q.z-p.z)*Math.sin(p.heading))*side;if(Math.abs(along)<half+6&&across>half)limit=Math.min(limit,half+Math.max(1.4,(across-half-pad-2)/divide));};
  for(let j=0;j<track.points.length;j+=2){const arc=Math.abs(j-i)*track.step;if(Math.min(arc,track.length-arc)<65)continue;cap(track.points[j],half);}
  for(const edge of access)for(const q of [edge.a,edge.b,{x:(edge.a.x+edge.b.x)/2,z:(edge.a.z+edge.b.z)/2}])cap(q,edge.half,1);
  const next=track.points[(i+1)%track.points.length],curve=Math.atan2(Math.sin(next.heading-p.heading),Math.cos(next.heading-p.heading))/track.step;if(curve*side>0)limit=Math.min(limit,.72/Math.abs(curve));limit=Math.max(half+1.4,limit);
  const f=Math.min(1,(limit-half)/(zone.paved+zone.gravel+zone.grass+zone.sand));return {...zone,paved:zone.paved*f,paint:zone.paint*f,gravel:zone.gravel*f,grass:zone.grass*f,sand:zone.sand*f,offset:limit};
 });
 for(const side of [-1,1])for(let pass=0;pass<3;pass++){const values=result[side].map(p=>p.offset);result[side].forEach((p,i)=>{const limit=Math.min(p.offset,(values[(i+values.length-1)%values.length]+p.offset*2+values[(i+1)%values.length])/4),f=(limit-half)/(p.offset-half);for(const key of ['paved','paint','gravel','grass','sand'])p[key]*=f;p.offset=limit;});}
 const corridors=accessPolygons(track),at=(i,offset)=>{const p=track.points[i],o=ribbonOffset(track,i,offset);return {x:p.x+Math.cos(p.heading)*o,z:p.z-Math.sin(p.heading)*o};};
 for(const side of [-1,1])for(let i=0;i<track.points.length;i++){const j=(i+1)%track.points.length;result[side][i].blocked=overlapsAccess([at(i,side*half),at(j,side*half),at(j,side*result[side][j].offset),at(i,side*result[side][i].offset)],corridors);}
 cache.set(track,result);return result;
}
export function yasmarinaRunoffAllowed(track,index,side){return yasmarinaBoundaries(track)[side][index].offset>track.width/2;}
export function yasmarinaBoundaryOffset(track,index,side){return yasmarinaBoundaries(track)[side][index].offset;}
export function yasmarinaSection(track,s,side){const f=((s%track.length)+track.length)%track.length/track.step,i=Math.floor(f),t=f-i,rows=yasmarinaBoundaries(track)[side],a=rows[i],b=rows[(i+1)%rows.length],out={...a};for(const key of ['paved','paint','gravel','grass','sand','offset'])out[key]=a[key]+(b[key]-a[key])*t;return out;}
export function yasmarinaSurfaceAt(track,s,offset,wetness=0){
 const half=track.width/2,d=Math.abs(offset),row=yasmarinaSection(track,s,offset<0?-1:1),kind=d<=half+1.15?'asphalt':yasmarinaPointReserved(track,s,offset)?'asphalt':d<=half+row.paint?'paint':d<=half+row.paved?'tarmac':d<=half+row.paved+row.gravel?'gravel':d<=half+row.paved+row.gravel+row.grass?'grass':'sand',profile={asphalt:{grip:1,drag:0},tarmac:{grip:1-wetness*.06,drag:.03},paint:{grip:.94-wetness*.28,drag:.06},gravel:{grip:.43-wetness*.12,drag:1+wetness*.35},sand:{grip:.55-wetness*.13,drag:.65+wetness*.2},grass:{grip:.65-wetness*.35,drag:.3+wetness*.25}}[kind];return {kind,...profile,grip:profile.grip*(kind==='grass'?1-Math.min(.18,Math.abs(yasmarinaSurfaceY(track,s,offset+1)-yasmarinaSurfaceY(track,s,offset-1))*.5*(.2+wetness*.9)):1),boundary:row.offset,trackLimit:half+1};
}

// Keep the original smoothed road anchors; no new road heights or invented hills.
export function yasmarinaSurfaceY(track,s){return sample(track,s).y;}
export function yasmarinaConstrainGround(track,x,z,y,cell=18){const pad=track.width/2+Math.SQRT2*cell+track.step;for(let i=0;i<track.points.length;i+=2){const p=track.points[i];if(Math.abs(x-p.x)<pad&&Math.abs(z-p.z)<pad)y=Math.min(y,p.y-.86);}return y;}
export function yasmarinaTerrainHeight(track,x,z,cell=18){let total=0,weights=0;for(let i=0;i<track.points.length;i+=12){const p=track.points[i],w=1/(25+(x-p.x)**2+(z-p.z)**2);total+=(p.y-.9)*w;weights+=w;}return yasmarinaConstrainGround(track,x,z,total/weights,cell);}

const pitPolygonCache=new WeakMap();
function pitPolygons(track){if(pitPolygonCache.has(track))return pitPolygonCache.get(track);const pit=pitLayout(track),polygons=[];for(let d=0;d<pit.length;d+=3){const end=Math.min(pit.length,d+3),poly=[pitRoadPose(track,d,-pit.width/2-.3),pitRoadPose(track,end,-pit.width/2-.3),pitRoadPose(track,end,pit.width/2+.3),pitRoadPose(track,d,pit.width/2+.3)];polygons.push({poly,minX:Math.min(...poly.map(p=>p.x)),maxX:Math.max(...poly.map(p=>p.x)),minZ:Math.min(...poly.map(p=>p.z)),maxZ:Math.max(...poly.map(p=>p.z))});}pitPolygonCache.set(track,polygons);return polygons;}
const racingPolygonCache=new WeakMap();
function racingPolygons(track){if(racingPolygonCache.has(track))return racingPolygonCache.get(track);const polygons=[];for(let i=0;i<track.points.length;i++){const j=(i+1)%track.points.length,h=track.width/2-.035,at=(n,o)=>{const p=track.points[n],v=ribbonOffset(track,n,o);return {x:p.x+Math.cos(p.heading)*v,z:p.z-Math.sin(p.heading)*v};},poly=[at(i,-h),at(j,-h),at(j,h),at(i,h)];polygons.push({poly,minX:Math.min(...poly.map(p=>p.x)),maxX:Math.max(...poly.map(p=>p.x)),minZ:Math.min(...poly.map(p=>p.z)),maxZ:Math.max(...poly.map(p=>p.z))});}racingPolygonCache.set(track,polygons);return polygons;}
export function yasmarinaQuadClear(track,poly){return !overlapsAccess(poly,accessPolygons(track))&&!overlapsAccess(poly,pitPolygons(track))&&!overlapsAccess(poly,racingPolygons(track));}
export function yasmarinaPointReserved(track,s,offset){const p=sample(track,s,offset),r=.02;return !yasmarinaQuadClear(track,[{x:p.x-r,z:p.z-r},{x:p.x+r,z:p.z-r},{x:p.x+r,z:p.z+r},{x:p.x-r,z:p.z+r}]);}
// Split broad bands before complete-quad road masking; all consumers use these widths.
export function yasmarinaRunoffQuads(track,index,side,kind){
 const rows=yasmarinaBoundaries(track)[side],j=(index+1)%rows.length,half=track.width/2;
 const range=p=>kind==='asphalt'?[half,half+p.paved]:kind==='paint'?[half+1.25,half+p.paint]:kind==='accent'?[half+Math.max(1.6,p.paint-.55),half+p.paint-.2]:kind==='gravel-edge'?[half+p.paved,half+p.paved+([1,9].includes(p.turn)?Math.min(2.5,p.gravel):0)]:kind==='gravel'?[half+p.paved,half+p.paved+p.gravel]:kind==='grass'?[half+p.paved+p.gravel,half+p.paved+p.gravel+p.grass]:[half+p.paved+p.gravel+p.grass,p.offset];
 const a=range(rows[index],index*track.step),b=range(rows[j],j*track.step),width=Math.max(a[1]-a[0],b[1]-b[0]),out=[];if(Math.min(a[1]-a[0],b[1]-b[0])<.08)return out;
 const count=Math.max(1,Math.ceil(width/3));for(let strip=0;strip<count;strip++){const f=strip/count,g=(strip+1)/count,at=(n,o)=>{const p=track.points[n],offset=ribbonOffset(track,n,side*o);return {x:p.x+Math.cos(p.heading)*offset,y:yasmarinaSurfaceY(track,n*track.step,offset)+(kind==='accent'?.054:kind==='paint'?.049:kind==='gravel-edge'?.038:.028),z:p.z-Math.sin(p.heading)*offset};},poly=[at(index,a[0]+(a[1]-a[0])*f),at(j,b[0]+(b[1]-b[0])*f),at(j,b[0]+(b[1]-b[0])*g),at(index,a[0]+(a[1]-a[0])*g)];if(yasmarinaQuadClear(track,poly))out.push(poly);}return out;
}


export function yasmarinaMarinaRails(track){const walls=[],points=YASMARINA_COAST.map(p=>({x:(p[0]-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(p[1]-track.origin.lat)*111320}));for(let i=0;i<points.length-1;i++){const a={...points[i],y:yasmarinaTerrainHeight(track,points[i].x,points[i].z)+.04},b={...points[i+1],y:yasmarinaTerrainHeight(track,points[i+1].x,points[i+1].z)+.04};if(yasmarinaWallClear(track,a,b,.15))walls.push({a,b,width:.15,height:1,kind:'marina-rail',style:'armco'});}return walls;}
