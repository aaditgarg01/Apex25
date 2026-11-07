import {nearest, sample} from './tracks.mjs';
import {SINGAPORE_ROADS} from './singapore-roads.mjs';
import {SINGAPORE_ARCHITECTURE} from './singapore-architecture-data.mjs';
import {SINGAPORE_VIADUCT_WAYS, singaporeApronClear, singaporeBox, singaporeFootprintClear, singaporeGroundClear, singaporeLocal, singaporePolygonsOverlap, singaporeRoadClear, singaporeRoads, singaporeStrip, singaporeVertex} from './singapore.mjs';

const cache = new WeakMap();

export function singaporeStructures(track) {
  if (cache.has(track)) return cache.get(track);
  const solids = [], spans = [], supports = [];
  const maxY = Math.max(...track.points.map(p => p.y));
  const waterY = Math.min(...track.points.map(p => p.y)) - 1.25;
  const half = track.width / 2;

  function rail(a, b, width, height, style, kind = 'singapore-rail') {
    if (!singaporeRoadClear(track, singaporeStrip(a, b, width / 2 + .12))) return false;
    solids.push({a, b, width, height, style, kind});
    return true;
  }

  // Anderson's parallel arched steel trusses flank the existing racing deck.
  // Align the endpoints to the OSM bridge reach, then fit the legs beside the
  // saved game ribbon. The asphalt and its elevation data provide the deck.
  for (const record of SINGAPORE_ARCHITECTURE.bridges.filter(r => r.relation)) {
    const coordinates = record.coordinates.map(coord => singaporeLocal(track, coord));
    const stations = coordinates.map(p => {
      const approximate = track.points.reduce((best, point, index) => {
        const station = index * track.step;
        if (record.kind === 'esplanade-bridge' && (station < 2980 || station > 3500)) return best;
        const distance = (point.x - p.x) ** 2 + (point.z - p.z) ** 2;
        return distance < best.distance ? {distance, index} : best;
      }, {distance: Infinity, index: 0});
      return nearest(track, p.x, p.z, approximate.index * track.step).s;
    });
    const start = Math.round((record.kind === 'esplanade-bridge' ? Math.max(3000, Math.min(...stations)) : Math.min(...stations)) / track.step);
    const end = Math.round((record.kind === 'esplanade-bridge' ? Math.min(3420, Math.max(...stations)) : Math.max(...stations)) / track.step);
    if (end - start < 5 || end - start > 120) continue;
    const anderson = record.kind === 'anderson';
    let count = 0;
    for (const side of [-1, 1]) {
      for (let i = start; i < end; i++) {
        const a = singaporeVertex(track, i, side * (half + (anderson ? 3.4 : 2.7)));
        const b = singaporeVertex(track, i + 1, side * (half + (anderson ? 3.4 : 2.7)));
        if (rail(a, b, .28, .86, anderson ? 'steel' : 'stone')) count++;
        else if (!anderson) {
          const fartherA = singaporeVertex(track, i, side * (half + 5.5));
          const fartherB = singaporeVertex(track, i + 1, side * (half + 5.5));
          if (rail(fartherA, fartherB, .28, .86, 'stone')) count++;
        }
        if (!anderson) continue;
        const rise = j => Math.sin(Math.PI * (j - start) / (end - start)) * 5.7 + 1;
        const topA = {...a, y: a.y + rise(i)}, topB = {...b, y: b.y + rise(i + 1)};
        rail(topA, topB, .36, .38, 'steel');
        if (i % 2 === 0) {
          const post = {...a, x: a.x + (b.x - a.x) * .08, z: a.z + (b.z - a.z) * .08};
          rail(a, post, .18, rise(i), 'steel');
          rail({...a, y: topA.y}, b, .17, .19, 'steel');
        }
      }
    }
    for (let i = start; i < end; i++) {
      const a = track.points[i], b = track.points[i + 1];
      solids.push({a: {...a, y: a.y - 1.55}, b: {...b, y: b.y - 1.55}, width: track.width + 1.6,
        height: .86, kind: 'singapore-deck', style: 'stone'});
    }
    if (count) spans.push({kind: record.kind, source: record.relation, start: start * track.step, end: end * track.step});
  }

  // For the mapped footbridges, keep the walking ribbon open between its rails.
  // A crossing over game asphalt uses a vertical clearance, never a road-level
  // collider. Columns below the waterline are reserved just like street props.
  for (const record of SINGAPORE_ARCHITECTURE.bridges.filter(r => r.way)) {
    const points = record.coordinates.map(coord => singaporeLocal(track, coord));
    const width = record.kind === 'cavenagh' ? 4.5 : 5.5;
    const deck = points.map(p => ({...p, y: waterY + (record.kind === 'helix' ? 6.6 : 4.1)}));
    const crossesRace = deck.slice(1).some((b, i) =>
      !singaporeRoadClear(track, singaporeStrip(deck[i], b, width / 2 + .75), road => road.kind !== 'access'));
    if (crossesRace) for (const p of deck) p.y = maxY + 7.2;
    for (let i = 1; i < deck.length; i++) {
      const a = deck[i - 1], b = deck[i], heading = Math.atan2(b.x - a.x, b.z - a.z);
      solids.push({a, b, width, height: .34, kind: 'singapore-deck', style: 'stone'});
      for (const side of [-1, 1]) {
        const offset = p => ({
          x: p.x + Math.cos(heading) * (width / 2 - .09) * side,
          z: p.z - Math.sin(heading) * (width / 2 - .09) * side, y: p.y + .34
        });
        const lowerA = offset(a), lowerB = offset(b);
        solids.push({a: lowerA, b: lowerB, width: .18, height: 1.02, kind: 'singapore-rail', style: 'steel'});
        if (record.kind === 'helix') {
          solids.push({a: {...lowerA, y: lowerA.y + .9}, b: {...lowerB, y: lowerB.y + .9},
            width: .22, height: .22, kind: 'singapore-rail', style: 'helix'});
        }
      }
      const end = {...b, w: 1.4, d: 1.6, heading};
      if (i < deck.length - 1 && singaporeFootprintClear(track, singaporeBox(end), 1)) {
        const bottom = {...b, y: waterY - 2, x: b.x - Math.sin(heading) * .74, z: b.z - Math.cos(heading) * .74};
        const other = {...bottom, x: b.x + Math.sin(heading) * .74, z: b.z + Math.cos(heading) * .74};
        solids.push({a: bottom, b: other, width: 1.3, height: b.y - bottom.y, kind: 'singapore-pier', style: 'stone'});
        supports.push({...end, id: record.kind + '-pier-' + i});
      }
    }
    spans.push({kind: record.kind, source: record.way, deck, width, crossesRace});
  }

  for (const promenade of SINGAPORE_ARCHITECTURE.promenade) {
    const points = promenade.coordinates.map(p => singaporeLocal(track, p));
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], heading = Math.atan2(b.x - a.x, b.z - a.z);
      const offset = p => ({x: p.x + Math.cos(heading) * 2.9, z: p.z - Math.sin(heading) * 2.9, y: waterY + .75});
      rail(offset(a), offset(b), .14, .89, 'steel');
    }
  }

  // Render the two mapped elevated carriageways around the first sector.
  // The survey provides their plan geometry, so deck height is fitted over
  // the highest game road below each crossing.
  const viaductWays = SINGAPORE_ROADS.filter(([way]) => SINGAPORE_VIADUCT_WAYS.has(way));
  const viaductPaths = viaductWays.map(([way, , , , coordinates]) => ({
    way, points: coordinates.map(p => singaporeLocal(track, p))
  }));
  const overpassRoads = track.points.filter(p => viaductPaths.some(({points}) => points.slice(1).some((b, i) => {
    const a = points[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t) < half + 11;
  })));
  const deckY = Math.max(...overpassRoads.map(p => p.y)) + 9.2;
  for (const {way, points} of viaductPaths) {
    for (let i = 1; i < points.length; i++) {
      const a = {...points[i - 1], y: deckY}, b = {...points[i], y: deckY};
      const length = Math.hypot(b.x - a.x, b.z - a.z), heading = Math.atan2(b.x - a.x, b.z - a.z);
      solids.push({a, b, width: 13.6, height: 1.1, kind: 'singapore-deck', style: 'viaduct'});
      for (const side of [-1, 1]) {
        const edge = p => ({x: p.x + Math.cos(heading) * side * 6.57, z: p.z - Math.sin(heading) * side * 6.57, y: p.y + 1.1});
        solids.push({a: edge(a), b: edge(b), width: .36, height: .85, kind: 'singapore-rail', style: 'viaduct'});
      }
      if (length < 17) continue;
      for (const fraction of length > 80 ? [.29, .67] : [.5]) {
        for (const lateral of [0, 3.7, -3.7]) {
          const x = a.x + (b.x - a.x) * fraction + Math.cos(heading) * lateral;
          const z = a.z + (b.z - a.z) * fraction - Math.sin(heading) * lateral;
          const site = {id: 'viaduct-' + way + '-' + i + '-' + fraction, x, z, heading, w: 2.5, d: 2.5};
          const footprint = singaporeBox(site, .12);
          if (!singaporeGroundClear(track, footprint) || !singaporeApronClear(track, footprint)) continue;
          const base = track.points.reduce((best, p) =>
            Math.hypot(p.x - x, p.z - z) < Math.hypot(best.x - x, best.z - z) ? p : best);
          const bottom = Math.min(base.y - 1.4, deckY - 2);
          const end = offset => ({x: x + Math.sin(heading) * offset, y: bottom, z: z + Math.cos(heading) * offset});
          solids.push({a: end(-1.05), b: end(1.05), width: 2.1, height: deckY - bottom,
            kind: 'singapore-pier', style: 'viaduct'});
          supports.push({...site, underViaduct: true});
          break;
        }
      }
    }
  }
  if (viaductPaths.length) spans.push({kind: 'sheares-viaduct', source: viaductPaths.map(p => p.way), deckY});

  const grid = sample(track, 0), gantryY = grid.y + 8.2;
  const ends = [];
  for (const side of [-1, 1]) {
    for (const extra of [2.8, 4.5, 7, 10, 14, 18, 24, 31]) {
      const end = sample(track, 0, side * (half + extra));
      const site = {...end, id: 'gantry-' + side, w: .78, d: .78};
      if (singaporeFootprintClear(track, singaporeBox(site), 1.05)) {
        ends.push(site);
        break;
      }
    }
  }
  if (ends.length === 2) {
    const [a, b] = ends;
    for (const end of ends) {
      const forward = p => ({x: end.x + Math.sin(grid.heading) * p, y: end.y, z: end.z + Math.cos(grid.heading) * p});
      solids.push({a: forward(-.34), b: forward(.34), width: .68, height: gantryY - end.y,
        kind: 'singapore-pier', style: 'steel'});
      supports.push(end);
    }
    const span = {kind: 'gantry', a: {...a, y: gantryY}, b: {...b, y: gantryY}, width: 1.3, height: 1.05};
    solids.push({...span, kind: 'singapore-deck', style: 'steel'});
    spans.push(span);
  }

  const viaductDecks = solids.filter(solid => solid.kind === 'singapore-deck' && solid.style === 'viaduct');
  for (const station of [243, 237, 231, 224, 213, 180]) {
    const openingEnds = [-1, 1].map(side => {
      for (const extra of [3, 4.5, 6, 8, 10, 13, 17, 22, 28]) {
        const end = sample(track, station, side * (half + extra));
        const site = {...end, id: 'turn1-gantry-' + side, w: 1.35, d: 1.65, margin: 1};
        const supportFootprint = singaporeBox(site, .2);
        if (singaporeFootprintClear(track, supportFootprint, site.margin) && singaporeApronClear(track, supportFootprint)) return site;
      }
      return null;
    });
    if (openingEnds.some(end => !end)) continue;
    const [a, b] = openingEnds;
    const footprint = singaporeStrip(a, b, 1.5);
    if (viaductDecks.some(deck => singaporePolygonsOverlap(footprint, singaporeStrip(deck.a, deck.b, deck.width / 2)))) continue;
    const roadHeights = singaporeRoads(track).entries
      .filter(road => road.kind !== 'access' && singaporePolygonsOverlap(footprint, road.polygon))
      .flatMap(road => road.polygon.map(point => point.y));
    const y = Math.max(a.y, b.y, ...roadHeights) + 8.2;
    for (const end of openingEnds) {
      const forward = offset => ({x: end.x + Math.sin(end.heading) * offset, y: end.y,
        z: end.z + Math.cos(end.heading) * offset});
      solids.push({a: forward(-.74), b: forward(.74), width: 1.2, height: y - end.y,
        kind: 'singapore-pier', style: 'steel'});
      supports.push(end);
    }
    const span = {kind: 'turn1-gantry', station, a: {...a, y}, b: {...b, y}, width: 1.25, height: 1.32};
    solids.push({...span, kind: 'singapore-deck', style: 'steel'});
    spans.push(span);
    break;
  }

  const result = {solids, spans, supports};
  cache.set(track, result);
  return result;
}
