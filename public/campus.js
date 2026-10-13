import * as THREE from '/vendor/three.module.js';
import {sample,terrainHeight} from '/shared/tracks.mjs';
import {campusLocal,campusDistance} from '/shared/campus.mjs';
import {roadClearance} from '/shared/venues.mjs';
import {campusTunnelLayout} from '/shared/campus-geometry.mjs';
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
function campusSign(text,w=9,h=1.6){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=192;const ctx=canvas.getContext('2d');
 ctx.fillStyle='#173c32';ctx.fillRect(0,0,1024,192);ctx.fillStyle='#ebca64';ctx.fillRect(0,0,1024,12);ctx.fillStyle='#f4f3e7';ctx.font='bold 74px Arial';ctx.textAlign='center';ctx.fillText(text,512,125,960);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
}
function buildTunnel(scene,track,tunnel){
 const half=track.width/2,edge=tunnel.covered/2,layout=campusTunnelLayout(track,tunnel);
 scene.wallMesh(layout.walls,'#a5a79b');
 // Vertical retaining walls and their coping use the exact collision endpoints.
 // Trimmed sections stay below any crossing road; missing sections leave no
 // invisible collider in a neighboring lane.
 const lifted=(w,y,height,width=w.width,shift=0)=>({...w,width,height,a:{x:w.a.x+(w.inward?.x||0)*shift,y:w.a.y+y,z:w.a.z+(w.inward?.z||0)*shift},b:{x:w.b.x+(w.inward?.x||0)*shift,y:w.b.y+y,z:w.b.z+(w.inward?.z||0)*shift}});
 scene.wallMesh(layout.walls.map(w=>lifted(w,w.height,.16,.65)),'#d6b756');
 scene.wallMesh(layout.walls.map(w=>lifted(w,.06,.08,.3,.5)),'#263337');
 for(const {s,d,length} of layout.ramps){
  const p=sample(track,s),g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.set(-p.pitch,p.heading,0,'YXZ');scene.group.add(g);
  for(const side of [-1,1]){
   const wall=layout.walls.find(w=>w.s===s&&w.side===side),bank=sample(track,s,side*(half+4.1));
   if(wall?.height>1&&roadClearance(track,bank.x,bank.z)>=4.2)scene.box(6,wall.height-.5,length,'#7a8b62',side*(half+4.1),(wall.height-.5)/2,0,g);
  }
  if(Math.abs(d)<edge){
   scene.box(track.width+2.3,.65,length,'#aeb0a6',0,6.6,0,g);
   if(Math.floor((d+edge)/4)%3===0)for(const side of [-1,1])scene.box(.15,.12,1.5,'#fff0b8',side*(half-.7),6.23,0,g);
  }
 }
 scene.wallMesh(layout.portals,'#c4c2b6');
 const stripes={'#242a2e':[],'#dfc65d':[]};
 for(const wall of layout.portals)for(let y=.5;y<Math.min(6.6,wall.height);y+=.8)stripes[y%1.6<.8?'#242a2e':'#dfc65d'].push(lifted(wall,y,Math.min(.25,wall.height-y),.86));
 for(const [color,walls] of Object.entries(stripes))scene.wallMesh(walls,color);
 for(const direction of [-1,1]){
  const p=sample(track,tunnel.center+direction*(edge+1)),g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=p.heading;scene.group.add(g);
  scene.box(track.width+2.5,.8,1.2,'#c4c2b6',0,6.7,0,g);
  const sign=campusSign(tunnel.name.toUpperCase(),Math.min(11,track.width-2),1);sign.position.set(0,7.65,direction*.7);g.add(sign);
 }
}
function buildRailway(scene,track){
 const sleeperGeometry=new THREE.BoxGeometry(3.1,.14,.25),sleeperMat=mat('#746c5a'),dummy=new THREE.Object3D();
 for(const line of track.campus.railway){
  const points=line.map(p=>campusLocal(track,p)),lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.z-points[i].z)),total=lengths.reduce((a,b)=>a+b,0);
  const sleepers=new THREE.InstancedMesh(sleeperGeometry.clone(),sleeperMat.clone(),Math.ceil(total/2)+points.length);let count=0;
  for(let i=0;i<points.length-1;i++){
   const a=points[i],b=points[i+1],length=lengths[i],heading=Math.atan2(b.x-a.x,b.z-a.z);
   for(let d=0;d<length;d+=2){const t=d/length,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=terrainHeight(track,x,z)+1.2;dummy.position.set(x,y,z);dummy.rotation.set(0,heading,0);dummy.scale.set(1,1,1);dummy.updateMatrix();sleepers.setMatrixAt(count++,dummy.matrix);}
   for(let d=0;d<length;d+=12){const span=Math.min(12,length-d),t=(d+span/2)/length,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=terrainHeight(track,x,z)+1.32;
    for(const side of [-1,1]){const rail=scene.box(.09,.13,span+.1,'#92999b',x+Math.cos(heading)*side*.8,y,z-Math.sin(heading)*side*.8);rail.rotation.y=heading;}
   }
  }
  sleepers.count=count;sleepers.receiveShadow=true;sleepers.computeBoundingSphere();scene.group.add(sleepers);
 }
 sleeperGeometry.dispose();sleeperMat.dispose();
}
export function addCampus(scene,track){
 const group=scene.group,half=track.width/2,dummy=new THREE.Object3D(),count=Math.ceil(track.length/32)*2;
 const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.2,.3,7,6),mat('#806c4c'),count),crowns=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),mat('#3e683c'),count*3);let n=0,m=0;
 for(let s=0;s<track.length;s+=32)for(const side of [-1,1]){
  const p=sample(track,s,side*(half+16+Math.abs(Math.sin(s*.017))*10));if(roadClearance(track,p.x,p.z)<5)continue;
  const y=terrainHeight(track,p.x,p.z);dummy.position.set(p.x,y+3.5,p.z);dummy.rotation.set(0,s*.03,0);dummy.scale.set(1,1,1);dummy.updateMatrix();trunks.setMatrixAt(n++,dummy.matrix);
  for(let leaf=0;leaf<3;leaf++){dummy.position.set(p.x,y+7.3,p.z);dummy.rotation.set(0,s*.03+leaf*Math.PI/3,.12);dummy.scale.set(5,.65,1.5);dummy.updateMatrix();crowns.setMatrixAt(m++,dummy.matrix);}
 }
 trunks.count=n;crowns.count=m;group.add(trunks,crowns);
 for(const tunnel of track.campus.tunnels)buildTunnel(scene,track,tunnel);
 buildRailway(scene,track);
 for(const island of track.campus.roundabouts){
  const p=campusLocal(track,island.location),y=terrainHeight(track,p.x,p.z),apron=new THREE.Mesh(new THREE.CylinderGeometry(5.3,5.3,1,32),mat('#7a8b62'));apron.position.set(p.x,y-.45,p.z);group.add(apron);const base=new THREE.Mesh(new THREE.CylinderGeometry(island.radius,island.radius,1.4,24),mat('#e8dfbf'));base.position.set(p.x,y-.275,p.z);group.add(base);
  const garden=new THREE.Mesh(new THREE.CylinderGeometry(island.radius-.3,island.radius-.3,.2,24),mat('#497744'));garden.position.set(p.x,y+.48,p.z);group.add(garden);
  const shrubs=new THREE.Mesh(new THREE.IcosahedronGeometry(1.2,1),mat('#436836'));shrubs.position.set(p.x,y+1.2,p.z);group.add(shrubs);
 }
 // Lamp poles stay beside the natural ground, including open tunnel approaches.
 for(let s=40;s<track.length;s+=62){
  if(track.campus.tunnels.some(t=>campusDistance(track,s,t.center)<t.covered/2+15))continue;
  const p=sample(track,s,half+3.5);if(roadClearance(track,p.x,p.z)<2)continue;const y=terrainHeight(track,p.x,p.z);
  scene.box(.14,7,.14,'#718078',p.x,y+3.5,p.z);const lamp=scene.box(1.8,.15,.4,'#e7e4c7',p.x,y+7,p.z);lamp.rotation.y=p.heading;
 }
 for(const landmark of track.campus.landmarks){
  if(landmark.name==='VIT Lake')continue;const p=campusLocal(track,landmark.location);if(roadClearance(track,p.x,p.z)<5)continue;
  const sign=campusSign(landmark.name.toUpperCase(),landmark.name==='VIT VELLORE'?18:10,1.8);sign.position.set(p.x,terrainHeight(track,p.x,p.z)+5,p.z);group.add(sign);
 }
 return scene.profile;
}
