import {cotaBoundaries,COTA_CORNERS,cotaRunoffAllowed,cotaSurfaceY} from '/shared/cota.mjs';
import {monzaBoundaries,MONZA_CORNERS,MONZA_GRAVEL_STRIPS,monzaRunoffAllowed} from '/shared/monza.mjs';
import {gridSlot} from '/shared/physics.mjs';
import {mexicoBoundaries,MEXICO_CORNERS,mexicoRunoffAllowed} from '/shared/mexico.mjs';
import {redbullringBoundaries,REDBULLRING_CORNERS,redbullringRunoffAllowed,redbullringSurfaceY} from '/shared/redbullring.mjs';
import {silverstoneBoundaries,SILVERSTONE_CORNERS,silverstoneRunoffAllowed} from '/shared/silverstone.mjs';
import {miamiBoundaries,MIAMI_CORNERS} from '/shared/miami.mjs';
import {zandvoortBoundaries} from '/shared/zandvoort.mjs';
import {bankedHeight,bankingAt} from '/shared/banked-road.mjs';
import {interlagosBoundaries} from '/shared/interlagos-boundary.mjs';
import {pitReserved,pitLayout,pitRoadPose} from '/shared/pit-layout.mjs';
import {roadClearance} from '/shared/venues.mjs';
import * as THREE from '/vendor/three.module.js';
import {sampleGuide,prepareRacingLine} from '/shared/racing-line.mjs';
import {angleDiff,wrap,sample} from '/shared/tracks.mjs';
import {VENUES} from '/shared/venues.mjs';
import {ribbonOffset} from '/shared/surface.mjs';

export function trackAppearance(track){
 const theme=track.campus?'campus':VENUES[track.id]?.theme||'fields',street=track.urban&&!track.campus;
 const sand=['desert','dunes'].includes(theme),forest=['forest','alpine'].includes(theme);
 const colors={desert:'#aaa18b',dunes:'#929174',forest:'#596d4b',alpine:'#657451',tropical:'#657d51',coast:'#78876b',fields:'#79815b',campus:'#738360',skyline:'#777e78',city:'#78806c',neon:'#717579',marina:'#728681'};
 return {theme,street,sand,forest,ground:track.id==='us-2012'?'#a49a69':track.id==='it-1922'?'#586e43':track.id==='at-1969'?'#71945b':track.id==='gb-1948'?'#799465':track.id==='us-2022'?'#899e78':track.id==='nl-1948'?'#b6af8d':track.id==='br-1940'?'#5c7e47':track.id==='us-2023'?'#35363b':track.id==='es-2026'?'#b1a783':track.id==='sg-2008'?'#1f2c32':track.id==='az-2016'?'#b7ae99':track.id==='sa-2021'?'#cbb894':track.id==='mc-1929'?'#b5af9c':track.id==='be-1925'?'#526f43':track.id==='bh-2002'?'#cdbb9b':track.id==='jp-1962'?'#567448':colors[theme]||'#74815a',kerb:track.id==='br-1940'?['#e4d13f','#4c8d58']:track.id==='sa-2021'?['#0a7e4a','#eceae2']:track.id==='be-1925'?['#bd3729','#e8ba2d']:track.campus?['#35383a','#dfdccd']:['#bd3730','#e8e5dc'],runoff:track.id==='sa-2021'?'#155b78':track.id==='fr-1969'?'#376b9c':track.id==='ae-2009'?'#609ba5':track.id==='us-2012'?'#a34b40':'#548475',gravel:(track.id==='jp-1962'||forest||theme==='fields')&&track.id!=='sa-2021',fog:street?.00044:sand?.00055:.00036};
}
function noiseTexture(kind){
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');let seed=1979;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const image=x.createImageData(256,256),base=kind==='tyre'?58:kind==='asphalt'?86:kind==='gravel'?184:kind==='armco'?215:kind==='sand'?218:kind==='historic-concrete'?196:235;
 for(let i=0;i<image.data.length;i+=4){const u=(i/4)%256,vv=Math.floor(i/1024),patch=kind==='grass'?(Math.sin(u*Math.PI*4/256)*Math.cos(vv*Math.PI*6/256)+Math.sin((u+vv)*Math.PI*2/256))*.035:0,n=(random()-.5)*(kind==='asphalt'?35:kind==='gravel'?65:kind==='grass'?45:24),v=base+n;image.data[i]=v*(1+patch);image.data[i+1]=v*(1+patch)+(kind==='gravel'?-6:0);image.data[i+2]=v*(1+patch)+(kind==='gravel'?-18:0);image.data[i+3]=255;}x.putImageData(image,0,0);
 if(kind==='asphalt'){
  for(let i=0;i<160;i++){const a=random()*256,b=random()*256;x.strokeStyle='rgba(26,29,31,.07)';x.lineWidth=.3+random()*.7;x.beginPath();x.moveTo(a,b);x.lineTo(a+random()*16-8,b+random()*45);x.stroke();}
 }else if(kind==='tyre'){
  for(let row=0;row<4;row++)for(let col=0;col<6;col++){const px=(col+.5)*256/6,py=(row+.5)*64;x.beginPath();x.ellipse(px,py,18,27,0,0,Math.PI*2);x.fillStyle='#22282a';x.fill();x.strokeStyle='#5f6766';x.lineWidth=3;x.stroke();x.beginPath();x.ellipse(px,py,10,18,0,0,Math.PI*2);x.fillStyle='#151b1d';x.fill();}
 }else if(kind==='gravel'){
  for(let y=0;y<256;y+=7){x.strokeStyle='rgba(81,70,47,.14)';x.lineWidth=1;x.beginPath();x.moveTo(0,y);x.lineTo(256,y);x.stroke();}
 }else if(kind==='sand'){
  for(let y=0;y<256;y+=13){x.strokeStyle='rgba(131,111,80,.10)';x.lineWidth=1.5;x.beginPath();x.moveTo(0,y);x.bezierCurveTo(65,y+8,191,y-8,256,y);x.stroke();}
 }else if(kind==='grass'){
  for(let i=0;i<2600;i++){const px=random()*256,py=random()*256;x.strokeStyle=i%2?'rgba(78,84,63,.12)':'rgba(255,253,209,.14)';x.lineWidth=.5;x.beginPath();x.moveTo(px,py);x.lineTo(px+random()*3-1.5,py-2-random()*3);x.stroke();}
 }else if(kind==='armco'){
  for(let y=0;y<256;y+=85){const g=x.createLinearGradient(0,y,0,y+85);g.addColorStop(0,'rgba(255,255,255,.25)');g.addColorStop(.3,'rgba(0,0,0,.20)');g.addColorStop(.7,'rgba(255,255,255,.32)');g.addColorStop(1,'rgba(0,0,0,.16)');x.fillStyle=g;x.fillRect(0,y,256,85);}
 }else if(kind==='historic-concrete'){
  for(let i=0;i<50;i++){const a=random()*256,b=random()*256;x.strokeStyle='rgba(69,70,59,.42)';x.lineWidth=.5+random();x.beginPath();x.moveTo(a,b);for(let j=0;j<5;j++)x.lineTo(a+j*7+random()*6,b+j*10+random()*7);x.stroke();}
  for(let i=0;i<85;i++){x.fillStyle=i%2?'rgba(80,105,55,.19)':'rgba(126,81,49,.19)';x.beginPath();x.ellipse(random()*256,random()*256,3+random()*10,8+random()*24,0,0,Math.PI*2);x.fill();}
 }else if(kind==='concrete'){
  for(let i=0;i<1200;i++){x.fillStyle=i%3?'rgba(68,70,65,.13)':'rgba(245,243,226,.18)';x.fillRect(random()*256,random()*256,1+random()*2,1+random()*2);}
  x.fillStyle='rgba(57,64,61,.20)';x.fillRect(0,0,2,256);
 }else if(kind==='paint'){
  for(let i=0;i<600;i++){x.fillStyle='rgba(110,107,94,.18)';x.fillRect(random()*256,random()*256,1+random()*3,random()*2);}
 }
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;
}
function meshTexture(){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.clearRect(0,0,128,128);x.strokeStyle='#bcc5c5';x.lineWidth=1.5;
 for(let i=-128;i<256;i+=32){x.beginPath();x.moveTo(i,0);x.lineTo(i+128,128);x.moveTo(i+128,0);x.lineTo(i,128);x.stroke();}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
}

export class TrackSurfaces{
 constructor(scene,track){
  this.scene=scene;this.track=track;this.appearance=trackAppearance(track);this.textures=new Map();this.materials=new Map();
  const n=track.points.length;this.cornerMask=Array(n).fill(false);this.outsideMask={'-1':Array(n).fill(false),'1':Array(n).fill(false)};
  for(let i=0;i<n;i++){
   const k=angleDiff(track.points[wrap(i+3,n)].heading,track.points[wrap(i-3,n)].heading)/(6*track.step);
   if(Math.abs(k)<.0035)continue;
   for(let d=-Math.ceil(20/track.step);d<=Math.ceil(26/track.step);d++){const index=wrap(i+d,n);this.cornerMask[index]=true;this.outsideMask[-Math.sign(k)][index]=true;}
  }
 }
 texture(kind){if(!this.textures.has(kind))this.textures.set(kind,kind==='fence'?meshTexture():noiseTexture(kind));return this.textures.get(kind);}
 material(kind,color='#ffffff',vertexColors=false){
  const key=[kind,color,vertexColors].join(':');if(this.materials.has(key))return this.materials.get(key);
  const texture=this.texture(kind),m=kind==='asphalt'?new THREE.MeshPhysicalMaterial({color,map:texture,bumpMap:texture,bumpScale:.018,roughness:.86,vertexColors,clearcoat:0,clearcoatRoughness:.2}):new THREE.MeshStandardMaterial({color,map:texture,bumpMap:kind==='fence'?null:texture,bumpScale:['gravel','tyre'].includes(kind)?.045:.008,roughness:kind==='armco'?.46:.9,metalness:kind==='armco'?.45:0,vertexColors,side:THREE.DoubleSide,alphaTest:kind==='fence'?.35:0});
  m.userData.surfaceKind=kind;this.materials.set(key,m);return m;
 }
 build(){
  const scene=this.scene,track=this.track,half=track.width/2,a=this.appearance;
  for(const side of [-1,1]){
   const edge=side*half,limit=side*(half+(track.campus?1.8:6.5));if(!['us-2012','it-1922','mx-1962','gb-1948','at-1969'].includes(track.id))scene.ribbon(track,Math.min(edge,limit),Math.max(edge,limit),a.ground,-.08,false,{kind:track.id==='sg-2008'?'concrete':['bh-2002','sa-2021'].includes(track.id)?'sand':'grass'});
   const shoulder=side*(half+(a.street?.65:track.campus?1.4:1.6));if(!['us-2012','it-1922','mx-1962','gb-1948','at-1969'].includes(track.id))scene.ribbon(track,Math.min(edge,shoulder),Math.max(edge,shoulder),a.street?'#777f80':'#b8b4a7',.015,false,{kind:'paint'});
   if(!track.campus&&!a.street&&!['us-2012','it-1922','mx-1962','at-1969','gb-1948','us-2022','nl-1948','br-1940','bh-2002','be-1925','sa-2021'].includes(track.id)){
    const lo=side*(half+1.6),hi=side*(half+6.3),kind=a.gravel?'gravel':'asphalt',color=a.gravel?'#c0b79d':'#a0a09a';scene.ribbon(track,Math.min(lo,hi),Math.max(lo,hi),color,.022,false,{kind,mask:this.outsideMask[side]});
    const p=side*(half+1.6),q=side*(half+3);if(track.id!=='jp-1962')scene.ribbon(track,Math.min(p,q),Math.max(p,q),a.runoff,.04,false,{kind:'paint',mask:this.outsideMask[side]});
   }
  }
  scene.ribbon(track,-half,half,'#ffffff',.05,false,{kind:'asphalt'});
  for(const side of [-1,1]){
   const x=side*(half+.12),z=side*(half+(track.campus?1.25:1.15));scene.ribbon(track,Math.min(x,z),Math.max(x,z),a.kerb[0],.082,true,{kind:'paint',color2:a.kerb[1],mask:this.cornerMask,raised:true});
   const p=side*(half-.27),q=side*(half-.12);scene.ribbon(track,Math.min(p,q),Math.max(p,q),'#dddcd2',.07,false,{kind:'paint'});
  }
  if(track.id==='fr-1969')for(const side of [-1,1])for(let band=0;band<4;band++){
   const p=side*(half+2.2+band),q=side*(half+3.2+band);scene.ribbon(track,Math.min(p,q),Math.max(p,q),band<3?'#316a9e':'#a74037',.055,false,{kind:'paint',mask:this.outsideMask[side]});
  }
  if(track.id==='mx-1962'){const mask=track.points.map((_,i)=>i*track.step/track.length>.835&&i*track.step/track.length<.91);scene.ribbon(track,-half,half,'#55595b',.056,false,{kind:'paint',mask});}
  if(track.id==='us-2012')this.cotaRunoff();if(track.id==='it-1922')this.monzaRunoff();if(track.id==='br-1940')this.interlagosRunoff();if(track.id==='nl-1948')this.zandvoortRunoff();if(track.id==='us-2022')this.miamiRunoff();if(track.id==='gb-1948')this.silverstoneRunoff();if(track.id==='at-1969')this.redbullringRunoff();if(track.id==='mx-1962'){this.mexicoRunoff();this.mexicoDressing();}
  this.rubber();this.repairs();
 }
 miamiRunoff(){
  const track=this.track,half=track.width/2,rows=miamiBoundaries(track);
  for(const side of [-1,1])for(const kind of ['asphalt','paint','accent','gravel','grass']){
   const positions=[],uv=[];
   const range=p=>kind==='asphalt'?[half,half+p.paved]:kind==='paint'?[half+1.25,half+p.paint]:kind==='accent'?[half+Math.max(1.6,p.paint-.55),half+p.paint-.2]:kind==='gravel'?[half+p.paved,half+p.paved+p.gravel]:[half+p.paved+p.gravel,p.offset];
   for(let i=0;i<track.points.length;i++){
    const j=(i+1)%track.points.length,a=range(rows[side][i]),b=range(rows[side][j]);if(a[1]-a[0]<.08||b[1]-b[0]<.08)continue;
    const vertices=[[i,a[0]],[j,b[0]],[i,a[1]],[i,a[1]],[j,b[0]],[j,b[1]]].map(([n,o])=>{const p=track.points[n],offset=ribbonOffset(track,n,side*o);return {x:p.x+Math.cos(p.heading)*offset,y:p.y+(kind==='accent'?.054:kind==='paint'?.049:.028),z:p.z-Math.sin(p.heading)*offset};});
    if(vertices.some(p=>pitReserved(track,p.x,p.z,5)))continue;for(const [n,p]of vertices.entries()){positions.push(p.x,p.y,p.z);uv.push(n%2*3,i*.65);}
   }
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,this.material(kind==='accent'?'paint':kind,kind==='accent'?'#e4a0b7':kind==='paint'?'#36b7c6':kind==='gravel'?'#c1b395':kind==='grass'?'#7d9a67':'#7b8584'));mesh.receiveShadow=true;this.scene.group.add(mesh);
  }
  // Original painted venue lettering, embedded in the runoff surface rather
  // than a floating sign. Subdivide so letters follow the retained road height.
  const lettering=document.createElement('canvas');lettering.width=1024;lettering.height=256;
  const ink=lettering.getContext('2d');ink.clearRect(0,0,1024,256);ink.fillStyle='#fff5df';ink.font='italic 900 190px Arial';ink.textAlign='center';ink.textBaseline='middle';ink.fillText('MIAMI',512,132,960);
  const map=new THREE.CanvasTexture(lettering);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;this.textures.set('miami-lettering',map);
  const material=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2});this.materials.set('miami-lettering',material);
  for(const corner of MIAMI_CORNERS.filter(c=>[6,7,8,11,17].includes(c.turn))){
   const length=30,start=corner.s-length/2,indices=Array.from({length:13},(_,i)=>Math.floor(wrap(start+i*length/12,track.length)/track.step)),paint=Math.min(...indices.map(i=>rows[corner.side][i].paint)),height=Math.min(8,paint-3.5);if(height<2.5)continue;
   const middle=half+1.7+(paint-1.7)/2,positions=[],uv=[];
   for(let i=0;i<=12;i++)for(const across of [-1,1]){const at=start+i*length/12,p=sample(track,at,corner.side*(middle+across*height/2));positions.push(p.x,p.y+.065,p.z);uv.push(i/12,(across+1)/2);}
   if(Array.from({length:positions.length/3},(_,i)=>({x:positions[i*3],z:positions[i*3+2]})).some(p=>pitReserved(track,p.x,p.z,5)))continue;
   const faces=[];for(let i=0;i<12;i++){const n=i*2;faces.push(n,n+2,n+1,n+1,n+2,n+3);}
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(faces);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.userData.miamiRunoffLettering=corner.turn;this.scene.group.add(mesh);
  }
 }
 silverstoneRunoff(){
  const track=this.track,half=track.width/2,rows=silverstoneBoundaries(track);
  for(const side of [-1,1])for(const kind of ['asphalt','paint','accent','gravel','grass']){
   const positions=[],uv=[];
   const range=p=>kind==='asphalt'?[half,half+p.paved]:kind==='paint'?[half+1.25,half+p.paint]:kind==='accent'?[half+Math.max(1.6,p.paint-.55),half+p.paint-.2]:kind==='gravel'?[half+p.paved,half+p.paved+p.gravel]:[half+p.paved+p.gravel,p.offset];
   for(let i=0;i<track.points.length;i++){
    if(!silverstoneRunoffAllowed(track,i,side))continue;const j=(i+1)%track.points.length,a=range(rows[side][i]),b=range(rows[side][j]);if(a[1]-a[0]<.08||b[1]-b[0]<.08)continue;
    const vertices=[[i,a[0]],[j,b[0]],[i,a[1]],[i,a[1]],[j,b[0]],[j,b[1]]].map(([n,o])=>{const p=track.points[n],offset=ribbonOffset(track,n,side*o);return {x:p.x+Math.cos(p.heading)*offset,y:p.y+(kind==='accent'?.054:kind==='paint'?.049:.028),z:p.z-Math.sin(p.heading)*offset};});
    if(vertices.some(p=>pitReserved(track,p.x,p.z,5)))continue;for(const [n,p]of vertices.entries()){positions.push(p.x,p.y,p.z);uv.push(n%2*3,i*.65);}
   }
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,this.material(kind==='accent'?'paint':kind,kind==='accent'?'#d0d6c5':kind==='paint'?'#647d86':kind==='gravel'?'#c1b395':kind==='grass'?'#7c9567':'#777e7c'));mesh.receiveShadow=true;this.scene.group.add(mesh);
  }
  // Original painted venue lettering, embedded in the runoff surface rather
  // than a floating sign. Subdivide so letters follow the retained road height.
  const lettering=document.createElement('canvas');lettering.width=1024;lettering.height=256;
  const ink=lettering.getContext('2d');ink.clearRect(0,0,1024,256);ink.fillStyle='#fff5df';ink.font='italic 900 190px Arial';ink.textAlign='center';ink.textBaseline='middle';ink.fillText('SILVERSTONE',512,132,960);
  const map=new THREE.CanvasTexture(lettering);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;this.textures.set('silverstone-lettering',map);
  const material=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2});this.materials.set('silverstone-lettering',material);
  for(const corner of SILVERSTONE_CORNERS.filter(c=>[1,9].includes(c.turn))){
   const length=30,start=corner.s-length/2,indices=Array.from({length:13},(_,i)=>Math.floor(wrap(start+i*length/12,track.length)/track.step)),paint=Math.min(...indices.map(i=>rows[corner.side][i].paved)),height=Math.min(8,paint-3.5);if(height<2.5||indices.some(i=>!silverstoneRunoffAllowed(track,i,corner.side)))continue;
   const middle=half+1.7+(paint-1.7)/2,positions=[],uv=[];
   for(let i=0;i<=12;i++)for(const across of [-1,1]){const at=start+i*length/12,p=sample(track,at,corner.side*(middle+across*height/2));positions.push(p.x,p.y+.065,p.z);uv.push(i/12,(across+1)/2);}
   if(Array.from({length:positions.length/3},(_,i)=>({x:positions[i*3],z:positions[i*3+2]})).some(p=>pitReserved(track,p.x,p.z,5)))continue;
   const faces=[];for(let i=0;i<12;i++){const n=i*2;faces.push(n,n+2,n+1,n+1,n+2,n+3);}
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(faces);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.userData.silverstoneRunoffLettering=corner.turn;this.scene.group.add(mesh);
  }
 }
 mexicoDressing(){
  const track=this.track,group=this.scene.group,atlas=document.createElement('canvas');atlas.width=1024;atlas.height=1024;const ink=atlas.getContext('2d'),labels=['1','2','3','4','5','6','7','8','S1','S2','SC1','SC2','80','PIT','OUT'],map=new THREE.CanvasTexture(atlas);labels.forEach((text,i)=>{ink.fillStyle='#eee8d7';ink.font='900 130px Arial';ink.textAlign='center';ink.textBaseline='middle';ink.fillText(text,i%4*256+128,Math.floor(i/4)*256+128,245);});map.colorSpace=THREE.SRGBColorSpace;map.needsUpdate=true;const material=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4});this.textures.set('mexico-road-labels',map);this.materials.set('mexico-road-labels',material);
  const label=(text,p,width=1.4,height=2)=>{const i=labels.indexOf(text),geometry=new THREE.PlaneGeometry(width,height),uv=geometry.attributes.uv;for(let k=0;k<uv.count;k++)uv.setXY(k,(i%4+uv.getX(k))/4,1-(Math.floor(i/4)+1-uv.getY(k))/4);geometry.rotateX(-Math.PI/2);const mesh=new THREE.Mesh(geometry,material);mesh.position.set(p.x,p.y+.105,p.z);mesh.rotation.y=p.heading;mesh.userData.mappedStatic=true;group.add(mesh);};
  for(let i=0;i<8;i++){const slot=gridSlot(i);label(String(i+1),sample(track,slot.s,slot.offset+(slot.offset<0?1.8:-1.8)));}
  const linePositions=[],stripe=(s,offset,width,length=.18)=>{for(const [along,across]of [[0,-1],[0,1],[length,-1],[length,-1],[0,1],[length,1]]){const p=sample(track,s+along,offset+across*width/2);linePositions.push(p.x,p.y+.09,p.z);}};
  for(const [text,s]of [['S1',1998-136],['S2',3605-242]]){stripe(s,0,track.width-.6);label(text,sample(track,s-5,-track.width/2+1.8),2,3);}
  const pit=pitLayout(track);for(const [text,distance]of [['SC1',-18],['SC2',pit.length+12],['80',12],['PIT',22],['OUT',pit.length-15]]){const p=pitRoadPose(track,distance);if(text.startsWith('SC'))stripe(pit.entry+distance,0,track.width-.6);label(text,p,text.length>2?2.8:2.1,2.2);}
  const lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.Float32BufferAttribute(linePositions,3));const lineMaterial=new THREE.MeshBasicMaterial({color:'#c9d2bb',side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3});this.materials.set('mexico-sector-lines',lineMaterial);group.add(new THREE.Mesh(lineGeo,lineMaterial));
  // Flush cosmetic tyre marbles and fine oil streaks; these do not add solids.
  const marble=new THREE.InstancedMesh(new THREE.CircleGeometry(.045,4),new THREE.MeshBasicMaterial({color:'#222729',transparent:true,opacity:.55,depthWrite:false}),600),dummy=new THREE.Object3D();for(let i=0;i<600;i++){const corner=MEXICO_CORNERS[i%MEXICO_CORNERS.length],s=corner.s-70+(i*.618033%1)*100,p=sample(track,s,(i%2?1:-1)*(track.width/2-.7-i%4*.18));dummy.position.set(p.x,p.y+.093,p.z);dummy.rotation.set(-Math.PI/2,p.heading,0,'YXZ');dummy.scale.set(1+i%3*.25,1,1);dummy.updateMatrix();marble.setMatrixAt(i,dummy.matrix);}marble.computeBoundingSphere();group.add(marble);
  const oil=[];for(const corner of MEXICO_CORNERS.filter(c=>[1,4,6,12].includes(c.turn)))for(let i=0;i<20;i++){const s=corner.s-50+i*1.5,p=sample(track,s,-1),q=sample(track,s+1.5,-.8);oil.push(p.x,p.y+.094,p.z,q.x,q.y+.094,q.z,p.x+.08,p.y+.094,p.z);}const oilGeo=new THREE.BufferGeometry();oilGeo.setAttribute('position',new THREE.Float32BufferAttribute(oil,3));const oilMaterial=new THREE.MeshBasicMaterial({color:'#3c3f36',transparent:true,opacity:.17,side:THREE.DoubleSide,depthWrite:false});this.materials.set('mexico-oil',oilMaterial);group.add(new THREE.Mesh(oilGeo,oilMaterial));
 }
 monzaRunoff(){
  const track=this.track,half=track.width/2,rows=monzaBoundaries(track);
  for(const side of [-1,1])for(const kind of ['asphalt','paint','accent','gravel','grass']){
   const positions=[],uv=[];
   const range=p=>kind==='asphalt'?[half,half+p.paved]:kind==='paint'?[half+1.25,half+p.paint]:kind==='accent'?[half+Math.max(1.6,p.paint-.55),half+p.paint-.2]:kind==='gravel'?[half+p.paved,half+p.paved+p.gravel]:[half+p.paved+p.gravel,p.offset];
   for(let i=0;i<track.points.length;i++){
    if(!monzaRunoffAllowed(track,i,side))continue;const j=(i+1)%track.points.length,a=range(rows[side][i]),b=range(rows[side][j]);if(a[1]-a[0]<.08||b[1]-b[0]<.08)continue;
    const vertices=[[i,a[0]],[j,b[0]],[i,a[1]],[i,a[1]],[j,b[0]],[j,b[1]]].map(([n,o])=>{const p=track.points[n],offset=ribbonOffset(track,n,side*o);return {x:p.x+Math.cos(p.heading)*offset,y:p.y+(kind==='accent'?.054:kind==='paint'?.049:.028),z:p.z-Math.sin(p.heading)*offset};});
    if(vertices.some(p=>pitReserved(track,p.x,p.z,5)))continue;for(const p of vertices){positions.push(p.x,p.y,p.z);uv.push(p.x/12,p.z/12);}
   }
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,this.material(kind==='accent'?'paint':kind,kind==='accent'?'#cdbb99':kind==='paint'?'#557d72':kind==='gravel'?'#bcb195':kind==='grass'?'#778c62':'#777e7c'));mesh.receiveShadow=true;this.scene.group.add(mesh);
  }
  const stripPositions=[],stripUv=[];for(const strip of MONZA_GRAVEL_STRIPS)for(let at=strip.s-strip.span;at<strip.s+strip.span;at+=3){const i=Math.floor(wrap(at,track.length)/track.step),j=(i+1)%track.points.length;if(!monzaRunoffAllowed(track,i,strip.side))continue;const vertices=[[i,strip.start],[j,strip.start],[i,strip.start+strip.width],[i,strip.start+strip.width],[j,strip.start],[j,strip.start+strip.width]].map(([n,d])=>{const p=track.points[n],offset=ribbonOffset(track,n,strip.side*(half+d));return {x:p.x+Math.cos(p.heading)*offset,y:p.y+.059,z:p.z-Math.sin(p.heading)*offset};});if(vertices.some(p=>pitReserved(track,p.x,p.z,5)))continue;for(const p of vertices){stripPositions.push(p.x,p.y,p.z);stripUv.push(p.x/8,p.z/8);}}const stripGeometry=new THREE.BufferGeometry();stripGeometry.setAttribute('position',new THREE.Float32BufferAttribute(stripPositions,3));stripGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(stripUv,2));stripGeometry.computeVertexNormals();const stripMesh=new THREE.Mesh(stripGeometry,this.material('gravel','#b9ac90'));stripMesh.receiveShadow=true;this.scene.group.add(stripMesh);
  // Original painted venue lettering, embedded in the runoff surface rather
  // than a floating sign. Subdivide so letters follow the retained road height.
  const lettering=document.createElement('canvas');lettering.width=1024;lettering.height=256;
  const ink=lettering.getContext('2d');ink.clearRect(0,0,1024,256);ink.fillStyle='#fff5df';ink.font='italic 900 190px Arial';ink.textAlign='center';ink.textBaseline='middle';ink.fillText('VELOCITA',512,132,960);
  const map=new THREE.CanvasTexture(lettering);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;this.textures.set('monza-lettering',map);
  const material=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2});this.materials.set('monza-lettering',material);
  for(const corner of MONZA_CORNERS.filter(c=>[1,11].includes(c.turn))){
   const length=30,start=corner.s-length/2,indices=Array.from({length:13},(_,i)=>Math.floor(wrap(start+i*length/12,track.length)/track.step)),paint=Math.min(...indices.map(i=>rows[corner.side][i].paved)),height=Math.min(8,paint-3.5);if(height<2.5||indices.some(i=>!monzaRunoffAllowed(track,i,corner.side)))continue;
   const middle=half+1.7+(paint-1.7)/2,positions=[],uv=[];
   for(let i=0;i<=12;i++)for(const across of [-1,1]){const at=start+i*length/12,p=sample(track,at,corner.side*(middle+across*height/2));positions.push(p.x,p.y+.065,p.z);uv.push(i/12,(across+1)/2);}
   if(Array.from({length:positions.length/3},(_,i)=>({x:positions[i*3],z:positions[i*3+2]})).some(p=>pitReserved(track,p.x,p.z,5)))continue;
   const faces=[];for(let i=0;i<12;i++){const n=i*2;faces.push(n,n+2,n+1,n+1,n+2,n+3);}
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(faces);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.userData.monzaRunoffLettering=corner.turn;this.scene.group.add(mesh);
  }
 }
 mexicoRunoff(){
  const track=this.track,half=track.width/2,rows=mexicoBoundaries(track);
  for(const side of [-1,1])for(const kind of ['asphalt','paint','accent','gravel','grass']){
   const positions=[],uv=[];
   const range=p=>kind==='asphalt'?[half,half+p.paved]:kind==='paint'?[half+1.25,half+p.paint]:kind==='accent'?[half+Math.max(1.6,p.paint-.55),half+p.paint-.2]:kind==='gravel'?[half+p.paved,half+p.paved+p.gravel]:[half+p.paved+p.gravel,p.offset];
   for(let i=0;i<track.points.length;i++){
    if(!mexicoRunoffAllowed(track,i,side))continue;const j=(i+1)%track.points.length,a=range(rows[side][i]),b=range(rows[side][j]);if(a[1]-a[0]<.08||b[1]-b[0]<.08)continue;
    const vertices=[[i,a[0]],[j,b[0]],[i,a[1]],[i,a[1]],[j,b[0]],[j,b[1]]].map(([n,o])=>{const p=track.points[n],offset=ribbonOffset(track,n,side*o);return {x:p.x+Math.cos(p.heading)*offset,y:p.y+(kind==='accent'?.054:kind==='paint'?.049:.028),z:p.z-Math.sin(p.heading)*offset};});
    if(vertices.some(p=>pitReserved(track,p.x,p.z,5)))continue;for(const p of vertices){positions.push(p.x,p.y,p.z);uv.push(p.x/12,p.z/12);}
   }
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,this.material(kind==='accent'?'paint':kind,kind==='accent'?'#cdbb99':kind==='paint'?'#557d72':kind==='gravel'?'#c1b395':kind==='grass'?'#778c62':'#777e7c'));mesh.receiveShadow=true;this.scene.group.add(mesh);
  }
  // Original painted venue lettering, embedded in the runoff surface rather
  // than a floating sign. Subdivide so letters follow the retained road height.
  const lettering=document.createElement('canvas');lettering.width=1024;lettering.height=256;
  const ink=lettering.getContext('2d');ink.clearRect(0,0,1024,256);ink.fillStyle='#fff5df';ink.font='italic 900 190px Arial';ink.textAlign='center';ink.textBaseline='middle';ink.fillText('CIUDAD',512,132,960);
  const map=new THREE.CanvasTexture(lettering);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;this.textures.set('mexico-lettering',map);
  const material=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2});this.materials.set('mexico-lettering',material);
  for(const corner of MEXICO_CORNERS.filter(c=>[1,4].includes(c.turn))){
   const length=30,start=corner.s-length/2,indices=Array.from({length:13},(_,i)=>Math.floor(wrap(start+i*length/12,track.length)/track.step)),paint=Math.min(...indices.map(i=>rows[corner.side][i].paved)),height=Math.min(8,paint-3.5);if(height<2.5||indices.some(i=>!mexicoRunoffAllowed(track,i,corner.side)))continue;
   const middle=half+1.7+(paint-1.7)/2,positions=[],uv=[];
   for(let i=0;i<=12;i++)for(const across of [-1,1]){const at=start+i*length/12,p=sample(track,at,corner.side*(middle+across*height/2));positions.push(p.x,p.y+.065,p.z);uv.push(i/12,(across+1)/2);}
   if(Array.from({length:positions.length/3},(_,i)=>({x:positions[i*3],z:positions[i*3+2]})).some(p=>pitReserved(track,p.x,p.z,5)))continue;
   const faces=[];for(let i=0;i<12;i++){const n=i*2;faces.push(n,n+2,n+1,n+1,n+2,n+3);}
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(faces);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.userData.mexicoRunoffLettering=corner.turn;this.scene.group.add(mesh);
  }
 }
 cotaRunoff(){
  const track=this.track,half=track.width/2,rows=cotaBoundaries(track);
  for(const side of [-1,1])for(const kind of ['asphalt','paint','accent','gravel','gravel-edge','grass']){
   const positions=[],uv=[];
   const range=p=>kind==='asphalt'?[half,half+p.paved]:kind==='paint'?[half+1.25,half+p.paint]:kind==='accent'?[half+Math.max(1.6,p.paint-.55),half+p.paint-.2]:kind==='gravel-edge'?[half+p.paved,half+p.paved+([11,12].includes(p.turn)?Math.min(2.5,p.gravel):0)]:kind==='gravel'?[half+p.paved,half+p.paved+p.gravel]:[half+p.paved+p.gravel,p.offset];
   for(let i=0;i<track.points.length;i++){
    if(!cotaRunoffAllowed(track,i,side))continue;const j=(i+1)%track.points.length,a=range(rows[side][i]),b=range(rows[side][j]);if(a[1]-a[0]<.08||b[1]-b[0]<.08)continue;
    const vertices=[[i,a[0]],[j,b[0]],[i,a[1]],[i,a[1]],[j,b[0]],[j,b[1]]].map(([n,o])=>{const p=track.points[n],offset=ribbonOffset(track,n,side*o);return {x:p.x+Math.cos(p.heading)*offset,y:cotaSurfaceY(track,n*track.step,offset)+(kind==='accent'?.054:kind==='paint'?.049:kind==='gravel-edge'?.038:.028),z:p.z-Math.sin(p.heading)*offset};});
    if(vertices.some(p=>pitReserved(track,p.x,p.z,5)))continue;for(const p of vertices){positions.push(p.x,p.y,p.z);const scale=kind==='grass'?16:8;uv.push(p.x/scale,p.z/scale);}
   }
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,this.material(kind==='accent'?'paint':kind==='gravel-edge'?'gravel':kind,kind==='accent'?'#e2dfce':kind==='paint'?'#a13f39':kind==='gravel-edge'?'#cabd9f':kind==='gravel'?'#c1b395':kind==='grass'?'#a49c66':'#777e7c'));mesh.receiveShadow=true;this.scene.group.add(mesh);
  }
  // Original painted venue lettering, embedded in the runoff surface rather
  // than a floating sign. Subdivide so letters follow the retained road height.
  const lettering=document.createElement('canvas');lettering.width=1024;lettering.height=256;
  const ink=lettering.getContext('2d');ink.clearRect(0,0,1024,256);ink.fillStyle='#fff5df';ink.font='italic 900 190px Arial';ink.textAlign='center';ink.textBaseline='middle';ink.fillText('LONE STAR',512,132,960);
  const map=new THREE.CanvasTexture(lettering);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;this.textures.set('cota-lettering',map);
  const material=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2});this.materials.set('cota-lettering',material);
  for(const corner of COTA_CORNERS.filter(c=>[1,11,12,19,20].includes(c.turn))){
   const length=30,start=corner.s-length/2,indices=Array.from({length:13},(_,i)=>Math.floor(wrap(start+i*length/12,track.length)/track.step)),paint=Math.min(...indices.map(i=>rows[corner.side][i].paved)),height=Math.min(8,paint-3.5);if(height<2.5||indices.some(i=>!cotaRunoffAllowed(track,i,corner.side)))continue;
   const middle=half+1.7+(paint-1.7)/2,positions=[],uv=[];
   for(let i=0;i<=12;i++)for(const across of [-1,1]){const at=start+i*length/12,p=sample(track,at,corner.side*(middle+across*height/2));positions.push(p.x,cotaSurfaceY(track,at,corner.side*(middle+across*height/2))+.065,p.z);uv.push(i/12,(across+1)/2);}
   if(Array.from({length:positions.length/3},(_,i)=>({x:positions[i*3],z:positions[i*3+2]})).some(p=>pitReserved(track,p.x,p.z,5)))continue;
   const faces=[];for(let i=0;i<12;i++){const n=i*2;faces.push(n,n+2,n+1,n+1,n+2,n+3);}
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(faces);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.userData.cotaRunoffLettering=corner.turn;this.scene.group.add(mesh);
  }
 }
 redbullringRunoff(){
  const track=this.track,half=track.width/2,rows=redbullringBoundaries(track);
  for(const side of [-1,1])for(const kind of ['asphalt','paint','accent','gravel','gravel-edge','grass']){
   const positions=[],uv=[];
   const range=p=>kind==='asphalt'?[half,half+p.paved]:kind==='paint'?[half+1.25,half+p.paint]:kind==='accent'?[half+Math.max(1.6,p.paint-.55),half+p.paint-.2]:kind==='gravel-edge'?[half+p.paved,half+p.paved+([9,10].includes(p.turn)?Math.min(2.5,p.gravel):0)]:kind==='gravel'?[half+p.paved,half+p.paved+p.gravel]:[half+p.paved+p.gravel,p.offset];
   for(let i=0;i<track.points.length;i++){
    if(!redbullringRunoffAllowed(track,i,side))continue;const j=(i+1)%track.points.length,a=range(rows[side][i]),b=range(rows[side][j]);if(a[1]-a[0]<.08||b[1]-b[0]<.08)continue;
    const vertices=[[i,a[0]],[j,b[0]],[i,a[1]],[i,a[1]],[j,b[0]],[j,b[1]]].map(([n,o])=>{const p=track.points[n],offset=ribbonOffset(track,n,side*o);return {x:p.x+Math.cos(p.heading)*offset,y:redbullringSurfaceY(track,n*track.step,offset)+(kind==='accent'?.054:kind==='paint'?.049:kind==='gravel-edge'?.038:.028),z:p.z-Math.sin(p.heading)*offset};});
    if(vertices.some(p=>pitReserved(track,p.x,p.z,5)))continue;for(const p of vertices){positions.push(p.x,p.y,p.z);const scale=kind==='grass'?16:8;uv.push(p.x/scale,p.z/scale);}
   }
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,this.material(kind==='accent'?'paint':kind==='gravel-edge'?'gravel':kind,kind==='accent'?'#dd8d40':kind==='paint'?'#607b94':kind==='gravel-edge'?'#cabd9f':kind==='gravel'?'#c1b395':kind==='grass'?'#71945b':'#777e7c'));mesh.receiveShadow=true;this.scene.group.add(mesh);
  }
  // Original painted venue lettering, embedded in the runoff surface rather
  // than a floating sign. Subdivide so letters follow the retained road height.
  const lettering=document.createElement('canvas');lettering.width=1024;lettering.height=256;
  const ink=lettering.getContext('2d');ink.clearRect(0,0,1024,256);ink.fillStyle='#fff5df';ink.font='italic 900 190px Arial';ink.textAlign='center';ink.textBaseline='middle';ink.fillText('SPIELBERG',512,132,960);
  const map=new THREE.CanvasTexture(lettering);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;this.textures.set('redbullring-lettering',map);
  const material=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2});this.materials.set('redbullring-lettering',material);
  for(const corner of REDBULLRING_CORNERS.filter(c=>[1,3].includes(c.turn))){
   const length=30,start=corner.s-length/2,indices=Array.from({length:13},(_,i)=>Math.floor(wrap(start+i*length/12,track.length)/track.step)),paint=Math.min(...indices.map(i=>rows[corner.side][i].paved)),height=Math.min(8,paint-3.5);if(height<2.5||indices.some(i=>!redbullringRunoffAllowed(track,i,corner.side)))continue;
   const middle=half+1.7+(paint-1.7)/2,positions=[],uv=[];
   for(let i=0;i<=12;i++)for(const across of [-1,1]){const at=start+i*length/12,p=sample(track,at,corner.side*(middle+across*height/2));positions.push(p.x,redbullringSurfaceY(track,at,corner.side*(middle+across*height/2))+.065,p.z);uv.push(i/12,(across+1)/2);}
   if(Array.from({length:positions.length/3},(_,i)=>({x:positions[i*3],z:positions[i*3+2]})).some(p=>pitReserved(track,p.x,p.z,5)))continue;
   const faces=[];for(let i=0;i<12;i++){const n=i*2;faces.push(n,n+2,n+1,n+1,n+2,n+3);}
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(faces);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.userData.redbullringRunoffLettering=corner.turn;this.scene.group.add(mesh);
  }
 }
 zandvoortRunoff(){
  const track=this.track,half=track.width/2,sections=zandvoortBoundaries(track);
  for(const side of [-1,1])for(const kind of ['tarmac','gravel','grass','sand']){
   const positions=[],uv=[];
   for(let i=0;i<track.points.length;i++){
    const next=(i+1)%track.points.length,range=row=>{let lo=half;for(const type of ['tarmac','gravel','grass','sand']){const hi=lo+row[type];if(type===kind)return [lo,hi];lo=hi;}},a=range(sections[side][i]),b=range(sections[side][next]);
    if(a[1]-a[0]<.08||b[1]-b[0]<.08)continue;
    const corners=[[i,a[0]],[next,b[0]],[i,a[1]],[i,a[1]],[next,b[0]],[next,b[1]]].map(([n,o])=>{const p=track.points[n],offset=ribbonOffset(track,n,side*o);return {x:p.x+Math.cos(p.heading)*offset,y:bankedHeight(track,n*track.step,offset,p.y)+.026,z:p.z-Math.sin(p.heading)*offset};});
    if(corners.some(p=>pitReserved(track,p.x,p.z,5)))continue;
    for(const [j,p]of corners.entries()){positions.push(p.x,p.y,p.z);uv.push(j%2*4,i*.6);}
   }
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,this.material(kind==='tarmac'?'asphalt':kind,kind==='tarmac'?'#767e7d':kind==='gravel'?'#b8aa8c':kind==='sand'?'#d5c6a1':'#81906c'));mesh.receiveShadow=true;this.scene.group.add(mesh);
  }
 }
 interlagosRunoff(){
  const track=this.track,half=track.width/2,boundaries=interlagosBoundaries(track);
  for(const side of [-1,1])for(const kind of ['asphalt','paint','gravel']){
   const positions=[],uv=[];
   for(let i=0;i<track.points.length;i++){
    const j=(i+1)%track.points.length,a=boundaries[side][i],b=boundaries[side][j],range=p=>kind==='paint'?[1.55,Math.min(p.paint,p.paved)]:kind==='gravel'?[p.paved,p.paved+p.gravel]:[1.6,p.paved];
    const ar=range(a),br=range(b);if(ar[1]-ar[0]<.15||br[1]-br[0]<.15)continue;
    const corners=[[i,ar[0]],[j,br[0]],[i,ar[1]],[i,ar[1]],[j,br[0]],[j,br[1]]].map(([n,o])=>{const p=track.points[n],offset=ribbonOffset(track,n,side*(half+o));return {x:p.x+Math.cos(p.heading)*offset,y:p.y+(kind==='paint'?.047:.03),z:p.z-Math.sin(p.heading)*offset};});
    // Reserve the generated external pit corridor and neighbouring road branches.
    if(corners.some(p=>pitReserved(track,p.x,p.z,5)||roadClearance(track,p.x,p.z)<.5))continue;
    for(const [n,p]of corners.entries()){positions.push(p.x,p.y,p.z);uv.push(n%2*4,i*.7);}
   }
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,this.material(kind,kind==='paint'?'#329c80':kind==='gravel'?'#b9ad90':'#686f70'));mesh.receiveShadow=true;this.scene.group.add(mesh);
  }
 }
 repairs(){
  // Flush surface decals follow the sampled road height; they add no obstacles.
  const positions=[],colors=[],indices=[],track=this.track,half=track.width/2;
  const strip=(s,length,offset,width,color)=>{
   const start=positions.length/3,steps=Math.ceil(length/2);
   for(let i=0;i<=steps;i++)for(const side of [-1,1]){
    const at=s+i*length/steps,o=offset+side*width/2,p=sample(track,at,track.id==='az-2016'?ribbonOffset(track,Math.floor(wrap(at,track.length)/track.step),o):o);positions.push(p.x,p.y+.079,p.z);
    const fade=Math.min(1,i/2,(steps-i)/2),c=new THREE.Color(color);c.multiplyScalar(.94+fade*.06);colors.push(c.r,c.g,c.b);
    if(i<steps&&side===-1){const n=start+i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}
   }
  };
  for(let s=95;s<track.length;s+=310){
   const p=sample(track,s),q=sample(track,s+18);if(Math.abs(angleDiff(q.heading,p.heading))>.07)continue;
   const side=Math.sin(s*.41)>0?1:-1,offset=side*half*.58;
   strip(s,12+(s%17),offset,.8,'#45494a');strip(s-3,35,side*half*.83,.028,'#2c3132');
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
  const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
  const mesh=new THREE.Mesh(g,m);mesh.receiveShadow=true;this.scene.group.add(mesh);
 }
 rubber(){
  const track=this.track,line=prepareRacingLine(track),n=Math.ceil(track.length/4),step=track.length/n,positions=[],uv=[],indices=[];
  for(const offset of [-.85,.85]){
   const start=positions.length/3;
   for(let i=0;i<=n;i++){const s=i*step,p=sampleGuide(track,s);for(const edge of [offset-.22,offset+.22]){positions.push(p.x+Math.cos(p.heading)*edge,bankedHeight(track,s,p.offset+edge,p.y-bankingAt(track,s,p.offset).height)+.077,p.z-Math.sin(p.heading)*edge);uv.push(edge,i*.3);}
    if(i<n){const k=start+i*2,j=Math.floor((s%track.length)/line.step);if(line.curvature[j]>.002||s<75||s>track.length-140)indices.push(k,k+2,k+1,k+1,k+2,k+3);}
   }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:'#171b1c',map:this.texture('asphalt'),transparent:true,opacity:.17,roughness:.66,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide});material.userData.surfaceKind='rubber';
  const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;this.scene.group.add(mesh);
 }
 fence(walls,color='#b6bebd'){
  if(!walls.length)return;const positions=[],uv=[];let distance=0;
  for(const w of walls){const a=w.a,b=w.b,h=w.height,len=Math.hypot(b.x-a.x,b.z-a.z),u=distance/.6,v=(distance+len)/.6;distance+=len;
   for(const [p,t,y] of [[a,u,0],[b,v,0],[b,v,h],[a,u,0],[b,v,h],[a,u,h]]){positions.push(p.x,p.y+y,p.z);uv.push(t,y/.6);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,this.material('fence',color));mesh.userData.wallSolids=walls;mesh.receiveShadow=true;this.scene.group.add(mesh);
 }
 wet(wetness){
  const jeddah=this.track.id==='sa-2021',singapore=['sg-2008','us-2023'].includes(this.track.id);
  for(const m of this.materials.values()){
   const kind=m.userData.surfaceKind;
   if(['us-2012','it-1922','mx-1962','at-1969','gb-1948','us-2022','nl-1948','br-1940'].includes(this.track.id)&&['grass','gravel','sand'].includes(kind)){m.userData.interlagosDryColor??=m.color.clone();m.color.copy(m.userData.interlagosDryColor).multiplyScalar(1-wetness*.2);m.roughness=.94-wetness*.26;}
   if(kind==='asphalt'){const coat=Math.max(singapore?.15:jeddah?.24:0,wetness*.72);if((m.clearcoat>0)!==(coat>0))m.needsUpdate=true;m.roughness=(singapore?.72:jeddah?.74:.86)-wetness*.48;m.clearcoat=coat;m.bumpScale=.018-wetness*.01;m.color.set(wetness?'#939b9f':'#ffffff');}
   else if(kind==='concrete'){m.roughness=(jeddah?.58:.92)-wetness*.18;if(jeddah||singapore)m.metalness=.06;}
   else if(kind==='paint'){m.roughness=(jeddah?.42:.9)-wetness*.28;if(jeddah||singapore)m.metalness=.12;}
  }
 }
 dispose(){for(const t of this.textures.values())t.dispose();this.textures.clear();this.materials.clear();}
}
