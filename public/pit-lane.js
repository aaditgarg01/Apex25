import * as THREE from '/vendor/three.module.js';
import {pitLayout,pitRoadPose} from '/shared/pit-layout.mjs';


export function addPitLane(scene,track){
 const plan=pitLayout(track),group=new THREE.Group();scene.group.add(group);
 const paint=new THREE.MeshBasicMaterial({color:'#27353b',transparent:false,depthWrite:true,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
 const positions=[];
 for(let d=0;d<plan.length;d+=3){
  for(const [s,o] of [[d,plan.offset-plan.width/2],[Math.min(plan.length,d+3),plan.offset-plan.width/2],[d,plan.offset+plan.width/2],[d,plan.offset+plan.width/2],[Math.min(plan.length,d+3),plan.offset-plan.width/2],[Math.min(plan.length,d+3),plan.offset+plan.width/2]]){const p=pitRoadPose(track,s,o-plan.offset);positions.push(p.x,p.y+.045,p.z);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));group.add(new THREE.Mesh(geometry,paint));
 const edgePaint=new THREE.MeshBasicMaterial({color:'#45d9ef',side:THREE.DoubleSide,toneMapped:false,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-8,polygonOffsetUnits:-6});for(const side of [-1,1]){const pts=[];for(let d=0;d<plan.length;d+=3)for(const [at,o]of [[d,side*(plan.width/2-.28)],[Math.min(d+3,plan.length),side*(plan.width/2-.28)],[d,side*(plan.width/2+.02)],[d,side*(plan.width/2+.02)],[Math.min(d+3,plan.length),side*(plan.width/2-.28)],[Math.min(d+3,plan.length),side*(plan.width/2+.02)]]){const p=pitRoadPose(track,at,o);pts.push(p.x,p.y+.08,p.z);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));group.add(new THREE.Mesh(g,edgePaint));}
 const boxAt=pitRoadPose(track,plan.box),box=new THREE.Group();box.position.set(boxAt.x,boxAt.y+.09,boxAt.z);box.rotation.set(-boxAt.pitch,boxAt.heading,0,'YXZ');group.add(box);
 const yellow=new THREE.MeshBasicMaterial({color:'#ffdd58'});
 for(const x of [-1.65,1.65]){const stripe=new THREE.Mesh(new THREE.BoxGeometry(.12,.015,7),yellow);stripe.position.set(x,0,0);box.add(stripe);}
 for(const z of [-3.5,3.5]){const stripe=new THREE.Mesh(new THREE.BoxGeometry(3.4,.015,.15),yellow);stripe.position.set(0,0,z);box.add(stripe);}
 function label(text,distance){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ink=canvas.getContext('2d');ink.fillStyle='#122c36';ink.fillRect(0,0,512,256);ink.fillStyle='#eafcff';ink.textAlign='center';ink.font='900 62px Arial';ink.fillText(text,256,110);ink.font='bold 39px Arial';ink.fillText('80 KM/H',256,190);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.2,1.6),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4})),p=pitRoadPose(track,distance);sign.position.set(p.x,p.y+.09,p.z);sign.rotation.set(-Math.PI/2,p.heading,0,'YXZ');group.add(sign);
 }
 label(plan.side<0?'PIT LEFT':'PIT RIGHT',8);label('BOX',plan.box-10);label('PIT OUT',plan.length-12);
 // Low-cost crew animation is visible only while a car is being serviced;
 // no scenery poles, walls or props are added to the racing path.
 const crew=[];
 for(const x of [-1.4,1.4])for(const z of [-1.2,1.45]){
  const member=new THREE.Group(),suit=new THREE.MeshStandardMaterial({color:'#e45024',roughness:.8}),helmet=new THREE.MeshStandardMaterial({color:'#f6f4e8'});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.16,.22,.62,8),suit);body.position.y=.43;member.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),helmet);head.position.y=.88;member.add(head);member.position.set(x,0,z);box.add(member);crew.push(member);
 }
 group.traverse(o=>o.userData.pitKeep=true);
 return {update(cars,now){const servicing=cars.some(c=>!c.finished&&c.pitState==='service');for(const [i,member]of crew.entries()){member.visible=servicing;member.rotation.z=servicing?Math.sin(now*.018+i)*.12:0;member.position.y=servicing?Math.sin(now*.022+i)*.025:0;}}};
}

// Reserve the lane before scenery batching; retain terrain, the racing ribbon,
// safety walls, cars and the pit's own props. Also run before mapped scenery merges.
export function clearPitScenery(root,track){
 const plan=pitLayout(track),points=plan.samples.filter((_,i)=>i%2===0),removed=[];root.updateMatrixWorld(true);
 const overlaps=box=>points.some(p=>p.x>box.min.x-3&&p.x<box.max.x+3&&p.z>box.min.z-3&&p.z<box.max.z+3&&box.min.y<p.y+3&&box.max.y>p.y+.35);
 const matrix=new THREE.Matrix4(),local=new THREE.Matrix4(),box=new THREE.Box3();
 root.traverse(o=>{
  if(!o.isMesh)return;for(let parent=o;parent;parent=parent.parent)if(parent.userData.pitKeep||parent.userData.wheels)return;
  if(!o.isInstancedMesh&&!o.userData.batchBox&&!o.userData.mappedStatic)return;
  if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
  if(o.isInstancedMesh){let changed=false;for(let i=0;i<o.count;i++){o.getMatrixAt(i,local);matrix.multiplyMatrices(o.matrixWorld,local);box.copy(o.geometry.boundingBox).applyMatrix4(matrix);if(box.max.y-box.min.y>.8&&overlaps(box)){local.scale(new THREE.Vector3(0,0,0));o.setMatrixAt(i,local);changed=true;}}if(changed){o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere();}return;}
  box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);if(box.max.y-box.min.y>.8&&overlaps(box))removed.push(o);
 });
 for(const o of removed)o.removeFromParent();
}
