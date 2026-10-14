import {addMonaco} from './monaco.js';
import {addSpa} from './spa.js';
import {addBahrain} from './bahrain.js';
import {addSuzuka} from './suzuka.js';
import {addShanghai} from './shanghai.js';
import {addAlbertPark} from './albert-park.js';
import {addVegetation} from './vegetation.js';
import {addCampus} from './campus.js';
import {CampusBuildings} from './campus-buildings.js';
import {addLandmarks} from './landmarks.js';
import {batchMapped} from './batching.js';
import {safeSite,safeBoxSite,roadClearance} from '/shared/venues.mjs';
import {addBrakingBoards,addStreetFrontages,trackSign} from './track-furniture.js';
import {LIVERIES} from '/shared/liveries.mjs';
import * as THREE from '/vendor/three.module.js';
import {sample,terrainHeight} from '/shared/tracks.mjs';
import {ribbonOffset} from '/shared/surface.mjs';
import {campusScale} from '/shared/campus.mjs';
const material=(color,extras={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extras});
const nightIds=['sg-2008','us-2023','sa-2021','ae-2009','bh-2002','qa-2004'];
const desertIds=['bh-2002','sa-2021','qa-2004','ae-2009','us-2023'];
const forestIds=['it-1922','be-1925','de-1927','de-1932','it-1953','at-1969','us-1956'];
const tropicalIds=['my-1999','sg-2008','br-1940','us-2022','au-1953','in-vit-vellore'];
export function venueProfile(track){return {night:nightIds.includes(track.id),desert:desertIds.includes(track.id),forest:forestIds.includes(track.id),tropical:tropicalIds.includes(track.id),goldenHour:track.id==='au-1953',industrialHaze:track.id==='cn-2004',clearHills:track.id==='jp-1962',desertTwilight:track.id==='bh-2002',ardennes:track.id==='be-1925',riviera:track.id==='mc-1929',ground:track.campus?'#7a8b62':desertIds.includes(track.id)?'#a3987d':track.urban?'#697775':'#687c4c',sky:nightIds.includes(track.id)?'#17263e':'#91b2cc'};}
export function addVenue(scene,track){
 if(track.campus)return addCampus(scene,track);
 if(track.id==='au-1953')return addAlbertPark(scene,track);
 if(track.id==='cn-2004')return addShanghai(scene,track);
 if(track.id==='jp-1962')return addSuzuka(scene,track);
 if(track.id==='bh-2002')return addBahrain(scene,track);
 if(track.id==='be-1925')return addSpa(scene,track);
 if(track.id==='mc-1929')return addMonaco(scene,track);
 const profile=venueProfile(track),group=scene.group,half=track.width/2,dummy=new THREE.Object3D();
 addVegetation(scene,track,profile);
 // Safety barriers, catch fencing, pit garages and distance boards add depth.
 const postsCount=Math.ceil(track.length/18)*2,posts=new THREE.InstancedMesh(new THREE.CylinderGeometry(.06,.07,3.5,4),material('#6f777c'),postsCount);let f=0;
 for(let s=0;s<track.length;s+=18)for(const side of [-1,1]){const p=sample(track,s,ribbonOffset(track,Math.floor(s/track.step),side*(half+(track.urban?3.2:8))));dummy.position.set(p.x,p.y+1.75,p.z);dummy.scale.set(1,1,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();posts.setMatrixAt(f++,dummy.matrix);}posts.count=f;group.add(posts);
 const start=safeBoxSite(track,track.length-95,23,84,1),pit=new THREE.Group();pit.position.set(start.x,start.y,start.z);pit.rotation.y=start.heading;group.add(pit);
 scene.box(43,.24,166,'#686d70',0,.05,0,pit);scene.box(13,6,155,'#c5c6bd',0,3,0,pit);scene.box(13.3,2,155.3,'#324653',0,5,0,pit);scene.box(16,.5,160,'#e9e8dc',0,6.3,0,pit);
 const pitName=trackSign(track.city.toUpperCase()+'  •  PIT LANE',145,1.1,'#223742','#ecebe0');pitName.position.set(-6.73,5.25,0);pitName.rotation.y=-Math.PI/2;pit.add(pitName);
 for(let i=0;i<16;i++){
  const team=LIVERIES[i%LIVERIES.length],z=-71+i*9;scene.box(.1,3.2,6.5,team.side,-6.55,1.65,z,pit);scene.box(.11,.2,6.5,team.accent,-6.64,3.32,z,pit);
  const name=trackSign(team.label,6.4,.62,team.side,team.ink);name.position.set(-6.73,3.9,z);name.rotation.y=-Math.PI/2;pit.add(name);
 }
 // Occupied stepped grandstands run parallel to local track tangent.
 for(const location of [120,track.length*.26,track.length*.58,track.length*.82]){
  const p=safeSite(track,location/track.length,40,-1),g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=p.heading;group.add(g);
  for(let r=0;r<7;r++)scene.box(1.5,.7,62,['#526779','#d1cec0','#427e8b'][r%3],-r*1.35,.6+r*.75,0,g);
  scene.box(12,.35,65,'#d8dacf',-4,7.8,0,g);for(const z of [-30,0,30])scene.box(.2,8,.2,'#6c7b7e',-9,4,z,g);
  const crowd=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.18,.3,2,6),material('#ffffff'),245),heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.115,8,6),material('#ffffff'),245);
  for(let i=0;i<245;i++){
   const r=Math.floor(i/35),x=-r*1.35,z=-29+(i%35)*1.7;
   dummy.position.set(x,1.28+r*.75,z);dummy.scale.set(1,1,.85);dummy.rotation.set(0,0,.06*Math.sin(i));dummy.updateMatrix();crowd.setMatrixAt(i,dummy.matrix);crowd.setColorAt(i,new THREE.Color(['#df543c','#d8dcd8','#2c556b','#f0d265','#355470'][i%5]));
   dummy.position.set(x,1.73+r*.75,z);dummy.scale.setScalar(1);dummy.rotation.set(0,0,0);dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);heads.setColorAt(i,new THREE.Color(['#c69b79','#e0b994','#926f55','#cca183'][i%4]));
  }
  crowd.computeBoundingSphere();heads.computeBoundingSphere();g.add(crowd,heads);
  for(const z of [-30,-15,0,15,30]){scene.box(10,.15,.15,'#7d8a8f',-4,7.55,z,g);const brace=scene.box(.1,2.3,.1,'#7d8a8f',-8.1,6.9,z,g);brace.rotation.z=-.75;}

 }
 addBrakingBoards(scene,track);addStreetFrontages(scene,track);
 if(profile.night){
  for(let s=0;s<track.length;s+=75){for(const side of [-1,1]){const p=sample(track,s,side*(half+11));scene.box(.2,15,.2,'#667689',p.x,p.y+7.5,p.z);const lamp=new THREE.Mesh(new THREE.BoxGeometry(3,.25,1.3),new THREE.MeshBasicMaterial({color:'#f2f7ff',toneMapped:false}));lamp.userData.batchBox=true;lamp.position.set(p.x,p.y+15,p.z);lamp.rotation.y=p.heading;group.add(lamp);}}
 }
 addLandmarks(scene,track);
 return profile;
}
export async function addMappedScenery(scene,track){
 const originalGroup=scene.group;
 try{const files=await (await fetch('/data/scenery/index.json')).json();if(!files.includes(track.id)||scene.group!==originalGroup)return false;const r=await fetch(`/data/scenery/${track.id}.json`);if(!r.ok)return false;const data=await r.json();if(scene.group!==originalGroup)return false;
 const waterMat=material('#397f90',{metalness:.45,roughness:.28}),forestMat=material('#526b45'),campusBuildings=new CampusBuildings(scene,track);
 let added=0;
 // Cap only rendering, retaining the full open geographic data on disk.
 const features=[...data.features].sort((a,b)=>a.kind==='building'&&b.kind!=='building'?1:-1);
 for(const original of features){if(added>800)break;if(original.kind==='forest')continue;
 if(campusBuildings&&original.kind==='building'){if(campusBuildings.add(original))added++;continue;}
 const scale=campusScale(track),f=track.campus?{...original,points:original.points.map(([x,z])=>[x*scale,z*scale])}:original;
 const shape=new THREE.Shape();f.points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();let mesh;
 mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),f.kind==='water'?waterMat:forestMat);
 mesh.rotation.x=-Math.PI/2;const cx=f.points.reduce((s,p)=>s+p[0],0)/f.points.length,cz=f.points.reduce((s,p)=>s+p[1],0)/f.points.length;mesh.position.y=terrainHeight(track,cx,cz)+(f.kind==='building'?-.3:-.045);mesh.userData.mappedStatic=true;mesh.castShadow=f.kind==='building';mesh.receiveShadow=true;originalGroup.add(mesh);added++;
 }
 campusBuildings?.finish();batchMapped(originalGroup);const credit=document.getElementById('map-credit');if(credit)credit.hidden=!added;return added>0;
 }catch{return false;}
}
