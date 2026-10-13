import * as THREE from '/vendor/three.module.js';
import {conditionProfile} from '/shared/conditions.mjs';
const wrap=(n,m)=>((n%m)+m)%m;
// Two small drawing batches for rain and tyre spray; no per-drop meshes,
// extra lights, reflection renders or additional physics work.
export class WeatherEffects{
 constructor(scene){
  this.clock=0;this.profile=conditionProfile('normal');this.count=320;
  this.positions=new Float32Array(this.count*6);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3));
  this.rain=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#c2d7e4',transparent:true,opacity:.24,depthWrite:false}));this.rain.frustumCulled=false;this.rain.visible=false;scene.add(this.rain);
  this.sprayPositions=new Float32Array(120*3);const sprayGeometry=new THREE.BufferGeometry();sprayGeometry.setAttribute('position',new THREE.BufferAttribute(this.sprayPositions,3));
  this.spray=new THREE.Points(sprayGeometry,new THREE.PointsMaterial({color:'#c7d4dc',size:.85,transparent:true,opacity:.17,depthWrite:false}));this.spray.frustumCulled=false;this.spray.visible=false;scene.add(this.spray);
 }
 setConditions(value){this.profile=conditionProfile(value);this.rain.visible=this.profile.wetness>0;this.spray.visible=this.profile.wetness>0;this.rain.material.opacity=.10+.16*this.profile.wetness;this.spray.material.opacity=.08+.14*this.profile.wetness;this.rain.geometry.setDrawRange(0,this.profile.id==='wet'?this.count*2:100*2);}
 frame(cars,focus,dt){
  if(!this.profile.wetness||!focus)return;
  this.clock+=dt;this.rain.position.set(focus.x,focus.y,focus.z);
  const rainCount=this.profile.id==='wet'?this.count:100;
  for(let i=0;i<rainCount;i++){
   const x=wrap(i*37.73,100)-50,z=wrap(i*19.17,100)-50,y=wrap(i*7.39-this.clock*(this.profile.id==='wet'?28:19),35)+1,j=i*6;
   this.positions[j]=x;this.positions[j+1]=y;this.positions[j+2]=z;this.positions[j+3]=x+.25;this.positions[j+4]=y+(this.profile.id==='wet'?1.4:.8);this.positions[j+5]=z+.14;
  }
  this.rain.geometry.attributes.position.needsUpdate=true;
  let n=0;for(const c of cars){
   if(c.retired||c.finished||c.offtrack||Math.abs(c.v)<12)continue;
   const heading=c.motionHeading??c.heading;
   for(let i=0;i<8&&n<120;i++){
    const distance=3.2+i*.8+Math.sin(this.clock*9+i)*.25,side=(i%2?1:-1)*(1+i*.17),j=n++*3;
    this.sprayPositions[j]=c.x-Math.sin(heading)*distance+Math.cos(heading)*side;
    this.sprayPositions[j+1]=c.y+.35+i*.12;
    this.sprayPositions[j+2]=c.z-Math.cos(heading)*distance-Math.sin(heading)*side;
   }
  }
  this.spray.geometry.setDrawRange(0,n);this.spray.geometry.attributes.position.needsUpdate=true;
 }
}
