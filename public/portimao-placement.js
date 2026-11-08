import {sample, wrap} from '/shared/tracks.mjs';
import {pitLayout, pitRoadPose} from '/shared/pit-layout.mjs';
import {portimaoGround, portimaoLocal, portimaoRunoff, portimaoRoadClear,
  portimaoRunoffClear, portimaoSafety, portimaoBarrierClear} from '/shared/portimao.mjs';
import {footprintBox, footprintBounds, footprintCells, footprintsOverlap} from '/shared/venue-footprints.mjs';
import {PORTIMAO_BUILDINGS, PORTIMAO_STANDS, PORTIMAO_FAN_ZONES}
  from './data/portimao-architecture.js';
import {PORTIMAO_CORNERS} from './data/portimao-runoff.js';

const cache = new WeakMap();
const CELL = 48;

function mappedBox(track, outline) {
  const points = outline.map(point => portimaoLocal(track, point));
  let best;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if (Math.hypot(b.x - a.x, b.z - a.z) < .05) continue;
    const heading = Math.atan2(b.x - a.x, b.z - a.z), c = Math.cos(heading), s = Math.sin(heading);
    const u = points.map(p => p.x * c - p.z * s), v = points.map(p => p.x * s + p.z * c);
    const w = Math.max(...u) - Math.min(...u), d = Math.max(...v) - Math.min(...v);
    if (!best || w * d < best.w * best.d) {
      const uMid = (Math.min(...u) + Math.max(...u)) / 2, vMid = (Math.min(...v) + Math.max(...v)) / 2;
      best = {w, d, heading, x: uMid * c + vMid * s, z: -uMid * s + vMid * c};
    }
  }
  if (best.w > best.d) return {...best, w: best.d, d: best.w, heading: best.heading + Math.PI / 2};
  return best;
}

export function planPortimao(track) {
  if (cache.has(track)) return cache.get(track);
  const sites = [], skipped = [], grid = new Map(), pit = pitLayout(track);
  const {edges} = portimaoRunoff(track), {supports, gantry, bridges} = portimaoSafety(track);
  function index(polygon) {
    footprintCells(footprintBounds(polygon), CELL, key => {
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(polygon);
    });
  }
  supports.forEach(index);
  function reserve(spec) {
    const polygon = footprintBox(spec), padded = footprintBox(spec, spec.margin ?? 1.08), nearby = new Set();
    footprintCells(footprintBounds(padded), CELL, key => {for (const other of grid.get(key) || []) nearby.add(other);});
    if (!portimaoRoadClear(track, padded) || !portimaoRunoffClear(track, padded) ||
        !portimaoBarrierClear(track, padded) || [...nearby].some(other => footprintsOverlap(padded, other))) return false;
    const heights = [spec, ...polygon].flatMap(point => [portimaoGround(track, point.x, point.z), portimaoGround(track, point.x, point.z, 18)]);
    const groundY = Math.min(...heights) - .30, y = Math.max(...heights) + .03;
    sites.push({...spec, polygon, y, groundY});
    index(padded);
    return true;
  }

  function roadside(spec) {
    const i = Math.floor(wrap(spec.s, track.length) / track.step);
    const start = track.width / 2 + edges[spec.side][i].width + spec.w / 2 + 2.1;
    for (let distance = Math.max(spec.offset ?? 0, start); distance < spec.limit; distance += 2.7) {
      if (reserve({...sample(track, spec.s, distance * spec.side), ...spec})) return true;
    }
    return false;
  }

  const complex = PORTIMAO_BUILDINGS.garages, mapped = mappedBox(track, complex.points);
  let pitPlaced = false;
  fitPit: for (const d of [200, 184, 166, 144, 120, 98]) for (const w of [21, 17, 13]) {
    for (const shift of [0, 12, -12, 25, -25, 45, -45, 70, -70]) for (const offset of [14, 17, 20, 24, 28, 34, 41, 52]) {
      const pose = pitRoadPose(track, pit.box + shift, pit.side * offset);
      if (Math.hypot(pose.x - mapped.x, pose.z - mapped.z) > 125) continue;
      if (reserve({...pose, id: 'pits', kind: 'pit', label: 'GARAGES', side: pit.side, w, d,
        heading: pit.frame.heading, source: complex.way})) {pitPlaced = true; break fitPit;}
    }
  }
  if (!pitPlaced) skipped.push('pits');

  for (const [id, feature] of Object.entries(PORTIMAO_BUILDINGS)) {
    if (feature.kind === 'pit') continue;
    const {x,z,w,d,heading} = mappedBox(track, feature.points);
    const standWidth = feature.kind === 'stand' ? Math.max(w, id==='main-stand' ? 18 : 10) : w;
    const nearest = track.points.reduce((a, b) => Math.hypot(a.x-x,a.z-z) < Math.hypot(b.x-x,b.z-z) ? a : b);
    const reverse = Math.cos(nearest.heading - heading) < 0;
    const bearing = reverse ? heading + Math.PI : heading;
    const side = Math.sign((x-nearest.x)*Math.cos(bearing)-(z-nearest.z)*Math.sin(bearing)) || 1;
    const label = feature.kind === 'stand' ? ('MAIN GRANDSTAND') :
      id === 'control' ? 'RACE CONTROL' : id === 'vip' ? 'PANORAMA TOWER' : 'PADDOCK';
    const fit = [1,.91,.80,.67,.55,.46,.36].some(factor => [[0,0],[4,0],[-4,0],[0,6],[0,-6],[9,0],[-9,0],[0,14],[0,-14]]
      .some(([dx,dz]) => reserve({id, kind: feature.kind, label, source: feature.way, x:x+dx, z:z+dz, w:Math.max(2.7,standWidth*factor),
        d:Math.max(3,d*factor), heading:bearing, side, rows:Math.max(2,Math.min(19,Math.round((standWidth*factor-2)*.74))),
        roof: id === 'main-stand' ? 'shed' : 'open', factor})));
    if (!fit) skipped.push(id);
  }

  for (const [id,label,s,side,w,d,rows] of PORTIMAO_STANDS) {
    const placed = [1,.82,.65,.5].some(factor => [0,-17,17,-35,35,-64,64].some(shift =>
      roadside({id,label,kind:'stand',s:s+shift,side,w:w*factor,d:d*factor,rows,roof:id==='south-bank'?'open':'shed',limit:151})));
    if (!placed) skipped.push(id);
  }
  for (const [id,s,side] of PORTIMAO_FAN_ZONES) {
    if (![0,40,-40,75,-75,120,-120].some(shift => [side,-side].some(dir => roadside({
      id,s:s+shift,side:dir,w:29,d:41,kind:'fan',limit:175
    })))) skipped.push(id);
  }
  for (const corner of PORTIMAO_CORNERS) {
    const put = (kind, label, s) => {
      const spec = {id:kind+'-'+corner.turn+'-'+label,kind,label,s,side:corner.side,w:2.35,d:2.7,limit:95};
      return roadside(spec) || roadside({...spec, side:-spec.side});
    };
    put('board', 'T' + corner.turn, corner.station - 11);
    if ([1,3,5,8,11,13,14].includes(corner.turn)) {
      for (const metres of ([1,5].includes(corner.turn) ? [200,150,100,50] : [150,100,50])) {
        put('brake', String(metres), corner.station - metres);
      }
    }
  }
  for (let i=0;i<28;i++) {
    const side = i % 2 ? -1 : 1, crane = i % 5 === 0, s = (i + .3) * track.length / 28;
    const spec = {id:'marshal-'+i, kind:'marshal', side, s, crane, w:crane?11:5, d:crane?13:7, limit:94};
    roadside(spec) || roadside({...spec,side:-side});
  }
  for (const [i,s] of [100,1450,2950,4320].entries()) {
    roadside({id:'aid-'+i, kind:'medical', label:'MEDICAL', side:i%2?-1:1, s, w:14, d:16, limit:128});
  }
  for (let i=0;i<28;i++) roadside({id:'mast-'+i,kind:i%3?'mast':'timing',s:(i+.4)*track.length/28,
    side:i%2?1:-1,w:4,d:4,limit:94});
  for (let i=0;i<45;i++) roadside({id:'utility-'+i,kind:'utility',s:(i+.23)*track.length/45,
    side:i%2?1:-1,w:3.5,d:5.3,margin:.78,limit:90});

  for (let i=0;i<270;i++) {
    const s=i*193.7%track.length, side=i%2?-1:1, scrub=i%3===0;
    roadside({id:'plant-'+i,kind:scrub?'scrub':'tree',s,side,w:scrub?2.2:8.6,d:scrub?2.2:8.6,variant:i%4,
      offset:((s>2040&&s<2260)||(s>2570&&s<2820)||(s>3820&&s<4070)?65:31)+i%11*6,limit:scrub?103:155,margin:.78});
  }
  for (let i=0;i<115;i++) {
    const pose=sample(track,i*97.7%track.length,(i%2?-1:1)*(130+i%17*8.5));
    reserve({...pose,id:'olive-grove-'+i,kind:'tree',w:8.6,d:8.6,variant:i%4,margin:.8});
  }
  for (const [cluster, station] of [1590,2180,2830,3820].entries()) {
    for (let i=0;i<15;i++) {
      const side=cluster===1?-1:1;
      const p=sample(track,station+(i%8-3.5)*17,(138+Math.floor(i/8)*17+(i%3)*5)*side);
      reserve({...p,id:'woodland-'+cluster+'-'+i,kind:'tree',w:8.6,d:8.6,variant:i%4,margin:.78});
    }
  }
  for (const [cluster, [x,z]] of [[-940,-1020],[525,-1200],[1100,440],[-1250,520],[230,-1650]].entries()) {
    for (let i=0;i<17;i++) reserve({
      id:'hill-grove-'+cluster+'-'+i,kind:'tree',x:x+i%5*13+Math.sin(i*3)*6,z:z+Math.floor(i/5)*18,
      heading:0,w:8.6,d:8.6,variant:(i+cluster)%4,margin:.78
    });
  }
  for (let i=0;i<32;i++) {
    const s=i*201.9%track.length;
    roadside({id:'limestone-'+i,kind:'rock',s,side:i%2?1:-1,w:4.1,d:4.1,offset:55,limit:128});
  }
  for (const [i,s] of [1100,2260,3440,4330].entries()) roadside({id:'cultivated-'+i,kind:'field',s,
    side:i%2?-1:1,w:34,d:60,offset:100,limit:205,variant:i});
  const village = portimaoLocal(track, [-8.612,37.215]);
  for (let i=0;i<12;i++) reserve({id:'village-'+i,kind:'village',x:village.x+i%5*20,z:village.z+Math.floor(i/5)*20,
    w:14,d:14,heading:.17,variant:i%4,height:5+i%4});
  const plan = {sites, skipped, gantry, bridges};
  cache.set(track, plan);
  return plan;
}
