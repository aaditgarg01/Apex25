import * as THREE from '/vendor/three.module.js';
import {Reflector} from '/vendor/Reflector.js';
import {ALBERT_LAKE} from './data/albert-park-lake.js';
import {addVegetation} from './vegetation.js';
import {addFacadePanels,trackSign} from './track-furniture.js';
import {buildingFacade} from './campus-buildings.js';
import {sample,terrainHeight,angleDiff} from '/shared/tracks.mjs';
import {roadClearance,safeBoxSite} from '/shared/venues.mjs';
import {terrainVertexHeight} from '/shared/surface.mjs';

const cache=new WeakMap(),steel='#56646b',canvasWhite='#e9e6db';
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
function local(track,[lon,lat]){return {x:(lon-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(lat-track.origin.lat)*111320};}
function contains(points,x,z){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;}return inside;}
function distanceTo(points,x,z){let d=Infinity;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));d=Math.min(d,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));}return d;}
function park(track){
 if(cache.has(track))return cache.get(track);
 const outer=ALBERT_LAKE.outer[0].map(p=>local(track,p)),islands=ALBERT_LAKE.islands.map(r=>r.map(p=>local(track,p))),level=Math.min(...track.points.map(p=>p.y))-.55;
 const p={outer,islands,level,flat:track.points.reduce((s,p)=>s+p.groundY,0)/track.points.length-.9};cache.set(track,p);return p;
}
function isWater(track,x,z){const p=park(track);return contains(p.outer,x,z)&&!p.islands.some(r=>contains(r,x,z));}
export function albertTerrainHeight(track,x,z,cell){
 const p=park(track);if(isWater(track,x,z))return p.level-.65;
 const distance=Math.min(distanceTo(p.outer,x,z),...p.islands.map(r=>distanceTo(r,x,z)));
 // Low shoreline banks and broad level lawns; preserve the existing road heights.
 const existing=terrainVertexHeight(track,x,z,cell),roadDistance=roadClearance(track,x,z);
 if(roadDistance<24)return existing;
 const flatBlend=Math.max(0,Math.min(1,(roadDistance-24)/75)),lawn=existing+(p.flat-existing)*flatBlend;
 if(distance<50){const bank=Math.min(lawn,p.level+.08+distance*.045),t=Math.max(0,Math.min(1,(distance-12)/38)),blend=t*t*(3-2*t);return bank+(lawn-bank)*blend;}
 return lawn;
}
function mesh(group,geometry,mat,x=0,y=0,z=0){const o=new THREE.Mesh(geometry,mat);o.position.set(x,y,z);o.receiveShadow=true;o.castShadow=true;o.userData.mappedStatic=true;group.add(o);return o;}
function lake(scene,track){
 const p=park(track),shape=new THREE.Shape();p.outer.forEach((v,i)=>i?shape.lineTo(v.x,-v.z):shape.moveTo(v.x,-v.z));shape.closePath();
 for(const ring of p.islands){const hole=new THREE.Path();ring.forEach((v,i)=>i?hole.lineTo(v.x,-v.z):hole.moveTo(v.x,-v.z));hole.closePath();shape.holes.push(hole);}
 const shader={...Reflector.ReflectorShader,uniforms:{...Reflector.ReflectorShader.uniforms,time:{value:0},wetness:{value:0}},vertexShader:Reflector.ReflectorShader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec3 waterPosition;').replace('vUv = textureMatrix','waterPosition = (modelMatrix * vec4(position,1.0)).xyz;\n vUv = textureMatrix'),fragmentShader:`
  uniform sampler2D tDiffuse; uniform vec3 color; uniform float time; uniform float wetness;
  varying vec4 vUv; varying vec3 waterPosition;
  #include <logdepthbuf_pars_fragment>
  void main(){
   #include <logdepthbuf_fragment>
   vec2 waves=vec2(sin(waterPosition.x*.27+waterPosition.z*.13+time*.6),cos(waterPosition.z*.32-waterPosition.x*.09+time*.42));
   vec4 projected=vUv; projected.xy+=waves*(.0007+wetness*.0006)*vUv.w;
   vec3 reflection=texture2DProj(tDiffuse,projected).rgb;
   float fresnel=pow(1.0-abs(normalize(cameraPosition-waterPosition).y),3.0);
   vec3 deep=vec3(.027,.063,.085);vec3 tint=mix(deep,reflection,.32+fresnel*.62);
   tint+=vec3(.004,.007,.009)*(waves.x+waves.y);
   gl_FragColor=vec4(tint,1.0);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`};
 const water=new Reflector(new THREE.ShapeGeometry(shape),{textureWidth:512,textureHeight:512,multisample:0,clipBias:.003,shader});water.name='Albert Park Lake — mapped shoreline';water.rotation.x=-Math.PI/2;water.position.y=p.level;scene.group.add(water);
 const renderReflection=water.onBeforeRender;let refreshed=-Infinity;
 water.onBeforeRender=function(renderer,world,camera){const now=performance.now(),interval=scene.slowFrames>25||renderer.getPixelRatio()<1?350:140;if(now-refreshed<interval)return;refreshed=now;renderReflection.call(this,renderer,world,camera);};
 return water;
}
function woodland(scene,track){
 const trees=[],palms=[];let seed=1979;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const add=(x,z,palm=false)=>{if(isWater(track,x,z)||roadClearance(track,x,z)<(palm?15:18))return;if(scene.group.userData.albertReservations.some(({p,halfWidth,halfLength})=>{const dx=x-p.x,dz=z-p.z;return Math.abs(dx*Math.cos(p.heading)-dz*Math.sin(p.heading))<halfWidth+6&&Math.abs(dx*Math.sin(p.heading)+dz*Math.cos(p.heading))<halfLength+6;}))return;const y=albertTerrainHeight(track,x,z,12);const site={x,z,y,scale:palm?1.05+random()*.55:1.2+random()*.65,angle:random()*Math.PI*2};(palm?palms:trees).push(site);};
 // Dense, irregular park avenues: broadleaf trees dominate, with scattered palms.
 for(let s=0;s<track.length;s+=15)for(const side of [-1,1])for(let row=0;row<4;row++){
  const p=sample(track,s+random()*9,side*(track.width/2+22+row*19+random()*12));add(p.x,p.z,row===0&&Math.floor(s/15)%6===0);
 }
 const minX=Math.min(...track.points.map(p=>p.x))-150,maxX=Math.max(...track.points.map(p=>p.x))+150,minZ=Math.min(...track.points.map(p=>p.z))-150,maxZ=Math.max(...track.points.map(p=>p.z))+150;
 for(let i=0;i<900;i++)add(minX+random()*(maxX-minX),minZ+random()*(maxZ-minZ),i%19===0);
 addVegetation(scene,track,scene.profile,{sites:trees,palms:false});addVegetation(scene,track,scene.profile,{sites:palms,palms:true});
 scene.group.userData.albertTrees={broadleaf:trees.length,palms:palms.length};
}
function skyline(scene,track){
 const facade=buildingFacade('urban');facade.roughness=.24;facade.metalness=.46;
 // A northward CBD silhouette, rather than city towers ringing the circuit.
 const anchors=[[144.9647,-37.8218,285,31,35,'gold'],[144.9645,-37.8232,312,34,31,'star'],[144.9575,-37.8197,245,40,34,'twin'],[144.9668,-37.8115,220,34,33,'spire']];
 for(let i=0;i<35;i++){
  const anchor=anchors[i%anchors.length],p=local(track,[anchor[0]+(i<4?0:Math.sin(i*3.17)*.009),anchor[1]+(i<4?0:Math.cos(i*4.13)*.006)]),h=i<4?anchor[2]:65+Math.abs(Math.sin(i*1.47))*155,w=i<4?anchor[3]:22+(i%5)*6,d=i<4?anchor[4]:29+(i%4)*5;
  const g=new THREE.Group();g.position.set(p.x,park(track).flat,p.z);scene.group.add(g);scene.box(w,h,d,['#617d89','#728d98','#80979d'][i%3],0,h/2,0,g);addFacadePanels(g,w,h,d,facade);
  scene.box(w*1.07,.8,d*1.06,'#bdc6c4',0,h*.36,0,g);scene.box(w*1.07,.8,d*1.06,'#bdc6c4',0,h*.72,0,g);
  if(i===0){scene.box(w+1,13,d+1,'#c7a357',0,h-6.5,0,g);scene.box(w*.55,21,d*.65,'#c7a357',w*.18,h+10.5,0,g);}
  if(i===1){scene.box(w+20,4,d+16,'#c6a06a',0,h*.69,0,g);const star=mesh(g,new THREE.OctahedronGeometry(21),material('#caa86b',{metalness:.5,roughness:.25}),0,h*.69,0);star.scale.set(1,.35,1);}
  if(i===2){scene.box(w*.44,h*.8,d*.6,'#65858e',w*.75,h*.4,0,g);}
  if(i===3)scene.box(.65,37,.65,'#ccd4d2',0,h+18,0,g);
 }
}
function beam(scene,group,a,b,width=.09){const d=b.clone().sub(a),o=scene.box(width,d.length(),width,steel,...a.clone().add(b).multiplyScalar(.5).toArray(),group);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
function grandstands(scene,track,flags){
 const sites=[[.975,-1,'FANGIO'],[.075,-1,'JONES'],[.085,1,'BRABHAM'],[.215,-1,'HILL'],[.44,-1,'LAKESIDE'],[.79,-1,'WEBBER']];
 for(const [at,side,name] of sites){
  const p=safeBoxSite(track,at*track.length,18,54,side,12),g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=p.heading+(side>0?Math.PI:0);scene.group.add(g);scene.group.userData.albertReservations.push({p,halfWidth:19,halfLength:56});
  for(let row=0;row<14;row++)scene.box(1.25,.22,100,'#929f9f',-row*1.16,1.3+row*.64,0,g);
  for(let z=-48;z<=48;z+=8){for(const x of [0,-7,-15])scene.box(.12,x===0?1.2:x===-7?5.1:9.7,.12,steel,x,(x===0?1.2:x===-7?5.1:9.7)/2,z,g);beam(scene,g,new THREE.Vector3(0,1.15,z),new THREE.Vector3(-15,9.5,z),.13);beam(scene,g,new THREE.Vector3(-15,.1,z),new THREE.Vector3(0,1.2,z));beam(scene,g,new THREE.Vector3(-15,9.5,z),new THREE.Vector3(-7,.1,z));}
  scene.box(18,.24,103,canvasWhite,-7.5,11.8,0,g);for(const z of [-49,0,49])scene.box(.16,11.8,.16,steel,-15,5.9,z,g);
  const sign=trackSign(name+'  •  MELBOURNE',68,1.15,'#183f37','#e8dbb5');sign.position.set(1.1,1.1,0);sign.rotation.y=Math.PI/2;g.add(sign);
  const count=14*63,dummy=new THREE.Object3D(),bodies=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.18,.29,2,5),material('#ffffff'),count),heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.115,7,5),material('#ffffff'),count);
  for(let i=0;i<count;i++){const r=Math.floor(i/63),x=-r*1.16,z=-48+(i%63)*1.55;dummy.position.set(x,1.73+r*.64,z);dummy.scale.set(1,1,.9);dummy.rotation.set(0,0,Math.sin(i)*.06);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);bodies.setColorAt(i,new THREE.Color(['#d44736','#f0c835','#2366a2','#ececdb','#398875','#243444','#c778a3'][i%7]));dummy.position.y+=.43;dummy.scale.setScalar(1);dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);heads.setColorAt(i,new THREE.Color(['#d2ae8b','#9f795b','#dcbc9a'][i%3]));}
  bodies.computeBoundingSphere();heads.computeBoundingSphere();g.add(bodies,heads);
  for(let i=0;i<9;i++){
   const x=-2-(i%3)*5,z=-40+i*10,y=3+(i%3)*2.7;scene.box(.035,2,.035,'#b9c2c1',x,y,z,g);
   const flagMaterial=new THREE.MeshStandardMaterial({color:['#c72c36','#eb963f','#158d83','#e6dcca'][i%4],side:THREE.DoubleSide,roughness:.8}),uniform={value:0};
   flagMaterial.onBeforeCompile=shader=>{shader.uniforms.flagTime=uniform;shader.vertexShader='uniform float flagTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.z += sin(position.x*5.0+flagTime*2.8)*.14*(position.x+.75);');};
   const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.85,8,2),flagMaterial);flag.position.set(x+.75,y+.6,z);g.add(flag);flags.push(uniform);
  }
 }
}
function branding(scene,track){
 const brands=[['ROLEX','#064e39','#d8ba66'],['PIRELLI','#e5c82f','#c52c28'],['MSC CRUISES','#132e55','#f4f2ea']],materials=brands.map(([name,c,ink])=>trackSign(name,7,.68,c,ink).material);
 for(let s=18,index=0;s<track.length;s+=12,index++)for(const side of [-1,1]){
  const p=sample(track,s,side*(track.width/2+6.45)),sign=new THREE.Mesh(new THREE.PlaneGeometry(7,.68),materials[Math.floor(index/15)%3]);sign.position.set(p.x,p.y+.55,p.z);sign.rotation.y=p.heading+(side===1?-Math.PI/2:Math.PI/2);sign.userData.mappedStatic=true;scene.group.add(sign);
 }
 for(const [at,index] of [[.025,0],[.42,1],[.71,2]]){
  let s=at*track.length;
  for(let d=0;d<180;d+=12){const p=sample(track,s+d-18),q=sample(track,s+d+18);if(Math.abs(angleDiff(q.heading,p.heading))<.045){s+=d;break;}}
  const p=sample(track,s),g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=p.heading;scene.group.add(g);const width=track.width+19;
  for(const x of [-width/2,width/2]){scene.box(.6,9.5,.6,steel,x,4.75,0,g);scene.box(.6,9.5,.6,steel,x,4.75,2,g);for(let y=0;y<9;y+=1.5)beam(scene,g,new THREE.Vector3(x,y,0),new THREE.Vector3(x,y+1.5,2),.12);}
  for(const z of [0,2])for(const y of [8.1,9.5])scene.box(width,.14,.14,steel,0,y,z,g);
  for(let x=-width/2;x<width/2;x+=3)beam(scene,g,new THREE.Vector3(x,8.1,0),new THREE.Vector3(Math.min(x+3,width/2),9.5,0),.13);
  const [name,c,ink]=brands[index],sign=trackSign(name,width-1,1.35,c,ink);sign.position.set(0,8.8,-.09);sign.rotation.y=Math.PI;g.add(sign);const back=sign.clone();back.rotation.y=0;back.position.z=2.09;g.add(back);
 }
}
function tentsAndCameras(scene,track){
 for(let i=0;i<12;i++){
  const p=safeBoxSite(track,(i+.3)/12*track.length,i%3?10:25,10,i%2?1:-1,35),g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=p.heading;scene.group.add(g);scene.group.userData.albertReservations.push({p,halfWidth:i%3?11:26,halfLength:12});
  scene.box(13,.18,16,'#9caaa8',0,.09,0,g);scene.box(12,2.3,15,'#deded3',0,1.3,0,g);
  const roof=mesh(g,new THREE.ConeGeometry(10.5,3.8,4),material(canvasWhite),0,4.3,0);roof.rotation.y=Math.PI/4;roof.scale.z=1.15;
  for(const x of [-5.8,5.8])for(const z of [-7.2,7.2])scene.box(.09,4,.09,'#aeb8b6',x,2,z,g);
  for(const z of [-5,0,5])scene.box(.08,1.7,2.6,'#58737d',-6.06,1.5,z,g);
  if(i%3)continue;
  const camera=new THREE.Group();camera.position.set(16,0,0);camera.rotation.y=i%2?Math.PI:0;g.add(camera);scene.box(4,.8,3,'#4d5b61',0,.5,0,camera);scene.box(.7,11,.7,'#77868b',0,6,0,camera);
  beam(scene,camera,new THREE.Vector3(-5,9,0),new THREE.Vector3(7,14,0),.24);scene.box(2,.8,1.1,'#3b474d',-5,9,0,camera);scene.box(.8,.5,.5,'#26323b',7,14,0,camera);const lens=mesh(camera,new THREE.CylinderGeometry(.17,.17,.45,10),material('#15212a'),7.45,14,0);lens.rotation.z=Math.PI/2;
 }
}
function marshalPanels(scene,track){
 const panels=[];
 for(let i=0;i<12;i++){
  const s=track.length*(i+.2)/12,p=sample(track,s,track.width/2+9.2),g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=p.heading;scene.group.add(g);
  scene.box(.09,3.3,.09,steel,0,1.65,0,g);scene.box(1.32,.95,.14,'#263136',0,3,0,g);
  const ledMaterial=new THREE.MeshBasicMaterial({color:'#27d686',toneMapped:false}),panel=new THREE.Mesh(new THREE.PlaneGeometry(1.13,.75),ledMaterial);panel.rotation.y=Math.PI;panel.position.set(0,3,-.08);g.add(panel);panels.push({s,material:ledMaterial});
  // Marshals stand behind the catch fence, never on the racing surface.
  for(let j=0;j<2;j++){
   const x=1.9+j*.65;scene.box(.34,.62,.24,'#ed862e',x,1.01,0,g);for(const leg of [-.1,.1])scene.box(.13,.64,.14,'#d97526',x+leg,.39,0,g);
   mesh(g,new THREE.SphereGeometry(.12,8,6),material('#d6b391'),x,1.47,0);mesh(g,new THREE.SphereGeometry(.14,8,6,0,Math.PI*2,0,Math.PI/2),material('#efede4'),x,1.49,0);
  }
 }
 return panels;
}
function coveredTyres(scene,track){
 const centres=[];
 for(const [at,side] of [[.08,-1],[.21,1],[.78,-1],[.95,1]]){
  const p=safeBoxSite(track,at*track.length,2.2,7,side,10),g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=p.heading;scene.group.add(g);
  for(let row=0;row<4;row++)for(let along=0;along<17;along++)for(let tier=0;tier<4;tier++)centres.push({group:g,x:(row-1.5)*.74,y:.12+tier*.21,z:(along-8)*.73});
  for(const x of [-1.58,1.58])for(let z=-6;z<6;z+=2)scene.box(.08,.89,2,z%4?'#d9e1df':'#265788',x,.46,z,g);
  scene.box(3.2,.06,13,'#44749d',0,.94,0,g);
 }
 scene.group.updateMatrixWorld(true);const tyres=new THREE.InstancedMesh(new THREE.TorusGeometry(.27,.10,6,16),material('#20292e'),centres.length),dummy=new THREE.Object3D(),inverse=scene.group.matrixWorld.clone().invert();
 centres.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(Math.PI/2,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();tyres.setMatrixAt(i,inverse.clone().multiply(p.group.matrixWorld).multiply(dummy.matrix));});tyres.receiveShadow=true;tyres.computeBoundingSphere();scene.group.add(tyres);
}
export function addAlbertPark(scene,track){
 scene.group.userData.albertReservations=[];const water=lake(scene,track),flags=[];skyline(scene,track);grandstands(scene,track,flags);branding(scene,track);tentsAndCameras(scene,track);const panels=marshalPanels(scene,track);coveredTyres(scene,track);woodland(scene,track);
 scene.environmentFx={frame(time,cars){water.material.uniforms.time.value=time*.001;for(const f of flags)f.value=time*.001;for(const panel of panels){const yellow=cars.some(c=>!c.finished&&!c.retired&&(c.offtrack||c.sliding)&&Math.min(Math.abs(c.s-panel.s),track.length-Math.abs(c.s-panel.s))<160);panel.material.color.set(yellow?(Math.floor(time/400)%2?'#edc529':'#554a0d'):'#20bf75');}},setConditions(wetness){water.material.uniforms.wetness.value=wetness;},dispose(){water.dispose();}};
 const credit=document.getElementById('map-credit');if(credit)credit.hidden=false;
 return scene.profile;
}
