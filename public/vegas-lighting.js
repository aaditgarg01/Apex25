import * as THREE from '/vendor/three.module.js';
import {sample} from '/shared/tracks.mjs';
// World-space illumination is baked for the entire circuit and never follows
// the player. Instanced scenery and newly spawned cars use the same field.
export function createVegasLightField(scene,track){
 const margin=180,minX=Math.min(...track.points.map(p=>p.x))-margin,minZ=Math.min(...track.points.map(p=>p.z))-margin,width=Math.max(...track.points.map(p=>p.x))-minX+margin,depth=Math.max(...track.points.map(p=>p.z))-minZ+margin,c=document.createElement('canvas');c.width=c.height=2048;const x=c.getContext('2d');x.fillStyle='#000000';x.fillRect(0,0,2048,2048);x.globalCompositeOperation='lighter';
 for(let s=0;s<track.length;s+=12){const p=sample(track,s),px=(p.x-minX)/width*2048,py=(p.z-minZ)/depth*2048;x.save();x.translate(px,py);x.scale(2048/width,2048/depth);x.rotate(-p.heading);x.scale(1,1.45);const g=x.createRadialGradient(0,0,5,0,0,24);g.addColorStop(0,'rgba(219,239,255,.7)');g.addColorStop(.56,'rgba(208,229,255,.43)');g.addColorStop(1,'rgba(201,227,255,0)');x.fillStyle=g;x.fillRect(-25,-25,50,50);x.restore();}
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.NoColorSpace;const bounds=new THREE.Vector4(minX,minZ,width,depth),known=new WeakSet(),cars=new WeakSet();
 function attach(mat,gain=1.4){if(!mat?.isMeshStandardMaterial||known.has(mat))return;known.add(mat);const previous=mat.onBeforeCompile;mat.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);shader.uniforms.lvField={value:map};shader.uniforms.lvBounds={value:bounds};shader.uniforms.lvGain={value:gain};shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 lvWorld;').replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
 vec4 lvP=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
 lvP=instanceMatrix*lvP;
 #endif
 lvWorld=(modelMatrix*lvP).xyz;`);shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D lvField; uniform vec4 lvBounds; uniform float lvGain; varying vec3 lvWorld;').replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
 vec2 lvUV=vec2((lvWorld.x-lvBounds.x)/lvBounds.z,1.0-(lvWorld.z-lvBounds.y)/lvBounds.w);
 float lvMask=texture2D(lvField,clamp(lvUV,vec2(0.0),vec2(1.0))).r;
 reflectedLight.indirectDiffuse+=diffuseColor.rgb*lvMask*lvGain;`);};mat.customProgramCacheKey=()=>`vegas-fixed-field-${gain}`;mat.needsUpdate=true;}
 const apply=root=>root.traverse(o=>{if(o.material)for(const m of [].concat(o.material))attach(m,m.userData.surfaceKind==='asphalt'?2.0:1.25);});
 return {apply,frame(){for(const model of scene.cars.values())if(!cars.has(model)){cars.add(model);apply(model);}},dispose(){map.dispose();}};
}
