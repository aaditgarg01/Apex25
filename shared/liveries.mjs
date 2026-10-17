// 2025 launch paint schemes plus Cadillac's 2026 debut, on the original car model.
// Reference: https://www.formula1.com/en/latest/article/in-photos-every-2025-f1-car-livery-after-their-spectacular-f1-75-live.2BZTh37ifdxAASqub3X1HK
export const LIVERIES=Object.freeze([
 {id:'ferrari',name:'Ferrari',body:'#c8102e',side:'#c8102e',nose:'#c8102e',wing:'#11151a',accent:'#ffffff',secondary:'#ffd200',ink:'#ffffff',marker:'#e52b39',label:'FERRARI'},
 {id:'mercedes',name:'Mercedes',body:'#b6bdc2',side:'#111820',nose:'#10151b',wing:'#11151a',accent:'#00d2be',secondary:'#b6bdc2',ink:'#ffffff',marker:'#00d2be',label:'MERCEDES'},
 {id:'williams',name:'Williams',body:'#1559c4',side:'#113478',nose:'#1559c4',wing:'#11151a',accent:'#ffffff',secondary:'#39a6ed',ink:'#ffffff',marker:'#459cff',label:'WILLIAMS'},
 {id:'mclaren',name:'McLaren',body:'#ff8700',side:'#14171b',nose:'#ff8700',wing:'#14171b',accent:'#ff8700',secondary:'#ffcf91',ink:'#ffffff',marker:'#ff8700',label:'McLAREN'},
 {id:'red-bull',name:'Red Bull Racing',body:'#15203e',side:'#15203e',nose:'#f6d321',wing:'#15203e',accent:'#ed1c24',secondary:'#f6d321',ink:'#ffffff',marker:'#7189de',label:'RED BULL'},
 {id:'racing-bulls',name:'Racing Bulls',body:'#f2f4f5',side:'#f2f4f5',nose:'#f2f4f5',wing:'#173dcc',accent:'#173dcc',secondary:'#ed1c24',ink:'#173dcc',marker:'#c8d3ff',label:'RACING BULLS'},
 {id:'alpine',name:'Alpine',body:'#1684d8',side:'#f19bce',nose:'#1684d8',wing:'#151b26',accent:'#f19bce',secondary:'#1684d8',ink:'#172954',marker:'#f19bce',label:'ALPINE'},
 {id:'aston-martin',name:'Aston Martin',body:'#006f62',side:'#00594f',nose:'#006f62',wing:'#102c29',accent:'#c5e63b',secondary:'#006f62',ink:'#ffffff',marker:'#28b49b',label:'ASTON MARTIN'},
 {id:'haas',name:'Haas',body:'#f3f4f5',side:'#1c2026',nose:'#f3f4f5',wing:'#1c2026',accent:'#e52c35',secondary:'#f3f4f5',ink:'#ffffff',marker:'#eef3f7',label:'HAAS'},
 {id:'sauber',name:'Kick Sauber',body:'#33ed22',side:'#141917',nose:'#33ed22',wing:'#141917',accent:'#33ed22',secondary:'#141917',ink:'#33ed22',marker:'#33ed22',label:'KICK SAUBER'},
 // https://www.cadillacf1team.com/news/cadillac-formula-1-r-team-reveals-historic-first-livery
 {id:'cadillac',name:'Cadillac',season:2026,body:'#e7e8e3',side:'#161a1e',nose:'#e7e8e3',wing:'#15191d',accent:'#aab3b8',secondary:'#e7e8e3',ink:'#f2f3ed',numberInk:'#15191d',marker:'#bfc5c8',label:'CADILLAC',splitColors:Object.freeze(['#161a1e','#e7e8e3'])}
].map(paint=>Object.freeze({season:2025,...paint})));
export function normalizeLiveryIndex(value,fallback=0){
 if(Number.isInteger(value)&&value>=0&&value<LIVERIES.length)return value;
 return Number.isInteger(fallback)?((fallback%LIVERIES.length)+LIVERIES.length)%LIVERIES.length:0;
}
export const liveryProfile=value=>LIVERIES[normalizeLiveryIndex(value)];
