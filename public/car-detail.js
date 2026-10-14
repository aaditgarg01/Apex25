import * as THREE from '/vendor/three.module.js';

// Rounded lofts, assembled from original geometry within the existing car size.
function loft(stations){
 const positions=[],indices=[],segments=16;
 for(const [z,y,width,height] of stations)for(let j=0;j<segments;j++){
  const a=j/segments*Math.PI*2;positions.push(Math.cos(a)*width/2,y+Math.sin(a)*height/2,z);
 }
 for(let i=0;i<stations.length-1;i++)for(let j=0;j<segments;j++){
  const a=i*segments+j,b=i*segments+(j+1)%segments,c=b+segments,d=a+segments;indices.push(a,b,d,b,c,d);
 }
 for(const [i,reverse] of [[0,true],[stations.length-1,false]]){
  const n=positions.length/3,[z,y]=stations[i];positions.push(0,y,z);
  for(let j=0;j<segments;j++){const a=i*segments+j,b=i*segments+(j+1)%segments;indices.push(...(reverse?[n,b,a]:[n,a,b]));}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function carbonTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#34393d';ctx.fillRect(0,0,128,128);
 for(let y=0;y<128;y+=8)for(let x=0;x<128;x+=8){ctx.fillStyle=(x/8+y/8)%2?'#4e5357':'#292e32';ctx.fillRect(x,y,8,8);ctx.fillStyle='#606468';ctx.fillRect(x,y,(x/8+y/8)%2?1:8,(x/8+y/8)%2?8:1);}
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(5,5);return t;
}
export function addCarDetail(car,paint){
 const carbon=new THREE.MeshStandardMaterial({color:'#5e6268',map:carbonTexture(),roughness:.48,metalness:.12});
 const painted=color=>new THREE.MeshPhysicalMaterial({color,roughness:.32,metalness:.08,clearcoat:.8,clearcoatRoughness:.2});
 const body=painted(paint.body),side=painted(paint.side),nose=painted(paint.nose),accent=painted(paint.accent);
 const add=(geometry,material,x=0,y=0,z=0,parent=car)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);if(parent===car)mesh.userData.mappedStatic=true;return mesh;};
 add(loft([[-1.75,.55,.38,.38],[-1.1,.62,.78,.7],[-.65,.48,.94,.43],[.1,.48,.93,.43],[.7,.53,.66,.5],[1.25,.46,.43,.3]]),body);
 add(loft([[.7,.53,.5,.38],[1.4,.47,.4,.28],[2.1,.42,.33,.22],[2.45,.38,.24,.16]]),nose);
 for(const x of [-.63,.63]){
  add(loft([[-1.55,.39,.32,.22],[-1.15,.48,.56,.4],[-.65,.48,.62,.43],[.1,.48,.61,.4],[.45,.49,.47,.3]]),side,x);
  const intake=add(new THREE.SphereGeometry(1,12,8),carbon,x,.53,.45);intake.scale.set(.2,.1,.035);
 }
 add(loft([[-1.8,.69,.16,.28],[-1.2,.91,.39,.63],[-.73,.95,.36,.62],[-.43,.83,.25,.5]]),body);
 // A dark open cockpit rim, a front support and a rounded halo horseshoe.
 const rim=add(new THREE.TorusGeometry(.39,.06,8,32),carbon,0,.77,-.06);rim.rotation.x=Math.PI/2;rim.scale.set(1,1.6,1);
 const haloPoints=[[-.36,1.1,-.58],[-.43,1.24,-.1],[-.34,1.29,.47],[0,1.3,.63],[.34,1.29,.47],[.43,1.24,-.1],[.36,1.1,-.58]].map(p=>new THREE.Vector3(...p));
 add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(haloPoints),32,.035,6,false),carbon);
 const post=add(new THREE.CylinderGeometry(.025,.035,.49,6),carbon,0,1.04,.57);post.rotation.x=.2;
 // Original wheel-shaped steering control and compact illuminated display.
 const steering=new THREE.Group();steering.position.set(0,.91,.35);steering.rotation.x=.15;car.add(steering);
 const wheelShape=new THREE.Shape();wheelShape.moveTo(-.27,-.08);wheelShape.lineTo(-.24,.12);wheelShape.lineTo(-.16,.16);wheelShape.lineTo(.16,.16);wheelShape.lineTo(.24,.12);wheelShape.lineTo(.27,-.08);wheelShape.lineTo(.2,-.14);wheelShape.lineTo(-.2,-.14);wheelShape.closePath();
 const control=add(new THREE.ExtrudeGeometry(wheelShape,{depth:.045,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.012,bevelThickness:.01}),carbon,0,0,0,steering);
 control.rotation.y=Math.PI;
 const displayCanvas=document.createElement('canvas');displayCanvas.width=256;displayCanvas.height=128;const display=new THREE.CanvasTexture(displayCanvas);display.colorSpace=THREE.SRGBColorSpace;
 const screen=add(new THREE.PlaneGeometry(.22,.11),new THREE.MeshBasicMaterial({map:display,toneMapped:false}),0,.047,-.06,steering);screen.rotation.y=Math.PI;
 for(let i=0;i<6;i++){const button=add(new THREE.SphereGeometry(.015,6,4),new THREE.MeshStandardMaterial({color:['#36ba96','#e4493b','#efc945'][i%3]}),(i<3?-1:1)*.185,-.035+(i%3)*.045,-.055,steering);button.scale.z=.5;}
 // Mirrors are reflective cues, without an expensive second scene render.
 for(const x of [-.67,.67]){
  const stalk=add(new THREE.CylinderGeometry(.018,.018,.33,5),carbon,x*.79,.86,.65);stalk.rotation.z=Math.sign(x)*-.7;
  const housing=add(new THREE.SphereGeometry(1,12,8),accent,x,.98,.65);housing.scale.set(.15,.06,.07);
  const mirror=add(new THREE.PlaneGeometry(.21,.073),new THREE.MeshStandardMaterial({color:'#bbc8cc',roughness:.12,metalness:.92}),x,.98,.577);mirror.rotation.y=Math.PI;
 }
 // Diagonal wishbones connect the wheel locations to the chassis.
 for(const z of [-1.2,1.45])for(const sign of [-1,1])for(const shift of [-.2,.2]){
  const start=new THREE.Vector3(sign*.36,.4,z+shift),end=new THREE.Vector3(sign*1.04,.39,z),d=end.clone().sub(start);
  const rod=add(new THREE.CylinderGeometry(.022,.022,d.length(),5),carbon,...start.clone().add(end).multiplyScalar(.5).toArray());rod.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
 }
 car.userData.cockpit={steering,display,canvas:displayCanvas,key:''};
}
export function updateCockpit(car,state,visible){
 const cockpit=car.userData.cockpit;if(!cockpit)return;
 cockpit.steering.rotation.z=-(state.steer||0)*1.25;
 if(!visible||performance.now()-(cockpit.updatedAt||0)<80)return;cockpit.updatedAt=performance.now();
 const speed=Math.round(Math.abs(state.v)*3.6),gear=state.v<-.5?'R':state.v<1?'N':Math.min(8,Math.max(1,Math.floor(speed/43)+1)),boost=Math.round(state.boost||0),key=`${gear}:${speed}:${boost}`;
 if(key===cockpit.key)return;cockpit.key=key;
 const ctx=cockpit.canvas.getContext('2d');ctx.fillStyle='#07101a';ctx.fillRect(0,0,256,128);ctx.textAlign='center';ctx.fillStyle='#e3f9eb';ctx.font='bold 80px monospace';ctx.fillText(String(gear),62,101);ctx.font='bold 40px monospace';ctx.fillText(String(speed),184,74);ctx.fillStyle='#4ee3c2';ctx.fillRect(114,95,120*boost/100,7);
 for(let i=0;i<10;i++){ctx.fillStyle=i<Math.floor((speed%43)/43*10)?(i>7?'#ee5c65':'#46dbbe'):'#253543';ctx.fillRect(13+i*23,8,17,8);}cockpit.display.needsUpdate=true;
}
