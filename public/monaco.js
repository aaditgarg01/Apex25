import * as THREE from '/vendor/three.module.js';
import {Reflector} from '/vendor/Reflector.js';
import {MONACO_CITY} from './data/monaco-city.js';
import {sample,terrainHeight,wrap} from '/shared/tracks.mjs';
import {roadClearance,safeBoxSite} from '/shared/venues.mjs';
import {trackBarriers} from '/shared/barriers.mjs';
import {trackSign,addBrakingBoards} from './track-furniture.js';
import {addVegetation} from './vegetation.js';
import {batchBoxes,batchMapped} from './batching.js';

const cache=new WeakMap(),material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra}),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
function local(track,[lon,lat]){return{x:(lon-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(lat-track.origin.lat)*111320};}
function contains(points,x,z){let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)yes=!yes;}return yes;}
function shapeFrom(rings){const shape=new THREE.Shape();rings.outer.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();for(const ring of rings.holes||[]){const hole=new THREE.Path();ring.forEach((p,i)=>i?hole.lineTo(p.x,-p.z):hole.moveTo(p.x,-p.z));hole.closePath();shape.holes.push(hole);}return shape;}
function layout(track){
 if(cache.has(track))return cache.get(track);
 const sea=MONACO_CITY.seaOuter.map(p=>local(track,p)),holes=MONACO_CITY.seaHoles.map(r=>r.map(p=>local(track,p))),harbor=MONACO_CITY.harbor.map(p=>local(track,p)),level=Math.min(...track.points.map(p=>p.y))-.7,heights=track.points.filter((_,i)=>i%5===0);
 const mapped=MONACO_CITY.buildings.map(f=>{const points=f.points.slice(0,-1).map(p=>local(track,p)),x=points.reduce((sum,p)=>sum+p.x,0)/points.length,z=points.reduce((sum,p)=>sum+p.z,0)/points.length;let nearest=heights[0],distance=Infinity;for(const p of heights){const d=Math.hypot(x-p.x,z-p.z);if(d<distance){distance=d;nearest=p;}}const rings=f.renderRings.map(r=>({outer:r.outer.map(([x,z])=>({x,z})),holes:r.holes.map(h=>h.map(([x,z])=>({x,z})))}));return{...f,x,z,y:nearest.groundY-.15,distance,rings,points,height:clamp(Number(f.tags.height)||Number(f.tags['building:levels']||5)*3.1,7,95)};});
 const data={sea,holes,harbor,level,heights,mapped};cache.set(track,data);return data;
}
function waterAt(track,x,z){const p=layout(track);return contains(p.sea,x,z)&&!p.holes.some(r=>contains(r,x,z));}
function buildingAt(track,x,z){return layout(track).mapped.some(f=>f.rings.some(r=>contains(r.outer,x,z)&&!r.holes.some(h=>contains(h,x,z))));}
export function monacoTerrainHeight(track,x,z,cell=0){
 const p=layout(track);if(waterAt(track,x,z))return p.level-1.1;
 let distance=Infinity,nearest=p.heights[0],floor=Infinity;for(const q of p.heights){const d=Math.hypot(x-q.x,z-q.z);if(d<distance){distance=d;nearest=q;}if(d<track.width/2+Math.SQRT2*cell+12)floor=Math.min(floor,q.y-.9);}
 const existing=nearest.groundY-.9,north=Math.max(0,-z-180)*.13,west=Math.max(0,-x-220)*.085,cliffs=7*Math.sin(x*.011)*Math.cos(z*.008),hills=existing+Math.max(north,west)+cliffs;
 let y=existing+(hills-existing)*smooth((distance-24)/150);
 return Number.isFinite(floor)?Math.min(y,floor):y;
}
function mesh(parent,geo,mat,x=0,y=0,z=0,staticGeometry=true){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.receiveShadow=true;o.castShadow=true;o.userData.mappedStatic=staticGeometry;parent.add(o);return o;}
function group(scene,p,h=0){const g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=h;scene.group.add(g);return g;}
function beam(scene,parent,a,b,color='#929d9e',width=.1){const d=b.clone().sub(a),o=scene.box(width,d.length(),width,color,...a.clone().add(b).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
function harborWater(scene,track){
 const p=layout(track),shader={...Reflector.ReflectorShader,uniforms:{...Reflector.ReflectorShader.uniforms,time:{value:0},wetness:{value:0}},vertexShader:Reflector.ReflectorShader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec3 waterPosition;').replace('vUv = textureMatrix','waterPosition = (modelMatrix * vec4(position,1.0)).xyz;\n vUv = textureMatrix'),fragmentShader:`
 uniform sampler2D tDiffuse; uniform float time; uniform float wetness; varying vec4 vUv; varying vec3 waterPosition;
 #include <logdepthbuf_pars_fragment>
 void main(){
  #include <logdepthbuf_fragment>
  vec2 ripple=vec2(sin(waterPosition.x*.23+waterPosition.z*.15+time*.7),cos(waterPosition.z*.27-waterPosition.x*.11+time*.5));
  vec4 projected=vUv;projected.xy+=ripple*(.00055+wetness*.0006)*vUv.w;
  vec3 reflection=texture2DProj(tDiffuse,projected).rgb;float fresnel=pow(1.0-abs(normalize(cameraPosition-waterPosition).y),3.0);
  vec3 blue=mix(vec3(.017,.17,.24),vec3(.06,.14,.19),wetness);vec3 color=mix(blue,reflection,.28+fresnel*.58);
  float glitter=pow(max(0.0,sin(waterPosition.x*.51+time)*cos(waterPosition.z*.49-time*.6)),19.0)*.08*(1.0-wetness);
  gl_FragColor=vec4(color+glitter,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`};
 const water=new Reflector(new THREE.ShapeGeometry(shapeFrom({outer:p.sea,holes:p.holes})),{textureWidth:512,textureHeight:512,multisample:0,clipBias:.003,shader});water.rotation.x=-Math.PI/2;water.position.y=p.level;water.name='Port Hercule and Mediterranean — mapped coastline';scene.group.add(water);const draw=water.onBeforeRender;let refreshed=-Infinity;
 water.onBeforeRender=function(renderer,world,camera){const time=performance.now(),interval=scene.slowFrames>25||renderer.getPixelRatio()<1?450:190;if(time-refreshed<interval)return;refreshed=time;draw.call(this,renderer,world,camera);};return water;
}
function facade(color){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,256,256);ctx.fillStyle='#c9baa1';ctx.fillRect(0,238,256,12);ctx.fillStyle='#ece5d4';ctx.fillRect(52,34,152,181);ctx.fillStyle='#496776';ctx.fillRect(62,44,132,158);ctx.fillStyle='#90adbb';ctx.fillRect(69,49,18,145);ctx.fillStyle='#e8e1cf';ctx.fillRect(122,44,8,158);ctx.fillRect(62,113,132,7);ctx.fillStyle='#a9a78e';for(let x=24;x<48;x+=4)ctx.fillRect(x,41,2,164);for(let x=211;x<235;x+=4)ctx.fillRect(x,41,2,164);ctx.strokeStyle='#cec1a9';ctx.lineWidth=2;ctx.strokeRect(0,0,256,256);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=8;return material('#ffffff',{map:texture,bumpMap:texture,bumpScale:.022,roughness:.68});
}
function spectatorInstances(parent,positions){
 const dummy=new THREE.Object3D(),bodies=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.17,.31,2,5),material('#ffffff'),positions.length),heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.115,6,5),material('#ffffff'),positions.length);
 positions.forEach((p,i)=>{dummy.position.set(p.x,p.y+.58,p.z);dummy.rotation.set(0,p.heading||0,0);dummy.scale.setScalar(1);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);bodies.setColorAt(i,new THREE.Color(['#eee9de','#ddcba9','#d1483c','#335f80','#dfbf56','#e5d9c1','#367560'][i%7]));dummy.position.y+=.43;dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);heads.setColorAt(i,new THREE.Color(['#d9b995','#ba9372','#9c7658'][i%3]));});for(const o of [bodies,heads]){o.computeBoundingSphere();parent.add(o);}
}
function geometrySurface(source,materialIndex){const groups=source.groups.filter(g=>g.materialIndex===materialIndex),geometry=new THREE.BufferGeometry();for(const [name,attribute] of Object.entries(source.attributes)){const values=[];for(const g of groups)for(let i=g.start*attribute.itemSize;i<(g.start+g.count)*attribute.itemSize;i++)values.push(attribute.array[i]);geometry.setAttribute(name,new THREE.Float32BufferAttribute(values,attribute.itemSize));}return geometry;}
function spectatorFlag(scene,parent,x,y,z,heading=0){
 if(!scene.group.userData.rivieraFlagMaterial){const canvas=document.createElement('canvas');canvas.width=192;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#c9353d';ctx.fillRect(0,0,192,64);ctx.fillStyle='#f4efe4';ctx.fillRect(0,64,192,64);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;scene.group.userData.rivieraFlagMaterial=material('#ffffff',{map,side:THREE.DoubleSide});scene.group.userData.rivieraFlags=[];}
 mesh(parent,new THREE.CylinderGeometry(.015,.015,1.5,4),material('#b6c5c0'),x,y-.35,z);const flag=mesh(parent,new THREE.PlaneGeometry(1,.67,7,2),scene.group.userData.rivieraFlagMaterial,x+.5,y,z,false);flag.rotation.y=heading;flag.castShadow=false;scene.group.userData.rivieraFlags.push({flag,heading});
}
function city(scene,track){
 const p=layout(track),palette=['#dfcbb4','#ead9bd','#dcbba9','#e5dfcd','#cfc7b9','#e8cdbc'],facades=palette.map(facade),roofs=[material('#b7765c'),material('#c2baaa')],people=[],blooms=[],bloomMaterial=material('#c6538a'),bloomGeo=new THREE.IcosahedronGeometry(.23,1),dummy=new THREE.Object3D();
 for(let i=0;i<p.mapped.length;i++){
  const f=p.mapped[i],special=['161769674','157719657','156242249','94252402'].includes(f.way);let height=f.height,y=f.distance<90?f.y:monacoTerrainHeight(track,f.x,f.z);
  if(f.way==='161769674')height=17;if(f.way==='157719657')height=26;if(f.way==='94252402')height=25;
  if(f.way==='156242249'){height=18;const center=local(track,[7.4293,43.7382]);let index=0,distance=Infinity;track.points.forEach((q,i)=>{const d=Math.hypot(q.x-center.x,q.z-center.z);if(d<distance){distance=d;index=i;}});const covered=track.points.filter((q,i)=>Math.min(wrap(i-index,track.points.length),wrap(index-i,track.points.length))*track.step<98&&contains(f.points,q.x,q.z));y=covered.length?Math.max(...covered.map(q=>q.y))+6.2:f.y;}
  f.floor=y;f.renderHeight=height;const wall=facades[i%facades.length],roof=roofs[i%2];
  for(const rings of f.rings){const geometry=new THREE.ExtrudeGeometry(shapeFrom(rings),{depth:height,bevelEnabled:false}),uv=geometry.attributes.uv;for(let j=0;j<uv.count;j++)uv.setXY(j,uv.getX(j)/3.4,uv.getY(j)/3.2);for(const [index,mat] of [[0,roof],[1,wall]]){const part=geometrySurface(geometry,index),building=mesh(scene.group,part,mat,0,y,0);building.rotation.x=-Math.PI/2;}geometry.dispose();}
  // Balcony strips follow actual facade edges; road-adjacent projections are checked separately.
  if(f.distance>110||special)continue;
  for(const rings of f.rings){const outer=rings.outer;for(let j=0;j<outer.length-1;j++){const a=outer[j],b=outer[j+1],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<7)continue;const nx=dz/length,nz=-dx/length,mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,inside=contains(outer,mx+nx*.5,mz+nz*.5),sign=inside?-1:1,ox=nx*sign,oz=nz*sign,heading=Math.atan2(-dz,dx);
   for(let level=2;level<Math.min(10,Math.floor(height/3.1));level+=2){const by=y+level*3.1;for(let d=2.6;d<length-2;d+=5.2){const x=a.x+dx*d/length+ox*.7,z=a.z+dz*d/length+oz*.7;if(roadClearance(track,x,z)<2)continue;const balcony=scene.box(3.5,.16,1.35,'#ddd8c8',x,by,z);balcony.rotation.y=heading;const rail=scene.box(3.5,.065,.06,'#7e999f',x+ox*.6,by+1,z+oz*.6);rail.rotation.y=heading;for(const side of [-1,1])scene.box(.06,1,.06,'#84989b',x+dx/length*side*1.6+ox*.6,by+.5,z+dz/length*side*1.6+oz*.6);if((i+j+level)%5===0)people.push({x,y:by+.15,z});if((i+j+level)%7===0)for(let k=0;k<5;k++)blooms.push({x:x+dx/length*(k-2)*.3+ox*.55,y:by+.88,z:z+dz/length*(k-2)*.3+oz*.55});}
   }
  }}
 }
 spectatorInstances(scene.group,people);for(let i=0;i<people.length;i+=24){const p=people[i];spectatorFlag(scene,scene.group,p.x,p.y+1.6,p.z);}const flowers=new THREE.InstancedMesh(bloomGeo,bloomMaterial,blooms.length);blooms.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.set(1.3,.8,1);dummy.updateMatrix();flowers.setMatrixAt(i,dummy.matrix);});flowers.computeBoundingSphere();scene.group.add(flowers);
 casinoDetail(scene,track);return p.mapped;
}
function casinoDetail(scene,track){
 const data=layout(track),casino=data.mapped.find(f=>f.way==='161769674'),points=casino.points,x0=Math.min(...points.map(p=>p.x)),x1=Math.max(...points.map(p=>p.x)),z0=Math.min(...points.map(p=>p.z)),g=group(scene,{x:0,y:casino.floor,z:0}),stone=material('#ecddc3'),bronze=material('#668a83',{metalness:.38,roughness:.44});
 for(const x of [x0+12,x1-12]){mesh(g,new THREE.CylinderGeometry(4.1,4.4,8,16),stone,x,20,z0+13);mesh(g,new THREE.SphereGeometry(4.4,20,12,0,Math.PI*2,0,Math.PI/2),bronze,x,24,z0+13);scene.box(.12,3,.12,'#c2ad7c',x,29,z0+13,g);const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#ede6d2';ctx.beginPath();ctx.arc(128,128,121,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#856f4e';ctx.lineWidth=8;ctx.stroke();ctx.strokeStyle='#35464c';ctx.lineWidth=4;for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.beginPath();ctx.moveTo(128+Math.sin(a)*95,128-Math.cos(a)*95);ctx.lineTo(128+Math.sin(a)*108,128-Math.cos(a)*108);ctx.stroke();}ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(128,128);ctx.lineTo(96,82);ctx.moveTo(128,128);ctx.lineTo(192,128);ctx.stroke();const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const clock=mesh(g,new THREE.CircleGeometry(1.15,32),material('#ffffff',{map:texture}),x,21.5,z0+8.5);clock.rotation.y=Math.PI;}
 for(let x=x0+9;x<x1-8;x+=5.8){if(roadClearance(track,x,z0-1)<2)continue;mesh(g,new THREE.CylinderGeometry(.3,.44,9,8),stone,x,8.9,z0+1);scene.box(2.5,.32,1.3,'#e7d4b3',x,13.8,z0+1,g);mesh(g,new THREE.SphereGeometry(.8,8,6),stone,x,15.1,z0+1);}
 const front=trackSign('CASINO DE MONTE-CARLO',Math.min(39,x1-x0-15),1.4,'#e5d4b5','#8d683b');front.position.set((x0+x1)/2,14.4,z0-.15);front.rotation.y=Math.PI;g.add(front);
 const paris=data.mapped.find(f=>f.way==='157719657');for(const rings of paris.rings){const x=rings.outer.reduce((s,p)=>s+p.x,0)/rings.outer.length,z=rings.outer.reduce((s,p)=>s+p.z,0)/rings.outer.length;const roof=mesh(scene.group,new THREE.SphereGeometry(7,16,10,0,Math.PI*2,0,Math.PI/2),bronze,x,paris.floor+paris.renderHeight,z);roof.scale.set(1.4,.8,1);}
}
function yachts(scene,track){
 const boats=[],white=material('#f1eee5',{roughness:.4}),glass=material('#477486',{metalness:.52,roughness:.17}),p=layout(track);
 for(let i=0;i<MONACO_CITY.boats.length;i++){
  const record=MONACO_CITY.boats[i],position=local(track,record.location),g=group(scene,{...position,y:p.level},record.heading),w=record.width,l=record.length;
  const outline=new THREE.Shape();outline.moveTo(-w/2,-l*.44);outline.lineTo(w/2,-l*.44);outline.lineTo(w*.48,l*.20);outline.quadraticCurveTo(w*.43,l*.43,0,l*.56);outline.quadraticCurveTo(-w*.43,l*.43,-w*.48,l*.20);outline.closePath();const hull=mesh(g,new THREE.ExtrudeGeometry(outline,{depth:2.6,bevelEnabled:true,bevelSegments:2,bevelSize:.18,bevelThickness:.18}),white,0,-.8,0);hull.rotation.x=Math.PI/2;hull.position.y=1.8;
  scene.box(w*.87,.16,l*.83,'#b9946d',0,1.85,0,g);
  for(let deck=0;deck<3;deck++){const dw=w*(.73-deck*.12),dl=l*(.57-deck*.13),y=2.7+deck*1.8,z=-l*.04+deck*.07*l;mesh(g,new THREE.BoxGeometry(dw,1.05,dl),glass,0,y+.2,z);scene.box(dw+.5,.23,dl+1,'#f1efe6',0,y+.86,z,g);for(const x of [-dw/2-.16,dw/2+.16])scene.box(.045,.5,dl,'#c5d4d1',x,y+.68,z,g);}
  scene.box(.16,6.7,.16,'#c7d1cd',0,8.4,0,g);beam(scene,g,new THREE.Vector3(-w*.4,6,0),new THREE.Vector3(w*.4,6,0),'#bbc9c9',.09);mesh(g,new THREE.SphereGeometry(.8,12,8),white,0,7.7,-l*.05);
  for(const x of [-w*.34,w*.34])for(const z of [-l*.29,-l*.18])scene.box(1.1,.22,2,'#d7c2a1',x,2.12,z,g);
  const people=[];for(let j=0;j<12;j++)people.push({x:(j%4-1.5)*w*.18,y:2,z:-l*.34+Math.floor(j/4)*2.2});spectatorInstances(g,people);spectatorFlag(scene,g,0,3,-l*.43,Math.PI);
  const pool=mesh(g,new THREE.PlaneGeometry(w*.30,l*.11),material('#4aa6b7',{roughness:.23,metalness:.25}),0,2.02,-l*.31);pool.rotation.x=-Math.PI/2;
  batchBoxes(g,Infinity);batchMapped(g);boats.push({g,base:p.level,index:i});
 }
 return boats;
}
function harborStands(scene,track){
 for(const fraction of [.72,.78,.84]){const s=fraction*track.length,a=sample(track,s,30),side=waterAt(track,a.x,a.z)?1:-1,p=safeBoxSite(track,s,10,29,side,4);if(!waterAt(track,p.x,p.z))continue;const g=group(scene,{...p,y:Math.max(p.y,layout(track).level+3.8)},p.heading+(side>0?Math.PI:0)),rows=14,length=54;
  for(let row=0;row<rows;row++)scene.box(1.1,.2,length,'#a3ada9',7-row*1.05,.3+row*.55,0,g);for(let z=-26;z<=26;z+=6){for(const x of [-7,0,7])scene.box(.11,10,.11,'#929f9f',x,.5,z,g);beam(scene,g,new THREE.Vector3(7,.1,z),new THREE.Vector3(-7,7.6,z));beam(scene,g,new THREE.Vector3(-7,-4,z),new THREE.Vector3(7,.2,z));}
  const people=[];for(let row=0;row<rows;row++)for(let col=0;col<48;col++)people.push({x:7-row*1.05,y:.45+row*.55,z:-25+col*1.06});spectatorInstances(g,people);for(const z of [-22,-8,8,22])spectatorFlag(scene,g,-4,5.3,z);const banner=trackSign('MONACO GRAND PRIX',38,1,'#e6dcc8','#735340');banner.position.set(8,.5,0);banner.rotation.y=Math.PI/2;g.add(banner);
 }
}
function planting(scene,track){
 const palms=[],trees=[],dummy=new THREE.Object3D(),topiary=[];
 for(const point of [[7.4273,43.7397],[7.4276,43.7398],[7.4280,43.73985],[7.4284,43.7398],[7.4273,43.7400],[7.4278,43.7401],[7.4281,43.7400],[7.4272,43.7387],[7.4267,43.7389]]){const p=local(track,point);if(roadClearance(track,p.x,p.z)<3||buildingAt(track,p.x,p.z))continue;palms.push({...p,y:terrainHeight(track,p.x,p.z),scale:.78,angle:p.x*.03});mesh(scene.group,new THREE.CylinderGeometry(.85,.7,.75,9),material('#d3bd9a'),p.x,palms.at(-1).y+.35,p.z);topiary.push({...p,y:palms.at(-1).y});}
 for(let s=0;s<track.length;s+=62)for(const side of [-1,1]){const p=sample(track,s,side*(track.width/2+14));if(roadClearance(track,p.x,p.z)<4||waterAt(track,p.x,p.z)||buildingAt(track,p.x,p.z))continue;palms.push({...p,y:monacoTerrainHeight(track,p.x,p.z),scale:.65,angle:s*.01});}
 addVegetation(scene,track,scene.profile,{sites:palms,palms:true});
 for(let i=0;i<190;i++){const x=-450+Math.sin(i*4.72)*480,z=-600-Math.abs(Math.cos(i*2.15))*450;if(buildingAt(track,x,z)||waterAt(track,x,z))continue;trees.push({x,z,y:monacoTerrainHeight(track,x,z),scale:1.0+(i%4)*.12,angle:i});}addVegetation(scene,track,scene.profile,{sites:trees,palms:false});
 const shrubs=[];for(const p of topiary)for(let i=0;i<3;i++){const x=p.x+2+i*1.7,z=p.z+2;if(roadClearance(track,x,z)<2||buildingAt(track,x,z)||waterAt(track,x,z))continue;shrubs.push({x,y:p.y+.8,z});}const bushes=new THREE.InstancedMesh(new THREE.SphereGeometry(.9,9,6),material('#446d47'),shrubs.length);shrubs.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.set(.9,1.1,.9);dummy.updateMatrix();bushes.setMatrixAt(i,dummy.matrix);});bushes.computeBoundingSphere();bushes.castShadow=true;scene.group.add(bushes);
}
function cliffs(scene,track){
 const geometry=new THREE.PlaneGeometry(1700,600,56,20);geometry.rotateX(-Math.PI/2);const vertices=geometry.attributes.position;for(let i=0;i<vertices.count;i++){const x=vertices.getX(i)-100,z=vertices.getZ(i)-1350,y=180+75*Math.sin(x*.005)+35*Math.cos(z*.015)+24*Math.sin((x-z)*.021);vertices.setXYZ(i,x,y,z);}geometry.computeVertexNormals();mesh(scene.group,geometry,material('#b3b2a0',{flatShading:true}));
}
function tunnel(scene,track){
 // Retain the existing curved cover and walls exactly; decorate the ceiling only.
 const center=local(track,[7.4293,43.7382]);let index=0,best=Infinity;track.points.forEach((p,i)=>{const d=Math.hypot(p.x-center.x,p.z-center.z);if(d<best){best=d;index=i;}});const s0=index*track.step;
 for(let s=s0-90;s<s0+90;s+=8){const p=sample(track,s),g=group(scene,p,p.heading);scene.box(track.width+3,.7,8.4,'#b0b1a6',0,5.5,0,g);for(const x of [-track.width/2-1,track.width/2+1])scene.box(.5,5.5,8.4,'#b7b8b0',x,2.75,0,g);const lamp=mesh(g,new THREE.BoxGeometry(2.7,.055,.21),new THREE.MeshBasicMaterial({color:'#f7f1d9',toneMapped:false}),0,5.10,0);lamp.castShadow=false;}
 const lights=[];for(const distance of [-55,0,55]){const p=sample(track,s0+distance),light=new THREE.PointLight('#efe7d0',130,32,2);light.position.set(p.x,p.y+4.7,p.z);scene.group.add(light);lights.push(light);}return lights;
}
function pocket(track,s,halfWidth,halfLength,side,margin){
 for(const delta of [0,12,-12,25,-25,45,-45,70,-70])for(const extra of [0,5,12,22]){const p=safeBoxSite(track,s+delta,halfWidth,halfLength,side,margin+extra);let clear=true;for(const x of [-halfWidth,0,halfWidth])for(const z of [-halfLength,0,halfLength]){const wx=p.x+Math.cos(p.heading)*x+Math.sin(p.heading)*z,wz=p.z-Math.sin(p.heading)*x+Math.cos(p.heading)*z;if(buildingAt(track,wx,wz)||waterAt(track,wx,wz))clear=false;}if(clear)return p;}return null;
}
function dressing(scene,track){
 const sponsors=[['ROLEX','#085d40','#ddc781'],['TAG HEUER','#9c3134','#f1eadf'],['Emirates FLY BETTER','#bb3037','#f3eee4']],signs=sponsors.map(([name,bg,ink])=>trackSign(name,3,.53,bg,ink).material),walls=trackBarriers(track).walls.filter(w=>w.kind==='track');
 for(let i=0;i<walls.length;i++){const w=walls[i],nx=w.inward?.x||0,nz=w.inward?.z||0,length=Math.hypot(w.b.x-w.a.x,w.b.z-w.a.z);if(length<.3)continue;const sign=mesh(scene.group,new THREE.PlaneGeometry(length,.53),signs[Math.floor(i/95)%3],w.x+nx*(w.width/2+.016),(w.a.y+w.b.y)/2+.46,w.z+nz*(w.width/2+.016));sign.rotation.y=Math.atan2(nx,nz);sign.castShadow=false;}
 for(let i=0;i<15;i++){const s=(i+.3)/15*track.length,p=pocket(track,s,1.4,2.4,i%2?1:-1,2);if(!p)continue;const g=group(scene,{...p,y:terrainHeight(track,p.x,p.z)},p.heading);scene.box(.18,1.8,.18,'#ec7b29',-1,.9,0,g);scene.box(.18,1.8,.18,'#ec7b29',1,.9,0,g);for(let j=0;j<2;j++){const x=j*.6-.3;scene.box(.31,.63,.25,'#ed7b28',x,1.01,0,g);for(const leg of [-.1,.1])scene.box(.12,.69,.15,'#d76426',x+leg,.37,0,g);mesh(g,new THREE.SphereGeometry(.14,8,6),material('#eeeade'),x,1.49,0);}scene.box(.12,2.9,.12,'#384d4a',-1,1.45,0,g);const panel=mesh(g,new THREE.PlaneGeometry(.8,.55),new THREE.MeshBasicMaterial({color:'#39d698',toneMapped:false}),-1,2.6,-.08);panel.rotation.y=Math.PI;panel.castShadow=false;}
 for(const record of MONACO_CITY.utilityNodes){const point=local(track,record.location);if(roadClearance(track,point.x,point.z)<8)continue;let road=track.points[0],distance=Infinity;for(const q of track.points){const d=Math.hypot(point.x-q.x,point.z-q.z);if(d<distance){distance=d;road=q;}}const p={...point,y:Math.max(layout(track).level+1.2,monacoTerrainHeight(track,point.x,point.z)),heading:road.heading},g=group(scene,p,p.heading);scene.box(9,.6,12,'#b4b0a0',0,-.35,0,g);scene.box(2.8,1.1,5.9,'#e2b32d',0,.9,0,g);scene.box(2.1,2,2.4,'#a89e6d',0,2.3,-1,g);scene.box(2.15,1.1,2.45,'#506b75',0,2.7,-1,g);for(const x of [-1.45,1.45])for(const z of [-1.85,1.85]){const wheel=mesh(g,new THREE.CylinderGeometry(.68,.68,.34,10),material('#232927'),x,.7,z);wheel.rotation.z=Math.PI/2;}beam(scene,g,new THREE.Vector3(0,2,1),new THREE.Vector3(0,17,-5),'#dcb23f',.4);beam(scene,g,new THREE.Vector3(0,17,-5),new THREE.Vector3(0,27,-8),'#d2bd6f',.23);scene.box(.05,9,.05,'#536969',0,22.4,-8,g);}
 for(const fraction of [.20,.91]){const p=sample(track,fraction*track.length),span=track.width/2+1.2;if([-span,span].some(x=>roadClearance(track,p.x+Math.cos(p.heading)*x,p.z-Math.sin(p.heading)*x)<1))continue;const g=group(scene,p,p.heading);for(const x of [-span,span])scene.box(.17,7,.17,'#7b8d8f',x,3.5,0,g);scene.box(span*2,1.2,2.6,'#a9b6b1',0,6.5,0,g);const sign=trackSign('ROLEX',span*2-1,1.1,'#09593c','#dfc580');sign.position.set(0,6.5,-1.32);sign.rotation.y=Math.PI;g.add(sign);}
 addBrakingBoards(scene,track);
}
export function addMonaco(scene,track){
 const water=harborWater(scene,track);city(scene,track);const boats=yachts(scene,track);harborStands(scene,track);planting(scene,track);cliffs(scene,track);const lights=tunnel(scene,track);dressing(scene,track);
 scene.environmentFx={frame(time){water.material.uniforms.time.value=time*.001;for(const [i,record] of (scene.group.userData.rivieraFlags||[]).entries())record.flag.rotation.y=record.heading+Math.sin(time*.0018+i)*.13;for(const boat of boats){boat.g.position.y=boat.base+Math.sin(time*.00065+boat.index)*.045;boat.g.rotation.z=Math.sin(time*.0008+boat.index)*.003;}},setConditions(wetness){water.material.uniforms.wetness.value=wetness;for(const light of lights)light.intensity=130+wetness*45;},dispose(){water.getRenderTarget().dispose();}};return scene.profile;
}
