import {mergeGeometries} from '/vendor/BufferGeometryUtils.js';
import * as THREE from '/vendor/three.module.js';
// Spatially chunk static boxes: hundreds of objects become a few draw calls,
// while distant chunks can still be culled. Cars remain independent of scenery.
export function batchBoxes(root,cell=220){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),buckets=new Map(),sources=[];
 root.traverse(o=>{if(!o.userData.batchBox||!o.isMesh||o.isInstancedMesh)return;const m=o.material,p=new THREE.Vector3().setFromMatrixPosition(o.matrixWorld),key=[Math.floor(p.x/cell),Math.floor(p.z/cell),m.type,m.roughness,m.metalness,o.castShadow,o.receiveShadow].join(':');if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);sources.push(o);});
 for(const objects of buckets.values()){
  const first=objects[0],material=first.material.clone();material.color.set('#ffffff');
  const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,objects.length);mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;
  objects.forEach((o,i)=>{const p=o.geometry.parameters,matrix=inverse.clone().multiply(o.matrixWorld).scale(new THREE.Vector3(p.width,p.height,p.depth));mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,o.material.color);});
  mesh.computeBoundingSphere();root.add(mesh);
 }
 for(const o of sources){o.removeFromParent();o.geometry.dispose();}
 // Some car materials are shared by non-box parts; only release unused ones.
 const used=new Set();root.traverse(o=>{if(o.material)used.add(o.material);});for(const m of new Set(sources.map(o=>o.material)))if(!used.has(m))m.dispose();
 return {before:sources.length,after:buckets.size};
}

// Mapped buildings have unique footprints, so merge only compatible geometry
// within spatial cells. Shared materials preserve their appearance.
export function batchMapped(root){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),buckets=new Map();
 root.traverse(o=>{if(!o.userData.mappedStatic)return;const p=new THREE.Vector3().setFromMatrixPosition(o.matrixWorld),center=o.geometry.boundingSphere||(o.geometry.computeBoundingSphere(),o.geometry.boundingSphere);p.copy(center.center).applyMatrix4(o.matrixWorld);const key=[o.material.uuid,Math.floor(p.x/220),Math.floor(p.z/220),o.castShadow].join(':');if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);});
 for(const objects of buckets.values()){
  const geometries=objects.map(o=>{const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();return geo.applyMatrix4(inverse.clone().multiply(o.matrixWorld));});
  const merged=mergeGeometries(geometries);for(const geo of geometries)geo.dispose();if(!merged)continue;
  const mesh=new THREE.Mesh(merged,objects[0].material);mesh.castShadow=objects[0].castShadow;mesh.receiveShadow=true;root.add(mesh);
  for(const o of objects){o.removeFromParent();o.geometry.dispose();}
 }
}
