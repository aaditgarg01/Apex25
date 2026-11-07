import {sepangWalls} from './sepang.mjs';
import {buddhWalls} from './buddh.mjs';
import {singaporeWalls} from './singapore.mjs';
import {singaporeStructures} from './singapore-structures.mjs';
import {lusailBoundaryOffset,lusailWallClear,lusailSection} from './lusail.mjs';
import {lusailStructures} from './lusail-structures.mjs';
import {yasmarinaStructures} from './yasmarina-structures.mjs';
import {yasmarinaBoundaryOffset,yasmarinaWallClear,yasmarinaSection,yasmarinaMarinaRails} from './yasmarina.mjs';
import {montrealStructures} from './montreal-structures.mjs';
import {montrealBoundaryOffset,montrealWallClear,montrealSection,montrealFinalWall,montrealCanalRails} from './montreal.mjs';
import {barcelonaStructures} from './barcelona-structures.mjs';
import {barcelonaBoundaryOffset,barcelonaWallClear,barcelonaSurfaceY,barcelonaSection} from './barcelona.mjs';
import {hungaroringStructures} from './hungaroring-structures.mjs';
import {hungaroringBoundaryOffset,hungaroringWallClear,hungaroringSurfaceY,hungaroringSection} from './hungaroring.mjs';
import {imolaParkStructures} from './imola-structures.mjs';
import {imolaBoundaryOffset,imolaWallClear,imolaSurfaceY,imolaSection} from './imola.mjs';
import {cotaFootbridge} from './cota-structures.mjs';
import {cotaBoundaryOffset,cotaWallClear,cotaSurfaceY,cotaSection} from './cota.mjs';
import {monzaFootbridge} from './monza-structures.mjs';
import {monzaBoundaryOffset,monzaWallClear,monzaSection} from './monza.mjs';
import {monzaBankingPlan} from './monza-banking.mjs';
import {mexicoBoundaryOffset,mexicoWallClear,mexicoSection} from './mexico.mjs';
import {redbullringBoundaryOffset,redbullringWallClear,redbullringSurfaceY} from './redbullring.mjs';
import {silverstoneBoundaryOffset,silverstoneWallClear} from './silverstone.mjs';
import {miamiBoundaryOffset,miamiWallClear} from './miami.mjs';
import {zandvoortBoundaryOffset} from './zandvoort.mjs';
import {bankedHeight} from './banked-road.mjs';
import {interlagosBoundaryOffset} from './interlagos-boundary.mjs';
import {damageTyres} from './tyres.mjs';
import {pitBoundary,pitReserved} from './pit-layout.mjs';
import {velocityOf,setVelocity} from './motion.mjs';
import {madridLayout,madridTunnelLayout} from './madrid.mjs';
import {jeddahBoundaryOffset,jeddahTecproBlocks} from './jeddah.mjs';
import {spaBoundaryOffset} from './spa.mjs';
import {bahrainBoundaryOffset} from './bahrain.mjs';
import {shanghaiBoundaryOffset} from './shanghai.mjs';
import {ribbonOffset} from './surface.mjs';
import {campusLocal} from './campus.mjs';
import {campusTunnelLayout} from './campus-geometry.mjs';
const cache=new WeakMap(),CELL=12,HALF_WIDTH=1.24,HALF_LENGTH=2.6;
const wrap=(n,m)=>((n%m)+m)%m,angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function roadPoint(track,s){const f=wrap(s,track.length)/track.step,i=Math.floor(f),t=f-i,a=track.points[i],b=track.points[(i+1)%track.points.length];return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:a.y+(b.y-a.y)*t,groundY:a.groundY+(b.groundY-a.groundY)*t,heading:a.heading+angle(b.heading,a.heading)*t};}
function edge(track,i,offset){const p=track.points[i],o=ribbonOffset(track,i,offset);return {x:p.x+Math.cos(p.heading)*o,z:p.z-Math.sin(p.heading)*o,y:track.id==='es-1991'?barcelonaSurfaceY(track,i*track.step,o):track.id==='hu-1986'?hungaroringSurfaceY(track,i*track.step,o):track.id==='it-1953'?imolaSurfaceY(track,i*track.step,o):track.id==='us-2012'?cotaSurfaceY(track,i*track.step,o):track.id==='at-1969'?redbullringSurfaceY(track,i*track.step,o):bankedHeight(track,i*track.step,o,p.y)};}
function pitEdge(track,i,offset){const p=track.points[i];return {x:p.x+Math.cos(p.heading)*offset,z:p.z-Math.sin(p.heading)*offset,y:p.y};}
export function trackBarriers(track){
 if(cache.has(track))return cache.get(track);
 const walls=[],grid=new Map(),half=track.width/2,sepang=track.id==='my-1999',buddh=track.id==='in-2011',singapore=track.id==='sg-2008',lusail=track.id==='qa-2004',yasmarina=track.id==='ae-2009',montreal=track.id==='ca-1978',melbourne=track.id==='au-1953',shanghai=track.id==='cn-2004',bahrain=track.id==='bh-2002',spa=track.id==='be-1925',interlagos=track.id==='br-1940',zandvoort=track.id==='nl-1948',miami=track.id==='us-2022',silverstone=track.id==='gb-1948',austria=track.id==='at-1969',mexico=track.id==='mx-1962',monza=track.id==='it-1922',cota=track.id==='us-2012',imola=track.id==='it-1953',hungaroring=track.id==='hu-1986',barcelona=track.id==='es-1991',jeddah=track.id==='sa-2021',wideRunoff=lusail||yasmarina||montreal||barcelona||hungaroring||imola||cota||monza||mexico||austria||silverstone||miami||shanghai||bahrain||spa||jeddah||interlagos||zandvoort,concreteWalls=lusail||yasmarina||montreal||barcelona||hungaroring||imola||cota||mexico||miami||melbourne||shanghai||bahrain||jeddah||['az-2016','sg-2008','es-2026','us-2023'].includes(track.id),boundaryOffset=lusail?lusailBoundaryOffset:yasmarina?yasmarinaBoundaryOffset:montreal?montrealBoundaryOffset:barcelona?barcelonaBoundaryOffset:hungaroring?hungaroringBoundaryOffset:imola?imolaBoundaryOffset:cota?cotaBoundaryOffset:monza?monzaBoundaryOffset:mexico?mexicoBoundaryOffset:austria?redbullringBoundaryOffset:silverstone?silverstoneBoundaryOffset:miami?miamiBoundaryOffset:zandvoort?zandvoortBoundaryOffset:interlagos?interlagosBoundaryOffset:jeddah?jeddahBoundaryOffset:spa?spaBoundaryOffset:bahrain?bahrainBoundaryOffset:shanghaiBoundaryOffset;
 function add(a,b,width,height,kind,inward=null,style=null){
  if((barcelona||hungaroring||imola||cota||monza||miami||silverstone||austria||mexico)&&['track','fence'].includes(kind)&&!miamiWallClear(track,a,b,width))return;
  if(lusail&&['track','fence','pit-divider'].includes(kind)&&!lusailWallClear(track,a,b,width))return;
  if(yasmarina&&['track','fence'].includes(kind)&&!yasmarinaWallClear(track,a,b,width))return;
  if(montreal&&['track','fence'].includes(kind)&&!montrealWallClear(track,a,b,width))return;
  if(barcelona&&['track','fence'].includes(kind)&&!barcelonaWallClear(track,a,b,width))return;
  if(hungaroring&&['track','fence'].includes(kind)&&!hungaroringWallClear(track,a,b,width))return;
  if(imola&&['track','fence'].includes(kind)&&!imolaWallClear(track,a,b,width))return;
  if(cota&&['track','fence'].includes(kind)&&!cotaWallClear(track,a,b,width))return;
  if(monza&&['track','fence'].includes(kind)&&!monzaWallClear(track,a,b,width))return;
  if(mexico&&['track','fence'].includes(kind)&&!mexicoWallClear(track,a,b,width))return;
  if(austria&&['track','fence'].includes(kind)&&!redbullringWallClear(track,a,b,width))return;
  if(silverstone&&['track','fence'].includes(kind)&&!silverstoneWallClear(track,a,b,width))return;
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<.01)return;
  const wall={a,b,width,height,kind,x:(a.x+b.x)/2,z:(a.z+b.z)/2,tx:dx/length,tz:dz/length,length,inward,bottom:Math.min(a.y,b.y),top:Math.max(a.y,b.y)+height};
  if(sepang||buddh||singapore||lusail||yasmarina||montreal||barcelona||hungaroring||imola||cota||mexico||monza)wall.style=style||'concrete';
  const id=walls.length;walls.push(wall);const pad=width/2+.1;
  for(let x=Math.floor((Math.min(a.x,b.x)-pad)/CELL);x<=Math.floor((Math.max(a.x,b.x)+pad)/CELL);x++)for(let z=Math.floor((Math.min(a.z,b.z)-pad)/CELL);z<=Math.floor((Math.max(a.z,b.z)+pad)/CELL);z++){const key=x+':'+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(id);}
 }
 // Campus streets have open verges. Their only solid walls come from the actual
 // subway retaining walls, portal pillars and roundabout island below.
 if(!track.campus&&!sepang&&!buddh&&!singapore)for(let i=0;i<track.points.length;i++)for(const side of [-1,1]){
  if(montreal&&side===-1&&i*track.step>=4157&&i*track.step<=4238)continue;
  const next=(i+1)%track.points.length,inner=wideRunoff?boundaryOffset(track,i,side)-.35:half+(track.id==='az-2016'?.3:track.id==='mc-1929'?.35:6.5),outer=wideRunoff?boundaryOffset(track,i,side)+.35:half+(['mc-1929','az-2016'].includes(track.id)?.8:7.2);
  const pa=pitBoundary(track,i*track.step),pb=pitBoundary(track,next*track.step);
  if(pa?.side===side&&pb?.side===side){
   const oa=Math.max((inner+outer)/2,pa.outer),ob=Math.max((inner+outer)/2,pb.outer),a=pitEdge(track,i,side*oa),b=pitEdge(track,next,side*ob),normal={x:-Math.cos(track.points[i].heading)*side,z:Math.sin(track.points[i].heading)*side};
   add(a,b,.5,1.05,'track',normal);add({...a,y:a.y+1.05},{...b,y:b.y+1.05},.12,2.9,'fence',normal);
   if(pa.divider&&pb.divider){const da=pitEdge(track,i,side*(half+.65)),db=pitEdge(track,next,side*(half+.65));add(da,db,.35,1.05,'pit-divider');}
   continue;
  }
  const ai=edge(track,i,side*inner),ao=edge(track,i,side*outer),bi=edge(track,next,side*(wideRunoff?boundaryOffset(track,next,side)-.35:inner)),bo=edge(track,next,side*(wideRunoff?boundaryOffset(track,next,side)+.35:outer)),a={x:(ai.x+ao.x)/2,z:(ai.z+ao.z)/2,y:ai.y+.04},b={x:(bi.x+bo.x)/2,z:(bi.z+bo.z)/2,y:bi.y+.04};
  const cx=(track.points[i].x+track.points[next].x)/2,cz=(track.points[i].z+track.points[next].z)/2,nx=cx-(a.x+b.x)/2,nz=cz-(a.z+b.z)/2,n=Math.hypot(nx,nz);
  const width=Math.max(.12,(Math.hypot(ai.x-ao.x,ai.z-ao.z)+Math.hypot(bi.x-bo.x,bi.z-bo.z))/2);
  const style=lusail?lusailSection(track,i*track.step,side).barrier:yasmarina?(yasmarinaSection(track,i*track.step,side).barrier||'concrete'):montreal?(montrealSection(track,i*track.step,side).barrier||'concrete'):barcelona?(barcelonaSection(track,i*track.step,side).barrier||'armco'):hungaroring?(hungaroringSection(track,i*track.step,side).barrier||'armco'):imola?(imolaSection(track,i*track.step,side).barrier||'armco'):cota?(cotaSection(track,i*track.step,side).barrier||'armco'):monza?(monzaSection(track,i*track.step,side).barrier||'armco'):mexico?(mexicoSection(track,i*track.step,side).barrier||'concrete'):null,wallHeight=lusail?(style==='armco'?.76:1.05):barcelona?(style==='armco'?.76:1.05):hungaroring?(style==='armco'?.76:1.05):imola?(style==='armco'?.76:1.05):cota?(style==='armco'?.76:1.05):monza?(style==='armco'?.76:1.05):mexico&&style==='armco'?.76:concreteWalls?1.05:.76;
  add(a,b,width,wallHeight,'track',n?{x:nx/n,z:nz/n}:null,style);
  const fa=monza||concreteWalls||spa||zandvoort||silverstone||austria?{...a,y:a.y+(lusail||barcelona||hungaroring||imola||cota||mexico||monza?wallHeight:((spa||zandvoort||silverstone||austria)? .76:1.05))}:edge(track,i,side*(half+(track.urban?3.2:8))),fb=monza||concreteWalls||spa||zandvoort||silverstone||austria?{...b,y:b.y+(lusail||barcelona||hungaroring||imola||cota||mexico||monza?wallHeight:((spa||zandvoort||silverstone||austria)? .76:1.05))}:edge(track,next,side*(half+(track.urban?3.2:8)));
  // Historic stone wall provides the castle-side enclosure; retain the low
  // collision barrier without putting a second debris fence in front of it.
  if(!(track.id==='az-2016'&&side===1&&i*track.step>=2470&&i*track.step<=2760))add(fa,fb,.12,concreteWalls||spa||zandvoort||silverstone||austria?2.9:3.5,'fence',n?{x:nx/n,z:nz/n}:null);
 }
 if(track.campus)for(let i=0;i<track.points.length;i++){
  const next=(i+1)%track.points.length,a=pitBoundary(track,i*track.step),b=pitBoundary(track,next*track.step);if(!a||!b)continue;
  add(pitEdge(track,i,a.side*a.outer),pitEdge(track,next,b.side*b.outer),.4,1.05,'pit-wall');
  if(a.divider&&b.divider)add(pitEdge(track,i,a.side*(half+.65)),pitEdge(track,next,b.side*(half+.65)),.35,1.05,'pit-divider');
 }
 if(sepang||buddh)for(const wall of (sepang?sepangWalls(track):buddhWalls(track)).walls)add(wall.a,wall.b,wall.width,wall.height,wall.kind,wall.inward,wall.style);
 if(singapore)for(const w of [...singaporeWalls(track),...singaporeStructures(track).solids]){
  const before=walls.length;
  add(w.a,w.b,w.width,w.height,w.kind,w.inward,w.style);
  if(walls.length>before&&Number.isFinite(w.station))walls.at(-1).station=w.station;
 }
 if(lusail)for(const w of lusailStructures(track).solids)add(w.a,w.b,w.width,w.height,w.kind);
 if(yasmarina)for(const w of yasmarinaMarinaRails(track))add(w.a,w.b,w.width,w.height,w.kind,null,w.style);
 if(yasmarina)for(const w of yasmarinaStructures(track).solids)add(w.a,w.b,w.width,w.height,w.kind,null);
 if(montreal)for(const w of montrealStructures(track).solids)add(w.a,w.b,w.width,w.height,w.kind,null);
 if(montreal)for(const w of montrealCanalRails(track))add(w.a,w.b,w.width,w.height,w.kind,null,w.style);
 if(montreal)for(const w of montrealFinalWall(track).walls){const before=walls.length;add(w.a,w.b,w.width,w.height,'track',w.inward,w.style);if(walls.length>before){walls.at(-1).finalWall=true;walls.at(-1).sourceWay=w.sourceWay;}add({...w.a,y:w.a.y+w.height},{...w.b,y:w.b.y+w.height},.12,2.9,'fence',w.inward);}
 if(barcelona)for(const w of barcelonaStructures(track).solids)add(w.a,w.b,w.width,w.height,w.kind,null);
 if(hungaroring)for(const w of hungaroringStructures(track).solids)add(w.a,w.b,w.width,w.height,w.kind,null);
 if(imola)for(const w of imolaParkStructures(track).solids)add(w.a,w.b,w.width,w.height,w.kind,null);
 if(cota)for(const w of cotaFootbridge(track)?.solids||[])add(w.a,w.b,w.width,w.height,w.kind,null);
 if(monza)for(const w of monzaFootbridge(track)?.solids||[])add(w.a,w.b,w.width,w.height,w.kind,null);
 if(monza)for(const w of monzaBankingPlan(track).solids)add(w.a,w.b,w.width,w.height,w.kind,null);
 if(jeddah)for(const block of jeddahTecproBlocks(track))if(!pitReserved(track,(block.a.x+block.b.x)/2,(block.a.z+block.b.z)/2))add(block.a,block.b,block.width,block.height,'tecpro',block.inward);
 function wallPair(s,length,offset,width,height,kind){
  const p=roadPoint(track,s),tx=Math.sin(p.heading),tz=Math.cos(p.heading),rx=Math.cos(p.heading),rz=-Math.sin(p.heading);
  for(const side of [-1,1]){const x=p.x+rx*offset*side,z=p.z+rz*offset*side;add({x:x-tx*length/2,z:z-tz*length/2,y:p.y},{x:x+tx*length/2,z:z+tz*length/2,y:p.y},width,height,kind,{x:-rx*side,z:-rz*side});}
 }
 if(track.id==='es-2026')for(const tunnel of madridLayout(track).tunnels)for(const w of madridTunnelLayout(track,tunnel).walls)add(w.a,w.b,w.width,w.height,'tunnel',w.inward);
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
   if(impulses){const v=velocityOf(car),into=v.x*n.x+v.z*n.z;if(into<0){damageTyres(car,-into);const friction=into<-.5?.98:1,x=(v.x-into*n.x)*friction,z=(v.z-into*n.z)*friction,speed=Math.hypot(x,z);setVelocity(car,speed<.2?0:x,speed<.2?0:z);car.impactYaw=(car.impactYaw||0)*.35;car.motionYawRate=0;car.boostActive=false;}}
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
