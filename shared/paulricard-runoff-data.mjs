// Dominant-side widths are measured outward from the edge of the racing ribbon.
// They are game fits from the supplied aerials and the FIA corner map. The
// operator verifies abrasive pavement and the red/blue scheme, not these widths.
export const PAUL_RICARD_CORNERS = [
  [1,  487, -1,  87, 'serrated',  13, 18, 40, 'covered'],
  [2,  597,  1, 105, 'red-white', 13, 10, 31, 'armco'],
  [3, 1166,  1,  65, 'serrated',  13, 14, 35, 'covered'],
  [4, 1243, -1,  61, 'red-white', 10,  7, 25, 'armco'],
  [5, 1374,  1,  71, 'serrated',  14, 16, 39, 'covered'],
  [6, 1512,  1, 119, 'red-white', 17, 16, 43, 'covered'],
  [7, 1757, -1, 105, 'flat',      10,  6, 24, 'armco'],
  [8, 2820, -1, 105, 'serrated',  16, 18, 45, 'covered'],
  [9, 2901,  1,  88, 'serrated',  17, 15, 41, 'covered'],
  [10,3795,  1, 179, 'flat',      22, 24, 57, 'covered'],
  [11,4244,  1, 181, 'red-white', 24, 27, 64, 'covered'],
  [12,4699, -1, 113, 'red-white', 16, 16, 42, 'armco'],
  [13,4901,  1, 128, 'flat',      17, 14, 41, 'armco'],
  [14,5206, -1, 105, 'serrated',  14, 13, 35, 'covered'],
  [15,5350,  1,  70, 'red-white', 11, 10, 29, 'concrete']
].map(([turn,station,side,span,kerb,blue,red,setback,barrier]) => ({
  turn, station, side, span, kerb, blue, red, insideWhite: turn === 11 ? 14 : 0,
  tarmac: blue + red + 2, gravel: 0, gravelDepth: 0,
  grass: setback - blue - red - 3, setback, barrier,
  kerbSpan: turn === 11 ? 155 : turn === 10 ? 115 : undefined,
  evidence: turn === 11 ? 'White inside and blue/red outside visible in supplied aerials. Widths fitted.' :
    'FIA turn and venue safety-surface reference. Local widths and stripe extents fitted.'
}));

export const PAUL_RICARD_SECTORS = [1790, 3410];
export const PAUL_RICARD_DETECTION = [1655, 5200];
export const PAUL_RICARD_STARTS = {
  'ricard-turn1': 260, 'ricard-mistral': 1890, 'ricard-final': 4820
};
