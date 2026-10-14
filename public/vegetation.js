import * as THREE from '/vendor/three.module.js';
import {sample,terrainHeight} from '/shared/tracks.mjs';
import {roadClearance} from '/shared/venues.mjs';

// Original leaf artwork and reusable meshes: no per-tree objects or animation.
function leafTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');let seed=927;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<1800;i++){
  const a=random()*Math.PI*2,r=Math.sqrt(random()),x=128+Math.cos(a)*r*116,y=128+Math.sin(a)*r*108;
  const light=24+random()*23+(1-y/256)*12;ctx.fillStyle=`hsl(${84+random()*30},${25+random()*24}%,${light}%)`;
  ctx.beginPath();ctx.ellipse(x,y,3+random()*6,2+random()*4,random()*Math.PI,0,Math.PI*2);ctx.fill();
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function canopyGeometry(){
 const p=[],uv=[],indices=[];
 for(const [cx,cy,cz,w,h] of [[0,6.8,0,7,5.5],[-2,6.1,.7,4.8,4.2],[1.8,7.2,-.8,4.6,4.5]])for(let a=0;a<3;a++){
  const angle=a*Math.PI/3+.3,n=p.length/3;
  for(const [x,y,u,v] of [[-w/2,-h/2,0,0],[w/2,-h/2,1,0],[w/2,h/2,1,1],[-w/2,h/2,0,1]]){p.push(cx+Math.cos(angle)*x,cy+y,cz+Math.sin(angle)*x);uv.push(u,v);}
  indices.push(n,n+1,n+2,n,n+2,n+3);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function palmGeometry(){
 const p=[],colors=[],indices=[];
 // Drooping individual leaflets leave open gaps instead of a flat solid fan.
 const triangle=(a,b,c,color)=>{const n=p.length/3;for(const v of [a,b,c]){p.push(...v);colors.push(...color);}indices.push(n,n+1,n+2);};
 for(let frond=0;frond<10;frond++){
  const angle=frond*Math.PI*2/10,reach=4.7+(frond%3)*.35,tipDrop=frond%2?1.6:2.8;
  const point=(t,side=0)=>{const r=t*reach,y=8.4+Math.sin(t*Math.PI)*1.1-t*t*tipDrop;return [Math.sin(angle)*r+Math.cos(angle)*side,y,Math.cos(angle)*r-Math.sin(angle)*side];};
  for(let i=1;i<13;i++){
   const t=i/13,width=Math.sin(t*Math.PI)*.85,color=[.17+(i%3)*.025,.33+(frond%3)*.035,.12];
   for(const side of [-1,1]){const root=point(t-.06),tip=point(t+.045,side*width),base=point(t+.025);tip[1]-=.2;triangle(root,tip,base,color);}
   triangle(point(t-.09,-.028),point(t+.02,0),point(t-.09,.028),[.32,.39,.16]);
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function addVegetation(scene,track,profile){
 const palms=profile.tropical||profile.desert,spacing=track.campus?38:profile.forest?24:profile.desert?165:55;
 const sites=[];
 for(let s=0;s<track.length;s+=spacing)for(const side of [-1,1]){
  const distance=track.width/2+(track.campus?17:25)+Math.abs(Math.sin(s*.017))*(track.campus?12:60),p=sample(track,s,side*distance);
  if(roadClearance(track,p.x,p.z)<(track.campus?6:12))continue;
  sites.push({...p,y:terrainHeight(track,p.x,p.z),scale:.78+Math.abs(Math.sin(s*1.91))*.55,angle:s*.13});
 }
 const trunkGeometry=new THREE.CylinderGeometry(palms?.19:.22,palms?.3:.52,palms?8.4:5.4,7),trunkMaterial=new THREE.MeshStandardMaterial({color:palms?'#89765e':'#6f6252',roughness:1});
 trunkGeometry.translate(0,palms?4.2:2.7,0);
 const foliageMaterial=new THREE.MeshStandardMaterial(palms?{vertexColors:true,side:THREE.DoubleSide,roughness:.94}:{map:leafTexture(),alphaTest:.45,side:THREE.DoubleSide,roughness:1});
 const trunks=new THREE.InstancedMesh(trunkGeometry,trunkMaterial,sites.length),foliage=new THREE.InstancedMesh(palms?palmGeometry():canopyGeometry(),foliageMaterial,sites.length),dummy=new THREE.Object3D();
 sites.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,palms?.025*Math.sin(p.angle):0);dummy.scale.set(p.scale,p.scale,p.scale);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);foliage.setMatrixAt(i,dummy.matrix);foliage.setColorAt(i,new THREE.Color().setHSL(.13,.09,.75+(i%5)*.035));});
 for(const mesh of [trunks,foliage]){mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.group.add(mesh);}
}
