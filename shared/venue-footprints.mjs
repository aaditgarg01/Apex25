export function footprintBox(site, margin = 0) {
  const c = Math.cos(site.heading || 0), s = Math.sin(site.heading || 0);
  return [[-1, -1], [-1, 1], [1, 1], [1, -1]].map(([x, z]) => ({
    x: site.x + c * x * (site.w / 2 + margin) + s * z * (site.d / 2 + margin),
    z: site.z - s * x * (site.w / 2 + margin) + c * z * (site.d / 2 + margin)
  }));
}

export function footprintStrip(a, b, half) {
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
  if (length < 1e-5) return [];
  const nx = dz / length * half, nz = -dx / length * half;
  return [{x: a.x - nx, z: a.z - nz}, {x: b.x - nx, z: b.z - nz},
    {x: b.x + nx, z: b.z + nz}, {x: a.x + nx, z: a.z + nz}];
}

export function footprintContains(polygon, point) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.z > point.z) !== (b.z > point.z) &&
        point.x < a.x + (point.z - a.z) * (b.x - a.x) / (b.z - a.z)) inside = !inside;
  }
  return inside;
}

export function footprintBounds(polygon) {
  return {
    minX: Math.min(...polygon.map(p => p.x)), maxX: Math.max(...polygon.map(p => p.x)),
    minZ: Math.min(...polygon.map(p => p.z)), maxZ: Math.max(...polygon.map(p => p.z))
  };
}

export function footprintCells(box, cell, visit) {
  for (let x = Math.floor(box.minX / cell); x <= Math.floor(box.maxX / cell); x++) {
    for (let z = Math.floor(box.minZ / cell); z <= Math.floor(box.maxZ / cell); z++) visit(x + ':' + z);
  }
}

export const boxesOverlap = (a, b) => a.minX <= b.maxX && b.minX <= a.maxX && a.minZ <= b.maxZ && b.minZ <= a.maxZ;
const orient = (a, b, p) => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);

export function footprintsOverlap(a, b) {
  if (!a.length || !b.length || !boxesOverlap(footprintBounds(a), footprintBounds(b))) return false;
  if (a.some(p => footprintContains(b, p)) || b.some(p => footprintContains(a, p))) return true;
  for (let i = 0; i < a.length; i++) {
    const p = a[i], q = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) {
      const r = b[j], s = b[(j + 1) % b.length];
      if (orient(p, q, r) * orient(p, q, s) < -1e-10 &&
          orient(r, s, p) * orient(r, s, q) < -1e-10) return true;
    }
  }
  return false;
}
