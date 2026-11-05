import * as THREE from '/vendor/three.module.js';
import {planCota,cotaTerrainHeight} from '/shared/cota-scenery.mjs';
import {cotaConstrainGround} from '/shared/cota-scenery.mjs';
import {COTA_ARCHITECTURE} from './data/cota-architecture.js';
import {addVegetation} from './vegetation.js';
const jackets=['#bc4939','#315472','#e9dcc2','#d7a342','#537d80','#a3a6a1','#5d4568'];
export function cotaGround(track,x,z,cell=20){let y=cotaTerrainHeight(track,x,z,cell);const plan=planCota(track,COTA_ARCHITECTURE);for(const site of plan.foundations){if(!['pits','stand','bank','parking','camp','hospitality','medical','official','tower','observation','stage','plaza'].includes(site.kind))continue;const c=Math.cos(site.heading),s=Math.sin(site.heading),dx=Math.abs((x-site.x)*c-(z-site.z)*s)-site.w/2,dz=Math.abs((x-site.x)*s+(z-site.z)*c)-site.d/2,blend=1-Math.max(0,Math.min(1,Math.max(dx,dz)/4));if(blend)y+=(site.y-.14-y)*blend;}return cotaConstrainGround(track,x,z,y,cell);}
export function addCota(scene,track){
 const plan=planCota(track,COTA_ARCHITECTURE),materials=new Map(),labels=new Map(),crowds=[],flags=[],umbrellas=[],tents=[],caravans=[],parkingCars=[],poles=[],houses=[],panels=[],smokeSites=[],grassSites=[],mistSites=[],clock={value:0},dummy=new THREE.Object3D(),tint=new THREE.Color();
 const mat=(color,extra={})=>{if(extra.map)return new THREE.MeshStandardMaterial({color,roughness:.8,...extra});const key=JSON.stringify([color,extra]);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.82,...extra}));return materials.get(key);};
 function group(site){const g=new THREE.Group();g.position.set(site.x,site.y,site.z);g.rotation.y=site.heading||0;g.userData.cotaSite=site.id;scene.group.add(g);return g;}
 function mesh(parent,geometry,material,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.userData.mappedStatic=true;m.receiveShadow=true;parent.add(m);return m;}
 const signCanvas=document.createElement('canvas');signCanvas.width=2048;signCanvas.height=4096;const signInk=signCanvas.getContext('2d'),signMap=new THREE.CanvasTexture(signCanvas);signMap.colorSpace=THREE.SRGBColorSpace;signMap.anisotropy=8;const signMaterial=new THREE.MeshStandardMaterial({map:signMap,roughness:.8,side:THREE.FrontSide});
 function sign(parent,text,w,h,x,y,z,angle=0,color='#253c57'){const key=text+color;if(!labels.has(key)){const slot=labels.size;if(slot>=128)throw Error('Cota sign atlas capacity exceeded');const cellLeft=slot%4*512,cellTop=Math.floor(slot/4)*128;signInk.fillStyle=color;signInk.fillRect(cellLeft,cellTop,512,128);signInk.fillStyle='#f4eee0';signInk.font='bold 82px Arial';signInk.textAlign='center';signInk.textBaseline='middle';signInk.fillText(text,cellLeft+256,cellTop+68,488);labels.set(key,{left:cellLeft,top:cellTop});}const {left,top}=labels.get(key),geometry=new THREE.PlaneGeometry(w,h),uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(left+uv.getX(i)*512)/2048,1-(top+(1-uv.getY(i))*128)/4096);const m=mesh(parent,geometry,signMaterial,x,y,z);m.rotation.y=angle;const back=mesh(parent,geometry.clone(),mat(color),x,y,z);back.rotation.y=angle+Math.PI;return m;}
 const world=(site,x,y,z)=>({owner:site.id,x:site.x+Math.cos(site.heading)*x+Math.sin(site.heading)*z,y:site.y+y,z:site.z-Math.sin(site.heading)*x+Math.cos(site.heading)*z,heading:site.heading});
 function instances(geometry,material,sites,pose,cell=1100){const buckets=new Map();for(const p of sites){const key=Math.floor(p.x/cell)+':'+Math.floor(p.z/cell);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(p);}const meshes=[];for(const chunk of buckets.values()){const m=new THREE.InstancedMesh(geometry,material,chunk.length);chunk.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.heading||0,0);dummy.scale.set(1,1,1);pose(p,i,dummy);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);if(p.color)m.setColorAt(i,tint.set(p.color));});m.userData.cotaOwners=chunk.map(p=>p.owner||p.id);m.computeBoundingSphere();m.receiveShadow=true;scene.group.add(m);meshes.push(m);}return meshes;}
 for(const site of plan.sites){
  if(site.kind==='pits'){
   const g=group(site),front=-site.side,w=site.w-5,d=site.d-5;
   scene.box(w,6.5,d,'#c1c8c6',0,3.25,0,g);scene.box(w*.87,3.2,d*.96,'#63828c',0,8.5,0,g);
   for(let i=0;i<24;i++){const z=-d/2+(i+.5)*d/24;scene.box(w+1,.3,d/24+.1,'#d8ddda',0,11.2+(i%4)*.35,z,g);scene.box(.16,.7,d/24,'#b52e2c',front*(w/2+.1),6.9,z,g);scene.box(.12,3.1,.15,'#bfcac6',front*(w*.435+.1),8.6,z,g);}
   for(let i=0;i<32;i++){const z=-d*.47+i*d*.94/31;scene.box(.15,4.3,7.6,'#3b505b',front*(w/2+.1),2.2,z,g);}
   scene.box(4,1.2,17,'#48718b',front*(w/2-2),1,d*.3,g);sign(g,'APEX · PIT & PADDOCK',55,1.8,front*(w/2+.2),6,0,front*Math.PI/2);scene.box(5,1.2,18,'#b0b5a7',front*(w/2-3),11.6,d*.3,g);sign(g,'PODIUM',16,1.4,front*(w/2+.2),12,d*.3,front*Math.PI/2);sign(g,'PIT LANE · 80',22,1.4,front*(w/2+.2),4.8,-d*.37,front*Math.PI/2);
   for(const z of [-d*.4,0,d*.4])poles.push(world(site,-front*(w/2-2),0,z));
  }
  if(site.kind==='hospitality'){
   const g=group(site),w=site.w-3,d=site.d-4,height=7,front=-site.side;
   scene.box(w,height,d,'#c5c6bb',0,height/2,0,g);scene.box(w+.4,.25,d+.4,'#78868b',0,height+.15,0,g);
   scene.box(.15,2.8,d*.84,'#607d8b',front*(w/2+.1),height-1.5,0,g);for(let z=-d*.4;z<d*.4;z+=6)scene.box(.2,3,.14,'#b7c5bf',front*(w/2+.17),height-1.5,z,g);
   sign(g,'HILL COUNTRY · CLUB',d*.8,1.5,front*(w/2+.2),3,0,front*Math.PI/2);
  }
  if(site.kind==='medical'){const g=group(site);scene.box(site.w-3,5,site.d-3,'#c8c6b7',0,2.5,0,g);scene.box(2.5,2.5,5.8,'#e4e5d9',0,1.3,0,g);scene.box(2.55,.3,1,'#587560',0,1.6,0,g);sign(g,'MEDICAL',10,1.2,0,4,-site.d/2+1.4,Math.PI);}
  if(site.kind==='observation'){
   const g=group(site),steel=mat('#d4d5ce',{metalness:.25}),ribs=mat('#a45d47',{metalness:.2}),glass=mat('#849da0',{metalness:.15,roughness:.3}),height=site.height;
   scene.box(3.6,height-6,3.6,'#aeb8b3',0,(height-6)/2,0,g);
   for(const phase of [0,Math.PI]){const path=[];for(let i=0;i<=128;i++){const a=i/128*Math.PI*12+phase;path.push(new THREE.Vector3(Math.cos(a)*3.7,2+i/128*(height-7),Math.sin(a)*3.7));}mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path),128,.1,4,false),steel);for(let i=0;i<72;i++){const a=i/72*Math.PI*12+phase,step=scene.box(2.6,.14,1.15,'#c1c7c1',Math.cos(a)*3.3,2+i/72*(height-7),Math.sin(a)*3.3,g);step.rotation.y=-a;}}
   for(const x of [-4.8,4.8])for(const z of [-4.8,4.8])scene.box(.25,height-4,.25,'#d1d5cf',x,(height-4)/2,z,g);
   scene.box(16,.7,18,'#b4beb9',0,height-4,0,g);scene.box(14,2.3,16,'#6b858d',0,height-2.5,0,g);scene.box(18,.35,20,'#d7d8cd',0,height-.3,0,g);
   for(let i=0;i<13;i++){const x=-8+i*16/12,path=[new THREE.Vector3(x,0,5),new THREE.Vector3(x,12,5),new THREE.Vector3(x,height-6,5),new THREE.Vector3(x,height,4),new THREE.Vector3(x,height,-10)];mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path),36,.13,4,false),ribs);}
   mesh(g,new THREE.PlaneGeometry(9,7),glass,0,height-3.5,1).rotation.x=-Math.PI/2;
  }
  if(site.kind==='stage'){
   const g=group(site),w=site.w-4,d=site.d-4;
   scene.box(w,1.4,d,'#697476',0,.7,0,g);scene.box(w*.65,12,d*.75,'#263a44',w*.1,7,0,g);
   for(const x of [-w*.45,w*.45])for(const z of [-d*.46,d*.46])scene.box(.35,19,.35,'#c0c9c5',x,9.5,z,g);
   for(let strip=0;strip<10;strip++){const z=-d/2+(strip+.5)*d/10,roof=scene.box(w+1,.4,d/10+.2,'#c9ccc2',0,19+1.4*Math.sin(strip/9*Math.PI),z,g);roof.rotation.z=.08;}
   sign(g,'LIVE · HILL COUNTRY',Math.min(28,d-3),2,-w/2-.15,14,0,-Math.PI/2);scene.box(.2,6,d*.6,'#3d6d88',-w/2+.2,8,0,g);
  }
  if(site.kind==='plaza'){
   const g=group(site);scene.box(site.w-2,.12,site.d-2,'#b3aa91',0,0,0,g);
   mesh(g,new THREE.CylinderGeometry(7,7,.35,32),mat('#c7c3ac'),0,.2,0);mesh(g,new THREE.CylinderGeometry(6.5,6.5,.08,32),mat('#668b93',{roughness:.25}),0,.41,0);
   for(let i=0;i<7;i++){const a=i*Math.PI*2/7;mesh(g,new THREE.CylinderGeometry(.08,.14,1.6,5),mat('#a3c3c6',{transparent:true,opacity:.6}),Math.cos(a)*4,1.2,Math.sin(a)*4);}
   for(const x of [-site.w*.34,site.w*.34]){scene.box(.5,9,.5,'#c7c8bc',x,4.5,-site.d*.4,g);}scene.box(site.w*.7,1.5,.6,'#485d68',0,9,-site.d*.4,g);sign(g,'APEX · FAN PLAZA',site.w*.6,1.2,0,9,-site.d*.4-.4,Math.PI);
   for(let i=0;i<8;i++){const z=-site.d*.22+i*site.d*.065;tents.push({...world(site,site.w*.36,.1,z),color:i%2?'#c9b383':'#d8d5c8'});}
  }
  if(site.kind==='tower'){const g=group(site);scene.box(10,8,12,'#acaea3',0,4,0,g);scene.box(13,3,15,'#405c67',0,9.5,0,g);scene.box(16,.4,18,'#bec5be',0,11.2,0,g);for(const side of [-1,1]){scene.box(16,.08,.08,'#677d7b',0,8.4,side*8,g);scene.box(.08,.08,16,'#677d7b',side*7,8.4,0,g);}scene.box(.12,6,.12,'#859798',0,14,0,g);sign(g,'RACE CONTROL',12,1.1,0,6.3,-6.1,Math.PI);}
  if(site.kind==='stand'||site.kind==='bank'){
   const g=group(site),rows=site.rows,length=site.d-8,cols=Math.floor(length/1.45),step=(site.w-8)/rows,isBank=site.kind==='bank';
   for(let row=0;row<rows;row++){const x=site.side*(-site.w/2+4+row*step),y=.7+row*(isBank?.3:.54);scene.box(step+.04,isBank?y+4:.55,length,isBank?'#9b9564':'#a9b1b0',x,isBank?(y-4)/2:y,0,g);if(!isBank&&row%4===0)for(let support=-length/2+3;support<length/2;support+=16)scene.box(.22,y+4,.22,'#8c9893',x,(y-4)/2,support,g);if(!isBank)scene.box(step*.8,.1,length,row%3?'#63798b':'#888c82',x,y+.34,0,g);for(let col=0;col<cols;col++){if(col%27===0)continue;const p={...world(site,x,y+.72,-length/2+(col+.5)*length/cols),color:jackets[(col+row*3)%jackets.length],hat:(col+row)%4===0};crowds.push(p);if((row+col*3)%23===0)umbrellas.push({...p,y:p.y+.9});}}
   if(site.roof&&!isBank){const h=rows*.54+4;for(let strip=0;strip<8;strip++){const z=-(site.d-2)/2+(strip+.5)*(site.d-2)/8;scene.box(site.w-1,.3,(site.d-2)/8+.1,'#d6d9d4',0,h+Math.sin(strip/7*Math.PI)*1.8,z,g);}for(let z=-length/2;z<length/2;z+=20){scene.box(.22,h,.22,'#7e8f91',site.side*(site.w/2-2),h/2,z,g);scene.box(site.w-2,.14,.14,'#a8b6b1',0,h-.4,z,g);}}
   for(let i=0;i<Math.floor(length/14);i++){const x=site.side*(-site.w/2+5+i%rows*step),y=3+i%rows*.5,z=-length/2+5+i*14;flags.push(world(site,x,y,z));scene.box(.03,2.5,.03,'#93a3a1',x,y-.9,z,g);}
   sign(g,site.label||'GENERAL ADMISSION',Math.min(length,32),1,-site.side*(site.w/2-1),2.2,0,-site.side*Math.PI/2);if(site.id.endsWith('0')||site.id.endsWith('5')||isBank)smokeSites.push(world(site,site.side*(site.w/2-5),rows*.3+3,0));
   // Generic video screen stays wholly inside the same stand envelope.
   scene.box(.25,2.8,4.8,'#253e4e',-site.side*(site.w/2-2),3.8,0,g);sign(g,'APEX 25 · LIVE',4.5,2.4,-site.side*(site.w/2-1.8),3.8,0,-site.side*Math.PI/2);
  }
  if(site.kind==='camp'){mistSites.push({...site});
   const g=group(site);scene.box(site.w-2,.04,site.d-2,'#9e9563',0,-.06,0,g);for(let row=0;row<12;row++)for(let col=0;col<6;col++)tents.push({...world(site,-site.w*.4+col*site.w*.16,.04,-site.d*.39+row*site.d*.065),color:['#9b6260','#587d72','#a6996b','#576d8d'][col%4]});for(let i=0;i<12;i++)caravans.push(world(site,-site.w*.43+i*site.w*.078,.1,site.d*.45));for(const x of [-site.w*.4,site.w*.4]){poles.push(world(site,x,0,0));flags.push(world(site,x,6,0));}sign(g,'TEXAS · CAMPING',site.w*.7,2,0,2.7,-site.d*.46,Math.PI);
  }
  if(site.kind==='parking'){
   const g=group(site);scene.box(site.w-2,.05,site.d-2,'#818477',0,-.07,0,g);for(let lane=0;lane<4;lane++)for(let i=0;i<18;i++){const x=-site.w*.36+lane*site.w*.24,z=-site.d*.42+i*site.d*.047;scene.box(8,.025,.1,'#b8bb9e',x,-.03,z,g);if(i%5)parkingCars.push({...world(site,x,.1,z+3),color:jackets[(i+lane)%jackets.length]});}for(const x of [-site.w*.4,site.w*.4])for(const z of [-site.d*.4,site.d*.4])poles.push(world(site,x,0,z));sign(g,'EVENT PARKING',site.w*.6,2,0,2,-site.d*.46,Math.PI);
  }
  if(site.kind==='official'){
   const g=group(site),fit=site.approximateScale||1;g.scale.set(fit,1,fit);scene.box(4.5,.2,5,'#c0c8ba',0,.1,0,g);scene.box(4.6,.2,5.1,'#b9c3bd',0,3,0,g);for(const x of [-2,2])for(const z of [-2,2])scene.box(.1,3,.1,'#718583',x,1.5,z,g);
   for(let i=0;i<2;i++){scene.box(.4,.65,.3,'#ec8129',i*.65,1,0,g);scene.box(.25,.65,.25,'#d97526',i*.65,.4,0,g);mesh(g,new THREE.SphereGeometry(.16,6,4),mat('#e8ebdd'),i*.65,1.55,0);}
   scene.box(.1,3,.1,'#6c8280',3,1.5,0,g);scene.box(1.6,1,.15,'#2e4848',3,2.8,0,g);panels.push({...world(site,3*fit,2.8,-.09*fit),heading:site.heading+Math.PI,s:site.s});
   if(site.crane){scene.box(3,1,4,'#bdab64',7,1,0,g);scene.box(.55,11,.55,'#6b837c',7,6,0,g);const arm=scene.box(.25,.3,12,'#98aaa2',7,10,0,g);arm.rotation.x=-.25;scene.box(.8,.6,.9,'#2f4855',7,11.4,5.8,g);}else scene.box(4,2,5,'#bdc8bd',-1,1.15,4,g);
  }
  if(site.kind==='board'||site.kind==='banner'){const g=group(site),banner=site.kind==='banner';sign(g,site.label,banner?site.d-1:1.35,banner?1.2:1.05,0,1.5,0,banner?-site.side*Math.PI/2:Math.PI);scene.box(.08,2,.08,'#758c88',0,1,0,g);}
  if(site.kind==='rockcut'){const g=group(site);for(let i=0;i<4;i++){const stone=mesh(g,new THREE.IcosahedronGeometry(1,0),mat(i%2?'#bdaf87':'#b8aa81'),0,1.1+i*.5,-site.d*.30+i*site.d*.20);stone.scale.set(site.w*.28,1.2,site.d*.13);stone.rotation.y=i*.4;}}
  if(site.kind==='soil'){const g=group(site);const patch=mesh(g,new THREE.PlaneGeometry(site.w-2,site.d-2),mat('#916b51'));patch.rotation.x=-Math.PI/2;patch.position.y=.03;}
  if(site.kind==='grasspatch')for(let i=0;i<80;i++)grassSites.push({...world(site,(i*.618033%1-.5)*(site.w-2),0,(i*.38197%1-.5)*(site.d-2)),color:i%17===0?'#d2c484':'#a39f67'});if(site.kind==='house')houses.push(site);
 }
 instances(new THREE.CapsuleGeometry(.17,.32,2,4),mat('#ffffff'),crowds,(p,i,o)=>{o.position.y+=.35;o.rotation.z=.04*Math.sin(i);});instances(new THREE.SphereGeometry(.12,5,4),mat('#b6987a'),crowds,(p,i,o)=>{o.position.y+=.78;});instances(new THREE.CylinderGeometry(.26,.24,.06,8),mat('#aeb4a6'),crowds.filter(p=>p.hat),(p,i,o)=>{o.position.y+=.9;});
 const wetUmbrellas=instances(new THREE.ConeGeometry(.62,.3,7),mat('#718797'),umbrellas,(p,i,o)=>{});
 const tentGeometry=new THREE.ConeGeometry(1,1,4);tentGeometry.rotateY(Math.PI/4);instances(tentGeometry,mat('#ffffff'),tents,(p,i,o)=>{o.scale.set(3.4,2.4,4.3);o.position.y+=1.2;});instances(new THREE.BoxGeometry(3,2.3,6.4),mat('#d8d9cf'),caravans,(p,i,o)=>{o.position.y+=1.35;});instances(new THREE.BoxGeometry(3.05,.6,3.8),mat('#718995'),caravans,(p,i,o)=>{o.position.y+=1.65;});
 instances(new THREE.BoxGeometry(2.2,1.1,4.5),mat('#ffffff'),parkingCars,(p,i,o)=>{o.position.y+=.6;});instances(new THREE.BoxGeometry(1.8,.55,2.5),mat('#647a87'),parkingCars,(p,i,o)=>{o.position.y+=1.35;});
 instances(new THREE.CylinderGeometry(.1,.15,13,6),mat('#8b9d98'),poles,(p,i,o)=>{o.position.y+=6.5;});instances(new THREE.BoxGeometry(3.2,.25,1.4),mat('#d4ddd3'),poles,(p,i,o)=>{o.position.y+=13;});
 instances(new THREE.BoxGeometry(1,1,1),mat('#a69984'),houses,(p,i,o)=>{o.scale.set(p.w-2,p.height,p.d-2);o.position.y+=p.height/2;},2400);const roofGeometry=new THREE.ConeGeometry(1,1,4);roofGeometry.rotateY(Math.PI/4);instances(roofGeometry,mat('#75665e'),houses,(p,i,o)=>{o.scale.set((p.w-1)*.68,3,(p.d-1)*.68);o.position.y+=p.height+1.5;},2400);
 const broadleaf=plan.trees.filter(p=>p.type!=='pine'),pines=plan.trees.filter(p=>p.type==='pine'),forestCells=new Map();
 for(const tree of broadleaf){const key=Math.floor(tree.x/650)+':'+Math.floor(tree.z/650);if(!forestCells.has(key))forestCells.set(key,[]);forestCells.get(key).push(tree);}
 const forestMatrix=new THREE.Matrix4();for(const bucket of forestCells.values()){
  const center={x:bucket.reduce((sum,p)=>sum+p.x/bucket.length,0),z:bucket.reduce((sum,p)=>sum+p.z/bucket.length,0)},before=scene.group.children.length;
  addVegetation(scene,track,scene.profile,{sites:bucket.map(p=>({...p,angle:p.heading,heightScale:1.08})),traceOwners:true});
  const leaves=scene.group.children.slice(before),nearGroup=new THREE.Group(),farGroup=new THREE.Group(),lod=new THREE.LOD();
  for(const child of leaves){child.userData.cotaOwners=child.userData.monzaOwners;if(child.material.map)child.material.color.set('#b8b79d');scene.group.remove(child);for(let i=0;i<child.count;i++){child.getMatrixAt(i,forestMatrix);forestMatrix.elements[12]-=center.x;forestMatrix.elements[14]-=center.z;child.setMatrixAt(i,forestMatrix);}child.computeBoundingSphere();nearGroup.add(child);}
  const far=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),mat('#626e49'),bucket.length);far.userData.cotaOwners=bucket.map(p=>p.id);bucket.forEach((p,i)=>{dummy.position.set(p.x-center.x,p.y+7.5*p.scale,p.z-center.z);dummy.rotation.set(0,p.heading,0);dummy.scale.set(5.7*p.scale,4.2*p.scale,5.7*p.scale);dummy.updateMatrix();far.setMatrixAt(i,dummy.matrix);far.setColorAt(i,tint.setHSL(.25+i%5*.005,.22,.25+i%4*.025));});far.computeBoundingSphere();farGroup.add(far);lod.position.set(center.x,0,center.z);lod.addLevel(nearGroup,0);lod.addLevel(farGroup,650,.12);scene.group.add(lod);
 }
 const shrubs=plan.trees.filter((p,i)=>i%3===0).map(p=>({...p,owner:p.id}));instances(new THREE.IcosahedronGeometry(1,0),mat('#6c7651'),shrubs,(p,i,o)=>{o.position.y+=.8;o.scale.set(2.5,.9,2.5);},1100);
 const litterCanvas=document.createElement('canvas');litterCanvas.width=litterCanvas.height=128;const litterInk=litterCanvas.getContext('2d');for(let i=0;i<85;i++){litterInk.fillStyle=['#6b6040','#7a7149','#777d44'][i%3];const x=i*31%128,z=i*57%128;litterInk.fillRect(x,z,4+i%4,2+i%3);}const litterMap=new THREE.CanvasTexture(litterCanvas);litterMap.colorSpace=THREE.SRGBColorSpace;const litterGeo=new THREE.PlaneGeometry(6,6);litterGeo.rotateX(-Math.PI/2);instances(litterGeo,mat('#ffffff',{map:litterMap,transparent:true,depthWrite:false,side:THREE.DoubleSide}),shrubs,(p,i,o)=>{o.position.y+=.04;},1100);

 instances(new THREE.CylinderGeometry(.2,.4,9,6),mat('#6e6654'),pines,(p,i,o)=>{o.scale.set(p.scale,p.scale*.65,p.scale);o.position.y+=2.925*p.scale;});const tiers=pines.flatMap(p=>[0,1,2,3].map(tier=>({...p,tier})));instances(new THREE.ConeGeometry(1,1,9),mat('#606b50'),tiers,(p,i,o)=>{o.scale.set((3.8-p.tier*.65)*p.scale,(6-p.tier*.65)*p.scale*.65,(3.8-p.tier*.65)*p.scale);o.position.y+=(7+p.tier*2.3)*p.scale*.65;});
 const blade=new THREE.BufferGeometry(),bladePoints=[];for(let j=0;j<3;j++){const a=j*Math.PI/3;bladePoints.push(-Math.cos(a)*.11,0,-Math.sin(a)*.11,Math.cos(a)*.11,0,Math.sin(a)*.11,.035,.5+j*.08,.025);}blade.setAttribute('position',new THREE.Float32BufferAttribute(bladePoints,3));blade.computeVertexNormals();instances(blade,mat('#ffffff',{side:THREE.DoubleSide}),grassSites,(p,i,o)=>{o.position.y=cotaGround(track,p.x,p.z)+.12;o.rotation.y=i*1.4;o.scale.setScalar(.7+i%5*.12);});
 // Public-domain national flag motif; no team or commercial artwork.
 const flagCanvas=document.createElement('canvas');flagCanvas.width=320;flagCanvas.height=96;const ink=flagCanvas.getContext('2d');
 function star(cx,cy,r){ink.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,d=i%2?r*.4:r;const x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d;if(i===0)ink.moveTo(x,y);else ink.lineTo(x,y);}ink.closePath();ink.fill();}
 ink.fillStyle='#f0eee3';ink.fillRect(0,0,320,96);ink.fillStyle='#b9443d';ink.fillRect(0,48,160,48);ink.fillStyle='#2b4869';ink.fillRect(0,0,60,96);ink.fillStyle='#f7f1df';star(30,48,18);
 for(let band=0;band<13;band++){ink.fillStyle=band%2?'#f0eee3':'#b9443d';ink.fillRect(160,band*96/13,160,96/13+.3);}ink.fillStyle='#2b4869';ink.fillRect(160,0,65,52);ink.fillStyle='#f0eee3';for(let r=0;r<5;r++)for(let c=0;c<6;c++)star(166+c*10,6+r*10,2.3);
 const flagMap=new THREE.CanvasTexture(flagCanvas);flagMap.colorSpace=THREE.SRGBColorSpace;const cloth=mat('#ffffff',{map:flagMap,side:THREE.DoubleSide});cloth.onBeforeCompile=shader=>{shader.uniforms.cotaClock=clock;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float cotaClock;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z+=sin(position.x*5.0+cotaClock*2.3+instanceMatrix[3].x*.02)*.17*uv.x;');};cloth.customProgramCacheKey=()=> 'cota-flags-v1';
 for(const state of [0,1]){const geo=new THREE.PlaneGeometry(1.6,1,6,2),uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,(uv.getX(i)+state)/2);instances(geo,cloth,flags.filter((p,i)=>i%2===state),(p,i,o)=>{o.position.x+=.7;});}
 const led=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.4,.8),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide,toneMapped:false}),panels.length);panels.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.heading,0);dummy.scale.set(1,1,1);dummy.updateMatrix();led.setMatrixAt(i,dummy.matrix);led.setColorAt(i,tint.set('#39d28c'));});led.computeBoundingSphere();scene.group.add(led);
 const smoke=new THREE.ShaderMaterial({uniforms:{time:clock,opacity:{value:1}},transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:'uniform float time;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.x+=sin(time*.7+p.y)*.4;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.0);}',fragmentShader:'uniform float time;uniform float opacity;varying vec2 vUv;void main(){float a=sin(vUv.x*3.14159)*sin(vUv.y*3.14159);gl_FragColor=vec4(.85,.05,.04,a*.17*opacity*(.5+.5*sin(time*.2)));}'});
 instances(new THREE.PlaneGeometry(5,7,5,5),smoke,smokeSites,(p,i,o)=>{});
 const mist=new THREE.ShaderMaterial({uniforms:{wet:{value:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}',fragmentShader:'uniform float wet;varying vec2 vUv;void main(){float a=sin(vUv.x*3.14159)*sin(vUv.y*3.14159);gl_FragColor=vec4(.62,.68,.68,a*wet*.12);}'});instances(new THREE.PlaneGeometry(1,1),mist,mistSites,(p,i,o)=>{o.position.y+=3;o.scale.set(Math.min(60,p.w*.6),4,1);});
 const heat=new THREE.ShaderMaterial({uniforms:{clock,opacity:{value:1}},transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:'uniform float clock;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.x+=sin(p.y*4.0+clock*2.0)*.09;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.0);}',fragmentShader:'uniform float clock;uniform float opacity;varying vec2 vUv;void main(){float a=sin(vUv.x*3.14159)*sin(vUv.y*3.14159);gl_FragColor=vec4(.85,.83,.70,a*.015*opacity*(.6+.4*sin(clock+vUv.y*12.0)));}'});
 instances(new THREE.PlaneGeometry(6,2.5,8,4),heat,plan.sites.filter(p=>p.kind==='grasspatch').filter((p,i)=>i%4===0),(p,i,o)=>{o.position.y+=2;});
 signMap.needsUpdate=true;
 let last=0;scene.environmentFx={frame(time,cars){if(time-last<80)return;last=time;clock.value=time*.001;if(scene.scene)scene.scene.backgroundRotation.y=time*.000002;for(const [i,p]of panels.entries()){const caution=cars.some(c=>!c.finished&&!c.retired&&(c.offtrack||c.sliding)&&Math.min(Math.abs(c.s-p.s),track.length-Math.abs(c.s-p.s))<160);led.setColorAt(i,tint.set(caution?(Math.floor(time/350)%2?'#edca42':'#655a2d'):'#39d28c'));}led.instanceColor.needsUpdate=true;},setConditions(w){for(const m of wetUmbrellas)m.visible=w>.1;smoke.uniforms.opacity.value=1-w;heat.uniforms.opacity.value=1-w;mist.uniforms.wet.value=w;},dispose(){if(scene.scene)scene.scene.backgroundRotation.y=0;}};
 scene.group.userData.cotaPlan=plan;scene.group.userData.cotaBudget={spectators:crowds.length,trees:plan.trees.length,grassTufts:grassSites.length,flags:flags.length,tents:tents.length,caravans:caravans.length};return scene.profile;
}
