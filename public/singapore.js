import * as THREE from '/vendor/three.module.js';
import {Reflector} from '/vendor/Reflector.js';
import {SINGAPORE_CITY} from './data/singapore-city.js';
import {sample,angleDiff,wrap} from '/shared/tracks.mjs';
import {trackBarriers} from '/shared/barriers.mjs';
import {roadClearance,safeBoxSite} from '/shared/venues.mjs';
import {trackSign,addBrakingBoards} from './track-furniture.js';
import {footprintClear,placeDecoration,disposeRejectedDecorations} from './jeddah-clearance.js';
import {addVegetation} from './vegetation.js';

const cache=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.78,...extra}),basic=(color,extra={})=>new THREE.MeshBasicMaterial({color,toneMapped:false,...extra});
function contains(ring,x,z){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function inRings(rings,x,z){return rings.some(r=>contains(r.outer,x,z)&&!r.holes.some(h=>contains(h,x,z)));}
function shape(r){const s=new THREE.Shape();r.outer.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();for(const h of r.holes){const p=new THREE.Path();h.forEach(([x,z],i)=>i?p.lineTo(x,-z):p.moveTo(x,-z));p.closePath();s.holes.push(p);}return s;}
function layout(track){
 if(cache.has(track))return cache.get(track);
 const heights=track.points.filter((_,i)=>i%5===0),level=Math.min(...track.points.map(p=>p.y))-1.25;
 const buildings=SINGAPORE_CITY.buildings.map((f,i)=>{const [x,z]=f.center;let nearest=heights[0],distance=Infinity;for(const p of heights){const d=Math.hypot(x-p.x,z-p.z);if(d<distance){distance=d;nearest=p;}}const height=clamp(parseFloat(f.height)||parseFloat(f.levels)*3.6||20+(i%6)*11,6,285);return {...f,x,z,y:distance<180?nearest.groundY-.6:level+.7,height};});
 const data={heights,level,buildings};cache.set(track,data);return data;
}
function waterAt(x,z){return inRings(SINGAPORE_CITY.water,x,z);}
function occupied(track,x,z){return layout(track).buildings.some(f=>inRings(f.rings,x,z));}
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
function city(scene,track){
 const faces=Array.from({length:6},(_,i)=>officeFacade(i)),stone=officeFacade(11,true),roof=material('#28323a'),data=layout(track);
 for(let i=0;i<data.buildings.length;i++){const f=data.buildings[i];if(['sands','skypark','flyerbase'].includes(f.kind))continue;if(f.kind==='court')f.height=25;if(f.kind==='fullerton')f.height=25;if(f.kind==='flyermall')f.height=9;if(f.kind==='esplanade')f.height=8;
  extrude(scene.group,f.rings,f.height,f.y,['court','fullerton','cityhall'].includes(f.kind)?stone:faces[i%faces.length],roof,['court','fullerton','cityhall'].includes(f.kind)?24:28.8);
  if(f.height>65){const m=mesh(scene.group,new THREE.BoxGeometry(1.4,.35,1.4),basic(i%4?'#67a9dc':'#ff6666'),f.x,f.y+f.height+1,f.z);m.castShadow=false;}
  if(f.kind==='pit')for(const r of f.rings)for(let j=0;j<r.outer.length-1;j++){const a=r.outer[j],b=r.outer[j+1],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;if(length<45||roadClearance(track,mx,mz)>35)continue;let nx=dz/length,nz=-dx/length;if(inRings(f.rings,mx+nx,mz+nz)){nx=-nx;nz=-nz;}const h=Math.atan2(nx,nz);for(let d=4;d<length-3;d+=7.2){const x=a[0]+dx*d/length+nx*.025,z=a[1]+dz*d/length+nz*.025,door=mesh(scene.group,new THREE.PlaneGeometry(5.8,3.8),material('#172b38',{emissive:'#826c3d',emissiveIntensity:.26}),x,f.y+2,z);door.rotation.y=h;const team=mesh(scene.group,new THREE.PlaneGeometry(5.8,.45),basic(['#c74639','#3c89aa','#35906d','#e2ba38'][Math.floor(d/7.2)%4]),x+nx*.01,f.y+4.2,z+nz*.01);team.rotation.y=h;}}
 }
 const court=data.buildings.find(f=>f.kind==='court'),fullerton=data.buildings.find(f=>f.kind==='fullerton'),cityhall=data.buildings.find(f=>f.kind==='cityhall');
 if(court){const copper=material('#5c8275',{metalness:.4,roughness:.5,emissive:'#629683',emissiveIntensity:.25});mesh(scene.group,new THREE.CylinderGeometry(7.5,8.6,4.4,28),material('#cabd9f'),court.x,court.y+27,court.z);const dome=mesh(scene.group,new THREE.SphereGeometry(8.3,32,16,0,Math.PI*2,0,Math.PI/2),copper,court.x,court.y+29.1,court.z);dome.scale.y=.85;mesh(scene.group,new THREE.CylinderGeometry(.5,.8,3.3,12),copper,court.x,court.y+37.4,court.z);}
 for(const f of [fullerton,cityhall].filter(Boolean))for(const r of f.rings)for(let j=0;j<r.outer.length-1;j++){const a=r.outer[j],b=r.outer[j+1],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<14)continue;const h=Math.atan2(-dz,dx),mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;let nx=dz/length,nz=-dx/length;if(!inRings(f.rings,mx+nx,mz+nz)){nx=-nx;nz=-nz;}
  for(let d=2;d<length-2;d+=4.5){const x=a[0]+dx*d/length+nx*.55,z=a[1]+dz*d/length+nz*.55;mesh(scene.group,new THREE.CylinderGeometry(.38,.5,9.2,10),material('#cfc1a4',{emissive:'#a87843',emissiveIntensity:.18}),x,f.y+14,z);}
  const trim=scene.box(length-.6,.5,.65,'#d9cfbb',mx+nx*.4,f.y+f.height-.1,mz+nz*.4);trim.rotation.y=h;
 }
 return {stone,faces};
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
 for(const r of SINGAPORE_CITY.water){const water=new Reflector(new THREE.ShapeGeometry(shape(r)),{textureWidth:768,textureHeight:768,multisample:0,clipBias:.004,shader});water.rotation.x=-Math.PI/2;water.position.y=data.level;water.name='Marina Bay and Singapore River — mapped water';let last=-Infinity;const draw=water.onBeforeRender;water.onBeforeRender=function(renderer,world,camera){const now=performance.now();if(now-last<(scene.slowFrames>25?450:180))return;last=now;draw.call(this,renderer,world,camera);};scene.group.add(water);waters.push(water);}
 return waters;
}
function lightField(scene,track){
 const margin=180,minX=Math.min(...track.points.map(p=>p.x))-margin,minZ=Math.min(...track.points.map(p=>p.z))-margin,width=Math.max(...track.points.map(p=>p.x))-minX+margin,depth=Math.max(...track.points.map(p=>p.z))-minZ+margin,c=document.createElement('canvas');c.width=c.height=2048;const x=c.getContext('2d');x.fillStyle='#000000';x.fillRect(0,0,2048,2048);x.globalCompositeOperation='lighter';
 for(let s=0;s<track.length;s+=12){const p=sample(track,s),px=(p.x-minX)/width*2048,py=(p.z-minZ)/depth*2048;x.save();x.translate(px,py);x.scale(2048/width,2048/depth);x.rotate(-p.heading);x.scale(1,1.45);const g=x.createRadialGradient(0,0,5,0,0,24);g.addColorStop(0,'rgba(219,239,255,.7)');g.addColorStop(.56,'rgba(208,229,255,.43)');g.addColorStop(1,'rgba(201,227,255,0)');x.fillStyle=g;x.fillRect(-25,-25,50,50);x.restore();}
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.NoColorSpace;const bounds=new THREE.Vector4(minX,minZ,width,depth),known=new WeakSet(),cars=new WeakSet();
 function attach(mat,gain=1.4){if(!mat?.isMeshStandardMaterial||known.has(mat))return;known.add(mat);const previous=mat.onBeforeCompile;mat.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);shader.uniforms.sgField={value:map};shader.uniforms.sgBounds={value:bounds};shader.uniforms.sgGain={value:gain};shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 sgWorld;').replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
 vec4 sgP=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
 sgP=instanceMatrix*sgP;
 #endif
 sgWorld=(modelMatrix*sgP).xyz;`);shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D sgField; uniform vec4 sgBounds; uniform float sgGain; varying vec3 sgWorld;').replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
 vec2 sgUV=vec2((sgWorld.x-sgBounds.x)/sgBounds.z,1.0-(sgWorld.z-sgBounds.y)/sgBounds.w);
 float sgMask=texture2D(sgField,clamp(sgUV,vec2(0.0),vec2(1.0))).r;
 reflectedLight.indirectDiffuse+=diffuseColor.rgb*sgMask*sgGain;`);};mat.customProgramCacheKey=()=>`singapore-fixed-field-${gain}`;mat.needsUpdate=true;}
 const apply=root=>root.traverse(o=>{if(o.material)for(const m of [].concat(o.material))attach(m,m.userData.surfaceKind==='asphalt'?2.0:1.25);});
 return {apply,frame(){for(const model of scene.cars.values())if(!cars.has(model)){cars.add(model);apply(model);}},dispose(){map.dispose();}};
}
function landmarks(scene,track){
 const data=layout(track),faces=officeFacade(42),metal=material('#82969d',{metalness:.7,roughness:.25}),deck=material('#aead99',{emissive:'#ba9f69',emissiveIntensity:.38}),sands=data.buildings.filter(f=>f.kind==='sands');
 for(const f of sands){extrude(scene.group,f.rings,193,f.y,faces,metal,28.8);for(const r of f.rings){extrude(scene.group,[r],.65,f.y+193,metal);extrude(scene.group,[r],3.8,f.y+193.6,material('#9b9585',{emissive:'#d4bd84',emissiveIntensity:.3}));}}
 const skypark=data.buildings.find(f=>f.kind==='skypark');if(skypark){const y=data.level+.7+197.4;extrude(scene.group,skypark.rings,5.1,y,deck,material('#a59572',{emissive:'#b3985b',emissiveIntensity:.22}));
  const h=skypark.heading,g=group(scene,{x:skypark.x,y:y+5.18,z:skypark.z},h),points=skypark.rings.flatMap(r=>r.outer),u=points.map(([x,z])=>(x-skypark.x)*Math.cos(h)-(z-skypark.z)*Math.sin(h)),length=Math.max(...u)-Math.min(...u);
  // Long blue infinity pool and garden promenade on the boat-shaped skypark.
  scene.box(length*.66,.28,9.4,'#393e40',0,.02,-3,g);const pool=mesh(g,new THREE.PlaneGeometry(length*.65,8.6),basic('#1e8cba',{transparent:true,opacity:.86}),0,.19,-3);pool.rotation.x=-Math.PI/2;scene.box(length*.66,.06,.08,'#bde4df',0,.25,1.8,g);
  for(let x=-length*.40;x<=length*.35;x+=13){scene.box(2.2,.25,4.4,'#d1bd86',x,.18,8,g);mesh(g,new THREE.CylinderGeometry(.12,.22,5,8),material('#605c3c'),x,2.6,13);const leaves=mesh(g,new THREE.SphereGeometry(2.7,12,8),material('#294831',{emissive:'#258340',emissiveIntensity:.18}),x,5.1,13);leaves.scale.y=.38;}
 }
 for(const f of data.buildings.filter(f=>f.kind==='esplanade')){
  const points=f.rings.flatMap(r=>r.outer),rx=(Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0])))*.46,rz=(Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1])))*.46;
  const bounds=new THREE.Box3(new THREE.Vector3(-rx,0,-rz),new THREE.Vector3(rx,28,rz));if(!footprintClear(track,f,0,bounds,1.6))continue;
  const glass=material('#2d4351',{metalness:.68,roughness:.3,emissive:'#a99258',emissiveIntensity:.2}),dome=mesh(scene.group,new THREE.SphereGeometry(1,36,18,0,Math.PI*2,0,Math.PI/2),glass,f.x,f.y+8,f.z);dome.scale.set(rx,25,rz);
  const count=14*36,dummy=new THREE.Object3D(),shades=new THREE.InstancedMesh(new THREE.ConeGeometry(1.1,1.4,3),material('#a4a899',{metalness:.5,roughness:.4}),count);let k=0;
  for(let row=0;row<14;row++)for(let col=0;col<36;col++){const a=col*Math.PI/18,theta=(row+.6)/14*Math.PI/2,x=rx*Math.sin(theta)*Math.cos(a),z=rz*Math.sin(theta)*Math.sin(a),y=25*Math.cos(theta);dummy.position.set(f.x+x,f.y+8+y,f.z+z);dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(x/(rx*rx),y/625,z/(rz*rz)).normalize());dummy.updateMatrix();shades.setMatrixAt(k++,dummy.matrix);}shades.castShadow=true;shades.computeBoundingSphere();scene.group.add(shades);
 }
 return flyer(scene,track);
}
function flyer(scene,track){
 const f=SINGAPORE_CITY.flyer,[x,z]=f.center,y=singaporeTerrainHeight(track,x,z),g=group(scene,{x,y,z},f.heading),white=material('#b4cbd4',{metalness:.62,roughness:.3,emissive:'#7ba1c3',emissiveIntensity:.22}),led=basic('#a9e7ff'),rotor=new THREE.Group();rotor.position.y=90;g.add(rotor);
 for(const depth of [-5,5]){
  for(const u of [-42,42]){scene.box(9,1.4,9,'#737d80',u,.3,depth*2.4,g);beam(scene,g,new THREE.Vector3(u,.9,depth*2.4),new THREE.Vector3(0,90,depth),'#a8bec7',2.3);}
  const rim=mesh(rotor,new THREE.TorusGeometry(f.radius,.65,8,160),white,0,0,depth,false),glow=mesh(rotor,new THREE.TorusGeometry(f.radius+.05,.11,5,160),led,0,0,depth-.5,false);rim.castShadow=false;glow.castShadow=false;
 }
 mesh(g,new THREE.CylinderGeometry(3,3,13,20),white,0,90,0).rotation.x=Math.PI/2;
 const spokes=[];for(let i=0;i<56;i++){const a=i*Math.PI/28;for(const depth of [-5,5])spokes.push(0,0,depth,f.radius*Math.cos(a),f.radius*Math.sin(a),depth);}const lines=new THREE.BufferGeometry();lines.setAttribute('position',new THREE.Float32BufferAttribute(spokes,3));rotor.add(new THREE.LineSegments(lines,new THREE.LineBasicMaterial({color:'#8bb8cc',transparent:true,opacity:.65})));
 const cabins=[],glass=material('#4a8199',{metalness:.56,roughness:.2,emissive:'#c5b57c',emissiveIntensity:.7});for(let i=0;i<28;i++){const a=i*Math.PI/14,c=new THREE.Group();c.position.set(Math.cos(a)*f.radius,Math.sin(a)*f.radius,0);rotor.add(c);const cabin=mesh(c,new THREE.CapsuleGeometry(2.05,3,4,12),glass,0,0,0,false);cabin.rotation.x=Math.PI/2;for(const depth of [-2.6,2.6])mesh(c,new THREE.TorusGeometry(2.1,.12,5,16),white,0,0,depth,false);mesh(c,new THREE.BoxGeometry(4,.25,5.2),basic(i%3?'#9bdaf8':'#f5a2b4'),0,1.8,0,false);cabins.push(c);}
 return {rotor,cabins};
}
function planting(scene,track){
 const palms=[],rain=[],hedges=[],dummy=new THREE.Object3D(),green=material('#264c32',{emissive:'#1e663b',emissiveIntensity:.12}),trunk=material('#5b5442'),uplight=basic('#1cab66',{transparent:true,opacity:.20,depthWrite:false,blending:THREE.AdditiveBlending});
 for(const park of SINGAPORE_CITY.parks)for(const r of park.rings){const geometry=new THREE.ShapeGeometry(shape(r));geometry.rotateX(-Math.PI/2);const a=geometry.attributes.position;for(let i=0;i<a.count;i++)a.setY(i,singaporeTerrainHeight(track,a.getX(i),a.getZ(i))+.035);geometry.computeVertexNormals();const lawn=mesh(scene.group,geometry,material('#253e2e'));lawn.castShadow=false;}
 for(let s=10;s<track.length;s+=29)for(const side of [-1,1]){const p=sample(track,s,side*(track.width/2+13)),r=6.6,bounds=new THREE.Box3(new THREE.Vector3(-r,0,-r),new THREE.Vector3(r,18,r));if(waterAt(p.x,p.z)||occupied(track,p.x,p.z)||!footprintClear(track,p,0,bounds,2))continue;const site={x:p.x,z:p.z,y:singaporeTerrainHeight(track,p.x,p.z),scale:.85+(s%5)*.035,angle:s*.03};if(Math.floor(s/29)%3===0)palms.push(site);else rain.push(site);for(const d of [-3,0,3])hedges.push({x:p.x+Math.sin(p.heading)*d,z:p.z+Math.cos(p.heading)*d,y:site.y+.65,heading:p.heading});const glow=mesh(scene.group,new THREE.CircleGeometry(2.4,18),uplight,p.x,site.y+.05,p.z);glow.rotation.x=-Math.PI/2;glow.castShadow=false;}
 addVegetation(scene,track,scene.profile,{sites:palms,palms:true});
 const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.22,.45,9,8),trunk,rain.length),crowns=new THREE.InstancedMesh(new THREE.SphereGeometry(1,14,9),green,rain.length*5);
 rain.forEach((p,i)=>{dummy.position.set(p.x,p.y+4.5,p.z);dummy.rotation.set(0,p.angle,.04);dummy.scale.setScalar(1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);for(let j=0;j<5;j++){const a=j*Math.PI*.4+p.angle;dummy.position.set(p.x+Math.cos(a)*2.2,p.y+9+(j%2)*1.5,p.z+Math.sin(a)*2.2);dummy.rotation.set(.08,a,.05);dummy.scale.set(3.0+(i%3)*.35,2.2,3.2);dummy.updateMatrix();crowns.setMatrixAt(i*5+j,dummy.matrix);crowns.setColorAt(i*5+j,new THREE.Color().setHSL(.30+(i%4)*.012,.28,.18+(j%3)*.025));}});
 const hedge=new THREE.InstancedMesh(new THREE.SphereGeometry(1,9,6),green,hedges.length);hedges.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.heading,0);dummy.scale.set(1.35,.7,1.6);dummy.updateMatrix();hedge.setMatrixAt(i,dummy.matrix);});for(const m of [trunks,crowns,hedge]){m.computeBoundingSphere();m.castShadow=true;m.receiveShadow=true;scene.group.add(m);}
}
function flagMaterials(){
 const national=texture(c=>{c.fillStyle='#ed4656';c.fillRect(0,0,256,128);c.fillStyle='#f3f3ed';c.fillRect(0,128,256,128);c.beginPath();c.arc(64,62,40,0,Math.PI*2);c.fill();c.fillStyle='#ed4656';c.beginPath();c.arc(81,55,34,0,Math.PI*2);c.fill();c.fillStyle='#ffffff';for(let k=0;k<5;k++){const a=-Math.PI/2+k*Math.PI*.4,x=112+Math.cos(a)*25,y=60+Math.sin(a)*25;c.beginPath();for(let j=0;j<10;j++){const r=j%2?3.2:7,b=-Math.PI/2+j*Math.PI/5;c.lineTo(x+Math.cos(b)*r,y+Math.sin(b)*r);}c.closePath();c.fill();}});
 return [material('#ffffff',{map:national,side:THREE.DoubleSide,emissive:'#dab793',emissiveIntensity:.15}),...['#d94736','#2f75c2','#dfbf3b'].map(color=>material(color,{side:THREE.DoubleSide,emissive:color,emissiveIntensity:.16}))];
}
function addFlag(scene,parent,x,y,z,mat,flags){scene.box(.035,2.6,.035,'#c8d7db',x,y+1.3,z,parent);const flag=mesh(parent,new THREE.PlaneGeometry(1.5,.9,8,2),mat,x+.75,y+2.3,z,false);flag.castShadow=false;flags.push(flag);}
function spectators(parent,positions,phones){
 const count=positions.length,dummy=new THREE.Object3D(),body=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.17,.31,2,5),material('#ffffff'),count),heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.12,6,5),material('#ffffff'),count),glints=Array.from({length:4},()=>[]);
 positions.forEach((p,i)=>{dummy.position.set(p.x,p.y+.57,p.z);dummy.scale.set(1,1,.9);dummy.rotation.set(0,0,Math.sin(i)*.03);dummy.updateMatrix();body.setMatrixAt(i,dummy.matrix);body.setColorAt(i,new THREE.Color(['#dc573e','#dfd5bc','#2f779e','#d5ae38','#4b8c6a','#e0bc9b','#a8516c'][i%7]));dummy.position.y+=.43;dummy.scale.setScalar(1);dummy.rotation.set(0,0,0);dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);heads.setColorAt(i,new THREE.Color(['#d5b493','#b28d70','#e4c3a1','#a27c5d'][i%4]));if(i%3===0)glints[i%4].push(p.x+.17,p.y+.85+(i%5)*.13,p.z+.18);});
 for(const m of [body,heads]){m.computeBoundingSphere();parent.add(m);}
 for(let i=0;i<4;i++){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(glints[i],3));const points=new THREE.Points(geo,new THREE.PointsMaterial({color:i%2?'#8fddff':'#f2ead3',size:.13,transparent:true,opacity:.8,depthWrite:false,toneMapped:false}));parent.add(points);phones.push({points,phase:i});}
}
function crowdStands(scene,track,flags,phones){
 const mats=flagMaterials(),records=SINGAPORE_CITY.grandstands;
 const height=(x,z)=>singaporeTerrainHeight(track,x,z);
 for(const [index,r] of records.entries()){
  const s=r.s,depth=r.rows*.96,p={x:r.center[0],z:r.center[1]},g=group(scene,{...p,y:height(p.x,p.z)},r.heading),people=[];
  for(let row=0;row<r.rows;row++){const x=row*.96-depth/2,y=row*.58;scene.box(.96,.25,r.length,'#53636c',x,y,0,g);for(let col=0;col<Math.floor(r.length/.9);col++){const z=-r.length/2+.5+col*.9;people.push({x,y:y+.17,z});if(col%3===0)scene.box(.48,.12,.5,['#d53e4d','#e1ba3b','#306aa0','#519a72'][Math.floor(col/10)%4],x,y+.14,z,g);}}
  for(let z=-r.length/2;z<=r.length/2;z+=9){for(const x of [-depth/2,0,depth/2])scene.box(.12,r.rows*.58,.12,'#7f8e94',x,r.rows*.29-1,z,g);beam(scene,g,new THREE.Vector3(-depth/2,.1,z),new THREE.Vector3(depth/2,r.rows*.58-.8,z));beam(scene,g,new THREE.Vector3(depth/2,0,z),new THREE.Vector3(-depth/2,r.rows*.58-.8,z));}
  spectators(g,people,phones);for(let z=-r.length*.4,i=0;z<r.length*.45;z+=18,i++)addFlag(scene,g,depth/2,r.rows*.58,z,mats[(i+index)%4],flags);
  const sign=trackSign(r.name,Math.min(70,r.length-4),1.4,'#142e48','#e2bb67');sign.position.set(-depth/2-.18,1.4,0);sign.rotation.y=-Math.PI/2;g.add(sign);
  placeDecoration(scene,track,g,height,{s,side:r.side,followTrack:true,margin:2.5,accept:(x,z)=>!waterAt(x,z)&&!occupied(track,x,z)});
 }
}
function floodlights(scene,track){
 const dummy=new THREE.Object3D(),poles=[],white=basic('#effaff',{side:THREE.DoubleSide}),glowMap=texture(c=>{const g=c.createRadialGradient(128,128,2,128,128,128);g.addColorStop(0,'rgba(226,247,255,.75)');g.addColorStop(.22,'rgba(177,225,255,.3)');g.addColorStop(1,'rgba(177,225,255,0)');c.fillStyle=g;c.fillRect(0,0,256,256);}),halo=basic('#ccf1ff',{map:glowMap,transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
 for(let s=5;s<track.length;s+=22)for(const side of [-1,1]){
  let p=null;for(const extra of [2.0,2.6,3.3,4.2]){const candidate=sample(track,s,side*(track.width/2+extra));if(footprintClear(track,candidate,0,new THREE.Box3(new THREE.Vector3(-.22,0,-.22),new THREE.Vector3(.22,15,.22)),1.3)&&!occupied(track,candidate.x,candidate.z)&&!waterAt(candidate.x,candidate.z)){p=candidate;break;}}
  if(!p)continue;const y=singaporeTerrainHeight(track,p.x,p.z),g=group(scene,{...p,y},p.heading),h=14.5;
  scene.box(.17,h,.17,'#a5b6be',0,h/2,0,g);scene.box(4.3,.13,.17,'#a7b9c2',-side*2.0,h-.1,0,g);beam(scene,g,new THREE.Vector3(0,h-2,0),new THREE.Vector3(-side*2.2,h-.1,0),'#9eafb8',.075);
  scene.box(1.6,.18,.7,'#bfcbd0',-side*3.3,h-.2,0,g);poles.push({x:p.x+Math.cos(p.heading)*-side*3.3,y:y+h-.3,z:p.z-Math.sin(p.heading)*-side*3.3,heading:p.heading});
 }
 const lamps=new THREE.InstancedMesh(new THREE.PlaneGeometry(.62,.26),white,poles.length*4),halos=new THREE.InstancedMesh(new THREE.PlaneGeometry(4.6,2.7),halo,poles.length);
 poles.forEach((p,i)=>{dummy.rotation.set(Math.PI/2,p.heading,0,'YXZ');dummy.scale.setScalar(1);for(let j=0;j<4;j++){const u=(j%2-.5)*.72,v=(Math.floor(j/2)-.5)*.31;dummy.position.set(p.x+Math.cos(p.heading)*u+Math.sin(p.heading)*v,p.y,p.z-Math.sin(p.heading)*u+Math.cos(p.heading)*v);dummy.updateMatrix();lamps.setMatrixAt(i*4+j,dummy.matrix);}dummy.position.set(p.x,p.y-.02,p.z);dummy.updateMatrix();halos.setMatrixAt(i,dummy.matrix);});for(const m of [lamps,halos]){m.computeBoundingSphere();scene.group.add(m);}
 // Fixed low-cost fill plus the baked road field: never camera-pooled lights.
 const center=track.points.reduce((p,q)=>({x:p.x+q.x/track.points.length,y:p.y+q.y/track.points.length,z:p.z+q.z/track.points.length}),{x:0,y:0,z:0}),fills=[];
 for(const [x,z,intensity] of [[-120,-80,.33],[160,110,.20]]){const light=new THREE.DirectionalLight('#e9f8ff',intensity);light.position.set(center.x+x,center.y+220,center.z+z);light.target.position.set(center.x,center.y,center.z);scene.group.add(light,light.target);light.target.updateMatrixWorld();fills.push(light);}return fills;
}
function dressing(scene,track,panels,screens){
 const walls=trackBarriers(track).walls.filter(w=>w.kind==='track'),brands=[['SINGAPORE AIRLINES','#132c49','#d8b767'],['ROLEX','#07563e','#d3bb73'],['DHL','#e8bd2c','#b32635']],signs=brands.map(([name,bg,ink])=>trackSign(name,4,.78,bg,ink).material);
 for(let i=0;i<walls.length;i++){const w=walls[i],n=w.inward;if(!n||w.length<.2)continue;const sign=mesh(scene.group,new THREE.PlaneGeometry(w.length,.77),signs[Math.floor(i/100)%3],w.x+n.x*(w.width/2+.016),(w.a.y+w.b.y)/2+.57,w.z+n.z*(w.width/2+.016));sign.rotation.y=Math.atan2(n.x,n.z);sign.castShadow=false;}
 const height=(x,z)=>singaporeTerrainHeight(track,x,z);
 // Scuffed energy-absorbing corner wraps stay inside the existing solid wall.
 const scuffs=texture(c=>{c.fillStyle='#dce4df';c.fillRect(0,0,256,256);c.strokeStyle='#59636c';for(let i=0;i<17;i++){c.lineWidth=1+i%3;c.beginPath();c.moveTo((i*71)%220,135+i*5);c.lineTo((i*71)%220+18,129+i*5);c.stroke();}}),wrapMaterial=material('#ffffff',{map:scuffs});
 for(let i=0;i<walls.length;i+=3){const w=walls[i],j=Math.floor(i/2)%track.points.length,p=track.points[j],q=track.points[(j+8)%track.points.length];if(Math.abs(angleDiff(q.heading,p.heading))<.5)continue;const block=mesh(scene.group,new THREE.BoxGeometry(w.width,.95,w.length*.97),wrapMaterial,w.x,(w.a.y+w.b.y)/2+.48,w.z);block.rotation.y=Math.atan2(w.tx,w.tz);}
 let lastTyre=-Infinity;for(let i=0;i<track.points.length;i+=4){const p=track.points[i],q=track.points[(i+8)%track.points.length],s=i*track.step,k=angleDiff(q.heading,p.heading);if(Math.abs(k)<.65||s-lastTyre<150)continue;lastTyre=s;const side=-Math.sign(k)||1,point=safeBoxSite(track,s,2.5,4.5,side,2),g=group(scene,{...point,y:height(point.x,point.z)},point.heading),rubber=material('#151e24',{roughness:.96});for(let row=0;row<4;row++)for(let col=0;col<6;col++)for(let layer=0;layer<4;layer++)mesh(g,new THREE.CylinderGeometry(.52,.52,.25,10),rubber,(row-1.5)*1.05,layer*.25+.125,(col-2.5)*1.05);placeDecoration(scene,track,g,height,{s,side,margin:1.5,accept:(x,z)=>!waterAt(x,z)&&!occupied(track,x,z)});}
 for(let i=0;i<17;i++){
  const s=(i+.2)/17*track.length,side=i%2?1:-1,p=safeBoxSite(track,s,1.8,2.3,side,2),g=group(scene,{...p,y:height(p.x,p.z)},p.heading);
  for(const x of [-.55,.55]){scene.box(.32,.64,.26,'#f07b38',x,1,0,g);for(const dx of [-.09,.09])scene.box(.13,.67,.16,'#de6c28',x+dx,.35,0,g);mesh(g,new THREE.SphereGeometry(.16,8,6),material('#f1eee0'),x,1.48,0);scene.box(.33,.045,.28,'#e3e7d3',x,1.13,0,g);}
  scene.box(.10,3.3,.10,'#7a929a',1.4,1.65,0,g);const panel=mesh(g,new THREE.BoxGeometry(.85,.58,.1),basic('#27e18c'),1.4,2.9,0,false);if(placeDecoration(scene,track,g,height,{s,side,margin:1.5,accept:(x,z)=>!waterAt(x,z)&&!occupied(track,x,z)})){const location=panel.getWorldPosition(new THREE.Vector3());panels.push({mesh:panel,x:location.x,z:location.z});}
 }
 for(const fraction of [.025,.33,.82]){
  const p=sample(track,track.length*fraction),span=track.width/2+2.1,bounds=new THREE.Box3(new THREE.Vector3(-.3,0,-.7),new THREE.Vector3(.3,9,.7));if([-span,span].some(x=>!footprintClear(track,{x:p.x+Math.cos(p.heading)*x,z:p.z-Math.sin(p.heading)*x},0,bounds,1.3)))continue;const g=group(scene,p,p.heading);for(const x of [-span,span]){for(const z of [-.65,.65])scene.box(.17,8.7,.17,'#a8b8c1',x,4.35,z,g);for(let y=1;y<8;y+=2)beam(scene,g,new THREE.Vector3(x,y,-.65),new THREE.Vector3(x,y+2,.65));}scene.box(span*2+1,1.5,1.5,'#172d48',0,7.8,0,g);scene.box(span*2+1,.1,1.7,'#9cb6c8',0,8.65,0,g);
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=160;const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const led=basic('#ffffff',{map,side:THREE.DoubleSide});for(const side of [-1,1]){const board=mesh(g,new THREE.PlaneGeometry(span*2,.99),led,0,7.8,side*.78,false);if(side<0)board.rotation.y=Math.PI;}screens.push({canvas,map});
 }
 for(const fraction of [.16,.47,.76]){const p=safeBoxSite(track,fraction*track.length,4,9,1,3),g=group(scene,{...p,y:height(p.x,p.z)},p.heading);scene.box(3.2,1.4,6,'#b4b8ac',0,.8,0,g);scene.box(1.9,1.5,2.1,'#486b7d',0,2,-1,g);beam(scene,g,new THREE.Vector3(0,1.5,1),new THREE.Vector3(0,17,-3),'#bfac6e',.32);beam(scene,g,new THREE.Vector3(0,17,-3),new THREE.Vector3(0,20,-7),'#c2b482',.21);scene.box(.9,.65,1.2,'#263944',0,20,-7,g);placeDecoration(scene,track,g,height,{s:fraction*track.length,side:1,margin:2.4,accept:(x,z)=>!waterAt(x,z)&&!occupied(track,x,z)});}
 for(const fraction of [.045,.58,.93]){const p=safeBoxSite(track,fraction*track.length,8,24,1,3),g=group(scene,{...p,y:height(p.x,p.z)},p.heading);scene.box(13,6,42,'#283c4c',0,3,0,g);mesh(g,new THREE.BoxGeometry(13.1,3.2,42.1),officeFacade(91),0,4.1,0);scene.box(16,.35,46,'#d6d5c2',0,6.2,0,g);for(let z=-18;z<20;z+=5)scene.box(.3,4.1,.3,'#b8bdac',-7.3,2,z,g);placeDecoration(scene,track,g,height,{s:fraction*track.length,side:1,margin:2.5,accept:(x,z)=>!waterAt(x,z)&&!occupied(track,x,z)});}
 addBrakingBoards(scene,track);
}
export function addSingapore(scene,track){
 const waters=bay(scene,track);city(scene,track);const wheel=landmarks(scene,track),flags=[],phones=[],panels=[],screens=[];planting(scene,track);crowdStands(scene,track,flags,phones);dressing(scene,track,panels,screens);const fills=floodlights(scene,track),field=lightField(scene,track);let screenAt=-Infinity,panelAt=-Infinity;
 scene.environmentFx={setConditions(w){for(const water of waters)water.material.uniforms.wetness.value=w;field.apply(scene.group);},frame(now,cars=[]){
  const t=now*.001;field.frame();for(const water of waters)water.material.uniforms.time.value=t;wheel.rotor.rotation.z=t*.003;for(const cabin of wheel.cabins)cabin.rotation.z=-wheel.rotor.rotation.z;
  for(const [i,flag] of flags.entries()){const a=flag.geometry.attributes.position;for(let j=0;j<a.count;j++)a.setZ(j,Math.sin(t*1.7+a.getX(j)*4+i)*.05*(a.getX(j)+.75));a.needsUpdate=true;}for(const p of phones)p.points.material.opacity=.72+Math.sin(t*1.1+p.phase*1.4)*.16;
  const active=cars.filter(c=>!c.finished&&!c.retired);if(now-panelAt>160){panelAt=now;for(const p of panels){const yellow=active.some(c=>Math.hypot(c.x-p.x,c.z-p.z)<100&&(c.offtrack||c.sliding)),red=cars.length>0&&cars.every(c=>c.retired);p.mesh.material.color.set(red?'#ff4939':yellow?'#ffd233':'#27e18c');}}
  if(now-screenAt>1000){screenAt=now;const leader=cars.reduce((a,c)=>!a||(c.progress||0)>(a.progress||0)?c:a,null);for(const record of screens){const x=record.canvas.getContext('2d');x.fillStyle='#102c49';x.fillRect(0,0,1024,160);x.fillStyle='#dcba6b';x.fillRect(0,0,1024,7);x.fillRect(0,153,1024,7);x.font='bold 44px Arial';x.textAlign='center';x.fillText('SINGAPORE AIRLINES',512,64);x.fillStyle='#e8f5ff';x.font='600 29px monospace';x.fillText(`SINGAPORE NIGHT GP   •   LAP ${leader?.lap||1}`,512,119);record.map.needsUpdate=true;}}
 },dispose(){for(const water of waters)water.getRenderTarget().dispose();for(const light of fills){light.removeFromParent();light.target.removeFromParent();}const glowMaps=new Set();scene.group.traverse(o=>{for(const m of [].concat(o.material||[]))if(m.emissiveMap)glowMaps.add(m.emissiveMap);});for(const map of glowMaps)map.dispose();field.dispose();disposeRejectedDecorations(scene.group);}};
 return scene.profile;
}
