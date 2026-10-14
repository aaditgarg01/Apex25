import * as THREE from '/vendor/three.module.js';
import {sample,wrap,angleDiff} from '/shared/tracks.mjs';
import {ribbonOffset} from '/shared/surface.mjs';
import {roadClearance,safeBoxSite} from '/shared/venues.mjs';
import {spaRunoff,spaBoundaryOffset} from '/shared/spa.mjs';
import {SPA_LANDMARKS} from '/shared/spa-landmarks.mjs';
import {trackSign,addFacadePanels,addBrakingBoards} from './track-furniture.js';
import {buildingFacade} from './campus-buildings.js';

const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.86,...extra}),cache=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
function local(track,[lon,lat]){return{x:(lon-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(lat-track.origin.lat)*111320};}
function layout(track){
 if(cache.has(track))return cache.get(track);
 const heights=track.points.filter((_,i)=>i%6===0).map((p,i)=>({...p,s:i*6*track.step,index:i*6})),mapped=SPA_LANDMARKS.features.map(f=>{
  const points=f.points.slice(0,-1).map(p=>local(track,p)),x=points.reduce((sum,p)=>sum+p.x,0)/points.length,z=points.reduce((sum,p)=>sum+p.z,0)/points.length;let nearest=heights[0],distance=Infinity;for(const p of heights){const d=Math.hypot(p.x-x,p.z-z);if(d<distance){distance=d;nearest=p;}}
  const h=nearest.heading,ps=points.map(p=>({x:(p.x-x)*Math.cos(h)-(p.z-z)*Math.sin(h),z:(p.x-x)*Math.sin(h)+(p.z-z)*Math.cos(h)}));return{id:f.way,name:f.tags.name,x,z,y:nearest.groundY-.16,heading:h,width:Math.max(...ps.map(p=>p.x))-Math.min(...ps.map(p=>p.x)),length:Math.max(...ps.map(p=>p.z))-Math.min(...ps.map(p=>p.z)),s:nearest.s,side:Math.sign((x-nearest.x)*Math.cos(h)-(z-nearest.z)*Math.sin(h)),points};
 });
 const cliffs=[[1000,-1,100],[3600,1,78],[5300,-1,85]].map(([s,side,offset])=>({...sample(track,s,side*offset),s,side,offset}));
 const data={heights,mapped,pits:mapped.filter(p=>p.name.startsWith('Stand ')),pads:mapped.filter(p=>!p.name.startsWith('Stand ')),cliffs};cache.set(track,data);return data;
}
export function spaTerrainHeight(track,x,z,cell=0){
 const data=layout(track);let closest=data.heights[0],distance=Infinity,total=0,weight=0,floor=Infinity;
 for(const p of data.heights){const d=(x-p.x)**2+(z-p.z)**2;if(d<distance){distance=d;closest=p;}const w=1/(d+1600)**1.3;total+=p.groundY*w;weight+=w;if(d<(track.width/2+Math.SQRT2*cell+12)**2)floor=Math.min(floor,p.y-.95);}
 const away=smooth((Math.sqrt(distance)-track.width/2-10)/45),contours=total/weight,rolling=18*Math.sin(x*.004-z*.002)+11*Math.cos(z*.006+x*.0015),bank=7*(.5+.5*Math.sin(closest.s*.011));
 let y=closest.groundY-.95+away*(contours-closest.groundY+rolling+bank);
 for(const cliff of data.cliffs)y+=away*15*Math.exp(-((x-cliff.x)**2+(z-cliff.z)**2)/3500);
 for(const p of data.pits){const dx=x-p.x,dz=z-p.z,lx=dx*Math.cos(p.heading)-dz*Math.sin(p.heading),lz=dx*Math.sin(p.heading)+dz*Math.cos(p.heading),d=Math.max(Math.abs(lx)-p.width/2,Math.abs(lz)-p.length/2),blend=1-smooth(d/14);if(blend>0)y+=(sample(track,p.s+clamp(lz,-p.length/2,p.length/2)).y-.5-y)*blend;}
 for(const p of data.pads){const dx=x-p.x,dz=z-p.z,d=Math.max(Math.abs(dx*Math.cos(p.heading)-dz*Math.sin(p.heading))-p.width/2,Math.abs(dx*Math.sin(p.heading)+dz*Math.cos(p.heading))-p.length/2),blend=1-smooth(d/14);if(blend>0)y+=(p.y-.18-y)*blend;}
 return Number.isFinite(floor)?Math.min(y,floor):y;
}
function mesh(parent,geo,mat,x=0,y=0,z=0,staticGeometry=true){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;o.userData.mappedStatic=staticGeometry;parent.add(o);return o;}
function group(scene,p,h=p.heading){const g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=h;scene.group.add(g);return g;}
function beam(scene,parent,a,b,color='#929e9d',width=.13){const v=b.clone().sub(a),o=scene.box(width,v.length(),width,color,...a.clone().add(b).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
function occupied(track,x,z,reservations=[],pad=5){return [...layout(track).mapped,...reservations].some(p=>{const dx=x-p.x,dz=z-p.z;return Math.abs(dx*Math.cos(p.heading)-dz*Math.sin(p.heading))<p.width/2+pad&&Math.abs(dx*Math.sin(p.heading)+dz*Math.cos(p.heading))<p.length/2+pad;});}
function envelopeClear(track,p,width,length,margin=3){for(let z=-length/2;z<=length/2;z+=6)for(const x of [-width/2,0,width/2]){if(roadClearance(track,p.x+Math.cos(p.heading)*x+Math.sin(p.heading)*z,p.z-Math.sin(p.heading)*x+Math.cos(p.heading)*z)<margin)return false;}return true;}
function eventSite(track,s,halfWidth,halfLength,side,margin){
 let p=safeBoxSite(track,s,halfWidth,halfLength,side,margin);const center=sample(track,s);let offset=Math.abs((p.x-center.x)*Math.cos(center.heading)-(p.z-center.z)*Math.sin(center.heading));
 for(let attempt=0;attempt<45;attempt++){let blocked=false;for(const x of [-halfWidth,0,halfWidth])for(const z of [-halfLength,0,halfLength]){const wx=p.x+Math.cos(p.heading)*x+Math.sin(p.heading)*z,wz=p.z-Math.sin(p.heading)*x+Math.cos(p.heading)*z;if(occupied(track,wx,wz,[],4))blocked=true;}if(!blocked&&envelopeClear(track,p,halfWidth*2,halfLength*2))return{...p,y:spaTerrainHeight(track,p.x,p.z)};offset+=14;p=sample(track,s,side*offset);}
 return{...p,y:spaTerrainHeight(track,p.x,p.z)};
}
function outsideRunoff(track,x,z){let nearest=layout(track).heights[0],distance=Infinity;for(const p of layout(track).heights){const d=Math.hypot(x-p.x,z-p.z);if(d<distance){distance=d;nearest=p;}}const side=Math.sign((x-nearest.x)*Math.cos(nearest.heading)-(z-nearest.z)*Math.sin(nearest.heading))||1;return distance>spaBoundaryOffset(track,nearest.index,side)+8;}
function pineGeometry(){
 const positions=[],colors=[],uv=[],indices=[];let seed=1948;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let tier=0;tier<7;tier++){
  const base=4+tier*1.95,radius=4.4-tier*.48,tip=base+4.4-tier*.2,n=positions.length/3;
  for(let i=0;i<12;i++){const angle=i*Math.PI/6+tier*.41,r=radius*(.82+random()*.25),y=base-.4-random()*.5;positions.push(Math.cos(angle)*r,y,Math.sin(angle)*r);colors.push(.46+random()*.1,.60+random()*.09,.40+random()*.06);uv.push(i/12,0);}
  positions.push(0,tip,0);colors.push(.65,.78,.56);uv.push(.5,1);for(let i=0;i<12;i++){indices.push(n+i,n+(i+1)%12,n+12);}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
function woodland(scene,track,reservations){
 const sites=[],cells=new Map();let seed=373;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const add=(x,z,scale)=>{if(!outsideRunoff(track,x,z)||occupied(track,x,z,reservations,9))return;sites.push({x,z,y:spaTerrainHeight(track,x,z),scale,angle:random()*Math.PI*2});};
 for(let s=0;s<track.length;s+=13)for(const side of [-1,1])for(let band=0;band<5;band++){const index=Math.floor(s/track.step),offset=spaBoundaryOffset(track,index,side)+14+band*23+random()*8,p=sample(track,s+random()*7,side*offset);add(p.x,p.z,.8+random()*.65);}
 // Distant ridgelines fill the gaps between the near forest walls.
 const minX=Math.min(...track.points.map(p=>p.x))-480,maxX=Math.max(...track.points.map(p=>p.x))+480,minZ=Math.min(...track.points.map(p=>p.z))-480,maxZ=Math.max(...track.points.map(p=>p.z))+480;
 for(let i=0;i<2200;i++)add(minX+random()*(maxX-minX),minZ+random()*(maxZ-minZ),1+random()*.6);
 for(const p of sites){const key=Math.floor(p.x/140)+':'+Math.floor(p.z/140);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(p);}
 const crown=pineGeometry(),needle=material('#395a35',{vertexColors:true,side:THREE.DoubleSide,roughness:.97}),trunkGeo=new THREE.CylinderGeometry(.16,.45,10,6),bark=material('#6b6150'),dummy=new THREE.Object3D();
 for(const trees of cells.values()){
  const foliage=new THREE.InstancedMesh(crown,needle,trees.length),trunks=new THREE.InstancedMesh(trunkGeo,bark,trees.length);
  trees.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(p.scale,p.scale,p.scale);dummy.updateMatrix();foliage.setMatrixAt(i,dummy.matrix);foliage.setColorAt(i,new THREE.Color().setHSL(.28+random()*.04,.23+random()*.08,.62+random()*.16));dummy.position.y+=p.scale*5;dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);});
  for(const o of [foliage,trunks]){o.computeBoundingSphere();o.castShadow=true;o.receiveShadow=true;scene.group.add(o);}
 }
 // Tufts and mossy verge growth, kept outside the expanded runoff envelope.
 const grassSites=sites.filter((_,i)=>i%4===0),tufts=new THREE.InstancedMesh(new THREE.ConeGeometry(.5,.95,5),material('#6c7946'),grassSites.length);grassSites.forEach((p,i)=>{dummy.position.set(p.x+1,p.y+.48,p.z-1);dummy.rotation.set(0,p.angle,.05);dummy.scale.set(2,1,1);dummy.updateMatrix();tufts.setMatrixAt(i,dummy.matrix);});tufts.computeBoundingSphere();scene.group.add(tufts);
 scene.group.userData.spaForest={trees:sites.length,chunks:cells.size};
}
function rockFaces(scene,track){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#97998a';ctx.fillRect(0,0,256,256);for(let i=0;i<90;i++){const y=(i*41)%256;ctx.strokeStyle=i%3?'#6e766979':'#c4c7b369';ctx.lineWidth=1+i%3;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y+Math.sin(i)*16);ctx.stroke();}const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;const stone=material('#9c9e8c',{map:texture,bumpMap:texture,bumpScale:.38});
 for(const c of layout(track).cliffs){const positions=[],uv=[],indices=[];for(let i=0;i<=24;i++){const s=c.s-48+i*4,p=sample(track,s,c.side*(c.offset-14)),q=sample(track,s,c.side*(c.offset+14)),lo=spaTerrainHeight(track,p.x,p.z),hi=Math.max(lo+4,spaTerrainHeight(track,q.x,q.z));positions.push(p.x,lo-.4,p.z,q.x,hi+.15,q.z);uv.push(i*.7,0,i*.7,(hi-lo)/4);if(i<24){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();mesh(scene.group,geo,stone);}
}
function flagMaterial(style){const c=document.createElement('canvas');c.width=240;c.height=150;const ctx=c.getContext('2d');if(style==='Belgium'){for(let i=0;i<3;i++){ctx.fillStyle=['#212529','#edc52c','#c53534'][i];ctx.fillRect(i*80,0,80,150);}}else if(style==='Europe'){ctx.fillStyle='#254c95';ctx.fillRect(0,0,240,150);ctx.fillStyle='#eac83a';for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.beginPath();ctx.arc(120+Math.sin(a)*43,75+Math.cos(a)*43,3.8,0,Math.PI*2);ctx.fill();}}else{ctx.fillStyle='#ed7e2e';ctx.fillRect(0,0,240,150);ctx.fillStyle='#fff6e7';ctx.font='bold 39px Arial';ctx.textAlign='center';ctx.fillText('RACING',120,92);}const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;return material('#ffffff',{map,side:THREE.DoubleSide});}
function spectators(parent,rows,columns,width,length,base,flags){
 const count=rows*columns,bodies=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.18,.29,2,5),material('#ffffff'),count),heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.115,6,5),material('#ffffff'),count),dummy=new THREE.Object3D();
 for(let i=0;i<count;i++){const row=Math.floor(i/columns);dummy.position.set(width/2-.8-row*(width-1)/rows,base+.92+row*.6,-length/2+1+(i%columns)*(length-2)/(columns-1));dummy.rotation.set(0,0,Math.sin(i)*.04);dummy.scale.set(1,1,.9);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);bodies.setColorAt(i,new THREE.Color(['#ec7829','#ec7829','#d64239','#e7d840','#2e6584','#eee9d5','#315d47','#273840'][i%8]));dummy.position.y+=.44;dummy.scale.setScalar(1);dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);heads.setColorAt(i,new THREE.Color(['#d3b18c','#b38b66','#debfa0'][i%3]));}
 for(const o of [bodies,heads]){o.computeBoundingSphere();parent.add(o);}const materials=['Belgium','Europe','Orange'].map(flagMaterial);
 for(let i=0;i<Math.ceil(length/12);i++){const row=3+i%Math.max(1,rows-3),x=width/2-.8-row*(width-1)/rows,y=base+1.8+row*.6,z=-length*.45+i*11;mesh(parent,new THREE.CylinderGeometry(.016,.016,1.7,5),material('#b1bcb9'),x,y,z);const flag=mesh(parent,new THREE.PlaneGeometry(1.2,.75,8,2),materials[i%3],x+.6,y+.45,z,false);flag.castShadow=false;flags.push(flag);}
}
function stand(scene,track,p,flags,covered=true,banked=false){
 let width=Math.min(35,p.width),length=p.length;while((width>10||length>30)&&!envelopeClear(track,p,width+3,length+4)){width*=.95;length*=.95;}if(!envelopeClear(track,p,width,length))return null;
 const g=group(scene,p,p.heading+(p.side>0?Math.PI:0)),rows=clamp(Math.floor(width/1.3),8,24),columns=Math.max(20,Math.floor(length/.85));
 if(banked){const shape=new THREE.Shape();shape.moveTo(width/2+1,0);shape.lineTo(-width/2,rows*.6);shape.lineTo(-width/2-9,rows*.6);shape.lineTo(-width/2-19,0);shape.closePath();mesh(g,new THREE.ExtrudeGeometry(shape,{depth:length,bevelEnabled:false}),scene.surfaces.material('grass','#567449'),0,0,-length/2);}
 for(let row=0;row<rows;row++){const h=.45+row*.6,x=width/2-.8-row*(width-1)/rows;scene.box(width/rows+.06,banked?.18:h,length,banked?'#8a826e':'#aab0a9',x,banked?h:h/2,0,g);scene.box(.4,.10,length,'#8e7050',x,h+.08,0,g);}
 spectators(g,rows,columns,width,length,0,flags);
 if(covered){const positions=[],uv=[],indices=[],height=rows*.6+4;for(let i=0;i<=16;i++)for(const z of [-length/2-2,length/2+2]){const t=i/16,x=(t-.5)*(width+6),y=height+3*Math.sin(t*Math.PI)+.5*t;positions.push(x,y,z);uv.push(t*6,z/12);if(i<16&&z<0){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();mesh(g,geo,material('#c2c9c7',{side:THREE.DoubleSide,metalness:.2,roughness:.65}));for(let z=-length/2;z<=length/2;z+=14){scene.box(.28,height,.28,'#9caaa9',-width/2,height/2,z,g);beam(scene,g,new THREE.Vector3(-width/2,height-2,z),new THREE.Vector3(width/2+2,height+.4,z),'#c2cac7',.2);}}
 const sign=trackSign(p.name.toUpperCase(),Math.min(48,length-4),1.1,'#183f37','#e0d29b');sign.position.set(width/2+.1,1.1,0);sign.rotation.y=Math.PI/2;g.add(sign);return{...p,width:width+(banked?30:6),length:length+6};
}
function buildings(scene,track,flags){
 const data=layout(track),reservations=[];
 for(const p of data.mapped.filter(p=>p.name.startsWith('Tribune ')||p.name==='Grandstand Silver 1')){const r=stand(scene,track,p,flags,p.name!=='Grandstand Silver 1');if(r)reservations.push(r);}
 for(const p of data.mapped.filter(p=>p.name.startsWith('Stand '))){const chunks=Math.ceil(p.length/24),size=p.length/chunks,facade=buildingFacade('research');for(let i=0;i<chunks;i++){const z=-p.length/2+(i+.5)*size,q={...p,x:p.x+Math.sin(p.heading)*z,z:p.z+Math.cos(p.heading)*z,y:sample(track,p.s+z).y-.2};let width=p.width;while(width>8&&!envelopeClear(track,q,width+1,size))width*=.9;if(!envelopeClear(track,q,width,size))continue;const g=group(scene,q),h=p.name==='Stand F1'?12:5.5;scene.box(width,h,size,'#b4b9b3',0,h/2,0,g);scene.box(width+1,.35,size+.1,'#8c999c',0,h+.18,0,g);addFacadePanels(g,width,h,size,facade);scene.box(.12,2.9,size-1,'#364c55',-p.side*(width/2+.08),1.6,0,g);scene.box(.14,.35,size-1,'#bb3835',-p.side*(width/2+.18),3.3,0,g);if(i%3===0)scene.box(3,1,4,'#7f8c89',0,h+.85,0,g);}}
 const chalet=data.mapped.find(p=>p.name==="Hotel de l'Eau Rouge"),g=group(scene,chalet),w=chalet.width,l=chalet.length,h=6.4;
 scene.box(w,h,l,'#ede8dd',0,h/2,0,g);for(const x of [-w/2-.03,w/2+.03]){for(let z=-l/2;z<=l/2;z+=3)scene.box(.1,h,.15,'#963b37',x,h/2,z,g);for(const y of [.25,3.2,6.2])scene.box(.12,.18,l,'#963b37',x,y,0,g);for(let z=-l/2+1.5;z<l/2;z+=3)for(const y of [1.9,4.7])scene.box(.13,1.4,1.1,'#3a555b',x,y,z,g);}
 for(const z of [-l/2-.04,l/2+.04]){for(let x=-w/2;x<=w/2;x+=3)scene.box(.14,h,.1,'#983c37',x,h/2,z,g);for(const y of [.2,3.2,6.2])scene.box(w,.18,.1,'#983c37',0,y,z,g);}
 const roof=new THREE.Shape();roof.moveTo(-w/2-1,h);roof.lineTo(0,h+4);roof.lineTo(w/2+1,h);roof.closePath();mesh(g,new THREE.ExtrudeGeometry(roof,{depth:l+2,bevelEnabled:false}),material('#8f3630'),0,0,-l/2-1);scene.box(1.2,3,1.3,'#bda48b',w*.22,h+3,0,g);
 const name=trackSign("L'EAU ROUGE",w-3,1,'#963b36','#f2e8d8');name.position.set(0,3.4,-l/2-.13);name.rotation.y=Math.PI;g.add(name);
 const annex=data.mapped.find(p=>p.name==="Salons de l'Eau Rouge"),shape=new THREE.Shape();annex.points.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();const lounge=mesh(scene.group,new THREE.ExtrudeGeometry(shape,{depth:2.8,bevelEnabled:false}),material('#d7d8cb'),0,chalet.y-.1,0);lounge.rotation.x=-Math.PI/2;
 // Additional open-air terraces follow the natural banks of Pouhon and the Kemmel crest.
 for(const [s,side,width,length,name] of [[3650,-1,22,86,'POUHON'],[3790,-1,19,72,'POUHON TERRACE'],[1310,1,21,76,'KEMMEL'],[2700,1,19,64,'BRUXELLES']]){const p=safeBoxSite(track,s,width/2+10,length/2+5,side,23),r=stand(scene,track,{...p,y:spaTerrainHeight(track,p.x,p.z),width,length,side,name},flags,false,true);if(r)reservations.push(r);}
 return reservations;
}
function runoff(scene,track){
 const plan=spaRunoff(track),n=track.points.length;
 for(const side of [-1,1]){const positions=[],uv=[],colors=[],indices=[];for(let i=0;i<=n;i++){const j=i%n,p=track.points[j],inner=track.width/2+1.6,outer=spaBoundaryOffset(track,j,side)-.5;for(const band of [0,.38,.66,1]){const offset=side*(inner+(outer-inner)*band),color=new THREE.Color(band<.66?'#656b69':'#c1b593');positions.push(p.x+Math.cos(p.heading)*offset,p.y+.036,p.z-Math.sin(p.heading)*offset);uv.push(offset/4,i*track.step/4);colors.push(color.r,color.g,color.b);}if(i<n&&plan.extra[side][j]>.5)for(let band=0;band<3;band++){const a=i*4+band;indices.push(a,a+4,a+1,a+1,a+4,a+5);}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const apron=mesh(scene.group,geo,scene.surfaces.material('asphalt','#ffffff',true));apron.castShadow=false;
  // The far edge is a separate textured gravel bed; original red/yellow kerbs remain intact.
  const gp=[],guv=[],gi=[];for(let i=0;i<=n;i++){const j=i%n,p=track.points[j],a=track.width/2+1.6,b=spaBoundaryOffset(track,j,side)-.55;for(const f of [.66,1]){const offset=side*(a+(b-a)*f);gp.push(p.x+Math.cos(p.heading)*offset,p.y+.039,p.z-Math.sin(p.heading)*offset);guv.push(offset/3,i*track.step/3);}if(i<n&&plan.extra[side][j]>5){const k=i*2;gi.push(k,k+2,k+1,k+1,k+2,k+3);}}const gravel=new THREE.BufferGeometry();gravel.setAttribute('position',new THREE.Float32BufferAttribute(gp,3));gravel.setAttribute('uv',new THREE.Float32BufferAttribute(guv,2));gravel.setIndex(gi);gravel.computeVertexNormals();mesh(scene.group,gravel,scene.surfaces.material('gravel','#c6b99f')).castShadow=false;
 }
}
function safety(scene,track){
 const tyres=[],belts=[],dummy=new THREE.Object3D();
 for(let s=30;s<track.length;s+=1.2){const i=Math.floor(s/track.step),a=sample(track,s-15),b=sample(track,s+15),k=angleDiff(b.heading,a.heading);if(Math.abs(k)<.11)continue;const side=-Math.sign(k),offset=spaBoundaryOffset(track,i,side)+.8,p=sample(track,s,side*offset);for(let row=0;row<2;row++)for(let level=0;level<3;level++)tyres.push({x:p.x+Math.cos(p.heading)*side*row*.8,z:p.z-Math.sin(p.heading)*side*row*.8,y:p.y+.19+level*.31});if(Math.floor(s/1.2)%3===0)belts.push({...p,side});}
 const stack=new THREE.InstancedMesh(new THREE.TorusGeometry(.32,.12,5,8),material('#171c1c'),tyres.length);tyres.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(Math.PI/2,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();stack.setMatrixAt(i,dummy.matrix);});stack.computeBoundingSphere();stack.castShadow=true;scene.group.add(stack);for(const p of belts){const o=scene.box(.09,.76,3.7,'#252b29',p.x-Math.cos(p.heading)*p.side*.44,p.y+.45,p.z+Math.sin(p.heading)*p.side*.44);o.rotation.y=p.heading;}
}
function utilities(scene,track,panels,reservations){
 for(let i=0;i<17;i++){
  const s=(i+.25)/17*track.length,index=Math.floor(s/track.step),side=i%2?1:-1,p=eventSite(track,s,4,5,side,spaBoundaryOffset(track,index,side)-track.width/2+8),g=group(scene,{...p,y:spaTerrainHeight(track,p.x,p.z)});reservations.push({...p,width:9,length:12});
  scene.box(.18,2.4,.18,'#ed792b',-2,1.2,0,g);scene.box(.18,2.4,.18,'#ed792b',2,1.2,0,g);for(const y of [.6,1.2,1.8])scene.box(4,.09,.1,'#ec7b2e',0,y,0,g);scene.box(3.8,.11,.11,'#b6c2be',0,2.2,0,g);
  for(let j=0;j<3;j++){const x=-.7+j*.64;scene.box(.32,.64,.26,'#ed7d2b',x,1.05,-1.2,g);for(const leg of [-.1,.1])scene.box(.13,.73,.15,'#d76425',x+leg,.38,-1.2,g);mesh(g,new THREE.SphereGeometry(.14,8,6),material('#eee9da'),x,1.54,-1.2);scene.box(.23,.07,.03,'#3a4e53',x,1.54,-1.07,g);}
  const handFlag=mesh(g,new THREE.PlaneGeometry(.6,.45),material('#e5bf31',{side:THREE.DoubleSide}),1.1,1.7,-1.2);handFlag.rotation.z=-.18;scene.box(.025,1.3,.025,'#9fafa9',.8,1.2,-1.2,g);
  const warning=new THREE.MeshBasicMaterial({color:'#31d388',toneMapped:false}),sign=mesh(g,new THREE.PlaneGeometry(1.35,.8),warning,0,3.1,.11,false);sign.castShadow=false;scene.box(1.5,.94,.18,'#344542',0,3.1,0,g);scene.box(.1,3,.1,'#b3beb8',0,1.5,0,g);panels.push({s,material:warning});
  scene.box(.1,5,.1,'#abb9b7',-3,2.5,-1,g);scene.box(.7,.24,.35,'#939f9e',-3.2,4.85,-1,g);scene.box(.12,.14,.27,'#243b44',-3.62,4.85,-1,g);
  if(i%4===0){const tower=group(scene,{...p,x:p.x+Math.cos(p.heading)*side*8,z:p.z-Math.sin(p.heading)*side*8,y:spaTerrainHeight(track,p.x,p.z)});for(const x of [-2,2])for(const z of [-2,2])scene.box(.13,21,.13,'#859492',x,10.5,z,tower);for(let y=0;y<21;y+=3)for(const z of [-2,2])beam(scene,tower,new THREE.Vector3(-2,y,z),new THREE.Vector3(2,y+3,z),'#929d9a',.1);scene.box(5,.17,5,'#727e79',0,19.7,0,tower);scene.box(1.1,.65,.7,'#36454a',0,21,0,tower);scene.box(.34,.32,.5,'#1c2e38',0,21,.62,tower);}
 }
 for(const [s,side] of [[1150,1],[3640,-1],[5730,1]]){
  const p=eventSite(track,s,7,9,side,30),g=group(scene,{...p,y:spaTerrainHeight(track,p.x,p.z)});reservations.push({...p,width:16,length:20});
  scene.box(3.2,1.1,6.7,'#ed8130',0,.9,0,g);scene.box(2.4,2.1,2.6,'#d87526',0,2.35,-1,g);scene.box(2.3,1.2,2.7,'#526d76',0,2.85,-1,g);
  for(const x of [-1.6,1.6])for(const z of [-2.25,2.25]){const wheel=mesh(g,new THREE.CylinderGeometry(.85,.85,.48,12),material('#222826'),x,.85,z);wheel.rotation.z=Math.PI/2;}
  const a=new THREE.Vector3(0,2,1),b=new THREE.Vector3(0,11,-8);beam(scene,g,a,b,'#e7b13d',.42);beam(scene,g,new THREE.Vector3(0,11,-8),new THREE.Vector3(0,15,-12),'#c3a552',.25);scene.box(.06,5,.06,'#495d5e',0,12.5,-12,g);mesh(g,new THREE.TorusGeometry(.3,.07,5,12,Math.PI*1.5),material('#717b78'),0,10,-12);
  scene.box(1.6,.8,3.3,'#df792b',5.4,1.05,2.1,g);scene.box(1.7,1.4,1.7,'#54727a',5.4,2.04,1.2,g);scene.box(1.9,.16,1.9,'#e5e0d1',5.4,2.84,1.2,g);for(const x of [4.4,6.4])for(const z of [.9,3.3]){const radius=z<2?.7:.45,wheel=mesh(g,new THREE.CylinderGeometry(radius,radius,.4,10),material('#242927'),x,radius,z);wheel.rotation.z=Math.PI/2;}scene.box(2,.38,1.1,'#d58236',5.4,.44,4.2,g);
 }
}
function branding(scene,track){
 const sponsors=[['ROLEX','#075d40','#d8c270'],['HEINEKEN','#254d7c','#f0eee3'],['MSC CRUISES','#edece2','#22374c']],materials=sponsors.map(([name,bg,ink])=>trackSign(name,8,.68,bg,ink).material);
 for(let s=20,i=0;s<track.length;s+=24,i++)for(const side of [-1,1]){const j=Math.floor(s/track.step),offset=side*(spaBoundaryOffset(track,j,side)-.4),p=sample(track,s,offset),sign=mesh(scene.group,new THREE.PlaneGeometry(8,.68),materials[Math.floor(i/20)%3],p.x,p.y+.48,p.z);sign.rotation.y=p.heading+(side>0?-Math.PI/2:Math.PI/2);}
 for(const s of [1550,5010,6790]){const p=sample(track,s);if(Math.abs(angleDiff(sample(track,s+20).heading,p.heading))>.1)continue;let span=Math.max(spaBoundaryOffset(track,Math.floor(s/track.step),1),spaBoundaryOffset(track,Math.floor(s/track.step),-1))+6;while(span<80&&[-1,1].some(side=>roadClearance(track,p.x+Math.cos(p.heading)*side*span,p.z-Math.sin(p.heading)*side*span)<4))span+=6;if(span>=80)continue;const g=group(scene,p);for(const x of [-span,span]){scene.box(.3,8.8,.3,'#708680',x,4.4,0,g);scene.box(.3,8.8,.3,'#708680',x,4.4,2,g);beam(scene,g,new THREE.Vector3(x,0,0),new THREE.Vector3(x,8.8,2),'#a6b0aa',.16);}scene.box(span*2,1.7,2.5,'#265b45',0,8,1,g);const sign=trackSign('ROLEX',span*2-1,1.5,'#075b3c','#dfc66f');sign.position.set(0,8,-.28);sign.rotation.y=Math.PI;g.add(sign);for(let x=-span;x<span;x+=4)beam(scene,g,new THREE.Vector3(x,7.2,-.3),new THREE.Vector3(Math.min(span,x+4),8.85,-.3),'#a8b7ae',.12);}
 addBrakingBoards(scene,track);
}
function flares(scene,track){
 const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),gradient=ctx.createRadialGradient(64,64,2,64,64,63);gradient.addColorStop(0,'rgba(255,255,255,.38)');gradient.addColorStop(.45,'rgba(240,240,240,.28)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
 return [[1140,1],[3670,-1]].map(([s,side],index)=>{const p=eventSite(track,s,4,4,side,55),base={...p,y:spaTerrainHeight(track,p.x,p.z)+3},mat=new THREE.MeshBasicMaterial({map,color:'#d87e39',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}),plume=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),mat,28);plume.instanceMatrix.setUsage(THREE.DynamicDrawUsage);plume.frustumCulled=false;plume.visible=false;scene.group.add(plume);return{base,index,plume};});
}
export function addSpa(scene,track){
 const flags=[],panels=[],reservations=buildings(scene,track,flags);runoff(scene,track);safety(scene,track);utilities(scene,track,panels,reservations);branding(scene,track);rockFaces(scene,track);woodland(scene,track,reservations);const smoke=flares(scene,track),dummy=new THREE.Object3D();let started=null,wetness=0;
 const lighting=time=>{const passage=.5+.5*Math.sin(time*.00018)*Math.cos(time*.00011);scene.sun.color.set(wetness?'#d8e1e7':'#f8e2b9');scene.sun.intensity=(1.35+passage*1.75)*(1-wetness*.75);scene.hemisphere.intensity=.84+wetness*.2;scene.hemisphere.color.set('#abbfce');scene.scene.fog.density=Math.max(.00030,wetness*.0012);};
 scene.environmentFx={frame(time,cars){if(started===null)started=time;const elapsed=time-started;lighting(elapsed);scene.scene.backgroundRotation.y=elapsed*.000008;scene.scene.environmentRotation.y=elapsed*.000008;
  for(let i=0;i<flags.length;i++)flags[i].rotation.y=Math.sin(time*.0019+i)*.13;
  for(const panel of panels){const yellow=cars.some(car=>!car.finished&&!car.retired&&(car.offtrack||car.sliding)&&Math.min(wrap(car.s-panel.s,track.length),wrap(panel.s-car.s,track.length))<150);panel.material.color.set(yellow?(Math.floor(time/420)%2?'#e9c630':'#584d16'):'#31d388');}
  for(const puff of smoke){const age=wrap(elapsed*.001-puff.index*35,95),active=age<18;puff.plume.visible=active;if(!active)continue;const fade=Math.sin(age/18*Math.PI),nx=Math.cos(puff.base.heading)*puff.base.side,nz=-Math.sin(puff.base.heading)*puff.base.side;puff.plume.material.opacity=fade*.34*(1-wetness*.5);for(let i=0;i<28;i++){const t=i/27,spread=1+t*7;dummy.position.set(puff.base.x+nx*(t*22+age*.6)+Math.sin(i*2.4)*spread,puff.base.y+t*17+Math.sin(i)*2,puff.base.z+nz*(t*22+age*.6)+Math.cos(i*1.7)*spread);dummy.quaternion.copy(scene.camera.quaternion);dummy.scale.setScalar(4+t*10);dummy.updateMatrix();puff.plume.setMatrixAt(i,dummy.matrix);}puff.plume.instanceMatrix.needsUpdate=true;}
 },setConditions(w){wetness=w;lighting(0);},dispose(){scene.scene.backgroundRotation.set(0,0,0);scene.scene.environmentRotation.set(0,0,0);}};
 return scene.profile;
}
