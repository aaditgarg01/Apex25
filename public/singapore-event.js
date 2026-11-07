import * as THREE from '/vendor/three.module.js';
import {sample} from '/shared/tracks.mjs';
import {gridSlot} from '/shared/physics.mjs';
import {pitLayout, pitRoadPose} from '/shared/pit-layout.mjs';
import {singaporeBands} from '/shared/singapore.mjs';
import {trackBarriers} from '/shared/barriers.mjs';
import {pitTransitPlan} from '/shared/pit-timing.mjs';
import {SINGAPORE_CORNERS, SINGAPORE_MARKINGS} from './data/singapore-runoff.js';
import {createYasmarinaLightField} from './yasmarina-light-field.js';

const palette = ['#dc573e', '#dfd5bc', '#2f779e', '#d5ae38', '#4b8c6a', '#e0bc9b', '#a8516c'];

function canvasTexture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

function addApronLettering(root, track) {
  const byApron = new Map();
  for (const row of singaporeBands(track).paint) {
    if (!row.lettering || !row.apron.label) continue;
    const width = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    if (Math.min(width(row.polygon[0], row.polygon[3]), width(row.polygon[1], row.polygon[2])) < 1.25) continue;
    if (!byApron.has(row.apron)) byApron.set(row.apron, []);
    byApron.get(row.apron).push(row);
  }
  const labelMaterials = new Map();
  for (const [apron, rows] of byApron) {
    let run = [], best = [];
    for (const row of rows) {
      if (run.length && row.i !== run.at(-1).i + 1) run = [];
      run.push(row);
      if (run.length > best.length) best = [...run];
    }
    if (best.length < 4) continue;
    if (best.length > 10) {
      const start = Math.floor((best.length - 10) / 2);
      best = best.slice(start, start + 10);
    }
    if (!labelMaterials.has(apron.label)) {
      const emblem = apron.design === 'opening-inside';
      const map = canvasTexture(emblem ? 512 : 1024, emblem ? 256 : 128, (ctx, w, h) => {
        if (emblem) {
          ctx.fillStyle = '#ffd660';
          ctx.beginPath();
          ctx.moveTo(.22 * w, .5 * h);
          ctx.lineTo(.48 * w, .12 * h);
          ctx.lineTo(.77 * w, .5 * h);
          ctx.lineTo(.48 * w, .88 * h);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#243c87';
          ctx.fillRect(.33 * w, .44 * h, .34 * w, .12 * h);
          return;
        }
        ctx.font = 'italic 900 108px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff6e1';
        ctx.fillText(apron.label, w / 2, h / 2, w * .94);
      });
      labelMaterials.set(apron.label, new THREE.MeshStandardMaterial({map, side: THREE.DoubleSide,
        alphaTest: .33, roughness: .8, polygonOffset: true, polygonOffsetFactor: -2}));
    }
    const positions = [], uv = [];
    for (const [i, row] of best.entries()) {
      const a = i / best.length, b = (i + 1) / best.length;
      const coords = [[a, 0], [b, 0], [b, 1], [a, 1]];
      for (const index of [0, 1, 3, 3, 1, 2]) {
        const p = row.polygon[index], [u, v] = coords[index];
        positions.push(p.x, p.y + .012, p.z);
        uv.push(row.side < 0 ? 1 - u : u, row.side < 0 ? v : 1 - v);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.computeVertexNormals();
    const label = new THREE.Mesh(geometry, labelMaterials.get(apron.label));
    label.userData.singaporeApronLettering = apron.turn;
    root.add(label);
  }
}

export function addSingaporeEvent(scene, track, plan) {
  const root = scene.group, materials = new Map(), crowd = [], flags = [], phones = [], panels = [];
  const clock = {value: 0}, dummy = new THREE.Object3D(), tint = new THREE.Color();
  function material(color, extra) {
    const key = color + JSON.stringify(extra || {});
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({color, roughness: .75, ...extra}));
    return materials.get(key);
  }
  function addMesh(parent, geometry, mat, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.userData.mappedStatic = mat.isMeshStandardMaterial || mat.isMeshBasicMaterial;
    parent.add(mesh);
    return mesh;
  }
  function group(site) {
    const item = new THREE.Group();
    item.position.set(site.x, site.y, site.z);
    item.rotation.y = site.heading;
    item.userData.singaporeSite = site.id;
    item.userData.pitKeep = true;
    root.add(item);
    return item;
  }
  function local(site, x, y, z) {
    const c = Math.cos(site.heading), s = Math.sin(site.heading);
    return {owner: site.id, x: site.x + c * x + s * z, y: site.y + y, z: site.z - s * x + c * z,
      heading: site.heading};
  }
  function instances(geometry, mat, records, position, cell = 930) {
    if (!records.length) {
      geometry.dispose();
      return [];
    }
    const chunks = new Map(), result = [];
    for (const record of records) {
      const key = Math.floor(record.x / cell) + ':' + Math.floor(record.z / cell);
      if (!chunks.has(key)) chunks.set(key, []);
      chunks.get(key).push(record);
    }
    for (const chunk of chunks.values()) {
      const mesh = new THREE.InstancedMesh(geometry, mat, chunk.length);
      mesh.userData.pitKeep = true;
      mesh.userData.singaporeOwners = chunk.map(p => p.owner || p.id);
      chunk.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, p.heading || 0, 0);
        dummy.scale.setScalar(1);
        position(p, dummy, i);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        if (p.color) mesh.setColorAt(i, tint.set(p.color));
      });
      mesh.computeBoundingSphere();
      root.add(mesh);
      result.push(mesh);
    }
    return result;
  }

  const labels = new Map(), atlas = canvasTexture(2048, 2048, () => {});
  atlas.anisotropy = 8;
  const signMat = new THREE.MeshBasicMaterial({map: atlas, alphaTest: .3, side: THREE.FrontSide});
  function sign(parent, text, w, h, x, y, z, rotation = 0, background = '#152c41') {
    const key = text + background;
    if (!labels.has(key)) {
      const slot = labels.size;
      if (slot >= 128) throw new Error('Singapore sign atlas capacity exceeded');
      const cellX = slot % 4 * 512, cellY = Math.floor(slot / 4) * 64, ctx = atlas.image.getContext('2d');
      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(cellX, cellY, 512, 64);
      }
      ctx.fillStyle = '#f4ecd3';
      ctx.font = 'bold 46px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cellX + 256, cellY + 34, 488);
      labels.set(key, {left: cellX, top: cellY});
    }
    const {left, top} = labels.get(key), geometry = new THREE.PlaneGeometry(w, h), uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (left + uv.getX(i) * 512) / 2048, 1 - (top + (1 - uv.getY(i)) * 64) / 2048);
    const board = addMesh(parent, geometry, signMat, x, y, z);
    board.rotation.y = rotation;
    return board;
  }

  const screenMap = canvasTexture(512, 256, (ctx, w, h) => {
    const background = ctx.createLinearGradient(0, 0, w, h);
    background.addColorStop(0, '#1e326d');
    background.addColorStop(1, '#45768c');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e5364c';
    ctx.fillRect(0, 0, w, 53);
    ctx.fillStyle = '#fff6e7';
    ctx.font = 'bold 26px Arial';
    ctx.fillText('MARINA BAY  /  TURN 01', 18, 35);
    ctx.lineWidth = 11;
    ctx.strokeStyle = '#d9f1ff';
    ctx.beginPath();
    ctx.moveTo(195, 213);
    ctx.lineTo(370, 213);
    ctx.quadraticCurveTo(460, 213, 438, 157);
    ctx.quadraticCurveTo(428, 120, 387, 136);
    ctx.quadraticCurveTo(355, 154, 324, 110);
    ctx.stroke();
    for (const [i, color] of ['#e64653', '#69edce', '#ffd954', '#a1b8ff'].entries()) {
      ctx.fillStyle = color;
      ctx.fillRect(20, 81 + i * 38, 9, 27);
      ctx.fillStyle = '#eef5fb';
      ctx.font = 'bold 19px Arial';
      ctx.fillText('P' + (i + 1), 43, 101 + i * 38);
      ctx.fillRect(86, 92 + i * 38, 53 - i * 5, 5);
    }
    ctx.fillStyle = 'rgba(10,20,38,.18)';
    for (let y = 1; y < h; y += 4) ctx.fillRect(0, y, w, 1);
  });
  const screenMaterial = new THREE.MeshBasicMaterial({map: screenMap, toneMapped: false});
  for (const site of plan.sites) {
    if (site.kind === 'turn1-screen') {
      const screen = group(site), front = -site.side;
      for (const z of [-4.2, 4.2]) {
        scene.box(.29, 6.5, .29, '#536474', 0, 3.25, z, screen);
        const brace = scene.box(.25, 5.9, .25, '#778899', -.3 * front, 2.8, z, screen);
        brace.rotation.z = -.24 * front;
      }
      scene.box(.54, 4.55, 10.2, '#253143', 0, 6.4, 0, screen);
      const display = addMesh(screen, new THREE.PlaneGeometry(10, 4.33), screenMaterial, front * .28, 6.4);
      display.rotation.y = front * Math.PI / 2;
      continue;
    }
    if (site.kind === 'pit') {
      const garage = group(site), front = -site.side, depth = site.w - 3, length = site.d - 3;
      scene.box(depth, 4.7, length, '#aaa9a0', 0, 2.35, 0, garage);
      scene.box(depth - 1, 5.9, length * .985, '#b8b8ae', 0, 7.65, 0, garage);
      scene.box(depth + 1, .48, length + .5, '#9cb2bc', 0, 10.8, 0, garage);
      for (let floor = 0; floor < 2; floor++) {
        const y = 5.5 + floor * 2.45;
        addMesh(garage, new THREE.BoxGeometry(.12, 1.82, length * .96),
          material('#547784', {emissive: '#6b5a3d', emissiveIntensity: .65}), front * depth / 2, y, 0);
        for (let i = 0; i < 38; i++) {
          const z = (i / 38 - .49) * length;
          scene.box(.18, 1.93, .14, '#a7b2b1', front * (depth / 2 + .1), y, z, garage);
        }
      }
      for (let i = 0; i < 41; i++) {
        const z = (i / 41 - .49) * length;
        scene.box(.13, 3.3, length / 41 * .76, '#203e4d', front * (depth / 2 + .11), 2, z, garage);
        scene.box(.17, .25, length / 41 * .82, palette[i % palette.length], front * (depth / 2 + .13), 4.08, z, garage);
      }
      for (let i = 0; i < 4; i++) {
        const z = (i - 1.5) * length / 4;
        scene.box(depth * .72, .17, length * .225, '#233d52', 0, 11.15, z, garage);
      }
      sign(garage, 'MARINA · PIT AND PADDOCK', Math.min(45, length * .35), 1.25,
        front * (depth / 2 + .16), 9.55, 0, front * Math.PI / 2);
      sign(garage, 'PODIUM', 8.5, .88, front * (depth / 2 + .18), 7, length * .36, front * Math.PI / 2);
      continue;
    }
    if (site.kind === 'stand') {
      const stand = group(site), length = site.d - 4, step = (site.w - 3.8) / site.rows;
      const front = -site.side;
      for (let row = 0; row < site.rows; row++) {
        const x = front * (site.w / 2 - 2 - row * step), y = .35 + row * .49;
        scene.box(step + .03, .38, length, row % 5 ? '#657986' : '#467690', x, y, 0, stand);
        for (let col = 0; col < Math.floor(length / 1.14); col++) {
          if ((col + row * 3) % 6 === 0 || crowd.length >= 11400) continue;
          const p = {...local(site, x, y + .35, col * 1.14 - length / 2 + .58), color: palette[(row * 3 + col) % palette.length]};
          crowd.push(p);
          if ((row * 3 + col) % 22 === 0) phones.push({...p, y: p.y + .69});
        }
        if (row % 5 === 0) {
          for (let z = -length / 2 + 1; z < length / 2; z += 8) {
            scene.box(.14, y + 1, .14, '#7f929e', x, (y - 1) / 2, z, stand);
          }
        }
      }
      const roofY = site.rows * .49 + 3.1;
      if (['pit', 'super-pit', 'turn1', 'padang', 'bayfront'].includes(site.id)) {
        for (let z = -length / 2 + 3; z < length / 2; z += 9) {
          scene.box(.25, roofY, .25, '#8197a3', -front * (site.w / 2 - 1), roofY / 2, z, stand);
        }
        const roof = scene.box(site.w - .9, .29, length + 1, '#a3b4bc', 0, roofY, 0, stand);
        roof.rotation.z = front * .08;
        addMesh(stand, new THREE.BoxGeometry(.08, .1, length - 1),
          material('#d8be8b', {emissive: '#dfad63', emissiveIntensity: .9}), front * (site.w / 2 - .9), roofY - .42, 0);
      }
      sign(stand, site.label, Math.min(length - 1, 33), .87, front * (site.w / 2 - .55), 1.34, 0, front * Math.PI / 2);
      for (let z = -length / 2 + 3; z < length / 2 - 2; z += 12) {
        const x = -front * (site.w / 2 - 2.4);
        scene.box(.05, 2.5, .05, '#b8c4c8', x, site.rows * .49 + .9, z, stand);
        flags.push(local(site, x, site.rows * .49 + 1.74, z));
      }
      continue;
    }
    if (site.kind === 'fan' || site.kind === 'medical') {
      const zone = group(site);
      scene.box(site.w - .55, .1, site.d - .6, '#716a59', 0, .05, 0, zone);
      for (const z of [-7, 0, 7]) {
        scene.box(5.4, 2.1, 4.6, '#49747b', -1.8, 1.1, z, zone);
        const canopy = addMesh(zone, new THREE.ConeGeometry(3.05, 1.65, 4), material('#c6b69b'), -1.8, 2.8, z);
        canopy.rotation.y = Math.PI / 4;
        scene.box(2, .9, 3.8, '#c1af85', 3.1, .49, z, zone);
      }
      addMesh(zone, new THREE.BoxGeometry(4.8, 2.5, .22),
        material('#375969', {emissive: '#376986', emissiveIntensity: .57}), .4, 4.1, 10.35);
      sign(zone, 'RACE CONTROL', 4.15, .68, .4, 4.22, 10.48);
      sign(zone, site.kind === 'medical' ? 'MEDICAL · RESCUE' : 'MARINA · FAN WALK', 9, .85, 0, 2.3, 10.8);
      if (site.kind === 'medical') {
        scene.box(2.3, 1.8, 4.7, '#c8c6b1', 3.2, 1.1, 0, zone);
        scene.box(2.34, .2, 4.1, '#467d73', 3.2, 1.22, 0, zone);
      }
      continue;
    }
    if (site.kind === 'marshal') {
      const post = group(site);
      const floor = site.crane ? -2.3 : 0;
      for (const x of [-.5, .5]) {
        scene.box(.33, .59, .28, '#ef873d', x, .96, floor, post);
        scene.box(.28, .64, .24, '#d97330', x, .34, floor, post);
        addMesh(post, new THREE.SphereGeometry(.17, 7, 5), material('#e6dece'), x, 1.45, floor);
      }
      scene.box(.11, 3, .11, '#778d98', 1.17, 1.5, floor, post);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(.72, .45, .1), new THREE.MeshBasicMaterial({color: '#27e18c'}));
      panel.position.set(1.17, 2.77, floor);
      post.add(panel);
      panels.push({mesh: panel, site});
      sign(post, 'FIRE', .72, .57, -.99, 1.45, floor, Math.PI, '#9f4938');
      scene.box(.16, .55, .14, '#b04434', -.99, .85, floor, post);
      scene.box(.16, .035, 3.6, '#2a3236', -1.54, .055, floor, post);
      if (site.crane) {
        scene.box(2.8, 1.5, 4.5, '#a39b64', 1.8, .9, 2.2, post);
        scene.box(.35, 9, .35, '#8c9869', 2.9, 5.2, 2.8, post);
        const boom = scene.box(.25, .25, 6.6, '#b6ad71', 2.9, 9.5, .7, post);
        boom.rotation.x = -.15;
        scene.box(.8, .5, .7, '#273a44', 2.9, 10, -2.55, post);
        const spare = material('#333b3f');
        for (const z of [2.7, 3.95]) {
          for (let row = 0; row < 3; row++) {
            const tyre = addMesh(post, new THREE.TorusGeometry(.43, .13, 4, 10), spare, -2.6, .18 + row * .25, z);
            tyre.rotation.x = Math.PI / 2;
          }
        }
      }
    }
  }

  instances(new THREE.CapsuleGeometry(.16, .29, 2, 4), material('#ffffff'), crowd, (p, obj) => {obj.position.y += .34;});
  instances(new THREE.SphereGeometry(.112, 5, 4), material('#bfa083'), crowd, (p, obj) => {obj.position.y += .68;});
  const phone = new THREE.MeshBasicMaterial({color: '#c2f1ff', transparent: true, opacity: .6, toneMapped: false});
  instances(new THREE.SphereGeometry(.06, 4, 3), phone, phones, () => {});
  const flagMap = canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#bd3449';
    ctx.fillRect(0, 0, w / 2, h / 2);
    ctx.fillStyle = '#f7efe1';
    ctx.fillRect(0, h / 2, w / 2, h / 2);
    ctx.beginPath(); ctx.arc(31, 29, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#bd3449';
    ctx.beginPath(); ctx.arc(38, 27, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f7efe1';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * .4;
      const x = 54 + Math.cos(a) * 9.5, y = 27 + Math.sin(a) * 9.5;
      ctx.beginPath();
      for (let point = 0; point < 10; point++) {
        const angle = -Math.PI / 2 + point * Math.PI / 5;
        const radius = point % 2 ? 1.1 : 2.65;
        ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
      }
      ctx.closePath();
      ctx.fill();
    }
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#408395' : '#e2c87a';
      ctx.fillRect(128 + x * 32, y * 32, 32, 32);
    }
  });
  const flagMat = new THREE.MeshStandardMaterial({map: flagMap, side: THREE.DoubleSide, roughness: .9});
  flagMat.onBeforeCompile = shader => {
    shader.uniforms.sgClock = clock;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float sgClock;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z += sin(position.x * 5. + sgClock * 2.) * .12;');
  };
  flagMat.customProgramCacheKey = () => 'singapore-flag';
  for (let variant = 0; variant < 2; variant++) {
    const geometry = new THREE.PlaneGeometry(1.28, .72, 6, 2), uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) + variant) / 2);
    instances(geometry, flagMat, flags.filter((p, i) => i % 2 === variant), (p, obj) => {
      obj.position.x += Math.cos(p.heading) * .62;
      obj.position.z -= Math.sin(p.heading) * .62;
    });
  }

  const select = kind => plan.sites.filter(site => site.kind === kind);
  const trees = select('tree'), planters = select('planter'), lamps = select('lamp'), traffic = select('traffic');
  const benches = select('bench'), bollards = select('bollards'), masts = select('mast');
  const palms = trees.filter(site => site.variant === 0), rainTrees = trees.filter(site => site.variant !== 0);
  instances(new THREE.CylinderGeometry(.18, .34, 8.5, 7), material('#544638'), trees, (p, obj) => {obj.position.y += 4.25;});
  instances(new THREE.IcosahedronGeometry(1, 2), material('#ffffff', {emissive: '#103825', emissiveIntensity: .33}),
    rainTrees.flatMap(p => [-1, 0, 1].map(i => ({...p, i, color: ['#426444', '#496f54', '#284c36'][i + 1]}))),
    (p, obj) => {
      obj.position.y += 8.7 + Math.abs(p.i) * .4;
      obj.position.x += p.i * 1.1;
      obj.scale.set(2.55, 1.65, 2.45);
    });
  const palmLeaf = new THREE.ConeGeometry(1, 1, 3);
  palmLeaf.rotateX(Math.PI / 2);
  instances(palmLeaf, material('#4b7249'), palms.flatMap(p => Array.from({length: 7}, (_, i) => ({...p, i}))), (p, obj) => {
    const angle = p.i * Math.PI * 2 / 7;
    obj.position.set(p.x + Math.sin(angle) * 1.5, p.y + 8.7, p.z + Math.cos(angle) * 1.5);
    obj.rotation.set(.22, angle, 0);
    obj.scale.set(.8, .8, 3.7);
  });
  instances(new THREE.BoxGeometry(2.4, .52, 3), material('#8d8d80'), planters, (p, obj) => {obj.position.y += .26;});
  instances(new THREE.IcosahedronGeometry(1, 1), material('#4f8259'), planters, (p, obj) => {
    obj.position.y += .68;
    obj.scale.set(1.07, .53, 1.28);
  });
  instances(new THREE.IcosahedronGeometry(.15, 0), material('#c17f8b'),
    planters.flatMap(p => [-.66, 0, .66].map(z => ({...p, ...local(p, 0, 1.11, z)}))), () => {});
  instances(new THREE.CylinderGeometry(.08, .13, 7.3, 6), material('#657681'), lamps, (p, obj) => {obj.position.y += 3.65;});
  instances(new THREE.BoxGeometry(1.22, .23, .54), material('#e6c18a', {emissive: '#e9b263', emissiveIntensity: .78}),
    lamps, (p, obj) => {obj.position.y += 7.31;});
  instances(new THREE.CylinderGeometry(.08, .14, 4.5, 6), material('#81928f'), traffic, (p, obj) => {obj.position.y += 2.25;});
  instances(new THREE.BoxGeometry(.33, .98, .31), material('#26343c'), traffic, (p, obj) => {obj.position.y += 4.23;});
  instances(new THREE.BoxGeometry(.85, .14, 2.9), material('#7c6050'), benches, (p, obj) => {obj.position.y += .53;});
  instances(new THREE.BoxGeometry(.66, .51, 2.66), material('#6a7779'), benches, (p, obj) => {obj.position.y += .26;});
  instances(new THREE.CylinderGeometry(.25, .27, .88, 8), material('#4c6568'),
    benches.map(p => local(p, 0, .44, 1.9)), () => {});
  instances(new THREE.CylinderGeometry(.10, .12, .92, 6), material('#c5bfab'),
    bollards.flatMap(p => [-1.3, 0, 1.3].map(z => local(p, 0, .46, z))), () => {});

  const mastLenses = new THREE.MeshBasicMaterial({color: '#eaf5ff', side: THREE.DoubleSide, toneMapped: false});
  instances(new THREE.CylinderGeometry(.115, .22, 1, 7), material('#87999f'), masts, (p, obj) => {
    obj.position.y += p.height / 2;
    obj.scale.y = p.height;
  });
  instances(new THREE.BoxGeometry(3.6, .2, .42), material('#9caaae'), masts, (p, obj) => {obj.position.y += p.height;});
  instances(new THREE.BoxGeometry(.47, .06, .36), mastLenses,
    masts.flatMap(p => [-1.4, -.84, -.28, .28, .84, 1.4].map(x => local(p, x, p.height - .135, 0))), () => {});
  const glowMap = canvasTexture(96, 96, (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, 'rgba(239,247,255,.74)');
    gradient.addColorStop(.35, 'rgba(216,235,255,.29)');
    gradient.addColorStop(1, 'rgba(177,212,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  });
  const glowMat = new THREE.MeshBasicMaterial({map: glowMap, color: '#e4eeff', transparent: true,
    opacity: .31, depthWrite: false, toneMapped: false, side: THREE.DoubleSide});
  const halos = instances(new THREE.PlaneGeometry(4.5, 2.1), glowMat, masts, (p, obj) => {
    obj.position.y += p.height - .12;
  });

  const gantry = plan.structures.spans.find(span => span.kind === 'gantry');
  if (gantry) {
    const pose = sample(track, 0), rail = new THREE.Group();
    rail.position.set((gantry.a.x + gantry.b.x) / 2, gantry.a.y + .54, (gantry.a.z + gantry.b.z) / 2);
    rail.rotation.y = pose.heading;
    root.add(rail);
    const width = Math.min(22, Math.hypot(gantry.a.x - gantry.b.x, gantry.a.z - gantry.b.z) - 1.4);
    for (const side of [-1, 1]) sign(rail, 'APEX · MARINA NIGHT', width, .92, 0, 0, side * .67, side < 0 ? Math.PI : 0);
    for (let i = 0; i < 5; i++) addMesh(rail, new THREE.BoxGeometry(.33, .21, .11), mastLenses, (i - 2) * .53, -.32, -.73);
  }

  const openingGantry = plan.structures.spans.find(span => span.kind === 'turn1-gantry');
  if (openingGantry) {
    const {a, b, station} = openingGantry;
    const pose = sample(track, station);
    const width = Math.min(track.width + 3, Math.hypot(a.x - b.x, a.z - b.z) - 1.8);
    for (const side of [-1, 1]) {
      const z = side * (openingGantry.width / 2 + .012);
      sign(root, 'MARINA BAY', width, 1.18, pose.x + Math.sin(pose.heading) * z, a.y + .66,
        pose.z + Math.cos(pose.heading) * z, pose.heading + (side < 0 ? Math.PI : 0), '#db263d');
    }
  }

  const boards = plan.sites.filter(site => ['corner-board', 'brake-board'].includes(site.kind));
  for (const site of boards) {
    const board = group(site);
    scene.box(.05, 1.52, .05, '#a3aaa0', 0, .76, 0, board);
    sign(board, site.label, 1.1, .61, 0, 1.48, -.024, Math.PI,
      site.kind === 'corner-board' ? '#263c58' : '#40484f');
  }
  const panelsOnWalls = trackBarriers(track).walls.filter(wall => wall.kind === 'track' && wall.inward);
  const boardColors = ['#234ca0', '#19336e', '#245a66'];
  for (const [i, wall] of panelsOnWalls.entries()) {
    const opening = wall.station >= 135 && wall.station <= 358;
    if (opening ? Math.round(wall.station / track.step) % 2 !== 0 : i % 5 !== 2) continue;
    const normal = wall.inward;
    const depth = wall.width / 2 + .009;
    const gate = i % 95 === 2;
    const text = opening ? 'MARINA BAY' : gate ? 'ACCESS' : ['MARINA NIGHT', 'APEX MOTORSPORT', 'CITY CIRCUIT'][i % 3];
    if (wall.length < .4) continue;
    sign(root, text, Math.min(2.9, wall.length - .06), .74,
      wall.x + normal.x * depth, (wall.a.y + wall.b.y) / 2 + .57,
      wall.z + normal.z * depth, Math.atan2(normal.x, normal.z), opening ? '#203e83' : gate ? '#a95229' : boardColors[i % 3]);
  }
  addApronLettering(root, track);
  const pit = pitLayout(track);
  function roadLabel(text, pose, width, height) {
    const label = sign(root, text, width, height, pose.x, pose.y + .104, pose.z, 0, null);
    label.rotation.set(-Math.PI / 2 - (pose.pitch || 0), pose.heading + Math.PI, 0, 'YXZ');
  }
  function roadBar(station, width, color) {
    const p = sample(track, station);
    const stripe = scene.box(width, .017, .18, color, p.x, p.y + .096, p.z);
    stripe.rotation.set(-p.pitch, p.heading, 0, 'YXZ');
  }
  for (let i = 0; i < 20; i++) {
    const slot = gridSlot(i);
    roadLabel(String(i + 1), sample(track, slot.s - 4, slot.offset), 1.1, .64);
    if (i < 8) continue;
    const p = sample(track, slot.s, slot.offset);
    const g = new THREE.Group();
    g.position.set(p.x, p.y + .11, p.z);
    g.rotation.set(-p.pitch, p.heading, 0, 'YXZ');
    root.add(g);
    scene.box(2.8, .025, .12, '#e1e0d5', 0, 0, 2.85, g);
    scene.box(.12, .025, 5.4, '#e1e0d5', slot.offset < 0 ? -1.4 : 1.4, 0, .2, g);
  }
  for (const [label, station] of [['S1', SINGAPORE_MARKINGS.sector1], ['S2', SINGAPORE_MARKINGS.sector2],
    ...SINGAPORE_MARKINGS.detection.map(distance => ['DETECT', distance]),
    ['SC1', pit.entry + 5], ['SC2', pit.entry + pit.length - 5]]) {
    roadBar(station, track.width - 1.15, label.startsWith('SC') ? '#318bd5' : '#b9bcb1');
    roadLabel(label, sample(track, station - 3), 2.6, .75);
  }
  roadLabel(String(Math.round(pitTransitPlan(track).speed * 3.6)), pitRoadPose(track, Math.min(pit.taper + 13, 125)), 2.45, 1.1);
  for (let i = 0; i < 5; i++) roadLabel('PIT ' + (i + 1), pitRoadPose(track, pit.box - 18 + i * 8, pit.side * 1.5), 1.2, .52);

  const manholes = [], drains = [], repairs = [];
  for (let s = 26; s < track.length; s += 59) {
    const side = Math.floor(s / 59) % 2 ? -1 : 1;
    manholes.push(sample(track, s, side * 4.15));
    drains.push(sample(track, s + 9, side * (track.width / 2 - .62)));
  }
  for (const station of SINGAPORE_MARKINGS.patches) {
    for (let i = 0; i < 5; i++) repairs.push(sample(track, station - 22 + i * 9, (i % 3 - 1) * 4.2));
  }
  for (const corner of SINGAPORE_CORNERS.filter(record => record.runoff === 'escape')) {
    for (let i = 0; i < 4; i++) repairs.push(sample(track, corner.station - 51 + i * 10, corner.outside * 5.65));
  }
  const roadInk = new THREE.MeshStandardMaterial({color: '#555a5d', roughness: .7, metalness: .15});
  instances(new THREE.CylinderGeometry(.39, .39, .018, 12), roadInk, manholes, (p, obj) => {obj.position.y += .074;});
  instances(new THREE.BoxGeometry(.37, .014, .71), roadInk, drains, (p, obj) => {obj.position.y += .075;});
  const patchMap = canvasTexture(128, 128, (ctx, w, h) => {
    for (let i = 0; i < 380; i++) {
      ctx.fillStyle = i % 5 ? 'rgba(29,32,38,.25)' : 'rgba(173,161,135,.19)';
      ctx.fillRect(i * 23 % w, i * 47 % h, 1 + i % 3, 1 + i % 5);
    }
    for (const x of [16, 28, 61, 73]) {
      ctx.fillStyle = 'rgba(20,22,25,.14)';
      ctx.fillRect(x, 0, 4, 128);
    }
  });
  const patch = new THREE.MeshStandardMaterial({map: patchMap, transparent: true, depthWrite: false, roughness: .93});
  const patchGeometry = new THREE.PlaneGeometry(2.7, 7.6);
  patchGeometry.rotateX(-Math.PI / 2);
  instances(patchGeometry, patch, repairs, (p, obj) => {obj.position.y += .083; obj.rotation.x = -p.pitch;});
  const puddleGeometry = new THREE.BufferGeometry(), puddlePositions = [];
  for (const [i, band] of singaporeBands(track).tarmac.entries()) {
    if (i % 24 !== 0 || band.runoff === 'paint') continue;
    const middle = band.polygon.reduce((sum, point) => ({
      x: sum.x + point.x / 4, y: sum.y + point.y / 4, z: sum.z + point.z / 4
    }), {x: 0, y: 0, z: 0});
    for (const j of [0, 1, 3, 3, 1, 2]) {
      const p = band.polygon[j];
      puddlePositions.push(middle.x + (p.x - middle.x) * .66,
        middle.y + (p.y - middle.y) * .66 + .025, middle.z + (p.z - middle.z) * .66);
    }
  }
  puddleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(puddlePositions, 3));
  puddleGeometry.computeVertexNormals();
  const puddleMat = new THREE.MeshStandardMaterial({color: '#40505b', roughness: .11, metalness: .58,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0});
  const puddles = new THREE.Mesh(puddleGeometry, puddleMat);
  root.add(puddles);
  atlas.needsUpdate = true;

  const lightGain = {value: 1.67}, field = createYasmarinaLightField(scene, track, lightGain);
  const fixedLights = [[-410, 360, '#edf6ff'], [400, -290, '#fff2df']].map(([x, z, color]) => {
    const light = new THREE.DirectionalLight(color, .43);
    light.position.set(x, 240, z);
    root.add(light, light.target);
    return light;
  });
  let wet = 0, attached = false, previous = -Infinity;
  function frame(time, cars) {
    const enabled = scene.singaporeLightsEnabled !== false;
    if (!attached) {
      field.apply(root);
      attached = true;
    }
    field.frame();
    lightGain.value = (enabled ? 1.67 : 1.12) * (1 - wet * .14);
    for (const light of fixedLights) {
      light.visible = enabled;
      light.intensity = .43 * (1 - wet * .18);
    }
    for (const halo of halos) halo.visible = enabled;
    glowMat.opacity = .31 + wet * .21;
    scene.sun.intensity = (enabled ? .57 : 1.02) * (1 - wet * .18);
    scene.sun.color.set('#e7f3ff');
    scene.hemisphere.intensity = .63 + wet * .1;
    scene.hemisphere.color.set('#7d9eba');
    scene.hemisphere.groundColor.set('#534743');
    if (time - previous < 120) return;
    previous = time;
    clock.value = time * .001;
    phone.opacity = .56 + .14 * Math.sin(time * .002);
    for (const {mesh, site} of panels) {
      const caution = cars.some(c => !c.finished && !c.retired &&
        (c.offtrack || c.sliding) && Math.hypot(c.x - site.x, c.z - site.z) < 120);
      const red = cars.length > 0 && cars.every(c => c.retired);
      mesh.material.color.set(red ? '#ff553b' : caution ? '#f3c33e' : '#32cc91');
    }
  }

  return {
    frame,
    setConditions(value) {
      wet = value;
      puddles.visible = value > .16;
      puddleMat.opacity = .48 * value;
    },
    dispose() {
      field.dispose();
      for (const light of fixedLights) {
        light.removeFromParent();
        light.target.removeFromParent();
        light.dispose();
      }
    },
    budget: {masts: masts.length, ledHeads: masts.length * 6, spectators: crowd.length, flags: flags.length,
      trees: trees.length, planters: planters.length, streetFurniture: lamps.length + traffic.length + benches.length + bollards.length,
      marshalPosts: panels.length, dynamicFills: 2, boards: boards.length}
  };
}
