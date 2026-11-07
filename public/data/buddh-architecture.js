export {BUDDH_BUILDINGS, BUDDH_DRAINAGE} from '/shared/buddh-map-data.mjs';

// Positions of the secondary stands and fan zones are fitted to the event guide.
export const BUDDH_STANDS = [
  ['north-stand', 'NORTH GRANDSTAND', 345, 1, 18, 87, 20],
  ['esses-stand', 'NORTH TERRACE', 556, 1, 13, 61, 15],
  ['east-stand', 'EAST GRANDSTAND', 1980, 1, 18, 78, 18],
  ['middle-stand', 'INFIELD GRANDSTAND', 2650, -1, 15, 72, 16],
  ['south-bank', 'SOUTH VIEWING BANK', 3450, 1, 21, 86, 18],
  ['final-stand', 'SOUTH GRANDSTAND', 4680, -1, 18, 83, 17]
];
export const BUDDH_FAN_ZONES = [
  ['north-fan', 245, 1], ['east-fan', 2035, 1], ['south-fan', 4580, -1]
];

// Approximate landscape landmarks and a checked pair of mapped motorway ways.
export const BUDDH_LANDMARKS = [
  ['kiln', -1060, -590, 30, 27], ['kiln', 1130, 530, 30, 27],
  ['tank', -890, 1060, 16, 16], ['tank', 1020, -985, 16, 16],
  ['telecom', -800, -970, 13, 13], ['telecom', 1370, 745, 13, 13]
];
export const BUDDH_TRAFFIC_WAYS = [87188879, 169624173];
