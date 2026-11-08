import {pitLayout, pitRoadPose} from './pit-layout.mjs';
import {sample, wrap, clamp, angleDiff} from './tracks.mjs';
import {ribbonOffset} from './surface.mjs';
import {footprintBox, footprintStrip, footprintBounds, footprintCells, footprintContains,
  footprintsOverlap, boxesOverlap} from './venue-footprints.mjs';

const CELL = 42;
const smooth = value => {const t = clamp(value, 0, 1); return t * t * (3 - 2 * t);};

export function venueLocal(track, [lon, lat]) {
  return {x: (lon - track.origin.lon) * 111320 * Math.cos(track.origin.lat * Math.PI / 180),
    z: (track.origin.lat - lat) * 111320};
}

function indexShape(grid, polygon, data) {
  const item = {...data, polygon, ...footprintBounds(polygon)};
  footprintCells(item, CELL, key => {
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(item);
  });
  return item;
}

function nearShapes(grid, shape) {
  const box = footprintBounds(shape), found = new Set();
  footprintCells(box, CELL, key => {
    for (const item of grid.get(key) || []) if (boxesOverlap(box, item)) found.add(item);
  });
  return [...found];
}

function roadVertex(track, index, offset, height) {
  const p = track.points[index], lateral = ribbonOffset(track, index, offset);
  return {x: p.x + Math.cos(p.heading) * lateral, z: p.z - Math.sin(p.heading) * lateral, y: height ? height(track, index * track.step, lateral, p.y) : p.y};
}

// Shared footprint, runoff, terrain and barrier solver for permanent venues.
export function createVenueRunoff({prefix, roads: mappedRoads, dem, corners, paintCorners, boundaries = [], pedestrianBridges = false,
  dirtProfile, roadHeight, baseTarmac = 2.2, baseGrass = 4.8, wallStyle = 'armco',
  wallGap = .7, edgeStart = .025, accessDeckClearance = 0, paintedApron, paintedGrip = {},
  runoffReach = 46, serviceVergeWidth = 0, groundBlend = [18, 83], runoffSlope = .09, wetSlopeGrip = 0, tarmacCuts = [], archBridges = [], bridgeTypes = ['footway']}) {
  const roadCache = new WeakMap(), planCache = new WeakMap(), wallCache = new WeakMap();
  function roads(track) {
    if (roadCache.has(track)) return roadCache.get(track);
    const grid = new Map(), entries = [], half = track.width / 2, pit = pitLayout(track);
    const add = (polygon, metadata) => entries.push(indexShape(grid, polygon, metadata));
    const h = half - .015;
    track.points.forEach((_, index) => {
      const next = (index + 1) % track.points.length;
      add([roadVertex(track, index, -h, roadHeight), roadVertex(track, next, -h, roadHeight),
        roadVertex(track, next, h, roadHeight), roadVertex(track, index, h, roadHeight)], {kind: 'race'});
    });
    for (let d = 0; d < pit.length; d += 3) {
      const end = Math.min(d + 3, pit.length), width = pit.width / 2 + .06;
      add([pitRoadPose(track, d, -width), pitRoadPose(track, end, -width),
        pitRoadPose(track, end, width), pitRoadPose(track, d, width)], {kind: 'pit'});
    }
    for (const [way, type, width, bridge, coordinates] of mappedRoads) {
      const points = coordinates.map(p => venueLocal(track, p));
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
        if (length < .05) continue;
        const steps = Math.ceil(length / 12);
        const at = t => ({x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t});
        for (let j = 0; j < steps; j++) {
          const polygon = footprintStrip(at(j / steps), at((j + 1) / steps), width / 2 + .25);
          add(polygon, {kind: 'access', way, type, bridge});
        }
      }
    }
    const data = {grid, entries};
    roadCache.set(track, data);
    return data;
  }

  function roadClear(track, polygon, filter = () => true) {
    return polygon.length > 0 && !nearShapes(roads(track).grid, polygon).some(row =>
      filter(row) && footprintsOverlap(row.polygon, polygon));
  }

  // Fitted overhead crossings are raised above the complete runoff and
  // safety stack below. Their piers still reserve ordinary ground footprints.
  const groundBranch = row => !row.bridge || !archBridges.includes(row.way);
  const apronRoadClear = (track, polygon) => roadClear(track, polygon, groundBranch);

  function demHeight(track, x, z) {
    const {minX, minZ, spacing, width, height, values} = dem;
    const u = clamp((x - minX) / spacing, 0, width - 1), v = clamp((z - minZ) / spacing, 0, height - 1);
    const i = Math.min(width - 2, Math.floor(u)), j = Math.min(height - 2, Math.floor(v));
    const tx = u - i, tz = v - j, k = j * width + i;
    return (values[k] * (1 - tx) + values[k + 1] * tx) * (1 - tz) +
      (values[k + width] * (1 - tx) + values[k + width + 1] * tx) * tz - track.elevation.min;
  }

  function runoffVertex(track, index, side, distance, lift = 0, depth = 0) {
    const p = roadVertex(track, index, side * (track.width / 2 + distance), roadHeight), center = track.points[index];
    const delta = demHeight(track, p.x, p.z) - demHeight(track, center.x, center.z);
    p.y += clamp(delta, -distance * runoffSlope, distance * runoffSlope) * smooth(distance / 27) + lift - depth;
    return p;
  }

  function quad(track, index, side, start, end, outerA, outerB, lift = 0, depthA = 0, depthB = 0) {
    const next = (index + 1) % track.points.length;
    return [runoffVertex(track, index, side, start, lift, depthA), runoffVertex(track, next, side, end, lift, depthB),
      runoffVertex(track, next, side, outerB, lift, depthB), runoffVertex(track, index, side, outerA, lift, depthA)];
  }

  function runoff(track) {
    if (planCache.has(track)) return planCache.get(track);
    const edges = {}, bands = [], grid = new Map(), n = track.points.length, half = track.width / 2;
    for (const side of [-1, 1]) {
      const rows = track.points.map((_, i) => {
        const s = i * track.step;
        const active = corners.filter(c => Math.abs(c.station - s) < c.span)
          .sort((a, b) => Math.abs(a.station - s) - Math.abs(b.station - s));
        const corner = active.find(c => c.side === side), apex = active[0];
        const strength = corner ? smooth((corner.span - Math.abs(corner.station - s)) / 43) : 0;
        const pave = paintedApron?.(track, s, side, corner, apex, strength);
        const tarmac = pave?.reduce((sum, zone) => sum + zone.width, 0) ??
          baseTarmac + ((corner?.tarmac ?? baseTarmac) - baseTarmac) * strength;
        const gravel = (corner?.gravel || 0) * strength;
        const grass = baseGrass + ((corner?.grass ?? baseGrass) - baseGrass) * strength;
        const total = tarmac + gravel + grass;
        let high = total;
        for (let j = -3; j <= 3; j++) {
          const index = wrap(i + j, n);
          const curvature = angleDiff(track.points[(index + 1) % n].heading, track.points[index].heading) / track.step;
          if (curvature * side > 0) high = Math.min(high, Math.max(.045, .78 / Math.abs(curvature) - half));
        }
        let low = .045;
        const clear = distance => [wrap(i - 1, n), i].every(j =>
          apronRoadClear(track, quad(track, j, side, .025, .025, distance, distance)));
        if (clear(high)) low = high;
        else if (clear(low)) for (let j = 0; j < 7; j++) {
          const probe = (low + high) / 2;
          if (clear(probe)) low = probe;
          else high = probe;
        }
        const kerbDistance = apex?.kerbSpan ?? Math.min(50, (apex?.span ?? 0) * .64);
        const doubleKerb = apex?.kerb === 'double' && apex.side === side && s >= apex.station - 7 && s < apex.station + kerbDistance + 14;
        return {width: low, total, tarmac, gravel, grass, pave, doubleKerb, accent:apex?.accent === side, depth: (corner?.gravelDepth || 0) * strength,
          turn: apex?.turn || 0, kerb: apex && Math.abs(apex.station - s) < kerbDistance ? apex.kerb : null,
          barrier: strength > .52 ? corner.barrier : wallStyle};
      });
      for (let pass = 0; pass < 2; pass++) {
        const widths = rows.map(row => row.width);
        rows.forEach((row, i) => {
          row.width = Math.min(row.width, (widths[wrap(i - 1, n)] + 2 * widths[i] + widths[(i + 1) % n]) / 4);
        });
      }
      for (const row of rows) {
        const fraction = row.width / row.total;
        row.tarmac *= fraction;
        if (row.pave) row.pave = row.pave.map(zone => ({...zone, width: zone.width * fraction}));
        row.gravel *= fraction;
        row.grass *= fraction;
        row.depth *= fraction;
      }
      edges[side] = rows;
      for (let i = 0; i < n; i++) {
        const a = rows[i], b = rows[(i + 1) % n];
        function push(kind, aa, ab, ba, bb, lift, extra = {}, depths = [0, 0]) {
          if (Math.max(ba - aa, bb - ab) < (a.pave || (tarmacCuts.length && kind==='tarmac') ? .0001 : .055)) return;
          const polygon = quad(track, i, side, aa, ab, ba, bb, lift, ...depths);
          if (!apronRoadClear(track, polygon)) return;
          const row = {i, side, turn: a.turn, kind, ...extra};
          bands.push(indexShape(grid, polygon, row));
        }
        if (a.pave) {
          let innerA = edgeStart, innerB = edgeStart;
          for (const [index, zone] of a.pave.entries()) {
            const outerA = innerA + zone.width, outerB = innerB + b.pave[index].width;
            push(zone.kind, innerA, innerB, outerA, outerB, .028,
              {offsets: [innerA, innerB, outerB, outerA]});
            innerA = outerA;
            innerB = outerB;
          }
        } else {
          let startA = edgeStart, startB = edgeStart;
          for (const cut of [...tarmacCuts, Infinity]) {
            const endA = Math.min(a.tarmac, cut), endB = Math.min(b.tarmac, cut);
            push('tarmac', startA, startB, endA, endB, .025);
            startA = endA;
            startB = endB;
          }
          const stripeA = Math.min(a.tarmac, a.turn ? .7 : .32), stripeB = Math.min(b.tarmac, b.turn ? .7 : .32);
          push('paint', .08, .08, stripeA, stripeB, .047, {tone: 'edge'});
          const label = paintCorners.includes(a.turn) && a.turn === b.turn && Math.min(a.tarmac, b.tarmac) > 5;
          if (label) {
            const outerA = a.tarmac * .94, outerB = b.tarmac * .94;
            push('paint', 1.16, 1.16, outerA, outerB, .049, {tone: 'apron', label: true});
            push('paint', outerA, outerB, a.tarmac, b.tarmac, .050, {tone: 'ochre'});
          }
        }
        if (a.kerb && b.kerb) push('kerb', .09, .09, Math.min(a.tarmac, 1.09), Math.min(b.tarmac, 1.09),
          a.kerb === 'serrated' ? .065 + .025 * (i % 2) : .056, {kerb: a.kerb});
        if (a.doubleKerb && b.doubleKerb) push('kerb', 1.09, 1.09, Math.min(a.tarmac, 1.98), Math.min(b.tarmac, 1.98),
          .042, {kerb:'flat'});
        if (a.accent && b.accent) push('paint', 1.12, 1.12, Math.min(a.tarmac, 3.6), Math.min(b.tarmac, 3.6), .044, {tone:'verge'});
        const ga = a.tarmac + a.gravel, gb = b.tarmac + b.gravel;
        const ma = a.tarmac + a.gravel / 2, mb = b.tarmac + b.gravel / 2;
        for (const [startA, startB, endA, endB, da, db] of [
          [a.tarmac, b.tarmac, ma, mb, 0, 0], [ma, mb, ga, gb, a.depth, b.depth]
        ]) {
          if (Math.max(endA - startA, endB - startB) < .055) continue;
          const polygon = quad(track, i, side, startA, startB, endA, endB, .018, da, db);
          const innerHalf = startA === a.tarmac && startB === b.tarmac;
          if (innerHalf) {
            polygon[2].y -= b.depth;
            polygon[3].y -= a.depth;
          } else {
            polygon[2].y += b.depth;
            polygon[3].y += a.depth;
          }
          if (apronRoadClear(track, polygon)) bands.push(indexShape(grid, polygon, {i, side, turn: a.turn, kind: 'gravel'}));
        }
        push('grass', ga, gb, a.width, b.width, -.025);
        if (serviceVergeWidth && Math.min(a.width, b.width) > .7) {
          const innerA = a.width + wallGap + .38, innerB = b.width + wallGap + .38;
          push('verge', innerA, innerB, innerA + serviceVergeWidth, innerB + serviceVergeWidth, -.055);
        }
        if (dirtProfile) {
          const dirtEdge = row => row.width - Math.min(row.grass * .28, .85);
          push('dirt', dirtEdge(a), dirtEdge(b), a.width, b.width, -.012);
        }
      }
    }
    const data = {edges, bands, grid};
    planCache.set(track, data);
    return data;
  }

  function runoffClear(track, polygon) {
    return !nearShapes(runoff(track).grid, polygon).some(row => footprintsOverlap(row.polygon, polygon));
  }

  const surfaces = {
    asphalt: [1, .03, 0, 0], tarmac: [1, .06, .025, .025], paint: [.96, .26, .035, .04],
    gravel: [.42, .14, 1.08, .28], grass: [.62, .36, .46, .39], dirt: [.51, .26, .68, .42]
  };

  function surfaceAt(track, station, offset, wet = 0, position) {
    const half = track.width / 2;
    let kind = 'asphalt';
    if (Math.abs(offset) > half) {
      const p = position ?? sample(track, station, offset);
      const local = nearShapes(runoff(track).grid, [p]).filter(row => footprintContains(row.polygon, p));
      if (local.some(row => row.kind === 'paint' || row.kind === 'kerb')) kind = 'paint';
      else if (paintedApron) kind = local.find(row => Object.hasOwn(paintedGrip, row.kind))?.kind ?? kind;
      if (kind === 'asphalt') {
        if (local.some(row => row.kind === 'gravel')) kind = 'gravel';
        else if (local.some(row => row.kind === 'tarmac')) kind = 'tarmac';
        else if (local.some(row => row.kind === 'dirt')) kind = 'dirt';
        else if (local.some(row => row.kind === 'grass')) kind = 'grass';
        else kind = roadClear(track, footprintBox({...p, w: .06, d: .06}), road => road.kind !== 'race') ? 'dirt' : 'tarmac';
      }
    }
    const [grip, wetGrip, drag, wetDrag] = (kind === 'dirt' && dirtProfile) || paintedGrip[kind] || surfaces[kind];
    const edge = runoff(track).edges[offset < 0 ? -1 : 1][Math.floor(wrap(station, track.length) / track.step)];
    const slopeLoss = wetSlopeGrip && wet && (kind === 'grass' || kind === 'dirt')
      ? wet * wetSlopeGrip * Math.min(1, Math.abs(sample(track, station).grade) / .10) : 0;
    return {kind, paved: kind === 'tarmac' || Object.hasOwn(paintedGrip, kind), grip: grip - wetGrip * wet - slopeLoss, drag: drag + wetDrag * wet,
      boundary: half + Math.max(8, edge.width + 1.2), trackLimit: half + 1};
  }

  function surfaceY(track, station, offset) {
    const f = wrap(station, track.length) / track.step, i = Math.floor(f), t = f - i, j = (i + 1) % track.points.length;
    const distance = Math.max(0, Math.abs(offset) - track.width / 2), side = offset < 0 ? -1 : 1;
    const rows = runoff(track).edges[side];
    const at = index => {
      const row = rows[index], fraction = row.gravel ? (distance - row.tarmac) / row.gravel : 0;
      const depth = row.depth * Math.max(0, 1 - Math.abs(fraction * 2 - 1));
      return runoffVertex(track, index, side, Math.min(distance, row.width + 6), 0, depth).y;
    };
    return at(i) * (1 - t) + at(j) * t;
  }

  function ground(track, x, z, cell = 0) {
    let nearest = track.points[0], distance = Infinity;
    for (let i = 0; i < track.points.length; i += 3) {
      const p = track.points[i], d = (x - p.x) ** 2 + (z - p.z) ** 2;
      if (d < distance) {distance = d; nearest = p;}
    }
    const close = Math.sqrt(distance), near = nearest.y - .34;
    const alpha = smooth((close - track.width / 2 - cell * 1.42 - groundBlend[0]) / groundBlend[1]);
    let height = near * (1 - alpha) + demHeight(track, x, z) * alpha;
    if (close < track.width / 2 + runoffReach + cell * 1.42) {
      const limit = Math.SQRT2 * cell + 8;
      const box = [{x: x - limit, z: z - limit}, {x: x + limit, z: z + limit}];
      for (const row of nearShapes(roads(track).grid, box)) {
        if (row.kind !== 'access') height = Math.min(height, ...row.polygon.map(p => p.y - .27));
      }
      if (cell) for (const band of nearShapes(runoff(track).grid, box)) {
        height = Math.min(height, ...band.polygon.map(p => p.y - .23));
      }
    }
    return height;
  }

  function barriers(track) {
    if (wallCache.has(track)) return wallCache.get(track);
    const {edges} = runoff(track), walls = [], pit = pitLayout(track), supports = [], half = track.width / 2;
    function add(a, b, width, height, kind, style, inward = null) {
      const filter = kind === 'track' || kind === 'fence' ? groundBranch : undefined;
      if (!roadClear(track, footprintStrip(a, b, width / 2 + .13), filter)) return false;
      walls.push({a, b, width, height, kind, style, inward});
      return true;
    }
    for (const side of [-1, 1]) for (const [i, row] of edges[side].entries()) {
      const j = (i + 1) % track.points.length, next = edges[side][j], station = i * track.step;
      const alongPit = wrap(station - pit.entry, track.length);
      if (side === pit.side && alongPit < pit.length) continue;
      if (Math.min(row.width, next.width) < .22) continue;
      const style = alongPit < pit.length && side !== pit.side ? 'concrete' : row.barrier;
      const a = runoffVertex(track, i, side, row.width + wallGap), b = runoffVertex(track, j, side, next.width + wallGap);
      const p = track.points[i], normal = {x: -Math.cos(p.heading) * side, z: Math.sin(p.heading) * side};
      const height = style === 'armco' ? .77 : 1.06;
      if (add(a, b, style === 'covered' ? .68 : .46, height, 'track', style, normal)) {
        add({...a, y: a.y + height}, {...b, y: b.y + height}, .10, 2.55, 'fence', 'mesh', normal);
      }
    }
    for (const side of [-1, 1]) for (let d = 12; d < pit.length - 15; d += 3) {
      const offset = side * (pit.width / 2 + .64);
      add(pitRoadPose(track, d, offset), pitRoadPose(track, d + 3, offset), .40, 1.02,
        side === pit.side ? 'pit-wall' : 'pit-divider', 'concrete');
    }

    let gantry = null;
    for (const station of [0, -25, 28, 67]) {
      const center = sample(track, station);
      const ends = [-1, 1].map(side => {
        for (let extra = 8; extra < 40; extra += 2) {
          const p = sample(track, station, side * (half + extra));
          const footprint = footprintBox({...p, w: 1.6, d: 1.6}, .8);
          if (roadClear(track, footprint) && runoffClear(track, footprint)) return p;
        }
        return null;
      });
      if (ends.some(end => !end)) continue;
      const [a, b] = ends;
      const span = footprintStrip(a, b, 1);
      const maxY = Math.max(center.y, ...nearShapes(roads(track).grid, span)
        .filter(row => row.kind !== 'access' && footprintsOverlap(row.polygon, span))
        .flatMap(row => row.polygon.map(p => p.y)));
      const y = maxY + 7.8;
      for (const p of ends) {
        const base = ground(track, p.x, p.z) - .08;
        const end = along => ({x: p.x + Math.sin(p.heading) * along, y: base, z: p.z + Math.cos(p.heading) * along});
        add(end(-.55), end(.55), 1.1, y - base, prefix + '-pier', 'steel');
        supports.push(footprintBox({...p, w: 1.6, d: 1.6}, .3));
      }
      gantry = {a: {...a, y}, b: {...b, y}, station, width: 1.25, height: 1.24};
      walls.push({...gantry, kind: prefix + '-deck', style: 'steel'});
      break;
    }
    const bridges = [];
    if (pedestrianBridges) for (const [way, type, width, elevated, coords] of mappedRoads) {
      if (!elevated || !bridgeTypes.includes(type) || (Array.isArray(pedestrianBridges) && !pedestrianBridges.includes(way))) continue;
      const points = coords.map(coord => venueLocal(track, coord));
      const first = points[0], last = points.at(-1), heading = Math.atan2(last.x - first.x, last.z - first.z);
      const supportSites = [];
      for (const end of [first, last]) {
        for (const offset of [width / 2 + 1, -width / 2 - 1, width / 2 + 2.4, -width / 2 - 2.4]) {
          const site = {x:end.x + Math.cos(heading) * offset, z:end.z - Math.sin(heading) * offset,
            heading, w:.85, d:.85};
          const footprint = footprintBox(site,.25);
          if (roadClear(track,footprint) && runoffClear(track,footprint)) {
            supportSites.push({site,footprint});
            break;
          }
        }
      }
      if (supportSites.length !== 2) continue;
      const minimumDeckHeights = points.slice(1).flatMap((p,i) => {
        const deck = footprintStrip(points[i],p,width/2+.3);
        const heights = nearShapes(roads(track).grid,deck)
          .filter(row => (row.kind !== 'access' || (accessDeckClearance && !row.bridge)) && footprintsOverlap(row.polygon,deck))
          .flatMap(row => row.polygon.map(vertex => row.kind === 'access'
            ? ground(track, vertex.x, vertex.z) + .12 + accessDeckClearance : vertex.y + 7.8));
        if (archBridges.includes(way)) {
          for (const band of nearShapes(runoff(track).grid,deck)) if (footprintsOverlap(band.polygon,deck)) {
            heights.push(Math.max(...band.polygon.map(v=>v.y))+accessDeckClearance);
          }
          for (const wall of walls) {
            if (wall.kind !== 'track' && wall.kind !== 'fence') continue;
            if (footprintsOverlap(footprintStrip(wall.a,wall.b,wall.width/2),deck)) {
              heights.push(Math.max(wall.a.y,wall.b.y)+wall.height+.65);
            }
          }
        }
        return heights;
      });
      const y = Math.max(Math.max(...points.map(p=>ground(track,p.x,p.z)))+4.8, ...minimumDeckHeights);
      for (const {site,footprint} of supportSites) {
        const foot = ground(track,site.x,site.z)-.12;
        const at = d => ({x:site.x+Math.sin(heading)*d,y:foot,z:site.z+Math.cos(heading)*d});
        add(at(-.29),at(.29),.58,y-foot,prefix+'-pier','steel');
        supports.push(footprint);
      }
      for (let i=1;i<points.length;i++) {
        const a={...points[i-1],y}, b={...points[i],y}, h=Math.atan2(b.x-a.x,b.z-a.z);
        walls.push({a,b,width,height:.38,kind:prefix+'-deck',style:'steel'});
        for (const side of [-1,1]) {
          const at = p => ({x:p.x+Math.cos(h)*side*(width/2-.11),y:y+.38,z:p.z-Math.sin(h)*side*(width/2-.11)});
          walls.push({a:at(a),b:at(b),width:.18,height:1.06,kind:prefix+'-bridge-rail',style:'steel'});
        }
      }
      if (archBridges.includes(way)) {
        const pose = (t, side) => ({
          x:first.x+(last.x-first.x)*t+Math.cos(heading)*side*(width/2-.13),
          z:first.z+(last.z-first.z)*t-Math.sin(heading)*side*(width/2-.13),
          y:y+.42+Math.sin(t*Math.PI)*7.4
        });
        for (const side of [-1,1]) for (let i=0;i<20;i++) {
          const a=pose(i/20,side), b=pose((i+1)/20,side);
          walls.push({a,b,width:.31,height:.34,kind:prefix+'-arch',style:'steel'});
          if (i%4===0 && i>0) {
            const bottom={...a,y:y+.40};
            walls.push({a:bottom,b:{...bottom,x:bottom.x+.16},width:.15,height:a.y-bottom.y,
              kind:prefix+'-arch',style:'steel'});
          }
        }
      }
      bridges.push({way,y});
    }
    for (const [type, coords] of boundaries) {
      const points = coords.map(coord => venueLocal(track, coord));
      for (let i = 1; i < points.length; i++) {
        const from = points[i - 1], to = points[i];
        const length = Math.hypot(to.x - from.x, to.z - from.z);
        const segments = Math.ceil(length / 5);
        const pose = t => {
          const x = from.x + (to.x - from.x) * t, z = from.z + (to.z - from.z) * t;
          return {x, z, y: ground(track, x, z) - .08};
        };
        for (let j = 0; j < segments; j++) {
          const a = pose(j / segments), b = pose((j + 1) / segments), width = type === 'fence' ? .12 : .36;
          const poly = footprintStrip(a, b, width / 2 + .42);
          if (!roadClear(track, poly) || !runoffClear(track, poly)) continue;
          add(a, b, width, type === 'fence' ? 2.1 : .84, type === 'fence' ? 'fence' : 'track',
            type === 'fence' ? 'mesh' : 'concrete');
        }
      }
    }
    const grid = new Map();
    for (const wall of walls) {
      if (wall.kind === prefix + '-deck' || wall.kind === prefix + '-bridge-rail') continue;
      indexShape(grid, footprintStrip(wall.a, wall.b, wall.width / 2), {kind: wall.kind});
    }
    const data = {walls, supports, gantry, bridges, grid};
    wallCache.set(track, data);
    return data;
  }

  function barrierClear(track, polygon) {
    return !nearShapes(barriers(track).grid, polygon).some(row => footprintsOverlap(row.polygon, polygon));
  }

  return {roads, roadClear, runoff, runoffClear, surfaceAt, surfaceY, ground, barriers, barrierClear};
}
