import * as THREE from '/vendor/three.module.js';
import {sample} from '/shared/tracks.mjs';
import {paulRicardGround, paulRicardRoads, paulRicardRoadClear, paulRicardRunoff} from '/shared/paulricard.mjs';
import {PAUL_RICARD_CORNERS, PAUL_RICARD_SECTORS, PAUL_RICARD_DETECTION} from './data/paulricard-runoff.js';
import {planPaulRicard} from './paulricard-placement.js';
import {addPermanentVenue} from './permanent-venue.js';
import {trackSign} from './track-furniture.js';

function paintFlag(ink) {
  ['#254579','#f3f1e6','#cf3d4f'].forEach((color, index) => {
    ink.fillStyle = color;
    ink.fillRect(index*64,0,64,120);
  });
}

function dressArchitecture(scene, site, group) {
  const {w,d,kind,side,groundY,y} = site, front = -side || 1;
  if (kind==='rock') return true;
  const box = (width,height,depth,color,x,yy,z) => scene.box(width,height,depth,color,x,yy,z,group);
  function placard(label, width, x, yy, z, heading) {
    const sign = trackSign(label,width,.86,'#233f59','#f4ebd7');
    sign.position.set(x,yy,z);
    sign.rotation.y=heading;
    sign.userData.mappedStatic=true;
    group.add(sign);
  }
  if (['pit','control','hall','hangar','terminal','stand','fan','village','utility'].includes(kind)) {
    const h = y-groundY;
    box(w-.22,h,d-.22,'#ac9e84',0,-h/2,0);
  }
  if (kind==='pit') {
    const face=front*(w/2-.85), bays=Math.floor((d-4)/5.5);
    box(w-1.9,4.2,d-1.5,'#dcd9cb',0,2.1,0);
    box(w-2.5,4.4,d-1.1,'#efebdc',-.3*front,6.35,0);
    box(.32,2.10,d-3.3,'#5c7886',face,6.15,0);
    box(w-.26,.51,d-.27,'#f4f1e5',0,8.69,0);
    box(w-.47,.24,d-.70,'#2e5a7f',0,8.98,0);
    for(let i=0;i<bays;i++){
      const z=(i+.5-bays/2)*(d-3)/bays;
      box(.20,3.1,4.27,'#404c53',face,1.71,z);
      box(.25,.32,4.26,i%3===0?'#b83c4a':'#637b90',face,3.52,z);
      box(.32,2.16,.20,'#ece8dc',face,6.15,z);
    }
    box(w*.48,.28,8,'#c9c1ad',front*w*.19,4.33,-d*.28);
    placard('PODIUM',6.2,face+front*.18,4.89,-d*.28,front*Math.PI/2);
    placard('GARAGES',13.4,face+front*.18,5.2,d*.19,front*Math.PI/2);
    return true;
  }
  if (kind==='hall'||kind==='hangar'||kind==='terminal'||kind==='control') {
    const h=kind==='terminal'?6.2:kind==='hangar'?5.8:kind==='control'?9.5:6.8;
    box(w-1,h,d-1,'#ddd9cd',0,h/2,0);
    box(w-.35,.41,d-.35,kind==='hangar'?'#acb5b9':'#ece9da',0,h+.14,0);
    if (kind==='hangar') {
      box(w-1.3,3.95,.24,'#6b7780',0,2.04,d/2-.37);
      box(w-1.7,.24,.24,'#a3a8a3',0,3.68,d/2-.30);
    } else {
      box(.24,2,d-2.5,'#557786',front*(w/2-.42),h-1.8,0);
      const modules=Math.max(2,Math.ceil(d/6));
      for(let i=0;i<modules;i++)box(.32,2.05,.25,'#e7e5db',front*(w/2-.41),h-1.8,(i+.5-modules/2)*(d-2)/modules);
      placard(kind==='terminal'?'AIRFIELD':site.label,Math.min(15,d-1.8),front*(w/2-.24),2.4,0,front*Math.PI/2);
    }
    if(kind==='terminal'||kind==='control'){
      const tw=Math.min(5.7,w-1.25);
      box(tw,3.0,6.6,'#d5d2c4',0,h+1.5,-d*.23);
      box(tw+.38,1.9,7.1,'#425f73',0,h+3.9,-d*.23);
      box(tw+.58,.36,7.5,'#f1eee0',0,h+5,-d*.23);
      box(.09,3.8,.09,'#a2a5a6',0,h+6.9,-d*.23);
    }
    return true;
  }
  if (kind==='village') {
    const h=site.height;
    box(w-2.1,h,d-2.3,['#ded0b0','#c8ab88','#c8b199','#e1c6a5'][site.variant],0,h/2,0);
    for(const sideRoof of [-1,1]){
      const roof=box(w*.49,.33,d-1.6,'#a66c55',sideRoof*w*.22,h+.58,0);
      roof.rotation.z=-sideRoof*.26;
    }
    if(site.variant===0)box(2.5,h+3.9,2.7,'#b9a389',2,(h+3.9)/2,1);
    return true;
  }
  if(kind!=='utility') return false;
  box(.16,3.3,.16,'#6c736a',-1,1.65,1.12);
  box(.89,.22,.26,'#8b8a74',-.76,3.3,1.12);
  box(1.33,.20,.6,'#b3a48b',0,.09,-1.75);
  box(.52,.68,.48,'#9b4335',.9,.33,1.30);
  box(.40,.13,1.50,'#9d8265',.8,.48,-.39);
  box(.6,.11,.73,'#676862',-.75,.09,-1.65);
  for(let i=0;i<5;i++)box(.52,.022,.037,'#b4ac9b',-.75,.156,-1.91+i*.115);
  return true;
}

function addSurfaceDetails(track, batch) {
  const scuffs=[], runoffScuffs=[], puddles=[];
  for(const corner of PAUL_RICARD_CORNERS) {
    for(let i=0;i<9;i++){
      const p=sample(track,corner.station-6-i*3.9,corner.side*(track.width/2-1.05-i%3*.37));
      scuffs.push({...p,y:p.y+.075,w:.13+(i%2)*.16,d:1.5+(i%4)*.7,tint:i%6?'#333638':'#b0a183'});
    }
  }
  for(const row of paulRicardRunoff(track).bands){
    if(row.kind!=='blue'||row.i%13!==0||row.offsets[3]-row.offsets[0]<1.4)continue;
    const [a,b,c,d]=row.polygon;
    const at=(u,v)=>Object.fromEntries(['x','y','z'].map(axis=>[axis,
      (a[axis]*(1-u)+d[axis]*u)*(1-v)+(b[axis]*(1-u)+c[axis]*u)*v]));
    const p=at(.38,.5), back=at(.38,.1), front=at(.38,.9);
    const heading=Math.atan2(front.x-back.x,front.z-back.z);
    const pitch=Math.atan2(front.y-back.y,Math.hypot(front.x-back.x,front.z-back.z));
    runoffScuffs.push({...p,heading,pitch,y:p.y+.013,w:.18,d:1.5,tint:'#222527'});
    if(row.i%39===0)puddles.push({...p,heading,pitch,y:p.y+.018,w:.95,d:1.8,tint:'#8295aa'});
  }
  const stamp=(rows,opacity)=>{
    const material=new THREE.MeshStandardMaterial({color:'#ffffff',transparent:true,opacity,depthWrite:false,
      roughness:.76,polygonOffset:true,polygonOffsetFactor:-1});
    batch(new THREE.PlaneGeometry(1,1),material,rows,(p,o)=>{
      o.rotation.set(-Math.PI/2-p.pitch,p.heading,0,'YXZ');
      o.scale.set(p.w,p.d,1);
    });
    return material;
  };
  stamp(scuffs,.48);
  stamp(runoffScuffs,.44);
  return stamp(puddles,0);
}

function addHeatShimmer(scene, track) {
  const uniforms={time:{value:0},strength:{value:1}};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:'varying vec2 uvAt; void main(){uvAt=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float time;uniform float strength;varying vec2 uvAt;void main(){float w=sin(uvAt.x*77.+sin(uvAt.y*19.-time)*2.5+time*1.9);float e=sin(uvAt.x*3.14159)*sin(uvAt.y*3.14159);gl_FragColor=vec4(.75,.78,.77,max(0.,w)*e*.028*strength);}'});
  const geometry=new THREE.PlaneGeometry(track.width-.6,1.45);
  for(const s of [2300,3260]) {
    const p=sample(track,s), shimmer=new THREE.Mesh(geometry,material);
    shimmer.position.set(p.x,p.y+.87,p.z);
    shimmer.rotation.y=p.heading;
    scene.group.add(shimmer);
  }
  return uniforms;
}

export function addPaulRicard(scene,track) {
  const plan=planPaulRicard(track);
  const {batch}=addPermanentVenue(scene,track,{
    prefix:'ricard',plan,ground:paulRicardGround,roads:paulRicardRoads,roadClear:paulRicardRoadClear,
    runoff:paulRicardRunoff,sectors:PAUL_RICARD_SECTORS,detection:PAUL_RICARD_DETECTION,title:'LE CASTELLET',
    wallTitle:'PROVENCE',crowdColors:['#ded7c6','#274979','#a94042','#3e6061','#ce824e','#dadba0','#394352'],
    crowdLimit:8500,paintFlag,drawLandmark:dressArchitecture
  });
  batch(new THREE.IcosahedronGeometry(1.38,0),new THREE.MeshStandardMaterial({color:'#c4b49a',roughness:1}),
    plan.sites.filter(site=>site.kind==='rock'),(p,o)=>{o.position.y+=.33;o.scale.set(1,.6,.85);});
  const venue=scene.environmentFx,puddles=addSurfaceDetails(track,batch), shimmer=addHeatShimmer(scene,track);
  let lastFrame=-Infinity;
  scene.environmentFx={
    setConditions(wet){venue.setConditions(wet);puddles.opacity=wet*wet*.35;shimmer.strength.value=1-wet;},
    frame(time,cars){venue.frame(time,cars);if(time-lastFrame>=65){shimmer.time.value=time*.001;lastFrame=time;}},
    dispose(){venue.dispose();}
  };
}
