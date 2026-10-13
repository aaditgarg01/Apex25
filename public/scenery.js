import {addLandmarks} from './landmarks.js';
import {batchMapped} from './batching.js';
import {safeSite,roadClearance} from '/shared/venues.mjs';
import * as THREE from '/vendor/three.module.js';
import {sample,terrainHeight} from '/shared/tracks.mjs';
import {ribbonOffset} from '/shared/surface.mjs';
const material=(color,extras={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extras});
const nightIds=['sg-2008','us-2023','sa-2021','ae-2009','bh-2002','qa-2004'];
const desertIds=['bh-2002','sa-2021','qa-2004','ae-2009','us-2023'];
const forestIds=['it-1922','be-1925','de-1927','de-1932','it-1953','at-1969','us-1956'];
const tropicalIds=['my-1999','sg-2008','br-1940','us-2022','au-1953'];
export function venueProfile(track){return {night:nightIds.includes(track.id),desert:desertIds.includes(track.id),forest:forestIds.includes(track.id),tropical:tropicalIds.includes(track.id),ground:desertIds.includes(track.id)?'#a3987d':track.urban?'#697775':'#687c4c',sky:nightIds.includes(track.id)?'#17263e':'#91b2cc'};}
function nearestDistance(track,x,z){let best=Infinity;for(let i=0;i<track.points.length;i+=4){const p=track.points[i];best=Math.min(best,Math.hypot(p.x-x,p.z-z));}return best;}
export function addVenue(scene,track){
 const profile=venueProfile(track),group=scene.group,half=track.width/2,dummy=new THREE.Object3D();
 // Rounded deciduous canopies, cypress trees and palms replace universal cones.
 const count=Math.ceil(track.length/(profile.forest?15:profile.desert?160:48))*2;
 const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.28,.55,5,6),material('#655a48'),count);
 const crowns=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),material(profile.desert?'#7c8860':'#31533a'),count*3);
 let k=0,j=0;
 for(let s=0;s<track.length;s+=(profile.forest?15:profile.desert?160:48))for(const side of [-1,1]){
  const p=sample(track,s,side*(half+23+Math.abs(Math.sin(s*.37))*64));if(nearestDistance(track,p.x,p.z)<half+15)continue;
  const scale=.75+Math.abs(Math.sin(s*3))*.65;const groundY=terrainHeight(track,p.x,p.z);dummy.position.set(p.x,groundY+2.5*scale,p.z);dummy.scale.set(scale,scale,scale);dummy.rotation.set(0,s,0);dummy.updateMatrix();trunks.setMatrixAt(k++,dummy.matrix);
  for(let layer=0;layer<3;layer++){dummy.position.set(p.x+Math.sin(layer*2.1)*1.7, groundY+(profile.tropical?8:6+layer*1.4)*scale,p.z+Math.cos(layer*2.1)*1.7);dummy.scale.set((profile.tropical?6:3.8)*scale,(profile.tropical?.85:2.8)*scale,(profile.tropical?2:3.5)*scale);dummy.rotation.y=layer*2.1+s;dummy.updateMatrix();crowns.setMatrixAt(j,dummy.matrix);crowns.setColorAt(j++,new THREE.Color().setHSL(.25+(s%5)*.009,.26, .17+(layer*.023)));}
 }
 trunks.count=k;crowns.count=j;group.add(trunks,crowns);
 // Circuit-specific run-off: Paul Ricard's Blue Line areas are distinctive.
 if(track.id==='fr-1969')for(const side of [-1,1])for(let band=0;band<9;band++){const a=side*(half+2+band*2.1),b=side*(half+2+(band+1)*2.1);scene.ribbon(track,Math.min(a,b),Math.max(a,b),band%2?'#225cba':band>6?'#c94242':'#768085',.08);}
 // Safety barriers, catch fencing, pit garages and distance boards add depth.
 const postsCount=Math.ceil(track.length/18)*2,posts=new THREE.InstancedMesh(new THREE.CylinderGeometry(.06,.07,3.5,4),material('#6f777c'),postsCount);let f=0;
 for(let s=0;s<track.length;s+=18)for(const side of [-1,1]){const p=sample(track,s,ribbonOffset(track,Math.floor(s/track.step),side*(half+(track.urban?3.2:8))));dummy.position.set(p.x,p.y+1.75,p.z);dummy.scale.set(1,1,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();posts.setMatrixAt(f++,dummy.matrix);}posts.count=f;group.add(posts);
 for(const side of [-1,1]){const off=side*(half+(track.urban?3.2:8));for(const y of [.6,1.2,2,3.4])scene.ribbon(track,off-.035,off+.035,'#6f797d',y);}
 const start=safeSite(track,1-120/track.length,83,1),pit=new THREE.Group();pit.position.set(start.x,start.y,start.z);pit.rotation.y=start.heading;group.add(pit);scene.box(13,6,155,'#c5c6bd',0,3,0,pit);scene.box(13.3,2,155.3,'#324653',0,5,0,pit);scene.box(16,.5,160,'#e9e8dc',0,6.3,0,pit);for(let i=0;i<16;i++){scene.box(.1,3.2,6.5,i%3?'#53636e':'#da403c',-6.55,1.65,-71+i*9,pit);scene.box(.11,.15,6.5,'#bac4c5',-6.57,2.3,-71+i*9,pit);}
 // Occupied stepped grandstands run parallel to local track tangent.
 for(const location of [120,track.length*.26,track.length*.58,track.length*.82]){
  const p=safeSite(track,location/track.length,40,-1),g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=p.heading;group.add(g);
  for(let r=0;r<7;r++)scene.box(1.5,.7,62,['#526779','#d1cec0','#427e8b'][r%3],-r*1.35,.6+r*.75,0,g);
  scene.box(12,.35,65,'#d8dacf',-4,7.8,0,g);for(const z of [-30,0,30])scene.box(.2,8,.2,'#6c7b7e',-9,4,z,g);
  const crowd=new THREE.InstancedMesh(new THREE.BoxGeometry(.45,.65,.4),material('#ffffff'),245);for(let i=0;i<245;i++){let r=Math.floor(i/35);dummy.position.set(-r*1.35,.95+r*.75,-29+(i%35)*1.7);dummy.scale.setScalar(1);dummy.rotation.set(0,0,0);dummy.updateMatrix();crowd.setMatrixAt(i,dummy.matrix);crowd.setColorAt(i,new THREE.Color(['#df543c','#d8dcd8','#2c556b','#f0d265','#355470'][i%5]));}g.add(crowd);
 }
 for(let s=150;s<track.length;s+=280){if(scene.track.id!==track.id)break;const p=sample(track,s,half+3.5),board=sign('100',2,1.4);board.position.set(p.x,p.y+1.7,p.z);board.rotation.y=p.heading+Math.PI;group.add(board);}
 if(profile.night){
  for(let s=0;s<track.length;s+=75){for(const side of [-1,1]){const p=sample(track,s,side*(half+11));scene.box(.2,15,.2,'#667689',p.x,p.y+7.5,p.z);const lamp=new THREE.Mesh(new THREE.BoxGeometry(3,.25,1.3),new THREE.MeshBasicMaterial({color:'#f2f7ff',toneMapped:false}));lamp.userData.batchBox=true;lamp.position.set(p.x,p.y+15,p.z);lamp.rotation.y=p.heading;group.add(lamp);}}
 }
 addLandmarks(scene,track);
 if(track.id==='mc-1929')monaco(scene,track);
 return profile;
}
function geo(track,lon,lat){return{x:(lon-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(lat-track.origin.lat)*111320};}
function sign(text,w,h){const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');x.fillStyle='#f1f0e5';x.fillRect(0,0,512,256);x.fillStyle='#15222c';x.font='bold 145px Arial';x.textAlign='center';x.fillText(text,256,181);return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),side:THREE.DoubleSide}));}
function ferris(scene,track,lon,lat){const p=geo(track,lon,lat),g=new THREE.Group();g.position.set(p.x,terrainHeight(track,p.x,p.z)+25,p.z);scene.group.add(g);g.rotation.y=.25;const ring=new THREE.Mesh(new THREE.TorusGeometry(21,.35,6,48),material('#d7e0db'));g.add(ring);for(let i=0;i<16;i++){const a=i/16*Math.PI*2,spoke=scene.box(.15,42,.15,'#cbd1c9',0,0,0,g);spoke.rotation.z=a;scene.box(2.4,2.8,2.2,['#e67938','#43a7b8','#d64c4f'][i%3],Math.sin(a)*21,Math.cos(a)*21,0,g);}for(const x of [-8,8]){const leg=scene.box(.7,31,.7,'#b3bebc',x,-14,0,g);leg.rotation.z=x/40;}}
function monaco(scene,track){
 // The shoreline scenery is intentionally stylized; the OSM layer supplies actual footprints.
 const p=geo(track,7.4266,43.7359),water=new THREE.Mesh(new THREE.PlaneGeometry(300,230),material('#277e8d',{metalness:.5,roughness:.24}));water.rotation.x=-Math.PI/2;water.position.set(p.x,-.035,p.z);scene.group.add(water);
 for(let i=0;i<12;i++){const boat=new THREE.Group();boat.position.set(p.x-110+(i%6)*42,0,p.z-55+Math.floor(i/6)*75);boat.rotation.y=.2;scene.group.add(boat);scene.box(9,2.5,28,'#eae6d9',0,1,0,boat);scene.box(6,3,12,'#d5e2e2',0,3,0,boat);scene.box(5,.8,7,'#314f61',0,4.4,1,boat);}
 // Tunnel cover follows the actual southeast coastal segment rather than a straight slab.
 const center=geo(track,7.4293,43.7382);let idx=0,d=Infinity;track.points.forEach((p,i)=>{const v=Math.hypot(p.x-center.x,p.z-center.z);if(v<d){d=v;idx=i;}});for(let s=idx*track.step-90;s<idx*track.step+90;s+=8){const p=sample(track,s),g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=p.heading;scene.group.add(g);scene.box(track.width+3,.7,8.4,'#b0b1a6',0,5.5,0,g);for(const x of [-track.width/2-1,track.width/2+1])scene.box(.5,5.5,8.4,'#b7b8b0',x,2.75,0,g);}
}
export async function addMappedScenery(scene,track){
 const originalGroup=scene.group;
 try{const files=await (await fetch('/data/scenery/index.json')).json();if(!files.includes(track.id)||scene.group!==originalGroup)return false;const r=await fetch(`/data/scenery/${track.id}.json`);if(!r.ok)return false;const data=await r.json();if(scene.group!==originalGroup)return false;
 const color=scene.profile?.night?'#698193':'#b5b7ae';const buildingMat=material(color),waterMat=material('#397f90',{metalness:.45,roughness:.28}),forestMat=material('#526b45');
 let added=0;
 // Cap only rendering, retaining the full open geographic data on disk.
 const features=[...data.features].sort((a,b)=>a.kind==='building'&&b.kind!=='building'?1:-1);
 for(const f of features){if(added>800)break;if(f.kind==='forest')continue;const shape=new THREE.Shape();f.points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();let mesh;
 if(f.kind==='building'){
  const cx=f.points.reduce((s,p)=>s+p[0],0)/f.points.length,cz=f.points.reduce((s,p)=>s+p[1],0)/f.points.length;const radius=Math.max(...f.points.map(([x,z])=>Math.hypot(x-cx,z-cz)));if(roadClearance(track,cx,cz)<radius+4)continue;
  mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:f.height,bevelEnabled:false}),buildingMat);
 }else mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),f.kind==='water'?waterMat:forestMat);
 mesh.rotation.x=-Math.PI/2;const cx=f.points.reduce((s,p)=>s+p[0],0)/f.points.length,cz=f.points.reduce((s,p)=>s+p[1],0)/f.points.length;mesh.position.y=terrainHeight(track,cx,cz)+(f.kind==='building'?-.3:-.045);mesh.userData.mappedStatic=true;mesh.castShadow=f.kind==='building';mesh.receiveShadow=true;originalGroup.add(mesh);added++;
 }
 batchMapped(originalGroup);const credit=document.getElementById('map-credit');if(credit)credit.hidden=!added;return added>0;
 }catch{return false;}
}
