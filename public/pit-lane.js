import {pitTransitPlan} from '/shared/pit-timing.mjs';
import * as THREE from '/vendor/three.module.js';
import {PIT_SERVICE_SECONDS} from '/shared/pits.mjs';
import {pitLayout,pitRoadPose,pitBayOffset,pitGaragePlans} from '/shared/pit-layout.mjs';

// Original procedural dressing. The existing shared pit corridor, numbered
// stations and assisted car paths determine every paint mark and service cue.
export function addPitLane(scene,track){
 const plan=pitLayout(track),group=new THREE.Group();scene.group.add(group);
 const dummy=new THREE.Object3D(),bay=pitBayOffset(plan);
 function strip(a,b,from,to,tint,height=.065){
  const positions=[];
  for(let d=from;d<to;d+=2){const end=Math.min(to,d+2);for(const [at,across] of [[d,a],[end,a],[d,b],[d,b],[end,a],[end,b]]){const p=pitRoadPose(track,at,across);positions.push(p.x,p.y+height,p.z);}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:tint,roughness:.88,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));mesh.receiveShadow=true;group.add(mesh);return mesh;
 }
 strip(-plan.width/2,plan.width/2,0,plan.length,'#273137',.045);
 strip(plan.side*.06,plan.side*(plan.width/2-.1),plan.taper,plan.length-plan.taper,'#41494b');
 for(const side of [-1,1])strip(side*(plan.width/2-.18),side*(plan.width/2-.04),0,plan.length,'#e5ece8',.085);
 for(let d=plan.taper;d<plan.length-plan.taper-2;d+=6)strip(-.055,.055,d,d+2,'#e5ece8',.088);
 const stripes=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:'#ffda63',toneMapped:false}),plan.boxes.length*4);let mark=0;
 function instance(mesh,index,distance,across,w,h,depth,y=.1){const p=pitRoadPose(track,distance,across);dummy.position.set(p.x,p.y+y,p.z);dummy.rotation.set(-p.pitch,p.heading,0,'YXZ');dummy.scale.set(w,h,depth);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);}
 for(const station of plan.boxes)for(const [d,a,w,depth]of [[station,bay-1.35,.13,7],[station,bay+1.35,.13,7],[station-3.5,bay,2.7,.13],[station+3.5,bay,2.7,.13]])instance(stripes,mark++,d,a,w,.015,depth);
 stripes.instanceMatrix.needsUpdate=true;group.add(stripes);
 function texture(text,small='',background='#15272e',inkColor='#f0f6f1'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ink=canvas.getContext('2d');ink.fillStyle=background;ink.fillRect(0,0,512,256);ink.strokeStyle='#dce9e4';ink.lineWidth=8;ink.strokeRect(8,8,496,240);ink.fillStyle=inkColor;ink.textAlign='center';ink.font='900 76px Arial';ink.fillText(text,256,small?115:156,472);if(small){ink.font='bold 41px Arial';ink.fillText(small,256,196,470);}const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
 }
 function label(map,station,across,w,h,upright=false,height=.1){
  const geometry=new THREE.PlaneGeometry(w,h);if(!upright)geometry.rotateX(-Math.PI/2);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-5,polygonOffsetUnits:-5})),p=pitRoadPose(track,station,across);
  mesh.position.set(p.x,p.y+height,p.z);mesh.rotation.set(upright?0:-p.pitch,p.heading+Math.PI,0,'YXZ');group.add(mesh);return mesh;
 }
 const limit=Math.round(pitTransitPlan(track).speed*3.6)+' KM/H';label(texture('PIT ENTRY',limit),Math.min(12,plan.taper*.6),0,3.6,1.8);label(texture('PIT EXIT','KEEP CLEAR'),plan.length-12,0,3.6,1.8);
 for(const [index,station]of plan.boxes.entries()){
  const number=String(index+1).padStart(2,'0'),map=texture('BOX '+number,'SERVICE BAY','#29363b','#ffda63');
  label(map,station-2.3,bay,2.35,1.15);
  // Wall-mounted board, without a support post in the driving corridor.
  label(map,station+3.8,plan.side*2.9,2.6,1.3,true,3.4);
 }
 const highlight=new THREE.Mesh(new THREE.PlaneGeometry(2.65,6.85).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#66d9ff',transparent:true,opacity:.4,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}));highlight.renderOrder=2;highlight.visible=false;group.add(highlight);
 const yourMap=texture('YOUR BOX','STOP HERE','#155a70'),yourSign=label(yourMap,plan.box,bay,2.7,1.3,true,3.4);yourSign.visible=false;
 const arrows=new THREE.InstancedMesh(new THREE.PlaneGeometry(.65,1.2).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#e7f7ff',side:THREE.DoubleSide,toneMapped:false}),Math.ceil(plan.length/20));let arrowsAt=0;
 // Chevron geometry makes the through lane's direction legible without colour.
 const chevron=new THREE.Shape();chevron.moveTo(0,.7);chevron.lineTo(.45,0);chevron.lineTo(.22,0);chevron.lineTo(.22,-.6);chevron.lineTo(-.22,-.6);chevron.lineTo(-.22,0);chevron.lineTo(-.45,0);chevron.closePath();arrows.geometry.dispose();arrows.geometry=new THREE.ShapeGeometry(chevron).rotateX(-Math.PI/2);
 for(let d=plan.taper;d<plan.length-plan.taper;d+=20){const p=pitRoadPose(track,d,-plan.side*1.3);dummy.position.set(p.x,p.y+.11,p.z);dummy.rotation.set(-p.pitch,p.heading+Math.PI,0,'YXZ');dummy.scale.set(1,1,1);dummy.updateMatrix();arrows.setMatrixAt(arrowsAt++,dummy.matrix);}arrows.count=arrowsAt;arrows.instanceMatrix.needsUpdate=true;group.add(arrows);

 // Keep mapped pit buildings. Add neutral modular garages only where the whole
 // footprint clears the racing road/pit and existing architecture at that site.
 scene.group.updateMatrixWorld(true);const existing=[];
 scene.group.traverse(o=>{if(!o.isMesh||!o.userData.batchBox&&!o.userData.mappedStatic&&!o.isInstancedMesh)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();if(o.isInstancedMesh){if(o.geometry.boundingBox.max.y-o.geometry.boundingBox.min.y<1.6)return;const transform=new THREE.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,transform);transform.premultiply(o.matrixWorld);existing.push(o.geometry.boundingBox.clone().applyMatrix4(transform));}}else{const b=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);if(b.max.y-b.min.y>1.6)existing.push(b);}});
 const garageSites=[];
 for(const site of pitGaragePlans(track)){
  const bounds=new THREE.Box3(new THREE.Vector3(Math.min(...site.footprint.map(p=>p.x)),site.y+.2,Math.min(...site.footprint.map(p=>p.z))),new THREE.Vector3(Math.max(...site.footprint.map(p=>p.x)),site.y+site.h,Math.max(...site.footprint.map(p=>p.z))));
  if(existing.some(b=>b.intersectsBox(bounds)))continue;
  const garage=new THREE.Group();garage.position.set(site.x,site.y,site.z);garage.rotation.y=site.heading;group.add(garage);garageSites.push(site);
  const side=plan.side,front=-side*site.w/2;
  scene.box(.22,4.5,site.d,'#adb6b6',side*site.w/2,2.25,0,garage);
  for(const z of [-site.d/2,site.d/2])scene.box(site.w,4.5,.18,'#d5d9d3',0,2.25,z,garage);
  scene.box(site.w+.3,.22,site.d+.3,'#c7d1cf',0,4.5,0,garage);
  scene.box(.2,.65,site.d,'#255467',front,4.05,0,garage);
  const door=new THREE.Mesh(new THREE.PlaneGeometry(site.d-.45,3.45),new THREE.MeshStandardMaterial({color:'#596466',roughness:.65,metalness:.25,side:THREE.DoubleSide}));door.position.set(front-side*.015,1.8,0);door.rotation.y=-side*Math.PI/2;garage.add(door);
  for(let y=.25;y<3.5;y+=.23)scene.box(.025,.025,site.d-.48,'#333e42',front-side*.03,y,0,garage);
 }
 const crewCount=plan.boxes.length*4;
 const bodies=new THREE.InstancedMesh(new THREE.CylinderGeometry(.16,.22,.62,8),new THREE.MeshStandardMaterial({color:'#e45024',roughness:.8}),crewCount),helmets=new THREE.InstancedMesh(new THREE.SphereGeometry(.18,8,6),new THREE.MeshStandardMaterial({color:'#f3f2e7'}),crewCount),arms=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,.42,.12),new THREE.MeshStandardMaterial({color:'#e45024'}),crewCount*2),jacks=new THREE.InstancedMesh(new THREE.BoxGeometry(1.3,.12,.4),new THREE.MeshStandardMaterial({color:'#f1b637',metalness:.35}),plan.boxes.length*2);
 for(const mesh of [bodies,helmets,arms,jacks]){mesh.count=0;mesh.frustumCulled=false;group.add(mesh);}
 group.traverse(o=>o.userData.pitKeep=true);
 let lastFrame=-Infinity;
 return {garageSites,update(cars,now,focus){
  if(now-lastFrame<50)return;lastFrame=now;
  const assigned=focus&&!focus.finished&&focus.id!=='preview'&&Number.isInteger(focus.pitBoxIndex)&&plan.boxes[focus.pitBoxIndex]!==undefined?plan.boxes[focus.pitBoxIndex]:null;
  highlight.visible=yourSign.visible=assigned!==null;
  if(assigned!==null){const p=pitRoadPose(track,assigned,bay);highlight.position.set(p.x,p.y+.105,p.z);highlight.rotation.set(-p.pitch,p.heading,0,'YXZ');highlight.material.color.set(focus.pitState==='service'?'#ffd36c':'#66d9ff');const sign=pitRoadPose(track,assigned+3.65,plan.side*2.87);yourSign.position.set(sign.x,sign.y+3.4,sign.z);yourSign.rotation.y=sign.heading+Math.PI;}
  let count=0,jackCount=0;dummy.scale.set(1,1,1);
  for(const car of cars){
   if(count>=crewCount||car.finished||car.pitState!=='service'||car.pitTimer>(car.pitServiceDuration||PIT_SERVICE_SECONDS)+1e-9)continue;
   for(const across of [bay-1.35,bay+1.35])for(const dz of [-1.25,1.45]){
    const p=pitRoadPose(track,car.pitTravel+dz,across),bob=Math.sin(now*.022+count)*.025;
    dummy.position.set(p.x,p.y+.43+bob,p.z);dummy.rotation.set(0,p.heading,Math.sin(now*.018+count)*.12);dummy.updateMatrix();bodies.setMatrixAt(count,dummy.matrix);dummy.position.y+=.45;dummy.updateMatrix();helmets.setMatrixAt(count,dummy.matrix);
    for(const hand of [-1,1]){const arm=pitRoadPose(track,car.pitTravel+dz+hand*.23,across+(across>bay?-.18:.18));dummy.position.set(arm.x,arm.y+.47+bob,arm.z);dummy.rotation.set(.6,p.heading,(across>bay?1:-1)*.65);dummy.updateMatrix();arms.setMatrixAt(count*2+(hand>0?1:0),dummy.matrix);}count++;
   }
   for(const dz of [-2.2,2.5])instance(jacks,jackCount++,car.pitTravel+dz,bay,1.3,.12,.4,.16);
  }
  bodies.count=helmets.count=count;arms.count=count*2;jacks.count=jackCount;
  for(const mesh of [bodies,helmets,arms,jacks])mesh.instanceMatrix.needsUpdate=true;
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
