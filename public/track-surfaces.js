import * as THREE from '/vendor/three.module.js';
import {sampleGuide,prepareRacingLine} from '/shared/racing-line.mjs';
import {angleDiff,wrap} from '/shared/tracks.mjs';
import {VENUES} from '/shared/venues.mjs';

export function trackAppearance(track){
 const theme=track.campus?'campus':VENUES[track.id]?.theme||'fields',street=track.urban&&!track.campus;
 const sand=['desert','dunes'].includes(theme),forest=['forest','alpine'].includes(theme);
 const colors={desert:'#aaa18b',dunes:'#929174',forest:'#596d4b',alpine:'#657451',tropical:'#657d51',coast:'#78876b',fields:'#79815b',campus:'#738360',skyline:'#777e78',city:'#78806c',neon:'#717579',marina:'#728681'};
 return {theme,street,sand,forest,ground:colors[theme]||'#74815a',kerb:track.id==='be-1925'?['#bd3729','#e8ba2d']:track.campus?['#35383a','#dfdccd']:['#bd3730','#e8e5dc'],runoff:track.id==='fr-1969'?'#376b9c':track.id==='ae-2009'?'#609ba5':track.id==='us-2012'?'#a34b40':'#548475',gravel:forest||theme==='fields',fog:street?.00044:sand?.00055:.00036};
}
function noiseTexture(kind){
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');let seed=1979;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const image=x.createImageData(256,256),base=kind==='asphalt'?86:kind==='gravel'?184:kind==='armco'?215:235;
 for(let i=0;i<image.data.length;i+=4){const n=(random()-.5)*(kind==='asphalt'?35:kind==='gravel'?65:24),v=base+n;image.data[i]=v;image.data[i+1]=v+(kind==='gravel'? -6:0);image.data[i+2]=v+(kind==='gravel'?-18:0);image.data[i+3]=255;}x.putImageData(image,0,0);
 if(kind==='asphalt'){
  for(let i=0;i<160;i++){const a=random()*256,b=random()*256;x.strokeStyle='rgba(26,29,31,.07)';x.lineWidth=.3+random()*.7;x.beginPath();x.moveTo(a,b);x.lineTo(a+random()*16-8,b+random()*45);x.stroke();}
 }else if(kind==='armco'){
  for(let y=0;y<256;y+=85){const g=x.createLinearGradient(0,y,0,y+85);g.addColorStop(0,'rgba(255,255,255,.25)');g.addColorStop(.3,'rgba(0,0,0,.20)');g.addColorStop(.7,'rgba(255,255,255,.32)');g.addColorStop(1,'rgba(0,0,0,.16)');x.fillStyle=g;x.fillRect(0,y,256,85);}
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
  const texture=this.texture(kind==='grass'?'paint':kind),m=kind==='asphalt'?new THREE.MeshPhysicalMaterial({color,map:texture,bumpMap:texture,bumpScale:.018,roughness:.86,clearcoat:0,clearcoatRoughness:.2}):new THREE.MeshStandardMaterial({color,map:texture,bumpMap:kind==='fence'?null:texture,bumpScale:kind==='gravel'?.045:.008,roughness:kind==='armco'?.46:.9,metalness:kind==='armco'?.45:0,vertexColors,side:THREE.DoubleSide,alphaTest:kind==='fence'?.35:0});
  m.userData.surfaceKind=kind;this.materials.set(key,m);return m;
 }
 build(){
  const scene=this.scene,track=this.track,half=track.width/2,a=this.appearance;
  for(const side of [-1,1]){
   const edge=side*half,limit=side*(half+(track.campus?1.8:6.5));scene.ribbon(track,Math.min(edge,limit),Math.max(edge,limit),a.ground,-.08,false,{kind:'grass'});
   const shoulder=side*(half+(a.street?.65:track.campus?1.4:1.6));scene.ribbon(track,Math.min(edge,shoulder),Math.max(edge,shoulder),a.street?'#777f80':'#b8b4a7',.015,false,{kind:'paint'});
   if(!track.campus&&!a.street){
    const lo=side*(half+1.6),hi=side*(half+6.3),kind=a.gravel?'gravel':'asphalt',color=a.gravel?'#c0b79d':'#a0a09a';scene.ribbon(track,Math.min(lo,hi),Math.max(lo,hi),color,.022,false,{kind,mask:this.outsideMask[side]});
    const p=side*(half+1.6),q=side*(half+3);scene.ribbon(track,Math.min(p,q),Math.max(p,q),a.runoff,.04,false,{kind:'paint',mask:this.outsideMask[side]});
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
  this.rubber();
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
 fence(walls){
  if(!walls.length)return;const positions=[],uv=[];let distance=0;
  for(const w of walls){const a=w.a,b=w.b,h=w.height,len=Math.hypot(b.x-a.x,b.z-a.z),u=distance/.6,v=(distance+len)/.6;distance+=len;
   for(const [p,t,y] of [[a,u,0],[b,v,0],[b,v,h],[a,u,0],[b,v,h],[a,u,h]]){positions.push(p.x,p.y+y,p.z);uv.push(t,y/.6);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,this.material('fence','#b6bebd'));mesh.receiveShadow=true;this.scene.group.add(mesh);
 }
 wet(wetness){
  for(const m of this.materials.values()){
   const kind=m.userData.surfaceKind;
   if(kind==='asphalt'){const coat=wetness*.72;if((m.clearcoat>0)!==(coat>0))m.needsUpdate=true;m.roughness=.86-wetness*.57;m.clearcoat=coat;m.bumpScale=.018-wetness*.01;m.color.set(wetness?'#939b9f':'#ffffff');}
   else if(kind==='paint'){m.roughness=.9-wetness*.36;}
  }
 }
 dispose(){for(const t of this.textures.values())t.dispose();this.textures.clear();this.materials.clear();}
}
