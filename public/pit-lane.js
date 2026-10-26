import * as THREE from '/vendor/three.module.js';
import {pitLayout} from '/shared/pits.mjs';
import {sample} from '/shared/tracks.mjs';

export function addPitLane(scene,track){
 const plan=pitLayout(track),group=new THREE.Group();scene.group.add(group);
 const paint=new THREE.MeshBasicMaterial({color:'#68cbd7',transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3});
 const positions=[];
 for(let d=0;d<plan.length;d+=3){
  for(const [s,o] of [[d,plan.offset-1.8],[Math.min(plan.length,d+3),plan.offset-1.8],[d,plan.offset+1.8],[d,plan.offset+1.8],[Math.min(plan.length,d+3),plan.offset-1.8],[Math.min(plan.length,d+3),plan.offset+1.8]]){const p=sample(track,plan.entry+s,o);positions.push(p.x,p.y+.13,p.z);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));group.add(new THREE.Mesh(geometry,paint));
 const boxAt=sample(track,plan.entry+plan.box,plan.offset),box=new THREE.Group();box.position.set(boxAt.x,boxAt.y+.16,boxAt.z);box.rotation.set(-boxAt.pitch,boxAt.heading,0,'YXZ');group.add(box);
 const yellow=new THREE.MeshBasicMaterial({color:'#ffdd58'});
 for(const x of [-1.65,1.65]){const stripe=new THREE.Mesh(new THREE.BoxGeometry(.12,.015,7),yellow);stripe.position.set(x,0,0);box.add(stripe);}
 for(const z of [-3.5,3.5]){const stripe=new THREE.Mesh(new THREE.BoxGeometry(3.4,.015,.15),yellow);stripe.position.set(0,0,z);box.add(stripe);}
 function label(text,distance){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ink=canvas.getContext('2d');ink.fillStyle='#122c36';ink.fillRect(0,0,512,256);ink.fillStyle='#eafcff';ink.textAlign='center';ink.font='900 62px Arial';ink.fillText(text,256,110);ink.font='bold 39px Arial';ink.fillText('80 KM/H',256,190);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.2,1.6),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4})),p=sample(track,plan.entry+distance,plan.offset);sign.position.set(p.x,p.y+.16,p.z);sign.rotation.set(-Math.PI/2,p.heading,0,'YXZ');group.add(sign);
 }
 label('PIT IN',12);label('BOX',plan.box-10);label('PIT OUT',plan.length-12);
 // Low-cost crew animation is visible only while a car is being serviced;
 // no scenery poles, walls or props are added to the racing path.
 const crew=[];
 for(const x of [-1.4,1.4])for(const z of [-1.2,1.45]){
  const member=new THREE.Group(),suit=new THREE.MeshStandardMaterial({color:'#e45024',roughness:.8}),helmet=new THREE.MeshStandardMaterial({color:'#f6f4e8'});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.16,.22,.62,8),suit);body.position.y=.43;member.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),helmet);head.position.y=.88;member.add(head);member.position.set(x,0,z);box.add(member);crew.push(member);
 }
 return {update(cars,now){const servicing=cars.some(c=>!c.finished&&c.pitState==='service');for(const [i,member]of crew.entries()){member.visible=servicing;member.rotation.z=servicing?Math.sin(now*.018+i)*.12:0;member.position.y=servicing?Math.sin(now*.022+i)*.025:0;}}};
}
