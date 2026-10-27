import * as THREE from '/vendor/three.module.js';
import {sample,terrainHeight} from '/shared/tracks.mjs';
import {safeBoxSite,roadClearance} from '/shared/venues.mjs';
import {pitLayout} from '/shared/pit-layout.mjs';
import {addVegetation} from './vegetation.js';
import {trackSign,addBrakingBoards,addFacadePanels} from './track-furniture.js';
import {buildingFacade} from './campus-buildings.js';
const concrete='#aaa99f',steel='#767c7d';
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.82,...extra});
function placed(scene,p){const group=new THREE.Group();group.position.set(p.x,p.y,p.z);group.rotation.y=p.heading;scene.group.add(group);return group;}
function sign(group,text,w,h,x,y,z,color='#155448',ink='#f3ede0'){
 const panel=trackSign(text,w,h,color,ink);panel.position.set(x,y,z);panel.userData.mappedStatic=true;group.add(panel);return panel;
}
function crowd(group,rows,columns,length,side=1){
 const count=rows*columns,dummy=new THREE.Object3D(),people=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.2,.35,2,5),material('#ffffff'),count);
 for(let i=0;i<count;i++){const row=Math.floor(i/columns);dummy.position.set(side*(-19+row*1.3),2.6+row*.63,-length/2+(i%columns)*length/columns);dummy.rotation.set(0,0,0);dummy.scale.setScalar(.9+(i%4)*.035);dummy.updateMatrix();people.setMatrixAt(i,dummy.matrix);people.setColorAt(i,new THREE.Color(['#e8e2d3','#237044','#b72f36','#e78937','#353e49','#285f8c'][i%6]));}people.computeBoundingSphere();group.add(people);
 for(let i=0;i<9;i++){
  const x=side*(-16+i%4*4),y=5+i%4*1.8,z=-length*.43+i*length*.1;
  const flag=new THREE.Group();flag.position.set(x,y,z);group.add(flag);
  for(let band=0;band<3;band++){const m=new THREE.Mesh(new THREE.PlaneGeometry(.45,.8),material(['#176b40','#eae8dd','#bf3437'][band],{side:THREE.DoubleSide}));m.position.x=band*.45;flag.add(m);}sign(flag,'•',.2,.3,.45,0,.02,'#eae8dd','#866a3c');
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,2,4),material(steel));pole.position.set(-.22,-.6,0);flag.add(pole);
 }
}
function stand(scene,track,s,side,length=155,rows=26,roof=false){
 const p=safeBoxSite(track,s,23,length/2,side,16),g=placed(scene,p);
 // Two opposing rectilinear stadium banks leave the genuine entry and exit openings clear.
 for(let row=0;row<rows;row++){
  scene.box(1.35,.65,length,concrete,side*(-19+row*1.3),1.8+row*.63,0,g);
  scene.box(1.25,.12,length,'#a85a49',side*(-19+row*1.3),2.16+row*.63,0,g);
 }
 for(let z=-length/2;z<=length/2;z+=18){scene.box(.45,rows*.63+2,.45,concrete,side*15,(rows*.63+2)/2,z,g);scene.box(35,.14,1.5,'#d3d0c5',side*-2,2.2,z,g);}
 if(roof){const roofHeight=rows*.63+6;scene.box(49,.38,length+6,'#d3d5ce',0,roofHeight,0,g);for(let z=-length/2;z<=length/2;z+=24)scene.box(.25,roofHeight,.25,steel,side*21,roofHeight/2,z,g);}
 crowd(g,rows,Math.floor(length/1.15),length,side);
 const banner=sign(g,'MÉXICO · ESTADIO GNP SEGUROS',length,2,side*-21,2.4,0,'#8b2134');banner.rotation.y=Math.PI/2;
 return g;
}
function stadium(scene,track){
 stand(scene,track,track.length*.851,-1,140,30,true);stand(scene,track,track.length*.854,1,145,32,false);
 // End screens and the low podium sit clear of the switchbacks, not over the racing ribbon.
 for(const [at,side]of [[.83,-1],[.897,1]]){
  const p=safeBoxSite(track,at*track.length,10,7,side,18),g=placed(scene,p);scene.box(19,9,.6,'#252e32',0,13,0,g);sign(g,'MEXICO CITY GRAND PRIX',18,7,0,13,.34,'#243d40');for(const x of [-7,7])scene.box(.4,12,.4,steel,x,6,0,g);
 }
 const p=safeBoxSite(track,.886*track.length,10,7,-1,13),g=placed(scene,p);scene.box(20,1.6,9,'#9f253b',0,.8,0,g);scene.box(20,6,.6,'#164b40',0,4,-4,g);sign(g,'MEXICO · PODIUM',18,3.6,0,4,-3.66);
}
function pits(scene,track){
 const plan=pitLayout(track),p=safeBoxSite(track,65,17,158,plan.side,20),g=placed(scene,p),facade=buildingFacade('urban');
 scene.box(31,11,310,'#d4d0c1',0,5.5,0,g);scene.box(34,.45,314,'#f0eee3',0,11.2,0,g);addFacadePanels(g,31,11,310,facade);
 for(let bay=0;bay<33;bay++){
  const z=-149+bay*9.3,front=-plan.side*15.6;
  scene.box(.25,4.8,8.4,'#303c40',front,2.5,z,g);scene.box(.35,.4,8.7,['#ba3437','#d9b740','#356855','#397eb2'][Math.floor(bay/3)%4],front,5.15,z,g);
  const panel=sign(g,String(bay+1).padStart(2,'0'),1.7,.9,front-plan.side*.2,5.9,z,'#f3eee2','#24373b');panel.rotation.y=Math.PI/2;
 }
 const tower=placed(scene,safeBoxSite(track,240,11,12,plan.side,28));scene.box(19,26,20,'#d1ccba',0,13,0,tower);scene.box(23,6,24,'#436473',0,25,0,tower);addFacadePanels(tower,19,26,20,facade);
 const roof=sign(g,'AUTÓDROMO HERMANOS RODRÍGUEZ',180,3,0,13,0,'#13523f');roof.rotation.y=Math.PI/2;
 stand(scene,track,120,-plan.side,260,21,true);
}
function sportsPark(scene,track){
 for(const [at,side]of [[.40,1],[.60,-1],[.18,-1]]){
  const p=safeBoxSite(track,track.length*at,36,54,side,35),g=placed(scene,p);
  scene.box(68,.06,104,'#567f4b',0,-.12,0,g);
  const line='#d3d6bc';for(const x of [-32,32])scene.box(.12,.025,100,line,x,-.075,0,g);for(const z of [-50,0,50])scene.box(64,.025,.12,line,0,-.075,z,g);
  const ring=new THREE.Mesh(new THREE.RingGeometry(8.9,9.05,48),material(line));ring.rotation.x=-Math.PI/2;ring.position.y=-.055;g.add(ring);
  for(const z of [-50,50]){for(const x of [-3.7,3.7])scene.box(.1,2.5,.1,line,x,1.15,z,g);scene.box(7.5,.1,.1,line,0,2.4,z,g);}
  scene.box(77,.03,3,'#a29983',0,-.18,59,g);
 }
 // The copper geodesic sports palace is a local landmark, separated from the stadium.
 const p=safeBoxSite(track,.91*track.length,83,83,1,130),g=placed(scene,p);
 const dome=new THREE.Mesh(new THREE.SphereGeometry(76,32,12,0,Math.PI*2,0,Math.PI/2),material('#ab7956',{metalness:.35,roughness:.56}));dome.scale.y=.55;dome.position.y=7;dome.userData.mappedStatic=true;g.add(dome);
 const ribs=new THREE.LineSegments(new THREE.WireframeGeometry(dome.geometry),new THREE.LineBasicMaterial({color:'#cfac7d'}));ribs.scale.copy(dome.scale);ribs.position.copy(dome.position);g.add(ribs);scene.box(137,7,137,'#afa48d',0,3.5,0,g);
 const vegetation=[];for(let s=0;s<track.length;s+=34)for(const side of [-1,1]){if(s/track.length>.815||s/track.length<.09)continue;const p2=sample(track,s,side*(28+Math.abs(Math.sin(s)) *35));if(roadClearance(track,p2.x,p2.z)>13)vegetation.push({...p2,y:terrainHeight(track,p2.x,p2.z),scale:.9+Math.abs(Math.sin(s))*.5,angle:s});}
 addVegetation(scene,track,{tropical:false,desert:false},{palms:false,sites:vegetation});
 // Low-rise sprawl and a few distant silhouettes; haze softens them naturally.
 for(let i=0;i<60;i++){const a=i*Math.PI*2/60,p2={x:Math.sin(a)*2000,z:Math.cos(a)*1800},h=10+(i%8)*3+(i%17===0?65:0);scene.box(30+i%5*7,h,27+i%7*5,['#a7a59d','#c1b7a6','#959e9e'][i%3],p2.x,h/2,p2.z);}
}
function officials(scene,track){
 for(let s=110;s<track.length;s+=270){const p=safeBoxSite(track,s,3,4,1,11),g=placed(scene,p);scene.box(5,.2,6,'#e3dfd0',0,3,0,g);for(const x of [-2,2])scene.box(.12,3,.12,steel,x,1.5,2.5,g);scene.box(.65,1.2,.5,'#f47c22',0,1,0,g);const head=new THREE.Mesh(new THREE.SphereGeometry(.24,8,6),material('#eee8dd'));head.position.set(0,1.9,0);g.add(head);scene.box(1.4,1,.15,'#192b29',2,2,0,g);sign(g,'▶',1.2,.8,2,2,.1,'#123c2b','#74ee83');}
 addBrakingBoards(scene,track);
}
export function addMexicoCity(scene,track){stadium(scene,track);pits(scene,track);sportsPark(scene,track);officials(scene,track);}
