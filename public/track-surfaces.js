import * as THREE from '/vendor/three.module.js';
import {sampleGuide,prepareRacingLine} from '/shared/racing-line.mjs';
import {angleDiff,wrap,sample} from '/shared/tracks.mjs';
import {VENUES} from '/shared/venues.mjs';
import {ribbonOffset} from '/shared/surface.mjs';

export function trackAppearance(track){
 const theme=track.campus?'campus':VENUES[track.id]?.theme||'fields',street=track.urban&&!track.campus;
 const sand=['desert','dunes'].includes(theme),forest=['forest','alpine'].includes(theme);
 const colors={desert:'#aaa18b',dunes:'#929174',forest:'#596d4b',alpine:'#657451',tropical:'#657d51',coast:'#78876b',fields:'#79815b',campus:'#738360',skyline:'#777e78',city:'#78806c',neon:'#717579',marina:'#728681'};
 return {theme,street,sand,forest,ground:track.id==='es-2026'?'#b1a783':track.id==='sg-2008'?'#1f2c32':track.id==='az-2016'?'#b7ae99':track.id==='sa-2021'?'#cbb894':track.id==='mc-1929'?'#b5af9c':track.id==='be-1925'?'#526f43':track.id==='bh-2002'?'#cdbb9b':track.id==='jp-1962'?'#567448':colors[theme]||'#74815a',kerb:track.id==='sa-2021'?['#0a7e4a','#eceae2']:track.id==='be-1925'?['#bd3729','#e8ba2d']:track.campus?['#35383a','#dfdccd']:['#bd3730','#e8e5dc'],runoff:track.id==='sa-2021'?'#155b78':track.id==='fr-1969'?'#376b9c':track.id==='ae-2009'?'#609ba5':track.id==='us-2012'?'#a34b40':'#548475',gravel:(track.id==='jp-1962'||forest||theme==='fields')&&track.id!=='sa-2021',fog:street?.00044:sand?.00055:.00036};
}
function noiseTexture(kind){
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');let seed=1979;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const image=x.createImageData(256,256),base=kind==='asphalt'?86:kind==='gravel'?184:kind==='armco'?215:kind==='sand'?218:235;
 for(let i=0;i<image.data.length;i+=4){const u=(i/4)%256,vv=Math.floor(i/1024),patch=kind==='grass'?(Math.sin(u*Math.PI*4/256)*Math.cos(vv*Math.PI*6/256)+Math.sin((u+vv)*Math.PI*2/256))*.035:0,n=(random()-.5)*(kind==='asphalt'?35:kind==='gravel'?65:kind==='grass'?45:24),v=base+n;image.data[i]=v*(1+patch);image.data[i+1]=v*(1+patch)+(kind==='gravel'?-6:0);image.data[i+2]=v*(1+patch)+(kind==='gravel'?-18:0);image.data[i+3]=255;}x.putImageData(image,0,0);
 if(kind==='asphalt'){
  for(let i=0;i<160;i++){const a=random()*256,b=random()*256;x.strokeStyle='rgba(26,29,31,.07)';x.lineWidth=.3+random()*.7;x.beginPath();x.moveTo(a,b);x.lineTo(a+random()*16-8,b+random()*45);x.stroke();}
 }else if(kind==='gravel'){
  for(let y=0;y<256;y+=7){x.strokeStyle='rgba(81,70,47,.14)';x.lineWidth=1;x.beginPath();x.moveTo(0,y);x.lineTo(256,y);x.stroke();}
 }else if(kind==='sand'){
  for(let y=0;y<256;y+=13){x.strokeStyle='rgba(131,111,80,.10)';x.lineWidth=1.5;x.beginPath();x.moveTo(0,y);x.bezierCurveTo(65,y+8,191,y-8,256,y);x.stroke();}
 }else if(kind==='grass'){
  for(let i=0;i<2600;i++){const px=random()*256,py=random()*256;x.strokeStyle=i%2?'rgba(78,84,63,.12)':'rgba(255,253,209,.14)';x.lineWidth=.5;x.beginPath();x.moveTo(px,py);x.lineTo(px+random()*3-1.5,py-2-random()*3);x.stroke();}
 }else if(kind==='armco'){
  for(let y=0;y<256;y+=85){const g=x.createLinearGradient(0,y,0,y+85);g.addColorStop(0,'rgba(255,255,255,.25)');g.addColorStop(.3,'rgba(0,0,0,.20)');g.addColorStop(.7,'rgba(255,255,255,.32)');g.addColorStop(1,'rgba(0,0,0,.16)');x.fillStyle=g;x.fillRect(0,y,256,85);}
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
  const texture=this.texture(kind),m=kind==='asphalt'?new THREE.MeshPhysicalMaterial({color,map:texture,bumpMap:texture,bumpScale:.018,roughness:.86,vertexColors,clearcoat:0,clearcoatRoughness:.2}):new THREE.MeshStandardMaterial({color,map:texture,bumpMap:kind==='fence'?null:texture,bumpScale:kind==='gravel'?.045:.008,roughness:kind==='armco'?.46:.9,metalness:kind==='armco'?.45:0,vertexColors,side:THREE.DoubleSide,alphaTest:kind==='fence'?.35:0});
  m.userData.surfaceKind=kind;this.materials.set(key,m);return m;
 }
 build(){
  const scene=this.scene,track=this.track,half=track.width/2,a=this.appearance;
  for(const side of [-1,1]){
   const edge=side*half,limit=side*(half+(track.campus?1.8:6.5));scene.ribbon(track,Math.min(edge,limit),Math.max(edge,limit),a.ground,-.08,false,{kind:track.id==='sg-2008'?'concrete':['bh-2002','sa-2021'].includes(track.id)?'sand':'grass'});
   const shoulder=side*(half+(a.street?.65:track.campus?1.4:1.6));scene.ribbon(track,Math.min(edge,shoulder),Math.max(edge,shoulder),a.street?'#777f80':'#b8b4a7',.015,false,{kind:'paint'});
   if(!track.campus&&!a.street&&!['bh-2002','be-1925','sa-2021'].includes(track.id)){
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
  this.rubber();this.repairs();
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
   for(let i=0;i<=n;i++){const s=i*step,p=sampleGuide(track,s);for(const edge of [offset-.22,offset+.22]){positions.push(p.x+Math.cos(p.heading)*edge,p.y+.077,p.z-Math.sin(p.heading)*edge);uv.push(edge,i*.3);}
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
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,this.material('fence',color));mesh.receiveShadow=true;this.scene.group.add(mesh);
 }
 wet(wetness){
  const jeddah=this.track.id==='sa-2021',singapore=this.track.id==='sg-2008';
  for(const m of this.materials.values()){
   const kind=m.userData.surfaceKind;
   if(kind==='asphalt'){const coat=Math.max(singapore?.15:jeddah?.24:0,wetness*.72);if((m.clearcoat>0)!==(coat>0))m.needsUpdate=true;m.roughness=(singapore?.72:jeddah?.74:.86)-wetness*.48;m.clearcoat=coat;m.bumpScale=.018-wetness*.01;m.color.set(wetness?'#939b9f':'#ffffff');}
   else if(kind==='concrete'){m.roughness=(jeddah?.58:.92)-wetness*.18;if(jeddah||singapore)m.metalness=.06;}
   else if(kind==='paint'){m.roughness=(jeddah?.42:.9)-wetness*.28;if(jeddah||singapore)m.metalness=.12;}
  }
 }
 dispose(){for(const t of this.textures.values())t.dispose();this.textures.clear();this.materials.clear();}
}
