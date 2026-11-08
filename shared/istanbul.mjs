import {ISTANBUL_CORNERS, ISTANBUL_PHOTO_CROSSINGS} from './istanbul-runoff-data.mjs';
import {ISTANBUL_ROADS, ISTANBUL_BOUNDARIES, ISTANBUL_DEM} from './istanbul-map-data.mjs';
import {createVenueRunoff, venueLocal} from './venue-runoff.mjs';

export {venueLocal as istanbulLocal};
export const {
  roads:istanbulRoads, roadClear:istanbulRoadClear,
  runoff:istanbulRunoff, runoffClear:istanbulRunoffClear,
  surfaceAt:istanbulSurfaceAt, surfaceY:istanbulSurfaceY, ground:istanbulGround,
  barriers:istanbulSafety, barrierClear:istanbulBarrierClear
} = createVenueRunoff({
  prefix:'istanbul',roads:[...ISTANBUL_ROADS,...ISTANBUL_PHOTO_CROSSINGS],boundaries:ISTANBUL_BOUNDARIES,dem:ISTANBUL_DEM,
  corners:ISTANBUL_CORNERS,paintCorners:[],baseTarmac:3.05,baseGrass:5.8,wallGap:1,edgeStart:0,
  dirtProfile:[.53,.35,.70,.48],paintedGrip:{paint:[.96,.26,.035,.04]},runoffSlope:.15,groundBlend:[8,62],wetSlopeGrip:.085,
  tarmacCuts:[.08,.09,.32,.7,1.09,1.12,1.98,3.6,6,10,14,18,22],
  serviceVergeWidth:1.7,runoffReach:63,pedestrianBridges:[1098184327,'turn1-photo','turn8-photo'],archBridges:['turn1-photo','turn8-photo'],bridgeTypes:['footway','service'],accessDeckClearance:5
});

export const ISTANBUL_TERRAIN_MARGIN = 1900;
export const ISTANBUL_TERRAIN_CELL = 18;
