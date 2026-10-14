import * as THREE from '/vendor/three.module.js';
import {venuePlan,safeSite,VENUES} from '/shared/venues.mjs';
import {addFacadePanels} from './track-furniture.js';
import {buildingFacade} from './campus-buildings.js';
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.78,...extra});
export function addLandmarks(scene,track){
 const p=venuePlan(track),g=new THREE.Group();g.name=p.name;g.userData.landmark={...p};g.position.set(p.x,p.y,p.z);g.rotation.y=p.heading;scene.group.add(g);
 const box=(w,h,d,c,x=0,y=h/2,z=0)=>scene.box(w,h,d,c,x,y,z,g);
 const mesh=(geometry,color,x=0,y=0,z=0,extra={})=>{const m=new THREE.Mesh(geometry,mat(color,extra));m.position.set(x,y,z);g.add(m);return m;};
 const white='#e2e0d5',dark='#334e5d',accent=p.color;
 const roof=(w,d,y,c=accent,x=0,z=0)=>box(w,.7,d,c,x,y,z);
 const windows=(w,y,z=11)=>{for(let x=-w/2+3;x<w/2;x+=6)box(3,4,.25,dark,x,y,z);};
 // A contained forecourt gives large structures a grounded footprint.
 if(!['lake','banking','bull'].includes(p.kind)){const plaza=mesh(new THREE.CircleGeometry(p.radius*.94,48),'#79858a',0,-.02);plaza.rotation.x=-Math.PI/2;}
 const stand=()=>{for(let row=0;row<9;row++)box(2,1,92,row%3?accent:white,-row*1.7,1+row*.9);roof(24,99,12,white,-6);for(const z of [-44,0,44])box(.6,12,.6,dark,-15,6,z);};
 switch(p.kind){
 case 'stand':stand();break;
 case 'wing':
  for(let i=0;i<5;i++){const z=(i-2)*28;box(28,10,27,white,0,5,z);box(28.2,5,24,dark,0,6,z);const r=roof(37,29,12+i%2*3,accent,0,z);r.rotation.z=(i%2?1:-1)*.22;box(1,14,1,white,-17,7,z);}
  break;
 case 'petals':
  for(let i=0;i<7;i++){const z=(i-3)*19;box(27,5,18,dark,0,2.5,z);box(.7,18,.7,white,0,9,z);const petal=mesh(new THREE.SphereGeometry(1,14,8,0,Math.PI*2,0,Math.PI/2),accent,0,16,z);petal.scale.set(27,6,14);petal.rotation.z=.16;}
  break;
 case 'tower':
  for(let i=0;i<8;i++){mesh(new THREE.CylinderGeometry(20-i*.8,20-i*.8,3,28),i%2?white:dark,0,3+i*4.5);mesh(new THREE.CylinderGeometry(22-i*.8,22-i*.8,.6,28),accent,0,5+i*4.5);}
  break;
 case 'control':
  box(13,32,14,white);for(let i=0;i<5;i++){box(21,3,22,dark,0,16+i*4);roof(24,24,18+i*4,accent);}box(.4,12,.4,white,0,42);break;
 case 'pagoda':
  box(15,43,14,white);for(let i=0;i<8;i++){box(29-i*1.5,3,25-i, dark,0,8+i*5);roof(34-i*1.6,29-i,10+i*5,white);}box(.3,12,.3,white,0,54);break;
 case 'sands':
  for(const x of [-62,0,62]){box(29,145,30,dark,x,72.5);for(let y=8;y<145;y+=7)box(30,.7,31,white,x,y);}
  const deck=mesh(new THREE.SphereGeometry(1,24,10),white,0,148);deck.scale.set(105,5,26);roof(152,23,152,'#4f8f76');box(115,.6,8,'#70d6d3',0,152.8,6);break;
 case 'sphere':
  mesh(new THREE.SphereGeometry(60,36,24),accent,0,53,0,{emissive:'#6e294a',emissiveIntensity:.7,roughness:.35});
  for(let i=-3;i<=3;i++){const r=Math.sqrt(3600-(i*14)**2),ring=mesh(new THREE.TorusGeometry(r,.4,4,64),i%2?'#ffb751':'#67e0ec',0,53+i*14,0,{emissive:i%2?'#ff982b':'#35bfd6',emissiveIntensity:2});ring.rotation.x=Math.PI/2;}
  break;
 case 'biosphere':
  mesh(new THREE.IcosahedronGeometry(37,3),white,0,36,0,{wireframe:true});box(22,22,20,'#b4c3c5',0,11);break;
 case 'wheel':
  const rim=mesh(new THREE.TorusGeometry(22,.5,6,56),white,0,27);for(let i=0;i<20;i++){const a=i*Math.PI/10,spoke=box(.17,44,.17,white,0,27);spoke.rotation.z=a;box(2.7,3.1,2.5,['#ef743c','#43b7cb','#e85b73'][i%3],Math.sin(a)*22,27+Math.cos(a)*22);}
  for(const x of [-9,9]){const leg=box(1,30,1,white,x,14);leg.rotation.z=-x/34;}break;
 case 'cota':
  box(4,66,5,white);roof(18,16,67,accent);for(let i=0;i<7;i++){box(.65,64,.65,accent,-5+i*1.7,32,4);const tube=box(.65,.65,20,accent,-5+i*1.7,62,-4);tube.rotation.x=-.45;}
  break;
 case 'castle':
  box(66,12,9,accent);for(const x of [-29,29]){mesh(new THREE.CylinderGeometry(9,10,27,12),accent,x,13);for(let a=0;a<8;a++){const theta=a*Math.PI/4;box(3,3,3,accent,x+Math.sin(theta)*8,28,Math.cos(theta)*8);}}for(let x=-24;x<26;x+=7)box(4,3,10,accent,x,13);box(8,9,9.2,dark,0,4);break;
 case 'palace':
  box(66,18,22,accent);roof(70,27,19,'#526e6b');windows(63,7);windows(63,14);for(const x of [-26,26]){box(13,29,16,accent,x,14.5);mesh(new THREE.SphereGeometry(8,16,8,0,Math.PI*2,0,Math.PI/2),'#526e6b',x,29);box(.3,5,.3,white,x,36);}box(18,3,27,white,0,2);break;
 case 'stadium':
  for(let i=0;i<16;i++){const a=i*Math.PI/8,x=Math.sin(a)*56,z=Math.cos(a)*56,part=box(22,14,17,i%2?accent:white,x,7,z);part.rotation.y=a;const r=roof(25,22,17,white,x,z);r.rotation.y=a;}
  for(const x of [-42,42])for(const z of [-42,42]){box(.8,35,.8,dark,x,17.5,z);roof(8,4,35,white,x,z);}break;
 case 'hotel':
  for(const x of [-19,19]){box(25,24,80,dark,x,12);const dome=mesh(new THREE.SphereGeometry(1,28,14,0,Math.PI*2,0,Math.PI/2),accent,x,19,0,{wireframe:true,emissive:accent,emissiveIntensity:.9});dome.scale.set(27,20,48);}break;
 case 'dome':
  const d=mesh(new THREE.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2),white,0,1);d.scale.set(82,34,61);for(const x of [-60,60])box(1,42,1,accent,x,21);break;
 case 'bull':
  const torso=mesh(new THREE.IcosahedronGeometry(1,1),accent,0,19);torso.scale.set(22,10,8);const head=mesh(new THREE.IcosahedronGeometry(1,1),accent,22,24);head.scale.set(9,9,7);for(const x of [-14,12])for(const z of [-5,5]){const leg=box(3,19,3,accent,x,10,z);leg.rotation.z=x/70;}for(const z of [-7,7]){const horn=mesh(new THREE.ConeGeometry(2,13,8),white,26,33,z);horn.rotation.z=-.8;}break;
 case 'banking':
  for(let i=0;i<22;i++){const a=(i/21-.5)*1.7,x=Math.sin(a)*94,z=Math.cos(a)*94-74;const road=box(10,1.3,14,accent,x,7,z);road.rotation.set(.30,a,0);for(const side of [-5,5])box(.6,8,.6,dark,x+Math.cos(a)*side,3,z-Math.sin(a)*side);}break;
 case 'lake':
  const lake=mesh(new THREE.CircleGeometry(1,64),accent,0,.12,0,{roughness:.28,metalness:.45});lake.rotation.x=-Math.PI/2;lake.scale.set(103,69,1);for(let i=0;i<4;i++){box(2.5,1,9,white,-50+i*30,1.1,i%2*28-10);const sail=mesh(new THREE.ConeGeometry(3,9,3),white,-50+i*30,6,i%2*28-10);sail.scale.z=.05;}break;
 case 'halls':
  for(let i=0;i<4;i++){const z=(i-1.5)*34;box(105,12,29,white,0,6,z);roof(110,31,13,accent,0,z);box(105,4,.3,dark,0,6,z+14.6);}break;
 case 'pavilion':
  box(44,10,26,white);for(let x=-18;x<=18;x+=9)box(5,5,.2,dark,x,5,13.2);const r=roof(55,35,12,accent);r.rotation.z=.12;for(const x of [-23,23])box(.6,13,.6,white,x,6.5,12);break;
 default:throw new Error(`Unknown landmark ${p.kind}`);
 }
 // Check real model vertices, not just the designer's intended dimensions.
 g.updateMatrixWorld(true);const inverse=g.matrixWorld.clone().invert(),vertex=new THREE.Vector3();let footprint=0;
 g.traverse(o=>{if(!o.isMesh)return;const m=inverse.clone().multiply(o.matrixWorld),a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){vertex.fromBufferAttribute(a,i).applyMatrix4(m);footprint=Math.max(footprint,Math.hypot(vertex.x,vertex.z));}});
 g.userData.landmark.footprint=footprint;
 if(footprint>p.radius+.1)throw new Error(`${p.name} exceeds its safe footprint: ${footprint.toFixed(1)} > ${p.radius}`);
 scene.landmark=g.userData.landmark;
 addLandscape(scene,track,p);
 return p;
}
function addLandscape(scene,track,v){
 const cities=['city','skyline','neon','marina'],hills=['alpine','forest','hills','tuscany','mediterranean','savanna','dunes'];
 const facade=cities.includes(v.theme)?buildingFacade('urban'):null;
 // A few clusters on both sides give the whole lap a sense of place.
 for(let i=0;i<10;i++){
  const radius=cities.includes(v.theme)?58:100,p=safeSite(track,(i+.35)/10,radius,i%2?1:-1,100),g=new THREE.Group();g.position.set(p.x,p.y,p.z);scene.group.add(g);
  if(cities.includes(v.theme))for(let j=0;j<5;j++){
   const h=18+Math.abs(Math.sin(i*8+j*3))*76,x=(j-2)*19,z=Math.sin(j*2)*24,c=['#687c88','#89989c','#a5b2b0'][j%3];const tower=new THREE.Group();tower.position.set(x,0,z);g.add(tower);scene.box(16,h,20,c,0,h/2,0,tower);addFacadePanels(tower,16,h,20,facade);
   for(let y=5;y<h;y+=9)scene.box(16.2,.6,20.2,v.theme==='neon'?['#d97cd5','#54c9d3','#e2b755'][j%3]:'#c4c4a4',x,y,z,g);
  }
  else if(hills.includes(v.theme)||v.theme==='desert'){
   const dune=v.theme==='dunes'||v.theme==='desert',mountain=v.theme==='alpine',height=dune?16:mountain?120:35+Math.abs(Math.sin(i))*40;
   const m=new THREE.Mesh(new THREE.SphereGeometry(1,14,8,0,Math.PI*2,0,Math.PI/2),mat(dune?'#bba980':mountain?'#637876':i%2?'#65794c':'#7e895c'));m.scale.set(95,height,80);m.position.y=-3;g.add(m);
  }else{
   // Parkland / tropical garden clusters: rounded boulders and flowering shrubs.
   for(let j=0;j<6;j++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),mat(j%3?'#527751':'#b99976'));m.position.set((j-2.5)*15,2,Math.sin(j)*25);m.scale.set(9,3+j%3,7);g.add(m);}
  }
 }
}
