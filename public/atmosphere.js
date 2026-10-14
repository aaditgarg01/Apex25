import * as THREE from '/vendor/three.module.js';

export class RaceAtmosphere{
 constructor(renderer,scene){this.renderer=renderer;this.scene=scene;this.cache=new Map();this.generator=new THREE.PMREMGenerator(renderer);}
 set(profile,appearance,wetness){
  const night=profile.night,golden=profile.goldenHour,key=[night,golden,appearance.sand,wetness>.7?'rain':wetness?'damp':'dry'].join(':');
  if(!this.cache.has(key)){
   const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,512);
   const top=night?'#07121e':wetness>.7?'#6c7c88':wetness?'#7893a7':golden?'#5c8db5':'#547da4',horizon=night?'#253442':wetness?'#abb4b6':golden?'#e5cfaa':appearance.sand?'#d8cebc':'#d4dfdf';
   g.addColorStop(0,top);g.addColorStop(.48,horizon);g.addColorStop(.53,night?'#26302b':'#a3a59a');g.addColorStop(1,night?'#12191b':'#686d61');x.fillStyle=g;x.fillRect(0,0,1024,512);
   for(let i=0;i<(night?130:golden&&!wetness?15:65);i++){
    const px=(i*183.23)%1024,py=25+(i*61.47)%190;
    if(night){x.fillStyle='#d8e5e789';x.fillRect(px,py,1,1);continue;}
    const r=22+(i%7)*9;x.save();x.translate(px,py);x.scale(2.8,.65);const cloud=x.createRadialGradient(0,0,0,0,0,r);cloud.addColorStop(0,wetness?'rgba(220,226,227,.14)':'rgba(243,244,233,.11)');cloud.addColorStop(1,'rgba(240,244,245,0)');x.fillStyle=cloud;x.fillRect(-r,-r,r*2,r*2);x.restore();
   }
   // Equirectangular azimuth/elevation agree with the low western directional sun.
   if(wetness<.7){const sunX=golden?53:670,sunY=golden?207:85,light=x.createRadialGradient(sunX,sunY,1,sunX,sunY,night?16:golden?32:40);light.addColorStop(0,night?'#d8e1da':'#fff8dd');light.addColorStop(.2,night?'#899ca2':golden?'#ffd698bb':'#fff7d299');light.addColorStop(1,'rgba(255,245,220,0)');x.fillStyle=light;x.fillRect(sunX-55,sunY-55,110,110);}
   const sky=new THREE.CanvasTexture(c);sky.colorSpace=THREE.SRGBColorSpace;sky.mapping=THREE.EquirectangularReflectionMapping;
   const environment=this.generator.fromEquirectangular(sky),entry={sky,environment,horizon};this.cache.set(key,entry);
   if(this.cache.size>8){const oldest=this.cache.keys().next().value,old=this.cache.get(oldest);old.sky.dispose();old.environment.dispose();this.cache.delete(oldest);}
  }
  const entry=this.cache.get(key);this.scene.background=entry.sky;this.scene.environment=entry.environment.texture;this.scene.environmentIntensity=wetness?.6:.42;this.scene.fog.color.set(entry.horizon);
 }
}
