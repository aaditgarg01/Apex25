import {PAUL_RICARD_CORNERS} from './paulricard-runoff-data.mjs';
import {PAUL_RICARD_ROADS, PAUL_RICARD_BOUNDARIES, PAUL_RICARD_DEM} from './paulricard-map-data.mjs';
import {createVenueRunoff, venueLocal} from './venue-runoff.mjs';

function paintedApron(track, station, side, corner, apex, strength) {
  const distanceFromStart = Math.min(station, track.length - station);
  const apronBlend = Math.min(1, Math.max(0, (distanceFromStart - 250) / 105));
  const base = 1.1 + 3.7 * apronBlend;
  const whiteStrength = side === -1 && apex?.insideWhite
    ? Math.min(1, Math.max(0, (apex.span - Math.abs(station - apex.station)) / 65)) : 0;
  return [
    {kind: 'edge', width: .33},
    {kind: 'blue', width: (base + ((corner?.blue ?? base) - base) * strength) * (1 - whiteStrength)},
    {kind: 'white', width: (apex?.insideWhite || 0) * whiteStrength},
    {kind: 'red', width: (corner?.red || 0) * strength},
    {kind: 'tarmac', width: .8 + .87 * apronBlend}
  ];
}

export {venueLocal as paulRicardLocal};

export const {
  roads: paulRicardRoads, roadClear: paulRicardRoadClear,
  runoff: paulRicardRunoff, runoffClear: paulRicardRunoffClear,
  surfaceAt: paulRicardSurfaceAt, surfaceY: paulRicardSurfaceY,
  ground: paulRicardGround, barriers: paulRicardSafety, barrierClear: paulRicardBarrierClear
} = createVenueRunoff({
  prefix: 'ricard', roads: PAUL_RICARD_ROADS, dem: PAUL_RICARD_DEM, corners: PAUL_RICARD_CORNERS,
  paintCorners: [], paintedApron,
  paintedGrip: {blue: [.94, .28, .36, .11], red: [.88, .30, .62, .17], white: [.91, .30, .27, .10],
    edge: [.96, .26, .035, .04]},
  baseGrass: 3.7, wallGap: 1, edgeStart: 0, runoffReach: 76, serviceVergeWidth: 1.8, boundaries: PAUL_RICARD_BOUNDARIES,
  pedestrianBridges: [158532380, 242947741, 686698872, 1107731474], accessDeckClearance: 5
});
