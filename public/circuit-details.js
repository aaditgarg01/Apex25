import * as THREE from '/vendor/three.module.js';
import {safeBoxSite} from '/shared/venues.mjs';
import {trackSign} from './track-furniture.js';

export function addCircuitDetails(scene,track){
 // Race furniture is deliberately sparse and sits beyond all road branches.
 const count=Math.min(12,Math.ceil(track.length/650));
 for(let i=0;i<count;i++){
  const s=track.length*(i+.28)/count,p=safeBoxSite(track,s,3.2,4.2,i%2?1:-1,track.campus?6:9),g=new THREE.Group();g.position.set(p.x,p.y,p.z);g.rotation.y=p.heading;scene.group.add(g);
  scene.box(4,.17,5,'#a5a49b',0,.07,0,g);
  scene.box(2.5,2.1,2.8,track.campus?'#b8bca9':'#b2bcc0',0,1.1,0,g);
  scene.box(2.54,.8,2.84,'#334d58',0,1.62,0,g);scene.box(3.1,.14,3.4,'#d0d0c5',0,2.22,0,g);
  const sign=trackSign(track.campus?'CAMPUS RACE':'MARSHAL '+String(i+1).padStart(2,'0'),2.3,.38,'#244a42','#e8ece3');sign.position.set(0,.92,-1.45);sign.rotation.y=Math.PI;g.add(sign);
  // A slim antenna and a weatherproof rescue-equipment cabinet.
  scene.box(.04,1.2,.04,'#596669',1,2.8,.7,g);scene.box(.6,.9,.5,'#b94b37',1.9,.5,-.7,g);
  if(track.campus)continue;
  // A standing marshal: distinct helmet, torso and legs, kept outside the road.
  const clothing=new THREE.MeshStandardMaterial({color:'#e77b30',roughness:1}),skin=new THREE.MeshStandardMaterial({color:'#ddbd98',roughness:1});
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(.18,.2,.64,8),clothing);torso.position.set(-1.8,1.04,-1);g.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),skin);head.position.set(-1.8,1.49,-1);g.add(head);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.14,8,6,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:'#efede1'}));helmet.position.set(-1.8,1.5,-1);g.add(helmet);
  for(const x of [-1.91,-1.69])scene.box(.14,.68,.17,'#cf6828',x,.39,-1,g);
 }
}
