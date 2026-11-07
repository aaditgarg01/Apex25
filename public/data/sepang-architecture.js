export {SEPANG_BUILDINGS, SEPANG_WATER} from '/shared/sepang-map-data.mjs';

// Mapped main/K1/F footprints are kept separately. The secondary spectator
// banks and fan zones are fitted game positions informed by the circuit map.
export const SEPANG_STANDS = [
  ['north-bank', 'NORTH VIEWING BANK', 1435, 1, 16, 68, 13],
  ['esses-stand', 'ESSES GRANDSTAND', 1830, 1, 21, 75, 16],
  ['hill-stand', 'HILLSIDE TERRACE', 3005, -1, 18, 72, 15],
  ['final-bank', 'HAIRPIN VIEWING BANK', 4870, -1, 21, 64, 14]
];
export const SEPANG_FAN_ZONES = [
  ['north-fan', 354, 1], ['east-fan', 2210, 1], ['south-fan', 4580, -1]
];
export const SEPANG_PLANTATIONS = [
  [-725, -440, 11, 13, 16, 0], [770, -480, 12, 14, 16, .11],
  [-380, 690, 14, 10, 16, -.23], [650, 590, 12, 12, 17, .12]
];
