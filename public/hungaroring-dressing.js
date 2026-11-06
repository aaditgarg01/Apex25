import * as THREE from '/vendor/three.module.js';
import {sample} from '/shared/tracks.mjs';
import {gridSlot} from '/shared/physics.mjs';
import {pitLayout,pitRoadPose,pitReserved} from '/shared/pit-layout.mjs';
import {roadClearance} from '/shared/venues.mjs';
import {hungaroringBoundaries,hungaroringRunoffAllowed,hungaroringSurfaceY,hungaroringTerrainHeight} from '/shared/hungaroring.mjs';
export function addHungaroringDressing(scene,track,plan,h){
 const {group,mesh,mat,sign,world,instances}=h,stones=[],tyres=[],flowers=[],dustSites=[],pit=pitLayout(track),rows=hungaroringBoundaries(track),clock={value:0},groundMaterials=[];
 function patch(site,x,z,w,d,color){const g=group({...site,id:site.id}),geometry=new THREE.PlaneGeometry(w,d,1,4);geometry.rotateX(-Math.PI/2);const v=geometry.attributes.position;for(let i=0;i<v.count;i++){const p=world(site,v.getX(i)+x,0,v.getZ(i)+z);v.setXYZ(i,v.getX(i)+x,hungaroringTerrainHeight(track,p.x,p.z)-site.y+.07,v.getZ(i)+z);}geometry.computeVertexNormals();const tone=new THREE.Color(color),colors=[];for(let i=0;i<v.count;i++)colors.push(tone.r,tone.g,tone.b);geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const material=mat('#ffffff',{vertexColors:true});if(!groundMaterials.some(p=>p.material===material))groundMaterials.push({material,color:material.color.clone()});return mesh(g,geometry,material);}
 for(const site of plan.sites){
  if(site.kind==='pits'){const g=group(site),front=-site.side;for(let i=0;i<6;i++){const z=-site.d*.36+i*site.d*.14;scene.box(.07,2,.07,'#a7aca3',front*(site.w/2-.6),1,z,g);sign(g,'PIT · '+String(i+1).padStart(2,'0'),4,.7,front*(site.w/2-.6),2,z,front*Math.PI/2);}}
  if(site.kind==='beyond'){
   patch(site,-.4,0,3.3,site.d-1,'#a79b7c');patch(site,3,0,.7,site.d-1,'#6b6955');patch(site,2.6,0,.2,site.d-1,'#b1a783');
   const g=group(site);sign(g,site.gate?'ACCESS · KEEP CLEAR':'SERVICE',Math.min(10,site.d-2),.65,-3,1.3,0,-site.side*Math.PI/2);for(let i=0;i<4;i++)tyres.push(world(site,1.1+i%2*1.4,.1,-7+Math.floor(i/2)*1.5));for(let i=0;i<18;i++)flowers.push({...world(site,2.7+i%2*.3,.05,-site.d*.4+i*site.d*.045),color:i%3?'#c1b477':'#e2cf9b'});dustSites.push(site);
  }
  if(site.kind==='utility'){
   const g=group(site);scene.box(.16,11,.16,'#949c95',0,5.5,0,g);scene.box(2.4,.22,1.1,'#d1d3c7',0,11,0,g);scene.box(.65,1,.5,'#37474a',0,7.5,0,g);scene.box(.9,.4,.7,'#37474a',0,9.5,0,g);scene.box(.12,4,.12,'#808f87',2.5,2,2,g);scene.box(.8,.3,1.2,'#36474b',2.5,4.2,2,g);sign(g,'TIMING · LIVE',4,.65,0,3.2,-.4,Math.PI);scene.box(.1,1.6,.1,'#b4b5a6',-3,.8,0,g);sign(g,'FIRE',.8,.75,-3,1.5,0,Math.PI,'#a13d37');scene.box(.2,.6,.2,'#b54438',-3,.8,0,g);
   // Short cable runs stay inside their reserved utility envelope.
   scene.box(.08,.07,site.d-2,'#434a43',-3.8,.08,0,g);
  }
  if(site.kind==='horizon'){
   const g=group(site);if(site.utilityType===0){for(const x of [-4,4])for(const z of [-4,4]){const leg=scene.box(.35,27,.35,'#8e968a',x,13.5,z,g);leg.rotation.z=-x*.025;}for(let y=5;y<28;y+=5)scene.box(13,.3,.3,'#8e968a',0,y,0,g);for(const z of [-4,4]){const cross=scene.box(.2,29,.2,'#879186',0,14.5,z,g);cross.rotation.z=.27;}}else if(site.utilityType===1){scene.box(.4,34,.4,'#a9a99b',0,17,0,g);for(const y of [22,27,31])scene.box(2.2,1,.3,'#b9b8aa',0,y,0,g);}else{scene.box(.8,29,.8,'#c5c5b6',0,14.5,0,g);scene.box(3,1.4,2,'#c7c7ba',0,29,0,g);for(let i=0;i<3;i++){const blade=scene.box(.4,11,.16,'#c6c6b9',Math.sin(i*Math.PI*2/3)*5,29+Math.cos(i*Math.PI*2/3)*5,1.1,g);blade.rotation.z=-i*Math.PI*2/3;}}}
  if(site.kind==='official'){
   const g=group(site);scene.box(.15,1.3,.15,'#a7ad9b',-3,.65,-5,g);sign(g,'FIRE',.7,.7,-3,1.4,-5,Math.PI,'#a54336');scene.box(.2,.5,.2,'#b44333',-3,.7,-5,g);
   if(site.crane){scene.box(4.7,1.6,2.7,'#b5a46e',3,1,-5.5,g);scene.box(2.2,1.1,2.4,'#607985',1.8,2.1,-5.5,g);}else sign(g,'POST',2,.6,0,2.8,-2.7,Math.PI);
  }
 }
 // Stones are small instanced surface dressing. Check their complete footprint
 // against the racing road, external pit and every mapped vehicle-road branch.
 for(let i=0;i<24000&&stones.length<4000;i++){const station=(i*.61803398875%1)*track.length,index=Math.floor(station/track.step),side=i%2?1:-1,row=rows[side][index];if(!hungaroringRunoffAllowed(track,index,side)||row.gravel<2)continue;const offset=side*(track.width/2+row.paved+.3+(i*.41421356%1)*(row.gravel-.6)),p=sample(track,station,offset),site={...p,w:.16,d:.16,heading:0};if(pitReserved(track,p.x,p.z,.2)||roadClearance(track,p.x,p.z)<.25)continue;
  // interlagosFootprintClear reserves runoff as well, so inspect access corridors
  // separately for this intentional in-trap decoration (shared quad mask first).
  const accessClear=!plan.access.some(edge=>{const dx=edge.b.x-edge.a.x,dz=edge.b.z-edge.a.z,t=Math.max(0,Math.min(1,((p.x-edge.a.x)*dx+(p.z-edge.a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-edge.a.x-t*dx,p.z-edge.a.z-t*dz)<edge.half+.12;});if(!accessClear)continue;stones.push({...site,y:hungaroringSurfaceY(track,station,offset)+.045,owner:'gravel-surface',scale:.035+i%4*.012});
 }
 instances(new THREE.IcosahedronGeometry(1,0),mat('#bfb69c'),stones,(p,i,o)=>{o.scale.set(p.scale,p.scale*.5,p.scale*.8);});
 instances(new THREE.TorusGeometry(.52,.18,4,8),mat('#353b37'),tyres,(p,i,o)=>{o.rotation.x=Math.PI/2;o.position.y+=.2;});
 const weed=new THREE.BufferGeometry();weed.setAttribute('position',new THREE.Float32BufferAttribute([-.1,0,0,.1,0,0,0,.38,0,0,0,-.1,0,0,.1,.02,.45,0],3));weed.computeVertexNormals();instances(weed,mat('#ffffff',{side:THREE.DoubleSide}),flowers,(p,i,o)=>{o.rotation.y=i*1.6;});
 function groundLabel(text,p,w,d){const g=new THREE.Group();g.position.set(p.x,p.y+.115,p.z);g.rotation.set(-Math.PI/2,p.heading,0,'YXZ');g.userData.hungaroringRoadMarking=text;scene.group.add(g);sign(g,text,w,d,0,0,0);}
 for(let i=0;i<22;i++){const slot=gridSlot(i),p=sample(track,slot.s-4,slot.offset);groundLabel(String(i+1),p,1.2,.85);if(i>=8){const slotPose=sample(track,slot.s,slot.offset),g=new THREE.Group();g.position.set(slotPose.x,slotPose.y+.11,slotPose.z);g.rotation.set(-slotPose.pitch,slotPose.heading,0,'YXZ');scene.group.add(g);scene.box(2.8,.025,.12,'#e1e0d5',0,0,2.85,g);scene.box(.12,.025,5.4,'#e1e0d5',slot.offset<0?-1.4:1.4,0,.2,g);}}
 for(const [text,station]of [['S1',1450],['S2',2958],['SC1',pit.entry+8],['SC2',pit.entry+pit.length-8],['DETECTION',3755]]){const p=sample(track,station),g=new THREE.Group();g.position.set(p.x,p.y+.105,p.z);g.rotation.set(-p.pitch,p.heading,0,'YXZ');scene.group.add(g);scene.box(track.width-1,.016,.14,'#d4d2bf',0,0,0,g);groundLabel(text,sample(track,station-4),4,1.1);}
 for(const [text,distance]of [['80',Math.min(pit.taper+5,pit.length/3)],['PIT LIMIT',Math.min(pit.taper+12,pit.length/3+10)],['PIT OUT',pit.length-15]])groundLabel(text,pitRoadPose(track,distance),3.5,1.4);
 // Original transparent dust/marble/oil decals on the road; they are cosmetic,
 // non-solid layers on their own ribbon, never new road meshes or obstacles.
 const c=document.createElement('canvas');c.width=c.height=256;const ink=c.getContext('2d');for(let i=0;i<650;i++){ink.fillStyle=i%7?'rgba(24,27,25,.23)':'rgba(181,168,133,.22)';ink.fillRect(i*37%256,i*71%256,1+i%3,1+i%2);}for(let i=0;i<16;i++){ink.fillStyle='rgba(30,33,30,.08)';ink.fillRect(40+i*5,0,1,256);}const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
 const decalMat=mat('#ffffff',{map,transparent:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3}),decals=[];
 for(const turn of [1,2,5,6,11,12,13])for(const side of [-1,1]){const station={1:366,2:882,5:1787,6:2111,11:2858,12:3262,13:3502}[turn];for(let j=0;j<5;j++){const p=sample(track,station-65+j*12,side*(track.width/2-1.2));decals.push({...p,owner:'road-surface'});}}
 const decalGeometry=new THREE.PlaneGeometry(1.8,10,1,1);decalGeometry.rotateX(-Math.PI/2);instances(decalGeometry,decalMat,decals,(p,i,o)=>{o.position.y+=.08;o.rotation.x=-p.pitch;});
 const dust=new THREE.ShaderMaterial({uniforms:{clock,opacity:{value:.08}},transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:'uniform float clock;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.x+=sin(clock*.5+p.y)*.15;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.0);}',fragmentShader:'uniform float opacity;varying vec2 vUv;void main(){float a=sin(vUv.x*3.14159)*sin(vUv.y*3.14159);gl_FragColor=vec4(.68,.59,.40,a*opacity);}'});instances(new THREE.PlaneGeometry(7,2.4,4,2),dust,dustSites,(p,i,o)=>{o.position.y+=1.5;});
 const puddleGeometry=new THREE.PlaneGeometry(2.4,5);puddleGeometry.rotateX(-Math.PI/2);const puddleMaterial=mat('#657477',{transparent:true,opacity:0,roughness:.14,metalness:.25,depthWrite:false,side:THREE.DoubleSide}),puddles=instances(puddleGeometry,puddleMaterial,plan.beyond.filter((site,i)=>i%2===0),(p,i,o)=>{o.position.y+=.12;});
 const dryMaterials=[...new Set(scene.group.children.filter(p=>p.isInstancedMesh).map(p=>p.material))].filter(m=>m!==dust&&m!==decalMat).map(material=>({material,color:material.color?.clone()}));dryMaterials.push(...groundMaterials);let wetness=0;
 scene.group.userData.hungaroringSurfaceInstances=stones;
 scene.group.userData.hungaroringDressing={stones:stones.length,weeds:flowers.length,spareTyres:tyres.length,roadDecals:decals.length,roadLabels:22+5+3,beyond:plan.beyond.length};
 // Keep closure references bounded; the shared scene cleanup owns GPU resources.
 return {frame(time,cars){clock.value=time*.001;dust.uniforms.opacity.value=(1-wetness)*(cars.some(car=>car.offtrack||car.sliding)?.14:.07);},setConditions(value){wetness=value;puddleMaterial.opacity=value*.3;for(const p of puddles)p.visible=value>.1;for(const p of dryMaterials)if(p.color)p.material.color.copy(p.color).multiplyScalar(1-value*.08);for(const p of groundMaterials){p.material.color.copy(p.color).multiplyScalar(1-value*.28);p.material.roughness=.85-value*.25;}decalMat.opacity=1-value*.45;},dispose(){dryMaterials.length=0;}};
}
