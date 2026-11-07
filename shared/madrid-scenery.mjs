import {bankedHeight} from './banked-road.mjs';
import {madridLayout, madridTunnelLayout} from './madrid.mjs';
import {MADRID_ROADS, MADRID_DEM, MADRID_BOUNDARIES} from './madrid-map-data.mjs';
import {MADRID_CORNERS} from './madrid-runoff-data.mjs';
import {createVenueRunoff, venueLocal} from './venue-runoff.mjs';

export {venueLocal as madridLocal};
export const {
  roads: madridRoads, roadClear: madridRoadClear, runoff: madridRunoff, runoffClear: madridRunoffClear,
  surfaceAt: madridSurfaceAt, surfaceY: madridSurfaceY, ground: madridGround,
  barriers: madridSafety, barrierClear: madridBarrierClear
} = createVenueRunoff({
  // The mapped pit way is already represented by the generated right-side lane.
  prefix: 'madrid', roads: MADRID_ROADS.filter(([way]) => way !== 1552567031), dem: MADRID_DEM, corners: MADRID_CORNERS,
  paintCorners: [1, 2, 5, 11, 13, 17, 20], boundaries: MADRID_BOUNDARIES,
  pedestrianBridges: [23554699, 79852008, 79852009, 79852013, 438834164, 603120337, 603125605, 971428409],
  roadHeight: bankedHeight, baseTarmac: 2.25, baseGrass: 1.2, wallStyle: 'concrete', wallGap: 1, edgeStart: 0, accessDeckClearance: 5
});

const tunnelCache = new WeakMap();
export function madridTunnelSolids(track) {
  if (tunnelCache.has(track)) return tunnelCache.get(track);
  const solids = [];
  for (const tunnel of madridLayout(track).tunnels) {
    const layout = madridTunnelLayout(track, tunnel);
    const {center, heading, left, right, back, front, roof} = layout;
    const point = (x, z, y) => ({x: center.x + Math.cos(heading) * x + Math.sin(heading) * z,
      z: center.z - Math.sin(heading) * x + Math.cos(heading) * z, y});
    for (const wall of layout.walls) solids.push({...wall, kind: 'tunnel', style: 'concrete'});
    const midX = (left + right) / 2;
    solids.push({a: point(midX, back, roof), b: point(midX, front, roof), width: right - left + .8,
      height: .9, kind: 'madrid-tunnel-roof', style: 'concrete'});
    for (const z of [back, front]) solids.push({a: point(left - .4, z, roof + .9), b: point(right + .4, z, roof + .9),
      width: .35, height: .9, kind: 'madrid-tunnel-parapet', style: 'concrete'});
  }
  tunnelCache.set(track, solids);
  return solids;
}
