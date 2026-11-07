import * as THREE from '/vendor/three.module.js';
import {LUSAIL_LIGHTING} from './data/lusail-lighting.js';
import {createYasmarinaLightField} from './yasmarina-light-field.js';

export function createLusailLighting(scene,track,plan,{instances,mat}){
 const gain={value:LUSAIL_LIGHTING.fieldGain},field=createYasmarinaLightField(scene,track,gain),masts=plan.masts;
 const lens=new THREE.MeshBasicMaterial({color:'#f7fbff',toneMapped:false,side:THREE.DoubleSide});
 instances(new THREE.CylinderGeometry(.15,.31,1,7),mat('#87909a'),masts,(p,i,o)=>{o.scale.y=p.height;o.position.y+=p.height/2;});
 instances(new THREE.BoxGeometry(4.7,.55,1.05),mat('#39434f'),masts,(p,i,o)=>{o.position.y+=p.height;});
 // Expose the bright lens from both low chase and overhead camera angles.
 const lensGeo=new THREE.PlaneGeometry(4.35,.42);
 instances(lensGeo,lens,masts,(p,i,o)=>{o.position.y+=p.height-.05;const h=p.heading;o.position.x+=Math.sin(h)*.54;o.position.z+=Math.cos(h)*.54;});
 instances(new THREE.PlaneGeometry(4.35,.9),lens,masts,(p,i,o)=>{o.position.y+=p.height-.29;o.rotation.set(-Math.PI/2,p.heading,0,'YXZ');});
 const c=document.createElement('canvas');c.width=c.height=64;const ink=c.getContext('2d'),gradient=ink.createRadialGradient(32,32,0,32,32,32);
 gradient.addColorStop(0,'rgba(247,252,255,.85)');gradient.addColorStop(.23,'rgba(212,229,252,.22)');gradient.addColorStop(1,'rgba(189,219,255,0)');ink.fillStyle=gradient;ink.fillRect(0,0,64,64);
 const glowMap=new THREE.CanvasTexture(c),haloMat=new THREE.MeshBasicMaterial({map:glowMap,color:'#dae8ff',transparent:true,opacity:.27,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
 const halos=instances(new THREE.PlaneGeometry(8,8),haloMat,masts,(p,i,o)=>{o.position.y+=p.height;o.rotation.y=p.heading+Math.PI/2;});
 const fills=[];for(const [x,z,color] of [[-550,-450,'#f3f7ff'],[550,450,'#dce9ff']]){const light=new THREE.DirectionalLight(color,.56);light.position.set(x,420,z);scene.scene.add(light,light.target);fills.push(light);}
 let wet=0,enabled,applyPending=true;
 function frame(){
  const next=scene.lusailLightingEnabled!==false;
  if(next!==enabled){enabled=next;for(const halo of halos)halo.visible=enabled;for(const light of fills)light.visible=enabled;}
  if(applyPending){field.apply(scene.group);applyPending=false;}field.frame();
  gain.value=(enabled?LUSAIL_LIGHTING.fieldGain:LUSAIL_LIGHTING.fallbackGain)*(1-wet*.18);haloMat.opacity=.25+wet*.11;
  for(const light of fills)light.intensity=.56*(1-wet*.24);
  scene.sun.color.set('#edf4ff');scene.sun.intensity=(enabled?.58:1.23)*(1-wet*.24);
  scene.hemisphere.color.set('#7d96bf');scene.hemisphere.groundColor.set('#85705b');scene.hemisphere.intensity=.78+wet*.1;
  scene.scene.fog.density=LUSAIL_LIGHTING.sandHaze+(LUSAIL_LIGHTING.wetHaze-LUSAIL_LIGHTING.sandHaze)*wet;
 }
 return {frame,setConditions(w){wet=w;},dispose(){field.dispose();glowMap.dispose();for(const light of fills){scene.scene.remove(light,light.target);light.dispose();}}};
}
