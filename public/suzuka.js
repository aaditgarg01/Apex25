import * as THREE from '/vendor/three.module.js';
import {sample,angleDiff,wrap} from '/shared/tracks.mjs';
import {roadClearance,safeBoxSite} from '/shared/venues.mjs';
import {ribbonOffset} from '/shared/surface.mjs';
import {mergeGeometries} from '/vendor/BufferGeometryUtils.js';
import {SUZUKA_LANDMARKS} from './data/suzuka-landmarks.js';
import {addVegetation} from './vegetation.js';
import {addBrakingBoards,trackSign,addFacadePanels} from './track-furniture.js';
import {buildingFacade} from './campus-buildings.js';

const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.82,...extra});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const landscapes=new WeakMap();
function projected(track,[lon,lat]){return {x:(lon-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(lat-track.origin.lat)*111320};}
function closest(track,x,z){let best={distance:Infinity};for(let i=0;i<track.points.length;i++){const p=track.points[i],distance=Math.hypot(x-p.x,z-p.z);if(distance<best.distance)best={...p,s:i*track.step,distance};}return best;}
function layout(track){
 if(landscapes.has(track))return landscapes.get(track);
 const mapped=SUZUKA_LANDMARKS.features.map(feature=>{
  const points=feature.points.slice(0,-1).map(p=>projected(track,p)),x=points.reduce((s,p)=>s+p.x,0)/points.length,z=points.reduce((s,p)=>s+p.z,0)/points.length,road=closest(track,x,z),heading=road.heading;
  const local=points.map(p=>({x:(p.x-x)*Math.cos(heading)-(p.z-z)*Math.sin(heading),z:(p.x-x)*Math.sin(heading)+(p.z-z)*Math.cos(heading)}));
  const width=Math.max(...local.map(p=>p.x))-Math.min(...local.map(p=>p.x)),length=Math.max(...local.map(p=>p.z))-Math.min(...local.map(p=>p.z)),side=Math.sign((x-road.x)*Math.cos(heading)-(z-road.z)*Math.sin(heading));
  return {id:feature.way,name:feature.tags.name,x,z,y:road.groundY-.15,heading,width,length,side,s:road.s};
 });
 const pads=mapped.filter(p=>['V1','V2','A1','Q2','R','D5','ピットビル'].includes(p.name));
 const data={mapped,pads,heights:track.points.filter((_,i)=>i%8===0)};landscapes.set(track,data);return data;
}
export function suzukaTerrainHeight(track,x,z,cell=0){
 const data=layout(track);let nearest=Infinity,road=track.points[0],sum=0,weight=0,floor=Infinity;
 // Broad weighted contours avoid the abrupt ridges of nearest-point terrain.
 // The road envelope uses the lower branch at the figure-eight crossover.
 for(const p of data.heights){const d=(x-p.x)**2+(z-p.z)**2;if(d<nearest){nearest=d;road=p;}const w=1/Math.pow(d+900,1.35);sum+=p.groundY*w;weight+=w;if(d<(track.width/2+cell*.85+16)**2)floor=Math.min(floor,p.y-.9);}
 const distance=Math.sqrt(nearest),away=smooth((distance-track.width/2-15)/55),contour=sum/weight;
 const hills=7*Math.sin(x*.008+z*.003)+5*Math.cos(z*.011-x*.004)+3*Math.sin((x+z)*.021);
 let y=road.groundY-.9+(contour-road.groundY+1+hills)*away;
 for(const pad of data.pads){const dx=x-pad.x,dz=z-pad.z,lx=Math.abs(dx*Math.cos(pad.heading)-dz*Math.sin(pad.heading)),lz=Math.abs(dx*Math.sin(pad.heading)+dz*Math.cos(pad.heading)),blend=1-smooth(Math.max(lx-pad.width/2,lz-pad.length/2)/12);if(blend>0)y+=(pad.y-.25-y)*blend;}
 if(Number.isFinite(floor))y=Math.min(y,floor);
 return y;
}
function mesh(parent,geometry,mat,x=0,y=0,z=0,staticGeometry=true){const o=new THREE.Mesh(geometry,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;o.userData.mappedStatic=staticGeometry;parent.add(o);return o;}
function at(scene,p,heading=p.heading){const g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=heading;scene.group.add(g);return g;}
function beam(scene,parent,a,b,color='#e4e7df',width=.12,dynamic=false){const delta=b.clone().sub(a),o=scene.box(width,delta.length(),width,color,...a.clone().add(b).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());if(dynamic)o.userData.batchBox=false;return o;}
function boxClear(track,p,width,length,margin=2){const h=p.heading;for(let x=-width/2;x<=width/2+.1;x+=Math.max(1,width/6))for(let z=-length/2;z<=length/2+.1;z+=6){if(roadClearance(track,p.x+Math.cos(h)*x+Math.sin(h)*z,p.z-Math.sin(h)*x+Math.cos(h)*z)<margin)return false;}return true;}
function crowd(parent,rows,columns,width,length,base,flags,roofed=false){
 const count=rows*columns,dummy=new THREE.Object3D(),bodies=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.18,.3,2,5),material('#ffffff'),count),heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.12,6,5),material('#ffffff'),count),hats=new THREE.InstancedMesh(new THREE.ConeGeometry(.24,.25,6),material('#ffffff'),Math.ceil(count/11));let hatsCount=0;
 for(let i=0;i<count;i++){
  const row=Math.floor(i/columns),x=width/2-.65-row*(width-1.3)/rows,y=base+.8+row*.65,z=-length/2+1+(i%columns)*(length-2)/(columns-1);
  dummy.position.set(x,y,z);dummy.scale.set(1,1,.9);dummy.rotation.set(0,0,Math.sin(i)*.05);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);bodies.setColorAt(i,new THREE.Color(['#d73732','#f1eee2','#163951','#eac638','#407c5e','#637db1'][i%6]));
  dummy.position.y+=.44;dummy.scale.setScalar(1);dummy.rotation.z=0;dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);heads.setColorAt(i,new THREE.Color(['#d2b18e','#b69170','#e0bea0'][i%3]));
  if(i%11===0){dummy.position.y+=.21;dummy.rotation.z=i%3*.07;dummy.updateMatrix();hats.setMatrixAt(hatsCount,dummy.matrix);hats.setColorAt(hatsCount++,new THREE.Color(i%2?'#f3f0da':'#d72831'));}
 }
 hats.count=hatsCount;for(const object of [bodies,heads,hats]){object.computeBoundingSphere();parent.add(object);}
 const flagMat=japaneseFlag();
 for(let i=0;i<Math.max(4,Math.floor(length/13));i++){
  const row=roofed?Math.min(rows-1,3+i%5):3+i%Math.max(1,rows-3),x=width/2-.65-row*(width-1.3)/rows,y=base+1.55+row*.65,z=-length*.45+i*length/Math.max(4,Math.floor(length/13));
  scenePole(parent,x,y,z);const flag=mesh(parent,new THREE.PlaneGeometry(1.15,.72,8,2),flagMat,x+.57,y+.45,z,false);flag.castShadow=false;flags.push(flag);
 }
}
function scenePole(parent,x,y,z){mesh(parent,new THREE.CylinderGeometry(.015,.015,1.6,4),material('#d7dddf'),x,y,z);}
function japaneseFlag(){const c=document.createElement('canvas');c.width=256;c.height=160;const ctx=c.getContext('2d');ctx.fillStyle='#fbfaf0';ctx.fillRect(0,0,256,160);ctx.fillStyle='#bc2337';ctx.beginPath();ctx.arc(128,80,46,0,Math.PI*2);ctx.fill();const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;return material('#ffffff',{map,side:THREE.DoubleSide});}
function grandstand(scene,track,site,flags,base=0,roof=false){
 // Rectangle envelopes are kept clear of every branch, not just the nearest road.
 let width=site.width,length=site.length;while((width>8||length>30)&&!boxClear(track,site,width,length,3)){width*=.96;length*=.96;}if(!boxClear(track,site,width,length,3))return;
 const g=at(scene,site,site.heading+(site.side===1?Math.PI:0)),rows=Math.max(6,Math.floor(width/1.4)),columns=Math.max(15,Math.floor(length/.82));
 if(site.banked){const shape=new THREE.Shape();shape.moveTo(width/2+1,0);shape.lineTo(-width/2,rows*.65);shape.lineTo(-width/2-6,rows*.65);shape.lineTo(-width/2-17,0);shape.closePath();mesh(g,new THREE.ExtrudeGeometry(shape,{depth:length,bevelEnabled:false}),scene.surfaces.material('grass','#527344'),0,0,-length/2);}
 for(let row=0;row<rows;row++){const x=width/2-.5-row*(width-1)/rows,h=base+.35+row*.65;scene.box((width-1)/rows+.05,site.banked?.15:h,length,site.banked?'#919e91':'#bfc1b5',x,site.banked?h:h/2,0,g);scene.box(.38,.16,length,'#b92631',x,h+.11,0,g);}
 crowd(g,rows,columns,width,length,base,flags,roof);
 for(const x of [-width/2,width/2])for(const z of [-length/2,length/2])scene.box(.09,1.2,.09,'#ccd2cb',x,base+rows*.65+.6,z,g);
 if(roof){const height=base+rows*.65+4;scene.box(width+4,.26,length+4,'#b8bfc2',-1,height,0,g);for(let z=-length/2;z<=length/2;z+=12){scene.box(.35,height,.35,'#e1e3dc',-width/2,height/2,z,g);beam(scene,g,new THREE.Vector3(-width/2,height-2,z),new THREE.Vector3(width/2+1,height-.3,z),'#7b898d',.16);}for(let z=-length/2;z<length/2;z+=1.4)scene.box(width+4,.06,.07,'#71848a',-1,height+.15,z,g);}
 const sign=trackSign('SUZUKA CIRCUIT',Math.min(36,length),1.1,'#f0eee5','#c42b34');sign.position.set(width/2+.08,base+1.2,0);sign.rotation.y=Math.PI/2;g.add(sign);return {...site,width,length};
}
function mainComplex(scene,track,flags){
 const mapped=layout(track).mapped,reservations=[];
 for(const p of mapped.filter(p=>['V1','V2','A1','Q2','R','D5'].includes(p.name))){const stand=grandstand(scene,track,p,flags,p.name==='V2'?9:0,p.name==='V2');if(stand)reservations.push(stand);}
 const p=mapped.find(p=>p.name==='ピットビル');if(!p)return reservations;
 reservations.push(p);const width=Math.min(22,p.width),length=Math.min(320,p.length),g=at(scene,p);scene.box(width,10,length,'#e1dfd3',0,5,0,g);scene.box(width+2,.38,length+3,'#858e90',0,10.2,0,g);addFacadePanels(g,width,10,length,buildingFacade('research'));
 const roadSide=-p.side;for(let z=-length/2+7;z<length/2;z+=11){scene.box(.15,3.7,8,'#59686c',roadSide*(width/2+.08),1.9,z,g);scene.box(.18,.42,8,'#c52b30',roadSide*(width/2+.19),4,z,g);}
 const sign=trackSign('HONDA  •  SUZUKA CIRCUIT',length-12,1.4,'#f0eee4','#c62931');sign.position.set(roadSide*(width/2+.2),8.9,0);sign.rotation.y=roadSide*Math.PI/2;g.add(sign);
 for(const [fraction,side,width,length] of [[.18,1,20,76],[.24,-1,24,90],[.33,1,21,92],[.85,-1,18,105]]){
  const p=safeBoxSite(track,fraction*track.length,width/2+4,length/2+4,side,13);const stand=grandstand(scene,track,{...p,y:suzukaTerrainHeight(track,p.x,p.z),width,length,side,banked:true},flags);if(stand)reservations.push(stand);
 }
 return reservations;
}
function ferrisWheel(scene,track){
 const site=layout(track).mapped.find(p=>p.id==='184107083'),p={...site,y:suzukaTerrainHeight(track,site.x,site.z)},g=at(scene,p,.25),wheel=new THREE.Group(),radius=23,hubY=27;wheel.position.y=hubY;g.add(wheel);
 const white=material('#e9ece6',{metalness:.45,roughness:.38});
 for(const z of [-1.15,1.15]){mesh(wheel,new THREE.TorusGeometry(radius,.18,5,96),white,0,0,z,false);mesh(wheel,new THREE.TorusGeometry(radius-1.2,.10,4,96),white,0,0,z,false);}
 for(let i=0;i<32;i++){const a=i*Math.PI/16;for(const z of [-1.15,1.15])beam(scene,wheel,new THREE.Vector3(0,0,z),new THREE.Vector3(Math.sin(a)*radius,Math.cos(a)*radius,z),'#e3e9e7',.055,true);beam(scene,wheel,new THREE.Vector3(Math.sin(a)*radius,Math.cos(a)*radius,-1.15),new THREE.Vector3(Math.sin(a)*radius,Math.cos(a)*radius,1.15),'#e3e9e7',.09,true);}
 const rimParts=[...wheel.children],rimGeometries=rimParts.map(part=>{part.updateMatrix();const geometry=part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();return geometry.applyMatrix4(part.matrix);}),rimGeometry=mergeGeometries(rimGeometries);for(const geometry of rimGeometries)geometry.dispose();
 if(rimGeometry){for(const part of rimParts){part.removeFromParent();part.geometry.dispose();if(part.material!==white)part.material.dispose();}mesh(wheel,rimGeometry,white,0,0,0,false);}
 for(const z of [-4,4])for(const x of [-12,12])beam(scene,g,new THREE.Vector3(x,0,z),new THREE.Vector3(0,hubY,z>0?1.4:-1.4),'#cfd7d5',.65);
 mesh(g,new THREE.CylinderGeometry(1.15,1.15,4.8,16),white,0,hubY,0).rotation.x=Math.PI/2;
 scene.box(31,.6,17,'#b4b6a9',0,.3,0,g);
 const cabins=new THREE.InstancedMesh(new THREE.BoxGeometry(1.7,1.5,1.5),material('#ffffff'),32),windows=new THREE.InstancedMesh(new THREE.BoxGeometry(1.72,.66,1.52),material('#82b6c7',{metalness:.3,roughness:.22}),32),roofs=new THREE.InstancedMesh(new THREE.BoxGeometry(1.95,.18,1.75),white,32),dummy=new THREE.Object3D();
 for(const object of [cabins,windows,roofs]){object.instanceMatrix.setUsage(THREE.DynamicDrawUsage);object.castShadow=true;object.receiveShadow=true;object.frustumCulled=false;g.add(object);}
 for(let i=0;i<32;i++)cabins.setColorAt(i,new THREE.Color(['#d43a35','#e9bb38','#3f94b8','#5b9a5c','#d96a9d','#e5e7df'][i%6]));
 const sign=trackSign('CIRCUIT WHEEL',21,1.8,'#f3eee0','#bd3036');sign.position.set(0,3,4.3);g.add(sign);
 const rotate=time=>{const phase=time*.000018;wheel.rotation.z=phase;for(let i=0;i<32;i++){const a=i*Math.PI/16-phase,x=Math.sin(a)*radius,y=hubY+Math.cos(a)*radius;for(const [object,offset] of [[cabins,-.5],[windows,-.05],[roofs,.43]]){dummy.position.set(x,y+offset,0);dummy.updateMatrix();object.setMatrixAt(i,dummy.matrix);}}for(const object of [cabins,windows,roofs])object.instanceMatrix.needsUpdate=true;};rotate(0);return rotate;
}
function amusementPark(scene,track){
 const mapped=layout(track).mapped;
 for(const [id,color] of [['308691933','#b6413b'],['466596481','#e3ac36']]){
  const site=mapped.find(p=>p.id===id),p={...site,y:suzukaTerrainHeight(track,site.x,site.z)},g=at(scene,p),points=[];
  // Distant original ride artwork, placed at the mapped attraction rather than a fabricated landmark beside the road.
  const length=id==='308691933'?105:125,width=36;
  for(let i=0;i<64;i++){const a=i/64*Math.PI*2;points.push(new THREE.Vector3(Math.sin(a)*width,8+9*(.5+.5*Math.sin(a*3)),Math.cos(a)*length/2));}
  const curve=new THREE.CatmullRomCurve3(points,true);for(const x of [-.65,.65]){const rail=mesh(g,new THREE.TubeGeometry(curve,180,.16,5,true),material(color));rail.position.x=x;}
  for(let i=0;i<64;i+=2){const p=points[i];scene.box(.25,p.y,.25,'#dae0d9',p.x,p.y/2,p.z,g);if(i%4===0)beam(scene,g,new THREE.Vector3(p.x-4,0,p.z),p,'#a9b4b1',.17);}
  scene.box(16,4,10,'#e2dccc',0,2,0,g);scene.box(18,.25,12,color,0,4.1,0,g);
 }
 for(let i=0;i<7;i++){const pos=projected(track,[136.5404+i*.00015,34.84695-(i%2)*.00024]),y=suzukaTerrainHeight(track,pos.x,pos.z);scene.box(12,4+i%3,16,['#e1d7be','#c7d6d2','#b9bdb6'][i%3],pos.x,y+2+(i%3)/2,pos.z);}
}
function crossover(scene,track){
 let upperIndex=0;track.points.forEach((p,i)=>{if(p.y-p.groundY>track.points[upperIndex].y-track.points[upperIndex].groundY)upperIndex=i;});const upper=track.points[upperIndex];if(upper.y-upper.groundY<4)return;
 let lowerIndex=0,best=Infinity;track.points.forEach((p,i)=>{if(Math.min(wrap(i-upperIndex,track.points.length),wrap(upperIndex-i,track.points.length))*track.step<250)return;const d=Math.hypot(p.x-upper.x,p.z-upper.z);if(d<best){best=d;lowerIndex=i;}});
 const lower=track.points[lowerIndex],s=upperIndex*track.step,half=track.width/2+7.4,mat=scene.surfaces.material('concrete','#c4c8bf'),positions=[],uv=[],indices=[];
 // A structural soffit follows the existing elevated road exactly. No new road mesh or track elevations.
 for(let i=0;i<=28;i++){const p=sample(track,s-42+i*3);for(const x of [-half,half]){positions.push(p.x+Math.cos(p.heading)*x,p.y-.72,p.z-Math.sin(p.heading)*x);uv.push(x/4,i*.75);}if(i<28){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();mesh(scene.group,geometry,mat);
 // Piers sit outside the full lower roadway, fence and verge envelope.
 for(const d of [-30,30]){const p=sample(track,s+d),g=at(scene,p);for(const x of [-half,half]){const wx=p.x+Math.cos(p.heading)*x,wz=p.z-Math.sin(p.heading)*x,dx=wx-lower.x,dz=wz-lower.z,lowerOffset=Math.abs(dx*Math.cos(lower.heading)-dz*Math.sin(lower.heading));if(lowerOffset<track.width/2+9||roadClearance(track,wx,wz)<3)continue;const floor=suzukaTerrainHeight(track,wx,wz),height=p.y-.72-floor;scene.box(1.1,height,2.4,'#b7bcb2',x,-.72-height/2,0,g);}}
 for(const side of [-1,1])for(let d=-42;d<42;d+=3){const p=sample(track,s+d,side*half),q=sample(track,s+d+3,side*half);beam(scene,scene.group,new THREE.Vector3(p.x,p.y-.3,p.z),new THREE.Vector3(q.x,q.y-.3,q.z),'#b9beb8',.9);}
 const p=sample(track,s),g=at(scene,p),sign=trackSign('SUZUKA CIRCUIT',track.width+8,.7,'#eeeae0','#c12832');sign.position.set(0,-.22,-6);g.add(sign);
}
function landscape(scene,track,reservations){
 const sites=[],reserved=[...reservations,...layout(track).mapped.filter(p=>['V1','V2','A1','Q2','R','D5','ピットビル','サーキットホイール'].includes(p.name))];
 const occupied=p=>reserved.some(r=>{const dx=p.x-r.x,dz=p.z-r.z;return Math.abs(dx*Math.cos(r.heading)-dz*Math.sin(r.heading))<r.width/2+12&&Math.abs(dx*Math.sin(r.heading)+dz*Math.cos(r.heading))<r.length/2+12;});
 for(let s=0;s<track.length;s+=17)for(const side of [-1,1])for(const band of [0,1,2]){const offset=side*(track.width/2+24+band*37+Math.sin(s*.13+band)*9),p=sample(track,s,offset);if(roadClearance(track,p.x,p.z)<12||occupied(p))continue;sites.push({...p,y:suzukaTerrainHeight(track,p.x,p.z),scale:.85+.45*(.5+.5*Math.sin(s*.17+band)),angle:s*.021});}
 addVegetation(scene,track,{...scene.profile,forest:true},{sites,palms:false});
 const bushes=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),material('#315e3b'),sites.length),conifers=new THREE.InstancedMesh(new THREE.ConeGeometry(2.7,9,7),material('#28503a'),Math.ceil(sites.length/3)),dummy=new THREE.Object3D();let pine=0;
 sites.forEach((p,i)=>{dummy.position.set(p.x+2,p.y+.85,p.z+2);dummy.scale.set(2.8,1.4,2);dummy.rotation.set(0,p.angle,0);dummy.updateMatrix();bushes.setMatrixAt(i,dummy.matrix);if(i%3===0){dummy.position.set(p.x,p.y+7,p.z);dummy.scale.setScalar(.9);dummy.updateMatrix();conifers.setMatrixAt(pine++,dummy.matrix);}});conifers.count=pine;for(const object of [bushes,conifers]){object.computeBoundingSphere();object.castShadow=true;object.receiveShadow=true;scene.group.add(object);}
}
function trackside(scene,track,panels){
 const sponsors=[['HONDA','#f0eee5','#c6242f'],['ROLEX','#075d40','#d7bd64'],['DHL','#eed32a','#c42931']],signMaterials=sponsors.map(([name,bg,ink])=>trackSign(name,7,.66,bg,ink).material);
 for(let s=25,i=0;s<track.length;s+=24,i++)for(const side of [-1,1]){const offset=ribbonOffset(track,Math.floor(s/track.step),side*(track.width/2+6.4)),p=sample(track,s,offset),sign=mesh(scene.group,new THREE.PlaneGeometry(7,.66),signMaterials[Math.floor(i/12)%3],p.x,p.y+.47,p.z);sign.rotation.y=p.heading+(side===1?-Math.PI/2:Math.PI/2);}
 for(let i=0;i<18;i++){
  const s=(i+.4)/18*track.length,p=safeBoxSite(track,s,3,4,i%2?1:-1,6),g=at(scene,{...p,y:suzukaTerrainHeight(track,p.x,p.z)}),white=material('#f3f0e6'),helmet=material('#f6f7ec');
  scene.box(.1,4,.1,'#e1e5df',-2,2,0,g);scene.box(.58,.23,.27,'#acb8bb',-2.2,3.9,0,g);scene.box(.17,.17,.28,'#273941',-2.53,3.9,0,g);
  for(let j=0;j<3;j++){const x=j*.62;mesh(g,new THREE.CapsuleGeometry(.2,.4,2,6),white,x,.99,0);for(const side of [-1,1])scene.box(.14,.72,.16,'#e8e7df',x+side*.1,.36,0,g);mesh(g,new THREE.SphereGeometry(.145,8,6),helmet,x,1.56,0);scene.box(.23,.08,.05,'#354a51',x,1.56,.125,g);}
  const led=new THREE.MeshBasicMaterial({color:'#36d183',toneMapped:false}),panel=mesh(g,new THREE.PlaneGeometry(.95,.65),led,-1,2.3,.1,false);panel.rotation.y=Math.PI;panel.castShadow=false;scene.box(1.08,.79,.18,'#273b37',-1,2.3,0,g);panels.push({s,material:led});
  if(i%3===0){const site=safeBoxSite(track,s,4,4,-1,17),tower=at(scene,{...site,y:suzukaTerrainHeight(track,site.x,site.z)});for(const x of [-1.7,1.7])for(const z of [-1.7,1.7])scene.box(.13,14,.13,'#31654e',x,7,z,tower);for(let y=0;y<13;y+=2.7)for(const z of [-1.7,1.7])beam(scene,tower,new THREE.Vector3(-1.7,y,z),new THREE.Vector3(1.7,y+2.7,z),'#32684e',.10);scene.box(4.1,.15,4.1,'#6d8274',0,13,0,tower);scene.box(.8,.5,.8,'#303f44',0,14,0,tower);scene.box(.27,.24,.45,'#152a33',0,14,.61,tower);}
 }
 // Stacked black tyre banks stay behind existing solid Armco faces.
 const tyreMat=material('#19201f',{roughness:.96}),tyres=[],dummy=new THREE.Object3D();
 for(const at of [.09,.26,.43,.61,.87,.93]){const a=sample(track,at*track.length-20),b=sample(track,at*track.length+20),side=-Math.sign(angleDiff(b.heading,a.heading))||1;for(let d=-18;d<=18;d+=1.05){const p=sample(track,at*track.length+d,side*(track.width/2+9));if(roadClearance(track,p.x,p.z)<6)continue;for(let row=0;row<2;row++)for(let level=0;level<3;level++)tyres.push({x:p.x+Math.cos(p.heading)*side*row*.72,z:p.z-Math.sin(p.heading)*side*row*.72,y:p.y+.2+level*.34});}}
 const stacks=new THREE.InstancedMesh(new THREE.TorusGeometry(.33,.12,5,9),tyreMat,tyres.length);tyres.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(Math.PI/2,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();stacks.setMatrixAt(i,dummy.matrix);});stacks.computeBoundingSphere();stacks.castShadow=true;stacks.receiveShadow=true;scene.group.add(stacks);
 for(const [fraction,brand] of [[.975,0],[.46,1],[.80,2]]){
  const p=sample(track,fraction*track.length);let span=track.width/2+13;while(span<80&&[-1,1].some(side=>roadClearance(track,p.x+Math.cos(p.heading)*side*span,p.z-Math.sin(p.heading)*side*span)<4))span+=5;if(span>=80)continue;const g=at(scene,p);
  for(const x of [-span,span]){scene.box(.32,8.5,.32,'#63736e',x,4.25,0,g);scene.box(.32,8.5,.32,'#63736e',x,4.25,2,g);beam(scene,g,new THREE.Vector3(x,0,0),new THREE.Vector3(x,8.5,2),'#63736e',.16);}
  scene.box(span*2,1.3,2.4,'#657670',0,8.25,1,g);for(let x=-span;x<span;x+=4)beam(scene,g,new THREE.Vector3(x,7.6,-.2),new THREE.Vector3(Math.min(span,x+4),8.9,-.2),'#e0e0d4',.1);
  const [name,bg,ink]=sponsors[brand],sign=trackSign(name,span*2-1,1.25,bg,ink);sign.position.set(0,8.25,-.24);sign.rotation.y=Math.PI;g.add(sign);
 }
 addBrakingBoards(scene,track);
}
export function addSuzuka(scene,track){
 const flags=[],panels=[];const reservations=mainComplex(scene,track,flags);const rotateWheel=ferrisWheel(scene,track);const wheelSite=layout(track).mapped.find(p=>p.id==='184107083');reservations.push({...wheelSite,width:65,length:65,heading:.25});amusementPark(scene,track);crossover(scene,track);landscape(scene,track,reservations);trackside(scene,track,panels);
 scene.environmentFx={frame(time,cars){rotateWheel(time);for(let i=0;i<flags.length;i++)flags[i].rotation.y=Math.sin(time*.0017+i)*.12;for(const panel of panels){const yellow=cars.some(car=>!car.finished&&!car.retired&&(car.offtrack||car.sliding)&&Math.min(wrap(car.s-panel.s,track.length),wrap(panel.s-car.s,track.length))<140);panel.material.color.set(yellow?(Math.floor(time/430)%2?'#ecc735':'#635520'):'#36d183');}},setConditions(){},dispose(){}};
 return scene.profile;
}
