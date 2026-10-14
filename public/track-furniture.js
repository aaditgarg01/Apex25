import * as THREE from '/vendor/three.module.js';
import {sample,wrap,angleDiff} from '/shared/tracks.mjs';
import {prepareRacingLine} from '/shared/racing-line.mjs';
import {roadClearance,safeBoxSite} from '/shared/venues.mjs';
import {buildingFacade} from './campus-buildings.js';

export function trackSign(text,width=2,height=1.2,color='#ebeae0',ink='#1d2c34'){
 const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,1024,256);x.fillStyle=ink;x.font='bold 150px Arial';x.textAlign='center';x.fillText(text,512,183,980);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshStandardMaterial({map:texture,roughness:.8,side:THREE.DoubleSide}));
}
export function addFacadePanels(group,width,height,depth,material){
 for(const side of [-1,1])for(const axis of ['x','z']){
  const w=axis==='x'?depth:width,geometry=new THREE.PlaneGeometry(w,height),uv=geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/3.8,uv.getY(i)*height/3.4);
  const panel=new THREE.Mesh(geometry,material);panel.position.set(axis==='x'?side*(width/2+.03):0,height/2,axis==='z'?side*(depth/2+.03):0);panel.rotation.y=axis==='x'?side*Math.PI/2:side<0?Math.PI:0;panel.userData.mappedStatic=true;panel.receiveShadow=true;group.add(panel);
 }
}
export function addBrakingBoards(scene,track){
 if(track.campus)return;
 const line=prepareRacingLine(track),n=line.points.length,curvature=line.curvature,candidates=[];
 for(let i=0;i<n;i++){
  if(curvature[i]<.012)continue;
  let peak=true;for(let j=-6;j<=6;j++)if(curvature[wrap(i+j,n)]>curvature[i]){peak=false;break;}
  if(peak)candidates.push(i);
 }
 const selected=[];for(const i of candidates.sort((a,b)=>curvature[b]-curvature[a]))if(!selected.some(j=>Math.min(wrap((i-j)*line.step,track.length),wrap((j-i)*line.step,track.length))<100))selected.push(i);
 const mats=new Map();
 for(const i of selected){
  const a=line.points[wrap(i-3,n)],b=line.points[wrap(i+3,n)],side=-Math.sign(angleDiff(b.heading,a.heading))||1;
  for(const distance of [150,100,50]){
   const s=i*line.step-distance,j=Math.floor(wrap(s,track.length)/line.step);if(curvature[j]>.014&&distance>50)continue;
   const p=sample(track,s,side*(track.width/2+(track.urban?1.8:4.2)));if(roadClearance(track,p.x,p.z)<1)continue;
   if(!mats.has(distance))mats.set(distance,trackSign(String(distance),1.35,1.05).material);
   const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.35,1.05),mats.get(distance));sign.position.set(p.x,p.y+1.35,p.z);sign.rotation.y=p.heading+Math.PI;sign.userData.mappedStatic=true;scene.group.add(sign);
   scene.box(.08,1.3,.08,'#879290',p.x,p.y+.65,p.z);
  }
 }
}
export function addStreetFrontages(scene,track){
 if(!scene.appearance.street)return;
 const kind=scene.appearance.theme==='coast'?'coastal':'urban',material=buildingFacade(kind);if(scene.profile.night){material.emissive.set('#385564');material.emissiveIntensity=.35;}
 for(let s=120;s<track.length;s+=130)for(const side of [-1,1]){
  const p=safeBoxSite(track,s,8,12,side,9);
  if(track.id==='mc-1929'){
   const x=(7.4266-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z=-(43.7359-track.origin.lat)*111320;if(Math.abs(p.x-x)<160&&Math.abs(p.z-z)<125)continue;
  }
  const height=track.id==='mc-1929'?12+Math.abs(Math.sin(s*.03))*14:18+Math.abs(Math.sin(s*.011))*30,group=new THREE.Group();group.position.set(p.x,p.y,p.z);group.rotation.y=p.heading;scene.group.add(group);
  scene.box(14,height,20,kind==='coastal'?'#d7c5b1':'#a8b5bc',0,height/2,0,group);addFacadePanels(group,14,height,20,material);scene.box(14.4,.35,20.4,kind==='coastal'?'#b38f75':'#8499a6',0,height+.18,0,group);
 }
}
