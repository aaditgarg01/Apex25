import {sample, wrap} from '/shared/tracks.mjs';
import {pitLayout, pitRoadPose} from '/shared/pit-layout.mjs';
import {
  singaporeApronClear, singaporeBox, singaporeEdges, singaporeFootprintClear, singaporeLocal,
  singaporePolygonsOverlap
} from '/shared/singapore.mjs';
import {singaporeStructures} from '/shared/singapore-structures.mjs';
import {SINGAPORE_CORNERS} from './data/singapore-runoff.js';
import {SINGAPORE_ARCHITECTURE} from './data/singapore-architecture.js';
import {SINGAPORE_CITY} from './data/singapore-city.js';

function ring(points) {
  return points.map(([x, z]) => ({x, z}));
}

function scaleRings(rings, x, z, factor) {
  const scale = polygon => polygon.map(p => [x + (p[0] - x) * factor, z + (p[1] - z) * factor]);
  return rings.map(r => ({outer: scale(r.outer), holes: r.holes.map(scale)}));
}

const cache = new WeakMap();
const visualKinds = new Set(['esplanade', 'court', 'cityhall', 'fullerton', 'sands', 'skypark', 'skyline', 'flyermall']);

export function planSingapore(track, height, waterAt) {
  if (cache.has(track)) return cache.get(track);
  const structures = singaporeStructures(track), rows = singaporeEdges(track), city = [], sites = [], reserved = [], skipped = [];
  const pit = pitLayout(track);
  for (const support of structures.supports) reserved.push(singaporeBox(support, .5));

  const fits = (polygon, margin, allowWater = false) => singaporeFootprintClear(track, polygon, margin) &&
    singaporeApronClear(track, polygon) &&
    (allowWater || polygon.every(p => !waterAt(p.x, p.z))) &&
    !reserved.some(other => singaporePolygonsOverlap(polygon, other));

  function reserve(spec) {
    const polygon = singaporeBox(spec), margin = spec.margin ?? .65;
    if (!fits(singaporeBox(spec, .22), margin, spec.allowWater)) return null;
    const site = {...spec, polygon, y: spec.y ?? height(spec.x, spec.z)};
    reserved.push(singaporeBox(spec, .22));
    sites.push(site);
    return site;
  }

  function roadside(spec) {
    const index = Math.min(track.points.length - 1, Math.floor(wrap(spec.s, track.length) / track.step));
    const first = track.width / 2 + rows[spec.side][index].setback + spec.w / 2 + .7;
    for (let offset = Math.max(first, spec.offset || 0); offset < (spec.maxOffset || 65); offset += 1.6) {
      const p = sample(track, spec.s, spec.side * offset);
      const site = reserve({...p, ...spec, heading: p.heading});
      if (site) return site;
    }
    return null;
  }

  const flyer = SINGAPORE_CITY.flyer, [wheelX, wheelZ] = flyer.center;
  const wheel = reserve({id: 'flyer', kind: 'flyer', x: wheelX, z: wheelZ, heading: flyer.heading,
    w: 156, d: 35, margin: 1, allowWater: true});
  if (!wheel) {
    // The wheel plane is elevated. The actual supports and capsule projection
    // are kept on the mapped site if the two ground assemblies clear access.
    const c = Math.cos(flyer.heading), s = Math.sin(flyer.heading);
    const supportSites = [-42, 42].map(x => ({
      id: 'flyer-foundation-' + x, kind: 'flyer-foundation', x: wheelX + c * x, z: wheelZ - s * x,
      heading: flyer.heading, w: 10, d: 35, margin: 1, allowWater: true
    }));
    if (supportSites.every(site => fits(singaporeBox(site), 1, true))) {
      for (const site of supportSites) reserve(site);
    } else skipped.push('flyer-foundation');
  }

  const mappedPit = SINGAPORE_ARCHITECTURE.landmarks.find(record => record.kind === 'pit');
  const mappedPitPoints = mappedPit.coordinates.map(coord => singaporeLocal(track, coord));
  const pitHeading = pit.frame.heading, along = p => p.x * Math.sin(pitHeading) + p.z * Math.cos(pitHeading);
  const extent = Math.max(...mappedPitPoints.map(along)) - Math.min(...mappedPitPoints.map(along));
  let pitBuilding = null;
  search: for (const length of [extent, extent * .82, extent * .68, 160, 125]) {
    for (const depth of [19, 16, 13]) {
      for (const distance of [0, 25, -25, 50, -50]) {
        const p = pitRoadPose(track, pit.box + distance);
        for (const gap of [2, 4, 6, 10, 15, 22, 31]) {
          const offset = pit.side * (pit.width / 2 + depth / 2 + gap);
          const x = p.x + Math.cos(pitHeading) * offset, z = p.z - Math.sin(pitHeading) * offset;
          pitBuilding = reserve({id: 'pit-building', kind: 'pit', x, z, y: p.y - .25, heading: pitHeading,
            w: depth, d: length, side: pit.side, margin: .9, source: mappedPit.way, distance, gap});
          if (pitBuilding) break search;
        }
      }
    }
  }
  if (!pitBuilding) skipped.push('pit-building');

  for (const record of SINGAPORE_ARCHITECTURE.landmarks) {
    if (['pit', 'padang'].includes(record.kind)) continue;
    const points = record.coordinates.map(coord => singaporeLocal(track, coord));
    const x = (Math.min(...points.map(p => p.x)) + Math.max(...points.map(p => p.x))) / 2;
    const z = (Math.min(...points.map(p => p.z)) + Math.max(...points.map(p => p.z))) / 2;
    const w = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x));
    const d = Math.max(...points.map(p => p.z)) - Math.min(...points.map(p => p.z));
    const size = record.kind === 'museum' ? 61 : record.kind === 'club' ? Math.max(w, d) : record.kind === 'lim' ? 8 : 12;
    const spec = {id: record.kind, kind: record.kind, x, z, w: w || size, d: d || size, heading: 0,
      source: record.way || record.node, height: Number(record.height), allowWater: record.kind === 'museum', margin: 1};
    let site;
    search: for (const factor of [1, .86, .72, .60, .48]) {
      for (const [dx, dz] of [[0, 0], [-5, 0], [5, 0], [0, -5], [0, 5], [-9, -9], [9, 9], [14, -10], [-14, 10], [18, 0], [-18, 0]]) {
        const fittedWidth = record.kind === 'civilian' ? Math.min(7, spec.w * factor) : spec.w * factor;
        const fittedDepth = record.kind === 'civilian' ? Math.min(7, spec.d * factor) : spec.d * factor;
        site = reserve({...spec, x: x + dx, z: z + dz, w: fittedWidth, d: fittedDepth,
          fitShift: Math.hypot(dx, dz), fitScale: factor});
        if (site) break search;
      }
    }
    if (!site) skipped.push(record.kind);
  }

  // Permanent city comes from the existing 2.18.0 OSM geometry. A modest
  // footprint inset is allowed when its map boundary intersects another branch.
  const buildings = [...SINGAPORE_CITY.buildings].sort((a, b) => Number(visualKinds.has(b.kind)) - Number(visualKinds.has(a.kind)));
  for (const record of buildings) {
    if (['pit', 'flyerbase'].includes(record.kind)) continue;
    const [x, z] = record.center, special = visualKinds.has(record.kind);
    let fitted = false;
    for (const factor of special ? [1, .94, .87, .78, .68] : [1, .93, .83]) {
      const rings = scaleRings(record.rings, x, z, factor);
      const polygons = rings.map(r => ring(r.outer));
      // The roof deck has no ground-level occupancy. Each of its three mapped
      // towers is fitted independently before its elevated deck is drawn.
      const elevated = record.kind === 'skypark';
      if (!elevated && !polygons.every(p => fits(p, special ? 1.45 : .28, record.kind === 'sands'))) continue;
      const parsedHeight = Number.parseFloat(record.height) || Number.parseFloat(record.levels) * 3.6;
      const floor = special && ['sands', 'skypark'].includes(record.kind) ? height(x, z) : height(x, z) - .05;
      city.push({...record, rings, polygons, x, z, y: floor, factor, height: Math.min(285, Math.max(6, parsedHeight || 26))});
      if (!elevated) reserved.push(...polygons);
      fitted = true;
      break;
    }
    if (!fitted && special) skipped.push(record.name || record.kind);
  }

  for (const [id, label, station, side, w, d, count] of SINGAPORE_ARCHITECTURE.stands) {
    const spec = {id, kind: 'stand', label, s: station, side, w, d, rows: count, maxOffset: 112, margin: 1};
    let site;
    search: for (const scale of [1, .82, .68, .53, .43]) {
      for (const shift of [0, -16, 16, -34, 34, -55, 55, -79, 79, -108, 108]) {
        site = roadside({...spec, s: station + shift, w: Math.max(8, w * scale), d: d * scale,
          rows: Math.max(12, Math.round(count * scale))});
        if (site) break search;
      }
    }
    if (!site) skipped.push(id);
  }

  for (const side of [-1, 1]) {
    const id = side < 0 ? 'turn1-screen-outside' : 'turn1-screen-inside';
    const spec = {id, kind: 'turn1-screen', side, w: 3.7, d: 10.8, maxOffset: 46, margin: .85};
    const stations = side < 0 ? [274, 257, 294, 313, 334] : [332, 313, 302, 342, 284];
    if (!stations.some(s => roadside({...spec, s}))) skipped.push(id);
  }

  for (const [index, station] of [610, 2210, 3300, 4450, -135].entries()) {
    const side = index % 2 ? -1 : 1;
    for (const shift of [0, -40, 40, -80, 80]) {
      if (roadside({id: 'fan-' + index, kind: index === 4 ? 'medical' : 'fan',
        s: station + shift, side, w: 13, d: 25, maxOffset: 90, margin: 1.1})) break;
    }
  }

  for (const corner of SINGAPORE_CORNERS) {
    const board = {id: 'corner-' + corner.turn, kind: 'corner-board', s: corner.station - 13,
      side: corner.outside, w: 1.5, d: 1.8, maxOffset: 31, label: 'T' + corner.turn};
    roadside(board) || roadside({...board, side: -board.side});
    if (![1, 5, 7, 10, 13, 14, 16, 18].includes(corner.turn)) continue;
    for (const distance of corner.turn === 7 ? [200, 150, 100, 50] : [150, 100, 50]) {
      const braking = {...board, id: 'brake-' + corner.turn + '-' + distance,
        s: corner.station - distance, kind: 'brake-board', label: String(distance)};
      roadside(braking) || roadside({...braking, side: -braking.side});
    }
  }

  for (let i = 0; i < 36; i++) {
    const s = (i + .48) * track.length / 36, side = i % 2 ? -1 : 1;
    const spec = {id: 'marshal-' + i, kind: 'marshal', s, side, w: i % 6 === 0 ? 9 : 4,
      d: i % 6 === 0 ? 13 : 5, crane: i % 6 === 0, maxOffset: 34, margin: .72};
    roadside(spec) || roadside({...spec, side: -side});
  }

  for (let i = 0; i < 280; i++) {
    const s = (i + .35) * track.length / 280, side = i % 2 ? -1 : 1;
    // The complete crossbar and glow envelope is reserved in plan view.
    const spec = {id: 'mast-' + i, kind: 'mast', s, side, w: 4.8, d: 2.7, maxOffset: 25,
      height: 12 + (i % 4) * .75, margin: .55};
    roadside(spec) || roadside({...spec, side: -side});
  }

  for (let i = 0; i < 230; i++) {
    const s = (i + .6) * track.length / 230, side = i % 2 ? -1 : 1;
    const kind = ['tree', 'lamp', 'planter', 'traffic', 'bench', 'bollards'][i % 6];
    const [w, d] = {tree: [11.8, 11.8], lamp: [3, 3], planter: [4, 5], traffic: [2.6, 3],
      bench: [2.7, 5.1], bollards: [2.2, 4.4]}[kind];
    roadside({id: 'street-' + i, kind, s, side, w, d, maxOffset: 48, margin: .63, variant: i % 4});
  }

  for (let i = 0; i < 125; i++) {
    const s = (i + .35) * track.length / 125, side = i % 2 ? -1 : 1;
    const kind = i % 3 ? 'tree' : 'planter';
    roadside({id: 'greenery-' + i, kind, s, side, w: kind === 'tree' ? 9.6 : 3.6,
      d: kind === 'tree' ? 9.6 : 4, maxOffset: 56, margin: .6, variant: i % 4});
  }

  const result = {city, sites, wheel, structures, pitBuilding, skipped};
  cache.set(track, result);
  return result;
}
