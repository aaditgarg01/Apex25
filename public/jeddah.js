import {pitReserved} from '/shared/pit-layout.mjs';
import * as THREE from '/vendor/three.module.js';
import {Reflector} from '/vendor/Reflector.js';
import {footprintClear,placeDecoration,disposeRejectedDecorations} from './jeddah-clearance.js';
import {JEDDAH_CORNICHE} from './data/jeddah-corniche.js';
import {jeddahBoundaryOffset,jeddahTecproBlocks,JEDDAH_TECPRO} from '/shared/jeddah.mjs';
import {sample,wrap,angleDiff} from '/shared/tracks.mjs';
import {ribbonOffset} from '/shared/surface.mjs';
import {roadClearance} from '/shared/venues.mjs';
import {LIVERIES} from '/shared/liveries.mjs';
import {trackSign,addBrakingBoards} from './track-furniture.js';

const cache=new WeakMap(),material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.78,...extra}),basic=(color,extra={})=>new THREE.MeshBasicMaterial({color,toneMapped:false,...extra}),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
function local(track,[lon,lat]){return {x:(lon-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(lat-track.origin.lat)*111320};}
function contains(points,x,z){let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)yes=!yes;}return yes;}
function layout(track){
 if(cache.has(track))return cache.get(track);
 const sea=JEDDAH_CORNICHE.seaOuter.map(p=>local(track,p)),level=Math.min(...track.points.map(p=>p.y))-.85,heights=track.points.filter((_,i)=>i%5===0).map((p,i)=>({...p,s:i*5*track.step}));
 const mosque={...JEDDAH_CORNICHE.mosque,...local(track,JEDDAH_CORNICHE.mosque.center),y:level+.45};
 const yachtClub={...JEDDAH_CORNICHE.yachtClub,...local(track,JEDDAH_CORNICHE.yachtClub.center),y:level+.65};
 const jeddahTower={...JEDDAH_CORNICHE.jeddahTower,...local(track,JEDDAH_CORNICHE.jeddahTower.center),y:level+.4};
 const resorts=JEDDAH_CORNICHE.resorts.map(r=>({...r,...local(track,r.center),y:level+.62}));
 const skyline=JEDDAH_CORNICHE.skyline.map(t=>({...t,...local(track,[t.lon,t.lat]),y:level+.5}));
 const features=JEDDAH_CORNICHE.features.map(f=>{
  const p=sample(track,f.s,f.side*f.offset);
  return {...f,x:p.x,y:p.y-.12,z:p.z,heading:p.heading+(f.side<0?Math.PI:0)};
 });
 const boats=JEDDAH_CORNICHE.boats.map(b=>({...b,...local(track,[b.lon,b.lat]),y:level-.18}));
 const cranes=JEDDAH_CORNICHE.cranes.map(c=>{const p=sample(track,c.s,c.side*c.offset);return {...c,x:p.x,y:p.y-.08,z:p.z,baseHeading:p.heading};});
 const data={sea,level,heights,mosque,yachtClub,jeddahTower,resorts,skyline,features,boats,cranes};
 cache.set(track,data);return data;
}
function waterAt(track,x,z){return contains(layout(track).sea,x,z);}
export function jeddahTerrainHeight(track,x,z,cell=0){
 const p=layout(track);if(waterAt(track,x,z))return p.level-1.18;
 let distance=Infinity,nearest=p.heights[0],floor=Infinity;
 for(const q of p.heights){
  const d=Math.hypot(x-q.x,z-q.z);if(d<distance){distance=d;nearest=q;}
  if(d<track.width/2+Math.SQRT2*cell+11)floor=Math.min(floor,q.y-.82);
 }
 const flat=p.level+.58,coastalRipple=.22*Math.sin(x*.009+z*.006)+.14*Math.cos(z*.012-x*.007);
 // Sculpted outer embankment around the dramatic banked oval Turn 13 (s=2300..2590m).
 const turn13=Math.exp(-(((nearest.s-2445)/115)**2))*smooth((distance-track.width/2-4)/18)*(1-smooth((distance-52)/40))*2.45;
 let y=nearest.groundY-.82+(flat+coastalRipple+turn13-(nearest.groundY-.82))*smooth((distance-18)/65);
 return Number.isFinite(floor)?Math.min(y,floor):y;
}
function mesh(parent,geo,mat,x=0,y=0,z=0,staticGeometry=true){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.receiveShadow=true;o.castShadow=staticGeometry;o.userData.mappedStatic=staticGeometry;parent.add(o);return o;}
function group(scene,p,h=0){const g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=h;scene.group.add(g);return g;}
function safeGroundClear(track,x,z,minClearance=11.5){return roadClearance(track,x,z)>=minClearance;}
function bounds(minX,maxX,minZ,maxZ){return new THREE.Box3(new THREE.Vector3(minX,0,minZ),new THREE.Vector3(maxX,0,maxZ));}
function protect(scene,track,object,options={}){return placeDecoration(scene,track,object,(x,z)=>jeddahTerrainHeight(track,x,z),{accept:(x,z)=>!waterAt(track,x,z),...options});}

function addRedSeaWaterfront(scene,track,p){
 const shape=new THREE.Shape();p.sea.forEach((q,i)=>i?shape.lineTo(q.x,-q.z):shape.moveTo(q.x,-q.z));shape.closePath();
 const geo=new THREE.ShapeGeometry(shape);
 const shader={
  ...Reflector.ReflectorShader,
  uniforms:{...Reflector.ReflectorShader.uniforms,time:{value:0},wetness:{value:0}},
  vertexShader:Reflector.ReflectorShader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec3 waterPosition;').replace('vUv = textureMatrix','waterPosition = (modelMatrix * vec4(position,1.0)).xyz;\n vUv = textureMatrix'),
  fragmentShader:`
   uniform sampler2D tDiffuse; uniform float time; uniform float wetness; varying vec4 vUv; varying vec3 waterPosition;
   #include <logdepthbuf_pars_fragment>
   void main(){
    #include <logdepthbuf_fragment>
    float waveA=sin(waterPosition.x*.19+waterPosition.z*.11+time*1.65);
    float waveB=cos(waterPosition.z*.24-waterPosition.x*.09-time*1.25);
    vec2 ripple=vec2(waveA,waveB);
    vec4 projected=vUv;projected.xy+=ripple*(.00085+wetness*.0006)*vUv.w;
    vec3 reflection=texture2DProj(tDiffuse,projected).rgb;
    vec3 deepSea=vec3(0.018,0.058,0.115);
    vec3 tealCrest=vec3(0.055,0.285,0.395);
    float crest=smoothstep(0.62,0.98,0.5+0.25*(waveA+waveB));
    vec3 base=mix(deepSea,tealCrest,crest*0.42);
    vec3 color=mix(base,reflection,0.46+wetness*0.16)+vec3(0.18,0.34,0.46)*pow(crest,3.0)*0.22;
    gl_FragColor=vec4(color,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 };
 const water=new Reflector(geo,{clipBias:.003,textureWidth:512,textureHeight:512,multisample:0,color:'#06182c',shader});
 water.rotation.x=-Math.PI/2;water.position.y=p.level-.18;water.userData.noMirror=true;scene.group.add(water);
 const render=water.onBeforeRender;let last=0;
 water.onBeforeRender=(renderer,s,camera,geometry,mat,group)=>{
  const now=performance.now();water.material.uniforms.time.value=now*.001;
  if(now-last<(scene.slowFrames>35?350:140))return;last=now;
  const shadow=renderer.shadowMap.autoUpdate;renderer.shadowMap.autoUpdate=false;
  scene.group.traverse(o=>{if(o.userData.noMirror)o.visible=false;});
  render.call(water,renderer,s,camera,geometry,mat,group);
  scene.group.traverse(o=>{if(o.userData.noMirror)o.visible=true;});
  renderer.shadowMap.autoUpdate=shadow;
 };
 // Corniche stone seawall, tetrapod rock armor, and animated crashing wave foam along the shoreline & Turn 13 loop.
 const wallMat=material('#cfc7b4',{roughness:.72}),rockMat=material('#4a5258',{roughness:.92}),foamMat=basic('#d8f3ff',{transparent:true,opacity:.72}),foamMeshes=[];
 for(let i=1;i<p.sea.length-2;i++){
  const a=p.sea[i],b=p.sea[i+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<1)continue;
  const ang=Math.atan2(dx,dz),chunks=Math.ceil(len/10),chunkLength=len/chunks;
  // Cut the shoreline into short sections; omit sections that cross a road.
  for(let part=0;part<chunks;part++){
   const t=(part+.5)/chunks,q={x:a.x+dx*t,z:a.z+dz*t};
   if(!footprintClear(track,q,ang,bounds(-1.95,1.95,-chunkLength/2-.8,chunkLength/2+.8)))continue;
   scene.box(3.4,1.65,chunkLength+.35,'#cfc7b4',q.x,p.level+.15,q.z).rotation.y=ang;
   scene.box(3.9,.28,chunkLength+.4,'#e8e2d2',q.x,p.level+1.02,q.z).rotation.y=ang;
  }
  const steps=Math.max(2,Math.floor(len/18));
  for(let k=0;k<steps;k++){
   const t=(k+.5)/steps,rx=a.x+dx*t-2.4,rz=a.z+dz*t;
   const radius=1.35+(k%3)*.35;
   if(safeGroundClear(track,rx,rz,10+radius)){
    const boulder=mesh(scene.group,new THREE.DodecahedronGeometry(radius,0),rockMat,rx,p.level-.05,rz);boulder.rotation.set(k*.7,k*1.1,k*.4);
   }
   if(k%2===0&&footprintClear(track,{x:rx-2.2,z:rz},ang,bounds(-3.25,3.25,-9,9))){
    const foam=new THREE.Mesh(new THREE.PlaneGeometry(4.2,Math.min(18,len/steps*1.5)),foamMat);
    foam.rotation.x=-Math.PI/2;foam.rotation.z=-ang;foam.position.set(rx-2.2,p.level-.12,rz);
    foam.userData={noMirror:true,baseX:rx-2.2,phase:i*1.3+k*.8};scene.group.add(foam);foamMeshes.push(foam);
   }
  }
 }
 // Crashing wave spray & illuminated coastal seawall Curve hugging banked Turn 13 (s=2290..2595m).
 for(let s=2290;s<=2595;s+=14){
  const q=sample(track,s,-(track.width/2+15.5));
  if(!footprintClear(track,q,q.heading,bounds(-1.1,1.1,-6.25,6.25)))continue;
  scene.box(2.2,1.2,12.5,'#d8d2c2',q.x,p.level+.38,q.z).rotation.y=q.heading;
  const strip=mesh(scene.group,new THREE.BoxGeometry(.35,.22,11.8),basic('#00d8ff'),q.x,p.level+.95,q.z);strip.rotation.y=q.heading;
  if(!footprintClear(track,{x:q.x-4.2,z:q.z},q.heading,bounds(-3.9,3.9,-6.25,6.25)))continue;
  const crest=new THREE.Mesh(new THREE.PlaneGeometry(5.5,12.5),foamMat);
  crest.rotation.x=-Math.PI/2;crest.rotation.z=-q.heading;crest.position.set(q.x-4.2,p.level-.1,q.z);
  crest.userData={noMirror:true,baseX:q.x-4.2,phase:s*.04};scene.group.add(crest);foamMeshes.push(crest);
 }
 return {water,foamMeshes};
}

function addRunoffAndTecpro(scene,track){
 // Narrow, unforgiving street-circuit painted runoff aprons (no gravel traps) in Saudi Aramco blue & emerald green.
 const n=track.points.length,half=track.width/2;
 for(const side of [-1,1]){
  const posA=[],uvA=[],idxA=[],posB=[],uvB=[],idxB=[];
  for(let i=0;i<=n;i++){
   const idx=i%n,p=track.points[idx],inner=side*(half+.85),mid=side*(half+2.35),outer=side*(jeddahBoundaryOffset(track,idx,side)-.38);
   for(const [arr,uv,e0,e1,y] of [[posA,uvA,inner,mid,.028],[posB,uvB,mid,outer,.024]]){
    for(const edge of [Math.min(e0,e1),Math.max(e0,e1)]){
     const o=ribbonOffset(track,idx,edge);arr.push(p.x+Math.cos(p.heading)*o,p.y+y,p.z-Math.sin(p.heading)*o);uv.push(o/4,i*track.step/4);
    }
   }
   if(i<n){const k=i*2;idxA.push(k,k+2,k+1,k+1,k+2,k+3);idxB.push(k,k+2,k+1,k+1,k+2,k+3);}
  }
  for(const [pos,uv,indices,color] of [[posA,uvA,idxA,'#006c45'],[posB,uvB,idxB,'#0d4f73']]){
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
   const m=scene.surfaces.material('paint',color);const o=new THREE.Mesh(g,m);o.receiveShadow=true;scene.group.add(o);
  }
 }
 // High-impact Tecpro barriers tightly packed into the apexes/outside walls of blind high-speed sweeping corners & banked Turn 13.
 const tecproGeo=new THREE.BoxGeometry(JEDDAH_TECPRO.width,JEDDAH_TECPRO.height,JEDDAH_TECPRO.length),redMat=material('#d62828',{roughness:.52}),whiteMat=material('#f1f4f6',{roughness:.48}),blueMat=material('#0077b6',{roughness:.5});
 const instances={red:[],white:[],blue:[]},dummy=new THREE.Object3D();
 for(const block of jeddahTecproBlocks(track)){
  if(pitReserved(track,block.x,block.z))continue;
  dummy.position.set(block.x,block.y,block.z);dummy.rotation.set(0,block.heading,0);dummy.updateMatrix();
  instances[block.color].push(dummy.matrix.clone());
 }
 for(const [key,matRef] of [['red',redMat],['white',whiteMat],['blue',blueMat]]){
  const list=instances[key];if(!list.length)continue;
  const inst=new THREE.InstancedMesh(tecproGeo,matRef,list.length);
  list.forEach((m,i)=>inst.setMatrixAt(i,m));inst.computeBoundingSphere();inst.castShadow=true;inst.receiveShadow=true;scene.group.add(inst);
 }
}

function addSponsorWallBranding(scene,track){
 // Vibrant Saudi Aramco (green & blue), stc (purple), and Rolex (green/gold) branding along concrete barriers.
 const brands=[
  {label:'aramco',bg:'#006fb9',fg:'#ffffff',stripe:'#00a651'},
  {label:'stc',bg:'#4f008c',fg:'#ffffff',stripe:'#ff375e'},
  {label:'ROLEX',bg:'#006039',fg:'#e5c158',stripe:'#d4af37'},
  {label:'aramco  •  SAUDI ARABIAN GP',bg:'#008457',fg:'#ffffff',stripe:'#00aeef'}
 ];
 const textures=brands.map(b=>{
  const c=document.createElement('canvas');c.width=512;c.height=96;const x=c.getContext('2d');
  x.fillStyle=b.bg;x.fillRect(0,0,512,96);x.fillStyle=b.stripe;x.fillRect(0,0,512,14);x.fillRect(0,82,512,14);
  x.fillStyle=b.fg;x.font='italic 900 44px Arial';x.textAlign='center';x.fillText(b.label,256,63);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map:t,roughness:.36,metalness:.14});
 });
 const boardGeo=new THREE.BoxGeometry(.12,.92,7.6);
 for(let s=40,k=0;s<track.length-60;s+=38,k++){
  for(const side of [-1,1]){
   if((k+(side>0?1:0))%2!==0)continue;
   const idx=Math.floor(wrap(s,track.length)/track.step),offset=side*(jeddahBoundaryOffset(track,idx,side)-.28);
   const p=sample(track,s,ribbonOffset(track,idx,offset));
   if(!footprintClear(track,p,p.heading,bounds(-.06,.06,-3.8,3.8),.3))continue;
   const o=new THREE.Mesh(boardGeo,textures[(k+(side>0?2:0))%textures.length]);
   o.position.set(p.x,p.y+.54,p.z);o.rotation.y=p.heading;o.userData.mappedStatic=true;scene.group.add(o);
  }
 }
}

function addSponsorGantriesAndDisplays(scene,track){
 // Massive futuristic LED digital display bridges spanning over the track flashing dynamic race data & graphics.
 const bridges=[
  {s:420,brand:'aramco',primary:'#0077b6',secondary:'#00a651',ink:'#ffffff'},
  {s:1140,brand:'stc',primary:'#4f008c',secondary:'#ff375e',ink:'#ffffff'},
  {s:1960,brand:'ROLEX',primary:'#006039',secondary:'#d4af37',ink:'#f3d266'},
  {s:2445,brand:'JEDDAH CORNICHE  •  TURN 13',primary:'#091c32',secondary:'#00d4ff',ink:'#7df9ff'},
  {s:3380,brand:'aramco',primary:'#008457',secondary:'#00aeef',ink:'#ffffff'},
  {s:4420,brand:'stc  5G',primary:'#4f008c',secondary:'#a855f7',ink:'#ffffff'},
  {s:5380,brand:'ROLEX',primary:'#006039',secondary:'#d4af37',ink:'#f3d266'}
 ];
 const screens=[];
 for(const b of bridges){
  const p=sample(track,b.s),idx=Math.floor(wrap(b.s,track.length)/track.step);
  let span=Math.max(track.width+14,(jeddahBoundaryOffset(track,idx,-1)+jeddahBoundaryOffset(track,idx,1))+4.5),supportsClear=false;
  // Only the overhead beam spans the road; both support feet must clear every branch.
  for(;span<180;span+=6){
   supportsClear=[-1,1].every(side=>{const x=side*(span/2+1.2);return footprintClear(track,p,p.heading,bounds(x-.75,x+.75,-1,1),5);});
   if(supportsClear)break;
  }
  if(!supportsClear)continue;
  const g=group(scene,p,p.heading);
  for(const side of [-1,1]){
   const x=side*(span/2+1.2);
   scene.box(1.4,9.6,1.8,'#1b2636',x,4.8,0,g);
   mesh(g,new THREE.BoxGeometry(.24,9.2,.32),basic(b.secondary),x-side*.65,4.8,0);
  }
  scene.box(span+3.6,2.1,2.2,b.primary,0,8.6,0,g);
  mesh(g,new THREE.BoxGeometry(span+3.8,.22,2.35),basic(b.secondary),0,9.72,0);
  mesh(g,new THREE.BoxGeometry(span+3.8,.18,2.35),basic('#e8f6ff'),0,7.5,0);
  const c=document.createElement('canvas');c.width=1024;c.height=160;const ctx=c.getContext('2d');
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const screenMat=new THREE.MeshBasicMaterial({map:tex,toneMapped:false});
  const front=new THREE.Mesh(new THREE.PlaneGeometry(span+1.2,1.72),screenMat);front.position.set(0,8.6,1.14);g.add(front);
  const back=front.clone();back.rotation.y=Math.PI;back.position.z=-1.14;g.add(back);
  screens.push({canvas:c,ctx,tex,brand:b.brand,primary:b.primary,secondary:b.secondary,ink:b.ink,s:b.s});
 }
 return screens;
}

function addFloodlights(scene,track){
 // Intense, ultra-bright LED floodlight gantries lining the entire circuit casting a clinical white glow.
 const poleGeo=new THREE.CylinderGeometry(.16,.24,18.5,6),armGeo=new THREE.BoxGeometry(3.6,.26,.42),headGeo=new THREE.BoxGeometry(1.4,.32,3.4);
 const poleMat=material('#d8e0e8',{metalness:.45,roughness:.38}),ledMat=basic('#f7fbff'),haloMat=basic('#cbe6ff',{transparent:true,opacity:.32});
 const step=52,total=Math.ceil(track.length/step)*2;
 const poles=new THREE.InstancedMesh(poleGeo,poleMat,total),arms=new THREE.InstancedMesh(armGeo,poleMat,total),heads=new THREE.InstancedMesh(headGeo,ledMat,total),halos=new THREE.InstancedMesh(new THREE.PlaneGeometry(4.2,5.6),haloMat,total);
 const dummy=new THREE.Object3D(),positions=[];let count=0;
 for(let s=0;s<track.length;s+=step){
  const idx=Math.floor(wrap(s,track.length)/track.step);
  for(const side of [-1,1]){
   let wall=jeddahBoundaryOffset(track,idx,side)+1.65,p=sample(track,s,side*wall);
   for(let extra=0;extra<120&&!footprintClear(track,p,p.heading,bounds(-.3,.3,-.3,.3),5);extra+=4){wall+=4;p=sample(track,s,side*wall);}
   if(!footprintClear(track,p,p.heading,bounds(-.3,.3,-.3,.3),5))continue;
   dummy.position.set(p.x,p.y+9.25,p.z);dummy.rotation.set(0,p.heading,0);dummy.scale.set(1,1,1);dummy.updateMatrix();poles.setMatrixAt(count,dummy.matrix);
   const armP=sample(track,s,side*(wall-1.6));
   dummy.position.set(armP.x,p.y+18.2,armP.z);dummy.rotation.set(0,p.heading+(side>0?0:Math.PI),0);dummy.updateMatrix();arms.setMatrixAt(count,dummy.matrix);
   const headP=sample(track,s,side*(wall-2.9));
   dummy.position.set(headP.x,p.y+18.0,headP.z);dummy.rotation.set(0,p.heading,side*.28);dummy.updateMatrix();heads.setMatrixAt(count,dummy.matrix);
   dummy.position.set(headP.x,p.y+17.75,headP.z);dummy.rotation.set(Math.PI/2,0,-p.heading);dummy.updateMatrix();halos.setMatrixAt(count,dummy.matrix);
   positions.push({x:headP.x,y:p.y+17.8,z:headP.z,targetX:p.x-Math.cos(p.heading)*side*wall,targetY:p.y,targetZ:p.z+Math.sin(p.heading)*side*wall,s});
   count++;
  }
 }
 for(const inst of [poles,arms,heads,halos]){inst.count=count;inst.computeBoundingSphere();scene.group.add(inst);}
 // Pooled active PointLights tracking the viewed/leading cars for dynamic specular road/wall highlights.
 const activeLights=[];
 for(let i=0;i<6;i++){
  const light=new THREE.PointLight('#f5faff',38,95,1.35);
  light.castShadow=false;scene.group.add(light);activeLights.push(light);
 }
 return {positions,activeLights};
}

function addGrandstandsAndHospitality(scene,track,p){
 // Futuristic permanent main grandstands with sweeping wave-like fabric roofs, pit building & VIP marina hospitality.
 const flagGeo=new THREE.PlaneGeometry(1.15,.68),flagMat=basic('#006c35',{side:THREE.DoubleSide}),flags=[];
 const crowdBodyGeo=new THREE.CapsuleGeometry(.18,.32,2,6),crowdHeadGeo=new THREE.SphereGeometry(.115,7,5),crowdMat=material('#ffffff');
 const dummy=new THREE.Object3D();
 for(const f of p.features){
  const g=group(scene,f,f.heading);
  if(f.kind==='pit'){
   scene.box(f.width,.35,f.length,'#3e4852',0,.18,0,g);
   scene.box(f.width-2,6.2,f.length-4,'#e8ecee',0,3.3,0,g);
   scene.box(f.width-.8,3.6,f.length-2,'#102136',0,8.2,0,g);
   scene.box(f.width+2.5,.55,f.length+2,'#f4f7f8',0,10.3,0,g);
   mesh(g,new THREE.BoxGeometry(f.width+2.8,.22,f.length+2.2),basic('#00d4ff'),0,10.62,0);
   mesh(g,new THREE.BoxGeometry(f.width+1.2,.18,f.length),basic('#00a651'),0,6.45,0);
   const sign=trackSign('JEDDAH CORNICHE CIRCUIT  •  FORMULA 1 STC SAUDI ARABIAN GRAND PRIX',f.length-14,1.25,'#0b1b2e','#f4f8ff');
   sign.position.set(-f.width/2-.12,8.3,0);sign.rotation.y=-Math.PI/2;g.add(sign);
   for(let i=0;i<18;i++){
    const team=LIVERIES[i%LIVERIES.length],z=-f.length/2+10+i*((f.length-20)/18);
    scene.box(.14,3.4,7.2,team.side,-f.width/2+1.02,1.8,z,g);
    mesh(g,new THREE.BoxGeometry(.16,.24,7.2),basic(team.accent),-f.width/2+.95,3.65,z);
   }
   protect(scene,track,g,{s:f.s,side:f.side,followTrack:true});
   continue;
  }
  if(f.kind==='hospitality'){
   // Multi-level luxury hospitality pavilions & VIP terraces overlooking the marina and track.
   for(let lvl=0;lvl<3;lvl++){
    const w=f.width-lvl*2.8,l=f.length-lvl*6,y=lvl*3.8;
    scene.box(w,3.2,l,'#f3efe6',0,y+1.6,0,g);
    mesh(g,new THREE.BoxGeometry(w+.3,1.9,l-.8),material('#62b6ea',{metalness:.75,roughness:.18,transparent:true,opacity:.78}),0,y+1.9,0);
    mesh(g,new THREE.BoxGeometry(w+1.4,.18,l+1.4),basic(lvl===1?'#a855f7':'#f5c35a'),0,y+3.32,0);
   }
   // Sweeping sail canopy over VIP rooftop terrace
   for(let k=-2;k<=2;k++){
    const sail=mesh(g,new THREE.ConeGeometry(8.5,5.2,4),material('#faf8f2',{roughness:.45}),0,13.6,k*(f.length/5.5));
    sail.scale.set(1.15,1,1.65);sail.rotation.y=Math.PI/4;
   }
   protect(scene,track,g,{s:f.s,side:f.side,followTrack:true});
   continue;
  }
  // Futuristic grandstands with sweeping, wave-like fabric roofs & packed energetic crowds waving Saudi flags.
  const rows=9,cols=Math.floor(f.length/1.85),totalCrowd=rows*cols;
  for(let r=0;r<rows;r++){
   scene.box(1.55,.78,f.length,['#0d5c46','#e8ebe6','#134b70'][r%3],-r*1.42,.55+r*.78,0,g);
  }
  // Sweeping wave-like modular fabric canopy segments across the stand length
  const bays=Math.max(6,Math.floor(f.length/14));
  for(let b=0;b<bays;b++){
   const z=-f.length/2+(b+.5)*(f.length/bays),waveY=9.8+Math.sin(b*.95)*1.15,tilt=Math.cos(b*.95)*.11;
   const roof=scene.box(16.8,.32,f.length/bays+.9,'#f7f6f0',-5.2,waveY,z,g);roof.rotation.x=tilt;roof.rotation.z=.12;
   const trim=mesh(g,new THREE.BoxGeometry(17.1,.14,f.length/bays+.6),basic(b%2?'#00a651':'#00d4ff'),-5.2,waveY+.2,z);trim.rotation.x=tilt;
   scene.box(.32,waveY,.32,'#8b9aa6',-12.2,waveY/2,z,g);
  }
  const bodies=new THREE.InstancedMesh(crowdBodyGeo,crowdMat,totalCrowd),heads=new THREE.InstancedMesh(crowdHeadGeo,crowdMat,totalCrowd);
  let idx=0;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
   const x=-r*1.42,z=-f.length/2+1.2+c*1.82,y=1.22+r*.78;
   dummy.position.set(x,y,z);dummy.rotation.set(0,0,.07*Math.sin(idx));dummy.scale.set(1,1,.88);dummy.updateMatrix();
   bodies.setMatrixAt(idx,dummy.matrix);bodies.setColorAt(idx,new THREE.Color(['#006c35','#f2f5f3','#008457','#145da0','#e6c259'][idx%5]));
   dummy.position.set(x,y+.44,z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();
   heads.setMatrixAt(idx,dummy.matrix);heads.setColorAt(idx,new THREE.Color(['#c89c78','#dfb895','#946e54','#cea282'][idx%4]));
   if((r+c)%9===0){
    const flag=new THREE.Mesh(flagGeo,flagMat);
    flag.position.set(x+.25,y+.95,z);flag.userData={baseY:y+.95,phase:idx*.37};g.add(flag);flags.push(flag);
    mesh(g,new THREE.BoxGeometry(.05,.45,.05),basic('#ffffff'),x+.25,y+.95,z);
   }
   idx++;
  }
  bodies.computeBoundingSphere();heads.computeBoundingSphere();g.add(bodies,heads);
  protect(scene,track,g,{s:f.s,side:f.side,followTrack:true});
 }
 return flags;
}

function addLandmarksAndHorizon(scene,track,p){
 // 1. Iconic sail-shaped Island Mosque (Al-Rahmah Floating Mosque) sitting directly on the Red Sea water on stilts.
 const mGroup=group(scene,p.mosque,0);
 for(let i=0;i<16;i++){
  const a=i*Math.PI/8,r=p.mosque.radius-2.5;
  mesh(mGroup,new THREE.CylinderGeometry(.42,.48,3.6,8),material('#f5f3eb'),Math.cos(a)*r,-1.1,Math.sin(a)*r);
 }
 mesh(mGroup,new THREE.CylinderGeometry(p.mosque.radius+3,p.mosque.radius+4,1.1,24),material('#f2eee2'),0,.45,0);
 mesh(mGroup,new THREE.CylinderGeometry(p.mosque.radius-1,p.mosque.radius,6.8,16),material('#faf8f2'),0,4.2,0);
 // Sail-shaped pointed coastal arches & turquoise/gold dome
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6,r=p.mosque.radius+.4;
  const sail=mesh(mGroup,new THREE.ConeGeometry(3.4,9.8,4),material('#ffffff',{roughness:.35}),Math.cos(a)*r,5.2,Math.sin(a)*r);
  sail.rotation.y=-a+Math.PI/4;sail.scale.set(.55,1,1.25);
  mesh(mGroup,new THREE.BoxGeometry(.35,6.4,1.8),basic('#ffd97d'),Math.cos(a)*(r-.5),4.2,Math.sin(a)*(r-.5)).rotation.y=-a;
 }
 mesh(mGroup,new THREE.SphereGeometry(12.5,24,16,0,Math.PI*2,0,Math.PI*.58),material('#1995ad',{metalness:.35,roughness:.28}),0,7.5,0);
 mesh(mGroup,new THREE.CylinderGeometry(13.2,13.2,.45,24),basic('#5ce1e6'),0,7.5,0);
 // Tall white minaret & glowing crescent finial
 mesh(mGroup,new THREE.CylinderGeometry(1.6,2.2,p.mosque.minaretHeight,12),material('#faf8f2'),p.mosque.radius-4,p.mosque.minaretHeight/2,-p.mosque.radius+4);
 mesh(mGroup,new THREE.CylinderGeometry(2.4,2.4,.9,12),basic('#ffe082'),p.mosque.radius-4,p.mosque.minaretHeight*.74,-p.mosque.radius+4);
 mesh(mGroup,new THREE.TorusGeometry(1.3,.18,8,18,Math.PI*1.45),basic('#ffd54f'),p.mosque.radius-4,p.mosque.minaretHeight+2.2,-p.mosque.radius+4);
 // Causeway connecting Island Mosque to Corniche promenade
 scene.box(42,1.1,7.5,'#e8e2d2',26,.4,0,mGroup);
 protect(scene,track,mGroup,{accept:()=>true});

 // 2. Jeddah Yacht Club & Marina with sweeping sail-like roofs & boardwalks
 const yc=group(scene,p.yachtClub,p.yachtClub.heading);
 scene.box(p.yachtClub.width+18,1.2,p.yachtClub.length+24,'#d8ccb8',0,-.1,0,yc);
 scene.box(p.yachtClub.width,9.5,p.yachtClub.length,'#f5f4ef',0,4.8,0,yc);
 mesh(yc,new THREE.BoxGeometry(p.yachtClub.width+.6,6.8,p.yachtClub.length-6),material('#38bdf8',{metalness:.8,roughness:.16}),0,5.2,0);
 for(let k=-2;k<=2;k++){
  const wing=mesh(yc,new THREE.ConeGeometry(16,18,4),material('#ffffff',{roughness:.32}),0,15.5,k*24);
  wing.scale.set(1.35,1,1.85);wing.rotation.set(.18,Math.PI/4,-.14);
  mesh(yc,new THREE.BoxGeometry(p.yachtClub.width+6,.28,2.2),basic('#00e5ff'),0,9.8,k*24);
 }
 // Marina wooden finger piers & superyachts
 for(let b=-3;b<=3;b++){
  scene.box(46,.45,3.2,'#8d6e53',-p.yachtClub.width/2-22,.15,b*18,yc);
 }
 protect(scene,track,yc,{accept:()=>true});
 for(const boat of p.boats){
  const bg=group(scene,boat,boat.heading);
  scene.box(boat.width,2.4,boat.length,boat.hull,0,1.2,0,bg);
  scene.box(boat.width-.8,2.1,boat.length*.68,boat.deck,0,3.2,-boat.length*.05,bg);
  scene.box(boat.width-1.8,1.7,boat.length*.42,boat.deck,0,4.9,-boat.length*.1,bg);
  mesh(bg,new THREE.BoxGeometry(boat.width+.15,.18,boat.length*.82),basic(boat.accent),0,2.35,0);
  mesh(bg,new THREE.BoxGeometry(boat.width-.6,.16,boat.length*.55),basic('#fff3c4'),0,4.15,-boat.length*.05);
  protect(scene,track,bg,{accept:(x,z)=>waterAt(track,x,z)});
 }

 // 3. High-end coastal beach resort complexes
 for(const r of p.resorts){
  if(!safeGroundClear(track,r.x,r.z,26))continue;
  const rg=group(scene,r,r.heading);
  scene.box(r.width,r.height,r.length,'#f2eee4',0,r.height/2,0,rg);
  mesh(rg,new THREE.BoxGeometry(r.width+.4,r.height*.72,r.length-6),material('#1e3a5f',{metalness:.75,roughness:.2}),0,r.height*.52,0);
  for(let lvl=1;lvl<=4;lvl++){
   mesh(rg,new THREE.BoxGeometry(r.width+.8,.22,r.length+.8),basic(lvl%2?r.accent:'#ffe082'),0,lvl*(r.height/4.2),0);
  }
  // Illuminated infinity pool facing Red Sea
  mesh(rg,new THREE.BoxGeometry(14,.3,r.length*.62),basic('#00e5ff'),-r.width/2-9,.18,0);
  protect(scene,track,rg);
 }

 // 4. Gleaming glass Jeddah Tower & futuristic neon-lit coastal skyscrapers on the horizon
 const jt=group(scene,p.jeddahTower,0);
 const spireGeo=new THREE.ConeGeometry(p.jeddahTower.baseRadius,p.jeddahTower.height,3);
 mesh(jt,spireGeo,material('#7cc4f8',{metalness:.88,roughness:.12}),0,p.jeddahTower.height/2,0);
 // Three aerodynamic stepped wings + cantilever sky-terrace at 330m
 for(let w=0;w<3;w++){
  const a=w*Math.PI*2/3;
  const wing=mesh(jt,new THREE.ConeGeometry(22,p.jeddahTower.height*.78,3),material('#93d5ff',{metalness:.86,roughness:.14}),Math.cos(a)*18,p.jeddahTower.height*.39,Math.sin(a)*18);
  wing.rotation.y=a;
  mesh(jt,new THREE.BoxGeometry(1.4,p.jeddahTower.height*.92,1.4),basic(w===0?'#00e5ff':w===1?'#a855f7':'#fbbf24'),Math.cos(a)*14,p.jeddahTower.height*.46,Math.sin(a)*14);
 }
 mesh(jt,new THREE.CylinderGeometry(16,14,2.4,24),basic('#00f0ff'),0,p.jeddahTower.height*.64,0);
 mesh(jt,new THREE.SphereGeometry(3.2,12,10),basic('#ffffff'),0,p.jeddahTower.height+3,0);
 protect(scene,track,jt);

 // Neon-lit Corniche skyscrapers throwing vibrant blues, purples, and golds
 for(const t of p.skyline){
  if(!safeGroundClear(track,t.x,t.z,35))continue;
  const tg=group(scene,t,0);
  scene.box(t.w,t.h,t.d,'#0f1d33',0,t.h/2,0,tg);
  mesh(tg,new THREE.BoxGeometry(t.w+.3,t.h-4,t.d+.3),material('#1d3557',{metalness:.82,roughness:.16}),0,t.h/2,0);
  // Vertical & horizontal neon architectural light strips
  for(const sx of [-t.w/2,t.w/2])for(const sz of [-t.d/2,t.d/2]){
   mesh(tg,new THREE.BoxGeometry(.65,t.h,.65),basic(t.neon),sx,t.h/2,sz);
  }
  for(let y=18;y<t.h-6;y+=22){
   mesh(tg,new THREE.BoxGeometry(t.w+.9,.55,t.d+.9),basic(y%44===18?t.neon:'#fde68a'),0,y,0);
  }
  mesh(tg,new THREE.BoxGeometry(t.w+1.4,1.2,t.d+1.4),basic(t.neon),0,t.h+.6,0);
  protect(scene,track,tg);
 }
}

function addLandscapingAndFountains(scene,track,p){
 // Manicured desert landscaping: sleek rows of tall lit palm trees, illuminated water fountains & geometric vibrant green grass lawns.
 const trunkGeo=new THREE.CylinderGeometry(.18,.32,8.6,7),frondGeo=new THREE.ConeGeometry(3.4,1.8,7),uplightGeo=new THREE.CylinderGeometry(.95,1.15,.16,12);
 const trunkMat=material('#6e533b',{roughness:.88}),frondMat=material('#1f7a3e',{roughness:.62}),uplightMat=basic('#ffd166');
 const palmSites=[];
 for(let s=25;s<track.length;s+=28){
  const idx=Math.floor(wrap(s,track.length)/track.step);
  for(const side of [-1,1]){
   const offset=side*(jeddahBoundaryOffset(track,idx,side)+7.5),q=sample(track,s,offset);
   if(!safeGroundClear(track,q.x,q.z,13.5)||waterAt(track,q.x,q.z))continue;
   palmSites.push({x:q.x,y:jeddahTerrainHeight(track,q.x,q.z),z:q.z,rot:(s*.13)+(side>0?0:1.7)});
  }
 }
 const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,palmSites.length),crowns=new THREE.InstancedMesh(frondGeo,frondMat,palmSites.length),uplights=new THREE.InstancedMesh(uplightGeo,uplightMat,palmSites.length);
 const dummy=new THREE.Object3D();
 palmSites.forEach((site,i)=>{
  dummy.position.set(site.x,site.y+4.3,site.z);dummy.rotation.set(0,site.rot,0);dummy.scale.set(1,1,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
  dummy.position.set(site.x,site.y+8.7,site.z);dummy.rotation.set(0,site.rot*1.7,0);dummy.scale.set(1.15,.85,1.15);dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);
  dummy.position.set(site.x,site.y+.1,site.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();uplights.setMatrixAt(i,dummy.matrix);
 });
 for(const inst of [trunks,crowns,uplights]){inst.computeBoundingSphere();scene.group.add(inst);}

 // Geometric patches of vibrant green grass lawns & illuminated water fountains contrasting with pale desert sand
 const lawnMat=material('#198245',{roughness:.68}),curbMat=material('#e9e5d8',{roughness:.6}),fountainJets=[];
 for(let s=140;s<track.length-120;s+=290){
  for(const side of [-1,1]){
   const idx=Math.floor(wrap(s,track.length)/track.step),offset=side*(jeddahBoundaryOffset(track,idx,side)+17.5);
   const q=sample(track,s,offset);
   if(!safeGroundClear(track,q.x,q.z,19.5)||waterAt(track,q.x,q.z))continue;
   const y=jeddahTerrainHeight(track,q.x,q.z),lg=group(scene,{x:q.x,y,z:q.z},q.heading);
   mesh(lg,new THREE.BoxGeometry(11.5,.22,34),curbMat,0,.11,0);
   mesh(lg,new THREE.BoxGeometry(10.6,.28,33),lawnMat,0,.15,0);
   mesh(lg,new THREE.BoxGeometry(11.7,.14,34.2),basic('#00e5a3'),0,.24,0);
   // Illuminated water fountain basin in every second geometric lawn plaza
   if(Math.floor(s/290)%2===0){
    mesh(lg,new THREE.CylinderGeometry(4.2,4.5,.55,18),curbMat,0,.32,0);
    mesh(lg,new THREE.CylinderGeometry(3.8,3.8,.62,18),basic('#00d4ff'),0,.36,0);
    const jet=new THREE.Mesh(new THREE.ConeGeometry(1.35,7.8,12),basic('#b8f2ff',{transparent:true,opacity:.78}));
    jet.position.set(0,4.2,0);jet.userData={baseY:4.2,baseH:1,phase:s*.03};lg.add(jet);fountainJets.push(jet);
   }
   protect(scene,track,lg,{s,side,followTrack:true});
  }
 }
 // Iconic King Fahd's Fountain-inspired tall illuminated coastal water plume on the Red Sea horizon
 const kfPos={x:p.mosque.x-145,y:p.level,z:p.mosque.z+420},kf=group(scene,kfPos,0);
 mesh(kf,new THREE.CylinderGeometry(9,11,1.6,18),basic('#00e5ff'),0,.6,0);
 const tallJet=new THREE.Mesh(new THREE.ConeGeometry(6.5,96,16),basic('#dcf8ff',{transparent:true,opacity:.76}));
 tallJet.position.set(0,48,0);tallJet.userData={baseY:48,baseH:1,phase:1.1};kf.add(tallJet);fountainJets.push(tallJet);
 protect(scene,track,kf,{accept:(x,z)=>waterAt(track,x,z)});
 return fountainJets;
}

function addTracksideUtilitiesAndMarshals(scene,track,p){
 // 1. Slender ultra-modern white camera poles
 const poleMat=material('#f4f7f9',{roughness:.35,metalness:.25}),camMat=material('#1b2430',{roughness:.4});
 for(let s=65;s<track.length;s+=145){
  const side=Math.floor(s/145)%2===0?1:-1,idx=Math.floor(wrap(s,track.length)/track.step);
  const q=sample(track,s,side*(jeddahBoundaryOffset(track,idx,side)+2.2));
  if(!safeGroundClear(track,q.x,q.z,10.2))continue;
  const cg=group(scene,q,q.heading);
  mesh(cg,new THREE.CylinderGeometry(.09,.14,9.6,8),poleMat,0,4.8,0);
  scene.box(1.4,.14,.14,'#f4f7f9',-side*.6,9.5,0,cg);
  mesh(cg,new THREE.BoxGeometry(.42,.28,.65),camMat,-side*1.2,9.35,0);
  mesh(cg,new THREE.SphereGeometry(.12,8,6),basic('#00f5d4'),-side*1.2,9.62,0);
  protect(scene,track,cg,{s,side});
 }
 // 2. Massive heavy-duty mobile recovery cranes behind designated concrete wall safety openings
 for(const c of p.cranes){
  if(!safeGroundClear(track,c.x,c.z,14.5))continue;
  const cg=group(scene,c,c.baseHeading+c.heading);
  // Designated safety opening striping on wall base
  scene.box(1.2,1.1,4.8,'#ff9f1c',-c.side*4.2,.55,0,cg);
  // Heavy recovery crane chassis & outriggers
  scene.box(3.4,1.6,8.8,'#eab308',0,.9,0,cg);
  scene.box(2.8,1.9,3.2,'#1e293b',0,2.4,2.2,cg);
  scene.box(6.2,.28,6.8,'#475569',0,.25,0,cg);
  // Telescopic high-reach boom & recovery hook cable
  const boom=scene.box(.65,18.5,.65,'#facc15',0,9.2,-1.2,cg);boom.rotation.x=.52;
  mesh(cg,new THREE.CylinderGeometry(.04,.04,9.5,6),material('#cbd5e1'),0,9.2,5.6);
  scene.box(.7,.8,.7,'#ef4444',0,4.4,5.6,cg);
  protect(scene,track,cg,{s:c.s,side:c.side});
 }
 // 3. Spotless track marshals in high-visibility white jumpsuits, white helmets & glowing LED safety vests in reinforced wall alcoves, plus incident-responsive FIA LED flag panels
 const alcoves=[],panels=[];
 const bodyGeo=new THREE.CapsuleGeometry(.2,.52,4,8),headGeo=new THREE.SphereGeometry(.15,8,8),vestGeo=new THREE.CylinderGeometry(.23,.23,.38,8);
 const suitMat=material('#f8fafc',{roughness:.42}),vestMat=basic('#38ff9c');
 for(let s=85;s<track.length;s+=165){
  const side=Math.floor(s/165)%2===0?-1:1,idx=Math.floor(wrap(s,track.length)/track.step);
  const wall=jeddahBoundaryOffset(track,idx,side),q=sample(track,s,side*(wall+1.85));
  if(!safeGroundClear(track,q.x,q.z,10.2))continue;
  const mg=group(scene,q,q.heading+(side>0?-Math.PI/2:Math.PI/2));
  // Reinforced concrete alcove shelter
  scene.box(2.2,2.5,2.4,'#cfd6dc',0,1.25,0,mg);
  scene.box(1.9,2.1,1.9,'#1e293b',0,1.1,.35,mg);
  mesh(mg,new THREE.BoxGeometry(2.3,.16,2.5),basic('#00e5ff'),0,2.55,0);
  // Marshal in white jumpsuit, white helmet & glowing LED safety vest
  mesh(mg,bodyGeo,suitMat,0,.88,.55);
  mesh(mg,vestGeo,vestMat,0,.96,.55);
  mesh(mg,headGeo,suitMat,0,1.42,.55);
  // Trackside digital FIA LED flag panel
  const panel=new THREE.Mesh(new THREE.BoxGeometry(1.35,.92,.16),basic('#00ff66'));
  panel.position.set(0,3.35,.85);mg.add(panel);
  if(!protect(scene,track,mg,{s,side}))continue;
  panels.push({mesh:panel,s,x:mg.position.x,z:mg.position.z});
  alcoves.push(mg);
 }
 return {panels};
}

function addFireworksAndLightShow(scene,track,p){
 // Synchronized firework bursts and sweeping architectural sky-tracker beams around the pit straight & marina.
 const burstSites=[
  {...sample(track,5920,-88),color:'#00f59b'},
  {...sample(track,80,-92),color:'#00d4ff'},
  {...sample(track,2445,-84),color:'#fbbf24'},
  {x:p.yachtClub.x-35,y:p.level,z:p.yachtClub.z,color:'#c084fc'},
  {...sample(track,5450,-85),color:'#38ff9c'}
 ];
 const bursts=[],beamMeshes=[];
 const rayGeo=new THREE.BoxGeometry(.38,14,.38);
 for(let b=0;b<burstSites.length;b++){
  const site={...burstSites[b]},probe=new THREE.Group();
  probe.position.set(site.x,site.y,site.z);const extent=new THREE.Mesh(new THREE.BoxGeometry(110,1,110),material('#ffffff'));probe.add(extent);scene.group.add(probe);
  if(!protect(scene,track,probe,{accept:()=>true})){extent.geometry.dispose();extent.material.dispose();continue;}
  site.x=probe.position.x;site.y=probe.position.y;site.z=probe.position.z;probe.removeFromParent();extent.geometry.dispose();extent.material.dispose();
  const bg=new THREE.Group();
  bg.position.set(site.x,site.y+72+(b%3)*14,site.z);bg.userData.noMirror=true;scene.group.add(bg);
  const matRef=basic(site.color,{transparent:true,opacity:.9});
  for(let r=0;r<18;r++){
   const phi=Math.acos(1-2*(r+.5)/18),theta=Math.PI*(1+Math.sqrt(5))*r;
   const ray=new THREE.Mesh(rayGeo,matRef);
   ray.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(Math.cos(theta)*Math.sin(phi),Math.cos(phi),Math.sin(theta)*Math.sin(phi)).normalize());
   bg.add(ray);
  }
  bursts.push({group:bg,mat:matRef,phase:b*1.25,baseY:site.y+72+(b%3)*14});
  // Synchronized searchlight beam sweeping the night sky
  const beamGeo=new THREE.ConeGeometry(8.5,140,12,1,true);beamGeo.translate(0,70,0);
  const beamMat=basic(site.color,{transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false});
  const beam=new THREE.Mesh(beamGeo,beamMat);
  beam.position.set(site.x,site.y+2,site.z);beam.userData={noMirror:true,phase:b*.9};scene.group.add(beam);
  beamMeshes.push(beam);
 }
 return {bursts,beamMeshes};
}

export function addJeddah(scene,track){
 const p=layout(track);
 const {water,foamMeshes}=addRedSeaWaterfront(scene,track,p);
 addRunoffAndTecpro(scene,track);
 addSponsorWallBranding(scene,track);
 const screens=addSponsorGantriesAndDisplays(scene,track);
 const {positions:lightPositions,activeLights}=addFloodlights(scene,track);
 const flags=addGrandstandsAndHospitality(scene,track,p);
 addLandmarksAndHorizon(scene,track,p);
 const fountainJets=addLandscapingAndFountains(scene,track,p);
 const {panels}=addTracksideUtilitiesAndMarshals(scene,track,p);
 const {bursts,beamMeshes}=addFireworksAndLightShow(scene,track,p);
 const boardStart=scene.group.children.length;addBrakingBoards(scene,track);
 for(const board of scene.group.children.slice(boardStart))protect(scene,track,board);
 const decorationGroup=scene.group;

 let lastScreenAt=0,lastLightAt=0;
 scene.environmentFx={
  setConditions(wetness){
   if(water?.material?.uniforms?.wetness)water.material.uniforms.wetness.value=wetness;
  },
  frame(now,cars=[]){
   const t=now*.001;
   // Animate crashing Red Sea wave foam
   for(const f of foamMeshes){
    f.position.x=f.userData.baseX+Math.sin(t*2.1+f.userData.phase)*1.15;
   }
   // Animate waving Saudi Arabian flags in the grandstands
   for(const flag of flags){
    flag.rotation.y=Math.sin(t*5.2+flag.userData.phase)*.38;
   }
   // Animate illuminated water fountains
   for(const jet of fountainJets){
    const pulse=.92+.14*Math.sin(t*3.4+jet.userData.phase);
    jet.scale.set(1,pulse,1);
   }
   // Animate synchronized firework bursts & sweeping sky-tracker beams
   for(const b of bursts){
    const cycle=(t*.55+b.phase)%1;
    const scale=.2+cycle*2.4;
    b.group.scale.setScalar(scale);
    b.group.position.y=b.baseY+Math.sin(cycle*Math.PI)*10;
    b.mat.opacity=Math.max(0,Math.sin(cycle*Math.PI)*.92);
   }
   for(const beam of beamMeshes){
    beam.rotation.z=Math.sin(t*.85+beam.userData.phase)*.32;
    beam.rotation.x=Math.cos(t*.65+beam.userData.phase)*.22;
   }
   // Update pooled active floodlights & incident-responsive marshal LED flag panels (~12 Hz)
   if(now-lastLightAt>80){
    lastLightAt=now;
    const activeCars=cars.filter(c=>c&&!c.finished&&!c.retired);
    const focus=scene.camera?.position||activeCars[0]||{x:0,z:0};
    const nearestLights=[...lightPositions].sort((a,b)=>Math.hypot(a.x-focus.x,a.z-focus.z)-Math.hypot(b.x-focus.x,b.z-focus.z)).slice(0,activeLights.length);
    nearestLights.forEach((lp,i)=>{activeLights[i].position.set(lp.x,lp.y,lp.z);});
    for(const panel of panels){
     const caution=activeCars.some(c=>Math.hypot(c.x-panel.x,c.z-panel.z)<95&&(c.offtrack||c.sliding||Math.abs(angleDiff(c.motionHeading??c.heading,c.heading))>.35||Math.abs(c.v)<12));
     panel.mesh.material.color.set(caution?'#ffd60a':'#00ff66');
    }
   }
   // Update dynamic LED digital display gantry boards once per second
   if(now-lastScreenAt>950){
    lastScreenAt=now;
    const active=cars.filter(c=>c&&!c.finished&&!c.retired),lead=active.reduce((first,c)=>!first||(c.progress||0)>(first.progress||0)?c:first,null),topSpeed=lead?Math.round((lead.v||0)*3.6):318,lap=lead?Math.max(1,lead.lap||1):1;
    for(const s of screens){
     const x=s.ctx;x.fillStyle=s.primary;x.fillRect(0,0,1024,160);
     x.fillStyle=s.secondary;x.fillRect(0,0,1024,16);x.fillRect(0,144,1024,16);
     x.fillStyle=s.ink;x.font='italic 900 46px Arial';x.textAlign='left';x.fillText(s.brand,36,72);
     x.font='700 32px monospace';x.fillStyle='#e2f8ff';
     x.fillText(`LAP ${lap}   •   SPD ${topSpeed} KM/H   •   JEDDAH NIGHT GP`,36,124);
     x.textAlign='right';x.fillStyle='#38ff9c';x.fillText('TRACK CLEAR  •  DRS ENABLED',988,72);
     s.tex.needsUpdate=true;
    }
   }
  },
  dispose(){
   water?.getRenderTarget?.()?.dispose?.();
   disposeRejectedDecorations(decorationGroup);
  }
 };
}
