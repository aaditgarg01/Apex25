import * as THREE from '/vendor/three.module.js';
import {sample} from '/shared/tracks.mjs';
import {trackBarriers} from '/shared/barriers.mjs';
import {trackSign,addBrakingBoards} from './track-furniture.js';
import {footprintClear,placeDecoration,disposeRejectedDecorations} from './jeddah-clearance.js';
import {addVegetation} from './vegetation.js';
import {createVegasLightField} from './vegas-lighting.js';

// Landmark anchors are geographic; dimensions and facades are original,
// simplified reconstructions. No downloaded game models or branded imagery.
const anchors={sphere:[-115.16207,36.12120],bellagio:[-115.17720,36.11295],lake:[-115.17476,36.11286],paris:[-115.17210,36.11243],venetian:[-115.16965,36.12130],caesars:[-115.1761,36.1172],flamingo:[-115.17055,36.1166],wynn:[-115.1658,36.1270]};
const cache=new WeakMap(),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const standard=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.75,...extra});
const glow=(color,extra={})=>new THREE.MeshBasicMaterial({color,toneMapped:false,...extra});
function layout(track){if(!cache.has(track))cache.set(track,{heights:track.points.filter((_,i)=>i%12===0)});return cache.get(track);}
export function vegasTerrainHeight(track,x,z,cell=0){
 let near=layout(track).heights[0],distance=Infinity,floor=Infinity;
 for(const p of layout(track).heights){const d=Math.hypot(p.x-x,p.z-z);if(d<distance){distance=d;near=p;}if(d<track.width/2+cell*1.42+35)floor=Math.min(floor,p.y-.85);}
 return Math.min(near.groundY-1,Number.isFinite(floor)?floor:Infinity);
}
function anchor(track,name){const [lon,lat]=anchors[name];return {x:(lon-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(lat-track.origin.lat)*111320};}
function group(scene,p,heading=0){const g=new THREE.Group();g.position.set(p.x,vegasTerrainHeight(scene.track,p.x,p.z),p.z);g.rotation.y=heading;scene.group.add(g);return g;}
function mesh(parent,geo,mat,x=0,y=0,z=0,fixed=true){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.userData.mappedStatic=fixed;o.castShadow=fixed;o.receiveShadow=true;parent.add(o);return o;}
function box(parent,w,h,d,mat,x=0,y=0,z=0){const o=mesh(parent,new THREE.BoxGeometry(w,h,d),mat,x,y,z);if(mat.isMeshStandardMaterial&&!mat.map&&mat.emissive.getHex()===0){o.userData.batchBox=true;o.userData.mappedStatic=false;}return o;}
function beam(parent,a,b,mat,width=.2){const delta=b.clone().sub(a),p=a.clone().add(b).multiplyScalar(.5),m=box(parent,width,delta.length(),width,mat,p.x,p.y,p.z);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
function canvasTexture(draw,w=256,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function facade(color,seed){const map=canvasTexture((c,w,h)=>{c.fillStyle='#17212a';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=16)for(let x=0;x<w;x+=16){c.fillStyle=(x*17+y*31+seed*79)%101>25?['#d4be88','#efdaab','#8aa9b8'][((x+y)/16+seed)%3]:'#253039';c.fillRect(x+3,y+3,9,10);}},256);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(5,8);return standard(color,{map,emissive:'#fff0c2',emissiveMap:map,emissiveIntensity:.7,roughness:.35,metalness:.3});}
function label(g,text,width,y,z,color='#edcb83',background='#152333'){const sign=trackSign(text,width,Math.max(1.3,width*.07),background,color);sign.position.set(0,y,z);g.add(sign);const back=sign.clone();back.rotation.y=Math.PI;back.position.z=-z;g.add(back);return sign;}
function safe(scene,track,g,name,options={}){
 g.userData.vegasDecoration=name;const ok=placeDecoration(scene,track,g,(x,z)=>vegasTerrainHeight(track,x,z),{margin:4,...options});if(ok){g.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(g);(scene.group.userData.vegasSites??=[]).push({name,x:g.position.x,z:g.position.z,heading:g.rotation.y,bounds:bounds.toArray?bounds.toArray():{min:bounds.min.toArray(),max:bounds.max.toArray()},relocated:!!g.userData.sceneryRelocated});}return ok;
}
function resort(scene,track,name,config){
 const p=anchor(track,name),g=group(scene,p,config.heading||0),stone=standard(config.color),windows=facade(config.color,config.seed),gold=glow(config.neon),{w,h,d}=config;
 for(const side of [-1,1]){const wing=new THREE.Group();wing.position.set(side*w*.24,0,0);wing.rotation.y=side*.14;g.add(wing);box(wing,w*.53,h,d,windows,0,h/2,0);box(wing,w*.54,1.5,d+1,gold,0,h-2,0);for(const z of [-d/2-.3,d/2+.3])for(let x=-w*.25;x<w*.26;x+=10)box(wing,.55,h,1.0,stone,x,h/2,z);}
 box(g,w*1.15,12,d*1.8,stone,0,6,0);box(g,w*1.16,.35,d*1.82,gold,0,12.2,0);label(g,config.title,w*.7,h+3,d*.51,config.neon);
 if(name==='caesars'||name==='venetian'){for(let x=-w*.5;x<=w*.5;x+=9){mesh(g,new THREE.CylinderGeometry(.7,.85,12,10),stone,x,6,d*.95);box(g,2,.6,2,stone,x,12,d*.95);}const pediment=mesh(g,new THREE.ConeGeometry(w*.58,12,3),stone,0,18,d*.94);pediment.rotation.y=Math.PI/2;pediment.scale.z=.14;}
 if(name==='venetian'){box(g,13,76,13,stone,-w*.35,38,d*1.12);box(g,16,5,16,gold,-w*.35,76,d*1.12);mesh(g,new THREE.ConeGeometry(10,17,4),standard('#619f8b'),-w*.35,87,d*1.12).rotation.y=Math.PI/4;}
 safe(scene,track,g,config.title);return g;
}
function sphere(scene,track){
 const p=anchor(track,'sphere'),g=group(scene,p),radius=78.6,centerY=33.0,theta=Math.acos(-centerY/radius),uniforms={time:{value:0}},mat=new THREE.ShaderMaterial({uniforms,vertexShader:'varying vec2 screenUV; void main(){screenUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec2 screenUV; uniform float time;
 void main(){vec2 uv=screenUV;float wave=sin(uv.x*24.0+sin(uv.y*15.0-time*.21)*2.8+time*.18);vec3 pink=vec3(1.0,.025,.26),blue=vec3(.035,.23,1.0),gold=vec3(1.0,.55,.065);vec3 c=mix(pink,blue,.5+.5*wave);c=mix(c,gold,pow(.5+.5*sin(uv.y*21.0-time*.24),7.0)*.72);float led=.73+.27*smoothstep(.1,.35,fract(uv.x*720.0))*smoothstep(.1,.3,fract(uv.y*360.0));gl_FragColor=vec4(c*led,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 // A cropped spherical shell reproduces the real 112 m height / 157 m diameter.
 const shell=mesh(g,new THREE.SphereGeometry(radius,96,56,0,Math.PI*2,0,theta),mat,0,centerY,0,false);shell.castShadow=false;box(g,100,7,58,standard('#252935'),0,3,-10);label(g,'SPHERE',42,8,48,'#d5eaff');safe(scene,track,g,'Sphere');return mat;
}
function eiffel(scene,track){
 const g=group(scene,anchor(track,'paris'),-.04),metal=standard('#aa8252',{metalness:.6,roughness:.35,emissive:'#d89b36',emissiveIntensity:.42}),led=glow('#ffd18b');
 const levels=[[0,29],[43,13],[65,8],[105,4.2],[140,.8]];
 for(let k=0;k<levels.length-1;k++){const [y0,r0]=levels[k],[y1,r1]=levels[k+1];for(const sx of [-1,1])for(const sz of [-1,1])beam(g,new THREE.Vector3(sx*r0,y0,sz*r0),new THREE.Vector3(sx*r1,y1,sz*r1),metal,k?1.0:2.0);for(const side of [-1,1])for(const axis of [0,1])for(let j=0;j<5;j++){const t=j/5,t1=(j+1)/5,ya=y0+(y1-y0)*t,yb=y0+(y1-y0)*t1,ra=r0+(r1-r0)*t,rb=r0+(r1-r0)*t1;const a=axis?new THREE.Vector3(side*ra,ya,-ra):new THREE.Vector3(-ra,ya,side*ra),b=axis?new THREE.Vector3(side*rb,yb,rb):new THREE.Vector3(rb,yb,side*rb);beam(g,a,b,metal,.23);const c=axis?new THREE.Vector3(side*ra,ya,ra):new THREE.Vector3(ra,ya,side*ra),d=axis?new THREE.Vector3(side*rb,yb,-rb):new THREE.Vector3(-rb,yb,side*rb);beam(g,c,d,metal,.23);}}
 for(const [y,r] of levels.slice(1)){box(g,r*2+5,2,r*2+5,metal,0,y,0);for(const z of [-r-2.5,r+2.5])box(g,r*2+5,.13,.14,led,0,y+1.1,z);}
 mesh(g,new THREE.CylinderGeometry(.15,.6,13,8),led,0,147,0);label(g,'PARIS LAS VEGAS',40,19,31,'#ffd49a');safe(scene,track,g,'Paris Eiffel Tower');
 const hotel=group(scene,{x:g.position.x+120,z:g.position.z-60}),stone=facade('#c9b99d',10);box(hotel,95,90,100,stone,0,45,0);for(const x of [-45,45])mesh(hotel,new THREE.ConeGeometry(12,24,4),standard('#345375'),x,102,42).rotation.y=Math.PI/4;safe(scene,track,hotel,'Paris hotel');
}
function fountains(scene,track){
 const g=group(scene,anchor(track,'lake'));
 const basin=mesh(g,new THREE.CircleGeometry(1,96),standard('#133d55',{metalness:.55,roughness:.18,emissive:'#134b70',emissiveIntensity:.42}),0,.08,0);basin.rotation.x=-Math.PI/2;basin.scale.set(83,166,1);basin.castShadow=false;
 const edge=mesh(g,new THREE.TorusGeometry(1,.012,6,96),standard('#b7b6ab'),0,.08,0);edge.rotation.x=-Math.PI/2;edge.scale.set(84,167,1);
 const n=117,jets=new THREE.InstancedMesh(new THREE.CylinderGeometry(.15,.43,1,5),glow('#cceeff',{transparent:true,opacity:.65,depthWrite:false}),n);jets.userData.mappedStatic=false;jets.frustumCulled=false;g.add(jets);const dummy=new THREE.Object3D();
 const update=t=>{for(let i=0;i<n;i++){const a=(i/(n-1)-.5)*Math.PI*1.35,h=3+Math.pow(.5+.5*Math.sin(t*.85+i*.19),3)*18;dummy.position.set(Math.cos(a)*49-12,h/2+.1,Math.sin(a)*130);dummy.scale.set(1,h,1);dummy.updateMatrix();jets.setMatrixAt(i,dummy.matrix);}jets.instanceMatrix.needsUpdate=true;};update(0);
 safe(scene,track,g,'Bellagio lake and fountains');return update;
}
function crowds(parent,w,rows,side,phones){
 const points=[],dummy=new THREE.Object3D(),count=Math.floor(w/1.05)*rows,body=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.16,.30,2,4),standard('#ffffff'),count),head=new THREE.InstancedMesh(new THREE.SphereGeometry(.12,5,4),standard('#d4af92'),count);let n=0;
 for(let row=0;row<rows;row++)for(let col=0;col<Math.floor(w/1.05);col++){const x=side*row*.9,y=row*.59+.85,z=-w/2+col*1.05;dummy.position.set(x,y,z);dummy.updateMatrix();body.setMatrixAt(n,dummy.matrix);body.setColorAt(n,new THREE.Color(['#ddd9c3','#bc3c36','#2e709f','#b8a144','#c14a86'][n%5]));dummy.position.y+=.42;dummy.updateMatrix();head.setMatrixAt(n,dummy.matrix);if(n%4===0)points.push(x+.24,y+.35+(n%3)*.1,z);n++;}
 for(const m of [body,head]){m.computeBoundingSphere();parent.add(m);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));const p=new THREE.Points(geo,new THREE.PointsMaterial({color:'#ccefff',size:.16,toneMapped:false,transparent:true,opacity:.8}));parent.add(p);phones.push(p);
 // Slim emissive sticks stand out among phone lights without per-spectator lights.
 const sticks=[glow('#ef52a8'),glow('#4ad8ff')];for(let i=0;i<20;i++)box(parent,.035,.65,.035,sticks[i%2],side*(i%rows)*.9,(i%rows)*.59+1.3,-w*.43+i*w*.043);
}
function stands(scene,track,phones){
 for(const [s,side,w,rows,title] of [[125,1,150,18,'EAST HARMON'],[1760,-1,100,17,'T-MOBILE ZONE AT SPHERE'],[2230,1,115,18,'SPHERE GRANDSTAND'],[4650,1,100,12,'BELLAGIO FOUNTAIN CLUB'],[5400,-1,105,16,'WEST HARMON']]){
  const p=sample(track,s,side*(track.width/2+15)),g=group(scene,p,p.heading),steel=standard('#52616b');for(let row=0;row<rows;row++)box(g,.9,.22,w,steel,side*row*.9,row*.59,0);for(let z=-w/2;z<=w/2;z+=9){beam(g,new THREE.Vector3(0,0,z),new THREE.Vector3(side*rows*.9,rows*.59,z),steel,.13);for(const r of [0,rows])box(g,.12,rows*.59,.12,steel,side*r*.9,rows*.295,z);}
  crowds(g,w,rows,side,phones);const board=trackSign(title,Math.min(w*.6,65),2,'#152333','#edcc91');board.rotation.y=-side*Math.PI/2;board.position.set(-side*.3,2,0);g.add(board);if(title.includes('CLUB')){box(g,rows*.95,4,w,facade('#86a7b4',32),side*rows*.45,rows*.59+3,0);box(g,rows+5,.3,w+6,standard('#e5dfd3'),side*rows*.45,rows*.59+5.2,0);}safe(scene,track,g,title,{s,side});
 }
}
function planting(scene,track){const sites=[];for(let s=30;s<track.length;s+=41)for(const side of [-1,1]){const p=sample(track,s,side*(track.width/2+17)),bounds=new THREE.Box3(new THREE.Vector3(-6,0,-6),new THREE.Vector3(6,14,6));if(!footprintClear(track,p,0,bounds,5))continue;const point={...p,y:vegasTerrainHeight(track,p.x,p.z),scale:1.1+(s%7)*.035,angle:s*.17};
 // Avoid landmark footprints as well as every branch of the race course.
 if((scene.group.userData.vegasSites||[]).some(site=>{const b=site.bounds;return point.x>b.min[0]-7&&point.x<b.max[0]+7&&point.z>b.min[2]-7&&point.z<b.max[2]+7;}))continue;sites.push(point);}
 addVegetation(scene,track,scene.profile,{palms:true,sites});const hedges=standard('#27442b');for(const p of sites.filter((_,i)=>i%2===0)){const g=group(scene,p,p.heading);box(g,2,1.1,6,hedges,0,.55,0);}
}
function infrastructure(scene,track,panels){
 const steel=standard('#59636c',{metalness:.6}),white=glow('#eff9ff'),ledPink=glow('#ed38b7'),ledBlue=glow('#4dcaff'),heads=[];
 for(let s=0;s<track.length;s+=28)for(const side of [-1,1]){const p=sample(track,s,side*(track.width/2+8.4)),bounds=new THREE.Box3(new THREE.Vector3(-.3,0,-.3),new THREE.Vector3(.3,17,.3));if(!footprintClear(track,p,0,bounds,2))continue;if((scene.group.userData.vegasSites||[]).some(site=>{const b=site.bounds;return p.x>b.min[0]-5&&p.x<b.max[0]+5&&p.z>b.min[2]-5&&p.z<b.max[2]+5;}))continue;const g=group(scene,p,p.heading),h=16;box(g,.20,h,.20,steel,0,h/2,0);box(g,5,.17,.25,steel,-side*2.4,h,0);box(g,2,.22,1.1,steel,-side*4.0,h-.1,0);const lamp=mesh(g,new THREE.PlaneGeometry(1.8,.9),white,-side*4,h-.23,0);lamp.rotation.x=Math.PI/2;lamp.material.side=THREE.DoubleSide;lamp.castShadow=false;heads.push(g);}
 const brands=[['HEINEKEN SILVER','#8eaaa5','#f2f4ef'],['ROLEX','#07513c','#e0be6e'],['PIRELLI','#e8c72a','#b02b2a']],materials=brands.map(([t,b,c])=>trackSign(t,5,.78,b,c).material),walls=trackBarriers(track).walls.filter(w=>w.kind==='track');
 for(let i=0;i<walls.length;i+=3){const w=walls[i],n=w.inward;if(!n)continue;const m=mesh(scene.group,new THREE.PlaneGeometry(w.length,.72),materials[Math.floor(i/160)%3],w.x+n.x*(w.width/2+.02),(w.a.y+w.b.y)/2+.62,w.z+n.z*(w.width/2+.02));m.rotation.y=Math.atan2(n.x,n.z);m.castShadow=false;}
 // Energy-absorbing cladding follows solid collision walls, never across the road.
 const scuff=canvasTexture(c=>{c.fillStyle='#e3e4df';c.fillRect(0,0,256,256);c.fillStyle='#ad3938';c.fillRect(0,0,90,256);c.strokeStyle='#3b3d3d';for(let i=0;i<18;i++){c.beginPath();c.moveTo((i*37)%240,110+i*5);c.lineTo((i*37)%240+18,105+i*5);c.stroke();}}),tecpro=standard('#ffffff',{map:scuff});
 for(let i=0;i<walls.length;i+=2){const w=walls[i],s=Math.floor(i/2)*track.step;if(!([120,1430,2330,5050,5920].some(c=>Math.abs(s-c)<37)))continue;const block=box(scene.group,w.width+.025,1.05,w.length,tecpro,w.x,(w.a.y+w.b.y)/2+.52,w.z);block.rotation.y=Math.atan2(w.tx,w.tz);}
 for(const s of [45,2670,4100,5550]){const p=sample(track,s),span=track.width/2+8.5,g=group(scene,p,p.heading),post=new THREE.Box3(new THREE.Vector3(-.5,0,-1),new THREE.Vector3(.5,11,1));if([-span,span].some(x=>!footprintClear(track,{x:p.x+Math.cos(p.heading)*x,z:p.z-Math.sin(p.heading)*x},0,post,2))){g.removeFromParent();continue;}for(const x of [-span,span])box(g,.5,10,.5,steel,x,5,0);box(g,span*2+1,1.7,2,standard('#14202b'),0,9.3,0);for(const z of [-1.03,1.03])box(g,span*2+1,.13,.08,s<50?ledPink:ledBlue,0,10.2,z);label(g,s<50?'LAS VEGAS • GRAND PRIX':s===4100?'HEINEKEN SILVER':'LAS VEGAS STRIP',span*1.8,9.3,1.06,'#f1efff');}
 for(let i=0;i<19;i++){const s=(i+.4)/19*track.length,side=i%2?1:-1,p=sample(track,s,side*(track.width/2+11)),g=group(scene,p,p.heading);box(g,3,1.2,2,standard('#929895'),0,.6,0);for(const x of [-.6,.6]){box(g,.32,.7,.25,standard('#ec772f'),x,1.1,0);mesh(g,new THREE.SphereGeometry(.16,7,5),standard('#f2eee0'),x,1.63,0);}box(g,.1,3.2,.1,steel,1.6,1.6,0);const panel=mesh(g,new THREE.BoxGeometry(.8,.6,.1),glow('#2ee79f'),1.6,2.9,0,false);if(safe(scene,track,g,'Marshal station',{s,side})){const v=panel.getWorldPosition(new THREE.Vector3());panels.push({mesh:panel,x:v.x,z:v.z});}}
 for(const s of [960,2470,4810]){const p=sample(track,s,track.width/2+28),g=group(scene,p,p.heading);box(g,3.4,1.6,6,standard('#b2aa8f'),0,.8,0);beam(g,new THREE.Vector3(0,2,0),new THREE.Vector3(0,21,-8),steel,.35);box(g,1,.8,1.1,standard('#242c31'),0,21,-8);safe(scene,track,g,'Broadcast crane',{s,side:1});}
 for(const s of [610,3300]){const p=sample(track,s,-track.width/2-25),g=group(scene,p,p.heading);box(g,2,1.1,4.9,standard('#d7dcda'),0,.85,0);box(g,1.8,.8,2.5,standard('#314959',{metalness:.6,roughness:.2}),0,1.65,-.2);box(g,1.3,.1,.3,glow('#e8513d'),0,2.1,0);for(const x of [-1,1])for(const z of [-1.5,1.5])mesh(g,new THREE.CylinderGeometry(.39,.39,.24,10),standard('#141a1e'),x,.45,z).rotation.z=Math.PI/2;safe(scene,track,g,'Medical vehicle service slip',{s,side:-1});}
 addBrakingBoards(scene,track);return heads;
}
function paddock(scene,track){const p=sample(track,track.length-85,-(track.width/2+42)),g=group(scene,p,p.heading),wall=standard('#9ba7af'),glass=facade('#7892a6',25);box(g,35,13,255,wall,0,6.5,0);box(g,35.3,4,255.3,glass,0,11,0);box(g,38,.5,259,standard('#c0c7c9'),0,13.4,0);for(let z=-118;z<125;z+=8){box(g,.12,4.2,6.5,standard('#3a4853'),18,2.3,z);box(g,.15,.3,6.5,glow(z%3?'#45caff':'#fa45ab'),18.1,4.6,z);}const sign=trackSign('LAS VEGAS GRAND PRIX • PADDOCK',190,2.6,'#14212e','#e6e4f5');sign.rotation.y=Math.PI/2;sign.position.set(18.2,10.8,0);g.add(sign);safe(scene,track,g,'Grand Prix Plaza paddock',{s:track.length-85,side:-1});}
function stage(scene,track){const p=sample(track,900,track.width/2+130),g=group(scene,p,p.heading),metal=standard('#28333e');box(g,28,1.3,19,metal,0,.65,0);for(const x of [-14,14])box(g,.45,13,.45,metal,x,6.5,0);box(g,29,.7,20,metal,0,13,0);const sign=label(g,'LAS VEGAS LIVE',23,7,-8,'#60d9ff','#271842');for(let i=-4;i<=4;i++)box(g,.35,7+(i%3),.4,glow(i%2?'#eb40b6':'#42bbff'),i*2.3,5,-8.1);sign.renderOrder=1;safe(scene,track,g,'Infield entertainment stage',{s:900,side:1});}

function pedestrianBridges(scene,track){
 const metal=standard('#758592',{metalness:.62,roughness:.35}),glass=standard('#526f86',{metalness:.5,roughness:.25,emissive:'#83afcc',emissiveIntensity:.3});
 for(const s of [3620,4750]){const p=sample(track,s),span=track.width/2+12,g=group(scene,p,p.heading),bounds=new THREE.Box3(new THREE.Vector3(-1.1,0,-3),new THREE.Vector3(1.1,15,3));
  if([-span,span].some(x=>!footprintClear(track,{x:p.x+Math.cos(p.heading)*x,z:p.z-Math.sin(p.heading)*x},0,bounds,2))){g.removeFromParent();continue;}
  for(const x of [-span,span]){box(g,1.2,9,1.7,metal,x,4.5,0);for(const z of [-2.5,2.5])box(g,.14,3.8,.14,metal,x,10,z);}
  box(g,span*2+5,.8,6.2,metal,0,8.5,0);for(const z of [-3,3])box(g,span*2+5,3.4,.16,glass,0,10.5,z);box(g,span*2+6,.35,6.6,metal,0,12.4,0);for(let x=-span;x<span;x+=4)for(const z of [-3.1,3.1])box(g,.1,3.7,.15,metal,x,10.5,z);label(g,'LAS VEGAS',span*1.4,10.5,3.18,'#6cd9ff');
 }
}

function brakeHaze(scene){
 const count=96,positions=new Float32Array(count*3),alpha=new Float32Array(count),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('alpha',new THREE.BufferAttribute(alpha,1));
 const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:'attribute float alpha; varying float fade; void main(){fade=alpha;vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(260.0/max(1.0,-p.z),1.0,24.0);}',fragmentShader:'varying float fade; void main(){float r=length(gl_PointCoord-.5)*2.0;gl_FragColor=vec4(.7,.79,.84,fade*(1.0-smoothstep(.12,1.0,r)));}'}),points=new THREE.Points(geo,mat);points.frustumCulled=false;scene.group.add(points);const particles=Array.from({length:count},()=>({life:0})),previous=new Map();let cursor=0,last=0,spawnAt=0,wetness=0;
 return {setConditions(w){wetness=w;},frame(now,cars){const dt=Math.min(.06,Math.max(0,(now-last)*.001));last=now;const active=new Set();for(const c of cars){active.add(c.id);const old=previous.get(c.id),decel=old&&now>old.time?(old.v-c.v)/((now-old.time)*.001):0;previous.set(c.id,{v:c.v,time:now});if(!c.finished&&!c.retired&&c.v>30&&decel>8&&wetness<.5&&((c.s>70&&c.s<240)||(c.s>4860&&c.s<5240))&&now-spawnAt>45){spawnAt=now;for(const side of [-1,1]){const p=particles[cursor++%count];Object.assign(p,{x:c.x+Math.cos(c.heading)*side-c.v*dt*Math.sin(c.heading),y:c.y+.55,z:c.z-Math.sin(c.heading)*side-c.v*dt*Math.cos(c.heading),life:.65,side});}}}for(const id of previous.keys())if(!active.has(id))previous.delete(id);for(let i=0;i<count;i++){const p=particles[i];p.life=Math.max(0,p.life-dt);if(p.life){p.y+=dt*.45;p.x+=p.side*dt*.22;}positions[i*3]=p.x||0;positions[i*3+1]=p.y||0;positions[i*3+2]=p.z||0;alpha[i]=p.life*.16;}geo.attributes.position.needsUpdate=true;geo.attributes.alpha.needsUpdate=true;}};
}
export function addLasVegas(scene,track){
 const sphereMat=sphere(scene,track);resort(scene,track,'bellagio',{title:'BELLAGIO',w:190,h:110,d:48,color:'#cbb992',neon:'#efd597',seed:2});resort(scene,track,'caesars',{title:'CAESARS PALACE',w:220,h:125,d:48,color:'#d1c4a6',neon:'#efbb68',seed:3});resort(scene,track,'venetian',{title:'THE VENETIAN',w:150,h:145,d:60,color:'#bda37e',neon:'#edc580',seed:4});resort(scene,track,'flamingo',{title:'FLAMINGO',w:120,h:86,d:46,color:'#bdb7b5',neon:'#ff41bd',seed:5});resort(scene,track,'wynn',{title:'WYNN',w:230,h:180,d:46,color:'#80694d',neon:'#f0b568',seed:6});eiffel(scene,track);const fountain=fountains(scene,track),phones=[],panels=[];stands(scene,track,phones);paddock(scene,track);stage(scene,track);planting(scene,track);infrastructure(scene,track,panels);pedestrianBridges(scene,track);const field=createVegasLightField(scene,track),haze=brakeHaze(scene);let panelAt=-Infinity;
 scene.environmentFx={setConditions(w){field.apply(scene.group);haze.setConditions(w);},frame(now,cars=[]){const t=now*.001;sphereMat.uniforms.time.value=t;fountain(t);field.frame();haze.frame(now,cars);for(let i=0;i<phones.length;i++)phones[i].material.opacity=.75+Math.sin(t*.8+i)*.16;if(now-panelAt>180){panelAt=now;for(const p of panels){const danger=cars.some(c=>!c.finished&&!c.retired&&Math.hypot(c.x-p.x,c.z-p.z)<100&&(c.offtrack||c.sliding));p.mesh.material.color.set(danger?'#ffd530':'#2ee79f');}}},dispose(){field.dispose();disposeRejectedDecorations(scene.group);}};return scene.profile;
}
