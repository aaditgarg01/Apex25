import * as THREE from '/vendor/three.module.js';
import {terrainHeight} from '/shared/tracks.mjs';
import {campusScale} from '/shared/campus.mjs';
import {roadClearance} from '/shared/venues.mjs';
import {batchBoxes} from './batching.js';

const palettes={
 hostel:{wall:'#e5d7b5',trim:'#a88968',glass:'#405f67',roof:'#bcb8aa'},
 academic:{wall:'#e9dfc9',trim:'#b19771',glass:'#527480',roof:'#c5c1b4'},
 research:{wall:'#d5dfdf',trim:'#93a8ab',glass:'#326374',roof:'#adb9b9'},
 auditorium:{wall:'#ddc9a6',trim:'#967556',glass:'#385963',roof:'#a99881'},
 shop:{wall:'#dec5a3',trim:'#8c6c54',glass:'#355663',roof:'#aca08c'}
};
function inside(points,x,z){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
function segmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}
function edgeDistance(points,x,z){let best=Infinity;for(let i=0;i<points.length;i++)best=Math.min(best,segmentDistance(x,z,points[i],points[(i+1)%points.length]));return best;}
function clearFootprint(track,points){
 const pad=track.width/2+3,minX=Math.min(...points.map(p=>p[0]))-pad,maxX=Math.max(...points.map(p=>p[0]))+pad,minZ=Math.min(...points.map(p=>p[1]))-pad,maxZ=Math.max(...points.map(p=>p[1]))+pad;
 for(const p of track.points){if(p.x<minX||p.x>maxX||p.z<minZ||p.z>maxZ)continue;if(inside(points,p.x,p.z)||edgeDistance(points,p.x,p.z)<pad)return false;}
 return true;
}
function facade(kind){
 const p=palettes[kind],c=document.createElement('canvas');c.width=256;c.height=256;const x=c.getContext('2d');
 x.fillStyle=p.wall;x.fillRect(0,0,256,256);
 // One repeated floor and window bay, measured in metres by the wall UVs.
 x.fillStyle=p.trim;x.fillRect(0,229,256,19);x.fillStyle='#ffffff50';x.fillRect(0,226,256,3);x.fillStyle='#00000018';x.fillRect(0,248,256,8);
 const left=kind==='research'?10:37,top=kind==='research'?24:52,w=256-left*2,h=kind==='research'?197:144;
 x.fillStyle='#00000024';x.fillRect(left+5,top+6,w,h);x.fillStyle=p.trim;x.fillRect(left,top,w,h);
 const gradient=x.createLinearGradient(0,top,0,top+h);gradient.addColorStop(0,'#8faab1');gradient.addColorStop(.45,p.glass);gradient.addColorStop(1,'#263c45');x.fillStyle=gradient;x.fillRect(left+6,top+6,w-12,h-12);
 x.fillStyle='#d7d9ce';x.fillRect(125,top+6,5,h-12);x.fillRect(left+6,top+h*.54,w-12,4);
 x.fillStyle='#d6e8e326';x.beginPath();x.moveTo(left+12,top+10);x.lineTo(left+w*.6,top+10);x.lineTo(left+12,top+h*.8);x.fill();
 if(kind==='hostel'){x.fillStyle='#cfba94';x.fillRect(left-5,top+h, w+10,10);x.fillStyle='#00000020';x.fillRect(left-5,top+h+10,w+10,6);}
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;
 return new THREE.MeshStandardMaterial({map:texture,roughness:kind==='research'?.42:.77,metalness:kind==='research'?.15:.04});
}
const wallUV={
 generateTopUV(g,v,a,b,c){return [a,b,c].map(i=>new THREE.Vector2(v[i*3],v[i*3+1]));},
 generateSideWallUV(g,v,a,b,c,d){const span=Math.hypot(v[a*3]-v[b*3],v[a*3+1]-v[b*3+1])/3.8;return [new THREE.Vector2(0,v[a*3+2]/3.4),new THREE.Vector2(span,v[b*3+2]/3.4),new THREE.Vector2(span,v[c*3+2]/3.4),new THREE.Vector2(0,v[d*3+2]/3.4)];}
};
function sideGeometry(shape,height){
 const full=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,UVGenerator:wallUV}),walls=new THREE.BufferGeometry(),groups=full.groups.filter(g=>g.materialIndex===1);
 for(const [name,attribute] of Object.entries(full.attributes)){
  const count=groups.reduce((sum,g)=>sum+g.count*attribute.itemSize,0),array=new Float32Array(count);let offset=0;
  for(const g of groups){const part=attribute.array.subarray(g.start*attribute.itemSize,(g.start+g.count)*attribute.itemSize);array.set(part,offset);offset+=part.length;}
  walls.setAttribute(name,new THREE.BufferAttribute(array,attribute.itemSize));
 }
 full.dispose();return walls;
}
function label(text){
 const c=document.createElement('canvas');c.width=768;c.height=128;const x=c.getContext('2d');x.fillStyle='#173c32';x.fillRect(0,0,768,128);x.fillStyle='#d6b756';x.fillRect(0,0,768,7);x.fillStyle='#f6f4e9';x.font='bold 46px Arial';x.textAlign='center';x.fillText(text.toUpperCase(),384,82,728);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
}

export class CampusBuildings{
 constructor(scene,track){
  this.scene=scene;this.track=track;this.group=scene.group;this.details=new THREE.Group();this.group.add(this.details);this.styles=new Map();
  this.tankMaterial=new THREE.MeshStandardMaterial({color:'#343b3b',roughness:.8});
 }
 add(f){
  const raw=f.points.filter((p,i)=>i===0||p[0]!==f.points[i-1][0]||p[1]!==f.points[i-1][1]);
  if(raw.length>3&&Math.hypot(raw[0][0]-raw.at(-1)[0],raw[0][1]-raw.at(-1)[1])<.1)raw.pop();
  if(raw.length<3)return false;
  const cx=raw.reduce((s,p)=>s+p[0],0)/raw.length,cz=raw.reduce((s,p)=>s+p[1],0)/raw.length,scale=campusScale(this.track);
  // Move the mapped building centres with the enlarged racing layout while
  // keeping each footprint's proportions and physical storey height intact.
  const points=raw.map(([x,z])=>[cx*scale+x-cx,cz*scale+z-cz]);if(!clearFootprint(this.track,points))return false;
  const area=Math.abs(points.reduce((s,p,i)=>s+p[0]*points[(i+1)%points.length][1]-points[(i+1)%points.length][0]*p[1],0))/2;
  const name=(f.name||'').replace(/^Perl Research Park$/i,'Pearl Research Park'),lower=name.toLowerCase(),north=this.track.origin.lat-cz/111320>12.97235;
  const kind=/research|pe[ar]*l/.test(lower)?'research':/auditorium|stadium/.test(lower)?'auditorium':/food|bakery|bites|store|laundry|plaza/.test(lower)||['retail','kiosk'].includes(f.buildingType)?'shop':f.buildingType==='dormitory'||north&&area>450?'hostel':'academic';
  if(!this.styles.has(kind))this.styles.set(kind,{walls:facade(kind),roof:new THREE.MeshStandardMaterial({color:palettes[kind].roof,roughness:.9})});
  const style=this.styles.get(kind),height=Math.max(3.4,f.heightEstimated&&kind==='shop'?4.2:f.heightEstimated&&kind==='hostel'?Math.max(f.height,20.4):f.height),y=terrainHeight(this.track,cx*scale,cz*scale)-.3;
  const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const body=new THREE.Mesh(sideGeometry(shape,height),style.walls);body.rotation.x=-Math.PI/2;body.position.y=y;body.userData.mappedStatic=true;body.castShadow=true;body.receiveShadow=true;this.group.add(body);
  const roof=new THREE.Mesh(new THREE.ShapeGeometry(shape),style.roof);roof.rotation.x=-Math.PI/2;roof.position.y=y+height;roof.userData.mappedStatic=true;roof.receiveShadow=true;this.group.add(roof);
  let entrance=null,best=Infinity;
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<1)continue;
   const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,heading=Math.atan2(dx,dz);
   const parapet=this.scene.box(.28,.6,length,palettes[kind].trim,x,y+height+.3,z,this.details);parapet.rotation.y=heading;
   if(length<7)continue;
   const distance=roadClearance(this.track,x,z);if(distance<best){let nx=dz/length,nz=-dx/length;if(nx*(x-cx*scale)+nz*(z-cz*scale)<0){nx=-nx;nz=-nz;}entrance={x,z,nx,nz,heading,length};best=distance;}
  }
  if(entrance){
   const e=entrance,doorHeight=height<4?2.2:2.7,door=this.scene.box(.12,doorHeight,2.4,'#345763',e.x+e.nx*.08,y+doorHeight/2,e.z+e.nz*.08,this.details);door.rotation.y=e.heading;
   if(height>=4&&roadClearance(this.track,e.x+e.nx*1.2,e.z+e.nz*1.2)>3.5){const canopy=this.scene.box(2.6,.22,Math.min(8,e.length-1),palettes[kind].trim,e.x+e.nx*1.2,y+3.2,e.z+e.nz*1.2,this.details);canopy.rotation.y=e.heading;}
   if(name){const board=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(9,e.length-1),.95),label(name));board.position.set(e.x+e.nx*.22,y+Math.min(4.15,height-.8),e.z+e.nz*.22);board.rotation.y=Math.atan2(e.nx,e.nz);this.details.add(board);}
  }
  // Place roof equipment only on solid roof area, never over courtyard holes.
  const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minZ=Math.min(...points.map(p=>p[1])),maxZ=Math.max(...points.map(p=>p[1]));let panels=0,tank=false;
  for(let x=minX+4;x<maxX-3;x+=5)for(let z=minZ+4;z<maxZ-3;z+=4){
   if(!inside(points,x,z)||edgeDistance(points,x,z)<3)continue;
   if(!tank&&area>450){const equipment=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,1.8,8),this.tankMaterial);equipment.position.set(x,y+height+.9,z);equipment.userData.mappedStatic=true;this.group.add(equipment);tank=true;continue;}
   if(panels>=Math.min(12,Math.floor(area/100)))continue;
   const panel=this.scene.box(3,.12,1.7,'#2b485a',x,y+height+.18,z,this.details);panel.rotation.x=.12;panels++;
  }
  return true;
 }
 finish(){batchBoxes(this.details);if(!this.styles.size)this.tankMaterial.dispose();}
}
