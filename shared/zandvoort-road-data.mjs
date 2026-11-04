// Original fitted stations on the retained ~4.260km centreline. Not a survey.
// Official corner guide: https://www.circuitzandvoort.nl/en/corners/
// The circuit quotes a maximum 18° at T3 and 15–18° at T14. Other reports
// sometimes quote 19°; use the circuit's published values, exposed here.
export const ZANDVOORT_BANKING=Object.freeze({hugenholtzMaxDegrees:18,luyendykMaxDegrees:18,hugenholtzInnerDegrees:4,luyendykInnerDegrees:15,nominalLength:4260.227265812504,profiles:[
 {name:'Hugenholtzbocht',turn:3,start:770,full:845,release:930,end:1020,outerSide:-1,innerDegrees:4,outerDegrees:18},
 {name:'Arie Luyendykbocht',turn:14,start:3735,full:3835,release:3935,end:4050,outerSide:1,innerDegrees:15,outerDegrees:18}
]});
export const ZANDVOORT_SURFACE_PLAN=[
 {turn:1,name:'Tarzanbocht',s:470,span:130,side:1,tarmac:16,gravel:25,grass:3,sand:7,note:'Paved apron plus gravel outside; width reference-fitted.'},
 {turn:2,name:'Gerlachbocht',s:700,span:80,side:1,tarmac:2,gravel:12,grass:2,sand:6},
 {turn:3,name:'Hugenholtzbocht',s:880,span:110,side:-1,tarmac:9,gravel:0,grass:2,sand:5},
 {turn:4,name:'Hunserug',s:1100,span:90,side:1,tarmac:2,gravel:0,grass:6,sand:7},
 {turn:5,name:'Slotemakerbocht',s:1330,span:100,side:-1,tarmac:7,gravel:0,grass:8,sand:6,note:'Official guide describes gravel replaced by grass and a paved last section.'},
 {turn:6,name:'Scheivlak approach',s:1570,span:85,side:1,tarmac:2,gravel:8,grass:3,sand:8},
 {turn:7,name:'Scheivlak',s:1780,span:125,side:1,tarmac:3,gravel:24,grass:3,sand:8},
 {turn:8,name:'Mastersbocht',s:2100,span:105,side:1,tarmac:10,gravel:10,grass:3,sand:6},
 {turn:9,name:'Turn 9',s:2320,span:80,side:1,tarmac:4,gravel:12,grass:3,sand:5},
 {turn:10,name:'Turn 10',s:2550,span:95,side:-1,tarmac:4,gravel:14,grass:3,sand:6},
 {turn:11,name:'Hans Ernst entry',s:3160,span:105,side:1,tarmac:13,gravel:17,grass:3,sand:6},
 {turn:12,name:'Hans Ernst exit',s:3300,span:70,side:-1,tarmac:8,gravel:8,grass:4,sand:5},
 {turn:13,name:'Turn 13',s:3570,span:100,side:1,tarmac:3,gravel:16,grass:3,sand:7},
 {turn:14,name:'Arie Luyendykbocht',s:3870,span:145,side:1,tarmac:2,gravel:0,grass:2,sand:3}
];
export const ZANDVOORT_ELEVATION_INFO={source:'Existing cached SRTM 90m Open Topo Data samples, artistically reshaped between landmarks; not measured asphalt heights.',units:'metres above a local base',nominalLength:4260.227265812504,anchors:[
 [0,3],[320,3],[470,2],[600,3],[760,5],[890,5.5],[1080,11.5],[1310,10],[1510,12],[1690,8],[1850,3],[2070,3.5],[2280,2.5],[2510,4],[2790,4],[3030,3],[3200,2],[3380,3],[3580,5.5],[3730,8],[3910,5],[4100,3],[4260.227265812504,3]
],note:'Landmark-relative shaping follows official dune descriptions; exact crest heights are approximate. Pit straight is held level; original geographic centreline retained.'};
