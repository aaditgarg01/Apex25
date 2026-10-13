import {trackBarriers} from '/shared/barriers.mjs';
import {campusTunnelAt} from '/shared/campus.mjs';
import {liveryProfile,normalizeLiveryIndex} from '/shared/liveries.mjs';
import {TOP_SPEED,BOOST_TOP_SPEED} from '/shared/physics.mjs';
import {isOnTrack} from '/shared/race-display.mjs';
import {sampleGuide,racingSpeedAt,prepareRacingLine} from '/shared/racing-line.mjs';
import {conditionProfile} from '/shared/conditions.mjs';
import {WeatherEffects} from './weather.js';
import {venuePlan} from '/shared/venues.mjs';
import {batchBoxes} from './batching.js';
import * as THREE from '/vendor/three.module.js';
import {addVenue,addMappedScenery,venueProfile} from './scenery.js';
import {sample,targetSpeed,angleDiff,terrainHeight,nearest} from '/shared/tracks.mjs';
import {ribbonOffset,terrainVertexHeight} from '/shared/surface.mjs';
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
export class RaceScene{
 constructor(canvas){this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(innerWidth,innerHeight);this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#adc7cd');this.scene.fog=new THREE.FogExp2('#adc7cd',.00065);this.camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.15,7500);this.scene.add(new THREE.HemisphereLight('#c7e5f4','#79764b',2.5));const sun=new THREE.DirectionalLight('#fff0d1',3);this.sun=sun;sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-95,right:95,top:95,bottom:-95,near:1,far:400});sun.shadow.bias=-.0005;this.scene.add(sun.target);sun.position.set(600,700,-300);this.scene.add(sun);this.group=new THREE.Group();this.scene.add(this.group);this.cars=new Map();this.mode=0;this.cameraReady=false;this.showLine=true;this.slowFrames=0;this.qualityAt=0;this.look=new THREE.Vector3();this.conditions='normal';this.weather=new WeatherEffects(this.scene);window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);});}
 clear(){this.weather?.reset();this.group.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of [].concat(o.material)){m.map?.dispose();m.dispose();}});this.scene.remove(this.group);this.group=new THREE.Group();this.scene.add(this.group);this.cars.clear();this.cameraReady=false;}
 box(w,h,d,color,x=0,y=0,z=0,parent=this.group){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.userData.batchBox=true;parent.add(m);return m;}
 ribbon(track,left,right,color,y=.03,alternating=false){const pos=[],colors=[],indices=[],n=track.points.length,c1=new THREE.Color(color),c2=new THREE.Color(track.id==='be-1925'?'#e9c927':track.campus?'#ece6d1':'#edeee7');for(let i=0;i<=n;i++){const p=track.points[i%n];for(const edge of [left,right]){const offset=ribbonOffset(track,i%n,edge);pos.push(p.x+Math.cos(p.heading)*offset,p.y+y,p.z-Math.sin(p.heading)*offset);const col=alternating&&Math.floor(i/2)%2?c2:c1;colors.push(col.r,col.g,col.b);}if(i<n){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();const m=new THREE.Mesh(geo,mat(alternating?'#ffffff':color,{side:THREE.DoubleSide,vertexColors:alternating}));m.userData.roadBand={left,right,y};m.receiveShadow=true;this.group.add(m);return m;}
 buildBarriers(track){
 const positions=[],add=(a,b,c,d)=>{for(const p of [a,b,c,a,c,d])positions.push(p.x,p.y,p.z);};
 for(const w of trackBarriers(track).walls){if(w.kind!=='track')continue;const nx=w.tz*w.width/2,nz=-w.tx*w.width/2,a={x:w.a.x+nx,y:w.a.y,z:w.a.z+nz},b={x:w.b.x+nx,y:w.b.y,z:w.b.z+nz},c={x:w.b.x-nx,y:w.b.y,z:w.b.z-nz},d={x:w.a.x-nx,y:w.a.y,z:w.a.z-nz},top=p=>({...p,y:p.y+w.height});
 add(a,b,top(b),top(a));add(c,d,top(d),top(c));add(top(a),top(b),top(c),top(d));add(d,a,top(a),top(d));add(b,c,top(c),top(b));}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,mat('#8c9e9f',{side:THREE.DoubleSide}));mesh.castShadow=true;mesh.receiveShadow=true;this.group.add(mesh);
 }
 load(track){this.clear();this.track=track;const half=track.width/2;this.profile=venueProfile(track);document.getElementById('map-credit').hidden=!['in-2011','ar-1952','in-vit-vellore'].includes(track.id);this.scene.background.set(this.profile.sky);this.scene.fog.color.copy(this.scene.background);this.scene.fog.density=this.profile.night?.0013:.00065;this.sun.intensity=this.profile.night?1.2:3;this.sun.color.set(this.profile.night?'#b5d6ff':'#fff0d1');
 const ps=track.points,minX=Math.min(...ps.map(p=>p.x))-450,maxX=Math.max(...ps.map(p=>p.x))+450,minZ=Math.min(...ps.map(p=>p.z))-450,maxZ=Math.max(...ps.map(p=>p.z))+450,width=maxX-minX,depth=maxZ-minZ;
 const landmarkSite=track.campus?null:venuePlan(track);
 const cell=track.id==='mc-1929'||track.campus?8:24;const geo=new THREE.PlaneGeometry(width,depth,Math.ceil(width/cell),Math.ceil(depth/cell));geo.rotateX(-Math.PI/2);const verts=geo.attributes.position;
 for(let i=0;i<verts.count;i++){const x=verts.getX(i)+(minX+maxX)/2,z=verts.getZ(i)+(minZ+maxZ)/2;let y=terrainVertexHeight(track,x,z,cell);if(landmarkSite){const distance=Math.hypot(x-landmarkSite.x,z-landmarkSite.z),blend=Math.max(0,Math.min(1,(landmarkSite.radius+10-distance)/10));y+=(landmarkSite.y-.15-y)*blend;}verts.setXYZ(i,x,y,z);}geo.computeVertexNormals();
 const groundColors=[],baseColor=new THREE.Color(this.profile.ground);for(let i=0;i<verts.count;i++){const factor=.93+.065*Math.sin(verts.getX(i)*.017)*Math.cos(verts.getZ(i)*.021);groundColors.push(baseColor.r*factor,baseColor.g*factor,baseColor.b*factor);}geo.setAttribute('color',new THREE.Float32BufferAttribute(groundColors,3));const ground=new THREE.Mesh(geo,mat('#ffffff',{vertexColors:true}));ground.receiveShadow=true;this.group.add(ground);const horizon=new THREE.Mesh(new THREE.PlaneGeometry(16000,16000),mat(this.profile.ground));horizon.rotation.x=-Math.PI/2;horizon.position.y=track.campus?Math.min(...track.points.map(p=>p.y))-2:-3;this.group.add(horizon);for(const side of [-1,1]){const a=side*half,b=side*(half+(track.campus?1.8:6.5));this.ribbon(track,Math.min(a,b),Math.max(a,b),this.profile.ground,-.08);}
 for(const side of [-1,1]){for(const [width,color,y] of [[track.campus?1.4:6,track.arid?'#c6b795':'#75938b',.01],[1.2,'#e1ded0',.025]]){const a=side*half,b=side*(half+width);this.ribbon(track,Math.min(a,b),Math.max(a,b),color,y);}}this.ribbon(track,-half,half,'#343d43',.05);this.ribbon(track,-half-1.4,-half-.15,track.campus?'#292e32':'#d14a37',.07,true);this.ribbon(track,half+.15,half+1.4,track.campus?'#292e32':'#d14a37',.07,true);this.ribbon(track,-half+.2,-half+.36,'#dbddd5',.07);this.ribbon(track,half-.36,half-.2,'#dbddd5',.07);this.buildBarriers(track);
 // High-contrast unlit chevrons, aligned with the road slope.
 prepareRacingLine(track);const count=76,shape=new THREE.Shape();shape.moveTo(-.9,1.7);shape.lineTo(0,.8);shape.lineTo(.9,1.7);shape.lineTo(.9,-.4);shape.lineTo(0,-1.4);shape.lineTo(-.9,-.4);shape.closePath();
 const arrowGeo=new THREE.ShapeGeometry(shape);arrowGeo.rotateX(-Math.PI/2);arrowGeo.scale(.45,1,.45);
 const line=new THREE.InstancedMesh(arrowGeo,new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}),count),border=new THREE.InstancedMesh(arrowGeo,new THREE.MeshBasicMaterial({color:'#06131a',side:THREE.DoubleSide}),count),dummy=new THREE.Object3D(),color=new THREE.Color();dummy.rotation.order='YXZ';

 line.frustumCulled=false;border.frustumCulled=false;this.guide=line;this.guideBorder=border;this.guideAt=-Infinity;this.line=new THREE.Group();this.line.add(border,line);this.group.add(this.line);addVenue(this,track);this.sceneryReady=addMappedScenery(this,track);
 const start=sample(track,0),gantry=new THREE.Group();gantry.position.set(start.x,start.y,start.z);gantry.rotation.y=start.heading;this.group.add(gantry);for(const x of [-half-2,half+2])this.box(.5,7.5,.5,'#5a6265',x,3.75,0,gantry);this.box(track.width+5,1.5,.6,'#202c35',0,7,0,gantry);
 const tc=document.createElement('canvas');tc.width=1024;tc.height=128;const ctx=tc.getContext('2d');ctx.fillStyle='#202c35';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#ff5936';ctx.font='italic 900 76px Arial';ctx.textAlign='center';ctx.fillText(track.campus?'VIT VELLORE':'APEX 25',512,93);const tex=new THREE.CanvasTexture(tc),sign=new THREE.Mesh(new THREE.PlaneGeometry(track.width+3,1.4),new THREE.MeshBasicMaterial({map:tex}));sign.position.set(0,7,.32);gantry.add(sign);const back=sign.clone();back.rotation.y=Math.PI;back.position.z=-.32;gantry.add(back);
 for(let row=0;row<2;row++)for(let col=0;col<16;col++)this.box(track.width/16,.035,1,(row+col)%2?'#dce1dc':'#252d33',-half+(col+.5)*track.width/16,.12,row-1,gantry);
 for(let i=0;i<8;i++){const p=sample(track,-12-Math.floor(i/2)*10,i%2?3.1:-3.1),m=this.box(2.5,.02,.12,'#d5d8cb',p.x,p.y+.11,p.z);m.rotation.y=p.heading;}
 for(let s=100;s<track.length;s+=120)if(targetSpeed(track,s+70)<45){const p=sample(track,s,half+4),g=new THREE.Group();g.position.set(p.x,p.y+1.8,p.z);g.rotation.y=p.heading;this.group.add(g);this.box(1.2,1.6,.12,'#e9e9dd',0,0,0,g);}
 this.batchStats=batchBoxes(this.group);this.setConditions(this.conditions);
 }
 setConditions(value){
 const condition=conditionProfile(value);this.conditions=condition.id;this.weather.setConditions(condition.id);
 if(!this.track||!this.profile)return;
 const w=condition.wetness;
 this.scene.background.set(w?(this.profile.night?'#192b3a':w>.7?'#6a7b88':'#8c9eaa'):this.profile.sky);
 this.scene.fog.color.copy(this.scene.background);this.scene.fog.density=Math.max(this.profile.night?.0013:.00065,w*.0017);
 this.sun.intensity=(this.profile.night?1.2:3)*(1-w*.70);this.sun.color.set(w?'#ccd9e2':this.profile.night?'#b5d6ff':'#fff0d1');
 this.group.traverse(o=>{if(!o.userData.roadBand||!o.material)return;const asphalt=o.userData.roadBand.y===.05;o.material.roughness=asphalt?.8-w*.61:.8-w*.24;o.material.metalness=asphalt?w*.18:0;if(asphalt)o.material.color.set(w?'#2b363e':'#343d43');});
 this.guideAt=-Infinity;
 }
 updateGuide(car,now){
 if(!this.guide||!car||!this.showLine||now-this.guideAt<80)return;
 this.guideAt=now;const dummy=new THREE.Object3D(),color=new THREE.Color(),condition=conditionProfile(this.conditions),speed=Math.max(0,car.v);
 for(let i=0;i<this.guide.count;i++){
  const distance=i*4-8,s=car.s+distance,p=sampleGuide(this.track,s),limit=racingSpeedAt(this.track,s,this.conditions),forecast=Math.min(car.boostActive?BOOST_TOP_SPEED:Math.max(TOP_SPEED,speed),Math.sqrt(speed*speed+2*8*condition.traction*Math.min(70,Math.max(0,distance))));
  const next=racingSpeedAt(this.track,s+12,this.conditions),overspeed=forecast-limit;
  const tint=overspeed>3?'#ff4230':overspeed>-.8&&next<limit-.8?'#ffca00':'#52ff2e';
  dummy.position.set(p.x,p.y+.16,p.z);dummy.rotation.set(-p.pitch,p.heading,0,'YXZ');dummy.scale.set(.9,1,.9);dummy.updateMatrix();this.guide.setMatrixAt(i,dummy.matrix);this.guide.setColorAt(i,color.set(tint));
  dummy.position.y-=.025;dummy.scale.set(1.1,1,1.08);dummy.updateMatrix();this.guideBorder.setMatrixAt(i,dummy.matrix);
 }
 this.guide.instanceMatrix.needsUpdate=true;this.guide.instanceColor.needsUpdate=true;this.guideBorder.instanceMatrix.needsUpdate=true;
 }
 makeCar(driver){const paint=liveryProfile(driver.colorId),car=new THREE.Group();car.rotation.order='YXZ';car.userData.liveryId=normalizeLiveryIndex(driver.colorId);const body=mat(paint.body,{roughness:.35,metalness:.35}),side=mat(paint.side,{roughness:.35,metalness:.35}),nose=mat(paint.nose,{roughness:.35,metalness:.35}),wing=mat(paint.wing,{roughness:.4}),accent=mat(paint.accent,{roughness:.35}),secondary=mat(paint.secondary,{roughness:.35}),black=mat('#11191f',{roughness:.65}),rubber=mat('#171b20'),silver=mat('#626d70',{metalness:.6});const add=(geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);car.add(o);if(geo.type==='BoxGeometry')o.userData.batchBox=true;return o;};add(new THREE.BoxGeometry(1.2,.48,3.7),body,0,.53,0);add(new THREE.BoxGeometry(.47,.3,1.8),nose,0,.45,2);add(new THREE.BoxGeometry(1.9,.3,1.9),side,0,.48,-.4);add(new THREE.BoxGeometry(1.8,.1,4.4),black,0,.22,.05);add(new THREE.BoxGeometry(2.05,.13,.55),wing,0,.28,2.4);add(new THREE.BoxGeometry(1.85,.15,.63),wing,0,1.15,-1.8);for(const x of [-.85,.85])add(new THREE.BoxGeometry(.1,.6,.55),black,x,.86,-1.8);add(new THREE.SphereGeometry(.37,16,12),black,0,.83,-.2);add(new THREE.SphereGeometry(.23,12,10),mat('#e1e8d9'),0,.95,-.16);add(new THREE.BoxGeometry(.4,.13,.35),mat('#262a39',{metalness:.65,roughness:.2}),0,.99,.02);const roll=add(new THREE.TorusGeometry(.37,.06,6,16,Math.PI),black,0,1.02,-.35);roll.rotation.y=Math.PI/2;add(new THREE.BoxGeometry(.07,.45,.08),black,0,1.02,.5);// Separate body panels, pinstripes and lettering make teams identifiable
 // from the chase camera without adding external model or texture downloads.
 add(new THREE.BoxGeometry(.72,.25,1.28),body,0,.9,-1.05);
 add(new THREE.BoxGeometry(.16,.02,1.58),accent,0,.615,1.95);
 add(new THREE.BoxGeometry(1.87,.025,.12),accent,0,1.237,-1.60);
 add(new THREE.BoxGeometry(1.98,.022,.12),accent,0,.358,2.54);
 for(const x of [-.96,.96]){
  add(new THREE.BoxGeometry(.035,.065,1.86),accent,x,.39,-.4);
  add(new THREE.BoxGeometry(.26,.02,1.28),secondary,x*.82,.645,-.4);
 }
 const decal=document.createElement('canvas');decal.width=512;decal.height=128;const ink=decal.getContext('2d');ink.fillStyle=paint.side;ink.fillRect(0,0,512,128);ink.fillStyle=paint.accent;ink.fillRect(0,100,512,28);ink.fillStyle=paint.secondary;ink.beginPath();ink.moveTo(0,0);ink.lineTo(92,0);ink.lineTo(46,100);ink.lineTo(0,100);ink.fill();ink.fillStyle=paint.ink;ink.font='italic 900 35px Arial';ink.textAlign='center';ink.fillText(paint.label,285,64,410);
 const texture=new THREE.CanvasTexture(decal);texture.colorSpace=THREE.SRGBColorSpace;const lettering=mat('#ffffff',{map:texture,roughness:.4});
 for(const x of [-.97,.97]){const label=add(new THREE.PlaneGeometry(1.75,.25),lettering,x,.52,-.4);label.rotation.y=Math.sign(x)*Math.PI/2;}
 const number=document.createElement('canvas');number.width=128;number.height=128;const ni=number.getContext('2d');ni.fillStyle=paint.nose;ni.fillRect(0,0,128,128);ni.fillStyle=paint.nose==='#f6d321'||paint.nose==='#f2f4f5'||paint.nose==='#f3f4f5'||paint.nose==='#33ed22'?'#11191f':'#ffffff';ni.font='italic 900 90px Arial';ni.textAlign='center';ni.fillText(String(driver.index+1).padStart(2,'0'),64,99);const numberTexture=new THREE.CanvasTexture(number);numberTexture.colorSpace=THREE.SRGBColorSpace;const numberPanel=add(new THREE.PlaneGeometry(.35,.45),mat('#ffffff',{map:numberTexture,roughness:.4}),0,.633,2.16);numberPanel.rotation.x=-Math.PI/2;
 const wheelGeo=new THREE.CylinderGeometry(.39,.39,.36,20),hubGeo=new THREE.CylinderGeometry(.21,.21,.38,12),wheels=[];
 wheelGeo.rotateZ(Math.PI/2);hubGeo.rotateZ(Math.PI/2);
 for(const x of [-1.05,1.05])for(const z of [-1.2,1.45]){
  const wheel=new THREE.Group();wheel.position.set(x,.39,z);
  const spin=new THREE.Group();
  spin.add(new THREE.Mesh(wheelGeo,rubber),new THREE.Mesh(hubGeo,silver));
  const mark=new THREE.Mesh(new THREE.BoxGeometry(.012,.09,.055),mat('#b8b9ad'));mark.position.set(Math.sign(x)*.185,.30,0);
  spin.add(mark);
  wheel.add(spin);
  wheel.userData={isFront:z>0,spin};
  car.add(wheel);wheels.push(wheel);
 }
 for(const z of [-1.2,1.45])add(new THREE.BoxGeometry(1.9,.07,.07),black,0,.45,z);car.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});batchBoxes(car,Infinity);car.userData.wheels=wheels;this.group.add(car);return car;}
 removeCar(id){const model=this.cars.get(id);if(!model)return;this.group.remove(model);const geometries=new Set(),materials=new Set(),textures=new Set();model.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const material of [].concat(o.material)){materials.add(material);if(material.map)textures.add(material.map);}});for(const geometry of geometries)geometry.dispose();for(const texture of textures)texture.dispose();for(const material of materials)material.dispose();this.cars.delete(id);}
 sync(cars,dt,rolling){const live=new Set(cars.filter(isOnTrack).map(c=>c.id));for(const id of this.cars.keys())if(!live.has(id))this.removeCar(id);for(const c of cars){if(!isOnTrack(c))continue;let model=this.cars.get(c.id);if(model&&model.userData.liveryId!==normalizeLiveryIndex(c.colorId)){this.removeCar(c.id);model=null;}if(!model){model=this.makeCar(c);this.cars.set(c.id,model);model.position.set(c.x,c.y,c.z);model.rotation.y=c.heading;}const blend=c.smoothMotion?1:1-Math.exp(-dt*18);model.position.lerp(new THREE.Vector3(c.x,c.y+.07,c.z),blend);model.rotation.y+=angleDiff(c.heading,model.rotation.y)*blend;model.rotation.x+=(-(c.pitch||0)-model.rotation.x)*blend;if(rolling&&!c.finished)model.userData.wheels.forEach(w=>{w.userData.spin.rotation.x=(w.userData.spin.rotation.x+c.v*dt/.39)%(Math.PI*2);if(w.userData.isFront)w.rotation.y=c.steer*.6;});}}
 frame(cars,player,dt,racing,rolling=false){
 // Sustained slow frames lower resolution before input feels sluggish. Do not
 // count background-tab throttling or loading spikes as graphics pressure.
 if(!document.hidden&&dt>.032&&dt<.095)this.slowFrames++;else this.slowFrames=Math.max(0,this.slowFrames-1);
 if(this.slowFrames>75&&performance.now()-this.qualityAt>5000){const ratio=this.renderer.getPixelRatio();if(ratio>.85)this.renderer.setPixelRatio(Math.max(.85,ratio-.2));else this.renderer.shadowMap.enabled=false;this.slowFrames=0;this.qualityAt=performance.now();}
 this.line.visible=this.showLine&&cars.some(isOnTrack);this.sync(cars,dt,rolling);const c=isOnTrack(player)?player:(cars.find(isOnTrack)||player||cars[0]);if(c){let pos,look;const h=c.heading,pitch=c.pitch||0,v=new THREE.Vector3(Math.sin(h)*Math.cos(pitch),Math.sin(pitch),Math.cos(h)*Math.cos(pitch)),p=new THREE.Vector3(c.x,c.y,c.z);
 if(!racing){pos=p.clone().addScaledVector(v,8).add(new THREE.Vector3(Math.cos(h)*14,6,-Math.sin(h)*14));look=p.clone().addScaledVector(v,-6).add(new THREE.Vector3(0,1,0));this.camera.fov=53;}
 else if(this.mode===1){pos=p.clone().addScaledVector(v,-.25).add(new THREE.Vector3(0,1.3,0));look=p.clone().addScaledVector(v,45).add(new THREE.Vector3(0,1.2,0));this.camera.fov=78;}
 else if(this.mode===2){pos=p.clone().addScaledVector(v,-20).add(new THREE.Vector3(0,65,0));look=p.clone().addScaledVector(v,25);this.camera.fov=60;}
 else{pos=p.clone().addScaledVector(v,-10-c.v*.038).add(new THREE.Vector3(0,4.8+c.v*.012,0));look=p.clone().addScaledVector(v,20+c.v*.18).add(new THREE.Vector3(0,1,0));this.camera.fov=60+c.v*.07;}
 const roadCamera=this.track.campus?nearest(this.track,pos.x,pos.z,c.s):null;const floor=roadCamera&&roadCamera.distance<this.track.width+4?sample(this.track,roadCamera.s).y+1.2:terrainHeight(this.track,pos.x,pos.z)+1.2;if(this.mode!==1)pos.y=Math.max(pos.y,floor);
 const sheltered=campusTunnelAt(this.track,c.s,8);if(racing&&sheltered&&this.mode!==1){if(this.mode===2){pos=p.clone().addScaledVector(v,-7).add(new THREE.Vector3(0,3.2,0));look=p.clone().addScaledVector(v,12).add(new THREE.Vector3(0,1,0));}pos.y=Math.min(pos.y,c.y+4.4);}
 this.weather.rain.visible=this.weather.profile.wetness>0&&!sheltered;
 this.sun.position.set(c.x+70,c.y+130,c.z-55);this.sun.target.position.set(c.x,c.y,c.z);this.sun.target.updateMatrixWorld();
 const blend=this.cameraReady?1-Math.exp(-dt*(this.mode===1?30:7)):1;this.camera.position.lerp(pos,blend);this.look.lerp(look,blend);this.camera.lookAt(this.look);this.camera.updateProjectionMatrix();this.cameraReady=true;for(const [id,m]of this.cars){m.visible=!(racing&&this.mode===1&&id===c.id);const distance=m.position.distanceTo(this.camera.position);m.traverse(o=>{if(o.isMesh)o.castShadow=distance<55;});for(const w of m.userData.wheels){w.children[0].children[1].visible=distance<90;w.children[0].children[2].visible=distance<45;}}
 }this.updateGuide(c,performance.now());this.weather.frame(cars,c,dt,this.camera);this.renderer.render(this.scene,this.camera);
 }
}
