import {campusDistance} from './campus.mjs';
import {ribbonOffset} from './surface.mjs';

const cache=new WeakMap(),cornerCache=new WeakMap();
const wrap=(n,m)=>((n%m)+m)%m;
const cross=(x,z,a,b)=>x*b-z*a;
function pointDistance(p,a,b){
 const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));
 return (p.x-a.x-dx*t)**2+(p.z-a.z-dz*t)**2;
}
function segmentDistance(a,b,c,d){
 const ux=b.x-a.x,uz=b.z-a.z,vx=d.x-c.x,vz=d.z-c.z,den=cross(ux,uz,vx,vz);
 if(Math.abs(den)>1e-8){const x=c.x-a.x,z=c.z-a.z,t=cross(x,z,vx,vz)/den,u=cross(x,z,ux,uz)/den;if(t>=0&&t<=1&&u>=0&&u<=1)return 0;}
 return Math.min(pointDistance(a,c,d),pointDistance(b,c,d),pointDistance(c,a,b),pointDistance(d,a,b));
}

// A ramp can pass below another part of the route. Its retaining wall must end
// below that road's deck, and must not protrude into a nearby return lane.
export function campusWallHeight(track,a,b,width,height,s){
 if(!track.campus)return height;
 const reach=track.width/2+width/2+.35,length=Math.hypot(b.x-a.x,b.z-a.z),local=Math.max(30,length+track.width*2),bottom=Math.min(a.y,b.y),topBase=Math.max(a.y,b.y);
 const minX=Math.min(a.x,b.x)-reach,maxX=Math.max(a.x,b.x)+reach,minZ=Math.min(a.z,b.z)-reach,maxZ=Math.max(a.z,b.z)+reach;
 for(let i=0;i<track.points.length;i++){
  if(campusDistance(track,s,(i+.5)*track.step)<local)continue;
  const c=track.points[i],d=track.points[(i+1)%track.points.length];
  if(Math.max(c.x,d.x)<minX||Math.min(c.x,d.x)>maxX||Math.max(c.z,d.z)<minZ||Math.min(c.z,d.z)>maxZ)continue;
  // Leave the wall of an elevated road intact when the other lane passes below.
  if(Math.max(c.y,d.y)+1.2<bottom)continue;
  if(segmentDistance(a,b,c,d)>reach*reach)continue;
  height=Math.min(height,Math.min(c.y,d.y)-topBase-.4);
  if(height<.18)return 0;
 }
 return height;
}

function edge(track,s,offset){
 const f=wrap(s,track.length)/track.step,i=Math.floor(f),t=f-i,j=(i+1)%track.points.length;
 const a=track.points[i],b=track.points[j],oa=ribbonOffset(track,i,offset),ob=ribbonOffset(track,j,offset);
 return {x:(a.x+Math.cos(a.heading)*oa)*(1-t)+(b.x+Math.cos(b.heading)*ob)*t,z:(a.z-Math.sin(a.heading)*oa)*(1-t)+(b.z-Math.sin(b.heading)*ob)*t,y:a.y*(1-t)+b.y*t,groundY:a.groundY*(1-t)+b.groundY*t};
}
function wall(track,s,length,offset,width,height,kind,side){
 const a=edge(track,s-length/2,side*offset),b=edge(track,s+length/2,side*offset);
 height=campusWallHeight(track,a,b,Math.max(width,.65),height,s);
 if(height<.18)return null;
 const p=edge(track,s,0),x=(a.x+b.x)/2,z=(a.z+b.z)/2,nx=p.x-x,nz=p.z-z,n=Math.hypot(nx,nz);
 return {a,b,width,height,kind,s,side,inward:n?{x:nx/n,z:nz/n}:null};
}

// Rendering and physics consume the same retained sections and portal pillars.
export function campusTunnelLayout(track,tunnel){
 let layouts=cache.get(track);if(!layouts){layouts=new Map();cache.set(track,layouts);}
 if(layouts.has(tunnel))return layouts.get(tunnel);
 const half=track.width/2,limit=tunnel.covered/2+tunnel.approach,walls=[],portals=[],ramps=[];
 for(let d=-limit;d<limit;d+=4){
  const length=Math.min(4,limit-d),s=tunnel.center+d+length/2,p=edge(track,s,0),height=Math.max(.65,p.groundY-p.y+.7);
  ramps.push({s,d:d+length/2,length});
  for(const side of [-1,1]){const section=wall(track,s,length,half+.8,.55,height,'tunnel',side);if(section)walls.push(section);}
 }
 for(const direction of [-1,1])for(const side of [-1,1]){
  const section=wall(track,tunnel.center+direction*(tunnel.covered/2+1),1.1,half+.7,.83,6.9,'portal',side);
  if(section)portals.push({...section,direction});
 }
 const layout={walls,portals,ramps};layouts.set(tunnel,layout);return layout;
}

// Only substantial, tight bends need an inside barrier. Short runs protect the
// apex rather than lining whole streets or closing the outside runoff area.
export function campusCornerWalls(track){
 if(!track.campus)return [];
 if(cornerCache.has(track))return cornerCache.get(track);
 const points=track.points,n=points.length,angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
 const curvature=points.map((p,i)=>angle(points[wrap(i+2,n)].heading,points[wrap(i-2,n)].heading)/(4*track.step));
 const groups=[];let group=[];
 for(let i=0;i<=n;i++){
  const k=i<n?curvature[i]:0;
  if(Math.abs(k)>1/26&&(!group.length||Math.sign(k)===Math.sign(curvature[group[0]])))group.push(i);
  else{if(group.length)groups.push(group);group=Math.abs(k)>1/26?[i]:[];}
 }
 const selected=new Map();
 for(const bend of groups){
  const turn=bend.reduce((sum,i)=>sum+curvature[i]*track.step,0);
  if(Math.abs(turn)<.65)continue;
  const side=Math.sign(turn);
  for(let i=bend[0]-1;i<=bend.at(-1)+1;i++)selected.set(wrap(i,n),side);
 }
 const walls=[];
 for(const [i,side] of selected){
  const s=(i+.5)*track.step,p=edge(track,s,0);
  if(track.campus.tunnels.some(t=>campusDistance(track,s,t.center)<t.covered/2+t.approach+5))continue;
  if(track.campus.roundabouts.some(island=>{
   const x=(island.location[0]-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z=-(island.location[1]-track.origin.lat)*111320;
   return Math.hypot(p.x-x,p.z-z)<track.width/2+island.radius+8;
  }))continue;
  const w=wall(track,s,track.step,track.width/2+.55,.4,.8,'corner',side);
  if(w)walls.push(w);
 }
 cornerCache.set(track,walls);return walls;
}
