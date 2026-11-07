import * as THREE from '/vendor/three.module.js';
import {Reflector} from '/vendor/Reflector.js';
import {SINGAPORE_CITY} from './data/singapore-city.js';
import {singaporeLocal, singaporePolygonsOverlap, singaporeRoadClear, singaporeRoads} from '/shared/singapore.mjs';
import {planSingapore} from './singapore-placement.js';
import {addSingaporeEvent} from './singapore-event.js';
import {SINGAPORE_ARCHITECTURE} from './data/singapore-architecture.js';

const cache=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.78,...extra}),basic=(color,extra={})=>new THREE.MeshBasicMaterial({color,toneMapped:false,...extra});
function contains(ring,x,z){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function inRings(rings,x,z){return rings.some(r=>contains(r.outer,x,z)&&!r.holes.some(h=>contains(h,x,z)));}
function shape(r){const s=new THREE.Shape();r.outer.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();for(const h of r.holes){const p=new THREE.Path();h.forEach(([x,z],i)=>i?p.lineTo(x,-z):p.moveTo(x,-z));p.closePath();s.holes.push(p);}return s;}
function layout(track){
 if(cache.has(track))return cache.get(track);
 const heights=track.points.filter((_,i)=>i%5===0),level=Math.min(...track.points.map(p=>p.y))-1.25;
 const data={heights,level};
 cache.set(track,data);
 return data;
}
function waterAt(x,z){return inRings(SINGAPORE_CITY.water,x,z);}
export function singaporeTerrainHeight(track,x,z,cell=0){
 const data=layout(track);if(waterAt(x,z))return data.level-1.1;
 let q=data.heights[0],distance=Infinity,floor=Infinity;for(const p of data.heights){const d=Math.hypot(x-p.x,z-p.z);if(d<distance){distance=d;q=p;}if(d<track.width/2+Math.SQRT2*cell+12)floor=Math.min(floor,p.y-.85);}
 // Flat public plazas/bayfront, blended beneath the existing driving elevations.
 const blend=smooth((distance-30)/95),y=(q.groundY-.85)*(1-blend)+(data.level+.75)*blend;
 return Number.isFinite(floor)?Math.min(y,floor):y;
}
function mesh(parent,geometry,mat,x=0,y=0,z=0,staticGeometry=true){const o=new THREE.Mesh(geometry,mat);o.position.set(x,y,z);o.castShadow=staticGeometry;o.receiveShadow=true;o.userData.mappedStatic=staticGeometry;parent.add(o);return o;}
function group(scene,p,heading=0){const g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=heading;scene.group.add(g);return g;}
function beam(scene,parent,a,b,color='#87969c',width=.12){const d=b.clone().sub(a),p=a.clone().add(b).multiplyScalar(.5),o=scene.box(width,d.length(),width,color,p.x,p.y,p.z,parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
function texture(draw,width=256,height=width){const c=document.createElement('canvas');c.width=width;c.height=height;draw(c.getContext('2d'),width,height);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=8;return map;}
function surface(source,index){const g=new THREE.BufferGeometry();for(const [name,a] of Object.entries(source.attributes)){const data=[];for(const part of source.groups.filter(p=>p.materialIndex===index))for(let j=part.start*a.itemSize;j<(part.start+part.count)*a.itemSize;j++)data.push(a.array[j]);g.setAttribute(name,new THREE.Float32BufferAttribute(data,a.itemSize));}return g;}
function extrude(parent,rings,height,y,wall,roof=wall,repeat=3.6){for(const r of rings){const source=new THREE.ExtrudeGeometry(shape(r),{depth:height,bevelEnabled:false}),uv=source.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/repeat,uv.getY(i)/repeat);for(const [index,mat] of [[0,roof],[1,wall]]){const m=mesh(parent,surface(source,index),mat,0,y,0);m.rotation.x=-Math.PI/2;}source.dispose();}}
function officeFacade(seed=0,colonial=false){
 const windows=texture((c,w,h)=>{c.fillStyle=colonial?'#b6a17d':'#0c1726';c.fillRect(0,0,w,h);let value=2147+seed*103;const random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
  for(let y=0;y<h;y+=32)for(let x=0;x<w;x+=32){const on=random()>.28;c.fillStyle=on?['#dac586','#bbd7de','#ecdcb5','#6694a7'][Math.floor(random()*4)]:'#142330';c.fillRect(x+5,y+5,colonial?21:23,22);if(colonial){c.fillStyle='#d0c3a8';c.fillRect(x+2,y+1,27,4);c.fillRect(x+2,y+29,27,2);}else{c.fillStyle='#4c5e67';c.fillRect(x+16,y+5,1,22);c.fillRect(x+4,y+25,24,1);}}
 },256);
 const glow=texture((c,w,h)=>{c.fillStyle='#000000';c.fillRect(0,0,w,h);const original=windows.image.getContext('2d').getImageData(0,0,w,h),image=c.createImageData(w,h);for(let i=0;i<image.data.length;i+=4){const px=(i/4)%w,py=Math.floor(i/(w*4)),lit=px%32>=5&&px%32<=27&&py%32>=5&&py%32<=27&&original.data[i]+original.data[i+1]+original.data[i+2]>260;image.data[i]=lit?original.data[i]:0;image.data[i+1]=lit?original.data[i+1]:0;image.data[i+2]=lit?original.data[i+2]:0;image.data[i+3]=255;}c.putImageData(image,0,0);});
 return material(colonial?'#d4c6aa':'#526b80',{map:windows,emissive:'#ffffff',emissiveMap:glow,emissiveIntensity:colonial?.62:.8,roughness:colonial?.72:.25,metalness:colonial?.05:.6});
}
function city(scene,plan){
 const faces=Array.from({length:3},(_,i)=>officeFacade(i)),stone=officeFacade(11,true),roof=material('#28323a');
 for(let i=0;i<plan.city.length;i++){const f=plan.city[i];if(['sands','skypark','flyerbase'].includes(f.kind))continue;if(f.kind==='court')f.height=25;if(f.kind==='fullerton')f.height=25;if(f.kind==='flyermall')f.height=9;if(f.kind==='esplanade')f.height=8;
  extrude(scene.group,f.rings,f.height,f.y,['court','fullerton','cityhall'].includes(f.kind)?stone:faces[i%faces.length],roof,['court','fullerton','cityhall'].includes(f.kind)?24:28.8);
  if(f.height>65){const m=mesh(scene.group,new THREE.BoxGeometry(1.4,.35,1.4),basic(i%4?'#67a9dc':'#ff6666'),f.x,f.y+f.height+1,f.z);m.castShadow=false;}
 }
 const court=plan.city.find(f=>f.kind==='court'),fullerton=plan.city.find(f=>f.kind==='fullerton'),cityhall=plan.city.find(f=>f.kind==='cityhall');
 if(court){const copper=material('#5c8275',{metalness:.4,roughness:.5,emissive:'#629683',emissiveIntensity:.25});mesh(scene.group,new THREE.CylinderGeometry(7.5,8.6,4.4,28),material('#cabd9f'),court.x,court.y+27,court.z);const dome=mesh(scene.group,new THREE.SphereGeometry(8.3,32,16,0,Math.PI*2,0,Math.PI/2),copper,court.x,court.y+29.1,court.z);dome.scale.y=.85;mesh(scene.group,new THREE.CylinderGeometry(.5,.8,3.3,12),copper,court.x,court.y+37.4,court.z);}
 for(const f of [fullerton,cityhall].filter(Boolean))for(const r of f.rings)for(let j=0;j<r.outer.length-1;j++){const a=r.outer[j],b=r.outer[j+1],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<14)continue;const h=Math.atan2(-dz,dx),mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;let nx=dz/length,nz=-dx/length;if(!inRings(f.rings,mx+nx,mz+nz)){nx=-nx;nz=-nz;}
  for(let d=2;d<length-2;d+=4.5){const x=a[0]+dx*d/length+nx*.55,z=a[1]+dz*d/length+nz*.55;mesh(scene.group,new THREE.CylinderGeometry(.38,.5,9.2,10),material('#cfc1a4',{emissive:'#a87843',emissiveIntensity:.18}),x,f.y+14,z);}
  const trim=scene.box(length-.6,.5,.65,'#d9cfbb',mx+nx*.4,f.y+f.height-.1,mz+nz*.4);trim.rotation.y=h;
 }
}
function bay(scene,track){
 const data=layout(track),waters=[],shader={...Reflector.ReflectorShader,uniforms:{...Reflector.ReflectorShader.uniforms,time:{value:0},wetness:{value:0}},vertexShader:Reflector.ReflectorShader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec3 bayWorld;').replace('vUv = textureMatrix','bayWorld=(modelMatrix*vec4(position,1.0)).xyz;\n vUv = textureMatrix'),fragmentShader:`
 uniform sampler2D tDiffuse; uniform float time; uniform float wetness; varying vec4 vUv; varying vec3 bayWorld;
 #include <logdepthbuf_pars_fragment>
 void main(){
  #include <logdepthbuf_fragment>
  vec2 ripple=vec2(sin(bayWorld.x*.14+bayWorld.z*.11+time*.22),cos(bayWorld.z*.19-bayWorld.x*.09-time*.18));vec4 projected=vUv;projected.xy+=ripple*(.00019+wetness*.0004)*vUv.w;
  float fresnel=pow(1.0-abs(normalize(cameraPosition-bayWorld).y),3.0);vec3 reflected=texture2DProj(tDiffuse,projected).rgb;vec3 navy=vec3(.006,.016,.031);
  gl_FragColor=vec4(mix(navy,reflected,.55+fresnel*.34),1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`};
 for(const r of SINGAPORE_CITY.water){const water=new Reflector(new THREE.ShapeGeometry(shape(r)),{textureWidth:768,textureHeight:768,multisample:0,clipBias:.004,shader});water.rotation.x=-Math.PI/2;water.position.y=data.level;water.name='Marina Bay and Singapore River — mapped water';let last=-Infinity;const draw=water.onBeforeRender;water.onBeforeRender=function(renderer,world,camera){const now=performance.now();if(now-last<(scene.singaporeLightsEnabled===false?720:scene.slowFrames>25?450:180))return;last=now;draw.call(this,renderer,world,camera);};scene.group.add(water);waters.push(water);}
 return waters;
}
function landmarks(scene,track,plan){
 const data=layout(track),faces=officeFacade(42),metal=material('#82969d',{metalness:.7,roughness:.25}),deck=material('#aead99',{emissive:'#ba9f69',emissiveIntensity:.38}),sands=plan.city.filter(f=>f.kind==='sands');
 for(const f of sands){
  // The existing mapped base footprints taper towards the rooftop deck.
  for(let floor=0;floor<8;floor++){
   const factor=1-floor*.024;
   const scale=ring=>ring.map(([x,z])=>[f.x+(x-f.x)*factor,f.z+(z-f.z)*factor]);
   extrude(scene.group,f.rings.map(r=>({outer:scale(r.outer),holes:r.holes.map(scale)})),193/8,f.y+193/8*floor,faces,metal,28.8);
  }for(const r of f.rings){extrude(scene.group,[r],.65,f.y+193,metal);extrude(scene.group,[r],3.8,f.y+193.6,material('#9b9585',{emissive:'#d4bd84',emissiveIntensity:.3}));}}
 const skypark=plan.city.find(f=>f.kind==='skypark');if(skypark){const y=(sands[0]?.y??data.level+.7)+197.4;extrude(scene.group,skypark.rings,5.1,y,deck,material('#a59572',{emissive:'#b3985b',emissiveIntensity:.22}));
  const h=skypark.heading,g=group(scene,{x:skypark.x,y:y+5.18,z:skypark.z},h),points=skypark.rings.flatMap(r=>r.outer),u=points.map(([x,z])=>(x-skypark.x)*Math.cos(h)-(z-skypark.z)*Math.sin(h)),length=Math.max(...u)-Math.min(...u);
  // Long blue infinity pool and garden promenade on the boat-shaped skypark.
  scene.box(length*.66,.28,9.4,'#393e40',0,.02,-3,g);const pool=mesh(g,new THREE.PlaneGeometry(length*.65,8.6),basic('#1e8cba',{transparent:true,opacity:.86}),0,.19,-3);pool.rotation.x=-Math.PI/2;scene.box(length*.66,.06,.08,'#bde4df',0,.25,1.8,g);
  for(let x=-length*.40;x<=length*.35;x+=13){scene.box(2.2,.25,4.4,'#d1bd86',x,.18,8,g);mesh(g,new THREE.CylinderGeometry(.12,.22,5,8),material('#605c3c'),x,2.6,13);const leaves=mesh(g,new THREE.SphereGeometry(2.7,12,8),material('#294831',{emissive:'#258340',emissiveIntensity:.18}),x,5.1,13);leaves.scale.y=.38;}
 }
 for(const f of plan.city.filter(building=>building.kind==='esplanade')){
  const points=f.rings.flatMap(r=>r.outer),rx=(Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0])))*.46,rz=(Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1])))*.46;
  const glass=material('#2d4351',{metalness:.68,roughness:.3,emissive:'#a99258',emissiveIntensity:.2}),dome=mesh(scene.group,new THREE.SphereGeometry(1,36,18,0,Math.PI*2,0,Math.PI/2),glass,f.x,f.y+8,f.z);dome.scale.set(rx,25,rz);
  const count=14*36,dummy=new THREE.Object3D(),shades=new THREE.InstancedMesh(new THREE.ConeGeometry(1.1,1.4,3),material('#a4a899',{metalness:.5,roughness:.4}),count);let k=0;
  for(let row=0;row<14;row++)for(let col=0;col<36;col++){const a=col*Math.PI/18,theta=(row+.6)/14*Math.PI/2,x=rx*Math.sin(theta)*Math.cos(a),z=rz*Math.sin(theta)*Math.sin(a),y=25*Math.cos(theta);dummy.position.set(f.x+x,f.y+8+y,f.z+z);dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(x/(rx*rx),y/625,z/(rz*rz)).normalize());dummy.updateMatrix();shades.setMatrixAt(k++,dummy.matrix);}shades.castShadow=true;shades.computeBoundingSphere();scene.group.add(shades);
 }
 return plan.wheel || plan.sites.some(site=>site.kind==='flyer-foundation') ? flyer(scene,track) : null;
}
function flyer(scene,track){
 const f=SINGAPORE_CITY.flyer,[x,z]=f.center,y=singaporeTerrainHeight(track,x,z),g=group(scene,{x,y,z},f.heading),white=material('#b4cbd4',{metalness:.62,roughness:.3,emissive:'#7ba1c3',emissiveIntensity:.22}),led=basic('#a9e7ff'),rotor=new THREE.Group();rotor.position.y=90;g.add(rotor);
 for(const depth of [-5,5]){
  for(const u of [-42,42]){scene.box(9,1.4,9,'#737d80',u,.3,depth*2.4,g);beam(scene,g,new THREE.Vector3(u,.9,depth*2.4),new THREE.Vector3(0,90,depth),'#a8bec7',2.3);}
  const rim=mesh(rotor,new THREE.TorusGeometry(f.radius,.65,8,160),white,0,0,depth,false),glow=mesh(rotor,new THREE.TorusGeometry(f.radius+.05,.11,5,160),led,0,0,depth-.5,false);rim.castShadow=false;glow.castShadow=false;
 }
 mesh(g,new THREE.CylinderGeometry(3,3,13,20),white,0,90,0).rotation.x=Math.PI/2;
 const spokes=[];for(let i=0;i<56;i++){const a=i*Math.PI/28;for(const depth of [-5,5])spokes.push(0,0,depth,f.radius*Math.cos(a),f.radius*Math.sin(a),depth);}const lines=new THREE.BufferGeometry();lines.setAttribute('position',new THREE.Float32BufferAttribute(spokes,3));rotor.add(new THREE.LineSegments(lines,new THREE.LineBasicMaterial({color:'#8bb8cc',transparent:true,opacity:.65})));
 const glass=material('#4a8199',{metalness:.56,roughness:.2,emissive:'#c5b57c',emissiveIntensity:.7});
 const cabinGeometry=new THREE.CapsuleGeometry(2,3,3,8);
 cabinGeometry.rotateX(Math.PI/2);
 const cabins=new THREE.InstancedMesh(cabinGeometry,glass,28);
 const cabinLights=new THREE.InstancedMesh(new THREE.BoxGeometry(3.7,.18,4.9),led,28);
 const dummy=new THREE.Object3D();
 g.add(cabins,cabinLights);
 cabins.frustumCulled=false;
 cabinLights.frustumCulled=false;
 return {frame(time){
  const angle=time*.0032;
  rotor.rotation.z=angle;
  for(let i=0;i<28;i++){
   const phase=angle+i*Math.PI/14;
   dummy.position.set(Math.cos(phase)*f.radius,90+Math.sin(phase)*f.radius,0);
   dummy.updateMatrix();cabins.setMatrixAt(i,dummy.matrix);
   dummy.position.y+=1.72;dummy.updateMatrix();cabinLights.setMatrixAt(i,dummy.matrix);
  }
  cabins.instanceMatrix.needsUpdate=true;
  cabinLights.instanceMatrix.needsUpdate=true;
 }};
}

function civicLandmarks(scene,track,plan){
 const limestone=material('#bcab91'),stone=material('#a49c8e'),gold=material('#e5c687',{emissive:'#c18d50',emissiveIntensity:.5});
 const shell=material('#d1d9d5',{roughness:.43,emissive:'#739fb8',emissiveIntensity:.28});
 for(const site of plan.sites){
  if(!['museum','club','civilian','cenotaph','lim'].includes(site.kind))continue;
  const item=group(scene,site,site.heading);
  item.userData.pitKeep=true;
  item.userData.singaporeSite=site.id;
  const w=site.w,d=site.d;
  if(site.kind==='museum'){
   mesh(item,new THREE.CylinderGeometry(Math.min(w,d)*.145,Math.min(w,d)*.19,10,24),limestone,0,5,0);
   for(let i=0;i<10;i++){
    const angle=i*Math.PI/5,rx=Math.cos(angle),rz=Math.sin(angle),height=10+i%3*2.7;
    const petal=mesh(item,new THREE.SphereGeometry(1,18,12),shell,rx*w*.235,11+height*.45,rz*d*.235);
    petal.scale.set(w*.135,height*.66,d*.101);
    petal.rotation.set(rz*.25,-angle,-rx*.25);
   }
   mesh(item,new THREE.CylinderGeometry(Math.min(w,d)*.21,Math.min(w,d)*.12,3.3,28),gold,0,11.6,0);
  }else if(site.kind==='club'){
   scene.box(w-.8,6,d-.8,'#c2ad8a',0,3,0,item);
   scene.box(w-.9,.48,d-.9,'#705c51',0,6.2,0,item);
   scene.box(w*.62,2.3,d*.81,'#746456',0,7.35,0,item);
   for(let i=0;i<8;i++){
    const z=(i/8-.44)*(d-1.6);
    mesh(item,new THREE.CylinderGeometry(.22,.29,5.1,8),limestone,w*.4,2.61,z);
    scene.box(.07,2.4,.65,'#4e655e',w*.44,3.6,z,item);
   }
  }else if(site.kind==='civilian'){
   scene.box(w*.94,.34,d*.94,'#a8a39c',0,.17,0,item);
   for(const x of [-.28,.28])for(const z of [-.28,.28]){
    const height=Math.min(67,site.height||67);
    scene.box(w*.22,height,d*.22,'#c7c4b9',x*w,height/2,z*d,item);
   }
  }else{
   for(let step=0;step<3;step++)scene.box(w*(.91-step*.2),.33,d*(.91-step*.2),'#a6a398',0,.17+step*.33,0,item);
   if(site.kind==='cenotaph'){
    scene.box(w*.38,6.8,d*.35,'#adac9f',0,4.1,0,item);
    scene.box(w*.45,.32,d*.42,'#a6a296',0,7.52,0,item);
   }else{
    mesh(item,new THREE.CylinderGeometry(w*.11,w*.17,5.5,8),stone,0,3.7,0);
    mesh(item,new THREE.ConeGeometry(w*.21,1.2,8),material('#677a70'),0,7.05,0);
   }
  }
 }
 const mapped=SINGAPORE_ARCHITECTURE.landmarks.find(item=>item.kind==='padang');
 const padang=mapped.coordinates.map(p=>singaporeLocal(track,p));
 const lawnMat=material('#34573f'),out=[];
 const parkRings=[{outer:padang.map(p=>[p.x,p.z]),holes:[]},...SINGAPORE_CITY.parks.flatMap(park=>park.rings)];
 for(const ring of parkRings){
  const lawn=new THREE.ShapeGeometry(shape(ring));
  const source=lawn.index?lawn.toNonIndexed():lawn;
  source.rotateX(-Math.PI/2);
  const pos=source.attributes.position;
  for(let i=0;i<pos.count;i+=3){
   const poly=[0,1,2].map(j=>({x:pos.getX(i+j),z:pos.getZ(i+j)}));
   if(!singaporeRoadClear(track,poly))continue;
   for(const p of poly)out.push(p.x,singaporeTerrainHeight(track,p.x,p.z)+.08,p.z);
  }
  if(source!==lawn)source.dispose();
  lawn.dispose();
 }
 if(out.length){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(out,3));
  geometry.computeVertexNormals();
  const grass=mesh(scene.group,geometry,lawnMat,0,0,0,false);
  grass.userData.pitKeep=true;
 }
}

function sideStreets(scene,track){
 const positions=[],walks=[];
 const paths=new Set(['footway','pedestrian','path','cycleway']);
 const roads=new Set(['primary','secondary','tertiary','residential','service','unclassified']);
 const anchors=track.points.filter((_,i)=>i%9===0);
 for(const edge of singaporeRoads(track).access){
  if(edge.bridge||(!paths.has(edge.type)&&!roads.has(edge.type)))continue;
  const center={x:(edge.a.x+edge.b.x)/2,z:(edge.a.z+edge.b.z)/2};
  if(!anchors.some(p=>(p.x-center.x)**2+(p.z-center.z)**2<115**2))continue;
  if(edge.polygon.some(p=>waterAt(p.x,p.z))||!singaporeRoadClear(track,edge.polygon,road=>road.kind!=='access'))continue;
  const buffer=paths.has(edge.type)?walks:positions;
  for(const index of [0,1,3,3,1,2]){
   const p=edge.polygon[index];
   buffer.push(p.x,singaporeTerrainHeight(track,p.x,p.z)+.14,p.z);
  }
 }
 for(const [vertices,color] of [[positions,'#4c5054'],[walks,'#827a69']]){
  if(!vertices.length)continue;
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.computeVertexNormals();
  mesh(scene.group,geometry,material(color,{side:THREE.DoubleSide}),0,0,0,false);
 }
 scene.group.userData.singaporeAccessPatches=(positions.length+walks.length)/18;
}

export function singaporeVenuePlan(track){
 return planSingapore(track,(x,z)=>singaporeTerrainHeight(track,x,z),waterAt);
}

export function singaporePavement(track,rows){
 const plan=singaporeVenuePlan(track);
 const cityFootprints=plan.city.filter(building=>building.kind!=='skypark').flatMap(building=>building.polygons);
 const sites=plan.sites.filter(site=>['pit','stand','fan','medical','club','museum','civilian','cenotaph','lim'].includes(site.kind));
 const footprints=[...cityFootprints,...sites.map(site=>site.polygon)];
 return rows.filter(row=>!footprints.some(polygon=>singaporePolygonsOverlap(polygon,row.polygon)));
}

export function addSingapore(scene,track){
 const plan=singaporeVenuePlan(track),waters=bay(scene,track);
 sideStreets(scene,track);
 city(scene,plan);
 const wheel=landmarks(scene,track,plan);
 civicLandmarks(scene,track,plan);
 const event=addSingaporeEvent(scene,track,plan);
 let last=-Infinity;
 scene.environmentFx={
  setConditions(wetness){
   for(const water of waters)water.material.uniforms.wetness.value=wetness;
   event.setConditions(wetness);
  },
  frame(now,cars=[]){
   event.frame(now,cars);
   if(now-last<90)return;
   last=now;
   for(const water of waters)water.material.uniforms.time.value=now*.001;
   wheel?.frame(now*.001);
  },
  dispose(){
   for(const water of waters)water.getRenderTarget().dispose();
   const glowMaps=new Set();
   scene.group.traverse(object=>{
    for(const mat of [].concat(object.material||[]))if(mat.emissiveMap)glowMaps.add(mat.emissiveMap);
   });
   for(const map of glowMaps)map.dispose();
   event.dispose();
  }
 };
 scene.group.userData.singaporePlan=plan;
 scene.group.userData.singaporeBudget=event.budget;
 return scene.profile;
}
