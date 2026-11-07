import * as THREE from '/vendor/three.module.js';
import {sample, clamp} from '/shared/tracks.mjs';

function skyTexture(storm) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d'), sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, storm ? '#27354b' : '#72acd2');
  sky.addColorStop(.49, storm ? '#7e9299' : '#d3e8df');
  sky.addColorStop(.57, storm ? '#54675e' : '#a3b8a4');
  sky.addColorStop(1, '#44503b');
  ctx.fillStyle = sky;
  ctx.fillRect(0,0,1024,512);
  for (let group=0; group < (storm ? 19 : 12); group++) {
    const x=(group*193.7)%1024, y=storm ? 88+group%5*23 : 109+group%4*23;
    for (const wrap of [-1024,0,1024]) {
      ctx.save();
      ctx.translate(x+wrap,y);
      ctx.scale(storm ? 2.1 : 1.44,storm ? .82 : 1.02);
      for (let k=0;k<12;k++) {
        const cx=(k%6-2.5)*17, cy=-Math.sin(k%6/5*Math.PI)*23+(k<6?5:-15);
        const radius=(storm?28:25)+(k*11+group*7)%15;
        const puff=ctx.createRadialGradient(cx,cy,1,cx,cy,radius);
        puff.addColorStop(0, storm ? (k<6?'rgba(39,49,63,.78)':'rgba(85,100,114,.73)') :
          (k<6?'rgba(200,217,218,.63)':'rgba(249,251,235,.91)'));
        puff.addColorStop(.45,storm?'rgba(69,84,97,.55)':'rgba(231,239,229,.52)');
        puff.addColorStop(1,'rgba(205,222,228,0)');
        ctx.fillStyle=puff;
        ctx.fillRect(cx-radius,cy-radius,radius*2,radius*2);
      }
      ctx.restore();
    }
  }
  const map=new THREE.CanvasTexture(canvas);
  map.colorSpace=THREE.SRGBColorSpace;
  map.mapping=THREE.EquirectangularReflectionMapping;
  map.wrapS=THREE.RepeatWrapping;
  map.generateMipmaps=false;
  map.minFilter=THREE.LinearFilter;
  return map;
}

export function createSepangWeather(scene, track, bands, umbrellas) {
  const root=scene.group, dry=skyTexture(false), storm=skyTexture(true);
  const environment=scene.atmosphere.generator.fromEquirectangular(dry);
  const wet={value:0}, time={value:0};
  const skyMat=new THREE.ShaderMaterial({
    uniforms:{dryMap:{value:dry},stormMap:{value:storm},wet,clock:time},
    side:THREE.BackSide,depthWrite:false,depthTest:false,toneMapped:false,
    vertexShader:`
      varying vec3 direction;
      void main() {
        direction=position;
        vec4 clip=projectionMatrix*vec4(mat3(viewMatrix)*position,1.0);
        gl_Position=clip.xyww;
      }`,
    fragmentShader:`
      varying vec3 direction;
      uniform sampler2D dryMap,stormMap;
      uniform float wet,clock;
      void main() {
        vec3 ray=normalize(direction);
        vec2 uv=vec2(atan(ray.z,ray.x)*.15915494+.5,asin(ray.y)*.31830989+.5);
        vec3 dryColor=texture2D(dryMap,vec2(fract(uv.x+clock*.0006),uv.y)).rgb;
        vec3 rainColor=texture2D(stormMap,vec2(fract(uv.x+clock*.0018),uv.y)).rgb;
        gl_FragColor=vec4(mix(dryColor,rainColor,smoothstep(.04,.87,wet)),1.);
        #include <colorspace_fragment>
      }`
  });
  const sky=new THREE.Mesh(new THREE.SphereGeometry(10,40,20),skyMat);
  sky.frustumCulled=false;
  sky.renderOrder=-1000;
  root.add(sky);

  const mask=document.createElement('canvas');
  mask.width=mask.height=96;
  const maskInk=mask.getContext('2d'), edge=maskInk.createRadialGradient(48,48,10,48,48,47);
  edge.addColorStop(0,'#ffffff');edge.addColorStop(.68,'#d4d4d4');edge.addColorStop(.93,'#424242');
  edge.addColorStop(1,'#000000');
  maskInk.fillStyle=edge;maskInk.fillRect(0,0,96,96);
  const alphaMap=new THREE.CanvasTexture(mask);
  const positions=[], uv=[], waterMat=new THREE.MeshPhysicalMaterial({
    color:'#849da0',roughness:.14,metalness:.53,clearcoat:.84,clearcoatRoughness:.12,alphaMap,
    side:THREE.DoubleSide,transparent:true,depthWrite:false,opacity:0
  });
  function addTriangle(vertices, coords) {
    for(const [index,p] of vertices.entries()){positions.push(p.x,p.y+.069,p.z);uv.push(...coords[index]);}
  }
  for (const [i,s] of [-318,-230,-98,91,915,1020,2470,2700,4085,4240,4415,4620].entries()) {
    const length=6+(i%4)*4.3,offset=(i%2?1:-1)*(3+i%3*.55);
    const center=sample(track,s,offset);
    for(let j=0;j<16;j++){
      const at=angle=>sample(track,s+Math.cos(angle)*length,offset+Math.sin(angle)*(1.3+i%4*.19));
      const a=j*Math.PI/8,b=(j+1)*Math.PI/8;
      const coords=angle=>[.5+Math.cos(angle)*.5,.5+Math.sin(angle)*.5];
      addTriangle([center,at(a),at(b)],[[.5,.5],coords(a),coords(b)]);
    }
  }
  for (const [i,band] of bands.entries()) {
    if(band.kind!=='tarmac'||!band.turn||i%29!==0)continue;
    const [a,b,c,d]=band.polygon, middle=(p,q,t)=>({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t,z:p.z+(q.z-p.z)*t});
    const near=middle(a,b,.31), far=middle(d,c,.56), rightNear=middle(a,b,.47), rightFar=middle(d,c,.72);
    addTriangle([near,rightNear,far],[[0,0],[1,0],[0,1]]);addTriangle([far,rightNear,rightFar],[[0,1],[1,0],[1,1]]);
  }
  const water=new THREE.BufferGeometry();
  water.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  water.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  water.computeVertexNormals();
  const puddles=new THREE.Mesh(water,waterMat);
  puddles.visible=false;
  root.add(puddles);

  const mistCanvas=document.createElement('canvas');
  mistCanvas.width=mistCanvas.height=64;
  const ctx=mistCanvas.getContext('2d'), feather=ctx.createRadialGradient(32,32,1,32,32,31);
  feather.addColorStop(0,'rgba(232,243,234,.82)');
  feather.addColorStop(1,'rgba(232,243,234,0)');
  ctx.fillStyle=feather;ctx.fillRect(0,0,64,64);
  const mistMap=new THREE.CanvasTexture(mistCanvas);
  const mistMat=new THREE.SpriteMaterial({map:mistMap,transparent:true,opacity:0,depthWrite:false});
  const vapour=[-250,-65,75,4230,4420,4680].map((s,i)=>{
    const pose=sample(track,s,i%2?-5:5),sprite=new THREE.Sprite(mistMat);
    root.add(sprite);
    sprite.visible=false;
    return {pose,sprite};
  });
  const dryHorizon=new THREE.Color('#bfd8cf'), wetHorizon=new THREE.Color('#84969f');
  const drySun=new THREE.Color('#fff1ce'),wetSun=new THREE.Color('#a6bbc9');
  let target=0,last=-1,steamUntil=-1,initialized=false;
  return {
    setConditions(value) {
      if(initialized&&value<target-.3)steamUntil=last+9500;
      target=value;
      if(!initialized){wet.value=value;initialized=true;}
    },
    frame(now) {
      const dt=last<0?0:clamp((now-last)/1000,0,.15);
      last=now;
      wet.value+=(target-wet.value)*(1-Math.exp(-dt*1.95));
      const amount=wet.value;
      time.value=now*.001;
      scene.scene.background=null;
      scene.scene.environment=environment.texture;
      scene.scene.environmentIntensity=.50+amount*.14;
      scene.scene.fog.color.copy(dryHorizon).lerp(wetHorizon,amount);
      scene.scene.fog.density=.00049+amount*.00094;
      scene.sun.intensity=3.04-amount*2.54;
      scene.sun.color.copy(drySun).lerp(wetSun,amount);
      scene.hemisphere.intensity=1.22+amount*.25;
      scene.hemisphere.groundColor.set('#9aa694');
      puddles.visible=amount>.12;
      waterMat.opacity=Math.min(.53,(amount-.12)*.63);
      for(const umbrella of umbrellas)umbrella.visible=amount>.25;
      const steam=clamp((steamUntil-now)/9500,0,1);
      const heat=amount<.04?.10*(1-amount*25):0;
      mistMat.opacity=Math.max(steam*.32,heat);
      for(const [i,{pose,sprite}] of vapour.entries()){
        sprite.visible=steam>.01||heat>.02;
        const wave=Math.sin(now*.0014+i);
        sprite.position.set(pose.x+wave*.9,pose.y+(steam>.01?1.15:.61)+wave*.22,pose.z+i%2*.5);
        sprite.scale.set(7+wave*1.2,1.9+wave*.35,1);
      }
    },
    dispose() {
      environment.dispose();
      dry.dispose();
      storm.dispose();
      alphaMap.dispose();
    }
  };
}
