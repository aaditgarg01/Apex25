export {ISTANBUL_BUILDINGS, ISTANBUL_COAST} from '/shared/istanbul-map-data.mjs';

// General admission and event services are fitted anchors. Permanent stand
// footprints are in the cached OSM extract.
export const ISTANBUL_STANDS = [
  ['infield-bank','',1650,-1,24,72,9],
  ['north-bank','',2600,1,22,66,8],
  ['south-bank','',4070,-1,20,58,8]
];
export const ISTANBUL_FAN_ZONES = [
  ['main-plaza',5230,-1], ['turn1-fan-zone',380,-1],
  ['north-camping',2720,-1], ['back-straight-fan-zone',4310,1],
  ['paddock-hospitality',5010,1]
];
