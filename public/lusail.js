import * as THREE from '/vendor/three.module.js';
import {sample} from '/shared/tracks.mjs';
import {pitTransitPlan} from '/shared/pit-timing.mjs';
import {planLusail} from '/shared/lusail-scenery.mjs';
import {lusailTerrainHeight,lusailConstrainGround} from '/shared/lusail.mjs';
import {LUSAIL_ARCHITECTURE} from './data/lusail-architecture.js';
import {createLusailLighting} from './lusail-lighting.js';
import {addLusailDressing} from './lusail-dressing.js';

const jackets=['#f4eee3','#e7e4db','#783348','#eeecdf','#36556b','#d08c46','#a94a53','#424448'];
export function lusailGround(track,x,z,cell=20){
 let y=lusailTerrainHeight(track,x,z,cell);
 for(const site of planLusail(track,LUSAIL_ARCHITECTURE).foundations){const c=Math.cos(site.heading),s=Math.sin(site.heading),dx=Math.abs((x-site.x)*c-(z-site.z)*s)-site.w/2,dz=Math.abs((x-site.x)*s+(z-site.z)*c)-site.d/2,blend=1-Math.max(0,Math.min(1,Math.max(dx,dz)/4));if(blend)y+=(site.y-.09-y)*blend;}
 return lusailConstrainGround(track,x,z,y,cell);
}
export function addLusail(scene,track){
 const plan=planLusail(track,LUSAIL_ARCHITECTURE),materials=new Map(),labels=new Map(),crowds=[],flags=[],umbrellas=[],tents=[],caravans=[],parkingCars=[],poles=[],panels=[],phones=[],clock={value:0},dummy=new THREE.Object3D(),tint=new THREE.Color();
 const mat=(color,extra={})=>{if(extra.map)return new THREE.MeshStandardMaterial({color,roughness:.8,...extra});const key=JSON.stringify([color,extra]);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.82,...extra}));return materials.get(key);};
 function group(site){const g=new THREE.Group();g.position.set(site.x,site.y,site.z);g.rotation.y=site.heading||0;g.userData.lusailSite=site.id;g.userData.pitKeep=true;/* Complete oriented footprint was checked by planLusail; avoid generic world-AABB false positives. */scene.group.add(g);return g;}
 function mesh(parent,geometry,material,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.userData.mappedStatic=true;m.receiveShadow=true;parent.add(m);return m;}
 const signCanvas=document.createElement('canvas');signCanvas.width=2048;signCanvas.height=4096;const signInk=signCanvas.getContext('2d'),signMap=new THREE.CanvasTexture(signCanvas);signMap.colorSpace=THREE.SRGBColorSpace;signMap.anisotropy=8;const signMaterial=new THREE.MeshStandardMaterial({map:signMap,roughness:.8,alphaTest:.2,side:THREE.FrontSide});
 function sign(parent,text,w,h,x,y,z,angle=0,color='#253c57'){const key=text+color;if(!labels.has(key)){const slot=labels.size;if(slot>=128)throw Error('Lusail sign atlas capacity exceeded');const cellLeft=slot%4*512,cellTop=Math.floor(slot/4)*128;signInk.fillStyle=color;if(color==='transparent')signInk.clearRect(cellLeft,cellTop,512,128);else signInk.fillRect(cellLeft,cellTop,512,128);signInk.fillStyle='#f4eee0';signInk.font='bold 82px Arial';signInk.textAlign='center';signInk.textBaseline='middle';signInk.fillText(text,cellLeft+256,cellTop+68,488);labels.set(key,{left:cellLeft,top:cellTop});}const {left,top}=labels.get(key),geometry=new THREE.PlaneGeometry(w,h),uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(left+uv.getX(i)*512)/2048,1-(top+(1-uv.getY(i))*128)/4096);const m=mesh(parent,geometry,signMaterial,x,y,z);m.rotation.y=angle;if(color!=='transparent'){const back=mesh(parent,geometry.clone(),mat(color),x,y,z);back.rotation.y=angle+Math.PI;}return m;}
 const world=(site,x,y,z)=>({owner:site.id,x:site.x+Math.cos(site.heading)*x+Math.sin(site.heading)*z,y:site.y+y,z:site.z-Math.sin(site.heading)*x+Math.cos(site.heading)*z,heading:site.heading});
 function instances(geometry,material,sites,pose,cell=1400){if(!sites.length){geometry.dispose();return [];}const buckets=new Map();for(const p of sites){const key=Math.floor(p.x/cell)+':'+Math.floor(p.z/cell);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(p);}const meshes=[];for(const chunk of buckets.values()){const m=new THREE.InstancedMesh(geometry,material,chunk.length);chunk.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.heading||0,0);dummy.scale.set(1,1,1);pose(p,i,dummy);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);if(p.color)m.setColorAt(i,tint.set(p.color));});m.userData.lusailOwners=chunk.map(p=>p.owner||p.id);m.computeBoundingSphere();m.receiveShadow=true;scene.group.add(m);meshes.push(m);}return meshes;}
 for(const site of plan.sites){
  if(site.kind==='pits'){
   const g=group(site),front=-site.side,w=site.w-5,d=site.d-5;
   scene.box(w,4.7,d,'#c5c2b2',0,2.35,0,g);scene.box(w*.87,4.2,d*.99,'#d6d2c3',0,6.8,0,g);
   scene.box(.16,2.7,d*.95,'#65858b',front*(w*.435+.1),7,0,g);
   for(const y of [4.85,9.05])scene.box(w+1,.32,d+1,'#e2e0d5',0,y,0,g);
   for(let i=0;i<40;i++){const z=-d*.48+(i+.5)*d*.96/40;scene.box(.18,4,d/40*.75,'#404b4e',front*(w/2+.1),2.15,z,g);scene.box(.2,.28,d/40*.79,'#a13c39',front*(w/2+.18),4.3,z,g);scene.box(.2,2.9,.18,'#bbbfb7',front*(w*.435+.2),7,z,g);}
   // Ribbed roof and warm hospitality ribbon across the neutral garage block.
   for(let i=0;i<24;i++){const z=-d*.47+(i+.5)*d*.94/24,roof=scene.box(w+.6,.24,d*.94/24+.04,'#d5c9b5',0,10.8+Math.sin(i*Math.PI/23)*.75,z,g);roof.rotation.z=front*.06;scene.box(.16,1.7,.18,'#dbc7a2',front*w*.435,8.2,z,g);}
   mesh(g,new THREE.BoxGeometry(.09,.14,d*.93),mat('#ffe0ac',{emissive:'#efad63',emissiveIntensity:1.8}),front*(w/2+.3),9.1,0);
   sign(g,'APEX · PIT & PADDOCK',54,1.6,front*(w/2+.25),5.1,0,front*Math.PI/2);sign(g,'DESERT · CONTROL',25,1.2,front*(w*.435+.23),8.6,-d*.33,front*Math.PI/2);sign(g,'PODIUM',16,1.4,front*(w/2+.26),7,d*.32,front*Math.PI/2);sign(g,'PIT LANE · '+Math.round(pitTransitPlan(track).speed*3.6),22,1.25,front*(w/2+.25),4.5,-d*.38,front*Math.PI/2);
   for(const z of [-d*.4,0,d*.4])poles.push(world(site,-front*(w/2-2),0,z));
  }
  if(site.kind==='tower'){
   const g=group(site);scene.box(2.8,23,2.8,'#a8b0ab',0,11.5,0,g);scene.box(6.8,12,4,'#253b48',0,19,0,g);for(let i=0;i<8;i++){sign(g,String(i+1).padStart(2,'0')+'  APEX',5,.8,0,23-i*1.2,2.03,0,'#253b48');}scene.box(7.4,.4,4.6,'#c6c8bd',0,25.3,0,g);sign(g,'RACE CONTROL',6,.8,0,26.1,0);
  }
  if(['hospitality','media','building'].includes(site.kind)){
   const g=group(site),w=site.w-3,d=site.d-4,height=site.kind==='media'?13:7,front=-site.side;
   scene.box(w,height,d,'#c5c6bb',0,height/2,0,g);scene.box(w+.4,.25,d+.4,'#78868b',0,height+.15,0,g);
   scene.box(.15,2.8,d*.84,'#607d8b',front*(w/2+.1),height-1.5,0,g);for(let z=-d*.4;z<d*.4;z+=6)scene.box(.2,3,.14,'#b7c5bf',front*(w/2+.17),height-1.5,z,g);
   sign(g,site.label||'PADDOCK HOSPITALITY',d*.8,1.5,front*(w/2+.2),3,0,front*Math.PI/2);
  }
  if(site.kind==='medical'){const g=group(site);scene.box(site.w-3,5,site.d-3,'#c8c6b7',0,2.5,0,g);scene.box(2.5,2.5,5.8,'#e4e5d9',0,1.3,0,g);scene.box(2.55,.3,1,'#587560',0,1.6,0,g);sign(g,'MEDICAL',10,1.2,0,4,-site.d/2+1.4,Math.PI);}
  if(site.kind==='stand'||site.kind==='bank'){
   const g=group(site),rows=site.rows,length=site.d-8,cols=Math.floor(length/.98),step=(site.w-8)/rows,isBank=site.kind==='bank';
   for(let row=0;row<rows;row++){const x=site.side*(-site.w/2+4+row*step),y=.7+row*(isBank?.12:.54);scene.box(step+.04,isBank?y+4:.55,length,isBank?'#a58f71':'#a9a29b',x,isBank?(y-4)/2:y,0,g);if(!isBank&&row%4===0)for(let support=-length/2+3;support<length/2;support+=16)scene.box(.22,y+4,.22,'#8c9893',x,(y-4)/2,support,g);if(!isBank)scene.box(step*.8,.1,length,row%3?'#b3a6a0':'#743448',x,y+.34,0,g);for(let col=0;col<cols;col++){if(col%27===0||(col+row*3)%5===0||crowds.length>=12000)continue;const p={...world(site,x,y+.72,-length/2+(col+.5)*length/cols),color:jackets[(col+row*3)%jackets.length],hat:(col+row)%4===0};crowds.push(p);if((row+col*7)%21===0)phones.push({...p,y:p.y+.63});if((row+col*3)%23===0)umbrellas.push({...p,y:p.y+.9});}}
   if(site.roof&&!isBank){const h=rows*.54+4;mesh(g,new THREE.BoxGeometry(.12,.12,length),mat('#ffe0ae',{emissive:'#ffae5d',emissiveIntensity:1.7}),-site.side*(site.w/2-.75),h-.28,0);for(let strip=0;strip<8;strip++){const z=-(site.d-2)/2+(strip+.5)*(site.d-2)/8;scene.box(site.w-1,.3,(site.d-2)/8+.1,'#dcd9cf',0,h+Math.sin(strip/7*Math.PI)*1.8,z,g);}for(let z=-length/2;z<length/2;z+=20){scene.box(.22,h,.22,'#7e8f91',site.side*(site.w/2-2),h/2,z,g);scene.box(site.w-2,.14,.14,'#a8b6b1',0,h-.4,z,g);}}
   for(let i=0;i<Math.floor(length/14);i++){const x=site.side*(-site.w/2+5+i%rows*step),y=3+i%rows*.5,z=-length/2+5+i*14;flags.push(world(site,x,y,z));scene.box(.03,2.5,.03,'#93a3a1',x,y-.9,z,g);}
   sign(g,site.label||'GENERAL ADMISSION',Math.min(length,32),1,-site.side*(site.w/2-1),2.2,0,-site.side*Math.PI/2);
   // Generic video screen stays wholly inside the same stand envelope.
   scene.box(.25,2.8,4.8,'#253e4e',-site.side*(site.w/2-2),3.8,0,g);sign(g,'APEX 25 · LIVE',4.5,2.4,-site.side*(site.w/2-1.8),3.8,0,-site.side*Math.PI/2);
  }
  if(site.kind==='camp'){
   const g=group(site);scene.box(site.w-2,.04,site.d-2,'#9e907a',0,-.06,0,g);for(let row=0;row<12;row++)for(let col=0;col<5;col++)tents.push({...world(site,-site.w*.4+col*site.w*.16,.04,-site.d*.39+row*site.d*.065),color:['#9b6260','#587d72','#a6996b','#576d8d'][col%4]});for(let i=0;i<12;i++)caravans.push(world(site,-site.w*.43+i*site.w*.078,.1,site.d*.45));for(const x of [-site.w*.4,site.w*.4]){poles.push(world(site,x,0,0));flags.push(world(site,x,6,0));for(let i=0;i<8;i++){const z=(-.4+i/8*.8)*site.d;flags.push(world(site,x,4,z));scene.box(.035,4,.035,'#aab2a2',x,2,z,g);}}sign(g,'DESERT FAN ZONE',site.w*.7,2,0,2.7,-site.d*.46,Math.PI);
  }
  if(site.kind==='parking'){
   const g=group(site);scene.box(site.w-2,.05,site.d-2,'#818477',0,-.07,0,g);for(let lane=0;lane<4;lane++)for(let i=0;i<18;i++){const x=-site.w*.36+lane*site.w*.24,z=-site.d*.42+i*site.d*.047;scene.box(Math.min(8,site.w*.24),.025,.1,'#b8bb9e',x,-.03,z,g);if(i%5)parkingCars.push({...world(site,x,.1,z+Math.min(3,site.d*.035)),color:jackets[(i+lane)%jackets.length]});}for(const x of [-site.w*.4,site.w*.4])for(const z of [-site.d*.4,site.d*.4])poles.push(world(site,x*.86,0,z*.76));sign(g,'EVENT PARKING',site.w*.6,2,0,2,-site.d*.46,Math.PI);
  }
  if(site.kind==='official'){
   const g=group(site),fit=site.approximateScale||1;g.scale.set(fit,1,fit);scene.box(4.5,.2,5,'#c0c8ba',0,.1,0,g);scene.box(4.6,.2,5.1,'#b9c3bd',0,3,0,g);for(const x of [-2,2])for(const z of [-2,2])scene.box(.1,3,.1,'#718583',x,1.5,z,g);
   for(let i=0;i<2;i++){scene.box(.4,.65,.3,'#ec8129',i*.65,1,0,g);scene.box(.25,.65,.25,'#d97526',i*.65,.4,0,g);mesh(g,new THREE.SphereGeometry(.16,6,4),mat('#e8ebdd'),i*.65,1.55,0);}
   scene.box(.1,3,.1,'#6c8280',3,1.5,0,g);scene.box(1.6,1,.15,'#2e4848',3,2.8,0,g);panels.push({...world(site,3*fit,2.8,-.09*fit),heading:site.heading+Math.PI,s:site.s});
   if(site.crane){scene.box(3,1,4,'#bdab64',7,1,0,g);scene.box(.55,11,.55,'#6b837c',7,6,0,g);const arm=scene.box(.25,.3,12,'#98aaa2',7,10,0,g);arm.rotation.x=-.25;scene.box(.8,.6,.9,'#2f4855',7,11.4,5.8,g);}else scene.box(4,2,5,'#bdc8bd',-1,1.15,4,g);
  }
  if(site.kind==='board'||site.kind==='banner'){const g=group(site),banner=site.kind==='banner';sign(g,site.label,banner?site.d-1:1.35,banner?1.2:1.05,0,1.5,0,banner?-site.side*Math.PI/2:Math.PI,banner?'#733044':'#2c3440');scene.box(.08,2,.08,'#758c88',0,1,0,g);}
  if(site.kind==='lawn'){const g=group(site);scene.box(site.w-.6,.08,site.d-.6,'#586744',0,.01,0,g);}
 }
 instances(new THREE.CapsuleGeometry(.17,.32,2,4),mat('#ffffff'),crowds,(p,i,o)=>{o.position.y+=.35;o.rotation.z=.04*Math.sin(i);});instances(new THREE.SphereGeometry(.12,5,4),mat('#b6987a'),crowds,(p,i,o)=>{o.position.y+=.78;});instances(new THREE.CylinderGeometry(.26,.24,.06,8),mat('#aeb4a6'),crowds.filter(p=>p.hat),(p,i,o)=>{o.position.y+=.9;});
 const wetUmbrellas=instances(new THREE.ConeGeometry(.62,.3,7),mat('#718797'),umbrellas,(p,i,o)=>{});
 const tentGeometry=new THREE.ConeGeometry(1,1,4);tentGeometry.rotateY(Math.PI/4);instances(tentGeometry,mat('#ffffff'),tents,(p,i,o)=>{o.scale.set(3.4,2.4,4.3);o.position.y+=1.2;});instances(new THREE.BoxGeometry(3,2.3,6.4),mat('#d8d9cf'),caravans,(p,i,o)=>{o.position.y+=1.35;});instances(new THREE.BoxGeometry(3.05,.6,3.8),mat('#718995'),caravans,(p,i,o)=>{o.position.y+=1.65;});
 instances(new THREE.BoxGeometry(2.2,1.1,4.5),mat('#ffffff'),parkingCars,(p,i,o)=>{o.position.y+=.6;});instances(new THREE.BoxGeometry(1.8,.55,2.5),mat('#647a87'),parkingCars,(p,i,o)=>{o.position.y+=1.35;});
 instances(new THREE.CylinderGeometry(.1,.15,13,6),mat('#8b9d98'),poles,(p,i,o)=>{o.position.y+=6.5;});instances(new THREE.BoxGeometry(3.2,.25,1.4),mat('#d4ddd3'),poles,(p,i,o)=>{o.position.y+=13;});
 const palms=plan.trees.filter(p=>p.type==='palm'),scrub=plan.trees.filter(p=>p.type==='scrub');
 instances(new THREE.CylinderGeometry(.15,.28,12,7),mat('#80745a'),palms,(p,i,o)=>{o.scale.setScalar(p.scale);o.position.y+=6*p.scale;});
 const fronds=palms.flatMap(p=>Array.from({length:8},(_,j)=>({...p,blade:j}))),leafGeometry=new THREE.ConeGeometry(1,1,3);leafGeometry.rotateX(Math.PI/2);
 instances(leafGeometry,mat('#52764f',{side:THREE.DoubleSide}),fronds,(p,i,o)=>{const a=p.blade*Math.PI/4;o.rotation.set(.28,a,0);o.scale.set(.85*p.scale,1,5.1*p.scale);o.position.x+=Math.sin(a)*2.1*p.scale;o.position.z+=Math.cos(a)*2.1*p.scale;o.position.y+=12*p.scale;});
 instances(new THREE.IcosahedronGeometry(1,1),mat('#ffffff'),scrub.map((p,i)=>({...p,color:['#6a6b4d','#85805d','#555b45'][i%3]})),(p,i,o)=>{o.scale.set(1.28*p.scale,.54*p.scale,.95*p.scale);o.position.y+=.34*p.scale;});
 const flagCanvas=document.createElement('canvas');flagCanvas.width=320;flagCanvas.height=96;const ink=flagCanvas.getContext('2d');
 // Public-domain Qatari flag and original international checker motif.
 ink.fillStyle='#782742';ink.fillRect(0,0,160,96);ink.fillStyle='#f7f1e6';ink.fillRect(0,0,47,96);ink.beginPath();ink.moveTo(47,0);for(let i=0;i<9;i++){ink.lineTo(64,(i+.5)*96/9);ink.lineTo(47,(i+1)*96/9);}ink.closePath();ink.fill();
 for(let row=0;row<6;row++)for(let col=0;col<10;col++){ink.fillStyle=(row+col)%2?'#eff2df':'#385c80';ink.fillRect(160+col*16,row*16,16,16);}
 const flagMap=new THREE.CanvasTexture(flagCanvas);flagMap.colorSpace=THREE.SRGBColorSpace;const cloth=mat('#ffffff',{map:flagMap,side:THREE.DoubleSide});cloth.onBeforeCompile=shader=>{shader.uniforms.lusailClock=clock;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float lusailClock;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z+=sin(position.x*5.0+lusailClock*2.3+instanceMatrix[3].x*.02)*.17*uv.x;');};cloth.customProgramCacheKey=()=> 'lusail-flags-v1';
 for(const state of [0,1]){const flagGeometry=new THREE.PlaneGeometry(1.6,1,6,2),uv=flagGeometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,(uv.getX(i)+state)/2);instances(flagGeometry,cloth,flags.filter((p,i)=>i%2===state),(p,i,o)=>{o.position.x+=.7;});}

 for(const bridge of plan.structures.bridges){if(bridge.kind!=='gantry')continue;const x=(bridge.a.x+bridge.b.x)/2,z=(bridge.a.z+bridge.b.z)/2,g=new THREE.Group();g.position.set(x,bridge.a.y+.66,z);g.rotation.y=sample(track,0).heading;g.userData.pitKeep=true;scene.group.add(g);sign(g,'APEX · DESERT NIGHT',Math.min(24,bridge.length-3),1.05,0,0,-bridge.width/2-.02,Math.PI,'#6d3045');
  for(let i=0;i<5;i++)mesh(g,new THREE.BoxGeometry(.46,.25,.07),mat('#b23346',{emissive:'#8b2439',emissiveIntensity:.85}),-1.4+i*.7,-.44,-bridge.width/2-.05);
 }
 const leds=instances(new THREE.PlaneGeometry(1.35,.64),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide,toneMapped:false}),panels,(p,i,o)=>{},12000);
 const phoneMat=new THREE.MeshBasicMaterial({color:'#f9deb4',transparent:true,opacity:.52,depthWrite:false,toneMapped:false});instances(new THREE.SphereGeometry(.055,4,3),phoneMat,phones,(p,i,o)=>{});
 const lighting=createLusailLighting(scene,track,plan,{instances,mat}),dressing=addLusailDressing(scene,track,plan,{group,mesh,mat,sign,world,instances});
 signMap.needsUpdate=true;let wet=0,at=-Infinity;
 scene.environmentFx={frame(time,cars){lighting.frame();if(time-at<85)return;at=time;clock.value=time*.001;phoneMat.opacity=.37+.17*Math.sin(time*.002);dressing.frame(time,cars,scene.lusailLightingEnabled!==false);
  let index=0;for(const led of leds){for(let i=0;i<led.count;i++){const owner=led.userData.lusailOwners[i],p=panels.find(panel=>panel.owner===owner)||panels[index];index++;const caution=cars.some(c=>!c.finished&&!c.retired&&(c.offtrack||c.sliding)&&Math.min(Math.abs(c.s-p.s),track.length-Math.abs(c.s-p.s))<150);led.setColorAt(i,tint.set(caution?(Math.floor(time/360)%2?'#efca51':'#604b22'):'#3aca90'));}if(led.instanceColor)led.instanceColor.needsUpdate=true;}
 },setConditions(value){wet=value;lighting.setConditions(value);dressing.setConditions(value);for(const obj of wetUmbrellas)obj.visible=wet>.1;},dispose(){lighting.dispose();dressing.dispose();}};
 scene.group.userData.lusailPlan=plan;scene.group.userData.lusailBudget={masts:plan.masts.length,spectators:crowds.length,plants:plan.trees.length,flags:flags.length,tents:tents.length,addedDynamicLights:2};return scene.profile;
}
