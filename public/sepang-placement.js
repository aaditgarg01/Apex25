import {sample, wrap} from '/shared/tracks.mjs';
import {pitLayout, pitRoadPose} from '/shared/pit-layout.mjs';
import {sepangBarrierClear, sepangGround, sepangLocal, sepangRoadClear, sepangRunoff, sepangRunoffClear, sepangWalls} from '/shared/sepang.mjs';
import {footprintBox, footprintContains, footprintStrip, footprintsOverlap, footprintBounds, footprintCells} from '/shared/venue-footprints.mjs';
import {SEPANG_BUILDINGS, SEPANG_FAN_ZONES, SEPANG_STANDS, SEPANG_PLANTATIONS, SEPANG_WATER} from './data/sepang-architecture.js';
import {SEPANG_CORNERS} from './data/sepang-runoff.js';

const cache = new WeakMap();
const CELL = 42;

export function planSepang(track) {
  if (cache.has(track)) return cache.get(track);
  const pit = pitLayout(track), {edges} = sepangRunoff(track), {gantry, supports} = sepangWalls(track);
  const sites = [], skipped = [], used = new Map();
  const water = SEPANG_WATER.filter(([, kind]) => kind === 'area')
    .map(([way, , points]) => ({way, polygon: points.slice(0, -1).map(p => sepangLocal(track, p))}));

  function index(poly) {
    footprintCells(footprintBounds(poly), CELL, key => {
      if (!used.has(key)) used.set(key, []);
      used.get(key).push(poly);
    });
  }
  for (const support of supports) index(support);
  for (const lake of water) index(lake.polygon);
  function reserve(spec) {
    const polygon = footprintBox(spec), padded = footprintBox(spec, spec.margin ?? 1.25), nearby = new Set();
    footprintCells(footprintBounds(padded), CELL, key => {
      for (const poly of used.get(key) || []) nearby.add(poly);
    });
    if ([...nearby].some(poly => footprintsOverlap(poly, padded)) || !sepangRoadClear(track, padded) ||
        !sepangRunoffClear(track, padded) || !sepangBarrierClear(track, padded)) return false;
    index(padded);
    sites.push({...spec, polygon, y: spec.y ?? sepangGround(track, spec.x, spec.z)});
    return true;
  }
  function roadside(spec) {
    const i = Math.floor(wrap(spec.s, track.length) / track.step);
    const first = track.width / 2 + edges[spec.side][i].width + spec.w / 2 + 2.2;
    for (let offset = Math.max(first, spec.offset || 0); offset <= (spec.limit || 76); offset += 2.4) {
      const p = sample(track, spec.s, spec.side * offset);
      if (reserve({...p, ...spec, y: undefined})) return true;
    }
    return false;
  }

  const mapped = id => SEPANG_BUILDINGS[id].points.map(p => sepangLocal(track, p));
  function mappedBox(id, spec, heading, shifts = [[0, 0]]) {
    const points = mapped(id), c = Math.cos(heading), s = Math.sin(heading);
    const u = points.map(p => p.x * c - p.z * s), v = points.map(p => p.x * s + p.z * c);
    const center = values => (Math.max(...values) + Math.min(...values)) / 2;
    const extent = values => Math.max(...values) - Math.min(...values);
    for (const factor of [1, .90, .78, .63, .48]) for (const [du, dv] of shifts) {
      const across = center(u) + du, along = center(v) + dv;
      if (reserve({id, ...spec, source: SEPANG_BUILDINGS[id].way, factor, heading,
        w: extent(u) * factor, d: extent(v) * factor, x: across * c + along * s, z: -across * s + along * c})) return true;
    }
    return false;
  }

  const pitSpec = {kind: 'pit', side: pit.side, label: 'PIT AND PADDOCK'};
  if (!mappedBox('pits', pitSpec, pit.frame.heading, [[0, 0], [-3, 0], [-7, 0], [-12, 8], [-18, 8]])) {
    let fitted = false;
    search: for (const d of [320, 270, 220, 170]) for (const station of [pit.box, 205, 245, 165]) {
      for (const offset of [17, 21, 25, 29, 35, 42]) {
        const p = pitRoadPose(track, station, pit.side * offset);
        if (reserve({...p, ...pitSpec, id: 'pits', w: 19, d, heading: pit.frame.heading,
          y: undefined, source: SEPANG_BUILDINGS.pits.way, corridorFit: true})) {fitted = true; break search;}
      }
    }
    if (!fitted) skipped.push('pits');
  }
  for (const [id, spec, heading] of [
    ['medical', {kind: 'medical', side: -1, label: 'MEDICAL'}, .1],
    ['welcome', {kind: 'building', side: 1, label: 'WELCOME CENTRE'}, .32],
    ['hospitality', {kind: 'building', side: -1, label: 'HOSPITALITY'}, pit.frame.heading],
    ['south', {kind: 'building', side: 1, label: 'SOUTH PADDOCK'}, sample(track, 4420).heading]
  ]) {
    if (!mappedBox(id, spec, heading, [[0,0],[5,0],[-5,0],[0,8],[0,-8],[9,12],[-9,-12]])) skipped.push(id);
  }

  const standOutline = mapped('main');
  const towerCenter = sepangLocal(track, [101.74106, 2.76062]);
  let tower = false;
  search: for (const w of [37, 34, 30, 26]) for (const [dx, dz] of [[0, 0], [-5, 0], [-12, -3], [-18, 0], [-26, 6]]) {
    if (reserve({id: 'petal-tower', kind: 'petal-tower', x: towerCenter.x + dx, z: towerCenter.z + dz,
      w, d: w, heading: .1, source: SEPANG_BUILDINGS.main.way, margin: 2})) {tower = true; break search;}
  }
  if (!tower) skipped.push('petal-tower');

  // Fit separate canopy bays inside the irregular mapped peninsula. This
  // leaves the service spurs and their crossing points open between sections.
  const fronts = [
    {id:'front', stations:[-478,-422,-366,-310,-254,-198,-142,-86,-30,26,82,138], side:1},
    {id:'back', stations:[4105,4161,4217,4273,4329,4385,4441,4497,4553,4609,4665,4721], side:1}
  ];
  const roofBays = {};
  for (const front of fronts) {
    roofBays[front.id] = 0;
    for (const [i, station] of front.stations.entries()) {
      let fitted = false;
      search: for (const d of [52, 44, 36]) for (const w of [30, 26, 22, 18, 14]) for (let offset = 22; offset < 92; offset += 2.4) {
        const p = sample(track, station, front.side * offset);
        const spec = {...p, id: 'main-' + front.id + '-' + i, s: station, kind: 'stand', w, d,
          rows: w > 22 ? 17 : 12, roof: 'tensile', side: front.side, y: undefined,
          margin: 1.5, source: SEPANG_BUILDINGS.main.way};
        const corners = footprintBox(spec);
        if (!corners.every(point => footprintContains(standOutline, point))) continue;
        if (reserve(spec)) {fitted = true; break search;}
      }
      if (fitted) roofBays[front.id]++;
    }
  }
  if (!roofBays.front) skipped.push('main-front');
  if (!roofBays.back) skipped.push('main-back');

  const stands = [
    ['k1','K1 GRANDSTAND',355,1,21,82,18],
    ['f','F GRANDSTAND',2305,1,18,85,17],
    ...SEPANG_STANDS
  ];
  for (const [id, label, s, side, w, d, rows] of stands) {
    const spec = {kind: 'stand', label, side, rows, roof: id.includes('bank') ? 'open' : 'tensile'};
    let fitted = false;
    if (SEPANG_BUILDINGS[id] && id !== 'hill-stand') fitted = mappedBox(id, spec, sample(track, s).heading, [[0,0],[6,0],[-6,0],[12,-6],[-12,6]]);
    if (!fitted) fitted = [1, .78, .58].some(scale => [0,-22,22,-46,46].some(shift =>
      roadside({...spec, id, s:s+shift, w:w*scale, d:d*scale, rows:Math.max(10,Math.round(rows*scale)), limit:132})));
    if (!fitted) skipped.push(id);
  }
  for (const [id, s, side] of SEPANG_FAN_ZONES) {
    if (![0,30,-30,65].some(shift => roadside({id, kind:'fan', s:s+shift, side, w:25, d:38, offset:37, limit:135}))) skipped.push(id);
  }
  for (const corner of SEPANG_CORNERS) {
    const put = (kind, label, s) => {
      const spec = {id:kind+'-'+corner.turn+'-'+label, kind,label,s, side:corner.side,w:2.4,d:2.6,limit:69};
      return roadside(spec)||roadside({...spec,side:-spec.side});
    };
    put('board','T'+corner.turn,corner.station-14);
    if ([1,2,4,9,11,14,15].includes(corner.turn)) {
      for (const distance of [1,15].includes(corner.turn) ? [200,150,100,50] : [150,100,50]) put('brake',String(distance),corner.station-distance);
    }
  }
  for (let i=0;i<32;i++) {
    const s=(i+.58)*track.length/32,side=i%2?-1:1,crane=i%5===0;
    const spec={id:'marshal-'+i,kind:'marshal',s,side,w:crane?11:5,d:crane?13:7,limit:76,crane};
    roadside(spec)||roadside({...spec,side:-side});
  }
  for (let i=0;i<25;i++) {
    const s=(i+.5)*track.length/25,side=i%2?1:-1;
    roadside({id:'mast-'+i,kind:i%3?'mast':'timing',s,side,w:5,d:4,limit:92});
  }

  let plantationCount = 0;
  for (const [cluster, [cx, cz, rows, cols, step, heading]] of SEPANG_PLANTATIONS.entries()) {
    for (let r=0;r<rows&&plantationCount<500;r++) for (let c=0;c<cols&&plantationCount<500;c++) {
      const x=(c-(cols-1)/2)*step,z=(r-(rows-1)/2)*step;
      const isPalm = (cluster + r) % 4 !== 0;
      if (reserve({id:'plantation-'+cluster+'-'+r+'-'+c,kind:isPalm?'palm':'tree', variant:(r+c)%4,
        x:cx+x*Math.cos(heading)+z*Math.sin(heading),z:cz-x*Math.sin(heading)+z*Math.cos(heading),
        w:8.5,d:8.5,heading:heading+(r%3)*.18,margin:.7})) plantationCount++;
    }
  }
  for (let i=0;i<170;i++) {
    const s=i*193.7%track.length,side=i%2?-1:1,kind=['palm','scrub','scrub','tree'][i%4],small=kind==='scrub';
    roadside({id:'green-'+i,kind,s,side,w:small?2.2:8.5,d:small?2.2:8.5,variant:i%7,
      offset:(small?17:31)+i%9*4,limit:small?85:124,margin:.7});
  }

  for (const [cluster,[x,z]] of [[-1350,-860],[1320,-680],[-1180,850],[1150,1020]].entries()) {
    for (let i=0;i<11;i++) reserve({id:'town-'+cluster+'-'+i,kind:'skyline',x:x+i%4*33,z:z+Math.floor(i/4)*40,
      w:17+i%3*4,d:19+i%4*3,heading:.2,variant:cluster%3,height:5+i%5*3});
    reserve({id:'pylon-'+cluster,kind:'pylon',x:x-30,z:z-65,w:14,d:8,heading:.2,variant:0});
  }

  const canals = [];
  for (const [way, kind, coordinates] of SEPANG_WATER.filter(([, type]) => type==='river')) {
    const points = coordinates.map(coord => sepangLocal(track, coord));
    for (let i=1;i<points.length;i++) {
      const poly=footprintStrip(points[i-1],points[i],2.1);
      if (poly.length&&sepangRoadClear(track,poly)&&sepangRunoffClear(track,poly)&&
          !sites.some(site=>footprintsOverlap(poly,site.polygon))) canals.push({way,kind,polygon:poly});
    }
  }
  const plan = {sites,skipped,gantry,roofBays,plantationCount,water,canals};
  cache.set(track,plan);
  return plan;
}
