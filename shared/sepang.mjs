import {SEPANG_ROADS, SEPANG_BOUNDARIES} from './sepang-map-data.mjs';
import {SEPANG_DEM} from './sepang-dem.mjs';
import {SEPANG_CORNERS} from './sepang-runoff-data.mjs';
import {createVenueRunoff, venueLocal} from './venue-runoff.mjs';

export {venueLocal as sepangLocal};
export const {
  roads: sepangRoads, roadClear: sepangRoadClear, runoff: sepangRunoff, runoffClear: sepangRunoffClear,
  surfaceAt: sepangSurfaceAt, surfaceY: sepangSurfaceY, ground: sepangGround,
  barriers: sepangWalls, barrierClear: sepangBarrierClear
} = createVenueRunoff({
  prefix: 'sepang', roads: SEPANG_ROADS, dem: SEPANG_DEM, corners: SEPANG_CORNERS,
  paintCorners: [1, 4, 9, 14, 15], boundaries: SEPANG_BOUNDARIES, pedestrianBridges: true,
  dirtProfile: [.56, .41, .52, .65]
});
