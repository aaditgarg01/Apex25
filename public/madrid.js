import * as THREE from '/vendor/three.module.js';
import {sample} from '/shared/tracks.mjs';
import {madridLayout,madridTunnelAt,madridTunnelLayout} from '/shared/madrid.mjs';
import {roadClearance,safeBoxSite} from '/shared/venues.mjs';
import {footprintClear} from './jeddah-clearance.js';
import {trackSign,addFacadePanels,addBrakingBoards} from './track-furniture.js';
import {buildingFacade} from './campus-buildings.js';

let materials=new Map(),signMaterials=new Map();
const mat=(color,extra={})=>{if(extra.map)return new THREE.MeshStandardMaterial({color,roughness:.82,...extra});const key=JSON.stringify([color,extra]);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.82,...extra}));return materials.get(key);};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
const bounds=(w,d)=>new THREE.Box3(new THREE.Vector3(-w/2,0,-d/2),new THREE.Vector3(w/2,40,d/2));
function mesh(parent,geometry,material,x=0,y=0,z=0,staticMesh=true){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;m.userData.mappedStatic=staticMesh;parent.add(m);return m;}
function group(scene,p,heading=p.heading||0){const g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=heading;scene.group.add(g);return g;}
function beam(scene,g,a,b,color='#879094',width=.13){const delta=b.clone().sub(a),m=scene.box(width,delta.length(),width,color,...a.clone().add(b).multiplyScalar(.5).toArray(),g);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
function sign(g,text,w,h,x,y,z,heading=0,color='#c52d3c',ink='#fff5e6'){
 const key=JSON.stringify([text,color,ink]);let m;if(signMaterials.has(key))m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),signMaterials.get(key));else{m=trackSign(text,w,h,color,ink);signMaterials.set(key,m.material);}m.position.set(x,y,z);m.rotation.y=heading;m.userData.mappedStatic=true;g.add(m);return m;
}
function overlaps(a,b,pad=6){
 for(const h of [a.heading,b.heading])for(const axis of [{x:Math.cos(h),z:-Math.sin(h)},{x:Math.sin(h),z:Math.cos(h)}]){
  const radius=p=>Math.abs(axis.x*Math.cos(p.heading)-axis.z*Math.sin(p.heading))*p.w/2+Math.abs(axis.x*Math.sin(p.heading)+axis.z*Math.cos(p.heading))*p.d/2;
  if(Math.abs((a.x-b.x)*axis.x+(a.z-b.z)*axis.z)>radius(a)+radius(b)+pad)return false;
 }
 return true;
}
function safeGroup(scene,track,s,w,d,side,margin=10){
 const occupied=scene.group.userData.madridSites??=[],base=safeBoxSite(track,s,w/2,d/2,side,margin),road=sample(track,s),start=Math.hypot(base.x-road.x,base.z-road.z);let site=null;
 for(let distance=start;distance<2600;distance+=12){const p={...sample(track,s,side*distance),w,d};if(!occupied.some(q=>overlaps(p,q))&&footprintClear(track,p,p.heading,bounds(w,d),margin)){site=p;break;}}
 if(!site)throw new Error('No clear Madrid scenery site');occupied.push(site);
 const levels=[];for(const x of [-w/2,0,w/2])for(const z of [-d/2,0,d/2])levels.push(madridTerrainHeight(track,site.x+Math.cos(site.heading)*x+Math.sin(site.heading)*z,site.z-Math.sin(site.heading)*x+Math.cos(site.heading)*z));
 const top=Math.max(...levels)+.15,bottom=Math.min(...levels)-.3,g=group(scene,{...site,y:top},site.heading+(side<0?Math.PI:0));scene.box(w,top-bottom,d,'#b5b1a0',0,-(top-bottom)/2,0,g);return g;
}

export function madridTerrainHeight(track,x,z,cell=0){
 const plan=madridLayout(track);let near=plan.heights[0],distance=Infinity,floor=Infinity,index=0;
 for(let i=0;i<plan.heights.length;i++){const p=plan.heights[i],d=Math.hypot(x-p.x,z-p.z);if(d<distance){distance=d;near=p;index=i*6;}if(d<track.width/2+cell*1.42+10)floor=Math.min(floor,p.y-.85);}
 const s=index*track.step,far=(1.3*Math.sin(x*.004)+.8*Math.cos(z*.006))*smooth((distance-80)/220),bank=s>=plan.monumental.start-70&&s<=plan.monumental.end+70?5.2*smooth((distance-18)/24)*(1-smooth((distance-70)/70)):0;
 let y=near.groundY-.85+far+bank;
 for(const tunnel of plan.tunnels){const delta=Math.abs(s-tunnel.s),along=1-smooth((delta-tunnel.length/2-12)/60),rise=smooth((distance-18)/22)*(1-smooth((distance-75)/80));y+=along*rise*7;}
 return Number.isFinite(floor)?Math.min(y,floor):y;
}

function hall(scene,track,s,w,d,side,name,number){
 const g=safeGroup(scene,track,s,w+10,d+12,side,12),glass=buildingFacade('research');g.name=name;
 scene.box(w+10,.3,d+12,'#b8b5aa',0,.03,0,g);scene.box(w,11,d,'#cfcec3',0,5.5,0,g);scene.box(w+2,.6,d+3,'#b9c1bf',0,11.3,0,g);
 scene.box(.35,5.5,d,'#37606a',-w/2-.2,5.8,0,g);addFacadePanels(g,w,10.4,d,glass);
 const vertices=[],indices=[];for(let i=0;i<=20;i++)for(const z of [-d/2,d/2]){const u=i/20;vertices.push((u-.5)*w,11.5+3.25*Math.sin(u*Math.PI),z);if(i<20&&z===-d/2){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}
 const roof=new THREE.BufferGeometry();roof.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));roof.setIndex(indices);roof.computeVertexNormals();mesh(g,roof,mat('#c4ccca',{side:THREE.DoubleSide}));
 // Broad barrel-vault roof bays, clerestory glazing and repeated exhibition ribs.
 for(let z=-d/2+6;z<d/2;z+=12){
  const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-w/2,11.5,z),new THREE.Vector3(0,18,z),new THREE.Vector3(w/2,11.5,z));mesh(g,new THREE.TubeGeometry(curve,12,.18,5,false),mat('#d9dad3'));
  scene.box(w,.17,1.8,'#8caaa9',0,12.7,z,g);
 }
 for(let x=-w/2+3;x<w/2;x+=8){scene.box(.18,10.8,.3,'#f0ede1',x,5.4,-d/2-.2,g);scene.box(.18,10.8,.3,'#f0ede1',x,5.4,d/2+.2,g);}
 for(let z=-d/2+8;z<d/2;z+=18){scene.box(.3,4.1,8,'#46555b',-w/2-.3,2.1,z,g);scene.box(7,.3,8.8,'#dad8cf',-w/2-3,4.5,z,g);}
 sign(g,name,Math.min(d*.65,50),2.6,-w/2-.45,9,0,-Math.PI/2,'#c8293b');sign(g,String(number),6,6,-w/2-.5,5,-d*.32,-Math.PI/2,'#d62c3d');
 return g;
}
function ifema(scene,track){
 hall(scene,track,track.length-250,74,126,1,'IFEMA MADRID · HALL 12',12);
 hall(scene,track,track.length-620,68,120,1,'IFEMA MADRID · HALL 14',14);
 const north=hall(scene,track,madridLayout(track).north,48,98,1,'CENTRO DE CONVENCIONES NORTE',0);north.name='North Convention Centre';
 const g=safeGroup(scene,track,track.length-20,40,185,1,10);g.name='Covered IFEMA paddock and pit hospitality';
 scene.box(34,7,176,'#d8d9d1',0,3.5,0,g);scene.box(37,.7,180,'#ebe9dc',0,7.4,0,g);scene.box(30,4.8,170,'#4f7480',0,10,0,g);scene.box(39,.6,184,'#edede2',0,12.7,0,g);
 addFacadePanels(g,30,11.9,170,buildingFacade('research'));
 for(let z=-80;z<=80;z+=10){scene.box(.25,12.4,.35,'#ecece1',-16,6.2,z,g);scene.box(.15,4.2,8.3,'#253740',-17.1,2.2,z,g);scene.box(.2,.65,8.3,['#c62f3c','#177565','#264b7d'][Math.floor((z+80)/10)%3],-17.15,4.7,z,g);}
 sign(g,'MADRING · PADDOCK CLUB',100,2.2,-15.3,10.7,0,-Math.PI/2,'#c72a3d');
 // Enclosed exhibition courtyard and covered transfer galleries stay off-road.
 const lounge=safeGroup(scene,track,track.length*.90,30,64,-1,13);scene.box(30,6,64,'#e2d9c4',0,3,0,lounge);scene.box(32,.5,67,'#deddd4',0,6.3,0,lounge);addFacadePanels(lounge,30,5.8,64,buildingFacade('research'));sign(lounge,'LA TERMINAL · HOSPITALITY',39,1.6,-15.1,4.6,0,-Math.PI/2,'#164f54');
}

function spanishFlag(){const c=document.createElement('canvas');c.width=128;c.height=80;const x=c.getContext('2d');x.fillStyle='#b72035';x.fillRect(0,0,128,80);x.fillStyle='#e8bb43';x.fillRect(0,20,128,40);x.fillStyle='#b78d36';x.fillRect(32,32,9,18);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return mat('#ffffff',{map:t,side:THREE.DoubleSide});}
function addCrowd(parent,sites,flags){
 const d=new THREE.Object3D(),body=new THREE.InstancedMesh(new THREE.CylinderGeometry(.18,.23,.55,5),mat('#ffffff'),sites.length),heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.12,6,4),mat('#ffffff'),sites.length);
 const colors=['#e83830','#f1c63e','#f4eee1','#286375','#f4eee1','#274a3e','#e45c20','#2d304a'];
 for(const [i,p] of sites.entries()){d.position.set(p.x,p.y+.38,p.z);d.rotation.set(0,p.heading||0,.06*Math.sin(i));d.scale.set(1,1,1);d.updateMatrix();body.setMatrixAt(i,d.matrix);body.setColorAt(i,new THREE.Color(colors[i%colors.length]));d.position.y+=.43;d.updateMatrix();heads.setMatrixAt(i,d.matrix);heads.setColorAt(i,new THREE.Color(['#c69a78','#dfb992','#956b51'][i%3]));}
 for(const m of [body,heads]){m.computeBoundingSphere();m.castShadow=false;parent.add(m);}
 const cloth=spanishFlag();for(let i=0;i<sites.length;i+=85){const p=sites[i];mesh(parent,new THREE.CylinderGeometry(.018,.018,2.1,4),mat('#929e9a'),p.x,p.y+1.5,p.z);const f=mesh(parent,new THREE.PlaneGeometry(1.45,.9,8,2),cloth,p.x+.7,p.y+2.1,p.z,false);f.castShadow=false;flags.push(f);}
}
function batchFlags(scene,flags){
 const time={value:0};if(!flags.length)return time;scene.group.updateMatrixWorld(true);
 const material=flags[0].material,geometry=flags[0].geometry.clone(),mesh=new THREE.InstancedMesh(geometry,material,flags.length),inverse=scene.group.matrixWorld.clone().invert();
 material.onBeforeCompile=shader=>{shader.uniforms.madridTime=time;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float madridTime;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z+=sin(position.x*4.0+madridTime+instanceMatrix[3].x*.03)*.12*uv.x;');};material.customProgramCacheKey=()=> 'madrid-flag-wind-v1';
 for(const [i,f] of flags.entries()){mesh.setMatrixAt(i,inverse.clone().multiply(f.matrixWorld));f.removeFromParent();f.geometry.dispose();}
 for(const other of new Set(flags.map(f=>f.material)))if(other!==material){other.map?.dispose();other.dispose();}
 mesh.computeBoundingSphere();mesh.castShadow=false;mesh.receiveShadow=true;scene.group.add(mesh);return time;
}
function monumental(scene,track,flags){
 const plan=madridLayout(track).monumental,people=[];
 const standBounds=bounds(35,9.5);
 for(let s=plan.start;s<plan.end;s+=8){
  const p=sample(track,s,35),g=group(scene,{...p,y:p.y-.4});
  if(!footprintClear(track,p,p.heading,standBounds,8)){g.removeFromParent();continue;}
  (scene.group.userData.madridSites??=[]).push({...p,w:35,d:9.5});
  for(let row=0;row<24;row++){
   const offset=-16+row*1.35,height=.8+row*.62;scene.box(1.4,height,8.5,'#c8c5b8',offset,height/2,0,g);scene.box(.7,.1,8.3,['#c3313b','#ded3af','#c3313b'][row%3],offset,height+.07,0,g);
   for(let col=0;col<9;col++){const q=sample(track,s-3.7+col*.88,35+offset);people.push({...q,y:p.y+height+.12});}
  }
  for(const x of [-14,16])scene.box(.28,16.5,.28,'#858f92',x,8.25,4.15,g);
  beam(scene,g,new THREE.Vector3(-15,.1,4),new THREE.Vector3(16,15.2,4));scene.box(.1,1.1,8.6,'#697878',17,15.2,0,g);
  if(Math.floor(s/8)%6===0)sign(g,'LA MONUMENTAL',8,1.2,17.1,14,0,Math.PI/2,'#c52c3c');
 }
 addCrowd(scene.group,people,flags);
 // Arena entrance pylons and sculpted concourse, not a second banked road.
 for(const s of [plan.start,plan.end]){const g=safeGroup(scene,track,s,9,12,1,16);scene.box(7,21,10,'#c5bda8',0,10.5,0,g);scene.box(7.4,1.1,10.4,'#a63139',0,21,0,g);sign(g,'M',5,7,-3.56,15,0,-Math.PI/2,'#b12a39');}
}
function straightStand(scene,track,s,side,flags){
 const g=safeGroup(scene,track,s,30,124,side,10),people=[];
 for(let r=0;r<17;r++){const x=-11+r*1.35,h=.6+r*.6;scene.box(1.4,h,116,'#c6c7be',x,h/2,0,g);scene.box(.65,.1,115,r%2?'#b82d3d':'#d4b74d',x,h+.04,0,g);for(let j=0;j<110;j++)people.push({x,y:h+.12,z:-56+j*1.02});}
 scene.box(29,.45,122,'#d9d9cf',0,15.3,0,g);for(const z of [-58,-29,0,29,58]){scene.box(.3,15,.3,'#798b8b',12,7.5,z,g);beam(scene,g,new THREE.Vector3(12,14.9,z),new THREE.Vector3(-13,15.1,z));}
 addCrowd(g,people,flags);sign(g,'MADRING · GRAN PREMIO DE ESPAÑA',105,1.4,-12.5,11,0,-Math.PI/2);
}

function tunnelShells(scene,track){
 const concrete=scene.surfaces.material('concrete','#a9aba3'),lamps=new THREE.MeshBasicMaterial({color:'#f7f6df',toneMapped:false});
 for(const t of madridLayout(track).tunnels){
  const layout=madridTunnelLayout(track,t),g=group(scene,{x:layout.center.x,y:layout.floor,z:layout.center.z},layout.heading),width=layout.right-layout.left,length=layout.front-layout.back,height=layout.roof-layout.floor,cx=(layout.left+layout.right)/2,cz=(layout.front+layout.back)/2;g.name=t.name+' highway underpass';
  // The complete curved road fits inside a straight concrete portal envelope.
  // Rendered side walls come from exactly the same layout as collision physics.
  mesh(g,new THREE.BoxGeometry(width+1.8,.9,length+1.2),concrete,cx,height+.45,cz);
  for(const x of [layout.left+1.5,layout.right-1.5])for(let z=layout.back+2;z<layout.front;z+=6)mesh(g,new THREE.BoxGeometry(.4,.12,3.5),lamps,x,height-.2,z);
  for(const z of [layout.back,layout.front]){
   for(const x of [layout.left,layout.right]){scene.box(1.1,height,1.1,'#bec1b6',x,height/2,z,g);for(let j=0;j<7;j++)scene.box(1.12,.28,1.13,j%2?'#e7d8a8':'#555953',x,.45+j*.6,z,g);}
   sign(g,t.name,width-.5,.95,cx,height-.6,z+(z===layout.front?.62:-.62),z===layout.front?0:Math.PI,'#134e57');
  }
  // M-11 highway deck and parapets stay entirely above the tunnel opening.
  scene.box(width+48,.6,32,'#a6a8a1',cx,height+1.2,cz,g);for(const z of [cz-16,cz+16])scene.box(width+48,1.2,.6,'#c0c3b9',cx,height+2,z,g);
  for(const x of [cx-width/2-15,cx+width/2+15])scene.box(.18,7,.18,'#7e8a88',x,height+4.7,cz,g);
 }
}

function vegetation(scene,track){
 const dummy=new THREE.Object3D(),sites=[];
 for(let s=0;s<track.length;s+=31)for(const side of [-1,1]){
  const p=sample(track,s,side*(42+11*Math.sin(s*.03)**2));if(madridTunnelAt(track,s,65)||s>madridLayout(track).monumental.start-80&&s<madridLayout(track).monumental.end+80||roadClearance(track,p.x,p.z)<20)continue;
  // Exhibition frontage is deliberately sparse. Park side is a broader grove.
  if(s<600&&side>0||s>track.length-1100&&side>0||(scene.group.userData.madridSites||[]).some(q=>overlaps({...p,w:8,d:8},q)))continue;sites.push({...p,y:madridTerrainHeight(track,p.x,p.z)});
 }
 for(let i=0;i<170;i++){
  const p=sample(track,track.length-340,-(90+(i%17)*14)),heading=p.heading,x=p.x+Math.sin(heading)*(Math.floor(i/17)-5)*22,z=p.z+Math.cos(heading)*(Math.floor(i/17)-5)*22;
  if(roadClearance(track,x,z)>28&&!(scene.group.userData.madridSites||[]).some(q=>overlaps({x,z,w:8,d:8,heading:0},q)))sites.push({x,z,y:madridTerrainHeight(track,x,z)});
 }
 const stems=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.22,6.4,5),mat('#8b7955'),sites.length),crowns=new THREE.InstancedMesh(new THREE.ConeGeometry(3.2,6.2,7),mat('#4d6c45'),sites.length),tufts=new THREE.InstancedMesh(new THREE.ConeGeometry(.4,.7,4),mat('#99976c'),sites.length*3);
 for(const [i,p] of sites.entries()){dummy.rotation.set(0,i,0);dummy.scale.setScalar(.8+(i%5)*.07);dummy.position.set(p.x,p.y+3.1,p.z);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);dummy.position.y=p.y+6.8;dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);for(let j=0;j<3;j++){dummy.scale.setScalar(1);dummy.position.set(p.x+3+j*.65,p.y+.3,p.z+1.5);dummy.updateMatrix();tufts.setMatrixAt(i*3+j,dummy.matrix);}}
 for(const m of [stems,crowns,tufts]){m.computeBoundingSphere();m.castShadow=m!==tufts;scene.group.add(m);}
 const park=safeGroup(scene,track,track.length-300,92,150,-1,25);scene.box(90,.13,148,'#647c4b',0,-.03,0,park);scene.box(4,.16,148,'#c4b994',0,.08,0,park);sign(park,'PARQUE JUAN CARLOS I',28,1.6,0,3,-70,Math.PI,'#30624b');
}

function eventDressing(scene,track,flags){
 const panels=[],brands=[['ROLEX','#135338','#e6ce84'],['Santander','#d52b35','#fff4e8'],['DHL','#edc636','#b22c35'],['MADRING','#b5293a','#fff5df']];
 for(let s=60;s<track.length;s+=90)for(const side of [-1,1]){
  if(madridTunnelAt(track,s,15))continue;const p=sample(track,s,side*(track.width/2+6.44));if(!footprintClear(track,p,p.heading,bounds(.2,14),3))continue;
  const [name,bg,ink]=brands[Math.floor(s/90)%4],g=group(scene,p);sign(g,name,13,1,0,.62,0,side>0?-Math.PI/2:Math.PI/2,bg,ink);
 }
 for(const s of [510,track.length*.53,track.length*.82]){
  const p=sample(track,s),g=group(scene,p),half=track.width/2+8;
  // Only the high crossbeam spans the course; supports are checked independently.
  if(![-1,1].every(side=>footprintClear(track,sample(track,s,side*half),p.heading,bounds(1.6,2),3))){g.removeFromParent();continue;}
  for(const side of [-1,1]){scene.box(.5,9,.5,'#7b898b',side*half,4.5,0,g);beam(scene,g,new THREE.Vector3(side*half,6,-1),new THREE.Vector3(side*half,9,1));}
  scene.box(half*2+1,2,.9,'#bf2f3c',0,9,0,g);sign(g,'MADRING · ESPAÑA',half*2,1.6,0,9,.48);sign(g,'DHL',half*2,1.6,0,9,-.48,Math.PI,'#edc636','#ae2735');
 }
 for(let s=130;s<track.length;s+=360){
  if(madridTunnelAt(track,s,95))continue;const g=safeGroup(scene,track,s,7,10,-1,8);g.name='Marshal recess and LED panel';scene.box(6,.3,7,'#c0bca7',0,.1,0,g);scene.box(.4,1.5,7,'#e3e1d2',-3,1,0,g);scene.box(6,1.5,.4,'#e3e1d2',0,1,-3.5,g);scene.box(7,.2,8,'#e3dfd0',0,3.2,0,g);for(const z of [-3.4,3.4])scene.box(.12,3.2,.12,'#747f7f',2.8,1.6,z,g);
  for(const z of [-1.5,1.2]){mesh(g,new THREE.CylinderGeometry(.2,.23,.75,6),mat('#f37530'),-.5,1.2,z);mesh(g,new THREE.SphereGeometry(.14,7,5),mat('#e8e9df'),-.5,1.76,z);for(const x of [-.65,-.35])scene.box(.15,.65,.16,'#e77932',x,.57,z,g);}
  const panel=mesh(g,new THREE.PlaneGeometry(1.5,1),new THREE.MeshBasicMaterial({color:'#2ee285',toneMapped:false,side:THREE.DoubleSide}),-3.23,2.7,1,false);panel.rotation.y=-Math.PI/2;panels.push({mesh:panel,s});
 }
 for(const s of [madridLayout(track).crest+190,track.length*.58,track.length-120]){
  const g=safeGroup(scene,track,s,24,26,-1,20);scene.box(4,1.7,8,'#d4b349',0,1,0,g);for(const x of [-2,2])for(const z of [-2,2])mesh(g,new THREE.CylinderGeometry(.7,.7,.5,8),mat('#313638'),x,.65,z).rotation.z=Math.PI/2;scene.box(.7,15,.7,'#7e8b8a',0,8,0,g);beam(scene,g,new THREE.Vector3(0,15,0),new THREE.Vector3(10,22,-6),'#cdbd6b',.5);mesh(g,new THREE.BoxGeometry(1,.7,1.8),mat('#35434b'),10,21.2,-6);
 }
 for(const s of [760,track.length*.62]){
  const g=safeGroup(scene,track,s,62,62,-1,30);scene.box(60,.2,60,'#baae97',0,.1,0,g);for(const x of [-19,0,19]){scene.box(12,4,17,'#eee9db',x,2,0,g);const roof=mesh(g,new THREE.ConeGeometry(11,4,4),mat('#f6f0df'),x,5.6,0);roof.rotation.y=Math.PI/4;}scene.box(15,7,10,'#323d48',0,3.5,22,g);sign(g,'MADRING FAN ZONE',27,2,0,7.3,27.1,0,'#b82c3c');for(let i=0;i<60;i++){const x=-24+(i%12)*4,z=-22+Math.floor(i/12)*4;mesh(g,new THREE.CylinderGeometry(.2,.2,.65,5),mat(['#c92e36','#ead352','#dadacf','#276575'][i%4]),x,.7,z);}
 }
 straightStand(scene,track,track.length-110,-1,flags);straightStand(scene,track,track.length*.55,1,flags);
 // Interlocking energy-absorbing blocks beyond the road edge at El Búnker.
 for(const s0 of [madridLayout(track).crest+120,madridLayout(track).crest+220])for(let j=0;j<10;j++){
  const p=sample(track,s0+j*1.9,-(track.width/2+6.4));if(!footprintClear(track,p,p.heading,bounds(.7,1.75),4))continue;const g=group(scene,p);scene.box(.65,.95,1.75,j%3?'#dfddd1':'#bc3540',0,.52,0,g);scene.box(.02,.18,1,'#6a6c64',.34,.3,0,g);
 }
 const bank=madridLayout(track).monumental;
 for(let s=bank.start;s<bank.end;s+=4){const p=sample(track,s,track.width/2+6.35),g=group(scene,p);for(const h of [.42,.83])scene.box(.15,.23,4.1,'#deded3',0,h,0,g);}
 return panels;
}

function airliners(scene,track){
 const aircraft=[];
 for(let i=0;i<3;i++){
  const g=new THREE.Group();g.name='Distant Barajas departure';scene.group.add(g);const white=mat('#e2e6e1'),wing=mat('#aebbc0');
  mesh(g,new THREE.CylinderGeometry(.8,1,20,10),white,0,0,0,false).rotation.x=Math.PI/2;mesh(g,new THREE.SphereGeometry(1,8,6),white,0,0,10,false).scale.set(.85,.85,2);
  mesh(g,new THREE.BoxGeometry(24,.18,3.2),wing,0,-.2,-1,false).rotation.y=.17;mesh(g,new THREE.BoxGeometry(9,.13,2),wing,0,.6,-8,false);mesh(g,new THREE.BoxGeometry(.2,4.2,3),mat(i%2?'#c4333d':'#b89748'),0,2,-8.5,false);
  for(const x of [-5,5])mesh(g,new THREE.CylinderGeometry(.6,.65,3,7),wing,x,-1.1,-.5,false).rotation.x=Math.PI/2;
  aircraft.push(g);
 }
 return aircraft;
}
function heatHaze(scene,track){
 const uniforms={time:{value:0},strength:{value:1}},shader=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:'uniform float time; varying vec2 vUv; void main(){vUv=uv;vec3 p=position;p.x+=sin(p.y*7.0+time*1.8)*.028;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',fragmentShader:'uniform float time;uniform float strength;varying vec2 vUv;void main(){float wave=sin(vUv.x*90.0+sin(vUv.y*23.0-time*1.3)*2.0+time);float edge=sin(vUv.x*3.14159)*sin(vUv.y*3.14159);gl_FragColor=vec4(vec3(.81,.79,.71),max(0.0,wave)*edge*.026*strength);}'});
 for(const s of [track.length*.54,track.length*.67]){const p=sample(track,s),m=mesh(scene.group,new THREE.PlaneGeometry(16,1.3,20,6),shader,p.x,p.y+1.05,p.z,false);m.rotation.y=p.heading;m.castShadow=false;}
 return uniforms;
}
export function addMadrid(scene,track){
 materials=new Map();signMaterials=new Map();
 const flags=[];ifema(scene,track);monumental(scene,track,flags);tunnelShells(scene,track);const panels=eventDressing(scene,track,flags);vegetation(scene,track);const planes=airliners(scene,track),haze=heatHaze(scene,track),flagWind=batchFlags(scene,flags);addBrakingBoards(scene,track);
 let wet=0;
 scene.environmentFx={setConditions(w){wet=w;haze.strength.value=1-w;},frame(time,cars){
  haze.time.value=time*.001;flagWind.value=time*.0017;
  for(const panel of panels){const yellow=cars.some(c=>!c.finished&&(c.offtrack||c.sliding)&&Math.abs(((c.s-panel.s+track.length*1.5)%track.length)-track.length/2)<140);panel.mesh.material.color.set(yellow?(Math.floor(time/350)%2?'#ffdc35':'#655722'):'#32db89');}
  for(const [i,p] of planes.entries()){const t=(time*.000014+i*.32)%1;p.position.set(1250-t*2400,160+t*150+i*30,-1400+t*950);p.rotation.set(.06,-1.18,-.025);p.visible=wet<.8;}
 },dispose(){}};
 return scene.profile;
}
