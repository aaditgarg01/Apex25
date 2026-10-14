import * as THREE from '/vendor/three.module.js';

export class RaceAtmosphere{
 constructor(renderer,scene){this.renderer=renderer;this.scene=scene;this.cache=new Map();this.generator=new THREE.PMREMGenerator(renderer);}
 set(profile,appearance,wetness){
  const night=profile.night,golden=profile.goldenHour,haze=profile.industrialHaze,clear=profile.clearHills,ardennes=profile.ardennes,riviera=profile.riviera,twilight=profile.desertTwilight,phase=twilight?Math.round((profile.twilight||0)*32)/32:0,key=[night,golden,haze,clear,ardennes,riviera,twilight,phase,appearance.sand,wetness>.7?'rain':wetness?'damp':'dry'].join(':');
  if(!this.cache.has(key)){
   const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,512);
   const blend=(a,b)=>'#'+new THREE.Color(a).lerp(new THREE.Color(b),phase).getHexString();
   const top=twilight?blend('#51436a','#03070e'):night?'#07121e':wetness>.7?'#6c7c88':wetness?'#7893a7':haze?'#9cabb7':ardennes?'#687f92':riviera?'#388fc8':clear?'#387dc0':golden?'#5c8db5':'#547da4',horizon=twilight?blend(wetness?'#95878c':'#c48e71','#19202d'):night?'#253442':wetness?'#abb4b6':haze?'#c9cfd0':ardennes?'#c3c8be':riviera?'#c1e1eb':clear?'#c2dcee':golden?'#e5cfaa':appearance.sand?'#d8cebc':'#d4dfdf';
   g.addColorStop(0,top);g.addColorStop(.48,horizon);g.addColorStop(.53,night?'#26302b':'#a3a59a');g.addColorStop(1,night?'#12191b':'#686d61');x.fillStyle=g;x.fillRect(0,0,1024,512);
   for(let i=0;i<(night?130:riviera&&!wetness?0:ardennes?48:clear&&!wetness?13:golden&&!wetness?15:65);i++){
    const px=(i*183.23)%1024,py=25+(i*61.47)%190;
    if(night){x.fillStyle=twilight?`rgba(218,232,243,${Math.max(0,phase-.35)*.75})`:'#d8e5e789';x.fillRect(px,py,1,1);continue;}
    if(ardennes){x.save();x.translate(px,py);x.scale(2.1,.8);for(let j=0;j<5;j++){const cx=(j-2)*16,cy=-Math.sin(j*1.3+i)*9,r=23+(i+j)%4*8,cloud=x.createRadialGradient(cx,cy,2,cx,cy,r);cloud.addColorStop(0,i%3===0?'rgba(92,107,116,.53)':'rgba(240,241,236,.7)');cloud.addColorStop(.5,i%3===0?'rgba(108,122,132,.40)':'rgba(220,225,225,.45)');cloud.addColorStop(1,'rgba(230,235,235,0)');x.fillStyle=cloud;x.fillRect(cx-r,cy-r,2*r,2*r);}x.restore();continue;}
    if(clear&&!wetness){x.save();x.translate(px,py);for(let j=0;j<5;j++){const cx=(j-2)*10,cy=-Math.sin(j*1.8)*5,r=12+j%3*4,cloud=x.createRadialGradient(cx,cy,1,cx,cy,r);cloud.addColorStop(0,'rgba(252,252,246,.8)');cloud.addColorStop(.62,'rgba(243,246,248,.65)');cloud.addColorStop(1,'rgba(246,249,250,0)');x.fillStyle=cloud;x.fillRect(cx-r,cy-r,2*r,2*r);}x.restore();continue;}
    const r=22+(i%7)*9;x.save();x.translate(px,py);x.scale(2.8,.65);const cloud=x.createRadialGradient(0,0,0,0,0,r);cloud.addColorStop(0,wetness?'rgba(220,226,227,.14)':'rgba(243,244,233,.11)');cloud.addColorStop(1,'rgba(240,244,245,0)');x.fillStyle=cloud;x.fillRect(-r,-r,r*2,r*2);x.restore();
   }
   // Equirectangular azimuth/elevation agree with the low western directional sun.
   if(!ardennes&&wetness<.7&&(!twilight||phase<.45)){const sunX=riviera?438:twilight?80:golden?53:haze||clear?405:670,sunY=riviera?28:twilight?218+phase*60:golden?207:haze||clear?98:85,light=x.createRadialGradient(sunX,sunY,1,sunX,sunY,twilight?34:night?16:haze?65:golden?32:40);light.addColorStop(0,twilight?'#ffd2a1':night?'#d8e1da':haze?'#f3f5f2':'#fff8dd');light.addColorStop(.2,twilight?'#e1a67c99':night?'#899ca2':haze?'#e3e8e866':golden?'#ffd698bb':'#fff7d299');light.addColorStop(1,'rgba(255,245,220,0)');x.fillStyle=light;x.fillRect(sunX-70,sunY-70,140,140);}
   const sky=new THREE.CanvasTexture(c);sky.colorSpace=THREE.SRGBColorSpace;sky.mapping=THREE.EquirectangularReflectionMapping;
   const environment=this.generator.fromEquirectangular(sky),entry={sky,environment,horizon};this.cache.set(key,entry);
   if(this.cache.size>8){const oldest=this.cache.keys().next().value,old=this.cache.get(oldest);old.sky.dispose();old.environment.dispose();this.cache.delete(oldest);}
  }
  const entry=this.cache.get(key);this.scene.background=entry.sky;this.scene.environment=entry.environment.texture;this.scene.environmentIntensity=wetness?.6:.42;this.scene.fog.color.set(entry.horizon);
 }
}
