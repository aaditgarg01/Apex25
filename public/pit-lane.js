import {pitTransitPlan} from '/shared/pit-timing.mjs';
import * as THREE from '/vendor/three.module.js';
import {PIT_SERVICE_SECONDS} from '/shared/pits.mjs';
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
 const dummy=new THREE.Object3D(),paintY=.09;
 const stripes=new THREE.InstancedMesh(
  new THREE.BoxGeometry(1,1,1),
  new THREE.MeshBasicMaterial({color:'#ffdd58'}),
  plan.boxes.length*4
 );
 let stripeIndex=0;
 for(const station of plan.boxes){
  for(const [distance,across,w,d] of [
   [station,-1.65,.12,7],[station,1.65,.12,7],
   [station-3.5,0,3.4,.15],[station+3.5,0,3.4,.15],
  ]){
   const p=pitRoadPose(track,distance,across);
   dummy.position.set(p.x,p.y+paintY,p.z);
   dummy.rotation.set(-p.pitch,p.heading,0,'YXZ');
   dummy.scale.set(w,.015,d);
   dummy.updateMatrix();
   stripes.setMatrixAt(stripeIndex++,dummy.matrix);
  }
 }
 stripes.instanceMatrix.needsUpdate=true;
 group.add(stripes);
 function label(text,distance,number=false){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const ink=canvas.getContext('2d');ink.fillStyle=number?'#233037':'#122c36';ink.fillRect(0,0,512,256);
  ink.fillStyle=number?'#ffdd58':'#eafcff';ink.textAlign='center';ink.font=number?'900 172px Arial':'900 62px Arial';
  ink.fillText(text,256,number?190:110);
  if(!number){ink.font='bold 39px Arial';ink.fillText(Math.round(pitTransitPlan(track).speed*3.6)+' KM/H',256,190);}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(number?1.15:3.2,number?.57:1.6),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4}));
  const p=pitRoadPose(track,distance,number?plan.side*2.33:0);
  sign.position.set(p.x,p.y+paintY,p.z);
  const flip=number||['tr-2005','pt-2008','fr-1969','es-2026','my-1999','in-2011','qa-2004','sg-2008'].includes(track.id);
  sign.rotation.set(-Math.PI/2,p.heading+(flip?Math.PI:0),0,'YXZ');group.add(sign);
 }
 label(plan.side>0?'PIT LEFT':'PIT RIGHT',8);
 label('PIT OUT',plan.length-12);
 plan.boxes.forEach((station,index)=>label(String(index+1).padStart(2,'0'),station,true));

 const crewCount=plan.boxes.length*4;
 const bodies=new THREE.InstancedMesh(new THREE.CylinderGeometry(.16,.22,.62,8),new THREE.MeshStandardMaterial({color:'#e45024',roughness:.8}),crewCount);
 const helmets=new THREE.InstancedMesh(new THREE.SphereGeometry(.18,8,6),new THREE.MeshStandardMaterial({color:'#f6f4e8'}),crewCount);
 bodies.count=helmets.count=0;
 bodies.frustumCulled=helmets.frustumCulled=false;
 group.add(bodies,helmets);
 group.traverse(o=>o.userData.pitKeep=true);
 let lastFrame=-Infinity;
 return {update(cars,now){
  if(now-lastFrame<75)return;
  lastFrame=now;
  let count=0;
  dummy.scale.set(1,1,1);
  for(const car of cars){
   if(car.finished||car.pitState!=='service'||car.pitTimer>(car.pitServiceDuration||PIT_SERVICE_SECONDS)+1e-9)continue;
   for(const across of [-1.4,1.4])for(const dz of [-1.2,1.45]){
    const p=pitRoadPose(track,car.pitTravel+dz,across);
    const bob=Math.sin(now*.022+count)*.025;
    dummy.position.set(p.x,p.y+.43+bob,p.z);
    dummy.rotation.set(0,p.heading,Math.sin(now*.018+count)*.12);
    dummy.updateMatrix();
    bodies.setMatrixAt(count,dummy.matrix);
    dummy.position.y+=.45;
    dummy.updateMatrix();
    helmets.setMatrixAt(count++,dummy.matrix);
   }
  }
  bodies.count=helmets.count=count;
  bodies.instanceMatrix.needsUpdate=helmets.instanceMatrix.needsUpdate=true;
 }};

}

// Reserve the lane before scenery batching; retain terrain, the racing ribbon,
// safety walls, cars and the pit's own props. Also run before mapped scenery merges.
export function clearPitScenery(root,track){
 const plan=pitLayout(track),points=plan.samples.filter((_,i)=>i%2===0),removed=[];root.updateMatrixWorld(true);
 const overlaps=bounds=>points.some(p=>p.x>bounds.min.x-3&&p.x<bounds.max.x+3&&p.z>bounds.min.z-3&&p.z<bounds.max.z+3&&bounds.min.y<p.y+3&&bounds.max.y>p.y+.35);
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
