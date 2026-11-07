import * as THREE from '/vendor/three.module.js';

function canvasTexture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export function addRunoffLettering(root, paintRows) {
  const byApron = new Map();
  for (const row of paintRows) {
    if (!row.lettering || !row.apron?.label) continue;
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
      const focus = best.findIndex(row => row.i >= apron.letteringIndex);
      const start = focus >= 0 ? Math.max(0, Math.min(best.length - 10, focus - 5)) : Math.floor((best.length - 10) / 2);
      best = best.slice(start, start + 10);
    }
    if (!labelMaterials.has(apron.label)) {
      const map = canvasTexture(1024, 192, (ctx, w, h) => {
        ctx.font = 'italic 900 155px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff6e1';
        ctx.fillText(apron.label, w / 2, h / 2, w * .93);
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
        uv.push(row.side < 0 ? 1 - u : u, v);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.computeVertexNormals();
    const label = new THREE.Mesh(geometry, labelMaterials.get(apron.label));
    label.userData.runoffLettering = apron.label;
    root.add(label);
  }
}
