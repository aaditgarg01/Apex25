import * as THREE from '/vendor/three.module.js';
import {sample} from '/shared/tracks.mjs';
import {buddhGround, buddhLocal, buddhRoadClear, buddhRunoffClear, buddhBarrierClear} from '/shared/buddh.mjs';
import {footprintStrip, footprintsOverlap} from '/shared/venue-footprints.mjs';
import {BUDDH_ROADS} from '/shared/buddh-map-data.mjs';
import {BUDDH_TRAFFIC_WAYS} from './data/buddh-architecture.js';
import {BUDDH_CORNERS} from './data/buddh-runoff.js';

export function dressBuddhLandmark(scene, site, group) {
  const box = (w, h, d, color, x, y, z) => scene.box(w, h, d, color, x, y, z, group);
  if (site.kind === 'pit') {
    const front = -(site.side || 1), face = front * (site.w / 2 - 1.18);
    for (const end of [-1, 1]) for (let i = 0; i < 7; i++) {
      const z = end * site.d * .39 + (i - 3) * .75;
      for (const angle of [-.73, .73]) box(.11, 2.14, .12, '#ab9d80', face, 7.64, z).rotation.x = angle;
    }
    return false;
  }
  if (site.kind === 'fan') {
    for (let i = -5; i <= 5; i++) {
      const flag = box(.53, .33, .035, ['#d88637', '#eadfbd', '#507759'][(i + 6) % 3],
        i * 1.06, 4.54 + i * i * .012, 16.28);
      flag.rotation.z = i * .052;
    }
    return false;
  }
  if (site.kind === 'marshal' && site.crane) {
    for (let layer = 0; layer < 3; layer++) box(.97, .23, .99, '#3d3d38', -2.75, .20 + layer * .23, 2.3);
    box(.16, .06, 3.1, '#5f5a50', -2.6, .045, -.2);
    return false;
  }
  if (site.kind === 'timing') {
    box(.33, .48, .32, '#45504c', .48, 6.7, .09).rotation.x = -.32;
    box(.12, .08, 2.2, '#595b53', 0, .07, .14);
    return false;
  }
  if (site.kind === 'kiln') {
    box(19, 3.5, 17, '#a17155', 0, 1.6, 0);
    box(18, .35, 16, '#aa8265', 0, 3.48, 0);
    for (let i = 0; i < 9; i++) box(3.7 - i * .29, 2.8, 3.7 - i * .29, '#8d6551', 4, 4.7 + i * 2.77, 3);
    return true;
  }
  if (site.kind === 'tank') {
    for (const x of [-3.8, 3.8]) for (const z of [-3.8, 3.8]) box(.69, 11, .69, '#918a76', x, 5.5, z);
    box(9.7, 4.2, 9.7, '#aca18a', 0, 12.1, 0);
    box(10, .32, 10, '#777c73', 0, 14.32, 0);
    return true;
  }
  if (site.kind === 'parking') {
    box(site.w - 1, .12, site.d - 1, '#7b776d', 0, -.02, 0);
    for (let i = 0; i < 11; i++) {
      const z = (i - 5) * 4.6;
      for (const side of [-1, 1]) {
        box(6.4, .025, .075, '#bcb4a0', side * 11.4, .056, z - 1.82);
        if ((i + side) % 3) {
          box(4.65, 1.12, 1.95, ['#9d9b8d', '#777f79', '#a68f78'][i % 3], side * 11.35, .63, z);
          box(2.17, .35, 1.55, '#636c68', side * 11.2, 1.29, z);
        }
      }
    }
    return true;
  }
  if (site.kind === 'express-sign') {
    for (const x of [-2.5, 2.5]) box(.23, 4.5, .25, '#8b9186', x, 2.14, 0);
    const face = document.createElement('canvas');
    face.width = 256;
    face.height = 64;
    const ink = face.getContext('2d');
    ink.fillStyle = '#3b6959';
    ink.fillRect(0, 0, 256, 64);
    ink.fillStyle = '#f0ecda';
    ink.font = 'bold 19px Arial';
    ink.textAlign = 'center';
    ink.fillText('GREATER NOIDA', 128, 28);
    ink.fillText('EXPRESSWAY', 128, 50);
    const map = new THREE.CanvasTexture(face);
    map.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 1.8),
      new THREE.MeshBasicMaterial({map, side: THREE.DoubleSide}));
    sign.position.y = 4.52;
    group.add(sign);
    return true;
  }
  if (site.kind === 'telecom') {
    box(.61, 25, .61, '#9c9483', 0, 12, 0);
    for (const x of [-1.8, 0, 1.8]) box(.49, 2, .28, '#bdb8a8', x, 23.3, 0);
    box(4.3, .29, .36, '#787c6e', 0, 22.6, 0);
    return true;
  }
  return false;
}

function flatMesh(root, positions, material, colors) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (colors) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}

export function addBuddhDressing(root, track, plan, batch) {
  const ground = (x, z) => buddhGround(track, x, z);
  const positions = [], colors = [], color = new THREE.Color();
  function paint(vertices, tint) {
    color.set(tint);
    for (const p of vertices) {
      positions.push(p.x, p.y + .102, p.z);
      colors.push(color.r, color.g, color.b);
    }
  }
  for (const {turn, station, side, gravel} of BUDDH_CORNERS) {
    for (let i = 0; i < 38; i++) {
      const s = station - 71 + i * 2.7, edge = side * (track.width / 2 - .37 - i % 8 * .15);
      const size = .08 + i % 4 * .045;
      paint([sample(track, s, edge), sample(track, s + size, edge - side * .05),
        sample(track, s + size * .24, edge + side * .15)], gravel && i % 3 ? '#9a7e57' : '#383932');
    }
    if (![1, 3, 4, 5, 7, 13, 15, 16].includes(turn)) continue;
    for (const offset of [-.91, .89, 1.07]) for (let i = 0; i < 16; i++) {
      const s = station - 67 + i * 2.6, u = offset + side * (i / 16) ** 2 * 1.1;
      const a = sample(track, s, u), b = sample(track, s, u + .105);
      const c = sample(track, s + 2.6, u + side * .045), d = sample(track, s + 2.6, u + .105 + side * .045);
      paint([a, b, c, b, d, c], i % 5 === 0 ? '#5a544a' : '#312f2b');
    }
  }
  const rubber = flatMesh(root, positions, new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: .28, depthWrite: false, side: THREE.DoubleSide
  }), colors);

  const channels = [];
  for (const {polygon} of plan.drains) for (const i of [0, 1, 3, 3, 1, 2]) {
    const {x, z} = polygon[i];
    channels.push(x, ground(x, z) + .14, z);
  }
  const drainage = flatMesh(root, channels, new THREE.MeshStandardMaterial({color:'#7a7564', roughness: .93, side: THREE.DoubleSide}));
  const blossoms = plan.sites.filter(site => site.kind === 'scrub' && site.variant % 2 === 0)
    .flatMap(site => [-.38, 0, .38].map((offset, i) => ({...site, x: site.x + offset, owner: site.id,
      y: site.y + .45 + i % 2 * .16, tint: ['#c8aa56', '#e1ca72', '#d4c695'][i]})));
  batch(new THREE.IcosahedronGeometry(.13, 0), new THREE.MeshStandardMaterial({color:'#fff', roughness:.88}), blossoms);

  const cableCount = addPylonCables(root, track, plan);
  const flags = addVisitorFlags(plan, batch);
  const traffic = makeTraffic(root, track, plan, ground);
  const heat = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {phase: {value: 0}, strength: {value: .22}},
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float phase, strength;
      void main() {
        float edge = smoothstep(0.0, 0.29, vUv.x) * (1.0 - smoothstep(0.71, 1.0, vUv.x));
        float lift = sin(vUv.x * 22.0 + phase * 1.05) * 0.15 + 0.27;
        float distanceToBand = (vUv.y - lift) * 5.0;
        float band = exp(-distanceToBand * distanceToBand);
        float ripple = sin(vUv.x * 14.0 - vUv.y * 19.0 - phase * 1.4);
        gl_FragColor = vec4(0.78, 0.70, 0.59, edge * band * (0.035 + ripple * 0.025) * strength);
        #include <colorspace_fragment>
      }`
  }));
  const crest = sample(track, 1250);
  heat.scale.set(28, 1.35, 1);
  heat.position.set(crest.x, crest.y + .67, crest.z);
  heat.rotation.y = crest.heading;
  root.add(heat);
  root.userData.buddhDressing = {drainageSegments: plan.drains.length, blossoms: blossoms.length, visitorFlags: flags, cableSpans: cableCount, trafficVehicles: traffic.count};
  let wetness = 0, last = -Infinity;
  return {
    setConditions(wet) {
      wetness = wet;
      rubber.material.opacity = .28 - .13 * wet;
      drainage.material.color.set('#7a7564').lerp(color.set('#504c43'), wet);
      heat.visible = wet < .20;
      heat.material.uniforms.strength.value = 1 - wet * 5;
    },
    frame(now) {
      if (now - last < 90) return;
      last = now;
      heat.material.uniforms.phase.value = now * .001;
      traffic.frame(now, wetness);
    }
  };
}

function addPylonCables(root, track, plan) {
  const pylons = plan.sites.filter(site => site.kind === 'pylon'), wires = [];
  let spans = 0;
  for (const [index, a] of pylons.entries()) {
    for (const b of pylons.slice(index + 1)) {
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      if (length > 290) continue;
      const corridor = footprintStrip(a, b, 6);
      if (!buddhRoadClear(track, corridor) || !buddhRunoffClear(track, corridor) ||
          plan.sites.some(site => site !== a && site !== b && footprintsOverlap(corridor, site.polygon))) continue;
      for (const offset of [-4.2, 0, 4.2]) {
        const at = t => [a.x + (b.x - a.x) * t + offset,
          a.y + (b.y - a.y) * t + 21 - 5.4 * Math.sin(Math.PI * t),
          a.z + (b.z - a.z) * t];
        for (let i = 0; i < 14; i++) wires.push(...at(i / 14), ...at((i + 1) / 14));
      }
      spans++;
    }
  }
  if (wires.length) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3));
    root.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({color:'#646254', transparent:true, opacity:.48})));
  }
  return spans;
}

function addVisitorFlags(plan, batch) {
  const fanZones = plan.sites.filter(site => site.kind === 'fan');
  const palettes = [['#bd4046', '#eeede3', '#243e78'], ['#272e37', '#ba343a', '#d7aa48']];
  for (const [index, palette] of palettes.entries()) {
    const face = document.createElement('canvas');
    face.width = 96;
    face.height = 60;
    const ink = face.getContext('2d');
    palette.forEach((tone, i) => {
      ink.fillStyle = tone;
      ink.fillRect(0, i * 20, 96, 20);
    });
    const map = new THREE.CanvasTexture(face);
    map.colorSpace = THREE.SRGBColorSpace;
    const sites = fanZones.map(site => {
      const offset = index ? 6.4 : -6.4;
      const c = Math.cos(site.heading), s = Math.sin(site.heading);
      return {x: site.x + c * offset + s * 15.86, y: site.y + 5.69,
        z: site.z - s * offset + c * 15.86, heading: site.heading, owner: site.id};
    });
    batch(new THREE.PlaneGeometry(1.15, .61), new THREE.MeshBasicMaterial({map, side: THREE.DoubleSide}), sites);
  }
  return fanZones.length * palettes.length;
}

function makeTraffic(root, track, plan, ground) {
  const routes = [];
  for (const [way, , , , coordinates] of BUDDH_ROADS.filter(row => BUDDH_TRAFFIC_WAYS.includes(row[0]))) {
    const points = coordinates.map(coord => buddhLocal(track, coord));
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      if (length < 100) continue;
      const corridor = footprintStrip(a, b, 3.6);
      if (!buddhRoadClear(track, corridor, row => row.way !== way) || !buddhRunoffClear(track, corridor) ||
          !buddhBarrierClear(track, corridor) || plan.sites.some(site => footprintsOverlap(corridor, site.polygon))) continue;
      routes.push({a, dx, dz, length, heading: Math.atan2(dx, dz), count: Math.min(6, Math.ceil(length / 190))});
    }
  }
  const count = routes.reduce((sum, route) => sum + route.count, 0);
  if (!count) return {count, frame() {}};
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({color:'#fff', roughness: .65}), count);
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  for (let i = 0; i < count; i++) mesh.setColorAt(i, tint.set(['#b4b2a5','#767975','#89796c','#73818a'][i % 4]));
  root.add(mesh);
  return {count, frame(now, wetness) {
    let index = 0;
    for (const {a, dx, dz, length, heading, count: vehicles} of routes) for (let i = 0; i < vehicles; i++) {
      const lane = i % 2 ? 1.65 : -1.65;
      const progress = 5 + ((now * .001 * (23 - wetness * 4) + i / vehicles * (length - 10)) % (length - 10));
      const x = a.x + dx * progress / length + Math.cos(heading) * lane;
      const z = a.z + dz * progress / length - Math.sin(heading) * lane;
      dummy.position.set(x, ground(x, z) + .9, z);
      dummy.rotation.set(0, heading, 0);
      dummy.scale.set(1.85, i % 3 === 0 ? 1.65 : 1.15, i % 3 === 0 ? 5.2 : 3.8);
      dummy.updateMatrix();
      mesh.setMatrixAt(index++, dummy.matrix);
    }
    mesh.count = index;
    mesh.instanceMatrix.needsUpdate = true;
  }};
}
