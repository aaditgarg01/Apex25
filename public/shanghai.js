import * as THREE from '/vendor/three.module.js';
import {sample,angleDiff} from '/shared/tracks.mjs';
import {roadClearance,safeBoxSite} from '/shared/venues.mjs';
import {shanghaiRunoff,shanghaiBoundaryOffset} from '/shared/shanghai.mjs';
import {addFacadePanels,trackSign} from './track-furniture.js';
import {buildingFacade} from './campus-buildings.js';
import {addVegetation} from './vegetation.js';

const steel='#7b8990',concrete='#c2c6c5',red='#b72b30',reservations=[];
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
const terrainCache=new WeakMap();
export function shanghaiTerrainHeight(track,x,z){
 let flat=terrainCache.get(track);if(flat===undefined){flat=track.points.reduce((sum,p)=>sum+p.groundY,0)/track.points.length-.05;terrainCache.set(track,flat);}
 let distanceSquared=Infinity,closest=track.points[0];
 for(let i=0;i<track.points.length;i+=6){const p=track.points[i],d=(x-p.x)**2+(z-p.z)**2;if(d<distanceSquared){distanceSquared=d;closest=p;}}
 const distance=Math.sqrt(distanceSquared),supportBlend=Math.max(0,Math.min(1,(distance-track.width/2-6)/15)),supported=closest.groundY-.9+supportBlend*.85,t=Math.max(0,Math.min(1,(distance-60)/100)),blend=t*t*(3-2*t);
 return supported+(flat-supported)*blend;
}
function mesh(group,geometry,material,x=0,y=0,z=0,staticGeometry=true){const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);o.receiveShadow=true;o.castShadow=true;o.userData.mappedStatic=staticGeometry;group.add(o);return o;}
function groupAt(scene,p,heading=p.heading){const g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=heading;scene.group.add(g);return g;}
function eventSite(track,s,halfWidth,halfLength,side=1,margin=12){const plan=shanghaiRunoff(track);let extra=0;for(let d=-halfLength-40;d<=halfLength+40;d+=12){const index=((Math.floor((s+d)/track.step)%track.points.length)+track.points.length)%track.points.length;extra=Math.max(extra,plan.extra[side][index]);}const p=safeBoxSite(track,s,halfWidth,halfLength,side,margin+plan.base+extra);return {...p,y:shanghaiTerrainHeight(track,p.x,p.z)};}
function reserve(p,halfWidth,halfLength){reservations.push({p,halfWidth,halfLength});}
function beam(scene,group,a,b,width=.16){const v=b.clone().sub(a),o=scene.box(width,v.length(),width,steel,...a.clone().add(b).multiplyScalar(.5).toArray(),group);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
function crowd(group,rows,columns,frontX,frontY,length,rowStep,heightStep,flags){
 const total=rows*columns,dummy=new THREE.Object3D(),bodies=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.18,.29,2,5),mat('#ffffff'),total),heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.115,7,5),mat('#ffffff'),total);
 for(let i=0;i<total;i++){
  const row=Math.floor(i/columns);dummy.position.set(frontX-row*rowStep,frontY+row*heightStep,-length/2+(i%columns)*length/(columns-1));dummy.rotation.set(0,0,Math.sin(i)*.05);dummy.scale.set(1,1,.88);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);bodies.setColorAt(i,new THREE.Color(['#c64032','#d0cbbe','#4a7db0','#e2c34c','#387b60','#485762'][i%6]));dummy.position.y+=.44;dummy.scale.setScalar(1);dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);heads.setColorAt(i,new THREE.Color(['#ceac87','#d8bc9c','#9e7657'][i%3]));
 }
 for(const model of [bodies,heads]){model.computeBoundingSphere();group.add(model);}
 for(let i=0;i<10;i++){
  const row=2+(i%Math.max(1,rows-3)),x=frontX-row*rowStep,y=frontY+row*heightStep+1.2,z=-length*.44+i*length*.09;
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,1.7,5),mat('#d2d7d5'));pole.position.set(x,y-.4,z);pole.userData.mappedStatic=true;group.add(pole);
  const uniform={value:0},material=mat(['#c83235','#f2913f','#e7d037','#f2f1e8'][i%4],{side:THREE.DoubleSide});material.onBeforeCompile=shader=>{shader.uniforms.flagTime=uniform;shader.vertexShader='uniform float flagTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.z += sin(position.x*4.5+flagTime*2.2)*.12*(position.x+.6);');};
  mesh(group,new THREE.PlaneGeometry(1.2,.75,7,2),material,x+.6,y+.1,z,false);flags.push(uniform);
 }
}
function curvedWing(scene,parent,zCenter,frontEdge){
 const positions=[],indices=[],uv=[],steps=36;
 for(let i=0;i<=steps;i++){
  const t=i/steps,z=zCenter+(t-.5)*148;
  for(const edge of [0,1]){const x=edge?-40:frontEdge,arch=Math.sin(t*Math.PI)*10,y=29+arch+(edge?3:0);positions.push(x,y,z);uv.push(edge,t*12);}
  if(i<steps){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 mesh(parent,geometry,mat(red,{side:THREE.DoubleSide,roughness:.48,metalness:.22}));
 for(let z=zCenter-68;z<zCenter+70;z+=17){const t=(z-zCenter+74)/148,y=29+Math.sin(t*Math.PI)*10;scene.box(.65,y,.65,concrete,-35,y/2,z,parent);beam(scene,parent,new THREE.Vector3(-35,y+2,z),new THREE.Vector3(frontEdge,y,z),.4);}
}
function mainComplex(scene,track,flags){
 const p=eventSite(track,track.length-35,45,159,-1,12),g=groupAt(scene,p);reserve(p,48,162);
 scene.box(48,4,314,concrete,-15,2,0,g);scene.box(48,2,314,'#42616c',-15,6,0,g);
 for(let row=0;row<24;row++)scene.box(1.55,.27,306,row%3?'#bdc5c6':'#a13935',-row*1.4,7.3+row*.7,0,g);
 crowd(g,24,130,0,7.72,302,1.4,.7,flags);const centre=sample(track,track.length-35),frontEdge=Math.hypot(p.x-centre.x,p.z-centre.z)+track.width/2+7;curvedWing(scene,g,-78,frontEdge);curvedWing(scene,g,78,frontEdge);
 const label=trackSign('SHANGHAI INTERNATIONAL CIRCUIT',240,1.8,'#b92d32','#f1ece1');label.position.set(9.1,6.2,0);label.rotation.y=Math.PI/2;g.add(label);
 const pitSite=eventSite(track,track.length-30,22,140,1,12),pit=groupAt(scene,pitSite);reserve(pitSite,25,144);
 scene.box(30,7,274,concrete,0,3.5,0,pit);scene.box(31,2.3,275,'#526c78',0,8,0,pit);scene.box(36,.55,282,'#d3d8d7',0,9.5,0,pit);
 const facade=buildingFacade('research');addFacadePanels(pit,30,7,274,facade);
 for(let i=0;i<20;i++){scene.box(.12,3.8,9,'#566770',-15.08,2,-126+i*13,pit);scene.box(.16,.4,10,red,-15.18,4.3,-126+i*13,pit);}
 const tower=new THREE.Group();tower.position.set(0,0,132);pit.add(tower);scene.box(22,35,21,concrete,0,17.5,0,tower);scene.box(27,5,25,'#5b7b88',0,31,0,tower);scene.box(31,1.2,29,red,0,35,0,tower);
}
function spanningSite(track,at){
 let best=null;
 for(let distance=0;distance<180;distance+=12)for(const sign of [1,-1]){
  const s=at*track.length+distance*sign,p=sample(track,s),a=sample(track,s-35),b=sample(track,s+35);if(Math.abs(angleDiff(b.heading,a.heading))>.05)continue;
  const n=track.points.length,index=((Math.floor(s/track.step)%n)+n)%n,boundary=Math.max(shanghaiBoundaryOffset(track,index,1),shanghaiBoundaryOffset(track,index,-1));for(let offset=Math.max(track.width/2+14,boundary+4);offset<90;offset+=8){let clear=true;for(const x of [-offset,offset])for(const z of [-10,10]){const px=p.x+Math.cos(p.heading)*x+Math.sin(p.heading)*z,pz=p.z-Math.sin(p.heading)*x+Math.cos(p.heading)*z;if(roadClearance(track,px,pz)<3.5)clear=false;}if(clear){best={...p,s,offset};break;}}
  if(best)return best;
 }
 return {...sample(track,at*track.length),s:at*track.length,offset:75};
}
function glassPavilions(scene,track){
 const glass=mat('#6f95a2',{metalness:.55,roughness:.19}),roofMaterial=mat('#aebabe',{roughness:.38,metalness:.38});
 for(const at of [.67,.83]){
  const p=spanningSite(track,at),g=groupAt(scene,p),radius=p.offset+7;
  for(const x of [-p.offset,p.offset])for(const z of [-10,10]){const px=p.x+Math.cos(p.heading)*x+Math.sin(p.heading)*z,pz=p.z-Math.sin(p.heading)*x+Math.cos(p.heading)*z,base=shanghaiTerrainHeight(track,px,pz)-p.y;mesh(g,new THREE.CylinderGeometry(1.45,1.8,14-base,16),mat(concrete),x,(14+base)/2,z);}
  mesh(g,new THREE.CylinderGeometry(radius*.83,radius*.83,1.2,64),mat('#aeb8b9'),0,14.1,0);
  mesh(g,new THREE.CylinderGeometry(radius*.77,radius*.77,4.8,64,1,true),glass,0,17,0);
  const roof=mesh(g,new THREE.SphereGeometry(1,48,14,0,Math.PI*2,0,Math.PI/2),roofMaterial,0,19.4,0);roof.scale.set(radius,2.3,radius);
  for(let i=0;i<32;i++){const a=i*Math.PI/16,r=radius*.78;scene.box(.1,4.8,.1,steel,Math.sin(a)*r,17,Math.cos(a)*r,g);}
  const rim=mesh(g,new THREE.TorusGeometry(radius*.84,.22,6,64),mat(red),0,19.35,0);rim.rotation.x=Math.PI/2;
 }
}
function banking(scene,track,flags){
 for(const [at,side] of [[.12,-1],[.2,1],[.36,-1],[.91,-1]]){
  const p=eventSite(track,at*track.length,50,67,side,14),g=groupAt(scene,p,p.heading+(side>0?Math.PI:0));reserve(p,52,70);
  // A gently sloped earth mound with a level rear terrace, rather than steps.
  const shape=new THREE.Shape();shape.moveTo(5,0);shape.lineTo(-29,10);shape.lineTo(-38,10);shape.lineTo(-48,0);shape.closePath();
  const bank=mesh(g,new THREE.ExtrudeGeometry(shape,{depth:130,steps:1,bevelEnabled:false}),mat('#72896a'),0,0,-65);bank.receiveShadow=true;
  crowd(g,18,73,0,2,124,1.5,.42,flags);
  for(const z of [-62,62])scene.box(.09,1.1,.09,'#dce0d9',-32,10.6,z,g);
 }
}
function runoff(scene,track){
 const plan=shanghaiRunoff(track),n=track.points.length;
 for(const side of [-1,1]){
  const positions=[],colors=[],indices=[],bands=[0,.45,.56,.67,.79,.9,1],palette=['#3b4246','#b63233','#d2d6d3','#1e2529','#b63233','#d2d6d3'];
  for(let band=0;band<bands.length-1;band++){
   const start=positions.length/3,color=new THREE.Color(palette[band]);
   for(let i=0;i<=n;i++){
    const j=i%n,p=track.points[j],inner=track.width/2+1.45,outer=track.width/2+plan.base+plan.extra[side][j]-.35;
    for(const fraction of [bands[band],bands[band+1]]){const offset=side*(inner+(outer-inner)*fraction);positions.push(p.x+Math.cos(p.heading)*offset,p.y+.046,p.z-Math.sin(p.heading)*offset);colors.push(color.r,color.g,color.b);}
    if(i<n&&plan.extra[side][j]>.35){const a=start+i*2,b=a+2;indices.push(a,b,a+1,a+1,b,b+1);}
   }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();mesh(scene.group,geometry,mat('#ffffff',{vertexColors:true,side:THREE.DoubleSide,roughness:.83}),0,0,0,false);
 }
}
function landscape(scene,track,resources){
 const sites=[];
 for(let s=0;s<track.length;s+=31)for(const side of [-1,1]){
  const index=Math.floor(s/track.step)%track.points.length,offset=shanghaiBoundaryOffset(track,index,side)+9,p=sample(track,s,side*offset);
  if(roadClearance(track,p.x,p.z)<9||reservations.some(r=>Math.hypot(p.x-r.p.x,p.z-r.p.z)<Math.hypot(r.halfWidth,r.halfLength)+7))continue;
  sites.push({...p,y:shanghaiTerrainHeight(track,p.x,p.z),scale:.44,angle:0});
  const hedge=scene.box(1.1,.8,21,'#547457',p.x,shanghaiTerrainHeight(track,p.x,p.z)+.4,p.z);hedge.rotation.y=p.heading;
 }
 addVegetation(scene,track,scene.profile,{sites,palms:false});
 // Decorative planting is small and does not cast large parkland tree shadows.
 for(const child of scene.group.children.slice(-2))child.castShadow=false;
 const bumps=document.createElement('canvas');bumps.width=bumps.height=128;const context=bumps.getContext('2d');context.fillStyle='#808080';context.fillRect(0,0,128,128);for(let y=0;y<128;y+=8){context.strokeStyle=y%16?'#858585':'#777777';context.beginPath();context.moveTo(0,y);context.bezierCurveTo(32,y-4,80,y+4,128,y);context.stroke();}const bump=new THREE.CanvasTexture(bumps);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(6,12);resources.push(bump);
 const waterMaterial=mat('#477781',{bumpMap:bump,bumpScale:.035,roughness:.24,metalness:.48});
 for(const at of [.25,.49,.75]){
  const p=eventSite(track,at*track.length,38,53,1,65),g=groupAt(scene,{...p,y:shanghaiTerrainHeight(track,p.x,p.z)});reserve(p,40,55);
  const water=mesh(g,new THREE.PlaneGeometry(43,82),waterMaterial,0,.14,0);water.rotation.x=-Math.PI/2;water.castShadow=false;
  for(const x of [-22,22])scene.box(.75,.3,84,'#a6aeaa',x,.14,0,g);for(const z of [-41.5,41.5])scene.box(44.7,.3,.75,'#a6aeaa',0,.14,z,g);
  // A separate maintenance road, outside the circuit and its boundary walls.
  scene.box(7,.04,102,'#687176',31,.025,0,g);for(const x of [27.8,34.2])scene.box(.14,.045,102,'#d2d4c8',x,.055,0,g);
 }
 return waterMaterial;
}
function industrialProps(scene,track){
 for(let i=0;i<14;i++){
  const s=(i+.3)/14*track.length,index=Math.floor(s/track.step),offset=shanghaiBoundaryOffset(track,index,1)+5,p=sample(track,s,offset),g=groupAt(scene,{...p,y:shanghaiTerrainHeight(track,p.x,p.z)});
  scene.box(.16,4.7,.16,'#e0e4e2',0,2.35,0,g);scene.box(.75,.24,.22,'#dce1df',-.28,4.55,0,g);scene.box(.12,.15,.24,'#2f414a',-.69,4.55,0,g);
  for(let j=0;j<3;j++){const x=1.3+j*.62;scene.box(.33,.65,.25,'#ff882e',x,1.03,0,g);for(const leg of [-.1,.1])scene.box(.13,.68,.14,'#e87422',x+leg,.39,0,g);mesh(g,new THREE.SphereGeometry(.12,8,6),mat('#d8b38d'),x,1.5,0);mesh(g,new THREE.SphereGeometry(.14,8,6,0,Math.PI*2,0,Math.PI/2),mat('#eceee5'),x,1.52,0);}
  if(i%3)continue;
  const tv=eventSite(track,s,6,6,-1,18),tower=groupAt(scene,tv);reserve(tv,7,7);
  for(const x of [-2,2])for(const z of [-2,2])scene.box(.16,18,.16,steel,x,9,z,tower);
  for(let y=0;y<18;y+=3)for(const z of [-2,2])beam(scene,tower,new THREE.Vector3(-2,y,z),new THREE.Vector3(2,y+3,z),.13);
  scene.box(5,.25,5,concrete,0,16.2,0,tower);scene.box(1.15,.6,.6,'#293943',2,17,0,tower);scene.box(.4,.4,.45,'#182b36',2.65,17,0,tower);
 }
 // High wire cameras span selected straights; pylons stay behind boundaries.
 for(const at of [.04,.72]){
  const p=spanningSite(track,at),g=groupAt(scene,p),positions=[];
  for(const x of [-p.offset,p.offset]){const px=p.x+Math.cos(p.heading)*x,pz=p.z-Math.sin(p.heading)*x,base=shanghaiTerrainHeight(track,px,pz)-p.y;scene.box(.3,17-base,.3,'#8b969a',x,(17+base)/2,0,g);}
  for(let i=0;i<=40;i++){const t=i/40;positions.push(new THREE.Vector3((t-.5)*p.offset*2,17-Math.sin(t*Math.PI)*1.4,0));}
  const wire=new THREE.Line(new THREE.BufferGeometry().setFromPoints(positions),new THREE.LineBasicMaterial({color:'#56666e'}));g.add(wire);scene.box(.9,.5,.65,'#293a44',0,15.4,0,g);
 }
}
function electronicDressing(scene,track,screens,panels){
 const sponsors=[['Lenovo','#c52c35','#f0eee9'],['PIRELLI','#e0c527','#bf2a2e'],['aramco','#17895e','#f0f3ec']],materials=sponsors.map(([name,color,ink])=>trackSign(name,9,.8,color,ink).material);
 for(let s=15,index=0;s<track.length;s+=16,index++)for(const side of [-1,1]){
  const i=Math.floor(s/track.step),offset=shanghaiBoundaryOffset(track,i,side)-.41,p=sample(track,s,side*offset),sign=mesh(scene.group,new THREE.PlaneGeometry(9,.8),materials[Math.floor(index/14)%3],p.x,p.y+.61,p.z);sign.rotation.y=p.heading+(side===1?-Math.PI/2:Math.PI/2);
 }
 for(let i=0;i<10;i++){
  const s=track.length*(i+.3)/10,index=Math.floor(s/track.step),p=sample(track,s,shanghaiBoundaryOffset(track,index,1)+1.5),g=groupAt(scene,p);
  scene.box(.12,3.4,.12,steel,0,1.7,0,g);scene.box(1.4,1,.15,'#25343b',0,3.1,0,g);const material=new THREE.MeshBasicMaterial({color:'#32cf88',toneMapped:false}),panel=mesh(g,new THREE.PlaneGeometry(1.2,.8),material,0,3.1,-.09,false);panel.rotation.y=Math.PI;panel.castShadow=false;panels.push({s,material});
 }
 for(const [at,side] of [[.04,-1],[.24,1],[.87,-1]]){
  const p=eventSite(track,at*track.length,7,13,side,22),g=groupAt(scene,p,p.heading+(side>0?-Math.PI/2:Math.PI/2));reserve(p,9,15);
  for(const x of [-9,9])scene.box(.65,14,.65,steel,x,7,0,g);scene.box(21,11,.6,'#283c45',0,14,0,g);
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false,side:THREE.DoubleSide});const screen=mesh(g,new THREE.PlaneGeometry(20,10),material,0,14,.34,false);screen.castShadow=false;screens.push({canvas,texture});
 }
 for(const [at,brand] of [[.015,0],[.7,1],[.88,2]]){
  const p=eventSite(track,at*track.length,5,18,-1,15),g=groupAt(scene,p);reserve(p,6,19);scene.box(.7,15,.7,steel,0,7.5,0,g);const [name,color,ink]=sponsors[brand],sign=trackSign(name,30,9,color,ink);sign.position.set(0,14,0);sign.rotation.y=Math.PI/2;const oldMaterial=sign.material;sign.material=new THREE.MeshBasicMaterial({map:oldMaterial.map,side:THREE.DoubleSide,toneMapped:false});oldMaterial.dispose();g.add(sign);
 }
}
function serviceAccess(scene,track){
 for(const [at,side] of [[.18,-1],[.55,1],[.88,-1]]){
  const p=eventSite(track,at*track.length,70,180,side,45),g=groupAt(scene,p);reserve(p,72,183);
  const curve=new THREE.CubicBezierCurve3(new THREE.Vector3(-32,0,-168),new THREE.Vector3(54,0,-62),new THREE.Vector3(-46,0,68),new THREE.Vector3(34,0,168)),positions=[],uv=[],indices=[],steps=64;
  for(let i=0;i<=steps;i++){
   const t=i/steps,point=curve.getPoint(t),tangent=curve.getTangent(t);
   for(const offset of [-9,9]){const x=point.x+tangent.z*offset,z=point.z-tangent.x*offset,worldX=p.x+Math.cos(p.heading)*x+Math.sin(p.heading)*z,worldZ=p.z-Math.sin(p.heading)*x+Math.cos(p.heading)*z;positions.push(x,shanghaiTerrainHeight(track,worldX,worldZ)-p.y+.04,z);uv.push(offset/4,t*85);}
   if(i<steps){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();mesh(g,geometry,mat('#c1c7c8',{map:scene.surfaces.texture('asphalt'),roughness:.9}));
  const building=new THREE.Group();building.position.set(54,0,-70);g.add(building);scene.box(24,7,28,'#c1c8c9',0,3.5,0,building);addFacadePanels(building,24,7,28,buildingFacade('research'));scene.box(26,.3,30,'#8c9b9f',0,7.2,0,building);for(const z of [-7,7])scene.box(3,1,4,'#7d9097',0,7.8,z,building);
 }
}
function refreshScreens(screens,time,cars){
 const drivers=[...cars].sort((a,b)=>a.retired-b.retired||(a.finished&&b.finished?a.finishTime-b.finishTime:a.finished?-1:b.finished?1:b.progress-a.progress));
 for(const screen of screens){const context=screen.canvas.getContext('2d');context.fillStyle='#102831';context.fillRect(0,0,1024,512);context.fillStyle='#c52d33';context.fillRect(0,0,1024,77);context.fillStyle='#f1f2ed';context.font='bold 40px Arial';context.fillText('SHANGHAI  •  LIVE TIMING',35,54);context.font='bold 34px monospace';for(let i=0;i<Math.min(6,drivers.length);i++){const driver=drivers[i],y=133+i*56;context.fillStyle=i===0?'#e7c742':'#dce7e6';context.fillText(String(i+1).padStart(2,'0')+'  '+String(driver.name||'DRIVER').slice(0,13).toUpperCase(),40,y);context.textAlign='right';context.fillText(driver.retired?'DNF':driver.finished?'FINISHED':'LAP '+driver.lap,970,y);context.textAlign='left';}context.fillStyle='#90b9be';context.font='24px monospace';context.fillText('CIRCUIT STATUS  •  '+(Math.floor(time/1000)%2?'● LIVE':'  LIVE'),35,493);screen.texture.needsUpdate=true;}
}
export function addShanghai(scene,track){
 reservations.length=0;const flags=[],screens=[],panels=[],resources=[];runoff(scene,track);mainComplex(scene,track,flags);glassPavilions(scene,track);banking(scene,track,flags);industrialProps(scene,track);electronicDressing(scene,track,screens,panels);serviceAccess(scene,track);const pondMaterial=landscape(scene,track,resources);let screenAt=-Infinity;
 scene.environmentFx={frame(time,cars){for(const flag of flags)flag.value=time*.001;for(const panel of panels){const yellow=cars.some(car=>!car.finished&&!car.retired&&(car.offtrack||car.sliding)&&Math.min(Math.abs(car.s-panel.s),track.length-Math.abs(car.s-panel.s))<160);panel.material.color.set(yellow?(Math.floor(time/450)%2?'#eac52f':'#5c510e'):'#32cf88');}if(time-screenAt>1000){refreshScreens(screens,time,cars);screenAt=time;}for(const texture of resources)texture.offset.set(time*.000008,time*.000006);},setConditions(wetness){pondMaterial.roughness=.24-wetness*.1;pondMaterial.bumpScale=.035+wetness*.015;},dispose(){for(const resource of resources)resource.dispose();}};
 return scene.profile;
}
