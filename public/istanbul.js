import * as THREE from '/vendor/three.module.js';
import {sample} from '/shared/tracks.mjs';
import {sampleGuide} from '/shared/racing-line.mjs';
import {footprintBox} from '/shared/venue-footprints.mjs';
import {istanbulGround, istanbulRoads, istanbulRoadClear, istanbulRunoff, ISTANBUL_TERRAIN_MARGIN, ISTANBUL_TERRAIN_CELL} from '/shared/istanbul.mjs';
import {ISTANBUL_CORNERS, ISTANBUL_SECTORS, ISTANBUL_DETECTION} from './data/istanbul-runoff.js';
import {ISTANBUL_COAST} from './data/istanbul-architecture.js';
import {planIstanbul} from './istanbul-placement.js';
import {addPermanentVenue} from './permanent-venue.js';
import {trackSign} from './track-furniture.js';

function paintFlag(ink) {
  ink.fillStyle='#c82b3e';ink.fillRect(0,0,192,120);
  ink.fillStyle='#f9f5eb';ink.beginPath();ink.arc(79,60,28,0,Math.PI*2);ink.fill();
  ink.fillStyle='#c82b3e';ink.beginPath();ink.arc(88,59,23,0,Math.PI*2);ink.fill();
  ink.fillStyle='#f9f5eb';ink.beginPath();
  for(let i=0;i<10;i++){
    const a=Math.PI*i/5-Math.PI/2,r=i%2?5.7:14,x=118+Math.cos(a)*r,y=60+Math.sin(a)*r;
    if(i)ink.lineTo(x,y);else ink.moveTo(x,y);
  }
  ink.closePath();ink.fill();
}

function grandstandRoof(scene, site, group, front) {
  const rows=[], cols=Math.max(4,Math.round(site.d/12)), high=site.rows*.5+6.35;
  const point=(col,u,v)=>[
    (site.w-1.4)*(u-.5),
    high+1.8*Math.sin(Math.PI*u)+1.2*Math.sin(Math.PI*v)*Math.sin(Math.PI*u)+front*(u-.5)*1.25,
    ((col+v)/cols-.5)*(site.d-1.4)
  ];
  for(let j=0;j<cols;j++)for(let i=0;i<8;i++)for(let k=0;k<4;k++){
    const a=point(j,i/8,k/4),b=point(j,(i+1)/8,k/4),c=point(j,(i+1)/8,(k+1)/4),d=point(j,i/8,(k+1)/4);
    rows.push(...a,...b,...d,...d,...b,...c);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(rows,3));
  geometry.computeVertexNormals();
  const roof=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:'#ece9e0',roughness:.84,side:THREE.DoubleSide}));
  roof.castShadow=true;roof.receiveShadow=true;group.add(roof);
  for(let j=0;j<=cols;j++){
    const z=(j/cols-.5)*(site.d-2.2), x=-front*(site.w/2-1.4);
    scene.box(.42,high,.45,'#a5a7a3',x,high/2,z,group);
    scene.box(site.w-2.1,.17,.25,'#b6b8b2',0,high-.42,z,group);
  }
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
  if (['pit','control','hall','stand','fan','village','utility','minaret','skyline'].includes(kind)) {
    const h = y-groundY;
    box(w-.22,h,d-.22,'#ac9e84',0,-h/2,0);
  }
  if (kind==='fan') {
    const flagMaterial=new THREE.MeshStandardMaterial({color:'#fff',vertexColors:true,side:THREE.DoubleSide});
    const flagPositions=[],flagColors=[],color=new THREE.Color();
    const flags=[
      ['#294a76','#f1e9df','#bb3e43'],['#2b805b','#f3e9d9','#c04143'],
      ['#282c33','#b33c3e','#d9b656']
    ];
    for(const [i,palette] of flags.entries()){
      const z=-13+i*4.6,x=site.w/2-4.2;
      box(.10,4.85,.10,'#b6b7ac',x,2.42,z);
      for(const [j,tint] of palette.entries()){
        color.set(tint);
        const u=j*.53,v=u+.53;
        const point=(offset,height)=>[x,4.1+height,z+offset];
        flagPositions.push(...point(u,0),...point(v,0),...point(u,.82),...point(u,.82),...point(v,0),...point(v,.82));
        for(let k=0;k<6;k++)flagColors.push(color.r,color.g,color.b);
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(flagPositions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(flagColors,3));
    geometry.computeVertexNormals();
    group.add(new THREE.Mesh(geometry,flagMaterial));
    return false;
  }
  if (kind==='pit') {
    const face=front*(w/2-1), central=d-38, bays=Math.floor(central/7.7);
    box(w-2.4,4.45,d-5,'#dedcd2',0,2.22,0);
    box(w-2.5,4.55,central,'#e8e4d8',0,6.7,0);
    box(w-.75,.42,central+1,'#d5d7d2',0,9.18,0);
    const glass=new THREE.MeshStandardMaterial({color:'#38535d',roughness:.46,side:THREE.DoubleSide});
    const arch=new THREE.Shape();arch.moveTo(-2.85,0);arch.lineTo(2.85,0);arch.lineTo(2.85,1.22);
    arch.quadraticCurveTo(2.1,3.45,0,3.45);arch.quadraticCurveTo(-2.1,3.45,-2.85,1.22);arch.closePath();
    const aperture=new THREE.ShapeGeometry(arch,12);
    for(let i=0;i<bays;i++){
      const z=(i+.5-bays/2)*central/bays;
      box(.24,3.28,5.38,'#434d52',face,1.78,z);
      box(.31,.27,5.38,i%3===0?'#a84747':'#839aa5',face,3.57,z);
      const window=new THREE.Mesh(aperture,glass);
      window.position.set(face+front*.12,5.22,z);window.rotation.y=front*Math.PI/2;
      window.userData.mappedStatic=true;group.add(window);
      box(.12,2.84,.16,'#b6c0be',face+front*.15,6.64,z);
    }
    for(const end of [-1,1]){
      const z=end*(d/2-10.4);
      box(w-1.6,10.8,18.8,'#e3dfd4',0,5.4,z);
      box(w-1.65,4.05,18.2,'#415e6d',0,12.81,z);
      box(w-.62,.45,19.1,'#e7e4dd',0,15.11,z);
      box(w*.48,2.15,11.4,'#ded9ca',0,16.1,z);
      const crown=new THREE.Mesh(new THREE.ConeGeometry(1,3.75,4,6),new THREE.MeshStandardMaterial({color:'#edeae0',roughness:.82}));
      crown.scale.set((w-1.1)/2,1,9.4);crown.position.set(0,18.88,z);
      crown.userData.mappedStatic=true;group.add(crown);
      box(.23,8.5,3.2,'#a26451',-face,5.1,z+end*4);
      for(let i=-2;i<=2;i++)box(.14,3.4,.20,'#b0bcb9',face,12.82,z+i*3);
    }
    // Fitted upper concourse linking the pavilion blocks on the paddock face.
    box(3.4,2.55,44,'#8b9e9f',-front*(w/2-2.2),7.88,central*.23);
    box(3.65,.29,44.6,'#e1dfd4',-front*(w/2-2.2),9.32,central*.23);
    box(w*.37,.24,9,'#c9c2b3',front*w*.20,4.67,-d*.26);
    placard('PODIUM',6.4,face+front*.21,4.86,-d*.26,front*Math.PI/2);
    placard('RACE CONTROL',14,face+front*.17,15.4,d/2-10.4,front*Math.PI/2);
    return true;
  }
  if(kind==='minaret'){
    box(w-2.8,4.2,d-2.8,'#b8b5a4',0,2.1,0);
    const material=new THREE.MeshStandardMaterial({color:'#c0c2b1',roughness:.91});
    const dome=new THREE.Mesh(new THREE.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2),material);
    dome.scale.set(3.8,2.4,3.8);dome.position.y=4.2;dome.userData.mappedStatic=true;group.add(dome);
    box(1.1,17,1.12,'#c6c3b4',4,8.5,5.4);
    box(1.54,.30,1.57,'#abae9f',4,13.4,5.4);
    const cap=new THREE.Mesh(new THREE.ConeGeometry(.65,2.45,8),material);
    cap.position.set(4,18.15,5.4);cap.userData.mappedStatic=true;group.add(cap);
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
  const rubber=[];
  for(let s=2224;s<=2770;s+=7.1){
    const p=sampleGuide(track,s);
    rubber.push({...p,y:p.y+.069,w:1.16,d:7.5,tint:'#302c29'});
  }
  for(const corner of ISTANBUL_CORNERS) {
    for(let i=0;i<9;i++){
      const p=sample(track,corner.station-6-i*3.9,corner.side*(track.width/2-1.05-i%3*.37));
      scuffs.push({...p,y:p.y+.075,w:.13+(i%2)*.16,d:1.5+(i%4)*.7,tint:i%6?'#333638':'#b0a183'});
    }
  }
  for(const row of istanbulRunoff(track).bands){
    if(row.kind!=='tarmac'||row.i%13!==0)continue;
    const [a,b,c,d]=row.polygon;
    if(Math.min(Math.hypot(d.x-a.x,d.z-a.z),Math.hypot(c.x-b.x,c.z-b.z))<1.4)continue;
    const at=(u,v)=>Object.fromEntries(['x','y','z'].map(axis=>[axis,
      (a[axis]*(1-u)+d[axis]*u)*(1-v)+(b[axis]*(1-u)+c[axis]*u)*v]));
    const p=at(.38,.5), back=at(.38,.1), front=at(.38,.9);
    const heading=Math.atan2(front.x-back.x,front.z-back.z);
    const pitch=Math.atan2(front.y-back.y,Math.hypot(front.x-back.x,front.z-back.z));
    runoffScuffs.push({...p,heading,pitch,y:p.y+.013,w:.18,d:1.5,tint:'#222527'});
    if(row.i%52===0)runoffScuffs.push({...at(.84,.5),heading,pitch,y:at(.84,.5).y+.015,
      w:.44,d:1.1,tint:'#917c62'});
    if(row.i%39===0&&[1,7,8,9,12].includes(row.turn))puddles.push({...p,heading,pitch,y:p.y+.018,w:.95,d:1.8,tint:'#8295aa'});
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
  stamp(rubber,.22);
  stamp(scuffs,.39);
  stamp(runoffScuffs,.44);
  return stamp(puddles,0);
}

function coastalHeight(x,z) {
  const {minX,minZ,spacing,width,height,values}=ISTANBUL_COAST;
  const u=Math.max(0,Math.min(width-1,(x-minX)/spacing)),v=Math.max(0,Math.min(height-1,(z-minZ)/spacing));
  const i=Math.min(width-2,Math.floor(u)),j=Math.min(height-2,Math.floor(v)),a=u-i,b=v-j,k=j*width+i;
  return (values[k]*(1-a)+values[k+1]*a)*(1-b)+(values[k+width]*(1-a)+values[k+width+1]*a)*b;
}

function addMarmaraBackdrop(scene, track) {
  const minX=Math.min(...track.points.map(p=>p.x))-ISTANBUL_TERRAIN_MARGIN;
  const maxX=Math.max(...track.points.map(p=>p.x))+ISTANBUL_TERRAIN_MARGIN;
  const seam=Math.max(...track.points.map(p=>p.z))+ISTANBUL_TERRAIN_MARGIN;
  const far=21700, width=maxX-minX, depth=far-seam;
  const geometry=new THREE.PlaneGeometry(width,depth,Math.ceil(width/ISTANBUL_TERRAIN_CELL),72);
  geometry.rotateX(-Math.PI/2);
  const positions=geometry.attributes.position,colors=[];
  const land=new THREE.Color('#819079'),sea=new THREE.Color('#65858c'),haze=new THREE.Color('#8fa3a6'),color=new THREE.Color();
  for(let i=0;i<positions.count;i++){
    const fraction=(positions.getZ(i)+depth/2)/depth, z=seam+fraction*depth;
    const x=positions.getX(i)*(1+4*fraction)+(minX+maxX)/2, h=coastalHeight(x,z);
    const mix=Math.min(1,fraction*32), near=mix<1?istanbulGround(track,x,seam,ISTANBUL_TERRAIN_CELL):0;
    positions.setXYZ(i,x,near*(1-mix)+(Math.max(.04,h)-track.elevation.min)*mix-.04,z);
    color.copy(h<.1?sea:land).lerp(haze,fraction*.62);
    colors.push(color.r,color.g,color.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  scene.group.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94})));
}

function createLowClouds(scene, track) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ink=canvas.getContext('2d');
  for(let i=0;i<7;i++){
    const x=27+i*12,y=65+Math.sin(i*1.85)*15, radius=24+i%3*4;
    const gradient=ink.createRadialGradient(x,y,2,x,y,radius);
    gradient.addColorStop(0,'rgba(231,235,236,.66)');gradient.addColorStop(.45,'rgba(197,205,210,.30)');
    gradient.addColorStop(1,'rgba(192,202,207,0)');ink.fillStyle=gradient;ink.fillRect(0,0,128,128);
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const sky=new THREE.SpriteMaterial({map,transparent:true,opacity:.55,depthWrite:false,fog:false});
  const mist=new THREE.SpriteMaterial({map,transparent:true,opacity:0,depthWrite:false,color:'#b6c7c8'});
  const clouds=[];
  for(let i=0;i<13;i++){
    const angle=i*2.4,r=1300+i%4*520,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    const low=i<5,cloud=new THREE.Sprite(low?mist:sky),y=low?istanbulGround(track,x,z)+22:280+i%4*58;
    cloud.position.set(x,y,z);cloud.scale.set(low?480:550+i%4*140,low?75:165+i%4*36,1);
    cloud.visible=!low;scene.group.add(cloud);clouds.push({cloud,x,z,low});
  }
  return {clouds,sky,mist};
}

export function addIstanbul(scene,track) {
  const plan=planIstanbul(track);
  addMarmaraBackdrop(scene,track);
  const {batch}=addPermanentVenue(scene,track,{
    prefix:'istanbul',plan,ground:istanbulGround,roads:istanbulRoads,roadClear:istanbulRoadClear,
    runoff:istanbulRunoff,sectors:ISTANBUL_SECTORS,detection:ISTANBUL_DETECTION,title:'TUZLA GRAND PRIX',
    wallTitle:'TÜRKİYE',crowdColors:['#ded7c6','#274979','#a94042','#3e6061','#ce824e','#dadba0','#394352'],
    crowdLimit:7900,paintFlag,drawRoof:grandstandRoof,drawLandmark:dressArchitecture
  });
  batch(new THREE.IcosahedronGeometry(1.38,0),new THREE.MeshStandardMaterial({color:'#c4b49a',roughness:1}),
    plan.sites.filter(site=>site.kind==='rock'),(p,o)=>{o.position.y+=.33;o.scale.set(1,.6,.85);});
  const venue=scene.environmentFx,puddles=addSurfaceDetails(track,batch),weather=createLowClouds(scene,track);
  const coastProps=[
    {kind:'ship',x:-9400,z:17600,w:32,d:164},{kind:'ship',x:-8200,z:18750,w:35,d:172},
    {kind:'crane',x:-10750,z:15000,w:20,d:38},{kind:'crane',x:-10400,z:15000,w:20,d:38},
    {kind:'crane',x:-10150,z:15150,w:20,d:38}
  ];
  for(const p of coastProps){
    if(!istanbulRoadClear(track,footprintBox({...p,heading:0},3)))continue;
    const y=Math.max(0,coastalHeight(p.x,p.z))-track.elevation.min;
    if(p.kind==='ship'&&y+track.elevation.min<.1){
      scene.box(p.w,9,p.d,'#535f66',p.x,y+4,p.z);
      scene.box(p.w*.74,10,p.d*.61,'#78888a',p.x,y+13,p.z+6);
      scene.box(p.w*.53,14,23,'#c1bdb0',p.x,y+17,p.z-p.d*.31);
    }else if(p.kind==='crane'){
      scene.box(3,34,3,'#7f8e89',p.x,y+17,p.z);
      scene.box(3,2,32,'#85938b',p.x,y+33,p.z+2);
    }
  }
  let lastFrame=-Infinity;
  scene.environmentFx={
    setConditions(wet){
      venue.setConditions(wet);puddles.opacity=wet*wet*.37;
      weather.sky.opacity=.57-wet*.18;weather.mist.opacity=wet*wet*.31;
      for(const cloud of weather.clouds)if(cloud.low)cloud.cloud.visible=wet>.16;
    },
    frame(time,cars){
      venue.frame(time,cars);
      if(time-lastFrame<115)return;
      lastFrame=time;
      for(const {cloud,x,z,low} of weather.clouds){
        cloud.position.x=x+Math.sin(time*.00018+z*.005)*(low?74:115);
        cloud.position.z=z+Math.cos(time*.00014+x*.003)*42;
      }
    },
    dispose(){venue.dispose();}
  };
}
