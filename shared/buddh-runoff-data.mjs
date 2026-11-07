// FIA corner order, stations on the retained game route. Widths and depths
// are fitted targets in metres. The map is schematic and does not survey them.
export const BUDDH_CORNERS = [
  [1, 306, 1, 92, 'serrated', 12, 14, 6, .12, 'covered'],
  [2, 449, -1, 73, 'flat', 5, 0, 7, 0, 'armco'],
  [3, 693, 1, 96, 'serrated', 10, 12, 6, .10, 'covered'],
  [4, 1980, 1, 115, 'serrated', 14, 18, 7, .14, 'covered'],
  [5, 2550, -1, 79, 'red-white', 10, 12, 6, .10, 'covered'],
  [6, 2667, -1, 49, 'serrated', 7, 0, 8, 0, 'armco'],
  [7, 2709, 1, 62, 'serrated', 9, 7, 6, .09, 'covered'],
  [8, 2889, 1, 53, 'red-white', 6, 0, 7, 0, 'armco'],
  [9, 2955, -1, 67, 'red-white', 8, 0, 7, 0, 'armco'],
  [10, 3315, 1, 126, 'flat', 15, 0, 9, 0, 'armco'],
  [11, 3538, 1, 103, 'red-white', 12, 0, 8, 0, 'armco'],
  [12, 3657, -1, 73, 'flat', 9, 0, 8, 0, 'armco'],
  [13, 3887, -1, 76, 'red-white', 10, 7, 7, .08, 'covered'],
  [14, 4010, 1, 66, 'serrated', 9, 7, 6, .09, 'covered'],
  [15, 4322, 1, 87, 'red-white', 13, 9, 6, .10, 'covered'],
  [16, 4700, -1, 75, 'serrated', 10, 10, 6, .10, 'covered']
].map(([turn, station, side, span, kerb, tarmac, gravel, grass, gravelDepth, barrier]) => ({
  turn, station, side, span, kerb, tarmac, gravel, grass, gravelDepth, barrier,
  setback: tarmac + gravel + grass + 1,
  evidence: [1, 3, 4, 5].includes(turn) ? 'FIA map and 2023 upgrade references, fitted dimensions' : 'FIA map interpretation, fitted dimensions',
  beyond: 'Service access, drainage and dry verge'
}));

export const BUDDH_STARTS = {'buddh-turn1': 185, 'buddh-back': 920, 'buddh-final': 3715};
export const BUDDH_SECTORS = [2375, 3750];
