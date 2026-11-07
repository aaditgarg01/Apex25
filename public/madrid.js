import * as THREE from '/vendor/three.module.js';
import {bankedHeight} from '/shared/banked-road.mjs';
import {madridLayout} from '/shared/madrid.mjs';
import {madridGround, madridRoads, madridRoadClear, madridRunoff} from '/shared/madrid-scenery.mjs';
import {sample} from '/shared/tracks.mjs';
import {MADRID_CORNERS, MADRID_SECTORS} from './data/madrid-runoff.js';
import {planMadrid} from './madrid-placement.js';
import {addPermanentVenue} from './permanent-venue.js';
import {trackSign} from './track-furniture.js';

export {madridGround as madridTerrainHeight};

const mat = color => new THREE.MeshStandardMaterial({color, roughness: .82});
function mesh(parent, geometry, material, x, y, z, staticMesh = true) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(x, y, z);
  item.castShadow = staticMesh;
  item.receiveShadow = true;
  item.userData.mappedStatic = staticMesh;
  parent.add(item);
  return item;
}

function paintFlag(ink) {
  ink.fillStyle = '#b42839';
  ink.fillRect(0, 0, 192, 120);
  ink.fillStyle = '#f1c343';
  ink.fillRect(0, 30, 192, 60);
}

function dressLandmark(scene, site, group) {
  const {w, d, kind, label, groundY, y} = site;
  const box = (width, height, depth, tint, x, yy, z) => scene.box(width, height, depth, tint, x, yy, z, group);
  function sign(text, width, height, x, yy, z, heading, color) {
    const placard = trackSign(text, width, height, color, '#f5ecdb');
    placard.position.set(x, yy, z);
    placard.rotation.y = heading;
    placard.userData.mappedStatic = true;
    group.add(placard);
  }

  if (['hall', 'garage', 'stand', 'street', 'fan'].includes(kind)) {
    const h = y - groundY;
    box(w - .25, h, d - .25, kind === 'stand' ? '#a39b82' : '#b6ab97', 0, -h / 2, 0);
  }
  if (kind === 'hall') {
    const height = site.id === 'hall-north' ? 13 : 10;
    box(w - 1.8, height, d - 1.8, '#e0d6c5', 0, height / 2, 0);
    box(w - .8, .7, d - .8, '#d4d4cb', 0, height + .1, 0);
    const bays = Math.max(4, Math.round(d / 12));
    for (const side of [-1, 1]) {
      box(.24, 3.55, d - 4.5, '#698790', side * (w / 2 - .82), 3.06, 0);
      box(.82, .56, d - 1.2, '#efeadf', side * (w / 2 - .52), 5.1, 0);
      for (let i = 0; i < bays; i++) {
        const z = (i + .5 - bays / 2) * (d - 3) / bays;
        box(.38, 4.15, .23, '#ddd7ca', side * (w / 2 - .76), 3.12, z);
      }
      sign(label, Math.min(38, d * .66), 1.7, side * (w / 2 - .64), 7.2, 0, side * Math.PI / 2, '#555f66');
    }
    for (let z = -d / 2 + 7; z < d / 2 - 5; z += 11) {
      box(w - 3, .63, .48, '#b9c4bf', 0, height + .65, z);
    }
    return true;
  }

  if (kind === 'garage') {
    const front = -site.side, face = front * (w / 2 - .6), bays = Math.round((d - 6) / 6);
    box(w - 1.4, 4.7, d - 1.4, '#b9b5a9', 0, 2.35, 0);
    box(w - 2.0, 3.45, d - 1.7, '#dfded2', 0, 6.4, 0);
    box(.31, 2.1, d - 3.2, '#577985', face, 6.31, 0);
    box(w - .35, .42, d - .35, '#eee6d4', 0, 8.15, 0);
    box(w - .54, .22, d - .56, '#945152', 0, 4.68, 0);
    for (let i = 0; i < bays; i++) {
      const z = (i + .5 - bays / 2) * (d - 5) / bays;
      box(.18, 3.24, 4.17, '#454f52', face, 1.7, z);
      box(.23, .23, 4.1, i % 2 ? '#dfb353' : '#a65455', face, 3.68, z);
      box(.27, 2.12, .18, '#e1ddcb', face, 6.31, z);
    }
    sign(label, 16, .92, face + front * .22, 5.04, 0, front * Math.PI / 2, '#465f67');
    if (site.id === 'garage-1') {
      box(.85, .36, 8, '#d8cbb5', front * (w / 2 - .48), 5.09, -d * .32);
      sign('PODIUM', 7.2, .73, face + front * .30, 5.54, -d * .32, front * Math.PI / 2, '#9a3e43');
    }
    return true;
  }

  if (kind === 'tower') {
    const height = site.height;
    box(w - 1, height, d - 1, ['#829798', '#82969b', '#869393', '#85938d'][site.variant], 0, height / 2, 0);
    for (const side of [-1, 1]) {
      box(.32, height * .94, d - 5, '#73858a', side * (w / 2 - .42), height * .48, 0);
      box(w - 5, height * .93, .35, '#74848a', 0, height * .48, side * (d / 2 - .42));
    }
    box(w * .62, 5, d * .65, '#a1a49c', 0, height + 2.3, 0);
    box(.85, 5.9, .85, '#99584b', 0, height + 7, 0);
    return true;
  }
  if (kind !== 'street') return false;

  box(w - .4, .10, d - .35, '#c2b5a1', 0, .035, 0);
  box(.13, 4.3, .13, '#767b71', -.92, 2.14, 1.7);
  box(.74, .17, .23, '#898b7c', -.65, 4.22, 1.7);
  box(.93, .55, 1.19, '#b29a7f', .75, .29, -1.45);
  box(.73, .32, .93, '#737b4a', .75, .72, -1.45);
  box(.45, .68, .43, '#555f56', .9, .34, .88);
  box(.54, .12, 1.54, '#8c694c', -.68, .46, -.73);
  for (const z of [-1.2, -.26]) box(.14, .45, .16, '#74776f', -.68, .23, z);
  for (const z of [-2.14, 2.14]) box(.15, .86, .15, '#666c64', .85, .43, z);
  return true;
}

function dressRoad(scene, track, batch) {
  const rubber = [], repairs = [], drains = [], puddles = [];
  function patch(records, station, offset, w, d, tint) {
    const p = sample(track, station, offset);
    const y = bankedHeight(track, station, offset, p.y) + .075;
    records.push({...p, y, w, d, tint});
  }

  for (const corner of MADRID_CORNERS) {
    const {station, side} = corner;
    for (let i = 0; i < 9; i++) {
      patch(rubber, station - 5 - i * 3.1, side * (track.width / 2 - .8 - i % 3 * .48), .16, 1.2 + i % 4, '#363635');
    }
    patch(repairs, station - 16, -side * 2.9, .48, 4.8, '#5a5955');
    patch(drains, station + 9, -side * (track.width / 2 - .41), .48, .55, '#4c4d4b');
    patch(puddles, station - 11, side * (track.width / 2 - 1.9), 1.37, 4.7, '#82909d');
  }
  const bank = madridLayout(track).monumental;
  for (let station = bank.start + 4; station < bank.end; station += 7) {
    patch(rubber, station, -.9, .41, 6.65, '#343433');
    patch(rubber, station, 1.3, .26, 5.1, '#3c3b3a');
  }
  const stamp = (records, opacity) => {
    const material = new THREE.MeshStandardMaterial({color: '#ffffff', transparent: true, opacity,
      depthWrite: false, roughness: .83, polygonOffset: true, polygonOffsetFactor: -1});
    batch(new THREE.PlaneGeometry(1, 1), material, records, (p, o) => {
      o.rotation.set(-Math.PI / 2 - p.pitch, p.heading, 0, 'YXZ');
      o.scale.set(p.w, p.d, 1);
    });
    return material;
  };
  stamp(rubber, .39);
  stamp(repairs, .51);
  stamp(drains, .86);
  return stamp(puddles, 0);
}

function airliners(scene){
 const aircraft=[];
 for(let i=0;i<3;i++){
  const g=new THREE.Group();g.name='Distant Barajas departure';scene.group.add(g);const white=mat('#e2e6e1'),wing=mat('#aebbc0');
  mesh(g,new THREE.CylinderGeometry(.8,1,20,10),white,0,0,0,false).rotation.x=Math.PI/2;mesh(g,new THREE.SphereGeometry(1,8,6),white,0,0,10,false).scale.set(.85,.85,2);
  mesh(g,new THREE.BoxGeometry(24,.18,3.2),wing,0,-.2,-1,false).rotation.y=.17;mesh(g,new THREE.BoxGeometry(9,.13,2),wing,0,.6,-8,false);mesh(g,new THREE.BoxGeometry(.2,4.2,3),mat(i%2?'#c4333d':'#b89748'),0,2,-8.5,false);
  for(const x of [-5,5])mesh(g,new THREE.CylinderGeometry(.6,.65,3,7),wing,x,-1.1,-.5,false).rotation.x=Math.PI/2;
  aircraft.push(g);
 }
 return aircraft;
}
function heatHaze(scene,track){
 const uniforms={time:{value:0},strength:{value:1}},shader=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:'uniform float time; varying vec2 vUv; void main(){vUv=uv;vec3 p=position;p.x+=sin(p.y*7.0+time*1.8)*.028;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',fragmentShader:'uniform float time;uniform float strength;varying vec2 vUv;void main(){float wave=sin(vUv.x*90.0+sin(vUv.y*23.0-time*1.3)*2.0+time);float edge=sin(vUv.x*3.14159)*sin(vUv.y*3.14159);gl_FragColor=vec4(vec3(.81,.79,.71),max(0.0,wave)*edge*.026*strength);}'});
 for(const s of [track.length*.54,track.length*.67]){const p=sample(track,s),m=mesh(scene.group,new THREE.PlaneGeometry(16,1.3,20,6),shader,p.x,p.y+1.05,p.z,false);m.rotation.y=p.heading;m.castShadow=false;}
 return uniforms;
}
export function addMadrid(scene, track) {
  const plan = planMadrid(track);
  const {batch} = addPermanentVenue(scene, track, {
    prefix: 'madrid', plan, ground: madridGround, roads: madridRoads,
    roadClear: madridRoadClear, runoff: madridRunoff, sectors: MADRID_SECTORS, detection: [124, 2755],
    title: 'MADRID', wallTitle: 'CAPITAL CIRCUIT', crowdColors: ['#d64b4b','#efc455','#e8e2d3','#456780','#5d775a','#252c38'],
    crowdLimit: 8500, paintFlag, drawLandmark: dressLandmark
  });
  const venue = scene.environmentFx, puddles = dressRoad(scene, track, batch);
  const aircraft = airliners(scene), haze = heatHaze(scene, track);
  let wetness = 0, lastFrame = -Infinity;
  scene.environmentFx = {
    setConditions(wet) {
      venue.setConditions(wet);
      wetness = wet;
      haze.strength.value = (1 - wet) * .8;
      puddles.opacity = wet * wet * .27;
    },
    frame(time, cars) {
      venue.frame(time, cars);
      if (time - lastFrame < 40) return;
      lastFrame = time;
      haze.time.value = time * .001;
      aircraft.forEach((plane, i) => {
        const t = (time * .000014 + i * .32) % 1;
        plane.position.set(1150 - t * 1900, 155 + t * 145 + i * 32, -1670 + t * 860);
        plane.rotation.set(.06, -1.18, -.025);
        plane.visible = wetness < .8;
      });
    },
    dispose() { venue.dispose(); }
  };
}
