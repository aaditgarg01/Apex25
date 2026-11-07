import {BUDDH_ROADS} from './buddh-map-data.mjs';
import {BUDDH_DEM} from './buddh-dem.mjs';
import {BUDDH_CORNERS} from './buddh-runoff-data.mjs';
import {createVenueRunoff, venueLocal} from './venue-runoff.mjs';

export {venueLocal as buddhLocal};
export const {
  roads: buddhRoads, roadClear: buddhRoadClear, runoff: buddhRunoff, runoffClear: buddhRunoffClear,
  surfaceAt: buddhSurfaceAt, surfaceY: buddhSurfaceY, ground: buddhGround,
  barriers: buddhWalls, barrierClear: buddhBarrierClear
} = createVenueRunoff({
  prefix: 'buddh', roads: BUDDH_ROADS, dem: BUDDH_DEM, corners: BUDDH_CORNERS,
  paintCorners: [1, 3, 4, 10, 15]
});
