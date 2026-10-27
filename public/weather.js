import * as THREE from '/vendor/three.module.js';
import {conditionProfile} from '/shared/conditions.mjs';
const wrap=(n,m)=>((n%m)+m)%m;
function mistTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,1,32,32,31);gradient.addColorStop(0,'rgba(235,245,252,.85)');gradient.addColorStop(.4,'rgba(235,245,252,.5)');gradient.addColorStop(1,'rgba(235,245,252,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);return new THREE.CanvasTexture(canvas);}
// Rain stays in world space; pooled wheel spray expands and fades behind cars.
// Both effects use a single drawing batch, with no per-particle objects or lights.
export class WeatherEffects{
 constructor(scene){
  this.scene=scene;this.clock=0;this.profile=conditionProfile('normal');this.count=640;this.positions=new Float32Array(this.count*6);this.emitters=new Map();this.cursor=0;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));
  this.rain=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#c2d7e4',transparent:true,opacity:.24,depthWrite:false}));this.rain.frustumCulled=false;this.rain.visible=false;scene.add(this.rain);
  this.pool=Array.from({length:224},()=>({life:0}));this.sprayPositions=new Float32Array(this.pool.length*3);this.sizes=new Float32Array(this.pool.length);this.alphas=new Float32Array(this.pool.length);
  const sprayGeometry=new THREE.BufferGeometry();sprayGeometry.setAttribute('position',new THREE.BufferAttribute(this.sprayPositions,3).setUsage(THREE.DynamicDrawUsage));sprayGeometry.setAttribute('particleSize',new THREE.BufferAttribute(this.sizes,1).setUsage(THREE.DynamicDrawUsage));sprayGeometry.setAttribute('particleAlpha',new THREE.BufferAttribute(this.alphas,1).setUsage(THREE.DynamicDrawUsage));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{sprite:{value:mistTexture()},fogColor:{value:scene.fog.color},fogDensity:{value:scene.fog.density}},vertexShader:`attribute float particleSize;attribute float particleAlpha;varying float opacity;varying float depth;void main(){vec4 view=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*view;gl_PointSize=clamp(particleSize*300.0/max(1.0,-view.z),1.0,58.0);opacity=particleAlpha;depth=-view.z;}`,fragmentShader:`uniform sampler2D sprite;uniform vec3 fogColor;uniform float fogDensity;varying float opacity;varying float depth;void main(){vec4 mist=texture2D(sprite,gl_PointCoord);float alpha=mist.a*opacity;if(alpha<.008)discard;float fog=1.0-exp(-fogDensity*fogDensity*depth*depth);gl_FragColor=vec4(mix(vec3(.76,.84,.90),fogColor,fog),alpha);}`});
  this.spray=new THREE.Points(sprayGeometry,material);this.spray.frustumCulled=false;this.spray.visible=false;scene.add(this.spray);
 }
 reset(){for(const p of this.pool)p.life=0;this.emitters.clear();this.spray.geometry.setDrawRange(0,0);}
 setConditions(value,weather){const next=conditionProfile(value,weather?.wetness);this.profile=next;this.rainIntensity=weather?.rain??next.wetness;this.rainCount=Math.round(this.count*this.rainIntensity);this.rain.visible=this.rainCount>0;this.spray.visible=next.wetness>.01;this.rain.material.opacity=.10+.17*this.rainIntensity;this.rain.geometry.setDrawRange(0,this.rainCount*2);}
 frame(cars,focus,dt,camera){
  if(!(this.profile.wetness||this.rainIntensity)||!focus)return;
  dt=Math.min(dt,.08);this.clock+=dt;const wet=this.profile.wetness,windX=.8+Math.sin(this.clock*.24)*1.3,windZ=.4+Math.cos(this.clock*.19)*.8;
  const anchorX=Math.round(focus.x/40)*40,anchorZ=Math.round(focus.z/40)*40;this.rain.position.set(anchorX,focus.y,anchorZ);
  const count=this.rainCount||0;
  for(let i=0;i<count;i++){
   const speed=19+wet*14+(i%7)*.35,x=wrap(i*37.73+this.clock*windX-anchorX+70,140)-70,z=wrap(i*19.17+this.clock*windZ-anchorZ+70,140)-70,y=wrap(i*7.39-this.clock*speed,48)+.5,j=i*6,tail=(.65+wet*.8)*(1+(i%3)*.12);
   this.positions[j]=x;this.positions[j+1]=y;this.positions[j+2]=z;this.positions[j+3]=x-windX*.12;this.positions[j+4]=y+tail;this.positions[j+5]=z-windZ*.12;
  }
  this.rain.geometry.attributes.position.needsUpdate=true;
  const live=new Set();for(const c of cars){
   if(c.retired||c.finished||c.offtrack||Math.abs(c.v)<12||Math.hypot(c.x-focus.x,c.z-focus.z)>100)continue;
   live.add(c.id);let emit=(this.emitters.get(c.id)||0)+dt*(8+wet*16)*Math.min(1,Math.abs(c.v)/45);
   while(emit>=1){emit--;for(const side of [-1,1]){
    const heading=c.motionHeading??c.heading,p=this.pool[this.cursor++%this.pool.length],spread=Math.sin(this.cursor*2.73);
    Object.assign(p,{life:.65+wet*.55,total:.65+wet*.55,x:c.x-Math.sin(heading)*1.5+Math.cos(heading)*side*1.05,y:c.y+.35,z:c.z-Math.cos(heading)*1.5-Math.sin(heading)*side*1.05,vx:Math.sin(heading)*c.v*.10+Math.cos(heading)*side*(.8+wet),vz:Math.cos(heading)*c.v*.10-Math.sin(heading)*side*(.8+wet),vy:.8+Math.abs(spread),base:c.y,size:.8+wet*.7});
   }}this.emitters.set(c.id,emit);
  }
  for(const id of this.emitters.keys())if(!live.has(id))this.emitters.delete(id);
  let n=0;for(const p of this.pool){if(p.life<=0)continue;p.life-=dt;if(p.life<=0)continue;p.x+=p.vx*dt;p.z+=p.vz*dt;p.y=Math.max(p.base+.08,p.y+p.vy*dt);p.vy-=dt*.9;p.vx+=(windX-p.vx)*dt*.75;p.vz+=(windZ-p.vz)*dt*.75;const age=1-p.life/p.total,j=n*3;this.sprayPositions[j]=p.x;this.sprayPositions[j+1]=p.y;this.sprayPositions[j+2]=p.z;this.sizes[n]=p.size*(1+age*3.3);this.alphas[n++]=Math.sin(Math.PI*age)*(.13+wet*.13);}
  this.spray.geometry.setDrawRange(0,n);for(const a of Object.values(this.spray.geometry.attributes))a.needsUpdate=true;this.spray.material.uniforms.fogDensity.value=this.scene.fog.density;
 }
}
