// Metres from the retained white line. Dimensions are fitted game targets.
// Corner numbering follows the FIA 2025 map. Outside is the local ribbon side.
const corners = [
  [1, 303, -1, 53, 'serrated', 'escape', 4.4, 'covered'],
  [2, 384, 1, 29, 'serrated', 'paint', 1.4, 'concrete'],
  [3, 441, -1, 45, 'red-white', 'tarmac', 3.2, 'covered'],
  [4, 582, -1, 45, 'flat', 'paint', 1.2, 'concrete'],
  [5, 865, 1, 80, 'red-white', 'tarmac', 2.6, 'covered'],
  [6, 1340, 1, 85, 'flat', 'paint', 1.1, 'concrete'],
  [7, 1676, -1, 73, 'red-white', 'escape', 4.4, 'covered'],
  [8, 1892, 1, 65, 'red-white', 'tarmac', 2.5, 'covered'],
  [9, 2093, -1, 64, 'red-white', 'paint', 1.8, 'concrete'],
  [10, 2558, -1, 55, 'painted', 'tarmac', 2.4, 'covered'],
  [11, 2669, 1, 38, 'painted', 'paint', 1.3, 'concrete'],
  [12, 2750, -1, 48, 'flat', 'paint', 1.1, 'concrete'],
  [13, 2951, -1, 67, 'red-white', 'escape', 3.3, 'covered'],
  [14, 3506, 1, 60, 'red-white', 'escape', 4.0, 'covered'],
  [15, 3728, -1, 58, 'flat', 'paint', 1.5, 'concrete'],
  [16, 4231, 1, 40, 'serrated', 'tarmac', 3.1, 'covered'],
  [17, 4300, -1, 48, 'serrated', 'tarmac', 2.0, 'concrete'],
  [18, 4591, -1, 51, 'red-white', 'tarmac', 1.9, 'concrete'],
  [19, 4693, -1, 43, 'red-white', 'tarmac', 2.1, 'concrete']
];

export const SINGAPORE_CORNERS = corners.map(([turn, station, outside, span, kerb, runoff, width, barrier]) => ({
  turn, station, outside, span, kerb, runoff, width, barrier,
  setback: Math.round((width + .4) * 10) / 10,
  gravel: 0,
  beyond: 'pavement, walkway or waterfront',
  evidence: 'FIA route and corner number. Kerb, runoff and wall dimensions fitted.'
}));


// Styling and target extents from the supplied Singapore photo. The other
// complexes use the same event palette with original lettering. Widths are
// fitted below against the saved track, the pit lane and mapped branches.
export const SINGAPORE_APRONS = [
  {turn: 1, station: 272, side: -1, span: 135, width: 14, label: 'SINGAPORE', letteringIndex: 100,
    profile: [[137, .8], [160, 2.8], [225, 3.5], [254, 7], [281, 14], [330, 14], [370, 4.2], [407, .8]],
    design: 'opening-outside'},
  {turn: 1, station: 300, side: 1, span: 34, width: 13, label: 'SINGAPORE', letteringIndex: 99,
    profile: [[266, 1], [278, 3.3], [297, 13], [308, 10.5], [319, 6.0], [334, 1]],
    design: 'opening-inside'},
  {turn: 2, station: 373, side: 1, span: 46, width: 10, label: 'MARINA BAY'},
  {turn: 3, station: 455, side: -1, span: 64, width: 14, label: 'MARINA BAY'},
  {turn: 3, station: 436, side: 1, span: 37, width: 6},
  {turn: 5, station: 865, side: 1, span: 72, width: 7.5},
  {turn: 7, station: 1670, side: -1, span: 77, width: 9, label: 'NIGHT RACE'},
  {turn: 10, station: 2555, side: -1, span: 48, width: 6.2},
  {turn: 13, station: 2951, side: -1, span: 47, width: 7.5},
  {turn: 14, station: 3500, side: 1, span: 62, width: 9, label: 'MARINA BAY'},
  {turn: 16, station: 4231, side: 1, span: 52, width: 9, label: 'NIGHT RACE'},
  {turn: 18, station: 4591, side: -1, span: 54, width: 7.5},
  {turn: 19, station: 4690, side: -1, span: 43, width: 7}
];

export const SINGAPORE_MARKINGS = {
  sector1: 1526,
  sector2: 3366,
  detection: [582, 2849, 4405],
  patches: [865, 1340, 2951, 3506]
};
