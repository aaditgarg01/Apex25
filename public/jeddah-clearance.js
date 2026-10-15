import * as THREE from '/vendor/three.module.js';
import {sample} from '/shared/tracks.mjs';
import {bakuLayout} from '/shared/baku.mjs';

function intersectsRectangle(a,b,minX,maxX,minZ,maxZ){
 let lo=0,hi=1;
 for(const [start,delta,min,max] of [[a.x,b.x-a.x,minX,maxX],[a.z,b.z-a.z,minZ,maxZ]]){
  if(Math.abs(delta)<1e-9){if(start<min||start>max)return false;continue;}
  const t0=(min-start)/delta,t1=(max-start)/delta;
  lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));if(lo>hi)return false;
 }
 return true;
}

// Check the entire model against continuous road segments, including other
// branches of a bend. Expanding the rectangle also protects its rounded corners.
export function footprintClear(track,p,heading,bounds,margin=10){
 const rx=Math.cos(heading),rz=-Math.sin(heading),fx=Math.sin(heading),fz=Math.cos(heading),widths=track.id==='az-2016'?bakuLayout(track).half:null;
 const project=q=>({x:(q.x-p.x)*rx+(q.z-p.z)*rz,z:(q.x-p.x)*fx+(q.z-p.z)*fz});
 let a=project(track.points.at(-1));
 for(let i=0;i<track.points.length;i++){const q=track.points[i],b=project(q),pad=(widths?Math.max(widths[i],widths[(i+widths.length-1)%widths.length]):track.width/2)+margin;
  if(intersectsRectangle(a,b,bounds.min.x-pad,bounds.max.x+pad,bounds.min.z-pad,bounds.max.z+pad))return false;
  a=b;
 }
 return true;
}

function modelBounds(object){
 object.updateWorldMatrix(true,true);const inverse=object.matrixWorld.clone().invert(),bounds=new THREE.Box3();
 object.traverse(node=>{
  if(!node.geometry)return;
  if(node.isInstancedMesh){node.computeBoundingBox();bounds.union(node.boundingBox.clone().applyMatrix4(inverse.clone().multiply(node.matrixWorld)));}
  else{node.geometry.computeBoundingBox();bounds.union(node.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(node.matrixWorld)));}
 });
 return bounds;
}

// Move complete models, including roofs, balconies, pools, piers and crowds.
// The original side/orientation is retained for mapped waterfront landmarks.
export function placeDecoration(scene,track,object,height,{s,side,followTrack=false,accept=()=>true,margin=10}={}){
 const bounds=modelBounds(object);if(bounds.isEmpty())return true;
 const original=object.position.clone(),heading=object.rotation.y,offsetY=original.y-height(original.x,original.z);
 const allowed=()=>{
  if(!footprintClear(track,object.position,object.rotation.y,bounds,margin))return false;
  const rx=Math.cos(object.rotation.y),rz=-Math.sin(object.rotation.y),fx=Math.sin(object.rotation.y),fz=Math.cos(object.rotation.y);
  for(const x of [bounds.min.x,(bounds.min.x+bounds.max.x)/2,bounds.max.x])for(const z of [bounds.min.z,(bounds.min.z+bounds.max.z)/2,bounds.max.z]){
   if(!accept(object.position.x+rx*x+fx*z,object.position.z+rz*x+fz*z))return false;
  }
  return true;
 };
 if(allowed())return true;
 if(s===undefined){let nearest=Infinity;track.points.forEach((p,i)=>{const d=(p.x-original.x)**2+(p.z-original.z)**2;if(d<nearest){nearest=d;s=i*track.step;}});}
 const road=sample(track,s),lateral=(original.x-road.x)*Math.cos(road.heading)-(original.z-road.z)*Math.sin(road.heading);
 side??=Math.sign(lateral)||1;
 for(let distance=Math.max(track.width/2+margin,Math.abs(lateral))+8;distance<1800;distance+=8){
  const p=sample(track,s,side*distance);object.position.set(p.x,height(p.x,p.z)+offsetY,p.z);
  if(followTrack)object.rotation.y=p.heading+(side<0?Math.PI:0);
  if(allowed()){object.userData.sceneryRelocated=true;return true;}
 }
 object.position.copy(original);object.rotation.y=heading;object.removeFromParent();
 (scene.group.userData.rejectedDecorations??=[]).push(object);return false;
}

export function disposeRejectedDecorations(group){
 for(const object of group.userData.rejectedDecorations||[])object.traverse(node=>{
  node.geometry?.dispose();for(const material of [].concat(node.material||[])){material.map?.dispose();material.dispose();}
 });
}
