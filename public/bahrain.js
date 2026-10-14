import * as THREE from '/vendor/three.module.js';
import {sample,wrap,angleDiff} from '/shared/tracks.mjs';
import {safeBoxSite,roadClearance} from '/shared/venues.mjs';
import {bahrainRunoff,bahrainBoundaryOffset} from '/shared/bahrain.mjs';
import {BAHRAIN_LANDMARKS} from '/shared/bahrain-landmarks.mjs';
import {addVegetation} from './vegetation.js';
import {trackSign,addFacadePanels,addBrakingBoards} from './track-furniture.js';
import {buildingFacade} from './campus-buildings.js';

const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra}),cache=new WeakMap();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
function local(track,[lon,lat]){return {x:(lon-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(lat-track.origin.lat)*111320};}
function layout(track){
 if(cache.has(track))return cache.get(track);
 const mapped=BAHRAIN_LANDMARKS.features.map(f=>{
  const points=f.points.slice(0,-1).map(p=>local(track,p)),x=points.reduce((s,p)=>s+p.x,0)/points.length,z=points.reduce((s,p)=>s+p.z,0)/points.length;let closest=track.points[0],distance=Infinity,index=0;
  track.points.forEach((p,i)=>{const d=Math.hypot(x-p.x,z-p.z);if(d<distance){distance=d;closest=p;index=i;}});
  const h=closest.heading,ps=points.map(p=>({x:(p.x-x)*Math.cos(h)-(p.z-z)*Math.sin(h),z:(p.x-x)*Math.sin(h)+(p.z-z)*Math.cos(h)}));
  return {id:f.way,name:f.tags.name||'Paddock block',x,z,y:closest.groundY-.12,heading:h,width:Math.max(...ps.map(p=>p.x))-Math.min(...ps.map(p=>p.x)),length:Math.max(...ps.map(p=>p.z))-Math.min(...ps.map(p=>p.z)),side:Math.sign((x-closest.x)*Math.cos(h)-(z-closest.z)*Math.sin(h)),s:index*track.step};
 });
 const data={mapped,flat:track.points.reduce((sum,p)=>sum+p.groundY,0)/track.points.length-.8,heights:track.points.filter((_,i)=>i%6===0)};cache.set(track,data);return data;
}
export function bahrainTerrainHeight(track,x,z,cell=0){
 const data=layout(track);let distance=Infinity,near=track.points[0],floor=Infinity;
 for(const p of data.heights){const d=Math.hypot(x-p.x,z-p.z);if(d<distance){distance=d;near=p;}if(d<track.width/2+cell*.85+12)floor=Math.min(floor,p.y-.85);}
 const blend=smooth((distance-track.width/2-20)/130),dunes=(1.7*Math.sin(x*.005+z*.002)+1.1*Math.cos(z*.009-x*.003))*smooth((distance-130)/250);
 let y=near.groundY-.85+(data.flat+dunes-near.groundY+.85)*blend;
 for(const p of data.mapped){const dx=x-p.x,dz=z-p.z,d=Math.max(Math.abs(dx*Math.cos(p.heading)-dz*Math.sin(p.heading))-p.width/2,Math.abs(dx*Math.sin(p.heading)+dz*Math.cos(p.heading))-p.length/2),pad=1-smooth(d/10);if(pad>0)y+=(p.y-.16-y)*pad;}
 return Number.isFinite(floor)?Math.min(y,floor):y;
}
function mesh(parent,geo,mat,x=0,y=0,z=0,staticGeometry=true){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.receiveShadow=true;o.castShadow=true;o.userData.mappedStatic=staticGeometry;parent.add(o);return o;}
function group(scene,p,h=p.heading){const g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=h;scene.group.add(g);return g;}
function beam(scene,parent,a,b,color='#a8b0b0',w=.14){const d=b.clone().sub(a),o=scene.box(w,d.length(),w,color,...a.clone().add(b).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
function occupied(track,x,z,margin=3){return layout(track).mapped.some(p=>{const dx=x-p.x,dz=z-p.z;return Math.abs(dx*Math.cos(p.heading)-dz*Math.sin(p.heading))<p.width/2+margin&&Math.abs(dx*Math.sin(p.heading)+dz*Math.cos(p.heading))<p.length/2+margin;});}
function bahrainiFlag(){const c=document.createElement('canvas');c.width=240;c.height=144;const ctx=c.getContext('2d');ctx.fillStyle='#bd2837';ctx.fillRect(0,0,240,144);ctx.fillStyle='#f6f2e6';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(61,0);for(let i=0;i<5;i++){ctx.lineTo(94,(i+.5)*144/5);ctx.lineTo(61,(i+1)*144/5);}ctx.lineTo(0,144);ctx.fill();const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return material('#ffffff',{map:texture,side:THREE.DoubleSide});}
function fabric(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#e4e2d6';ctx.fillRect(0,0,128,128);ctx.strokeStyle='#d0cdc080';for(let i=0;i<128;i+=3){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,128);ctx.moveTo(0,i);ctx.lineTo(128,i);ctx.stroke();}const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;return material('#f8f6eb',{map,bumpMap:map,bumpScale:.014,side:THREE.DoubleSide});}
function tent(scene,parent,width,length,height,cloth){
 const cells=Math.ceil(length/22),cell=length/cells;
 for(let bay=0;bay<cells;bay++){
  const center=-length/2+(bay+.5)*cell,positions=[],uv=[],indices=[],steps=12;
  for(let i=0;i<=steps;i++)for(let j=0;j<=steps;j++){
   const u=i/steps,v=j/steps,x=(u-.5)*(width+5),z=center+(v-.5)*cell,peak=height+5.5*Math.pow(Math.abs(u-.5)*2,1.1)*Math.pow(Math.abs(v-.5)*2,1.1)+3.6*Math.sin(v*Math.PI)*(.5+.5*Math.cos((u-.5)*Math.PI*2));positions.push(x,peak,z);uv.push(u*6,v*3);
   if(i<steps&&j<steps){const a=i*(steps+1)+j;indices.push(a,a+1,a+steps+1,a+1,a+steps+2,a+steps+1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();mesh(parent,geometry,cloth);
  for(const x of [-width/2-2,width/2+2]){scene.box(.23,height+5.5,.23,'#dedfd9',x,(height+5.5)/2,center-cell/2,parent);beam(scene,parent,new THREE.Vector3(x,height+5.5,center-cell/2),new THREE.Vector3(-Math.sign(x)*width/2,height+5.5,center+cell/2),'#cad0cd',.065);}
 }
 for(const x of [-width/2-2,width/2+2])scene.box(.23,height+5.5,.23,'#dedfd9',x,(height+5.5)/2,length/2,parent);
}
function spectators(parent,rows,columns,width,length,flags){
 const count=rows*columns,dummy=new THREE.Object3D(),bodies=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.18,.34,2,5),material('#ffffff'),count),heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.12,7,5),material('#ffffff'),count),headwear=new THREE.InstancedMesh(new THREE.SphereGeometry(.145,6,4,0,Math.PI*2,0,Math.PI/2),material('#f4eee0'),Math.ceil(count/7));let hats=0;
 for(let i=0;i<count;i++){const row=Math.floor(i/columns);dummy.position.set(width/2-.9-row*width/rows,1.18+row*.58,-length/2+1+(i%columns)*(length-2)/(columns-1));dummy.scale.set(1,1,.9);dummy.rotation.set(0,0,0);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);bodies.setColorAt(i,new THREE.Color(['#f1ece0','#f1ece0','#c73235','#ddb660','#1b5374','#286f57','#f1ece0','#303b4b'][i%8]));dummy.position.y+=.45;dummy.scale.setScalar(1);dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);heads.setColorAt(i,new THREE.Color(['#be926a','#d6b38c','#9d7456'][i%3]));if(i%7===0){dummy.position.y+=.07;dummy.updateMatrix();headwear.setMatrixAt(hats++,dummy.matrix);}}
 headwear.count=hats;for(const o of [bodies,heads,headwear]){o.computeBoundingSphere();parent.add(o);}
 const flagMaterial=bahrainiFlag();for(let i=0;i<Math.ceil(length/17);i++){const row=3+i%Math.max(1,rows-4),x=width/2-.9-row*width/rows,y=2+row*.58,z=-length*.45+i*16;mesh(parent,new THREE.CylinderGeometry(.018,.018,1.8,5),material('#b9c2c1'),x,y,z);const flag=mesh(parent,new THREE.PlaneGeometry(1.3,.78,7,2),flagMaterial,x+.65,y+.45,z,false);flag.castShadow=false;flags.push(flag);}
}
function architecture(scene,track,flags,towerScreens){
 const mapped=layout(track).mapped,cloth=fabric();
 for(const p of mapped.filter(p=>!['Sakhir Tower','Paddock block'].includes(p.name))){
  let width=Math.min(34,p.width),length=p.length;const g=group(scene,p,p.heading+(p.side>0?Math.PI:0)),rows=clamp(Math.floor(width/1.3),9,24),columns=Math.floor(length/.9);
  for(let row=0;row<rows;row++){const h=.4+row*.58;scene.box(width/rows+.06,h,length,'#cbc7b6',width/2-.8-row*width/rows,h/2,0,g);scene.box(.4,.1,length,'#b03d41',width/2-.8-row*width/rows,h+.06,0,g);}
  spectators(g,rows,columns,width,length,flags);if(p.name==='Main Grandstand'||p.name==='Batelco'||p.name==='First Turn Grandstand')tent(scene,g,width,length,rows*.58+3,cloth);
  const sign=trackSign(p.name==='Batelco'?'OASIS GRANDSTAND':p.name.toUpperCase(),Math.min(length-4,48),1.2,'#e7e0cb','#9b3138');sign.position.set(width/2+.1,1.1,0);sign.rotation.y=Math.PI/2;g.add(sign);
 }
 for(const p of mapped.filter(p=>p.name==='Paddock block')){const g=group(scene,p),w=p.width,l=p.length;scene.box(w,6.8,l,'#d9ceba',0,3.4,0,g);scene.box(w+1,.35,l+1,'#d6ded7',0,7,0,g);addFacadePanels(g,w,6.8,l,buildingFacade('research'));for(let z=-l/2+5;z<l/2;z+=9){scene.box(.1,3.3,7,'#30464e',-p.side*(w/2+.09),1.7,z,g);scene.box(.12,.4,7,'#cc3d42',-p.side*(w/2+.18),3.8,z,g);}}
 const p=mapped.find(p=>p.name==='Sakhir Tower'),g=group(scene,p,0),concrete=material('#d6c5a2'),glass=material('#47707a',{metalness:.5,roughness:.24}),radius=Math.min(19,p.width/2),levels=8;
 mesh(g,new THREE.CylinderGeometry(radius+2,radius+2,2,64),concrete,0,1,0);mesh(g,new THREE.CylinderGeometry(radius-1,radius+1,levels*4.2,64),glass,0,2+levels*2.1,0);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=96;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const led=new THREE.MeshBasicMaterial({map:texture,toneMapped:false,side:THREE.DoubleSide});towerScreens.push({canvas,texture});
 for(let i=0;i<levels;i++){
  const y=3+i*4.2,r=radius+2-i*.3;mesh(g,new THREE.CylinderGeometry(r,r,.36,64),concrete,0,y,0);mesh(g,new THREE.CylinderGeometry(r+.03,r+.03,.31,64,1,true),led,0,y+.21,0).castShadow=false;
  for(let j=0;j<24;j++){const a=j*Math.PI/12,x=Math.cos(a)*(radius-i*.08),z=Math.sin(a)*(radius-i*.08),shade=scene.box(.17,3.4,1.5,'#dbcaa8',x,y+1.9,z,g);shade.rotation.y=-a;}
 }
 const roof=mesh(g,new THREE.CylinderGeometry(radius+4,radius+2,.55,64),concrete,0,36.1,0);roof.castShadow=true;
 // Sculpted sail shade, separate from the ring balconies and Arabic-inspired sun louvres.
 const shape=new THREE.Shape();shape.moveTo(-radius-4,0);shape.quadraticCurveTo(0,11,radius+4,0);shape.quadraticCurveTo(0,-2,-radius-4,0);const sail=mesh(g,new THREE.ShapeGeometry(shape,24),cloth,0,38,0);sail.rotation.x=-Math.PI/2+.18;
 for(const x of [-radius,0,radius])scene.box(.14,4,.14,'#e7e0ce',x,38,0,g);
 const name=trackSign('BAHRAIN INTERNATIONAL CIRCUIT',33,1.9,'#e4d2af','#674336');name.position.set(0,3.2,-radius-2.06);name.rotation.y=Math.PI;g.add(name);
}
function runoff(scene,track){
 const plan=bahrainRunoff(track),n=track.points.length;
 for(const side of [-1,1]){
  const pos=[],colors=[],uv=[],indices=[],bands=9;
  for(let band=0;band<bands;band++){const start=pos.length/3;for(let i=0;i<=n;i++){
   const j=i%n,p=track.points[j],inner=track.width/2+1.6,outer=bahrainBoundaryOffset(track,j,side)-.55;
   for(const edge of [band/bands,(band+1)/bands]){const wave=Math.sin(i*track.step*.055)*Math.sin(edge*Math.PI)*Math.min(1.8,plan.extra[side][j]*.075),offset=side*(inner+(outer-inner)*edge+wave),color=new THREE.Color(band<2?'#464d50':band%2?'#cbd5d6':'#6eacbf');pos.push(p.x+Math.cos(p.heading)*offset,p.y+.047,p.z-Math.sin(p.heading)*offset);colors.push(color.r,color.g,color.b);uv.push(offset/4,i*track.step/4);}
   if(i<n&&plan.extra[side][j]>.5){const a=start+i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  }}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();mesh(scene.group,geo,scene.surfaces.material('paint','#ffffff',true));
  // Red/white geometric bands sit inside the apron, never on the racing surface.
  const patternPos=[],patternColors=[];
  for(let s=0;s<track.length;s+=8){const j=Math.floor(s/track.step),extra=plan.extra[side][j];if(extra<12)continue;const p=sample(track,s),offset=side*(track.width/2+10),size=2.2;for(const [a,b,c] of [[[0,-size],[size,0],[0,size]],[[0,-size],[-size,0],[0,size]]]){const color=new THREE.Color(c[0]===0&&b[0]>0?'#ba3538':'#e2ded3');for(const [x,z] of [a,b,c]){patternPos.push(p.x+Math.cos(p.heading)*(offset+x)+Math.sin(p.heading)*z,p.y+.055,p.z-Math.sin(p.heading)*(offset+x)+Math.cos(p.heading)*z);patternColors.push(color.r,color.g,color.b);}}}
  const geo2=new THREE.BufferGeometry();geo2.setAttribute('position',new THREE.Float32BufferAttribute(patternPos,3));geo2.setAttribute('color',new THREE.Float32BufferAttribute(patternColors,3));geo2.computeVertexNormals();mesh(scene.group,geo2,material('#ffffff',{vertexColors:true,side:THREE.DoubleSide}));
 }
}
function gravelTraps(scene,track){
 const plan=bahrainRunoff(track),n=track.points.length;
 for(const side of [-1,1]){const positions=[],uv=[],indices=[];for(let i=0;i<=n;i++){const j=i%n,p=track.points[j],offset=bahrainBoundaryOffset(track,j,side);let clear=plan.extra[side][j]>12;for(const edge of [offset+1,offset+8]){const x=p.x+Math.cos(p.heading)*side*edge,z=p.z-Math.sin(p.heading)*side*edge;positions.push(x,bahrainTerrainHeight(track,x,z)+.03,z);uv.push(edge/4,i*track.step/4);if(roadClearance(track,x,z)<5||occupied(track,x,z,4))clear=false;}if(i<n&&clear){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();const gravel=mesh(scene.group,geometry,scene.surfaces.material('gravel','#d2c3a6'));gravel.castShadow=false;}
}
function oasis(scene,track){
 const palms=[],rockSites=[],dummy=new THREE.Object3D(),grass=scene.surfaces.material('grass','#547b4b');
 for(const [fraction,side] of [[.015,-1],[.14,-1],[.48,-1],[.56,1],[.94,1]]){
  const p=safeBoxSite(track,fraction*track.length,22,37,side,32),g=group(scene,{...p,y:bahrainTerrainHeight(track,p.x,p.z)}),lawn=mesh(g,new THREE.PlaneGeometry(39,66),grass,0,.025,0);lawn.rotation.x=-Math.PI/2;lawn.castShadow=false;
  for(let i=0;i<14;i++){const x=-17+(i%2)*34,z=-29+Math.floor(i/2)*9,wx=p.x+Math.cos(p.heading)*x+Math.sin(p.heading)*z,wz=p.z-Math.sin(p.heading)*x+Math.cos(p.heading)*z;if(occupied(track,wx,wz,7))continue;palms.push({x:wx,z:wz,y:g.position.y,scale:1.2+(i%3)*.18,angle:i*1.3});}
 }
 // Paddock palms frame the tower without hiding the viewing balconies.
 const tower=layout(track).mapped.find(p=>p.name==='Sakhir Tower');for(let i=0;i<14;i++){const a=i*Math.PI/7,x=tower.x+Math.cos(a)*38,z=tower.z+Math.sin(a)*38;if(roadClearance(track,x,z)<12||occupied(track,x,z,3))continue;palms.push({x,z,y:bahrainTerrainHeight(track,x,z),scale:1.12,angle:a});}
 addVegetation(scene,track,scene.profile,{sites:palms,palms:true});
 for(let s=0;s<track.length;s+=39)for(const side of [-1,1]){const index=Math.floor(s/track.step),p=sample(track,s,side*(bahrainBoundaryOffset(track,index,side)+14));if(roadClearance(track,p.x,p.z)<12||occupied(track,p.x,p.z,8))continue;rockSites.push({...p,y:bahrainTerrainHeight(track,p.x,p.z)});}
 const rocks=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),material('#ad9a7c'),rockSites.length),shrubs=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),material('#797e55'),rockSites.length);rockSites.forEach((p,i)=>{dummy.position.set(p.x,p.y+.25,p.z);dummy.scale.set(.6+i%3*.3,.28+i%2*.14,.5);dummy.rotation.set(.1,i,0);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);dummy.position.set(p.x+2,p.y+.45,p.z+2);dummy.scale.set(1.1,.6,.8);dummy.updateMatrix();shrubs.setMatrixAt(i,dummy.matrix);});for(const o of [rocks,shrubs]){o.computeBoundingSphere();o.castShadow=true;scene.group.add(o);}
}
function horizon(scene,track){
 const flat=layout(track).flat,windowMaterial=material('#30434d',{metalness:.4,roughness:.4,emissive:'#506a80',emissiveIntensity:.24});
 // A faint artistic city silhouette to the north; the real Manama CBD is beyond normal circuit sight distance.
 for(let i=0;i<27;i++){const x=-900+i*82,z=-3500-Math.sin(i*1.3)*180,h=45+(i%7)*19,g=group(scene,{x,z,y:flat,heading:0});scene.box(23,h,25,'#3b4654',0,h/2,0,g);mesh(g,new THREE.BoxGeometry(23.3,h*.83,25.3),windowMaterial,0,h*.48,0);if(i%6===0)scene.box(.6,16,.6,'#5c6470',0,h+8,0,g);}
 for(let i=0;i<7;i++){const p={x:900+i*140,z:850+(i%3)*160,y:flat,heading:i*.5},g=group(scene,p);for(const x of [-5,5])for(const z of [-4,4])beam(scene,g,new THREE.Vector3(x,0,z),new THREE.Vector3(x*.2,26,z*.2),'#5d5a51',.3);scene.box(5,3,4,'#91816c',0,20,0,g);scene.box(12,.6,1,'#888774',0,26,0,g);}
 const geometry=new THREE.PlaneGeometry(1700,15,85,1);geometry.rotateX(-Math.PI/2);const vertices=geometry.attributes.position;for(let i=0;i<vertices.count;i++){const x=vertices.getX(i),z=vertices.getZ(i)+1400;vertices.setXYZ(i,x,bahrainTerrainHeight(track,x,z)+.08,z);}geometry.computeVertexNormals();const road=mesh(scene.group,geometry,material('#67665f'));road.castShadow=false;for(let x=-800;x<800;x+=14)scene.box(5,.025,.2,'#c6baa2',x,bahrainTerrainHeight(track,x,1400)+.105,1400);
}
function lights(scene,track){
 const poles=[],luminous=new THREE.MeshBasicMaterial({color:'#fff7df',toneMapped:false}),lensGeo=new THREE.PlaneGeometry(.5,.35),dummy=new THREE.Object3D();
 for(let i=0;i<495;i++){
  const s=(i+.5)/495*track.length,side=i%2?1:-1,index=Math.floor(s/track.step),height=23+(i%5)*4;let offset=bahrainBoundaryOffset(track,index,side)+6,p=sample(track,s,side*offset);
  while((roadClearance(track,p.x,p.z)<5||occupied(track,p.x,p.z,3))&&offset<180){offset+=8;p=sample(track,s,side*offset);}
  const floor=bahrainTerrainHeight(track,p.x,p.z),g=group(scene,{...p,y:floor});scene.box(.22,height,.22,'#c4cbc7',0,height/2,0,g);scene.box(2.9,.28,1.6,'#707e82',0,height,0,g);scene.box(.16,2.5,.16,'#b4c3c7',0,height-1.25,0,g);poles.push({x:p.x,y:floor+height,z:p.z,target:sample(track,s),heading:p.heading});
 }
 const lenses=new THREE.InstancedMesh(lensGeo,luminous,495*8);for(let i=0;i<poles.length;i++){const p=poles[i];for(let j=0;j<8;j++){const x=(j%4-1.5)*.68,z=(Math.floor(j/4)-.5)*.65;dummy.position.set(p.x+Math.cos(p.heading)*x+Math.sin(p.heading)*z,p.y-.16,p.z-Math.sin(p.heading)*x+Math.cos(p.heading)*z);dummy.rotation.set(Math.PI/2,p.heading,0,'YXZ');dummy.scale.setScalar(1);dummy.updateMatrix();lenses.setMatrixAt(i*8+j,dummy.matrix);}}
 lenses.computeBoundingSphere();scene.group.add(lenses);
 const pool=[];for(let i=0;i<6;i++){const light=new THREE.SpotLight('#e7f4ff',0,150,Math.PI*.38,.18,2);light.castShadow=i<2;light.shadow.mapSize.set(512,512);light.shadow.camera.near=1;light.shadow.camera.far=150;light.shadow.bias=-.0003;light.shadow.normalBias=.05;scene.group.add(light,light.target);pool.push(light);}
 return {poles,pool,luminous};
}
function sponsors(){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#ebe3cf';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#8b713b';ctx.font='bold 92px Arial';ctx.textAlign='center';ctx.fillText('GULF AIR',650,161);ctx.beginPath();ctx.moveTo(320,102);ctx.lineTo(216,60);ctx.lineTo(107,74);ctx.lineTo(245,129);ctx.lineTo(135,145);ctx.lineTo(301,162);ctx.lineTo(355,116);ctx.lineTo(390,109);ctx.lineTo(348,95);ctx.closePath();ctx.fill();const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
 return [material('#ffffff',{map,side:THREE.DoubleSide}),trackSign('aramco',9,.85,'#178761','#f1f5ed').material,trackSign('DHL',9,.85,'#eaca27','#be2c32').material];
}
function dressing(scene,track,panels){
 const signs=sponsors();for(let s=15,i=0;s<track.length;s+=19,i++)for(const side of [-1,1]){const index=Math.floor(s/track.step),p=sample(track,s,side*(bahrainBoundaryOffset(track,index,side)-.4)),sign=mesh(scene.group,new THREE.PlaneGeometry(9,.84),signs[Math.floor(i/15)%3],p.x,p.y+.6,p.z);sign.rotation.y=p.heading+(side>0?-Math.PI/2:Math.PI/2);}
 for(let i=0;i<18;i++){
  const s=(i+.3)/18*track.length,side=i%2?1:-1,index=Math.floor(s/track.step),offset=bahrainBoundaryOffset(track,index,side)+5,p=sample(track,s,side*offset);if(roadClearance(track,p.x,p.z)<4||occupied(track,p.x,p.z,4))continue;const g=group(scene,{...p,y:bahrainTerrainHeight(track,p.x,p.z)});
  scene.box(.12,4,.12,'#eef0e7',-2,2,0,g);scene.box(.7,.22,.24,'#b2c0c3',-2.2,3.9,0,g);scene.box(.12,.16,.25,'#1c3038',-2.64,3.9,0,g);
  for(let j=0;j<3;j++){const x=j*.65;scene.box(.33,.65,.26,'#fa762b',x,1.04,0,g);for(const leg of [-.1,.1])scene.box(.13,.75,.14,'#e66524',x+leg,.39,0,g);mesh(g,new THREE.SphereGeometry(.145,8,6),material('#efece3'),x,1.54,0);scene.box(.23,.07,.04,'#314653',x,1.55,.125,g);}
  const led=new THREE.MeshBasicMaterial({color:'#33de81',toneMapped:false}),panel=mesh(g,new THREE.PlaneGeometry(1.4,.8),led,-1,2.8,-.11,false);panel.rotation.y=Math.PI;panel.castShadow=false;scene.box(1.65,1,.22,'#253b43',-1,2.8,0,g);panels.push({s,material:led});
 }
 for(const [fraction,brand] of [[.04,0],[.54,1],[.89,2]]){
  const p=sample(track,fraction*track.length);if(Math.abs(angleDiff(sample(track,fraction*track.length+25).heading,p.heading))>.1)continue;const index=Math.floor(fraction*track.length/track.step),span=Math.max(bahrainBoundaryOffset(track,index,1),bahrainBoundaryOffset(track,index,-1))+6,g=group(scene,p);for(const x of [-span,span]){scene.box(.4,10,.4,'#9baeb1',x,5,0,g);scene.box(.4,10,.4,'#9baeb1',x,5,2.3,g);beam(scene,g,new THREE.Vector3(x,0,0),new THREE.Vector3(x,10,2.3),'#9caeb0',.2);}scene.box(span*2,1.6,2.8,'#405965',0,9.2,1,g);for(let x=-span;x<span;x+=4)beam(scene,g,new THREE.Vector3(x,8.4,-.42),new THREE.Vector3(Math.min(span,x+4),10,-.42),'#bfc8c9',.14);const sign=mesh(g,new THREE.PlaneGeometry(span*2-2,1.5),signs[brand],0,9.2,-.44);sign.rotation.y=Math.PI;
  const led=new THREE.MeshBasicMaterial({color:'#36df8c',toneMapped:false});mesh(g,new THREE.PlaneGeometry(2,.35),led,0,8.05,-.5,false).rotation.y=Math.PI;panels.push({s:fraction*track.length,material:led});
 }
 // White modular energy-absorbing blocks reinforce outside hairpin runoff walls.
 for(let i=0;i<track.points.length;i+=5){const curvature=angleDiff(track.points[wrap(i+3,track.points.length)].heading,track.points[wrap(i-3,track.points.length)].heading);if(Math.abs(curvature)<.25)continue;const side=-Math.sign(curvature),p=sample(track,i*track.step,side*(bahrainBoundaryOffset(track,i,side)+.6)),g=group(scene,p);scene.box(.6,.94,3.6,'#eee9db',0,.5,0,g);scene.box(.06,.42,3.6,'#c6c1b5',-side*.31,.48,0,g);}
 addBrakingBoards(scene,track);
}
export function addBahrain(scene,track){
 const flags=[],panels=[],towerScreens=[];runoff(scene,track);gravelTraps(scene,track);architecture(scene,track,flags,towerScreens);oasis(scene,track);horizon(scene,track);dressing(scene,track,panels);const flood=lights(scene,track);let started=null,phase=0,wet=0,skyStep=-1,lightAt=-Infinity,screenAt=-Infinity;
 const lighting=()=>{scene.sun.color.set(wet?'#d2dce5':'#ffc292');scene.sun.intensity=1.84*(1-phase)*(1-wet*.7);scene.hemisphere.intensity=.6-phase*.30+wet*.1;scene.hemisphere.color.set(phase>.6?'#8faacf':'#b9b4d6');scene.scene.fog.density=Math.max(.00031,wet*.0011);scene.scene.environmentIntensity=.46-phase*.24;for(const light of flood.pool)light.intensity=(2500+phase*3100)*(1-wet*.12);flood.luminous.color.set(phase>.4?'#f0f8ff':'#fff6df');};
 scene.profile.twilight=0;
 scene.environmentFx={frame(time,cars){if(started===null)started=time;phase=smooth((time-started)/360000);scene.profile.twilight=phase;const step=Math.round(phase*32);if(step!==skyStep){scene.atmosphere.set(scene.profile,scene.appearance,wet);skyStep=step;}lighting();
  if(time-lightAt>250){const camera=scene.camera.position,nearest=[...flood.poles].sort((a,b)=>(a.x-camera.x)**2+(a.z-camera.z)**2-((b.x-camera.x)**2+(b.z-camera.z)**2)).slice(0,6),used=new Set(flood.pool.map(light=>light.userData.pole).filter(pole=>nearest.includes(pole)));
   // Keep surviving light assignments stable; do not reshuffle all shadows every update.
   for(const light of flood.pool){if(nearest.includes(light.userData.pole))continue;const pole=nearest.find(pole=>!used.has(pole));used.add(pole);light.userData.pole=pole;light.position.set(pole.x,pole.y-.3,pole.z);light.target.position.set(pole.target.x,pole.target.y,pole.target.z);light.target.updateMatrixWorld();}lightAt=time;}

  for(let i=0;i<flags.length;i++)flags[i].rotation.y=Math.sin(time*.0018+i)*.1;
  for(const panel of panels){const yellow=cars.some(car=>!car.finished&&!car.retired&&(car.offtrack||car.sliding)&&Math.min(wrap(car.s-panel.s,track.length),wrap(panel.s-car.s,track.length))<150);panel.material.color.set(yellow?(Math.floor(time/400)%2?'#eed02e':'#5b4d0c'):'#33de81');}
  if(time-screenAt>250){for(const screen of towerScreens){const ctx=screen.canvas.getContext('2d');ctx.fillStyle='#132d55';ctx.fillRect(0,0,1024,96);for(let i=0;i<32;i++){ctx.fillStyle=i%2?'#e23a54':'#ad962f';ctx.beginPath();const x=(i*40+time*.018)%1100-40;ctx.moveTo(x,0);ctx.lineTo(x+24,48);ctx.lineTo(x,96);ctx.lineTo(x-24,48);ctx.fill();}ctx.fillStyle='#f0ead7';ctx.font='bold 37px Arial';ctx.textAlign='center';ctx.fillText('BAHRAIN  •  SAKHIR',512,62);screen.texture.needsUpdate=true;}screenAt=time;}
 },setConditions(wetness){wet=wetness;lighting();skyStep=-1;},dispose(){for(const light of flood.pool){light.shadow.map?.dispose();light.removeFromParent();light.target.removeFromParent();}}};
 return scene.profile;
}
