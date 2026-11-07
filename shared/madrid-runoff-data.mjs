// FIA V3 numbering on the retained game route. Dimensions are fitted in metres
// beyond the racing edge. The documented escapes identify paved zones, not widths.
export const MADRID_CORNERS = [
  [1, 198, -1, 66, 'serrated', 9, 1, 'covered'],
  [2, 249, 1, 65, 'serrated', 8, 1, 'concrete'],
  [3, 385, 1, 113, 'flat', 4, 2, 'concrete'],
  [4, 1056, 1, 245, 'flat', 3, 1, 'concrete'],
  [5, 1293, -1, 58, 'serrated', 11, 1, 'covered'],
  [6, 1464, -1, 86, 'serrated', 6, 1, 'concrete'],
  [7, 1674, 1, 63, 'serrated', 3, 1, 'covered'],
  [8, 1746, -1, 54, 'red-white', 4, 1, 'concrete'],
  [9, 1848, 1, 75, 'flat', 5, 3, 'concrete'],
  [10, 2013, 1, 78, 'serrated', 8, 2, 'covered'],
  [11, 2130, 1, 75, 'serrated', 10, 2, 'covered'],
  [12, 2450, 1, 297, 'flat', 4, 1, 'concrete'],
  [13, 3069, -1, 96, 'serrated', 11, 3, 'covered'],
  [14, 3255, 1, 116, 'red-white', 6, 3, 'concrete'],
  [15, 3490, -1, 124, 'red-white', 7, 3, 'concrete'],
  [16, 3701, -1, 76, 'flat', 5, 2, 'concrete'],
  [17, 3765, 1, 70, 'serrated', 10, 2, 'covered'],
  [18, 3996, -1, 94, 'red-white', 6, 1, 'concrete'],
  [19, 4190, 1, 105, 'flat', 4, 2, 'concrete'],
  [20, 4557, -1, 58, 'serrated', 8, 1, 'covered'],
  [21, 4713, 1, 69, 'serrated', 3, 1, 'concrete'],
  [22, 5013, 1, 88, 'red-white', 4, 1, 'concrete']
].map(([turn, station, side, span, kerb, tarmac, grass, barrier]) => ({
  turn, station, side, span, kerb, tarmac, grass, gravel: 0, gravelDepth: 0, barrier,
  setback: tarmac + grass + 1, kerbSpan: turn === 12 ? 260 : undefined,
  evidence: [1, 2, 5, 6, 11].includes(turn) ? 'FIA paved escape, dimensions fitted' : 'FIA and promoter layout, dimensions fitted'
}));

export const MADRID_SECTORS = [1839, 3888];
