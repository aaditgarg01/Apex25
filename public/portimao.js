import * as THREE from '/vendor/three.module.js';
import {sample} from '/shared/tracks.mjs';
import {portimaoGround, portimaoRoads, portimaoRoadClear, portimaoRunoff, PORTIMAO_TERRAIN_MARGIN, PORTIMAO_TERRAIN_CELL} from '/shared/portimao.mjs';
import {PORTIMAO_CORNERS, PORTIMAO_SECTORS, PORTIMAO_DETECTION} from './data/portimao-runoff.js';
import {planPortimao} from './portimao-placement.js';
import {addPermanentVenue} from './permanent-venue.js';
import {trackSign} from './track-furniture.js';

function paintFlag(ink) {
  ink.fillStyle='#207449';ink.fillRect(0,0,77,120);
  ink.fillStyle='#c93438';ink.fillRect(77,0,115,120);
  ink.fillStyle='#e9be4f';ink.beginPath();ink.arc(77,60,19,0,Math.PI*2);ink.fill();
  ink.fillStyle='#fff3dc';ink.fillRect(69,49,16,21);
  ink.fillStyle='#395a8c';for(const [x,y] of [[73,53],[80,53],[76,58],[73,64],[80,64]])ink.fillRect(x,y,3,3);
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
  if (['pit','control','hall','tower','stand','fan','village','utility'].includes(kind)) {
    const h = y-groundY;
    box(w-.22,h,d-.22,'#ac9e84',0,-h/2,0);
  }
  if (kind==='pit') {
    const face=front*(w/2-.85), bays=Math.floor((d-4)/5.5);
    box(w-1.9,4.2,d-1.5,'#dcd9cb',0,2.1,0);
    box(w-2.5,4.4,d-1.1,'#efebdc',-.3*front,6.35,0);
    box(.32,2.10,d-3.3,'#5c7886',face,6.15,0);
    box(w-.26,.51,d-.27,'#f4f1e5',0,8.69,0);
    box(w-.47,.24,d-.70,'#775249',0,8.98,0);
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
  if (kind==='tower') {
    const radius=Math.min(w,d)/2-.45;
    const material=color=>new THREE.MeshStandardMaterial({color,roughness:.72});
    const concrete=material('#dbd8c8'), glass=material('#536a70'), trim=material('#9d9f96');
    function floor(top,bottom,height,yy,mat) {
      const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius*top,radius*bottom,height,40),mat);
      mesh.position.y=yy;mesh.userData.mappedStatic=true;group.add(mesh);
    }
    floor(.65,.70,3.4,1.7,concrete);
    for(let i=0;i<4;i++){
      const base=3.4+i*3.25;
      floor(.68,.68,2.85,base+1.50,glass);
      floor(1,.83,.38,base+.19,concrete);
      floor(.98,.98,.20,base+.48,trim);
      for(let post=0;post<12;post++){
        const angle=post*Math.PI/6;
        box(.14,2.9,.14,'#bfc4b9',Math.cos(angle)*radius*.68,base+1.64,Math.sin(angle)*radius*.68);
      }
    }
    floor(1,.93,.50,16.68,concrete);
    floor(.32,.36,.9,17.38,trim);
    box(.09,4,.09,'#c0c5bf',0,19.55,0);
    return true;
  }
  if (kind==='hall'||kind==='control') {
    const h=kind==='control'?9.5:5.9;
    box(w-1,h,d-1,'#ddd9cd',0,h/2,0);
    box(w-.35,.41,d-.35,'#ece9da',0,h+.14,0);
    box(.24,2,d-2.5,'#557786',front*(w/2-.42),h-1.8,0);
    const modules=Math.max(2,Math.ceil(d/6));
    for(let i=0;i<modules;i++)box(.32,2.05,.25,'#e7e5db',front*(w/2-.41),h-1.8,(i+.5-modules/2)*(d-2)/modules);
    placard(site.label,Math.min(15,d-1.8),front*(w/2-.24),2.4,0,front*Math.PI/2);
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
  for(const corner of PORTIMAO_CORNERS) {
    for(let i=0;i<9;i++){
      const p=sample(track,corner.station-6-i*3.9,corner.side*(track.width/2-1.05-i%3*.37));
      scuffs.push({...p,y:p.y+.075,w:.13+(i%2)*.16,d:1.5+(i%4)*.7,tint:i%6?'#333638':'#b0a183'});
    }
  }
  for(const row of portimaoRunoff(track).bands){
    if(row.kind!=='tarmac'||row.i%13!==0)continue;
    const [a,b,c,d]=row.polygon;
    if(Math.min(Math.hypot(d.x-a.x,d.z-a.z),Math.hypot(c.x-b.x,c.z-b.z))<1.4)continue;
    const at=(u,v)=>Object.fromEntries(['x','y','z'].map(axis=>[axis,
      (a[axis]*(1-u)+d[axis]*u)*(1-v)+(b[axis]*(1-u)+c[axis]*u)*v]));
    const p=at(.38,.5), back=at(.38,.1), front=at(.38,.9);
    const heading=Math.atan2(front.x-back.x,front.z-back.z);
    const pitch=Math.atan2(front.y-back.y,Math.hypot(front.x-back.x,front.z-back.z));
    runoffScuffs.push({...p,heading,pitch,y:p.y+.013,w:.18,d:1.5,tint:'#222527'});
    if(row.i%39===0&&[4,5,9,15].includes(row.turn))puddles.push({...p,heading,pitch,y:p.y+.018,w:.95,d:1.8,tint:'#8295aa'});
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
  for(const s of [1240,4130]) {
    const p=sample(track,s), shimmer=new THREE.Mesh(geometry,material);
    shimmer.position.set(p.x,p.y+.87,p.z);
    shimmer.rotation.y=p.heading;
    scene.group.add(shimmer);
  }
  return uniforms;
}

function addMonchique(scene, track) {
  const minX=Math.min(...track.points.map(p=>p.x))-PORTIMAO_TERRAIN_MARGIN;
  const maxX=Math.max(...track.points.map(p=>p.x))+PORTIMAO_TERRAIN_MARGIN;
  const seam=Math.min(...track.points.map(p=>p.z))-PORTIMAO_TERRAIN_MARGIN;
  const north=-11400, width=maxX-minX, depth=seam-north;
  const columns=Math.ceil(width/PORTIMAO_TERRAIN_CELL);
  const geometry=new THREE.PlaneGeometry(width,depth,columns,Math.ceil(depth/115));
  geometry.rotateX(-Math.PI/2);
  const positions=geometry.attributes.position, colors=[];
  const foothill=new THREE.Color('#92956d'), ridge=new THREE.Color('#788d9a'), color=new THREE.Color();
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i)+(minX+maxX)/2,z=positions.getZ(i)+(seam+north)/2;
    const h=portimaoGround(track,x,z,PORTIMAO_TERRAIN_CELL);
    positions.setXYZ(i,x,h-.04,z);
    color.copy(foothill).lerp(ridge,Math.min(.92,Math.max(0,(seam-z)/4000+h/1500)));
    colors.push(color.r,color.g,color.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  scene.group.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1})));
}

export function addPortimao(scene,track) {
  const plan=planPortimao(track);
  addMonchique(scene,track);
  const {batch}=addPermanentVenue(scene,track,{
    prefix:'portimao',plan,ground:portimaoGround,roads:portimaoRoads,roadClear:portimaoRoadClear,
    runoff:portimaoRunoff,sectors:PORTIMAO_SECTORS,detection:PORTIMAO_DETECTION,title:'ALGARVE',
    wallTitle:'PORTUGAL',crowdColors:['#ded7c6','#274979','#a94042','#3e6061','#ce824e','#dadba0','#394352'],
    crowdLimit:7800,paintFlag,drawLandmark:dressArchitecture
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
