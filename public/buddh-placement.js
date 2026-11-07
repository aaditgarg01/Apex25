import {sample, wrap} from '/shared/tracks.mjs';
import {pitLayout, pitRoadPose} from '/shared/pit-layout.mjs';
import {buddhBarrierClear, buddhGround, buddhLocal, buddhRoadClear, buddhRunoff, buddhRunoffClear, buddhWalls} from '/shared/buddh.mjs';
import {footprintBox, footprintsOverlap} from '/shared/venue-footprints.mjs';
import {BUDDH_BUILDINGS, BUDDH_FAN_ZONES, BUDDH_STANDS} from './data/buddh-architecture.js';
import {BUDDH_CORNERS} from './data/buddh-runoff.js';

const cache = new WeakMap();

export function planBuddh(track) {
  if (cache.has(track)) return cache.get(track);
  const rows = buddhRunoff(track).edges, {supports, gantry} = buddhWalls(track), pit = pitLayout(track);
  const sites = [], reserved = [...supports], skipped = [];
  function reserve(spec) {
    const polygon = footprintBox(spec), padded = footprintBox(spec, spec.margin ?? 1.2);
    if (!buddhRoadClear(track, padded) || !buddhRunoffClear(track, padded) || !buddhBarrierClear(track, padded) ||
        reserved.some(other => footprintsOverlap(padded, other))) return false;
    const y = spec.y ?? buddhGround(track, spec.x, spec.z);
    sites.push({...spec, polygon, y});
    reserved.push(padded);
    return true;
  }
  function roadside(spec) {
    const index = Math.floor(wrap(spec.s, track.length) / track.step);
    const first = track.width / 2 + rows[spec.side][index].width + spec.w / 2 + 2.3;
    for (let offset = Math.max(first, spec.offset || 0); offset < (spec.limit || 74); offset += 2.4) {
      const p = sample(track, spec.s, offset * spec.side);
      if (reserve({...p, ...spec, y: buddhGround(track, p.x, p.z)})) return true;
    }
    return false;
  }

  const heading = pit.frame.heading, sine = Math.sin(heading), cosine = Math.cos(heading);
  function mapped(id, kind, side, rowsCount, label) {
    const record = BUDDH_BUILDINGS[id];
    const points = record.points.map(p => buddhLocal(track, p));
    const across = points.map(p => p.x * cosine - p.z * sine), along = points.map(p => p.x * sine + p.z * cosine);
    const u = (Math.max(...across) + Math.min(...across)) / 2, v = (Math.max(...along) + Math.min(...along)) / 2;
    const w = Math.max(...across) - Math.min(...across), d = Math.max(...along) - Math.min(...along);
    for (const factor of [1, .92, .82, .70, .58, .44]) {
      for (const lateral of [0, 3, 6, 10, 15, 22, 30, 45]) {
        const offset = u + side * lateral;
        if (reserve({id, kind, side, label, heading, w: w * factor, d: d * factor, rows: rowsCount,
          x: offset * cosine + v * sine, z: -offset * sine + v * cosine, source: record.way, factor, lateral})) return;
      }
    }
    if (kind === 'pit') {
      for (const length of [365, 300, 235, 175]) for (const station of [pit.box, 285, 255, 225]) {
        for (const offset of [16, 19, 22, 26, 32]) {
          const p = pitRoadPose(track, station, offset * side);
          if (reserve({...p, id, kind, label, heading, w: 18, d: length, side, y: undefined,
            source: record.way, corridorFit: true, station, offset})) return;
        }
      }
    }
    skipped.push(id);
  }
  mapped('pits', 'pit', pit.side, 0, 'PIT AND PADDOCK');
  mapped('main-stand', 'stand', -pit.side, 25, 'MAIN GRANDSTAND');
  mapped('control', 'control', pit.side, 0, 'RACE CONTROL');
  mapped('support', 'building', 1, 0, 'SUPPORT PADDOCK');

  for (const [id, label, s, side, w, d, rowsCount] of BUDDH_STANDS) {
    const placed = [1, .81, .65, .5].some(scale => [0, -24, 24, -48, 48].some(shift =>
      roadside({id, kind: 'stand', label, s: s + shift, side, w: w * scale, d: d * scale,
        rows: Math.round(rowsCount * scale), limit: 115})));
    if (!placed) skipped.push(id);
  }
  for (const [id, s, side] of BUDDH_FAN_ZONES) {
    if (![0, 35, -35, 65].some(shift => roadside({id, kind: 'fan', s: s + shift, side,
      w: 25, d: 38, limit: 104, offset: 35}))) skipped.push(id);
  }
  for (const [i, offset] of [24, 47, 75].entries()) {
    const p = pitRoadPose(track, pit.box + (i - 1) * 83, pit.side * (offset + 19));
    reserve({...p, id: 'paddock-' + i, kind: i === 2 ? 'medical' : 'building',
      label: i === 2 ? 'MEDICAL' : 'HOSPITALITY', w: 19, d: 47, side: pit.side, y: undefined, heading});
  }

  for (const corner of BUDDH_CORNERS) {
    const put = (kind, label, s) => {
      const spec = {id: kind + '-' + corner.turn + '-' + label, kind, label, s, side: corner.side, w: 2.4, d: 2.6, limit: 65};
      return roadside(spec) || roadside({...spec, side: -spec.side});
    };
    put('board', 'T' + corner.turn, corner.station - 15);
    if ([1, 3, 4, 5, 7, 13, 15, 16].includes(corner.turn)) {
      for (const distance of (corner.turn === 4 ? [200, 150, 100, 50] : [150, 100, 50])) {
        put('brake', String(distance), corner.station - distance);
      }
    }
  }
  for (let i = 0; i < 30; i++) {
    const s = (i + .6) * track.length / 30, side = i % 2 ? -1 : 1, crane = i % 5 === 0;
    const spec = {id: 'marshal-' + i, kind: 'marshal', s, side, w: crane ? 11 : 5, d: crane ? 13 : 7,
      limit: 68, crane};
    roadside(spec) || roadside({...spec, side: -side});
  }
  for (let i = 0; i < 24; i++) {
    const s = (i + .5) * track.length / 24, side = i % 2 ? 1 : -1;
    roadside({id: 'furniture-' + i, kind: i % 3 ? 'mast' : 'timing', s, side, w: 5, d: 4, limit: 82});
  }
  for (let i = 0; i < 430; i++) {
    const s = (i * 177.3) % track.length, side = i % 2 ? -1 : 1, tree = i % 3 !== 0;
    roadside({id: 'plant-' + i, kind: tree ? 'tree' : 'scrub', s, side, w: tree ? 9 : 2.1, d: tree ? 9 : 2.1,
      offset: (tree ? 27 : 13) + i % 9 * 4, limit: tree ? 115 : 78, variant: i % 4, margin: .55});
  }
  const periphery = [[-1110,-1010],[-1040,590],[1060,-820],[1090,710],[-980,1240],[810,1260]];
  for (const [i, [x, z]] of periphery.entries()) {
    for (let j = 0; j < 12; j++) {
      const w = 16 + j % 4 * 7, d = 17 + j % 3 * 6;
      reserve({id: 'skyline-' + i + '-' + j, kind: 'skyline', x: x + (j % 4) * 47,
        z: z + Math.floor(j / 4) * 48, w, d, heading: .12 * (i % 2), variant: i % 3, height: 5 + (j * 13 % 43)});
    }
  }
  for (const [i, [x, z]] of [[-930, -390],[-885, 330],[1000, 80],[810, -1070],[-600, 1180],[410, 1280]].entries()) {
    reserve({id: 'field-' + i, kind: 'field', x, z, w: 125, d: 90, heading: .16 * (i % 3), variant: i % 3});
  }
  for (const [i, [x, z]] of [[-920,-650],[-810,-845],[955,-550],[925,405],[-940,880],[-860,1030]].entries()) {
    reserve({id: 'pylon-' + i, kind: 'pylon', x, z, w: 13, d: 7, heading: 0, variant: i % 3});
  }
  const data = {sites, skipped, gantry};
  cache.set(track, data);
  return data;
}
