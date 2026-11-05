import * as THREE from '/vendor/three.module.js';
import {planMiami,miamiTerrainHeight} from '/shared/miami-scenery.mjs';
import {MIAMI_ARCHITECTURE} from './data/miami-architecture.js';
import {addVegetation} from './vegetation.js';
import {trackSign} from './track-furniture.js';
const summer=['#e3d4b6','#d68a8a','#6399aa','#dcbb53','#e4e3d6','#b25e52','#687b96'];
export function miamiGround(track,x,z,cell=18){let y=miamiTerrainHeight(track,x,z,cell);const plan=planMiami(track,MIAMI_ARCHITECTURE);for(const site of plan.sites){if(!['stadium','pits','stand','marina','parking','hospitality','official','building'].includes(site.kind))continue;const c=Math.cos(site.heading),s=Math.sin(site.heading),dx=Math.abs((x-site.x)*c-(z-site.z)*s)-site.w/2,dz=Math.abs((x-site.x)*s+(z-site.z)*c)-site.d/2,blend=1-Math.max(0,Math.min(1,Math.max(dx,dz)/4));if(blend)y+=(site.y-.14-y)*blend;}return y;}
export function addMiami(scene,track){
 const plan=planMiami(track,MIAMI_ARCHITECTURE),materials=new Map(),labels=new Map(),crowds=[],flags=[],yachts=[],loungers=[],umbrellas=[],parkingCars=[],poles=[],buildings=[],panels=[],confetti=[],clock={value:0},dummy=new THREE.Object3D(),tint=new THREE.Color();
 const mat=(color,extra={})=>{if(extra.map)return new THREE.MeshStandardMaterial({color,roughness:.8,...extra});const key=JSON.stringify([color,extra]);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.82,...extra}));return materials.get(key);};
 function group(site){const g=new THREE.Group();g.position.set(site.x,site.y,site.z);g.rotation.y=site.heading||0;g.userData.miamiSite=site.id;scene.group.add(g);return g;}
 function mesh(parent,geometry,material,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.userData.mappedStatic=true;m.receiveShadow=true;parent.add(m);return m;}
 function sign(parent,text,w,h,x,y,z,angle=0,color='#2b6c76'){const key=text+color;if(!labels.has(key)){const panel=trackSign(text,w,h,color,'#f4e4d2');labels.set(key,panel.material);panel.geometry.dispose();}const m=mesh(parent,new THREE.PlaneGeometry(w,h),labels.get(key),x,y,z);m.rotation.y=angle;return m;}
 const world=(site,x,y,z)=>({x:site.x+Math.cos(site.heading)*x+Math.sin(site.heading)*z,y:site.y+y,z:site.z-Math.sin(site.heading)*x+Math.cos(site.heading)*z,heading:site.heading});
 function instances(geometry,material,sites,pose,cell=900){const buckets=new Map();for(const p of sites){const key=Math.floor(p.x/cell)+':'+Math.floor(p.z/cell);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(p);}const meshes=[];for(const chunk of buckets.values()){const m=new THREE.InstancedMesh(geometry,material,chunk.length);chunk.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.heading||0,0);dummy.scale.set(1,1,1);pose(p,i,dummy);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);if(p.color)m.setColorAt(i,tint.set(p.color));});m.computeBoundingSphere();m.receiveShadow=true;scene.group.add(m);meshes.push(m);}return meshes;}
 for(const site of plan.sites){
  if(site.kind==='stadium'){
   const g=group(site),w=site.w-12,d=site.d-12;
   // Original oval bowl inside the mapped stadium envelope, neutral roof/signage.
   const bowl=mesh(g,new THREE.CylinderGeometry(1,1,30,48,1,true),mat('#bfc4c2'),0,19,0);bowl.scale.set(w*.45,1,d*.44);
   for(let row=0;row<12;row++){const ring=mesh(g,new THREE.RingGeometry(.55+row*.026,.579+row*.026,64),mat(row%3?'#819da3':'#b9c6c6'),0,5+row*1.65,0);ring.rotation.x=-Math.PI/2;ring.scale.set(w/2,d/2,1);}
   scene.box(w*.45,.08,d*.46,'#4c7f53',0,4.9,0,g);
   for(const side of [-1,1]){scene.box(w*.96,.65,d*.18,'#e1e5e1',0,39,side*d*.39,g);scene.box(w*.19,.65,d*.62,'#e3e7e2',side*w*.385,39,0,g);for(let i=0;i<14;i++)scene.box(.4,24,.4,'#aeb9b7',side*w*.43,22,-d*.39+i*d*.78/13,g);}
   for(const x of [-w*.35,w*.35])for(const z of [-d*.35,d*.35]){mesh(g,new THREE.ConeGeometry(1.3,39,7),mat('#e7e9e5'),x,55,z);scene.box(.3,20,.3,'#c3cecc',x,29,z,g);}
   for(let i=0;i<48;i++){const a=i*Math.PI/24,x=Math.sin(a)*w*.43,z=Math.cos(a)*d*.42;scene.box(7,11,6,'#c5cecb',x,6,z,g);}
   sign(g,'MIAMI GARDENS · EVENT STADIUM',w*.5,3,0,28,-d*.445,Math.PI);
  }
  if(site.kind==='pits'||site.kind==='hospitality'){
   const g=group(site),isPit=site.kind==='pits',w=site.w-3,d=site.d-5,front=isPit?-site.side:-site.side,h=isPit?6.4:5.4;
   scene.box(w,h,d,'#e0e2d9',0,h/2,0,g);scene.box(w+1,.4,d+2,'#f3f1e6',0,h+.2,0,g);scene.box(w*.82,3,d*.75,'#688b97',0,h+1.9,0,g);scene.box(w*.9,.35,d*.78,'#f0eee3',0,h+3.6,0,g);
   for(let z=-d*.35;z<d*.35;z+=6)scene.box(.12,3,.14,'#d6dfdb',front*w*.415,h+1.9,z,g);
   if(isPit){for(let bay=0;bay<28;bay++){const z=-d/2+5+bay*(d-10)/27;scene.box(.15,4,7.8,'#435358',front*(w/2+.1),2.2,z,g);scene.box(.18,.55,8,['#4f9ea3','#e99eac','#cbbb86','#5d849e'][Math.floor(bay/3)%4],front*(w/2+.15),4.6,z,g);}scene.box(4,1.2,17,'#3b919a',front*(w/2-2),.9,d*.34,g);sign(g,'MIAMI · PODIUM',17,1.4,front*(w/2+.3),2.5,d*.34,front*Math.PI/2);sign(g,'MIAMI · PIT LANE',d*.65,1.4,front*(w/2+.3),5.6,0,front*Math.PI/2);}
   else{scene.box(2,.15,d*.9,'#bca98b',front*(w/2-.5),h+.3,0,g);for(let i=0;i<9;i++)loungers.push(world(site,front*(w/2-2),h+.5,-d*.35+i*d*.08));sign(g,'COASTAL HOSPITALITY',d*.7,1.4,front*(w/2+.3),4.4,0,front*Math.PI/2);}
  }
  if(site.kind==='marina'){
   const g=group(site),w=site.w-4,d=site.d-4;
   // Painted/vinyl-style fake water, intentionally not a reflective natural lake.
   scene.box(w,.05,d,'#39b8c9',0,.04,0,g);scene.box(w*.94,.07,d*.48,'#d9c49b',0,.1,-d*.2,g);scene.box(w*.91,.1,2.2,'#baa783',0,.18,d*.08,g);
   for(let i=0;i<9;i++){const x=-w*.39+i*w*.098;const p=world(site,x,.2,d*.29);p.heading+=i%2?.05:-.06;yachts.push(p);}
   for(let i=0;i<30;i++){const x=-w*.39+(i%10)*w*.084,z=-d*.34+Math.floor(i/10)*d*.115;loungers.push(world(site,x,.2,z));if(i%3===0)umbrellas.push(world(site,x+.8,.3,z));}
   for(const side of [-1,1]){scene.box(10,3,13,'#e9e9df',side*w*.4,1.7,-d*.3,g);const roof=mesh(g,new THREE.ConeGeometry(Math.min(6.2,d*.16),3,4),mat('#e6e1cf'),side*w*.4,4.4,-d*.3);roof.rotation.y=Math.PI/4;}
   sign(g,'MIAMI · MARINA CLUB',w*.45,1.8,0,3,-d*.44,Math.PI);
  }
  if(site.kind==='stand'){
   const g=group(site),rows=site.rows,length=site.d-8,cols=Math.floor(length/1.65),step=(site.w-8)/rows;
   for(let row=0;row<rows;row++){const x=site.side*(-site.w/2+4+row*step),y=1+row*.52;scene.box(step+.04,.55,length,'#b5bdba',x,y,0,g);scene.box(step*.8,.1,length,row%3?'#6f9da5':'#bd9cac',x,y+.34,0,g);for(let col=0;col<cols;col++){if(col%25===0)continue;crowds.push({...world(site,x,y+.72,-length/2+(col+.5)*length/cols),color:summer[(col+row*3)%summer.length],hat:(col+row)%5===0});}}
   if(site.roof){const h=rows*.52+4;scene.box(site.w-1,.3,site.d-1,'#ecece0',0,h,0,g);for(let z=-length/2;z<length/2;z+=20){scene.box(.22,h,.22,'#92a5a3',site.side*(site.w/2-2),h/2,z,g);scene.box(site.w-2,.14,.14,'#b0beb7',0,h-.4,z,g);}}
   for(let i=0;i<Math.floor(length/12);i++){const x=site.side*(-site.w/2+5+i%rows*step),y=3+i%rows*.52,z=-length/2+5+i*12;flags.push({...world(site,x,y,z),type:i%4});scene.box(.03,2.5,.03,'#93a3a1',x,y-.9,z,g);}
   sign(g,site.id.toUpperCase().replaceAll('-',' '),length,1,-site.side*(site.w/2-1),2.2,0,-site.side*Math.PI/2);confetti.push(world(site,site.side*(site.w/2-5),rows*.52+3,0));
  }
  if(site.kind==='official'){
   const g=group(site);scene.box(4.5,.2,5,'#d6ddd1',0,.1,0,g);scene.box(4.6,.2,5.1,'#f1eee0',0,3,0,g);for(const x of [-2,2])for(const z of [-2,2])scene.box(.1,3,.1,'#8b9e99',x,1.5,z,g);
   for(let i=0;i<2;i++){scene.box(.4,.65,.3,'#ed8530',i*.65,1,0,g);scene.box(.25,.65,.25,'#dc7928',i*.65,.4,0,g);mesh(g,new THREE.SphereGeometry(.16,6,4),mat('#e8ebdd'),i*.65,1.55,0);}
   scene.box(.1,3,.1,'#859b93',3,1.5,0,g);scene.box(1.6,1,.15,'#2e4848',3,2.8,0,g);panels.push({...world(site,3,2.8,-.09),heading:site.heading+Math.PI,s:site.s});
   if(site.crane){scene.box(3,1,4,'#ccb56b',7,1,0,g);scene.box(.55,11,.55,'#9aada5',7,6,0,g);const arm=scene.box(.25,.3,12,'#b5c0ac',7,10,0,g);arm.rotation.x=-.25;scene.box(.8,.6,.9,'#365559',7,11.4,5.8,g);}else scene.box(4,2,5,'#c9d2c3',-1,1.15,4,g);
  }
  if(site.kind==='board'||site.kind==='banner'){const g=group(site),banner=site.kind==='banner';sign(g,site.label,banner?site.d-1:1.35,banner?1.2:1.05,0,1.5,0,banner?-site.side*Math.PI/2:Math.PI);scene.box(.08,2,.08,'#91a49a',0,1,0,g);}
  if(site.kind==='parking'){
   const g=group(site);scene.box(site.w-2,.06,site.d-2,'#8a9290',0,-.1,0,g);for(let lane=0;lane<3;lane++)for(let i=0;i<18;i++){const x=-site.w*.35+lane*site.w*.35,z=-site.d*.43+i*site.d*.05;scene.box(7,.025,.1,'#d7d6c3',x,-.055,z,g);if(i%5)parkingCars.push({...world(site,x,.1,z+3),color:summer[(i+lane)%summer.length]});}for(const x of [-site.w*.4,site.w*.4])for(const z of [-site.d*.4,0,site.d*.4])poles.push(world(site,x,0,z));
  }
  if(site.kind==='building')buildings.push(site);
 }
 const hullGeometry=new THREE.SphereGeometry(1,14,6);instances(hullGeometry,mat('#eff0e8'),yachts,(p,i,o)=>{o.scale.set(2.8,.85,7);o.position.y+=.6;});instances(new THREE.BoxGeometry(3.8,1.4,7),mat('#e9ece5'),yachts,(p,i,o)=>{o.position.y+=1.8;});instances(new THREE.BoxGeometry(3.2,.65,3.6),mat('#6b929e'),yachts,(p,i,o)=>{o.position.y+=2.8;});instances(new THREE.CylinderGeometry(.035,.035,4.2,4),mat('#c4d3cd'),yachts,(p,i,o)=>{o.position.y+=3.4;});
 instances(new THREE.BoxGeometry(.8,.14,1.8),mat('#e1ddd0'),loungers,(p,i,o)=>{o.position.y+=.25;});instances(new THREE.ConeGeometry(1.2,.65,7),mat('#e8dab6'),umbrellas,(p,i,o)=>{o.position.y+=1.8;});instances(new THREE.CylinderGeometry(.035,.035,1.8,4),mat('#b8ac8c'),umbrellas,(p,i,o)=>{o.position.y+=.9;});
 instances(new THREE.CapsuleGeometry(.17,.32,2,4),mat('#ffffff'),crowds,(p,i,o)=>{o.position.y+=.35;o.rotation.z=.04*Math.sin(i);});instances(new THREE.SphereGeometry(.12,5,4),mat('#bc9978'),crowds,(p,i,o)=>{o.position.y+=.78;});instances(new THREE.CylinderGeometry(.2,.16,.07,7),mat('#dcd2b0'),crowds.filter(p=>p.hat),(p,i,o)=>{o.position.y+=.9;});
 instances(new THREE.BoxGeometry(2.2,1.1,4.5),mat('#ffffff'),parkingCars,(p,i,o)=>{o.position.y+=.6;});instances(new THREE.BoxGeometry(1.8,.55,2.5),mat('#69848a'),parkingCars,(p,i,o)=>{o.position.y+=1.35;});
 instances(new THREE.CylinderGeometry(.1,.15,13,6),mat('#9baea7'),poles,(p,i,o)=>{o.position.y+=6.5;});instances(new THREE.BoxGeometry(3.2,.25,1.4),mat('#d9e2d9'),poles,(p,i,o)=>{o.position.y+=13;});
 instances(new THREE.BoxGeometry(1,1,1),mat('#d2cec1'),buildings.map((p,i)=>({...p,color:summer[i%summer.length]})),(p,i,o)=>{o.scale.set(p.w-1,p.height,p.d-1);o.position.y+=p.height/2;},2000);instances(new THREE.BoxGeometry(1,.25,1),mat('#afb5ad'),buildings,(p,i,o)=>{o.scale.set(p.w,1,p.d);o.position.y+=p.height+.2;},2000);
 addVegetation(scene,track,scene.profile,{palms:true,sites:plan.palms.map(p=>({...p,angle:p.heading}))});
 const shrubSites=plan.palms.filter((p,i)=>i%3===0).map(p=>({...p,x:p.x+Math.cos(p.heading)*2,z:p.z-Math.sin(p.heading)*2}));instances(new THREE.SphereGeometry(1,7,5),mat('#668956'),shrubSites,(p,i,o)=>{o.scale.set(1.2,.65,1);o.position.y+=.55;});
 const flagCanvas=document.createElement('canvas');flagCanvas.width=128;flagCanvas.height=80;const ink=flagCanvas.getContext('2d');for(let band=0;band<3;band++){ink.fillStyle=['#bf5b53','#ebe6d2','#508096'][band];ink.fillRect(0,band*80/3,128,80/3);}const flagMap=new THREE.CanvasTexture(flagCanvas);flagMap.colorSpace=THREE.SRGBColorSpace;const cloth=mat('#ffffff',{map:flagMap,side:THREE.DoubleSide});cloth.onBeforeCompile=shader=>{shader.uniforms.miamiClock=clock;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float miamiClock;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z+=sin(position.x*5.0+miamiClock*1.8+instanceMatrix[3].x*.02)*.15*uv.x;');};cloth.customProgramCacheKey=()=> 'miami-flags-v1';instances(new THREE.PlaneGeometry(1.5,.9,6,2),cloth,flags,(p,i,o)=>{o.position.x+=.7;});
 const led=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.4,.8),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide,toneMapped:false}),panels.length);panels.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.heading,0);dummy.scale.set(1,1,1);dummy.updateMatrix();led.setMatrixAt(i,dummy.matrix);led.setColorAt(i,tint.set('#39d28c'));});led.computeBoundingSphere();scene.group.add(led);
 if(plan.bridge){const bridge=plan.bridge,g=group({...bridge,id:'highway-deck',y:bridge.deckY}),width=bridge.width;scene.box(bridge.length+8,.8,width,'#b2bbb2',0,0,0,g);scene.box(bridge.length+8,.035,width-2,'#727f7e',0,.43,0,g);for(const z of [-width/2,width/2])scene.box(bridge.length+8,1.1,.3,'#c6cec3',0,.8,z,g);for(const p of bridge.supports){const localX=(p.x-bridge.x)*Math.cos(bridge.heading)-(p.z-bridge.z)*Math.sin(bridge.heading),height=bridge.deckY-p.y;scene.box(4,height,width-2,'#b1bdb4',localX,-height/2,0,g);}sign(g,'GARDENS EXPRESSWAY',25,2,0,2,-width/2-.2,Math.PI);}
 const shimmer=new THREE.ShaderMaterial({uniforms:{time:clock,strength:{value:1}},transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:'uniform float time;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.x+=sin(p.y*6.0+time)*.025;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',fragmentShader:'uniform float time;uniform float strength;varying vec2 vUv;void main(){float edge=sin(vUv.x*3.14159)*sin(vUv.y*3.14159);gl_FragColor=vec4(.85,.88,.82,max(0.0,sin(vUv.x*80.0+time))*edge*.022*strength);}'});
 for(const site of plan.sites.filter(p=>p.kind==='parking')){const g=group({...site,id:site.id+'-heat'});const m=mesh(g,new THREE.PlaneGeometry(site.w*.6,1.5,14,3),shimmer,0,1.4,0);m.userData.mappedStatic=false;}
 const paperMaterial=new THREE.MeshBasicMaterial({color:'#d8b1a1',side:THREE.DoubleSide});paperMaterial.onBeforeCompile=shader=>{shader.uniforms.miamiClock=clock;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float miamiClock;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y+=sin(miamiClock*.6+instanceMatrix[3].x*.1)*.35;transformed.x+=sin(miamiClock*.4+instanceMatrix[3].z*.1)*.3;');};paperMaterial.customProgramCacheKey=()=> 'miami-confetti-v1';instances(new THREE.PlaneGeometry(.12,.18),paperMaterial,confetti.flatMap(p=>Array.from({length:12},(_,i)=>({...p,x:p.x+(i%4-1.5)*.6,y:p.y+Math.floor(i/4)*.4,z:p.z+(i%3-1)*.4}))),(p,i,o)=>{});
 let last=0;scene.environmentFx={frame(time,cars){if(time-last<80)return;last=time;clock.value=time*.001;for(const [i,p]of panels.entries()){const caution=cars.some(c=>!c.finished&&!c.retired&&(c.offtrack||c.sliding)&&Math.min(Math.abs(c.s-p.s),track.length-Math.abs(c.s-p.s))<160);led.setColorAt(i,tint.set(caution?(Math.floor(time/350)%2?'#edca42':'#655a2d'):'#39d28c'));}led.instanceColor.needsUpdate=true;},setConditions(w){shimmer.uniforms.strength.value=1-w;paperMaterial.visible=w<.7;},dispose(){}};
 scene.group.userData.miamiPlan=plan;scene.group.userData.miamiBudget={spectators:crowds.length,palms:plan.palms.length,flags:flags.length,yachts:yachts.length};return scene.profile;
}
