export {MADRID_BUILDINGS} from '/shared/madrid-map-data.mjs';

// Official ticket zones guide these fitted station-relative footprints.
// Width is perpendicular to the road, depth runs along it.
export const MADRID_STANDS = [
  ['main', 'MAIN STRAIGHT', -130, 1, 27, 132, 19],
  ['first', 'FIRST CORNERS', 260, -1, 20, 74, 14],
  ['carcavas', 'LAS CÁRCAVAS', 1560, 1, 18, 58, 13],
  ['chicane', 'VALDEBEBAS', 2075, -1, 20, 70, 15],
  ['approach', 'MONUMENTAL ENTRY', 2220, 1, 28, 62, 15],
  ['bowl-west', 'MONUMENTAL WEST', 2315, 1, 27, 64, 19],
  ['bowl-north', 'MONUMENTAL NORTH', 2432, 1, 30, 67, 22],
  ['bowl-east', 'MONUMENTAL EAST', 2542, 1, 28, 68, 20],
  ['inside', 'MONUMENTAL INFIELD', 2504, -1, 19, 48, 13],
  ['exit', 'MONUMENTAL EXIT', 2684, 1, 25, 65, 17],
  ['straight13', 'NORTH STRAIGHT', 2870, 1, 21, 80, 16],
  ['norte', 'NORTH TERRACE', 4090, -1, 18, 65, 13],
  ['final', 'PARK GRANDSTAND', 4865, -1, 23, 74, 15]
];
export const MADRID_FANS = [
  ['south-fan', -250, -1], ['north-fan', 2230, -1], ['park-fan', 4730, -1]
];

// Geographically west of the venue, with representative roof heights.
export const MADRID_TOWERS = [
  [-6010,-145,234,35], [-6015,-210,249,38], [-6002,-280,236,34], [-5980,-340,230,38]
];
