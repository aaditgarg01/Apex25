import {sample, wrap} from '/shared/tracks.mjs';
import {bankedHeight} from '/shared/banked-road.mjs';
import {madridTunnelAt} from '/shared/madrid.mjs';
import {pitLayout, pitRoadPose} from '/shared/pit-layout.mjs';
import {madridBarrierClear, madridGround, madridLocal, madridRoadClear, madridRunoff,
  madridRunoffClear, madridSafety, madridTunnelSolids} from '/shared/madrid-scenery.mjs';
import {footprintBounds, footprintBox, footprintCells, footprintStrip, footprintsOverlap} from '/shared/venue-footprints.mjs';
import {MADRID_BUILDINGS, MADRID_STANDS, MADRID_FANS, MADRID_TOWERS} from './data/madrid-architecture.js';
import {MADRID_CORNERS} from './data/madrid-runoff.js';

const cache = new WeakMap();
const CELL = 48;

export function planMadrid(track) {
  if (cache.has(track)) return cache.get(track);
  const sites = [], skipped = [], grid = new Map();
  const {edges} = madridRunoff(track), {gantry, supports, bridges} = madridSafety(track), pit = pitLayout(track);
  function index(polygon) {
    footprintCells(footprintBounds(polygon), CELL, key => {
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(polygon);
    });
  }
  for (const polygon of supports) index(polygon);
  for (const wall of madridTunnelSolids(track)) index(footprintStrip(wall.a, wall.b, wall.width / 2 + .3));

  function reserve(spec) {
    const polygon = footprintBox(spec), expanded = footprintBox(spec, spec.margin ?? 1.15), nearby = new Set();
    footprintCells(footprintBounds(expanded), CELL, key => {for (const other of grid.get(key) || []) nearby.add(other);});
    if (!madridRoadClear(track, expanded) || !madridRunoffClear(track, expanded) || !madridBarrierClear(track, expanded) ||
        [...nearby].some(other => footprintsOverlap(expanded, other))) return false;
    const heights = [spec, ...polygon].map(p => madridGround(track, p.x, p.z));
    const groundY = Math.min(...heights) - .22, y = Math.max(spec.y ?? -Infinity, ...heights) + .08;
    sites.push({...spec, y, groundY, polygon});
    index(expanded);
    return true;
  }

  function roadside(spec) {
    if (madridTunnelAt(track, spec.s, Math.min(spec.d / 2, 24))) return false;
    const row = edges[spec.side][Math.floor(wrap(spec.s, track.length) / track.step)];
    const first = track.width / 2 + row.width + spec.w / 2 + 2;
    for (let distance = Math.max(first, spec.offset || 0); distance <= (spec.limit ?? 78); distance += 2.8) {
      const p = sample(track, spec.s, spec.side * distance);
      const road = sample(track, spec.s);
      const shoulder = spec.terrace ? bankedHeight(track, spec.s, spec.side * (track.width / 2 + row.width), road.y) +
        Math.min(3.8, Math.max(1.2, (distance - first + 6) * .19)) : undefined;
      if (reserve({...p, ...spec, y: shoulder})) return true;
    }
    return false;
  }

  function placeHall(id) {
    const source = MADRID_BUILDINGS[id], points = source.points.map(p => madridLocal(track, p));
    let best;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      if (Math.hypot(b.x - a.x, b.z - a.z) < 3) continue;
      const heading = Math.atan2(b.x - a.x, b.z - a.z), c = Math.cos(heading), s = Math.sin(heading);
      const u = points.map(p => p.x * c - p.z * s), v = points.map(p => p.x * s + p.z * c);
      const w = Math.max(...u) - Math.min(...u), d = Math.max(...v) - Math.min(...v);
      if (!best || w * d < best.w * best.d) best = {w,d,heading,
        u:(Math.min(...u)+Math.max(...u))/2, v:(Math.min(...v)+Math.max(...v))/2};
    }
    const cos = Math.cos(best.heading), sin = Math.sin(best.heading);
    const label = id === 'north' ? 'NORTH CONVENTION' : 'EXHIBITION HALL ' + id;
    for (const factor of [1,.93,.84,.75,.65,.56,.49,.42,.34,.28,.22]) for (const [du,dv] of [[0,0],[4,0],[-4,0],[0,6],[0,-6],[9,0],[-9,0],[0,12],[0,-12],[16,0],[-16,0],[0,22],[0,-22],[28,0],[-28,0]]) {
      const u = best.u + du, v = best.v + dv;
      if (reserve({id:'hall-'+id, label, kind:'hall', w:best.w*factor, d:best.d*factor,
        x:u*cos+v*sin,z:-u*sin+v*cos,heading:best.heading,source:source.way,factor,shift:Math.hypot(du,dv)})) return;
    }
    skipped.push('hall-'+id);
  }
  for (const id of ['12','14','north','1','2','6','8','10','4','3','5','7','9']) placeHall(id);

  for (const [i, boxDistance] of [247, 409].entries()) {
    let placed = false;
    search: for (const d of [137,117,98,78,62,48,36,30,24]) for (const w of [22,17,13,9]) for (const shift of [0,-9,9,-20,20,-42,42,-58,58,-75,75]) for (const offset of [8,10,13,16,20,24,29,35,43,54,68,81]) {
      const pose = pitRoadPose(track, boxDistance + shift, pit.side * offset);
      if (reserve({...pose, id:'garage-'+i, label:'GARAGES '+(i+1), kind:'garage', side:pit.side,
        y:undefined, heading:pit.frame.heading, w, d, corridorFit:true})) {placed = true; break search;}
    }
    if (!placed) skipped.push('garage-'+i);
  }

  for (const [id,label,station,side,w,d,rows] of MADRID_STANDS) {
    const terrace = id.startsWith('bowl-') || id === 'approach' || id === 'exit';
    const fit = (direction, shift, factor) => roadside({id:'stand-'+id,
      label, kind:'stand', s:station+shift, side:direction, w:w*factor, d:d*factor, rows, terrace,
      roof: id.startsWith('bowl-') && id !== 'bowl-east' ? 'open' : 'shed', limit: terrace ? 67 : id==='main' ? 180 : 130});
    const shifts = [0,-18,18,-35,35,-64,64,-90,90,-115,115,-146,146];
    if (![1,.83,.67,.53,.42,.34,.28].some(factor => shifts.some(shift => fit(side, shift, factor))) &&
        (terrace || ![.83,.67,.53,.42].some(factor => shifts.some(shift => fit(-side, shift, factor))))) skipped.push('stand-'+id);
  }
  for (const [id,s,side] of MADRID_FANS) {
    if (![0,40,-40,75,-75,125,-125].some(shift=>[-1,1].some(direction=>roadside({id,kind:'fan',s:s+shift,side:side*direction,w:25,d:38,limit:175})))) skipped.push(id);
  }
  for (const [i,s] of [-320,2000,3715,4610].entries()) {
    const side = i % 2 ? 1 : -1;
    roadside({id:'recovery-'+i,kind:i===0?'medical':'marshal',s,side,w:14,d:15,limit:95,crane:i!==0,label:'MEDICAL'});
  }

  for (const corner of MADRID_CORNERS) {
    const put = (kind, label, s) => {
      const spec = {id:kind+'-'+corner.turn+'-'+label,kind,label,s,side:corner.side,w:2.4,d:2.6,limit:61};
      return roadside(spec) || roadside({...spec,side:-spec.side});
    };
    put('board','T'+corner.turn,corner.station-14);
    if ([1,5,7,10,11,13,17,20,22].includes(corner.turn)) {
      for (const metres of [1,5,17,20].includes(corner.turn) ? [200,150,100,50] : [150,100,50]) put('brake',String(metres),corner.station-metres);
    }
  }
  for (let i=0;i<31;i++) {
    const s=(i+.5)*track.length/31,side=i%2?1:-1,crane=i%5===0;
    const spec={id:'marshal-'+i,kind:'marshal',s,side,w:crane?11:5,d:crane?13:7,limit:79,crane};
    roadside(spec)||roadside({...spec,side:-side});
  }
  for (let i=0;i<26;i++) roadside({id:'mast-'+i,kind:i%3?'mast':'timing',s:(i+.4)*track.length/26,side:i%2?1:-1,w:5,d:4,limit:90});
  for (let i=0;i<68;i++) roadside({id:'street-'+i,kind:'street',s:(i+.5)*track.length/68,side:i%2?-1:1,w:3.4,d:5.2,limit:70,margin:.75});
  for (let i=0;i<320;i++) {
    const s=i*193.7%track.length, side=i%2?-1:1, small=i%3===0;
    roadside({id:'plant-'+i,kind:small?'scrub':'tree',s,side,w:small?2.2:8.4,d:small?2.2:8.4,variant:i%4,
      offset:(small?17:28)+i%8*4,limit:small?74:118,margin:.76});
  }
  for (let i=0;i<160;i++) {
    const s=i*103.7%track.length, side=i%2?1:-1, p=sample(track,s,side*(72+i%19*5.3));
    reserve({...p, id:'park-tree-'+i,kind:'tree',w:8.4,d:8.4,variant:i%4,y:undefined,margin:.84});
  }
  for (const [i,[x,z,h,w]] of MADRID_TOWERS.entries()) reserve({id:'tower-'+i,kind:'tower',x,z,w,d:w,heading:.15,height:h,variant:i});
  for (const [cluster,[x,z]] of [[-1340,-700],[840,-1290],[1170,240],[-1380,415]].entries()) {
    for (let i=0;i<9;i++) reserve({id:'city-'+cluster+'-'+i,kind:'skyline',x:x+i%3*43,z:z+Math.floor(i/3)*36,
      w:20+i%3*4,d:18+i%4*4,heading:.16,variant:cluster%3,height:8+i%5*3});
  }
  const plan={sites,skipped,gantry,bridges};
  cache.set(track,plan);
  return plan;
}
