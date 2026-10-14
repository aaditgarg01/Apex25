import {spaBoundaryOffset} from './spa.mjs';
import {bahrainBoundaryOffset} from './bahrain.mjs';
import {shanghaiBoundaryOffset} from './shanghai.mjs';
import {ribbonOffset} from './surface.mjs';
import {campusLocal} from './campus.mjs';
import {campusTunnelLayout} from './campus-geometry.mjs';
const cache=new WeakMap(),CELL=12,HALF_WIDTH=1.24,HALF_LENGTH=2.6;
const wrap=(n,m)=>((n%m)+m)%m,angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function roadPoint(track,s){const f=wrap(s,track.length)/track.step,i=Math.floor(f),t=f-i,a=track.points[i],b=track.points[(i+1)%track.points.length];return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:a.y+(b.y-a.y)*t,groundY:a.groundY+(b.groundY-a.groundY)*t,heading:a.heading+angle(b.heading,a.heading)*t};}
function edge(track,i,offset){const p=track.points[i],o=ribbonOffset(track,i,offset);return {x:p.x+Math.cos(p.heading)*o,z:p.z-Math.sin(p.heading)*o,y:p.y};}
export function trackBarriers(track){
 if(cache.has(track))return cache.get(track);
 const walls=[],grid=new Map(),half=track.width/2,melbourne=track.id==='au-1953',shanghai=track.id==='cn-2004',bahrain=track.id==='bh-2002',spa=track.id==='be-1925',wideRunoff=shanghai||bahrain||spa,concreteWalls=melbourne||shanghai||bahrain,boundaryOffset=spa?spaBoundaryOffset:bahrain?bahrainBoundaryOffset:shanghaiBoundaryOffset;
 function add(a,b,width,height,kind,inward=null){
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<.01)return;
  const wall={a,b,width,height,kind,x:(a.x+b.x)/2,z:(a.z+b.z)/2,tx:dx/length,tz:dz/length,length,inward,bottom:Math.min(a.y,b.y),top:Math.max(a.y,b.y)+height};
  const id=walls.length;walls.push(wall);const pad=width/2+.1;
  for(let x=Math.floor((Math.min(a.x,b.x)-pad)/CELL);x<=Math.floor((Math.max(a.x,b.x)+pad)/CELL);x++)for(let z=Math.floor((Math.min(a.z,b.z)-pad)/CELL);z<=Math.floor((Math.max(a.z,b.z)+pad)/CELL);z++){const key=x+':'+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(id);}
 }
 // Campus streets have open verges. Their only solid walls come from the actual
 // subway retaining walls, portal pillars and roundabout island below.
 if(!track.campus)for(let i=0;i<track.points.length;i++)for(const side of [-1,1]){
  const next=(i+1)%track.points.length,inner=wideRunoff?boundaryOffset(track,i,side)-.35:half+(track.id==='mc-1929'?.35:6.5),outer=wideRunoff?boundaryOffset(track,i,side)+.35:half+(track.id==='mc-1929'?.8:7.2);
  const ai=edge(track,i,side*inner),ao=edge(track,i,side*outer),bi=edge(track,next,side*(wideRunoff?boundaryOffset(track,next,side)-.35:inner)),bo=edge(track,next,side*(wideRunoff?boundaryOffset(track,next,side)+.35:outer)),a={x:(ai.x+ao.x)/2,z:(ai.z+ao.z)/2,y:ai.y+.04},b={x:(bi.x+bo.x)/2,z:(bi.z+bo.z)/2,y:bi.y+.04};
  const cx=(track.points[i].x+track.points[next].x)/2,cz=(track.points[i].z+track.points[next].z)/2,nx=cx-(a.x+b.x)/2,nz=cz-(a.z+b.z)/2,n=Math.hypot(nx,nz);
  const width=Math.max(.12,(Math.hypot(ai.x-ao.x,ai.z-ao.z)+Math.hypot(bi.x-bo.x,bi.z-bo.z))/2);
  add(a,b,width,concreteWalls?1.05:.76,'track',n?{x:nx/n,z:nz/n}:null);
  const fa=concreteWalls||spa?{...a,y:a.y+(spa?.76:1.05)}:edge(track,i,side*(half+(track.urban?3.2:8))),fb=concreteWalls||spa?{...b,y:b.y+(spa?.76:1.05)}:edge(track,next,side*(half+(track.urban?3.2:8)));add(fa,fb,.12,concreteWalls||spa?2.9:3.5,'fence',n?{x:nx/n,z:nz/n}:null);
 }
 function wallPair(s,length,offset,width,height,kind){
  const p=roadPoint(track,s),tx=Math.sin(p.heading),tz=Math.cos(p.heading),rx=Math.cos(p.heading),rz=-Math.sin(p.heading);
  for(const side of [-1,1]){const x=p.x+rx*offset*side,z=p.z+rz*offset*side;add({x:x-tx*length/2,z:z-tz*length/2,y:p.y},{x:x+tx*length/2,z:z+tz*length/2,y:p.y},width,height,kind,{x:-rx*side,z:-rz*side});}
 }
 if(track.campus){
  for(const tunnel of track.campus.tunnels){const layout=campusTunnelLayout(track,tunnel);for(const w of [...layout.walls,...layout.portals])add(w.a,w.b,w.width,w.height,w.kind,w.inward);}
  for(const island of track.campus.roundabouts){const p=campusLocal(track,island.location);let closest=track.points[0],distance=Infinity;for(const point of track.points){const d=Math.hypot(point.x-p.x,point.z-p.z);if(d<distance){distance=d;closest=point;}}const y=closest.groundY-.975;for(let i=0;i<32;i++){const a=i*Math.PI/16,b=(i+1)*Math.PI/16;add({x:p.x+Math.cos(a)*island.radius,z:p.z+Math.sin(a)*island.radius,y},{x:p.x+Math.cos(b)*island.radius,z:p.z+Math.sin(b)*island.radius,y},.12,1.4,'island');}}
 }
 if(track.id==='mc-1929'){const p=campusLocal(track,[7.4293,43.7382]);let center=0,best=Infinity;track.points.forEach((q,i)=>{const d=Math.hypot(p.x-q.x,p.z-q.z);if(d<best){best=d;center=i*track.step;}});for(let s=center-90;s<center+90;s+=8)wallPair(s,8.4,half+1,.5,5.5,'tunnel');}
 const data={walls,grid};cache.set(track,data);return data;
}
function candidates(car,data){const ids=new Set();for(let x=Math.floor((car.x-4)/CELL);x<=Math.floor((car.x+4)/CELL);x++)for(let z=Math.floor((car.z-4)/CELL);z<=Math.floor((car.z+4)/CELL);z++)for(const id of data.grid.get(x+':'+z)||[])ids.add(id);return [...ids].map(id=>data.walls[id]);}
function contact(car,wall){
 if(car.y+.95<wall.bottom||car.y>wall.top+.12)return null;
 const fx=Math.sin(car.heading),fz=Math.cos(car.heading),rx=fz,rz=-fx,cx=car.x+fx*.3,cz=car.z+fz*.3,dx=cx-wall.x,dz=cz-wall.z;
 if(Math.abs(dx)>wall.length/2+4||Math.abs(dz)>wall.length/2+4)return null;
 let depth=Infinity,normal=null;
 for(const [ax,az] of [[fx,fz],[rx,rz],[wall.tx,wall.tz],[wall.tz,-wall.tx]]){
  const extent=Math.abs(ax*fx+az*fz)*HALF_LENGTH+Math.abs(ax*rx+az*rz)*HALF_WIDTH,wallExtent=Math.abs(ax*wall.tx+az*wall.tz)*wall.length/2+Math.abs(ax*wall.tz-az*wall.tx)*wall.width/2,separation=dx*ax+dz*az,overlap=extent+wallExtent-Math.abs(separation);
  if(overlap<=0)return null;if(overlap<depth){depth=overlap;const sign=separation<0?-1:1;normal={x:ax*sign,z:az*sign};}
 }
 // Track-side faces always push back towards their own road branch.
 if(wall.inward&&dx*wall.inward.x+dz*wall.inward.z<0){const nx=wall.inward.x,nz=wall.inward.z;normal=wall.inward;depth=Math.abs(nx*fx+nz*fz)*HALF_LENGTH+Math.abs(nx*rx+nz*rz)*HALF_WIDTH+wall.width/2-(dx*nx+dz*nz);}
 return {depth,normal};
}
export function resolveBarrierContacts(car,track,{impulses=true}={}){
 if(car.finished||car.retired)return 0;const data=trackBarriers(track);let count=0;
 for(let pass=0;pass<4;pass++){
  let touched=false;for(const wall of candidates(car,data)){const hit=contact(car,wall);if(!hit)continue;const {normal:n,depth}=hit;car.x+=n.x*(depth+.002);car.z+=n.z*(depth+.002);touched=true;count++;
   if(impulses){const direction=car.motionHeading??car.heading,vx=Math.sin(direction)*car.v,vz=Math.cos(direction)*car.v,into=vx*n.x+vz*n.z;if(into<0){const friction=into<-.5?.98:1,x=(vx-into*n.x)*friction,z=(vz-into*n.z)*friction,speed=Math.hypot(x,z),reverse=car.v<0;car.v=speed<.2?0:(reverse?-speed:speed);if(speed>=.2)car.motionHeading=Math.atan2(reverse?-x:x,reverse?-z:z);car.motionYawRate=0;car.boostActive=false;}}
  }if(!touched)break;
 }
 return count;
}
export function moveWithBarriers(car,track,previous,{impulses=true}={}){
 if(car.finished||car.retired)return;
 const dx=car.x-previous.x,dz=car.z-previous.z,turn=angle(car.heading,previous.heading),endHeading=car.heading,steps=Math.max(1,Math.ceil((Math.hypot(dx,dz)+Math.abs(turn)*3)/.4));
 car.x=previous.x;car.z=previous.z;
 for(let i=1;i<=steps;i++){car.x+=dx/steps;car.z+=dz/steps;car.heading=previous.heading+turn*i/steps;resolveBarrierContacts(car,track,{impulses});}
 car.heading=endHeading;
}
