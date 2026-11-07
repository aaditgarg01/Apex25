import * as THREE from '/vendor/three.module.js';
import {YASMARINA_LIGHTING} from './data/yasmarina-lighting.js';
import {createYasmarinaLightField} from './yasmarina-light-field.js';
export function createYasmarinaLighting(scene,track,plan,h){
 const {instances,mat}=h,nightGain={value:.65},field=createYasmarinaLightField(scene,track,nightGain),fixtures=plan.masts,lens=new THREE.MeshBasicMaterial({color:'#f0f6ff',toneMapped:false}),glowMaterial=new THREE.MeshBasicMaterial({color:'#a7c7e7',transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
 instances(new THREE.CylinderGeometry(.16,.35,24,6),mat('#b7c2c1'),fixtures,(p,i,o)=>{o.position.y+=12;});instances(new THREE.BoxGeometry(4,.45,2.8),mat('#61727f'),fixtures,(p,i,o)=>{o.position.y+=24;});instances(new THREE.PlaneGeometry(3.7,2.5),lens,fixtures,(p,i,o)=>{o.position.y+=23.74;o.rotation.set(-Math.PI/2,p.heading||0,0,'YXZ');});
 // Soft baked halos, emissive heads and fixed field: all masts stay illuminated
 // independently of camera/car distance. No point lights or per-pole shadows.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(235,246,255,.8)');gradient.addColorStop(.2,'rgba(204,227,255,.25)');gradient.addColorStop(1,'rgba(160,202,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);const glowMap=new THREE.CanvasTexture(canvas);glowMaterial.map=glowMap;
 instances(new THREE.PlaneGeometry(10,10),glowMaterial,fixtures,(p,i,o)=>{o.position.y+=24;o.rotation.set(-Math.PI/2,p.heading||0,0,'YXZ');});
 const fills=[];for(const [x,z,color]of [[-400,-500,'#c7dffc'],[500,600,'#e0e8fd']]){const light=new THREE.DirectionalLight(color,.45);light.position.set(x,300,z);light.target.position.set(0,0,-100);light.castShadow=false;scene.scene?.add(light,light.target);fills.push(light);}
 const dayColor=new THREE.Color('#f4bb8b'), nightColor=new THREE.Color('#c7d9f3');
 let wetness=0, previousTime, previousEnabled, phase=0, fieldAttached=false;
 function frame(time){
  const enabled=scene.yasTwilightEnabled!==false;
  const elapsed=Math.max(0,scene.sessionElapsed??0);
  const target=enabled?Math.min(1,elapsed/YASMARINA_LIGHTING.durationSeconds):1;
  if(previousTime===undefined||enabled!==previousEnabled) phase=target;
  else phase+=(target-phase)*(1-Math.exp(-Math.min(100,time-previousTime)/180));
  previousTime=time;
  previousEnabled=enabled;
  scene.profile.yasPhase=phase;
  scene.atmosphere?.setYasMarina(phase,wetness);
  nightGain.value=.65+phase*1.7;
  glowMaterial.opacity=.08+phase*.18;
  for(const light of fills) light.intensity=(.35+.65*phase)*.5*(1-wetness*.25);
  if(scene.sun){
   scene.sun.color.copy(dayColor).lerp(nightColor,phase);
   scene.sun.intensity=(2.3*(1-phase)+.32)*(1-wetness*.6);
   scene.sun.position.set(-280,60*(1-phase)+230*phase,-180);
   scene.sun.target.position.set(0,0,-100);
   scene.sun.target.updateMatrixWorld();
  }
  if(scene.hemisphere){
   scene.hemisphere.intensity=.75+phase*.25;
   scene.hemisphere.color.set('#799dc5');
   scene.hemisphere.groundColor.set('#887c69');
  }
  if(scene.scene?.fog) scene.scene.fog.density=.00019+wetness*.00045;
  if(!fieldAttached){fieldAttached=true;field.apply(scene.group);}
  field.frame();
 }
 return {frame,setConditions(w){wetness=w;},dispose(){
  field.dispose();
  for(const light of fills){scene.scene?.remove(light,light.target);light.dispose();}
  glowMap.dispose();
 }};
}
