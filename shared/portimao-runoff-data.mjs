// Metre stations use the retained, clockwise game centreline. Dimensions
// are fitted targets on the dominant side and taper against nearby branches.
export const PORTIMAO_CORNERS = [
  [1, 406,  1, 109, 'serrated',  9, 15, .18, 3, 'covered'],
  [2, 570,  1,  79, 'flat',      5,  0, 0,   6, 'armco'],
  [3, 731,  1,  88, 'serrated',  7, 11, .17, 4, 'covered'],
  [4, 883, -1, 108, 'red-white', 8,  6, .13, 5, 'armco'],
  [5,1460, -1, 114, 'serrated',  8, 15, .20, 4, 'covered'],
  [6,1720, -1,  89, 'flat',      4,  0, 0,   6, 'armco'],
  [7,1930,  1, 101, 'red-white', 6,  8, .16, 4, 'armco'],
  [8,2083,  1, 113, 'serrated',  8, 12, .18, 4, 'covered'],
  [9,2456, -1, 110, 'flat',      7,  0, 0,   7, 'armco'],
  [10,2678, 1,  79, 'red-white', 8, 10, .17, 4, 'covered'],
  [11,2773, 1,  84, 'red-white', 7,  8, .16, 4, 'covered'],
  [12,2994,-1, 103, 'flat',      7,  0, 0,   7, 'armco'],
  [13,3206,-1,  93, 'serrated',  7,  9, .17, 4, 'covered'],
  [14,3473, 1, 159, 'red-white', 8, 11, .18, 5, 'covered'],
  [15,3918, 1, 185, 'flat',     11, 14, .18, 5, 'covered']
].map(([turn,station,side,span,kerb,tarmac,gravel,gravelDepth,grass,barrier]) => ({
  turn, station, side, span, kerb, tarmac, gravel, gravelDepth, grass, barrier,
  setback: tarmac + gravel + grass + 1,
  kerbSpan: turn === 14 || turn === 15 ? 123 : undefined,
  evidence: turn === 1 ? 'Turn 1 gravel documented by F4 race control. Dimensions fitted.' :
    'FIA turn verified. Local surface widths and setback are fitted.'
}));

export const PORTIMAO_SECTORS = [1190,2853];
export const PORTIMAO_DETECTION = [848,3538];
export const PORTIMAO_STARTS = {'portimao-turn1':214, 'portimao-climbs':2165, 'portimao-final':3675};
