export {PAUL_RICARD_BUILDINGS} from '/shared/paulricard-map-data.mjs';

// FIA spectator zones without a reliable permanent OSM footprint. Metre
// stations, sides and temporary stand dimensions are clearance-fitted.
export const PAUL_RICARD_STANDS = [
  ['verrerie', 'VERRERIE', 527, -1, 18, 65, 16],
  ['baume', 'SAINTE-BAUME', 1518, 1, 19, 77, 17],
  ['mistral', 'MISTRAL', 2520, -1, 21, 95, 17],
  ['chicane', 'CHICANE NORD', 2876, 1, 22, 88, 19],
  ['signes', 'SIGNES', 3883, 1, 17, 63, 15],
  ['beausset', 'LE BEAUSSET', 4244, 1, 25, 105, 19],
  ['bendor', 'BENDOR', 4792, 1, 18, 76, 15]
];
export const PAUL_RICARD_FAN_ZONES = [
  ['paddock-plaza', 5730, -1], ['chicane-camping', 2650, -1], ['provencal-fan-village', 5140, 1]
];

// Village is the mapped Le Castellet settlement direction. Individual
// buildings and vegetation plots are representative rather than surveys.
export const PAUL_RICARD_VILLAGE = [5.7762, 43.2031];
