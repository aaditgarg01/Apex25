import * as THREE from '/vendor/three.module.js';
import {Reflector} from '/vendor/Reflector.js';
import {sample} from '/shared/tracks.mjs';
import {planInterlagos,interlagosTerrainHeight,interlagosContains} from '/shared/interlagos-scenery.mjs';
import {INTERLAGOS_ARCHITECTURE} from './data/interlagos-architecture.js';
import {trackSign} from './track-furniture.js';
import {addVegetation} from './vegetation.js';
const palette=['#edcc33','#1d744a','#e8d045','#e8e8d8','#285899','#2f704e'];
export function interlagosGround(track,x,z,cell=12){const plan=planInterlagos(track,INTERLAGOS_ARCHITECTURE);if(plan.lake&&interlagosContains(plan.lake.outline,x,z))return plan.lake.y-1.4;let y=interlagosTerrainHeight(track,x,z,cell);for(const site of plan.sites){if(!['pits','stand','bank','official','house','apartment'].includes(site.kind))continue;const c=Math.cos(site.heading),s=Math.sin(site.heading),dx=Math.abs((x-site.x)*c-(z-site.z)*s)-site.w/2,dz=Math.abs((x-site.x)*s+(z-site.z)*c)-site.d/2,blend=1-Math.max(0,Math.min(1,Math.max(dx,dz)/6));if(blend>0)y+=(site.y-.12-y)*blend;}return y;}
function root(scene,site){const g=new THREE.Group();g.position.set(site.x,site.y,site.z);g.rotation.y=site.heading||0;g.userData.interlagosSite=site.id;scene.group.add(g);return g;}
function addMesh(parent,geometry,material,x=0,y=0,z=0){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.userData.mappedStatic=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
export function addInterlagos(scene,track){
 const plan=planInterlagos(track,INTERLAGOS_ARCHITECTURE),materials=new Map(),signs=new Map(),flags=[],panels=[],people=[],houses=[],tanks=[],pines=[],smokeSites=[];
 const mat=(color,extra={})=>{const key=JSON.stringify([color,extra]);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.85,...extra}));return materials.get(key);};
 const sign=(g,text,w,h,x,y,z,angle=0,color='#175438',ink='#f5e5a3')=>{const key=[text,color,ink].join(':');if(!signs.has(key))signs.set(key,trackSign(text,w,h,color,ink).material);const panel=addMesh(g,new THREE.PlaneGeometry(w,h),signs.get(key),x,y,z);panel.rotation.y=angle;return panel;};
 const point=(site,x,y,z)=>({x:site.x+Math.cos(site.heading)*x+Math.sin(site.heading)*z,y:site.y+y,z:site.z-Math.sin(site.heading)*x+Math.cos(site.heading)*z,heading:site.heading});
 for(const site of plan.sites){
  if(site.kind==='pits'){
   const g=root(scene,site),front=-site.side,face=front*13.65,d=site.d-7;
   scene.box(27,7.4,d,'#d8d6ce',0,3.7,0,g);scene.box(28,.4,d+2,'#f2f0e6',0,7.6,0,g);
   scene.box(22,3.4,d*.72,'#627b83',0,9.2,0,g);scene.box(24,.4,d*.74,'#e1e2d9',0,11.1,0,g);
   for(let z=-d*.35;z<d*.35;z+=6)scene.box(.16,3.5,.18,'#c5d0ce',front*11.1,9.1,z,g);
   for(let bay=0;bay<28;bay++){const z=-d/2+6+bay*(d-12)/27;scene.box(.15,4.3,7.5,'#303c42',face,2.3,z,g);scene.box(.18,.6,7.8,palette[Math.floor(bay/3)%palette.length],face,4.75,z,g);scene.box(.2,.3,7.9,'#e6e6d5',face,5.2,z,g);}
   for(let i=0;i<3;i++)scene.box(.25,.48,d/3,['#1c7847','#e2c733','#2f5487'][i],front*13.7,6.3,-d/3+i*d/3,g);
   // Control room and podium remain inside the reserved complete footprint.
   scene.box(20,4,25,'#d8d8cd',0,12,d*.27,g);scene.box(22,.4,27,'#ece9dc',0,14.2,d*.27,g);
   scene.box(4.2,1.5,19,'#23603f',front*11,1,d*.38,g);sign(g,'BRASIL · PODIUM',18,1.4,front*13.9,2.7,d*.38,front*Math.PI/2);
   sign(g,'INTERLAGOS · SÃO PAULO',d*.69,1.8,front*13.9,6.3,0,front*Math.PI/2);
  }
  if(site.kind==='stand'||site.kind==='bank'){
   const g=root(scene,site),side=site.side,rows=site.rows,length=site.d-10,columns=Math.floor(length/1.4),step=(site.w-8)/rows,bank=site.kind==='bank';
   for(let row=0;row<rows;row++){
    const x=side*(-site.w/2+4+row*step),y=1+row*.53;
    scene.box(step+.05,bank?y:.55,length,bank?'#578044':row%4===0?'#d8d6c6':'#a7aaa2',x,bank?y/2:y,0,g);
    if(!bank)scene.box(step*.8,.1,length,row%3===0?'#e1bc39':'#397954',x,y+.34,0,g);
    for(let col=0;col<columns;col++){if(col%28===0)continue;const z=-length/2+(col+.5)*length/columns;people.push({...point(site,x,y+.7,z),color:palette[(col+row*3)%palette.length],raised:(row+col)%13===0});}
   }
   if(site.roof){const h=rows*.53+4;scene.box(site.w-1,.35,site.d-2,'#dcded6',0,h,0,g);for(let z=-length/2;z<=length/2;z+=18){scene.box(.25,h,.25,'#7e898b',side*(site.w/2-2),h/2,z,g);scene.box(site.w-3,.18,.18,'#8e9695',0,h-.35,z,g);}}
   sign(g,site.id.startsWith('senna')?'S DO SENNA · BRASIL':site.id.includes('oposta')?'RETA OPOSTA · TORCIDA':site.id.includes('lago')?'DESCIDA DO LAGO':'SÃO PAULO · TORCIDA',length,1.1,-side*(site.w/2-1),2.5,0,-side*Math.PI/2);
   for(let i=0;i<Math.floor(length/11);i++){const x=side*(-site.w/2+6+(i%rows)*step),y=2+(i%rows)*.53,z=-length/2+3+i*11;flags.push(point(site,x,y+2,z));scene.box(.035,2.8,.035,'#88958b',x,y+.6,z,g);}
   if(bank)smokeSites.push(point(site,side*(site.w/2-4),rows*.53+2,0));
  }
  if(site.kind==='official'){
   const g=root(scene,site);scene.box(4.5,.3,4.5,'#b4b6aa',0,.15,0,g);scene.box(4.6,.18,4.6,'#e5e3d7',0,3.1,0,g);
   for(const x of [-2,2])for(const z of [-2,2])scene.box(.1,3,.1,'#778583',x,1.5,z,g);
   for(let i=0;i<2;i++){scene.box(.42,.64,.3,i?'#ece8d5':'#ec792c',i*.7,1.15,0,g);for(const x of [-.12,.12])scene.box(.14,.7,.15,i?'#dddac9':'#d76b28',i*.7+x,.48,0,g);addMesh(g,new THREE.SphereGeometry(.16,6,4),mat('#e7e7dd'),i*.7,1.7,0);}
   scene.box(.1,3,.1,'#7a8985',3,1.5,0,g);scene.box(1.6,1,.15,'#26342f',3,2.8,0,g);
   panels.push({...point(site,3,2.8,-.09),heading:site.heading+Math.PI,s:site.s});
   if(site.crane){scene.box(3,.9,4,'#c5ac4c',7,1,0,g);scene.box(.6,11,.6,'#83938f',7,6,0,g);const arm=scene.box(.25,.3,12,'#9caaa2',7,10,0,g);arm.rotation.x=-.25;scene.box(.8,.6,.9,'#25332e',7,11.4,5.8,g);}
   else scene.box(4,2.5,5,'#b4bbad',-1,1.4,4,g);
  }
  if(site.kind==='board'||site.kind==='banner'){
   const g=root(scene,site),banner=site.kind==='banner';sign(g,site.label,banner?site.d-1:1.35,banner?1.4:1.05,0,banner?1.3:1.6,0,banner?-site.side*Math.PI/2:Math.PI,banner?'#195b46':'#eeeade',banner?'#e9d66e':'#202b29');scene.box(.08,2,.08,'#89948e',0,1,0,g);
  }
  if(site.kind==='house'||site.kind==='apartment'){houses.push(site);if(site.kind==='house'&&Number(site.id.split('-')[1])%3===0)tanks.push({...site,y:site.y+site.height+.65,w:1.9,d:1.9});}
  if(site.kind==='tree'&&site.type==='pine')pines.push(site);
 }
 const dummy=new THREE.Object3D(),instanceTint=new THREE.Color();
 function instances(geometry,material,items,pose,cell=600){
  const chunks=new Map();for(const p of items){const key=Math.floor(p.x/cell)+':'+Math.floor(p.z/cell);if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push(p);}
  const meshes=[];for(const chunk of chunks.values()){const mesh=new THREE.InstancedMesh(geometry,material,chunk.length);chunk.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.heading||0,0);dummy.scale.set(1,1,1);pose(p,i,dummy);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(p.color)mesh.setColorAt(i,instanceTint.set(p.color));});mesh.computeBoundingSphere();mesh.receiveShadow=true;scene.group.add(mesh);meshes.push(mesh);}return meshes;
 }
 instances(new THREE.CapsuleGeometry(.17,.32,2,4),mat('#ffffff'),people,(p,i,o)=>{o.position.y+=.35;o.rotation.z=.05*Math.sin(i);},800);
 instances(new THREE.SphereGeometry(.12,5,4),mat('#b68c6a'),people,(p,i,o)=>{o.position.y+=.79;},800);
 const arms=people.filter(p=>p.raised);instances(new THREE.CylinderGeometry(.055,.06,.6,4),mat('#e3c748'),arms,(p,i,o)=>{o.position.y+=.8;o.position.x+=.21;o.rotation.z=-.35;},800);
 instances(new THREE.BoxGeometry(1,1,1),mat('#c2b6a0'),houses.map((p,i)=>({...p,color:['#b8ad96','#d3c7b6','#d8d0b5','#bfb5a0','#b37e63'][i%5]})),(p,i,o)=>{o.position.y+=p.height/2;o.scale.set(p.w-1,p.height,p.d-1);},2000);
 instances(new THREE.BoxGeometry(1,.22,1),mat('#986b54'),houses,(p,i,o)=>{o.position.y+=p.height+.12;o.scale.set(p.w,1,p.d);},2000);
 instances(new THREE.CylinderGeometry(.8,.8,1.1,6),mat('#526e8a'),tanks,(p,i,o)=>{},2000);
 for(const type of ['broadleaf','palm']){const sites=plan.treeSites.filter(p=>p.type===type).map(p=>({...p,angle:p.heading}));addVegetation(scene,track,scene.profile,{palms:type==='palm',sites});}
 instances(new THREE.CylinderGeometry(.16,.35,12,6),mat('#76624a'),pines,(p,i,o)=>{o.scale.setScalar(p.scale);o.position.y+=6*p.scale;});
 instances(new THREE.ConeGeometry(4.3,3.5,9),mat('#355c3c'),pines.flatMap(p=>[0,1,2].map(t=>({...p,y:p.y+(8+t*1.25)*p.scale}))), (p,i,o)=>{o.scale.set(p.scale, .6*p.scale,p.scale);});
 // One original Brazilian flag texture and one instanced shader animation.
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=80;const flagInk=canvas.getContext('2d');flagInk.fillStyle='#1e7c4b';flagInk.fillRect(0,0,128,80);flagInk.fillStyle='#f1d44a';flagInk.beginPath();flagInk.moveTo(64,8);flagInk.lineTo(116,40);flagInk.lineTo(64,72);flagInk.lineTo(12,40);flagInk.fill();flagInk.fillStyle='#28558a';flagInk.beginPath();flagInk.arc(64,40,18,0,Math.PI*2);flagInk.fill();const flagTexture=new THREE.CanvasTexture(canvas);flagTexture.colorSpace=THREE.SRGBColorSpace;
 const clock={value:0},flagMaterial=new THREE.MeshStandardMaterial({map:flagTexture,side:THREE.DoubleSide,roughness:.9});flagMaterial.onBeforeCompile=shader=>{shader.uniforms.interlagosClock=clock;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float interlagosClock;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z+=sin(position.x*4.0+interlagosClock+instanceMatrix[3].z*.03)*.16*uv.x;');};flagMaterial.customProgramCacheKey=()=> 'interlagos-flags-v1';instances(new THREE.PlaneGeometry(1.5,.95,6,2),flagMaterial,flags,(p,i,o)=>{o.position.x+=.7;},800);
 const smokeTextureCanvas=document.createElement('canvas');smokeTextureCanvas.width=smokeTextureCanvas.height=64;const smokeInk=smokeTextureCanvas.getContext('2d'),gradient=smokeInk.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,.12)');gradient.addColorStop(1,'rgba(255,255,255,0)');smokeInk.fillStyle=gradient;smokeInk.fillRect(0,0,64,64);const smokeTexture=new THREE.CanvasTexture(smokeTextureCanvas),smokeMaterial=new THREE.MeshBasicMaterial({color:'#e2cd54',map:smokeTexture,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide});instances(new THREE.PlaneGeometry(8,5),smokeMaterial,smokeSites,(p,i,o)=>{o.position.y+=1;},800);
 const panelMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.4,.8),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide,toneMapped:false}),panels.length);for(const [i,p]of panels.entries()){dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.heading,0);dummy.scale.set(1,1,1);dummy.updateMatrix();panelMesh.setMatrixAt(i,dummy.matrix);panelMesh.setColorAt(i,instanceTint.set('#46d77a'));}panelMesh.computeBoundingSphere();scene.group.add(panelMesh);
 let water=null,reflector=null,reflectionAt=-Infinity;
 if(plan.lake){
  const lake=plan.lake,shape=new THREE.Shape();lake.outline.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();
  const geometry=new THREE.ShapeGeometry(shape),waterMaterial=new THREE.MeshPhysicalMaterial({color:'#47666d',roughness:.3,metalness:.28,transparent:true,opacity:.72,clearcoat:.7});
  water=new THREE.Mesh(geometry,waterMaterial);water.rotation.x=-Math.PI/2;water.position.y=lake.y+.025;scene.group.add(water);
  reflector=new Reflector(geometry.clone(),{textureWidth:256,textureHeight:256,color:0x8caaa9,clipBias:.03,multisample:0});reflector.rotation.x=-Math.PI/2;reflector.position.y=lake.y;scene.group.add(reflector);
  const reflect=reflector.onBeforeRender;reflector.onBeforeRender=function(...args){if(performance.now()-reflectionAt<180)return;reflectionAt=performance.now();reflect.apply(this,args);};
  const reedSites=lake.outline.filter((p,i)=>i%2===0).map(p=>({...p,y:lake.y+.4,heading:0}));instances(new THREE.ConeGeometry(.5,1.6,4),mat('#647b43'),reedSites,(p,i,o)=>{o.rotation.z=.15*Math.sin(i);});
 }
 let weatherWetness=0,lastFrame=0;scene.environmentFx={
  frame(time,cars){if(time-lastFrame<70)return;lastFrame=time;clock.value=time*.0014;if(water)water.material.roughness=.26+Math.sin(time*.001)*.025+weatherWetness*.2;
   for(const [i,p]of panels.entries()){const caution=cars.some(c=>!c.finished&&!c.retired&&(c.offtrack||c.sliding)&&Math.min(Math.abs(c.s-p.s),track.length-Math.abs(c.s-p.s))<180);panelMesh.setColorAt(i,instanceTint.set(caution?(Math.floor(time/350)%2?'#ebcc3d':'#63591c'):'#46d77a'));}panelMesh.instanceColor.needsUpdate=true;
  },setConditions(w){weatherWetness=w;for(const m of materials.values())if(m.color.g>m.color.r*1.05){m.roughness=.9-w*.18;}},dispose(){reflector?.dispose();}
 };
 scene.group.userData.interlagosBudget={spectators:people.length,flags:flags.length,trees:plan.treeSites.length,houses:houses.length,sites:plan.sites.length};
 scene.group.userData.interlagosPlan=plan;
 return scene.profile;
}
