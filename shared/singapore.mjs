import {footprintBox as singaporeBox, footprintStrip as singaporeStrip, footprintContains as singaporeContains, footprintsOverlap as singaporePolygonsOverlap, footprintBounds as bounds, footprintCells, boxesOverlap} from './venue-footprints.mjs';
import {sample, wrap} from './tracks.mjs';
import {ribbonOffset} from './surface.mjs';
import {pitLayout, pitRoadPose} from './pit-layout.mjs';
import {SINGAPORE_ROADS} from './singapore-roads.mjs';
import {SINGAPORE_APRONS, SINGAPORE_CORNERS} from './singapore-runoff-data.mjs';

const CELL = 35;
const roadCache = new WeakMap();
// The mapped motorway above Turns 1–3 has its own separately fitted deck.
export const SINGAPORE_VIADUCT_WAYS = new Set([74722808, 122067627, 122067629, 122067630]);
const edgeCache = new WeakMap();
const bandCache = new WeakMap();
const wallCache = new WeakMap();
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function singaporeLocal(track, [lon, lat]) {
  return {
    x: (lon - track.origin.lon) * 111320 * Math.cos(track.origin.lat * Math.PI / 180),
    z: (track.origin.lat - lat) * 111320
  };
}

export {singaporeBox, singaporeStrip, singaporeContains, singaporePolygonsOverlap};
const cells = (box, visit) => footprintCells(box, CELL, visit);

function pointToSegment(point, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const fraction = clamp(((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  return Math.hypot(point.x - a.x - fraction * dx, point.z - a.z - fraction * dz);
}

export function singaporeVertex(track, index, offset) {
  const p = track.points[index], lateral = ribbonOffset(track, index, offset);
  return {x: p.x + Math.cos(p.heading) * lateral, z: p.z - Math.sin(p.heading) * lateral, y: p.y};
}

function indexPolygon(grid, polygon, metadata) {
  const entry = {...metadata, polygon, ...bounds(polygon)};
  cells(entry, key => {
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(entry);
  });
  return entry;
}

function nearby(grid, box) {
  const entries = new Set();
  cells(box, key => {
    for (const entry of grid.get(key) || []) if (boxesOverlap(entry, box)) entries.add(entry);
  });
  return entries;
}

export function singaporeRoads(track) {
  if (roadCache.has(track)) return roadCache.get(track);
  const grid = new Map(), raceGrid = new Map(), pitGrid = new Map(), entries = [], access = [];
  const add = (poly, meta) => entries.push(indexPolygon(grid, poly, meta));
  const half = track.width / 2 - .012;
  track.points.forEach((point, i) => {
    const next = (i + 1) % track.points.length;
    const poly = [singaporeVertex(track, i, -half), singaporeVertex(track, next, -half),
      singaporeVertex(track, next, half), singaporeVertex(track, i, half)];
    add(poly, {kind: 'race', index: i});
    indexPolygon(raceGrid, poly, {a: point, b: track.points[next]});
  });
  const pit = pitLayout(track);
  for (let d = 0; d < pit.length; d += 3) {
    const end = Math.min(d + 3, pit.length), edge = pit.width / 2;
    const polygon = [pitRoadPose(track, d, -edge), pitRoadPose(track, end, -edge),
      pitRoadPose(track, end, edge), pitRoadPose(track, d, edge)];
    add(polygon, {kind: 'pit'});
    indexPolygon(pitGrid, polygon, {a: pitRoadPose(track, d), b: pitRoadPose(track, end)});
  }

  // Race-day and regular public-road alignments duplicate one another.
  // Remove only co-located, parallel carriageway segments. Crossing streets,
  // footpaths and parallel branches are still part of the protected footprint.
  for (const [way, type, width, bridge, coordinates] of SINGAPORE_ROADS) {
    const points = coordinates.map(coord => singaporeLocal(track, coord));
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
      const count = Math.ceil(length / 10);
      for (let j = 0; j < count; j++) {
        const at = fraction => ({x: a.x + (b.x - a.x) * fraction, z: a.z + (b.z - a.z) * fraction});
        const start = at(j / count), end = at((j + 1) / count);
        const polygon = singaporeStrip(start, end, width / 2);
        if (!polygon.length) continue;
        const middle = at((j + .5) / count);
        const duplicateRadius = way === 686335807 ? 11.5 : 5.2;
        const probe = Math.max(5, duplicateRadius);
        const box = {minX: middle.x - probe, maxX: middle.x + probe, minZ: middle.z - probe, maxZ: middle.z + probe};
        const duplicates = !['path', 'footway', 'pedestrian', 'steps', 'cycleway'].includes(type) &&
          [...nearby(raceGrid, box)].some(race => {
            const direction = Math.abs((b.x - a.x) * Math.sin(race.a.heading) + (b.z - a.z) * Math.cos(race.a.heading));
            return direction > length * .92 && pointToSegment(middle, race.a, race.b) < duplicateRadius &&
              pointToSegment(start, race.a, race.b) < duplicateRadius + 5 &&
              pointToSegment(end, race.a, race.b) < duplicateRadius + 5;
          });
        // OSM 100484287 is the permanent pit route. The generated lane
        // reserves the co-located section, while its separate ends remain.
        const pitDuplicate = way === 100484287 && [...nearby(pitGrid, box)].some(row => {
          const direction = Math.abs((b.x - a.x) * Math.sin(row.a.heading) + (b.z - a.z) * Math.cos(row.a.heading));
          return direction > length * .92 && pointToSegment(middle, row.a, row.b) < 8.3;
        });
        if (duplicates || pitDuplicate) continue;
        const item = {kind: 'access', way, type, bridge};
        add(polygon, item);
        access.push({...item, polygon, a: start, b: end});
      }
    }
  }
  const result = {grid, entries, access};
  roadCache.set(track, result);
  return result;
}

export function singaporeRoadClear(track, polygon, filter = () => true) {
  if (!polygon.length) return false;
  const {grid} = singaporeRoads(track);
  return ![...nearby(grid, bounds(polygon))].some(road =>
    filter(road) && singaporePolygonsOverlap(polygon, road.polygon));
}

export function singaporeGroundClear(track, polygon) {
  return singaporeRoadClear(track, polygon, road =>
    !(road.kind === 'access' && road.bridge && SINGAPORE_VIADUCT_WAYS.has(road.way)));
}

export function singaporeFootprintClear(track, polygon, margin = 0) {
  if (!singaporeRoadClear(track, polygon)) return false;
  if (!margin) return true;
  // Buffer the actual polygon edges, including concave outlines and overhangs.
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const edge = singaporeStrip(a, b, margin);
    if (edge.length && !singaporeRoadClear(track, edge)) return false;
    if (!singaporeRoadClear(track, singaporeBox({...a, w: 2 * margin, d: 2 * margin}))) return false;
  }
  return true;
}

function stripAt(track, index, side, inner, outer) {
  const next = (index + 1) % track.points.length;
  return [singaporeVertex(track, index, inner * side), singaporeVertex(track, next, inner * side),
    singaporeVertex(track, next, outer * side), singaporeVertex(track, index, outer * side)];
}

export function singaporeEdges(track) {
  if (edgeCache.has(track)) return edgeCache.get(track);
  const rows = {}, half = track.width / 2;
  for (const side of [-1, 1]) {
    rows[side] = track.points.map((_, index) => {
      const station = index * track.step;
      const corner = SINGAPORE_CORNERS.find(c => Math.abs(station - c.station) < c.span);
      const baseline = .78;
      const outside = corner?.outside === side;
      const blend = corner ? clamp((corner.span - Math.abs(station - corner.station)) / 26, 0, 1) : 0;
      const normalWidth = outside ? baseline + (corner.width - baseline) * blend : baseline + .35 * blend;
      const apron = SINGAPORE_APRONS.find(a => a.side === side && Math.abs(station - a.station) < a.span);
      let width = normalWidth;
      if (apron) {
        const strength = clamp((apron.span - Math.abs(station - apron.station)) / 33, 0, 1);
        const eased = strength * strength * (3 - 2 * strength);
        let target = normalWidth + (Math.max(normalWidth, apron.width) - normalWidth) * eased;
        if (apron.profile) {
          target = normalWidth;
          const end = apron.profile.findIndex(([s]) => s >= station);
          if (end > 0) {
            const [from, startWidth] = apron.profile[end - 1], [to, endWidth] = apron.profile[end];
            target = Math.max(normalWidth, startWidth + (endWidth - startWidth) * (station - from) / (to - from));
          }
        }
        const previous = (index + track.points.length - 1) % track.points.length;
        const clear = size => [previous, index].every(at =>
          singaporeGroundClear(track, stripAt(track, at, side, half + .025, half + size + .7)));
        if (target > normalWidth && clear(normalWidth)) {
          let low = normalWidth, high = target;
          for (let pass = 0; pass < 6; pass++) {
            const mid = (low + high) / 2;
            if (clear(mid)) low = mid;
            else high = mid;
          }
          width = low;
        }
      }
      return {
        turn: corner?.turn || 0, width, normalWidth, setback: width + .4, apron,
        kerb: blend > .25 ? corner.kerb : null, barrier: outside && blend > .4 ? corner.barrier : 'concrete',
        runoff: outside && blend > .2 ? corner.runoff : 'paint',
        beyond: corner?.beyond || 'pavement, walkway or waterfront'
      };
    });
    // Ease the approach to the point where a neighboring branch constrains the width.
    for (let pass = 0; pass < 2; pass++) {
      const previous = rows[side].map(row => row.width);
      rows[side].forEach((row, i) => {
        if (!row.apron) return;
        row.width = Math.max(row.normalWidth, Math.min(row.width,
          (previous[(i - 1 + previous.length) % previous.length] + 2 * row.width + previous[(i + 1) % previous.length]) / 4));
        row.setback = row.width + .4;
      });
    }
  }
  edgeCache.set(track, rows);
  return rows;
}

export function singaporeBands(track) {
  if (bandCache.has(track)) return bandCache.get(track);
  const rows = singaporeEdges(track), half = track.width / 2, bands = {'tarmac': [], paint: [], kerb: [], pavement: []};
  const indexed = new Map();
  for (const side of [-1, 1]) {
    for (let i = 0; i < track.points.length; i++) {
      const j = (i + 1) % track.points.length, a = rows[side][i], b = rows[side][j];
      const at = (index, offset, height) => {
        const vertex = singaporeVertex(track, index, side * (half + offset));
        return {...vertex, y: vertex.y + height};
      };
      const push = (kind, start, end, depth, rear, height, extra = {}) => {
        const polygon = [at(i, start, height), at(j, end, height),
          at(j, rear, height), at(i, depth, height)];
        const widthA = Math.hypot(polygon[0].x - polygon[3].x, polygon[0].z - polygon[3].z);
        const widthB = Math.hypot(polygon[1].x - polygon[2].x, polygon[1].z - polygon[2].z);
        if (Math.max(widthA, widthB) < .03) return;
        if (!singaporeGroundClear(track, polygon)) return;
        const row = {polygon, side, i, turn: a.turn, kerb: a.kerb, runoff: a.runoff, ...extra};
        bands[kind].push(row);
        if (kind !== 'pavement') indexPolygon(indexed, polygon, {kind});
      };
      push('tarmac', .025, .025, a.width, b.width, .028);
      const paintA = a.runoff === 'paint' ? a.width : Math.min(.55, a.width);
      const paintB = b.runoff === 'paint' ? b.width : Math.min(.55, b.width);
      if (a.apron && a.apron === b.apron && Math.min(a.width, b.width) > 1.48) {
        const apron = a.apron;
        if (apron.design === 'opening-inside') {
          // Leave a strip of escape asphalt beyond the painted wedge and its kerb.
          const farEdge = row => .72 + (row.width - .72) * .68;
          push('paint', .10, .10, farEdge(a), farEdge(b), .049, {color: 'blue', apron, lettering: true});
          push('kerb', farEdge(a), farEdge(b), Math.min(a.width, farEdge(a) + .37), Math.min(b.width, farEdge(b) + .37), .065,
            {apron, kerb: 'red-white'});
        } else {
          const stripes = ['blue', 'white', 'gold', 'white', 'blue'];
          function divisions(index) {
            const amount = apron.design === 'opening-outside' ? clamp((index * track.step - 243) / 37, 0, 1) : 1;
            const swing = apron.design === 'opening-outside' ? .075 * Math.sin(index * track.step / 17) * amount : 0;
            return [0, .21 * amount, .31 * amount, .70 - .13 * amount + swing, .70 - .04 * amount + swing, 1];
          }
          const edgesA = divisions(i), edgesB = divisions(j);
          const offset = (row, fraction) => .10 + (row.width - .10) * fraction;
          for (const [stripe, color] of stripes.entries()) {
            push('paint', offset(a, edgesA[stripe]), offset(b, edgesB[stripe]),
              offset(a, edgesA[stripe + 1]), offset(b, edgesB[stripe + 1]), .049,
              {color, apron, lettering: stripe === 4 && (apron.design !== 'opening-outside' || i * track.step >= 280)});
          }
        }
      } else {
        push('paint', .08, .08, paintA, paintB, .043, {color: a.kerb ? 'blue' : 'slate'});
      }
      if (a.kerb && b.kerb) {
        const height = a.kerb === 'serrated' ? .071 + (i % 2) * .03 : .065;
        push('kerb', .10, .10, Math.min(a.width, .91), Math.min(b.width, .91), height);
      }
      if (i * track.step < 2650 || i * track.step > 3060) {
        push('pavement', a.setback + .35, b.setback + .35, a.setback + 2, b.setback + 2, -.04);
      }
    }
  }
  const result = {...bands, indexed};
  bandCache.set(track, result);
  return result;
}

export function singaporeApronClear(track, footprint) {
  const {indexed} = singaporeBands(track);
  return ![...nearby(indexed, bounds(footprint))].some(row => singaporePolygonsOverlap(row.polygon, footprint));
}

export function singaporeSurfaceAt(track, station, offset, wetness = 0) {
  const half = track.width / 2;
  let kind = 'asphalt', grip = 1, drag = 0;
  if (Math.abs(offset) > half) {
    const p = sample(track, station, offset);
    const local = [...nearby(singaporeBands(track).indexed, bounds([p]))].filter(row =>
      singaporeContains(row.polygon, p));
    if (local.some(row => row.kind === 'paint' || row.kind === 'kerb')) {
      kind = 'paint';
      grip = .96 - .24 * wetness;
    } else if (local.some(row => row.kind === 'tarmac')) {
      kind = 'tarmac';
      grip = 1 - .045 * wetness;
    } else {
      kind = 'pavement';
      grip = .81 - .22 * wetness;
      drag = .18;
    }
  }
  const index = Math.floor(wrap(station, track.length) / track.step);
  const edge = singaporeEdges(track)[offset < 0 ? -1 : 1][index];
  return {kind, grip, drag, trackLimit: half + 1, boundary: half + Math.max(7, edge.width)};
}

export function singaporeWalls(track) {
  if (wallCache.has(track)) return wallCache.get(track);
  const walls = [], rows = singaporeEdges(track), half = track.width / 2, pit = pitLayout(track);
  const add = (a, b, width, height, kind, style, inward, station) => {
    const footprint = singaporeStrip(a, b, width / 2 + .045);
    if (!singaporeGroundClear(track, footprint)) return false;
    walls.push({a, b, width, height, kind, style, inward, station});
    return true;
  };
  for (const side of [-1, 1]) {
    for (let i = 0; i < track.points.length; i++) {
      const j = (i + 1) % track.points.length, row = rows[side][i], next = rows[side][j];
      const pitStation = wrap(i * track.step - pit.entry, track.length);
      if (side === pit.side && pitStation > pit.taper && pitStation < pit.length - pit.taper) continue;
      const width = row.barrier === 'covered' ? .62 : .42, height = 1.06;
      const a = singaporeVertex(track, i, side * (half + row.setback));
      const b = singaporeVertex(track, j, side * (half + next.setback));
      const heading = track.points[i].heading, normal = {x: -Math.cos(heading) * side, z: Math.sin(heading) * side};
      if (add(a, b, width, height, 'track', row.barrier, normal, i * track.step)) {
        add({...a, y: a.y + height}, {...b, y: b.y + height}, .10, 2.95, 'fence', 'mesh', normal);
      }
    }
  }
  for (const side of [-1, 1]) {
    const outer = side === pit.side;
    for (let d = 6; d < pit.length - 6; d += 3) {
      const a = pitRoadPose(track, d, side * (pit.width / 2 + .46));
      const b = pitRoadPose(track, d + 3, side * (pit.width / 2 + .46));
      add(a, b, .38, 1.02, outer ? 'pit-wall' : 'pit-divider', 'concrete');
    }
  }
  wallCache.set(track, walls);
  return walls;
}
