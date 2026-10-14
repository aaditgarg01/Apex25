import * as THREE from '/vendor/three.module.js';
import {sample} from '/shared/tracks.mjs';
import {SHANGHAI_ARCHITECTURE as data} from './data/shanghai-architecture.js';
import {trackSign} from './track-furniture.js';

const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.75,...extra});
function add(parent,geometry,mat,x=0,y=0,z=0){const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.mappedStatic=true;parent.add(mesh);return mesh;}
function local(track,[lon,lat]){return {x:(lon-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(lat-track.origin.lat)*111320};}
function framePoint(track,point,frame){const p=local(track,point),dx=p.x-frame.x,dz=p.z-frame.z;return {r:dx*Math.cos(frame.heading)-dz*Math.sin(frame.heading),s:dx*Math.sin(frame.heading)+dz*Math.cos(frame.heading)};}
function bounds(track,feature,frame){const points=feature.points.slice(0,-1).map(p=>framePoint(track,p,frame));return {r0:Math.min(...points.map(p=>p.r)),r1:Math.max(...points.map(p=>p.r)),s0:Math.min(...points.map(p=>p.s)),s1:Math.max(...points.map(p=>p.s))};}
function world(frame,r,s){return {x:frame.x+Math.cos(frame.heading)*r+Math.sin(frame.heading)*s,z:frame.z-Math.sin(frame.heading)*r+Math.cos(frame.heading)*s,heading:frame.heading};}
function frameGroup(scene,frame,y){const group=new THREE.Group();group.position.set(frame.x,y,frame.z);group.rotation.y=frame.heading;scene.group.add(group);return group;}
function roundedPath(cx,cy,width,height,radius,Shape=THREE.Path){const path=new Shape(),left=cx-width/2,right=cx+width/2,bottom=cy-height/2,top=cy+height/2;path.moveTo(left+radius,bottom);path.lineTo(right-radius,bottom);path.quadraticCurveTo(right,bottom,right,bottom+radius);path.lineTo(right,top-radius);path.quadraticCurveTo(right,top,right-radius,top);path.lineTo(left+radius,top);path.quadraticCurveTo(left,top,left,top-radius);path.lineTo(left,bottom+radius);path.quadraticCurveTo(left,bottom,left+radius,bottom);path.closePath();return path;}
function bridgeBanner(){
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=256;const context=canvas.getContext('2d');context.clearRect(0,0,2048,256);context.fillStyle='#50334c';context.beginPath();context.roundRect(0,0,2048,256,122);context.fill();context.fillStyle='#ce303d';context.fillRect(365,41,804,175);context.fillStyle='#f0eeee';context.font='bold 163px Arial';context.textAlign='center';context.fillText('Lenovo',767,185);context.fillStyle='#d43644';context.font='bold 158px Arial';context.fillText('联想',1420,184);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.05,side:THREE.DoubleSide,toneMapped:false});
}
function terrace(parent,cx,y,z){
 const count=18,dummy=new THREE.Object3D(),bodies=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.18,.35,2,5),material('#ffffff'),count),heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.12,7,5),material('#d1b592'),count);
 for(let i=0;i<count;i++){dummy.position.set(cx-6+i*.7,y+.85,z);dummy.scale.setScalar(1);dummy.rotation.set(0,0,0);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);bodies.setColorAt(i,new THREE.Color(['#e2d4bb','#a73937','#283d4d','#448379'][i%4]));dummy.position.y+=.45;dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);}
 for(const crowd of [bodies,heads]){crowd.computeBoundingSphere();parent.add(crowd);}
}
function viewingBridges(scene,track,frame,groundHeight){
 const shellMaterial=material('#d0d2cd',{roughness:.42,metalness:.3}),rimMaterial=material('#aeb6b6',{roughness:.25,metalness:.68}),bannerMaterial=bridgeBanner();
 for(const way of ['1371942059','1371942060']){
  const record=data.features.find(f=>f.way===way),b=bounds(track,record,frame),centerR=(b.r0+b.r1)/2,centerS=(b.s0+b.s1)/2,width=b.r1-b.r0,depth=b.s1-b.s0,base=sample(track,centerS).y,g=frameGroup(scene,frame,base),cy=29.75;
  g.name='Shanghai enclosed viewing bridge';g.userData.reference={way,s:centerS,width,clearance:24.5};
  const left=b.r0,right=b.r1,shape=new THREE.Shape();shape.moveTo(left,cy);shape.bezierCurveTo(left,cy+7,right,cy+7,right,cy);shape.bezierCurveTo(right,cy-7,left,cy-7,left,cy);shape.closePath();
  const windows=[centerR-width*.39,centerR+width*.39];for(const x of windows)shape.holes.push(roundedPath(x,cy,17,3.4,1.6));
  const shell=add(g,new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.15,bevelThickness:.15}),shellMaterial,0,0,b.s0);
  shell.userData.overheadArchitecture=true;
  for(const face of [-1,1]){
   const z=face<0?b.s0-.18:b.s1+.18,outline=shape.getPoints(100).map(p=>new THREE.Vector3(p.x,p.y,z));add(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outline,true),150,.18,5,true),rimMaterial);
   const banner=add(g,new THREE.PlaneGeometry(width*.63,7.6),bannerMaterial,centerR,cy,z+face*.03);if(face<0)banner.rotation.y=Math.PI;
   const seams=[];
   for(let i=1;i<35;i++){const t=i/35,x=left+(right-left)*(3*t*t-2*t*t*t),dy=21*t*(1-t);if(windows.some(w=>Math.abs(x-w)<9))continue;seams.push(x,cy-dy+.2,z,x,cy+dy-.2,z);}
   const joints=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(seams,3)),new THREE.LineBasicMaterial({color:'#839094',transparent:true,opacity:.4}));g.add(joints);
   for(const x of windows){
    const floor=cy-1.5,insideZ=z-face*.65;scene.box(16,.15,2,'#4a555a',x,floor,insideZ,g);terrace(g,x,floor,insideZ-face*.3);
    for(const railY of [.12,.65,1.1])scene.box(16,.045,.045,'#afbfbd',x,floor+railY,insideZ+face*.3,g);
    for(let offset=-7;offset<=7;offset+=1.4)scene.box(.045,1.1,.045,'#afbfbd',x+offset,floor+.55,insideZ+face*.3,g);
   }
  }
  // Each bridge joins a glazed cylindrical pit-side support building.
  const towerId=way==='1371942059'?'1371943623':'1371943624',towerBounds=bounds(track,data.features.find(f=>f.way===towerId),frame),r=(towerBounds.r0+towerBounds.r1)/2,s=(towerBounds.s0+towerBounds.s1)/2,p=world(frame,r,s),floor=groundHeight(track,p.x,p.z),height=base+29.75-floor,radius=(towerBounds.r1-towerBounds.r0)/2;
  const tower=frameGroup(scene,frame,floor);tower.name='Shanghai curved glass support tower';
  add(tower,new THREE.CylinderGeometry(radius,radius,height,48),material('#41616c',{metalness:.48,roughness:.22}),r,height/2,s);
  for(let y=1;y<height;y+=2.6){const ring=add(tower,new THREE.TorusGeometry(radius+.04,.095,5,48),rimMaterial,r,y,s);ring.rotation.x=Math.PI/2;}
  for(let i=0;i<28;i++){const a=i*Math.PI*2/28;scene.box(.1,height,.1,'#a7b4b5',r+Math.cos(a)*(radius+.05),height/2,s+Math.sin(a)*(radius+.05),tower);}
  add(tower,new THREE.CylinderGeometry(radius+1,radius+1,.35,48),rimMaterial,r,height+.1,s);
 }
}
function mainGrandstand(scene,track,frame,flags,adapters){
 const record=data.features.find(f=>f.way==='1371942058'),b=bounds(track,record,frame),front=Math.max(b.r0+5,18),centerS=(b.s0+b.s1)/2,p=world(frame,front,centerS),floor=adapters.groundHeight(track,p.x,p.z),g=new THREE.Group();g.position.set(p.x,floor,p.z);g.rotation.y=frame.heading+Math.PI;scene.group.add(g);g.name='Shanghai main grandstand A';
 adapters.reserve({...p,heading:frame.heading},b.r1-front+3,(b.s1-b.s0)/2+5);
 const length=b.s1-b.s0-8;
 scene.box(47,2.4,length+7,'#b8bfbe',-23,1.2,0,g);
 for(let row=0;row<15;row++)scene.box(1.3,.25,length,'#c1c6c1',-row*1.2,2.7+row*.62,0,g);
 for(let row=0;row<19;row++)scene.box(1.4,.28,length,'#b7bfba',-20-row*1.38,16+row*.62,0,g);
 scene.box(.55,3,length,'#aeb8b8',-19.5,14,0,g);scene.box(.3,1.1,length,'#b7c4c5',.65,3.2,0,g);
 adapters.crowd(g,15,110,0,3.14,length-4,1.2,.62,flags);adapters.crowd(g,19,110,-20,16.44,length-4,1.38,.62,flags);
 // The long roof and its underside now use the mapped main-stand footprint.
 const roof=frameGroup(scene,frame,floor),positions=[],uv=[],indices=[],steps=40;
 for(let i=0;i<=steps;i++)for(const [r,y,u] of [[b.r0,29.75,0],[b.r1,35,1]]){positions.push(r,y,b.s0+(b.s1-b.s0)*i/steps);uv.push(u,i);if(i<steps&&u===0){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();add(roof,geometry,material('#667178',{side:THREE.DoubleSide,metalness:.25,roughness:.65}));
 for(let s=b.s0+10;s<b.s1;s+=21){scene.box(.6,34,.6,'#aab4b3',b.r1-1,17,s,roof);const a=new THREE.Vector3(b.r0,29.6,s),end=new THREE.Vector3(b.r1,34.8,s),v=end.clone().sub(a),beam=scene.box(.2,v.length(),.2,'#b6c0c1',...a.add(end).multiplyScalar(.5).toArray(),roof);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());}
}
function pitBuilding(scene,track,frame,groundHeight){
 const b=bounds(track,data.features.find(f=>f.way==='156328694'),frame),r=(b.r0+b.r1)/2,s=(b.s0+b.s1)/2,p=world(frame,r,s),floor=groundHeight(track,p.x,p.z),g=frameGroup(scene,frame,floor),width=b.r1-b.r0,length=b.s1-b.s0;
 scene.box(width,9,length,'#bac4c6',r,4.5,s,g);scene.box(width+1,4,length+1,'#416575',r,11,s,g);scene.box(width+4,.45,length+5,'#bdc7c8',r,13.3,s,g);
 for(let z=b.s0+8;z<b.s1-5;z+=15){scene.box(.13,3.8,11,'#465b66',b.r1+.08,2.1,z,g);scene.box(.14,.3,11,'#c92f37',b.r1+.15,4.3,z,g);}
 for(let y=9.5;y<=13;y+=1.2)scene.box(.12,.06,length,'#c3cfce',b.r1+.58,y,s,g);
}
function umbrellaProfile(radius,height){const points=[[.75,0],[radius*.15,height*.27],[radius*.38,height*.61],[radius*.68,height*.85],[radius,height],[radius+.12,height-.08]].map(([r,y])=>new THREE.Vector2(r,y));return new THREE.LatheGeometry(points,48);}
function sideGrandstands(scene,track,flags,adapters){
 const frame=sample(track,track.length*.75),canopyMaterial=material('#d8d1b7',{side:THREE.DoubleSide,roughness:.86}),ribMaterial=material('#999d92',{roughness:.62,metalness:.12}),rimMaterial=material('#bdc5bc',{roughness:.34,metalness:.45});
 for(const way of ['1372223261','1372223262']){
  const record=data.features.find(f=>f.way===way),b=bounds(track,record,frame),side=(b.r0+b.r1)>0?1:-1,front=side>0?Math.max(b.r0+8,18):b.r1-2,centerS=(b.s0+b.s1)/2,p=world(frame,front,centerS),floor=adapters.groundHeight(track,p.x,p.z),g=new THREE.Group();g.position.set(p.x,floor,p.z);g.rotation.y=frame.heading+(side>0?Math.PI:0);scene.group.add(g);g.name='Shanghai umbrella grandstand '+record.tags['name:en'];
  const length=b.s1-b.s0-8,depth=Math.min(34,b.r1-b.r0-5);adapters.reserve({...p,heading:frame.heading},depth+5,length/2+10);
  const rows=18,step=depth/rows;for(let row=0;row<rows;row++)scene.box(step,.26,length,row%4?'#b6bcb4':'#bca98b',-row*step,2.5+row*.59,0,g);
  adapters.crowd(g,rows,82,0,2.94,length-4,step,.59,flags);
  const label=trackSign(record.tags['name:en'].toUpperCase(),36,1,'#dccd29','#c9342c');label.position.set(.8,1.2,0);label.rotation.y=Math.PI/2;g.add(label);
 }
 for(const record of data.canopies){
  const points=record.points.slice(0,-1).map(p=>local(track,p)),x=points.reduce((s,p)=>s+p.x,0)/points.length,z=points.reduce((s,p)=>s+p.z,0)/points.length,radius=Math.max(...points.map(p=>Math.hypot(p.x-x,p.z-z))),rimHeight=Number(record.tags.height)||23.5,hubHeight=rimHeight-5.4,ground=adapters.groundHeight(track,x,z),g=new THREE.Group();g.position.set(x,ground,z);scene.group.add(g);g.name='Shanghai cream lotus canopy';g.userData.reference={way:record.way,radius,rimHeight};
  add(g,new THREE.CylinderGeometry(.58,.85,hubHeight-.2,12),material('#c9cebd'),0,(hubHeight-.2)/2,0);add(g,umbrellaProfile(radius,5.4),canopyMaterial,0,hubHeight,0);
  const rim=add(g,new THREE.TorusGeometry(radius,.15,5,64),rimMaterial,0,rimHeight,0);rim.rotation.x=Math.PI/2;const hub=add(g,new THREE.TorusGeometry(.85,.13,5,24),rimMaterial,0,hubHeight+.04,0);hub.rotation.x=Math.PI/2;
  for(let rib=0;rib<32;rib++){
   const angle=rib*Math.PI*2/32,points=[];for(const [r,y] of [[.85,.05],[radius*.15,1.45],[radius*.38,3.29],[radius*.68,4.59],[radius,5.36]])points.push(new THREE.Vector3(Math.cos(angle)*r,hubHeight+y,Math.sin(angle)*r));
   add(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),10,.035,4,false),ribMaterial);
  }
  for(const angle of [.1,.17,.24]){const r=radius*.98;const light=add(g,new THREE.SphereGeometry(.19,8,6),material('#46545a'),Math.cos(angle)*r,rimHeight+.32,Math.sin(angle)*r);light.scale.set(1,.8,1.3);}
 }
}
export function addShanghaiArchitecture(scene,track,flags,adapters){
 const frame=sample(track,0);mainGrandstand(scene,track,frame,flags,adapters);pitBuilding(scene,track,frame,adapters.groundHeight);viewingBridges(scene,track,frame,adapters.groundHeight);sideGrandstands(scene,track,flags,adapters);
}
