import {PORTIMAO_CORNERS} from './portimao-runoff-data.mjs';
import {PORTIMAO_ROADS, PORTIMAO_BOUNDARIES, PORTIMAO_DEM} from './portimao-map-data.mjs';
import {createVenueRunoff, venueLocal} from './venue-runoff.mjs';

export {venueLocal as portimaoLocal};
export const {
  roads: portimaoRoads, roadClear: portimaoRoadClear,
  runoff: portimaoRunoff, runoffClear: portimaoRunoffClear,
  surfaceAt: portimaoSurfaceAt, surfaceY: portimaoSurfaceY, ground: portimaoGround,
  barriers: portimaoSafety, barrierClear: portimaoBarrierClear
} = createVenueRunoff({
  prefix:'portimao', roads:PORTIMAO_ROADS, boundaries:PORTIMAO_BOUNDARIES, dem:PORTIMAO_DEM,
  corners:PORTIMAO_CORNERS, paintCorners:[], baseTarmac:2.85, baseGrass:4.6, wallGap:1, edgeStart:0,
  dirtProfile:[.54,.34,.68,.48], runoffSlope:.15, groundBlend:[6,52], wetSlopeGrip:.085,
  serviceVergeWidth:1.75, runoffReach:58,
  pedestrianBridges:[157736380,157736393,157736397,157741751], accessDeckClearance:5
});

export const PORTIMAO_TERRAIN_MARGIN = 2050;
export const PORTIMAO_TERRAIN_CELL = 18;
