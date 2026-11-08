// Stations follow the retained game ribbon. Dimensions are fitted outside
// the corner, in metres from the asphalt edge, before branch clearance.
export const ISTANBUL_CORNERS = [
  [1,255,-1,127,'double',13,14,.18,4,'covered'],
  [2,441,1,103,'flat',5,0,0,6,'armco'],
  [3,984,-1,117,'red-white',8,9,.15,5,'armco'],
  [4,1137,1,94,'serrated',8,10,.16,4,'covered'],
  [5,1296,-1,86,'double',9,8,.15,4,'covered'],
  [6,1395,-1,91,'red-white',7,8,.15,5,'armco'],
  [7,1890,1,126,'serrated',10,13,.18,4,'covered'],
  [8,2506,-1,347,'serrated',23,18,.19,5,'covered',284],
  [9,3276,-1,106,'serrated',11,12,.17,4,'covered'],
  [10,3363,1,85,'red-white',8,0,0,6,'armco'],
  [11,3879,1,146,'flat',10,8,.15,6,'armco'],
  [12,4665,-1,122,'serrated',14,15,.19,4,'covered'],
  [13,4749,1,79,'serrated',8,0,0,5,'covered'],
  [14,4866,-1,102,'double',10,10,.16,4,'covered']
].map(([turn,station,side,span,kerb,tarmac,gravel,gravelDepth,grass,barrier,kerbSpan])=>({
  turn,station,side,span,kerb,tarmac,gravel,gravelDepth,grass,barrier,kerbSpan,
  setback:tarmac+gravel+grass+1,
  accent:turn===8?-1:turn===1?1:0,
  evidence:[1,5,14].includes(turn)?'FIA documents double exit kerb. Dimensions fitted.':
    turn===8?'Four apices documented and wide apron visible. Dimensions fitted.':'FIA turn verified. Surface and setback dimensions fitted.'
}));
export const ISTANBUL_SECTORS = [1782,3797];
export const ISTANBUL_DETECTION = [3194,4782];
export const ISTANBUL_STARTS = {'istanbul-turn1':110,'istanbul-turn8':2140,'istanbul-final':4455};

// Crossings visible in the photo references. Endpoint positions are fitted
// from the retained ribbon and checked separately from the mapped service bridge.
export const ISTANBUL_PHOTO_CROSSINGS = [
  ['turn1-photo','footway',3.0,true,[[29.40948953,40.95366776],[29.40843353,40.95345091]]],
  ['turn8-photo','footway',3.4,true,[[29.41731636,40.96283675],[29.41647377,40.96228166]]]
];
