import * as THREE from '/vendor/three.module.js';
import {Reflector} from '/vendor/Reflector.js';
import {BAKU_CITY} from './data/baku-city.js';
import {sample} from '/shared/tracks.mjs';
import {trackBarriers} from '/shared/barriers.mjs';
import {roadClearance,safeBoxSite} from '/shared/venues.mjs';
import {trackSign,addBrakingBoards} from './track-furniture.js';
import {footprintClear,placeDecoration,disposeRejectedDecorations} from './jeddah-clearance.js';

// Mapped geography with original procedural architecture; never modify the racing mesh.
const cache=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
function inside(ring,x,z){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function inRings(rings,x,z){return rings.some(r=>inside(r.outer,x,z)&&!r.holes.some(h=>inside(h,x,z)));}
function shape(r){const s=new THREE.Shape();r.outer.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();for(const h of r.holes){const path=new THREE.Path();h.forEach(([x,z],i)=>i?path.lineTo(x,-z):path.moveTo(x,-z));path.closePath();s.holes.push(path);}return s;}
function layout(track){
 if(cache.has(track))return cache.get(track);
 const heights=track.points.filter((_,i)=>i%5===0),level=Math.min(...track.points.map(p=>p.y))-1.15;
 const buildings=BAKU_CITY.buildings.map((f,i)=>{const [x,z]=f.center;let nearest=heights[0],d=Infinity;for(const p of heights){const distance=Math.hypot(x-p.x,z-p.z);if(distance<d){d=distance;nearest=p;}}return{...f,x,z,y:nearest.groundY-.35,height:clamp(parseFloat(f.height)||parseFloat(f.levels)*3.5||11+(i%6)*3.1,6,190)};});
 const data={heights,level,buildings};cache.set(track,data);return data;
}
function waterAt(x,z){return inRings(BAKU_CITY.sea,x,z);}
function buildingAt(track,x,z){return layout(track).buildings.some(f=>inRings(f.rings,x,z));}
export function bakuTerrainHeight(track,x,z,cell=0){
 const data=layout(track);if(waterAt(x,z))return data.level-1.5;
 let nearest=data.heights[0],distance=Infinity,floor=Infinity;
 for(const p of data.heights){const d=Math.hypot(x-p.x,z-p.z);if(d<distance){distance=d;nearest=p;}if(d<track.width/2+Math.SQRT2*cell+12)floor=Math.min(floor,p.y-.9);}
 // Coast remains level; the inland escarpment rises behind the Old City.
 const coast=smooth((x+300)/900)*smooth((z-50)/700),rise=Math.max(0,-x-500)*.048+Math.max(0,z-520)*.018;
 const hillside=nearest.groundY-.85+rise*smooth((distance-25)/230),y=hillside*(1-coast*smooth((distance-35)/230))+(data.level+.55)*coast*smooth((distance-35)/230);
 return Number.isFinite(floor)?Math.min(y,floor):y;
}
function mesh(parent,geometry,mat,x=0,y=0,z=0,staticGeometry=true){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;m.userData.mappedStatic=staticGeometry;parent.add(m);return m;}
function group(scene,p,heading=0){const g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=heading;scene.group.add(g);return g;}
function beam(scene,parent,a,b,color='#657478',width=.13){const delta=b.clone().sub(a),p=a.clone().add(b).multiplyScalar(.5),m=scene.box(width,delta.length(),width,color,p.x,p.y,p.z,parent);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
function surface(source,index){const g=new THREE.BufferGeometry();for(const [name,a] of Object.entries(source.attributes)){const data=[];for(const part of source.groups.filter(p=>p.materialIndex===index))for(let j=part.start*a.itemSize;j<(part.start+part.count)*a.itemSize;j++)data.push(a.array[j]);g.setAttribute(name,new THREE.Float32BufferAttribute(data,a.itemSize));}return g;}
function extrude(parent,rings,height,y,wall,roof=wall,repeat=3.5,base=null){for(const r of rings){const source=new THREE.ExtrudeGeometry(shape(r),{depth:height,bevelEnabled:false}),uv=source.attributes.uv,positions=source.attributes.position;for(let i=0;i<uv.count;i++){uv.setXY(i,uv.getX(i)/repeat,uv.getY(i)/repeat);if(base)positions.setZ(i,positions.getZ(i)+base(positions.getX(i),-positions.getY(i))-y);}if(base)source.computeVertexNormals();for(const [index,mat] of [[0,roof],[1,wall]]){const m=mesh(parent,surface(source,index),mat,0,y,0);m.rotation.x=-Math.PI/2;}source.dispose();}}
function texture(draw,size=256){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;}
function limestone(){const map=texture((c,n)=>{c.fillStyle='#bea57e';c.fillRect(0,0,n,n);for(let row=0;row<8;row++)for(let col=-1;col<5;col++){const x=col*64+(row%2)*32,y=row*32;c.fillStyle=['#c4ad88','#ccb793','#bfa682','#cbb28b'][(row*7+col+5)%4];c.fillRect(x+1,y+1,62,30);c.fillStyle='#e0c9a355';c.fillRect(x+2,y+2,61,1);}for(let i=0;i<1800;i++){c.fillStyle=i%2?'#735f3c20':'#f8e4bd24';c.fillRect((i*73.3)%n,(i*91.7)%n,1,1);}});return material('#ffffff',{map,bumpMap:map,bumpScale:.14,roughness:.96});}
function facade(color,glass=false){const map=texture(c=>{c.fillStyle=color;c.fillRect(0,0,256,256);if(glass){c.fillStyle='#94b5c0';c.fillRect(3,2,250,248);c.fillStyle='#273e52';for(let y=12;y<256;y+=42)c.fillRect(4,y,248,7);c.fillStyle='#c8d3cf';for(let x=0;x<256;x+=64)c.fillRect(x,0,3,256);}else{c.fillStyle='#eadac0';c.fillRect(47,25,162,203);c.fillStyle='#49616b';c.fillRect(61,42,134,161);c.fillStyle='#8fa1a1';c.fillRect(66,47,26,148);c.fillStyle='#e5d5ba';c.fillRect(124,43,7,161);c.fillRect(61,121,134,5);c.fillStyle='#a9997e';c.fillRect(42,224,172,12);c.fillStyle='#eadfc8';c.fillRect(0,247,256,6);c.fillRect(40,22,177,8);}});return material('#ffffff',{map,bumpMap:glass?null:map,bumpScale:.035,metalness:glass?.48:.04,roughness:glass?.22:.73});}
function people(parent,positions){
 if(!positions.length)return;const d=new THREE.Object3D(),body=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.17,.32,2,5),material('#ffffff'),positions.length),heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.12,6,5),material('#ffffff'),positions.length);
 positions.forEach((p,i)=>{d.position.set(p.x,p.y+.58,p.z);d.rotation.set(0,p.heading||0,0);d.updateMatrix();body.setMatrixAt(i,d.matrix);body.setColorAt(i,new THREE.Color(['#e7dfce','#bb2937','#2c7798','#d8b948','#2e886c','#eeeae3','#314464'][i%7]));d.position.y+=.43;d.updateMatrix();heads.setMatrixAt(i,d.matrix);heads.setColorAt(i,new THREE.Color(['#d4b28e','#b38c69','#edcba5','#956e54'][i%4]));});for(const m of [body,heads]){m.computeBoundingSphere();parent.add(m);}
}
function flagMaterial(){return material('#ffffff',{side:THREE.DoubleSide,map:texture(c=>{for(const [i,col] of ['#27a9d0','#e83b4a','#39965d'].entries()){c.fillStyle=col;c.fillRect(0,i*256/3,256,256/3);}c.fillStyle='#ffffff';c.beginPath();c.arc(125,128,29,0,Math.PI*2);c.fill();c.fillStyle='#e83b4a';c.beginPath();c.arc(135,126,24,0,Math.PI*2);c.fill();c.fillStyle='#ffffff';c.beginPath();for(let k=0;k<16;k++){const r=k%2?8:18,a=-Math.PI/2+k*Math.PI/8;c.lineTo(162+Math.cos(a)*r,128+Math.sin(a)*r);}c.closePath();c.fill();})});}
function addFlag(scene,parent,x,y,z,mat){scene.box(.035,2.5,.035,'#c6d0ce',x,y+1.2,z,parent);const flag=mesh(parent,new THREE.PlaneGeometry(1.4,.78,9,2),mat,x+.7,y+2,z,false);flag.castShadow=false;(scene.group.userData.bakuFlags??=[]).push(flag);}
function town(scene,track,stone){
 const data=layout(track),facades=['#d0b994','#dcc7a3','#b6a88f','#e3d0ad','#bdaf99','#c8b590'].map(c=>facade(c)),glass=facade('#405d6b',true),roof=material('#b1a18a'),spectators=[],flags=flagMaterial();
 for(let i=0;i<data.buildings.length;i++){
  const f=data.buildings[i];if(f.kind==='flame')continue;
  f.floor=f.distance<190?f.y:Math.max(f.y,bakuTerrainHeight(track,f.x,f.z));
  if(f.kind==='maiden')f.height=28;if(f.kind==='government')f.height=38;if(f.kind==='philharmonic')f.height=15;if(f.kind==='carpet')f.height=12;if(f.kind==='palace')f.height=13;
  const wall=['maiden','palace'].includes(f.kind)?stone:f.height>48?glass:facades[i%facades.length];extrude(scene.group,f.rings,f.height,f.floor-.5,wall,roof);
  // Cornices sit inside each mapped footprint, so narrow streets stay clear.
  if(f.distance<130&&f.kind!=='carpet')for(const r of f.rings)for(let j=0;j<r.outer.length-1;j++){
   const a=r.outer[j],b=r.outer[j+1],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<8)continue;
   let nx=dz/length,nz=-dx/length;const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;if(!inRings(f.rings,mx+nx,mz+nz)){nx=-nx;nz=-nz;}
   const x=mx+nx*.45,z=mz+nz*.45,h=Math.atan2(-dz,dx),trim=scene.box(length-.6,.32,.65,'#ded1b5',x,f.floor+f.height-.15,z);trim.rotation.y=h;
   if(i%3===0&&length>12){for(let d=2;d<length-2;d+=2.2){const px=a[0]+dx*d/length+nx*.8,pz=a[1]+dz*d/length+nz*.8;if(inRings(f.rings,px,pz))spectators.push({x:px,y:f.floor+f.height,z:pz});}if(i%7===0)addFlag(scene,scene.group,x,f.floor+f.height,z,flags);}
   if(f.height<36&&i%2===0)for(let level=2;level<Math.floor(f.height/3.5);level+=2){const balcony=scene.box(length-1,.14,.75,'#c5b89f',mx+nx*.6,f.floor+level*3.5,mz+nz*.6);balcony.rotation.y=h;const rail=scene.box(length-1,.6,.06,'#5e6a65',mx+nx*.28,f.floor+level*3.5+.4,mz+nz*.28);rail.rotation.y=h;}
  }
  if(['philharmonic','palace','government','happiness'].includes(f.kind)){
   const radius=f.kind==='government'?6:f.kind==='philharmonic'?6.8:3.5,base=f.floor+f.height;
   if(footprintClear(track,{x:f.x,z:f.z},0,new THREE.Box3(new THREE.Vector3(-radius,0,-radius),new THREE.Vector3(radius,12,radius)),8.2)){
    mesh(scene.group,new THREE.CylinderGeometry(radius*.88,radius,3,20),stone,f.x,base+1.2,f.z);const dome=mesh(scene.group,new THREE.SphereGeometry(radius,24,12,0,Math.PI*2,0,Math.PI/2),material(f.kind==='philharmonic'?'#7d8972':'#bda982',{metalness:.28}),f.x,base+2.7,f.z);dome.scale.y=.67;
    if(f.kind==='government')for(let k=0;k<8;k++){const a=k*Math.PI/4,x=f.x+Math.sin(a)*radius*.85,z=f.z+Math.cos(a)*radius*.85;mesh(scene.group,new THREE.CylinderGeometry(.35,.5,7,8),stone,x,base+3,z);}
   }
  }
  if(f.kind==='carpet'){
   // The museum's rolled-carpet silhouette, built above its mapped floor plate.
   const radius=7.5,bounds=new THREE.Box3(new THREE.Vector3(-8,0,-35),new THREE.Vector3(8,20,35));
   if(footprintClear(track,f,0,bounds,8.2)){const carpet=mesh(scene.group,new THREE.CylinderGeometry(radius,radius,65,32,1,true,.08,Math.PI*1.85),material('#d7cba5',{side:THREE.DoubleSide,metalness:.22}),f.x,f.floor+10,f.z);carpet.rotation.x=Math.PI/2;carpet.rotation.z=.21;}
  }
 }
 people(scene.group,spectators);
}
function fortress(scene,track,stone){
 const data=layout(track),cap=material('#d4bb91'),floor=(x,z)=>{let q=data.heights[0],distance=Infinity;for(const p of data.heights){const d=Math.hypot(x-p.x,z-p.z);if(d<distance){distance=d;q=p;}}return q.groundY-.5;};
 for(const [rings,height] of [[BAKU_CITY.fortressArtwork,9],[BAKU_CITY.palaceWall,6],[BAKU_CITY.castleSection,10.5]])for(const r of rings){
  extrude(scene.group,[r],height,0,stone,cap,4,floor);
  for(let j=0;j<r.outer.length-1;j++){const a=r.outer[j],b=r.outer[j+1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<2)continue;
   for(let d=1;d<len;d+=3.2){const x=a[0]+dx*d/len,z=a[1]+dz*d/len,bounds=new THREE.Box3(new THREE.Vector3(-.7,0,-.65),new THREE.Vector3(.7,1.2,.65)),h=Math.atan2(-dz,dx);if(!footprintClear(track,{x,z},h,bounds,8.2))continue;const block=scene.box(1.35,1.1,1.3,'#c9ae82',x,floor(x,z)+height+.5,z);block.rotation.y=h;}
  }
 }
 // Castle-section bastions are integrated with the roadside wall rather than
 // the unrelated district perimeter. Prepared footprints reserve their space.
 for(const [index,tower] of BAKU_CITY.castleTowers.entries()){
  const [x,z]=tower.center,y=floor(x,z),radius=tower.radius,height=tower.height;
  mesh(scene.group,new THREE.CylinderGeometry(radius*.93,radius,height,32),stone,x,y+height/2,z);
  mesh(scene.group,new THREE.CylinderGeometry(radius,radius*.94,.45,32),cap,x,y+height-.2,z);
  for(let k=0;k<14;k++){const a=k*Math.PI/7,r=radius*.87,block=scene.box(.9,1.1,.7,'#c9ae82',x+Math.sin(a)*r,y+height+.5,z+Math.cos(a)*r);block.rotation.y=a;}
  const p=sample(track,tower.s),heading=Math.atan2(p.x-x,p.z-z),slit=mesh(scene.group,new THREE.PlaneGeometry(.2,1.25),material('#514431'),x+Math.sin(heading)*radius*.98,y+height*.65,z+Math.cos(heading)*radius*.98);slit.rotation.y=heading;
  if(index===1){const flag=flagMaterial();addFlag(scene,scene.group,x,y+height+1,z,flag);}
 }
 // Visible relief and battlements remain within the Maiden Tower's render footprint.
 const tower=data.buildings.find(f=>f.kind==='maiden');if(tower)for(const r of tower.rings)for(let j=0;j<r.outer.length-1;j++){const a=r.outer[j],b=r.outer[j+1],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;if(Math.hypot(x-tower.x,z-tower.z)<4)continue;const h=Math.atan2(-(b[1]-a[1]),b[0]-a[0]);const bounds=new THREE.Box3(new THREE.Vector3(-.55,0,-.5),new THREE.Vector3(.55,1.2,.5));if(footprintClear(track,{x,z},h,bounds,8.2)){const m=scene.box(1.1,1.15,1,'#c6ab80',x,tower.floor+tower.height+.4,z);m.rotation.y=h;}}
}
function flameTowers(scene,track){
 const glass=material('#78969f',{metalness:.72,roughness:.2,emissive:'#a94d2e',emissiveIntensity:0}),steel=material('#b4b7ad',{metalness:.7,roughness:.32}),seams=[];
 for(const [index,f] of layout(track).buildings.filter(f=>f.kind==='flame').entries()){
  const height=f.height,y=Math.max(f.y,bakuTerrainHeight(track,f.x,f.z))+1,positions=[],uv=[],indices=[],sides=32,rows=40;
  const point=(t,a)=>{const radius=(17+7*Math.sin(t*Math.PI))*(1-Math.pow(t,3)*.98),bend=22*t*t,angle=.6+index*2.0;return new THREE.Vector3(f.x+Math.cos(a)*radius+Math.cos(angle)*bend,y+height*t,f.z+Math.sin(a)*radius*.69+Math.sin(angle)*bend);};
  for(let row=0;row<=rows;row++)for(let col=0;col<=sides;col++){const t=row/rows,a=col/sides*Math.PI*2,p=point(t,a);positions.push(p.x,p.y,p.z);uv.push(col/sides*6,t*height/3.8);if(row<rows&&col<sides){const k=row*(sides+1)+col;indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();mesh(scene.group,geometry,glass);
  for(let row=1;row<rows;row++)for(let col=0;col<sides;col++){const a=point(row/rows,col/sides*Math.PI*2),b=point(row/rows,(col+1)/sides*Math.PI*2);seams.push(a.x,a.y,a.z,b.x,b.y,b.z);}
  for(let col=0;col<sides;col+=2)for(let row=0;row<rows;row++){const a=point(row/rows,col/sides*Math.PI*2),b=point((row+1)/rows,col/sides*Math.PI*2);seams.push(a.x,a.y,a.z,b.x,b.y,b.z);}
  mesh(scene.group,new THREE.CylinderGeometry(28,32,3,32),steel,f.x,y-1,f.z);
 }
 const lines=new THREE.BufferGeometry();lines.setAttribute('position',new THREE.Float32BufferAttribute(seams,3));scene.group.add(new THREE.LineSegments(lines,new THREE.LineBasicMaterial({color:'#c1c6bd',transparent:true,opacity:.45})));return glass;
}
function caspian(scene,track){
 const data=layout(track),shader={...Reflector.ReflectorShader,uniforms:{...Reflector.ReflectorShader.uniforms,time:{value:0},wetness:{value:0},dusk:{value:0}},vertexShader:Reflector.ReflectorShader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec3 worldWater;').replace('vUv = textureMatrix','worldWater = (modelMatrix * vec4(position,1.0)).xyz;\n vUv = textureMatrix'),fragmentShader:`
 uniform sampler2D tDiffuse; uniform float time; uniform float wetness; uniform float dusk; varying vec4 vUv; varying vec3 worldWater;
 #include <logdepthbuf_pars_fragment>
 void main(){
  #include <logdepthbuf_fragment>
  vec2 chop=vec2(sin(worldWater.x*.17+worldWater.z*.11+time*.8),cos(worldWater.z*.23-worldWater.x*.09-time*.6));vec4 projected=vUv;projected.xy+=chop*(.0008+wetness*.0007)*vUv.w;
  float f=pow(1.0-abs(normalize(cameraPosition-worldWater).y),3.0);vec3 reflection=texture2DProj(tDiffuse,projected).rgb;vec3 blue=mix(vec3(.024,.16,.24),vec3(.03,.065,.12),dusk*.65);
  vec3 color=mix(blue,reflection,.24+f*.58);float sparkle=pow(max(0.0,sin(worldWater.x*.48+time)*cos(worldWater.z*.37-time*.9)),21.0)*.1*(1.0-wetness)*(1.0-dusk*.7);gl_FragColor=vec4(color+vec3(1.0,.78,.43)*sparkle,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`};
 const waters=[];for(const r of BAKU_CITY.sea){const water=new Reflector(new THREE.ShapeGeometry(shape(r)),{textureWidth:512,textureHeight:512,multisample:0,clipBias:.004,shader});water.rotation.x=-Math.PI/2;water.position.y=data.level;water.name='Caspian Sea — mapped Baku shoreline';const draw=water.onBeforeRender;let at=-Infinity;water.onBeforeRender=function(renderer,world,camera){const now=performance.now();if(now-at<(scene.slowFrames>25?450:200))return;at=now;draw.call(this,renderer,world,camera);};scene.group.add(water);waters.push(water);}
 // Short shoreline sections avoid the diagonal walls that previously crossed roads.
 for(const line of BAKU_CITY.shorelines)for(let i=0;i<line.length-1;i++){const a=line[i],b=line[i+1],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),count=Math.ceil(length/8);for(let j=0;j<count;j++){const x=a[0]+dx*(j+.5)/count,z=a[1]+dz*(j+.5)/count,heading=Math.atan2(-dz,dx),bounds=new THREE.Box3(new THREE.Vector3(-length/count/2,0,-1.2),new THREE.Vector3(length/count/2,2,1.2));if(!footprintClear(track,{x,z},heading,bounds,8.2))continue;const wall=scene.box(length/count+.08,1.2,1.4,'#bdb59f',x,data.level+.3,z);wall.rotation.y=heading;const rail=scene.box(length/count, .065,.065,'#7e969c',x,data.level+1.18,z);rail.rotation.y=heading;scene.box(.07,1,.07,'#738f94',x,data.level+.72,z);}}
 return waters;
}
function landscape(scene,track){
 const lawn=material('#72804d'),d=new THREE.Object3D(),sites=[],shrubs=[];
 for(const park of BAKU_CITY.parks.slice(0,130))for(const r of park.rings){const geometry=new THREE.ShapeGeometry(shape(r));geometry.rotateX(-Math.PI/2);const a=geometry.attributes.position;for(let j=0;j<a.count;j++)a.setY(j,bakuTerrainHeight(track,a.getX(j),a.getZ(j))+.035);geometry.computeVertexNormals();const m=mesh(scene.group,geometry,lawn);m.castShadow=false;}
 for(let s=20;s<track.length;s+=30)for(const side of [-1,1]){const p=sample(track,s,side*(track.width/2+21));if(waterAt(p.x,p.z)||buildingAt(track,p.x,p.z))continue;const bounds=new THREE.Box3(new THREE.Vector3(-2,0,-2),new THREE.Vector3(2,10,2));if(!footprintClear(track,p,0,bounds,8))continue;sites.push({x:p.x,z:p.z,y:bakuTerrainHeight(track,p.x,p.z),height:7+s%4});for(let j=-1;j<=1;j++)shrubs.push({x:p.x+j*2,z:p.z+3,y:bakuTerrainHeight(track,p.x+j*2,p.z+3)+.4});}
 const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.15,.26,1,7),material('#706348'),sites.length),crowns=new THREE.InstancedMesh(new THREE.ConeGeometry(1.3,1,9,3),material('#405e3b'),sites.length);
 sites.forEach((p,i)=>{d.position.set(p.x,p.y+2,p.z);d.scale.set(1,4,1);d.updateMatrix();trunks.setMatrixAt(i,d.matrix);d.position.y=p.y+p.height*.57;d.scale.set(1,p.height,1);d.updateMatrix();crowns.setMatrixAt(i,d.matrix);});
 const bushes=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.75,1),material('#6d7b4d'),shrubs.length);shrubs.forEach((p,i)=>{d.position.set(p.x,p.y,p.z);d.scale.set(1,.65,1);d.updateMatrix();bushes.setMatrixAt(i,d.matrix);});for(const m of [trunks,crowns,bushes]){m.computeBoundingSphere();m.castShadow=true;m.receiveShadow=true;scene.group.add(m);}
}
function stands(scene,track){
 const flag=flagMaterial(),height=(x,z)=>bakuTerrainHeight(track,x,z);
 for(const [fraction,side,title] of [[.975,-1,'ABSHERON'],[.10,-1,'SAHIL'],[.26,1,'ICHERISHEHER'],[.71,1,'BULVAR']]){
  const p=safeBoxSite(track,track.length*fraction,13,43,side,9),g=group(scene,{...p,y:height(p.x,p.z)},p.heading+(side<0?Math.PI:0)),rows=16,persons=[];
  for(let r=0;r<rows;r++){const x=r*.95-7.5,y=r*.55;scene.box(.95,.23,80,'#859295',x,y,0,g);for(let col=0;col<88;col++)persons.push({x,y:y+.15,z:-39.2+col*.9});}
  for(let z=-39;z<41;z+=8){for(const x of [-8,0,8])scene.box(.12,9,.12,'#69777a',x,3.4,z,g);beam(scene,g,new THREE.Vector3(-8,0,z),new THREE.Vector3(8,8.3,z));beam(scene,g,new THREE.Vector3(8,0,z),new THREE.Vector3(-8,8.3,z));}
  scene.box(.14,1.15,80,'#657276',-8,1,0,g);const banner=trackSign(title+' · BAKU',66,1.5,'#692440','#f1e8d9');banner.position.set(-8.2,1.8,0);banner.rotation.y=-Math.PI/2;g.add(banner);people(g,persons);for(const z of [-32,-10,12,34])addFlag(scene,g,7.8,8.4,z,flag);
  placeDecoration(scene,track,g,height,{s:fraction*track.length,side,followTrack:true,margin:8.2,accept:(x,z)=>!waterAt(x,z)&&!buildingAt(track,x,z)});
 }
}
function dressing(scene,track){
 const walls=trackBarriers(track).walls.filter(w=>w.kind==='track'),sponsors=[['QATAR AIRWAYS','#62233d','#f5e9d6'],['aramco','#087b54','#f0f4e8'],['Heineken ★','#0b6144','#ffffff']],signs=sponsors.map(([name,bg,ink])=>trackSign(name,4,.72,bg,ink).material),rubber=material('#25292a'),panels=[];
 for(let i=0;i<walls.length;i++){
  const w=walls[i],n=w.inward,length=w.length;if(!n||length<.2)continue;const sign=mesh(scene.group,new THREE.PlaneGeometry(length,.72),signs[Math.floor(i/125)%3],w.x+n.x*(w.width/2+.016),(w.a.y+w.b.y)/2+.57,w.z+n.z*(w.width/2+.016));sign.rotation.y=Math.atan2(n.x,n.z);sign.castShadow=false;
  if(i%3===0&&Math.abs(w.x+650)<500&&w.z<100){const pad=mesh(scene.group,new THREE.BoxGeometry(w.width+.015,.68,length),rubber,w.x,(w.a.y+w.b.y)/2+.37,w.z);pad.rotation.y=Math.atan2(w.tx,w.tz);}
 }
 const height=(x,z)=>bakuTerrainHeight(track,x,z);
 for(let i=0;i<22;i++){
  const s=(i+.25)/22*track.length,side=i%2?1:-1,p=safeBoxSite(track,s,1.6,2.3,side,8.5),g=group(scene,{...p,y:height(p.x,p.z)},p.heading);
  for(const x of [-.6,.6]){scene.box(.32,.65,.28,'#ed722f',x,.99,0,g);for(const dx of [-.1,.1])scene.box(.13,.67,.16,'#e7682a',x+dx,.33,0,g);mesh(g,new THREE.SphereGeometry(.16,8,6),material('#eeebe0'),x,1.49,0);scene.box(.34,.04,.29,'#e9e9d8',x,1.12,0,g);}
  scene.box(.09,3.6,.09,'#3d4b50',1.35,1.8,0,g);const panel=mesh(g,new THREE.BoxGeometry(.9,.65,.12),new THREE.MeshBasicMaterial({color:'#3bda8c',toneMapped:false}),1.35,3.1,0,false);panels.push(panel);
  placeDecoration(scene,track,g,height,{s,side,margin:8,accept:(x,z)=>!waterAt(x,z)&&!buildingAt(track,x,z)});
 }
 for(const fraction of [.17,.57,.88]){const p=sample(track,fraction*track.length),span=track.width/2+10,bounds=new THREE.Box3(new THREE.Vector3(-.8,0,-.8),new THREE.Vector3(.8,8,.8));if([-span,span].some(x=>!footprintClear(track,{x:p.x+Math.cos(p.heading)*x,z:p.z-Math.sin(p.heading)*x},0,bounds,7.8)))continue;
  const g=group(scene,p,p.heading);for(const x of [-span,span]){for(const z of [-.7,.7])scene.box(.19,8.8,.19,'#7c8689',x,4.4,z,g);for(let y=1;y<8;y+=2)beam(scene,g,new THREE.Vector3(x,y,-.7),new THREE.Vector3(x,y+2,.7));}scene.box(span*2+1,.16,1.6,'#a6acaa',0,9,0,g);scene.box(span*2+1,1.4,1.5,'#66273f',0,7.8,0,g);const sign=trackSign('QATAR AIRWAYS · BAKU',span*2,1.25,'#62233d','#f3e5d0');sign.position.set(0,7.8,.77);g.add(sign);const back=sign.clone();back.rotation.y=Math.PI;back.position.z=-.77;g.add(back);
 }
 for(const fraction of [.04,.35,.79]){const p=safeBoxSite(track,fraction*track.length,6,9,1,12),g=group(scene,{...p,y:height(p.x,p.z)},p.heading);scene.box(3,1.5,5,'#c9c9b6',0,.9,0,g);scene.box(1.8,1.3,1.8,'#5c7880',0,2.1,-1,g);beam(scene,g,new THREE.Vector3(0,2,1),new THREE.Vector3(0,16,-3),'#d5ac46',.3);beam(scene,g,new THREE.Vector3(0,16,-3),new THREE.Vector3(0,19,-7),'#d7bb70',.2);scene.box(.9,.65,1.2,'#283539',0,19,-7,g);scene.box(.035,5,.035,'#5b6969',0,16,-7,g);placeDecoration(scene,track,g,height,{s:fraction*track.length,side:1,margin:8.2,accept:(x,z)=>!waterAt(x,z)&&!buildingAt(track,x,z)});}
 const p=safeBoxSite(track,track.length-150,17,78,1,12),pit=group(scene,{...p,y:height(p.x,p.z)},p.heading);scene.box(19,6,146,'#c9c6b8',0,3,0,pit);scene.box(19.5,2,146,'#43616e',0,5,0,pit);scene.box(23,.4,150,'#e2dccd',0,6.3,0,pit);for(let z=-65;z<72;z+=9){scene.box(.15,3.3,7,'#555f61',-9.6,1.7,z,pit);scene.box(.9,.5,1.1,'#202c34',-11,3.9,z,pit);beam(scene,pit,new THREE.Vector3(-9,4,z),new THREE.Vector3(-12,4,z),'#727c7e',.12);}placeDecoration(scene,track,pit,height,{s:track.length-150,side:1,margin:8.2,accept:(x,z)=>!waterAt(x,z)&&!buildingAt(track,x,z)});
 addBrakingBoards(scene,track);return panels;
}
export function addBaku(scene,track){
 const stone=limestone(),waters=caspian(scene,track);town(scene,track,stone);fortress(scene,track,stone);const glass=flameTowers(scene,track);landscape(scene,track);stands(scene,track);const panels=dressing(scene,track);let wetness=0,start=performance.now(),skyStep=-1;
 const warm=new THREE.Color('#ffd09a'),cool=new THREE.Color('#a8b8d2');
 const lighting=phase=>{scene.sun.color.copy(warm).lerp(cool,phase*.75+wetness*.2);scene.sun.intensity=(3.25-phase*2.35)*(1-wetness*.63);scene.hemisphere.intensity=.95+wetness*.2-phase*.18;scene.hemisphere.color.set('#b5c9df');scene.scene.fog.density=Math.max(.00017,wetness*.0009);glass.emissiveIntensity=.02+phase*.5;};
 scene.environmentFx={frame(time,cars){const phase=smooth((time-start)/480000);scene.profile.caspianPhase=phase;lighting(phase);const step=Math.floor(phase*16);if(step!==skyStep){scene.atmosphere.set(scene.profile,scene.appearance,wetness);skyStep=step;}for(const water of waters){water.material.uniforms.time.value=time*.001;water.material.uniforms.dusk.value=phase;}for(const [i,flag] of (scene.group.userData.bakuFlags||[]).entries()){const a=flag.geometry.attributes.position;for(let j=0;j<a.count;j++)a.setZ(j,Math.sin(time*.002+a.getX(j)*4+i)*.055*(a.getX(j)+.7));a.needsUpdate=true;}const warning=cars?.some(c=>!c.finished&&(c.offtrack||c.sliding));for(const panel of panels)panel.material.color.set(warning?'#ffca36':'#3bda8c');},setConditions(w){wetness=w;skyStep=-1;for(const water of waters)water.material.uniforms.wetness.value=w;lighting(scene.profile.caspianPhase||0);},dispose(){for(const water of waters)water.getRenderTarget().dispose();disposeRejectedDecorations(scene.group);}};
 return scene.profile;
}
