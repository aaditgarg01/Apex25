import * as THREE from '/vendor/three.module.js';

const fabric = '#dedbd0';
const steel = '#263e3c';
const up = new THREE.Vector3(0, 1, 0);

function shell() {
  return {positions: [], indices: []};
}

function panel(roof, point, rows, columns) {
  const start = roof.positions.length / 3;
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
    roof.positions.push(...point(row / rows, col / columns * 2 - 1));
    if (row === rows || col === columns) continue;
    const i = start + row * (columns + 1) + col, next = i + columns + 1;
    roof.indices.push(i, next, i + 1, i + 1, next, next + 1);
  }
}

function addSkin(group, roof) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(roof.positions, 3));
  geometry.setIndex(roof.indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    color: fabric, side: THREE.DoubleSide, roughness: .83
  }));
  mesh.userData.mappedStatic = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function strut(scene, group, a, b, width) {
  const direction = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const midpoint = a.map((axis, i) => (axis + b[i]) / 2);
  const beam = scene.box(width, direction.length(), width, steel, ...midpoint, group);
  beam.quaternion.setFromUnitVectors(up, direction.normalize());
}

function rib(scene, group, path, width, sections) {
  let a = path(0);
  for (let i = 1; i <= sections; i++) {
    const b = path(i / sections);
    strut(scene, group, a, b, width);
    a = b;
  }
}

function drum(group, top, bottom, height, y, color) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, 24),
    new THREE.MeshStandardMaterial({color, roughness: .81}));
  mesh.position.y = y;
  mesh.userData.mappedStatic = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

export function drawSepangRoof(scene, site, group, front) {
  const roof = shell(), width = site.w - 1.55, length = site.d - 1.5;
  const height = site.rows * .50 + 4.2;
  const modules = Math.max(2, Math.round(length / 13));
  const span = length / modules;
  for (let module = 0; module < modules; module++) {
    const center = (module + .5 - modules / 2) * span;
    const point = (t, across, lift = 0) => {
      const bulge = 1 - across * across;
      const x = -.5 + t * (1 - .12 * across * across);
      const y = height + 1.85 * t + bulge * Math.sin(t * Math.PI * .88) * 1.12;
      return [front * x * width, y + lift, center + across * span / 2];
    };
    panel(roof, point, 8, 10);

    const hub = [point(0, 0)[0], height - .78, center];
    strut(scene, group, [hub[0], -.15, center], hub, .32);
    strut(scene, group, hub, point(.55, 0, -.14), .2);
    for (const across of [-1, 0, 1]) {
      rib(scene, group, t => point(t, across, -.12), across === 0 ? .18 : .12, 4);
    }
    rib(scene, group, t => point(1, 2 * t - 1, -.09), .16, 6);
    for (const side of [-1, 1]) {
      strut(scene, group, hub, point(.68, side, -.17), .13);
      strut(scene, group, point(.34, side, -.15), point(.78, 0, -.16), .08);
    }
  }
  addSkin(group, roof);
}

export function drawSepangLandmark(scene, site, group) {
  if (site.kind !== 'petal-tower') return false;
  const radius = Math.min(site.w, site.d) / 2 - 1.2;
  const roof = shell(), petals = 10, hubHeight = 12.2;
  drum(group, 4.6, radius * .56, 3.15, 1.3, '#698073');
  drum(group, 3.9, 5.4, 8.1, 5.7, '#9ca495');
  for (const y of [5.5, 9.5]) {
    drum(group, 5.5, 5.5, .36, y - .83, '#718078');
    drum(group, 5.25, 5.25, 1.20, y, '#49625e');
    drum(group, 5.6, 5.6, .37, y + .79, '#c4c5b5');
  }
  drum(group, 3.8, 5.2, 1.95, 11.25, steel);

  for (let petal = 0; petal < petals; petal++) {
    const theta = petal * 2 * Math.PI / petals;
    const point = (t, across, lift = 0) => {
      const angle = theta + across * Math.PI / petals;
      const bulge = 1 - across * across;
      const r = 1.25 + (radius - 1.25) * t * (.88 + .12 * bulge * t);
      const y = hubHeight + 3.75 * t ** 1.32 + bulge * (.85 * t + .66 * Math.sin(Math.PI * t));
      return [Math.sin(angle) * r, y + lift, Math.cos(angle) * r];
    };
    panel(roof, point, 9, 10);

    for (const across of [-1, 0]) {
      rib(scene, group, t => point(t, across, -.18), across === 0 ? .29 : .18, 6);
    }
    rib(scene, group, t => point(1, 2 * t - 1, -.13), .24, 6);
    for (const side of [-1, 1]) {
      strut(scene, group, point(.19, 0, -.76), point(.68, side, -.20), .15);
      strut(scene, group, point(.50, side, -.21), point(.94, 0, -.24), .12);
    }
  }
  addSkin(group, roof);
  drum(group, 1.0, 1.4, .9, hubHeight + .34, '#59736b');
  strut(scene, group, [0, hubHeight + .3, 0], [0, 22.4, 0], .14);
  const ornament = new THREE.Mesh(new THREE.IcosahedronGeometry(.66, 1),
    new THREE.MeshBasicMaterial({color: '#70877b', wireframe: true}));
  ornament.position.y = 19.35;
  group.add(ornament);
  return true;
}
