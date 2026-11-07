// FIA 2017 circuit map and notes. Stations follow the retained game ribbon.
// Widths, depths and safety offsets are game targets in metres.
const documentedTyres = new Set([1, 6, 9, 13, 15]);
export const SEPANG_CORNERS = [
  [1, 408, 1, 110, 'serrated', 18, 19, 7, .14, 'covered'],
  [2, 486, -1, 67, 'serrated', 10, 5, 8, .09, 'armco'],
  [3, 756, 1, 150, 'flat', 10, 0, 10, 0, 'armco'],
  [4, 1302, 1, 102, 'serrated', 17, 13, 7, .12, 'covered'],
  [5, 1599, -1, 98, 'red-white', 12, 0, 10, 0, 'armco'],
  [6, 1900, 1, 103, 'red-white', 13, 11, 8, .10, 'covered'],
  [7, 2292, 1, 67, 'red-white', 14, 0, 9, 0, 'armco'],
  [8, 2403, 1, 80, 'red-white', 13, 6, 8, .08, 'armco'],
  [9, 2889, -1, 102, 'serrated', 14, 16, 8, .12, 'covered'],
  [10, 3003, 1, 83, 'flat', 8, 0, 9, 0, 'armco'],
  [11, 3240, 1, 83, 'red-white', 11, 8, 7, .09, 'armco'],
  [12, 3567, -1, 93, 'flat', 14, 10, 8, .10, 'armco'],
  [13, 3760, 1, 108, 'red-white', 13, 12, 8, .11, 'covered'],
  [14, 3951, 1, 110, 'serrated', 16, 14, 7, .12, 'covered'],
  [15, 4881, -1, 115, 'serrated', 18, 22, 8, .15, 'covered']
].map(([turn, station, side, span, kerb, tarmac, gravel, grass, gravelDepth, barrier]) => ({
  turn, station, side, span, kerb, tarmac, gravel, grass, gravelDepth, barrier,
  setback: tarmac + gravel + grass + 1,
  evidence: documentedTyres.has(turn) ? 'FIA confirms tyre protection. Fitted surfaces and dimensions.' : 'FIA map interpretation. Fitted surfaces and dimensions.',
  beyond: 'Laterite verge, service access and drainage'
}));

export const SEPANG_STARTS = {'sepang-t1': 245, 'sepang-back': 4215, 'sepang-t15': 4705};
export const SEPANG_SECTORS = [1168, 3180];
