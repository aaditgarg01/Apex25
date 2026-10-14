import {monacoTerrainHeight} from './monaco.js';
import {spaTerrainHeight} from './spa.js';
import {bahrainTerrainHeight} from './bahrain.js';
import {suzukaTerrainHeight} from './suzuka.js';
import {shanghaiTerrainHeight} from './shanghai.js';
import {albertTerrainHeight} from './albert-park.js';
import {trackBarriers} from '/shared/barriers.mjs';
import {campusTunnelAt} from '/shared/campus.mjs';
import {liveryProfile,normalizeLiveryIndex} from '/shared/liveries.mjs';
import {TOP_SPEED,BOOST_TOP_SPEED,gridSlot} from '/shared/physics.mjs';
import {isOnTrack} from '/shared/race-display.mjs';
import {sampleGuide,racingSpeedAt,prepareRacingLine} from '/shared/racing-line.mjs';
import {conditionProfile} from '/shared/conditions.mjs';
import {WeatherEffects} from './weather.js';
import {venuePlan} from '/shared/venues.mjs';
import {batchBoxes,batchMapped} from './batching.js';
import {TrackSurfaces,trackAppearance} from './track-surfaces.js';
import {addCarDetail,updateCockpit} from './car-detail.js';
import {addCircuitDetails} from './circuit-details.js';
import {RaceAtmosphere} from './atmosphere.js';
import * as THREE from '/vendor/three.module.js';
import {addVenue,addMappedScenery,venueProfile} from './scenery.js';
import {sample,angleDiff,terrainHeight,nearest} from '/shared/tracks.mjs';
import {ribbonOffset,terrainVertexHeight} from '/shared/surface.mjs';
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
export class RaceScene{
 constructor(canvas){this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(innerWidth,innerHeight);this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.95;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#adc7cd');this.scene.fog=new THREE.FogExp2('#adc7cd',.00065);this.camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.15,7500);this.hemisphere=new THREE.HemisphereLight('#c7e0ef','#77735c',1.5);this.scene.add(this.hemisphere);this.atmosphere=new RaceAtmosphere(this.renderer,this.scene);const sun=new THREE.DirectionalLight('#fff0d1',3);this.sun=sun;sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-70,right:70,top:70,bottom:-70,near:1,far:400});sun.shadow.bias=-.0002;sun.shadow.normalBias=.025;this.scene.add(sun.target);sun.position.set(600,700,-300);this.scene.add(sun);this.group=new THREE.Group();this.scene.add(this.group);this.cars=new Map();this.mode=0;this.cameraReady=false;this.showLine=true;this.slowFrames=0;this.qualityAt=0;this.look=new THREE.Vector3();this.conditions='normal';this.weather=new WeatherEffects(this.scene);window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);});}
 clear(){this.environmentFx?.dispose();this.environmentFx=null;this.weather?.reset();this.surfaces?.dispose();this.surfaces=null;this.group.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of [].concat(o.material)){m.map?.dispose();m.dispose();}});this.scene.remove(this.group);this.group=new THREE.Group();this.scene.add(this.group);this.cars.clear();this.cameraReady=false;}
 box(w,h,d,color,x=0,y=0,z=0,parent=this.group){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.userData.batchBox=true;m.receiveShadow=true;m.castShadow=h>1||w*d>4&&h>.15;parent.add(m);return m;}
 ribbon(track,left,right,color,y=.03,alternating=false,options={}){
 const pos=[],colors=[],uv=[],indices=[],n=track.points.length,c1=new THREE.Color(color),c2=new THREE.Color(options.color2||'#e8e5dc');
 for(let i=0;i<=n;i++){
  const p=track.points[i%n];for(const edge of [left,right]){
   const offset=ribbonOffset(track,i%n,edge),raised=options.raised?(Math.abs(edge)>this.track.width/2+.5?.035:0):0;
   pos.push(p.x+Math.cos(p.heading)*offset,p.y+y+raised,p.z-Math.sin(p.heading)*offset);uv.push(offset/4,i*track.step/4);
   const col=alternating&&Math.floor(i*track.step/1.7)%2?c2:c1;colors.push(col.r,col.g,col.b);
  }
  if(i<n&&(!options.mask||options.mask[i])){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
 const material=options.kind?this.surfaces.material(options.kind,alternating?'#ffffff':color,alternating):mat(alternating?'#ffffff':color,{side:THREE.DoubleSide,vertexColors:alternating});
 const mesh=new THREE.Mesh(geo,material);mesh.userData.roadBand={left,right,y,kind:options.kind};mesh.receiveShadow=true;this.group.add(mesh);return mesh;
 }

 buildBarriers(track){
 const walls=trackBarriers(track).walls,solid=walls.filter(w=>w.kind==='track');if(track.id==='mc-1929'){const blocks=[],rails=[];solid.forEach((w,i)=>{const j=Math.floor(i/2),n=track.points.length,curved=Math.abs(angleDiff(track.points[(j+3)%n].heading,track.points[(j-3+n)%n].heading))>.18;(curved?blocks:rails).push(w);});this.wallMesh(rails,'#ecebdc','armco');this.wallMesh(blocks,'#e2dfd0','concrete');}else this.wallMesh(solid,this.track.id==='be-1925'?'#e4e8dc':this.track.id==='bh-2002'?'#e7e7dd':this.track.id==='jp-1962'?'#eeeede':this.track.id==='cn-2004'?'#e2e4df':this.track.id==='au-1953'?'#bdbeb5':this.appearance.street?'#b7b4ab':'#b3b8b6');const fences=walls.filter(w=>w.kind==='fence');this.surfaces.fence(fences,['au-1953','cn-2004','bh-2002','be-1925','mc-1929'].includes(track.id)?'#455259':'#b6bebd');if(['au-1953','cn-2004','bh-2002','be-1925','mc-1929'].includes(track.id))for(let i=0;i<fences.length;i+=12){const w=fences[i];this.box(.1,w.height,.1,'#455259',w.a.x,w.a.y+w.height/2,w.a.z);}
 }
 wallMesh(walls,color,kind=null){
 const positions=[],uv=[],add=(a,b,c,d)=>{const w=Math.hypot(b.x-a.x,b.z-a.z)/4,h=Math.max(.01,Math.hypot(d.x-a.x,d.y-a.y,d.z-a.z))/.8;for(const [p,u,v] of [[a,0,0],[b,w,0],[c,w,h],[a,0,0],[c,w,h],[d,0,h]]){positions.push(p.x,p.y,p.z);uv.push(u,v);}};
 for(const w of walls){const length=Math.hypot(w.b.x-w.a.x,w.b.z-w.a.z);if(length<.01)continue;const nx=(w.b.z-w.a.z)/length*w.width/2,nz=-(w.b.x-w.a.x)/length*w.width/2,a={x:w.a.x+nx,y:w.a.y,z:w.a.z+nz},b={x:w.b.x+nx,y:w.b.y,z:w.b.z+nz},c={x:w.b.x-nx,y:w.b.y,z:w.b.z-nz},d={x:w.a.x-nx,y:w.a.y,z:w.a.z-nz},top=p=>({...p,y:p.y+w.height});
 add(a,b,top(b),top(a));add(c,d,top(d),top(c));add(top(a),top(b),top(c),top(d));add(d,a,top(a),top(d));add(b,c,top(c),top(b));}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,this.surfaces?this.surfaces.material(kind||(['au-1953','cn-2004','bh-2002'].includes(this.track.id)?'concrete':this.track.id==='mc-1929'?'armco':this.track.urban?'paint':'armco'),color):mat(color,{side:THREE.DoubleSide}));mesh.castShadow=true;mesh.receiveShadow=true;this.group.add(mesh);return mesh;
 }
 load(track){this.clear();this.track=track;const half=track.width/2;this.profile=venueProfile(track);this.appearance=trackAppearance(track);this.profile.ground=this.appearance.ground;this.surfaces=new TrackSurfaces(this,track);document.getElementById('map-credit').hidden=!['in-2011','ar-1952','in-vit-vellore','jp-1962','bh-2002','be-1925','mc-1929'].includes(track.id);
 const ps=track.points,terrainMargin=track.id==='mc-1929'?1200:track.id==='be-1925'?950:track.id==='bh-2002'?1600:track.id==='cn-2004'?950:450,minX=Math.min(...ps.map(p=>p.x))-terrainMargin,maxX=Math.max(...ps.map(p=>p.x))+terrainMargin,minZ=Math.min(...ps.map(p=>p.z))-terrainMargin,maxZ=Math.max(...ps.map(p=>p.z))+terrainMargin,width=maxX-minX,depth=maxZ-minZ;
 const landmarkSite=track.campus||['au-1953','cn-2004','jp-1962','bh-2002','be-1925','mc-1929'].includes(track.id)?null:venuePlan(track);
 const cell=['au-1953','jp-1962','be-1925'].includes(track.id)?12:track.id==='mc-1929'?12:track.campus?8:24;const geo=new THREE.PlaneGeometry(width,depth,Math.ceil(width/cell),Math.ceil(depth/cell));geo.rotateX(-Math.PI/2);const verts=geo.attributes.position;
 for(let i=0;i<verts.count;i++){const x=verts.getX(i)+(minX+maxX)/2,z=verts.getZ(i)+(minZ+maxZ)/2;let y=track.id==='mc-1929'?monacoTerrainHeight(track,x,z,cell):track.id==='be-1925'?spaTerrainHeight(track,x,z,cell):track.id==='bh-2002'?bahrainTerrainHeight(track,x,z,cell):track.id==='jp-1962'?suzukaTerrainHeight(track,x,z,cell):track.id==='cn-2004'?shanghaiTerrainHeight(track,x,z):track.id==='au-1953'?albertTerrainHeight(track,x,z,cell):terrainVertexHeight(track,x,z,cell);if(landmarkSite){const distance=Math.hypot(x-landmarkSite.x,z-landmarkSite.z),blend=Math.max(0,Math.min(1,(landmarkSite.radius+10-distance)/10));y+=(landmarkSite.y-.15-y)*blend;}verts.setXYZ(i,x,y,z);geo.attributes.uv.setXY(i,x/16,z/16);}geo.computeVertexNormals();
 const groundColors=[],baseColor=new THREE.Color(this.profile.ground);for(let i=0;i<verts.count;i++){const factor=.93+.065*Math.sin(verts.getX(i)*.017)*Math.cos(verts.getZ(i)*.021);groundColors.push(baseColor.r*factor,baseColor.g*factor,baseColor.b*factor);}geo.setAttribute('color',new THREE.Float32BufferAttribute(groundColors,3));const ground=new THREE.Mesh(geo,this.surfaces.material(track.id==='mc-1929'?'concrete':track.id==='bh-2002'?'sand':'grass','#ffffff',true));ground.receiveShadow=true;this.group.add(ground);const horizon=new THREE.Mesh(new THREE.PlaneGeometry(16000,16000),mat(this.profile.ground));horizon.rotation.x=-Math.PI/2;horizon.position.y=['jp-1962','be-1925','mc-1929'].includes(track.id)?-24:track.campus?Math.min(...track.points.map(p=>p.y))-2:-3;this.group.add(horizon);this.surfaces.build();this.buildBarriers(track);
 // High-contrast unlit chevrons, aligned with the road slope.
 prepareRacingLine(track);const count=76,shape=new THREE.Shape();shape.moveTo(-.9,1.7);shape.lineTo(0,.8);shape.lineTo(.9,1.7);shape.lineTo(.9,-.4);shape.lineTo(0,-1.4);shape.lineTo(-.9,-.4);shape.closePath();
 const arrowGeo=new THREE.ShapeGeometry(shape);arrowGeo.rotateX(-Math.PI/2);arrowGeo.scale(.45,1,.45);
 const line=new THREE.InstancedMesh(arrowGeo,new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}),count),border=new THREE.InstancedMesh(arrowGeo,new THREE.MeshBasicMaterial({color:'#06131a',side:THREE.DoubleSide}),count),dummy=new THREE.Object3D(),color=new THREE.Color();dummy.rotation.order='YXZ';

 line.frustumCulled=false;border.frustumCulled=false;this.guide=line;this.guideBorder=border;this.guideAt=-Infinity;this.line=new THREE.Group();this.line.add(border,line);this.group.add(this.line);addVenue(this,track);if(!['au-1953','cn-2004','jp-1962','bh-2002','be-1925','mc-1929'].includes(track.id))addCircuitDetails(this,track);this.sceneryReady=addMappedScenery(this,track);
 const start=sample(track,0),gantry=new THREE.Group();gantry.position.set(start.x,start.y,start.z);gantry.rotation.y=start.heading;this.group.add(gantry);for(const x of [-half-2,half+2])this.box(.5,7.5,.5,'#5a6265',x,3.75,0,gantry);this.box(track.width+5,1.5,.6,'#202c35',0,7,0,gantry);
 const tc=document.createElement('canvas');tc.width=1024;tc.height=128;const ctx=tc.getContext('2d');ctx.fillStyle='#202c35';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#ff5936';ctx.font='italic 900 76px Arial';ctx.textAlign='center';ctx.fillText(track.campus?'VIT VELLORE':'APEX 25',512,93);const tex=new THREE.CanvasTexture(tc),sign=new THREE.Mesh(new THREE.PlaneGeometry(track.width+3,1.4),new THREE.MeshBasicMaterial({map:tex}));sign.position.set(0,7,.32);gantry.add(sign);const back=sign.clone();back.rotation.y=Math.PI;back.position.z=-.32;gantry.add(back);
 for(let row=0;row<2;row++)for(let col=0;col<16;col++)this.box(track.width/16,.035,1,(row+col)%2?'#dce1dc':'#252d33',-half+(col+.5)*track.width/16,.12,row-1,gantry);
 for(let i=0;i<8;i++){const {s,offset}=gridSlot(i),p=sample(track,s,offset),m=this.box(2.5,.02,.12,'#d5d8cb',p.x,p.y+.11,p.z);m.rotation.y=p.heading;}
 this.batchStats=batchBoxes(this.group);batchMapped(this.group);this.setConditions(this.conditions);
 }
 setConditions(value){
 const condition=conditionProfile(value);this.conditions=condition.id;this.weather.setConditions(condition.id);
 if(!this.track||!this.profile)return;
 const w=condition.wetness;
 this.atmosphere.set(this.profile,this.appearance,w);
 this.scene.fog.density=Math.max(this.profile.night?.0007:this.appearance.fog,w*.00125);
 this.sun.intensity=(this.profile.night?1.35:2.7)*(1-w*.66);this.sun.color.set(w?'#d2dde4':this.profile.night?'#c1d8e8':'#fff0d9');
 this.hemisphere.intensity=this.profile.night?.85:1.45+w*.1;this.hemisphere.color.set(this.profile.night?'#8da9c1':'#bfd7e5');this.hemisphere.groundColor.set(this.profile.ground);
 if(this.profile.goldenHour){this.sun.color.set(w?'#d6d5ca':'#ffd198');this.sun.intensity=w?1.9:3.25;this.hemisphere.intensity=w?1.2:.88;this.hemisphere.color.set('#b7cce2');this.scene.fog.density=Math.max(.00016,w*.00065);}
 if(this.profile.industrialHaze){this.sun.color.set('#e9eff1');this.sun.intensity=1.55*(1-w*.55);this.hemisphere.intensity=1.65;this.hemisphere.color.set('#c8d3db');this.scene.fog.density=Math.max(.00066,w*.00105);}
 if(this.profile.riviera){this.sun.color.set(w?'#d5e1e8':'#fff8e8');this.sun.intensity=3.7*(1-w*.72);this.hemisphere.intensity=1.03+w*.3;this.hemisphere.color.set('#bddbeb');this.scene.fog.density=Math.max(.00013,w*.0011);}
 if(this.profile.clearHills){this.sun.color.set(w?'#d9e1e6':'#fff7e5');this.sun.intensity=3.35*(1-w*.7);this.hemisphere.intensity=1.04+w*.35;this.hemisphere.color.set('#a6cbea');this.scene.fog.density=Math.max(.00019,w*.0011);}
 this.sun.shadow.radius=this.profile.industrialHaze?4:1;
 const shadowSize=this.profile.goldenHour||this.profile.clearHills||this.profile.ardennes?1536:this.profile.riviera?2048:1024;if(this.sun.shadow.mapSize.x!==shadowSize){this.sun.shadow.map?.dispose();this.sun.shadow.map=null;this.sun.shadow.mapSize.set(shadowSize,shadowSize);}this.sun.shadow.camera.far=this.profile.goldenHour||this.profile.ardennes?500:400;this.sun.shadow.camera.updateProjectionMatrix();
 this.environmentFx?.setConditions(w);this.surfaces.wet(w);
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
 makeCar(driver){const paint=liveryProfile(driver.colorId),car=new THREE.Group();car.rotation.order='YXZ';car.userData.liveryId=normalizeLiveryIndex(driver.colorId);const wing=mat(paint.wing,{roughness:.4}),accent=mat(paint.accent,{roughness:.35}),secondary=mat(paint.secondary,{roughness:.35}),black=mat('#11191f',{roughness:.65}),rubber=mat('#171b20'),silver=mat('#626d70',{metalness:.6});const add=(geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);car.add(o);if(geo.type==='BoxGeometry')o.userData.batchBox=true;return o;};add(new THREE.BoxGeometry(1.8,.1,4.4),black,0,.22,.05);add(new THREE.BoxGeometry(2.05,.13,.55),wing,0,.28,2.4);add(new THREE.BoxGeometry(1.85,.15,.63),wing,0,1.15,-1.8);for(const x of [-.85,.85])add(new THREE.BoxGeometry(.1,.6,.55),black,x,.86,-1.8);const seat=add(new THREE.SphereGeometry(.3,12,8),black,0,.65,-.25);seat.scale.y=.7;const helmet=add(new THREE.SphereGeometry(.23,12,10),mat('#e1e8d9'),0,.95,-.16);const visor=add(new THREE.BoxGeometry(.4,.13,.35),mat('#262a39',{metalness:.65,roughness:.2}),0,.99,.02);visor.userData.batchBox=false;car.userData.driverParts=[helmet,visor];addCarDetail(car,paint);// Separate body panels, pinstripes and lettering make teams identifiable
 // from the chase camera without adding external model or texture downloads.
 const noseStripe=add(new THREE.BoxGeometry(.12,.012,1.25),accent,0,.567,1.73);noseStripe.rotation.x=.13;
 add(new THREE.BoxGeometry(1.87,.025,.12),accent,0,1.237,-1.60);
 add(new THREE.BoxGeometry(1.98,.022,.12),accent,0,.358,2.54);
 for(const x of [-.96,.96]){
  add(new THREE.BoxGeometry(.035,.065,1.86),accent,x,.39,-.4);
  add(new THREE.BoxGeometry(.26,.02,1.28),secondary,x*.82,.645,-.4);
 }
 const decal=document.createElement('canvas');decal.width=512;decal.height=128;const ink=decal.getContext('2d');ink.fillStyle=paint.side;ink.fillRect(0,0,512,128);ink.fillStyle=paint.accent;ink.fillRect(0,100,512,28);ink.fillStyle=paint.secondary;ink.beginPath();ink.moveTo(0,0);ink.lineTo(92,0);ink.lineTo(46,100);ink.lineTo(0,100);ink.fill();ink.fillStyle=paint.ink;ink.font='italic 900 35px Arial';ink.textAlign='center';ink.fillText(paint.label,285,64,410);
 const texture=new THREE.CanvasTexture(decal);texture.colorSpace=THREE.SRGBColorSpace;const lettering=mat('#ffffff',{map:texture,roughness:.4});
 for(const x of [-.97,.97]){const label=add(new THREE.PlaneGeometry(1.75,.25),lettering,x,.52,-.4);label.rotation.y=Math.sign(x)*Math.PI/2;}
 const number=document.createElement('canvas');number.width=128;number.height=128;const ni=number.getContext('2d');ni.fillStyle=paint.nose;ni.fillRect(0,0,128,128);ni.fillStyle=paint.nose==='#f6d321'||paint.nose==='#f2f4f5'||paint.nose==='#f3f4f5'||paint.nose==='#33ed22'?'#11191f':'#ffffff';ni.font='italic 900 90px Arial';ni.textAlign='center';ni.fillText(String(driver.index+1).padStart(2,'0'),64,99);const numberTexture=new THREE.CanvasTexture(number);numberTexture.colorSpace=THREE.SRGBColorSpace;const numberPanel=add(new THREE.PlaneGeometry(.35,.45),mat('#ffffff',{map:numberTexture,roughness:.4}),0,.535,2.16);numberPanel.rotation.x=-Math.PI/2+.13;
 const tyreProfile=[[.25,-.18],[.35,-.18],[.385,-.14],[.395,-.07],[.395,.07],[.385,.14],[.35,.18],[.25,.18]].map(([r,y])=>new THREE.Vector2(r,y));const wheelGeo=new THREE.LatheGeometry(tyreProfile,24),hubGeo=new THREE.CylinderGeometry(.23,.23,.35,16),wheels=[];
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
 car.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});batchBoxes(car,Infinity);batchMapped(car);car.userData.wheels=wheels;this.group.add(car);return car;}
 removeCar(id){const model=this.cars.get(id);if(!model)return;this.group.remove(model);const geometries=new Set(),materials=new Set(),textures=new Set();model.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const material of [].concat(o.material)){materials.add(material);if(material.map)textures.add(material.map);}});for(const geometry of geometries)geometry.dispose();for(const texture of textures)texture.dispose();for(const material of materials)material.dispose();this.cars.delete(id);}
 sync(cars,dt,rolling){const live=new Set(cars.filter(isOnTrack).map(c=>c.id));for(const id of this.cars.keys())if(!live.has(id))this.removeCar(id);for(const c of cars){if(!isOnTrack(c))continue;let model=this.cars.get(c.id);if(model&&model.userData.liveryId!==normalizeLiveryIndex(c.colorId)){this.removeCar(c.id);model=null;}if(!model){model=this.makeCar(c);this.cars.set(c.id,model);model.position.set(c.x,c.y,c.z);model.rotation.y=c.heading;}const blend=c.smoothMotion?1:1-Math.exp(-dt*18);model.position.lerp(new THREE.Vector3(c.x,c.y+.07,c.z),blend);model.rotation.y+=angleDiff(c.heading,model.rotation.y)*blend;model.rotation.x+=(-(c.pitch||0)-model.rotation.x)*blend;if(rolling&&!c.finished)model.userData.wheels.forEach(w=>{w.userData.spin.rotation.x=(w.userData.spin.rotation.x+c.v*dt/.39)%(Math.PI*2);if(w.userData.isFront)w.rotation.y=c.steer*.6;});}}
 frame(cars,player,dt,racing,rolling=false){
 // Sustained slow frames lower resolution before input feels sluggish. Do not
 // count background-tab throttling or loading spikes as graphics pressure.
 if(!document.hidden&&dt>.032&&dt<.095)this.slowFrames++;else this.slowFrames=Math.max(0,this.slowFrames-1);
 if(this.slowFrames>75&&performance.now()-this.qualityAt>5000){const ratio=this.renderer.getPixelRatio();if(ratio>.85)this.renderer.setPixelRatio(Math.max(.85,ratio-.2));else this.renderer.shadowMap.enabled=false;this.slowFrames=0;this.qualityAt=performance.now();}
 this.line.visible=this.showLine&&cars.some(isOnTrack);this.sync(cars,dt,rolling);const c=isOnTrack(player)?player:(cars.find(isOnTrack)||player||cars[0]);if(c){let pos,look;const h=c.heading,pitch=c.pitch||0,v=new THREE.Vector3(Math.sin(h)*Math.cos(pitch),Math.sin(pitch),Math.cos(h)*Math.cos(pitch)),p=new THREE.Vector3(c.x,c.y,c.z);
 if(!racing){pos=p.clone().addScaledVector(v,8).add(new THREE.Vector3(Math.cos(h)*14,6,-Math.sin(h)*14));look=p.clone().addScaledVector(v,-6).add(new THREE.Vector3(0,1,0));this.camera.fov=53;}
 else if(this.mode===1){const model=this.cars.get(c.id);pos=model?model.localToWorld(new THREE.Vector3(0,1.23,-.25)):p.clone().addScaledVector(v,-.25).add(new THREE.Vector3(0,1.3,0));look=model?model.localToWorld(new THREE.Vector3(0,1.15,45)):p.clone().addScaledVector(v,45).add(new THREE.Vector3(0,1.2,0));this.camera.fov=72;}
 else if(this.mode===2){pos=p.clone().addScaledVector(v,-20).add(new THREE.Vector3(0,65,0));look=p.clone().addScaledVector(v,25);this.camera.fov=60;}
 else{pos=p.clone().addScaledVector(v,-10-c.v*.038).add(new THREE.Vector3(0,3.6+c.v*.008,0));look=p.clone().addScaledVector(v,20+c.v*.18).add(new THREE.Vector3(0,1,0));this.camera.fov=60+c.v*.07;}
 const roadCamera=this.track.campus||this.profile.clearHills||this.profile.desertTwilight||this.profile.ardennes||this.profile.riviera?nearest(this.track,pos.x,pos.z,c.s):null;const floor=roadCamera&&roadCamera.distance<this.track.width+4?sample(this.track,roadCamera.s).y+1.2:(this.profile.riviera?monacoTerrainHeight(this.track,pos.x,pos.z):this.profile.ardennes?spaTerrainHeight(this.track,pos.x,pos.z):this.profile.desertTwilight?bahrainTerrainHeight(this.track,pos.x,pos.z):this.profile.clearHills?suzukaTerrainHeight(this.track,pos.x,pos.z):terrainHeight(this.track,pos.x,pos.z))+1.2;if(this.mode!==1)pos.y=Math.max(pos.y,floor);
 const sheltered=campusTunnelAt(this.track,c.s,8);if(racing&&sheltered&&this.mode!==1){if(this.mode===2){pos=p.clone().addScaledVector(v,-7).add(new THREE.Vector3(0,3.2,0));look=p.clone().addScaledVector(v,12).add(new THREE.Vector3(0,1,0));}pos.y=Math.min(pos.y,c.y+4.4);}
 this.weather.rain.visible=this.weather.profile.wetness>0&&!sheltered;
 if(this.profile.riviera)this.sun.position.set(c.x+30,c.y+180,c.z-15);else if(this.profile.ardennes)this.sun.position.set(c.x-180,c.y+70,c.z-85);else if(this.profile.desertTwilight)this.sun.position.set(c.x-180,c.y+55-35*(this.profile.twilight||0),c.z-90);else if(this.profile.goldenHour)this.sun.position.set(c.x-190,c.y+65,c.z-65);else this.sun.position.set(c.x+70,c.y+130,c.z-55);this.sun.target.position.set(c.x,c.y,c.z);this.sun.target.updateMatrixWorld();
 const blend=this.cameraReady?1-Math.exp(-dt*(this.mode===1?30:7)):1;if(racing&&this.mode===1){this.camera.position.copy(pos);this.look.copy(look);}else{this.camera.position.lerp(pos,blend);this.look.lerp(look,blend);}this.camera.lookAt(this.look);this.camera.updateProjectionMatrix();this.cameraReady=true;for(const [id,m]of this.cars){m.visible=true;const cockpitView=racing&&this.mode===1&&id===c.id;for(const part of m.userData.driverParts||[])part.visible=!cockpitView;updateCockpit(m,cars.find(state=>state.id===id)||c,cockpitView);const distance=m.position.distanceTo(this.camera.position);m.traverse(o=>{if(o.isMesh)o.castShadow=distance<55;});for(const w of m.userData.wheels){w.children[0].children[1].visible=distance<90;w.children[0].children[2].visible=distance<45;}}
 }this.updateGuide(c,performance.now());this.weather.frame(cars,c,dt,this.camera);this.environmentFx?.frame(performance.now(),cars);this.renderer.render(this.scene,this.camera);
 }
}
