import {sample,terrainHeight} from './tracks.mjs';
// Artistic circuit-side representations, not surveyed building footprints.
// Radius bounds the entire model so placement can be checked against every road branch.
const rows=[
 ['au-1953','Albert Park lake','lake','park',.24,110,'#518eaa'],
 ['bh-2002','Sakhir tower','tower','desert',.03,28,'#ddcaaa'],
 ['cn-2004','Shanghai lotus grandstand','petals','park',.02,80,'#d45852'],
 ['es-1991','Catalunya grandstand','stand','hills',.08,64,'#b84337'],
 ['mc-1929','Monte Carlo Casino','palace','coast',.25,48,'#ebd4b0'],
 ['ca-1978','Montréal Biosphere','biosphere','island',.33,42,'#dce3d5'],
 ['fr-1969','Paul Ricard control tower','control','mediterranean',.05,24,'#79a9d1'],
 ['at-1969','Spielberg steel bull','bull','alpine',.32,42,'#aab7bd'],
 ['gb-1948','Silverstone Wing','wing','fields',.02,86,'#bccdd0'],
 ['de-1932','Motodrom stadium','stadium','forest',.80,75,'#6494c2'],
 ['hu-1986','Hungaroring grandstand','stand','hills',.05,64,'#c94640'],
 ['be-1925','Raidillon grandstand','stand','forest',.155,64,'#c59d38'],
 ['it-1922','Monza historic banking','banking','forest',.62,92,'#aaa894'],
 ['sg-2008','Marina Bay Sands','sands','skyline',.75,110,'#73afc1'],
 ['ru-2014','Olympic park stadium','dome','coast',.24,88,'#d5e4ed'],
 ['jp-1962','Suzuka Ferris wheel','wheel','park',.92,28,'#e9ded2'],
 ['us-2012','COTA observation tower','cota','hills',.69,25,'#d34939'],
 ['mx-1962','Foro Sol stadium','stadium','city',.82,75,'#b84b47'],
 ['br-1940','Interlagos grandstands','stand','city',.94,64,'#5c9e77'],
 ['ae-2009','Yas Marina hotel','hotel','marina',.85,66,'#b578e5'],
 ['it-1953','Imola timing tower','control','forest',.025,24,'#d8bc94'],
 ['de-1927','Nürburg castle','castle','alpine',.60,46,'#8b9187'],
 ['pt-2008','Algarve grandstand','stand','mediterranean',.02,64,'#dd873c'],
 ['it-1914','Mugello Tuscan pavilion','palace','tuscany',.02,48,'#d8b37f'],
 ['my-1999','Sepang hibiscus canopy','petals','tropical',.05,80,'#dbddd1'],
 ['tr-2005','Istanbul Park grandstand','wing','hills',.025,86,'#b9c9d5'],
 ['nl-1948','Zandvoort dune pavilion','pavilion','dunes',.37,38,'#dec894'],
 ['fr-1960','Magny-Cours grandstand','stand','fields',.02,64,'#72a5cd'],
 ['pt-1972','Estoril paddock pavilion','pavilion','mediterranean',.025,38,'#e8d8bc'],
 ['br-1977','Jacarepaguá lagoon','lake','tropical',.36,110,'#3a8998'],
 ['sa-2021','Jeddah waterfront pavilion','pavilion','coast',.42,38,'#dfd9cc'],
 ['us-2022','Hard Rock Stadium','stadium','tropical',.5,75,'#5ecbc7'],
 ['qa-2004','Lusail canopy grandstand','petals','desert',.02,80,'#dfccaf'],
 ['es-2026','IFEMA exhibition halls','halls','city',.30,90,'#c8534b'],
 ['az-2016','Baku old city walls','castle','coast',.48,46,'#c3b393'],
 ['us-2023','Las Vegas Sphere','sphere','neon',.29,65,'#eb7495'],
 ['us-1909','Indianapolis Pagoda','pagoda','fields',.015,30,'#d4dce1'],
 ['ar-1952','Gálvez grandstands','stand','park',.05,64,'#77acd0'],
 ['za-1961','Kyalami pit complex','wing','savanna',.03,86,'#d9caaa'],
 ['us-1956','Watkins Glen pavilion','pavilion','forest',.06,38,'#c34f48'],
 ['in-2011','Buddh main grandstand','wing','savanna',.025,86,'#d9b172']
];
export const VENUES=Object.fromEntries(rows.map(([id,name,kind,theme,at,radius,color])=>[id,{id,name,kind,theme,at,radius,color}]));
export function roadClearance(track,x,z){let best=Infinity;for(let i=0;i<track.points.length;i++){const a=track.points[i],b=track.points[(i+1)%track.points.length],dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(l||1)));best=Math.min(best,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));}return best-track.width/2;}
export function safeSite(track,at,radius,side=1,extra=0,margin=12){
 // Move outwards rather than covering a neighboring hairpin or crossover.
 for(let distance=radius+margin+12+extra;distance<2200;distance+=30){
  const p=sample(track,at*track.length,side*(track.width/2+distance));
  if(roadClearance(track,p.x,p.z)>=radius+margin)return {...p,y:terrainHeight(track,p.x,p.z),radius};
 }
 throw new Error(`No clear scenery location for ${track.id}`);
}
export function venuePlan(track){const v=VENUES[track.id];return {...v,...safeSite(track,v.at,v.radius,track.id==='be-1925'?-1:1,0,45)};}

// Rectangular buildings can stand closer to a straight than a bounding circle
// permits. Check the entire envelope against every road branch before placing it.
export function safeBoxSite(track,s,halfWidth,halfLength,side=1,margin=8){
 for(let distance=track.width/2+halfWidth+margin;distance<1200;distance+=10){
  const p=sample(track,s,side*distance),rx=Math.cos(p.heading),rz=-Math.sin(p.heading),fx=Math.sin(p.heading),fz=Math.cos(p.heading),pad=track.width/2+margin;let clear=true;
  for(const q of track.points){const x=(q.x-p.x)*rx+(q.z-p.z)*rz,z=(q.x-p.x)*fx+(q.z-p.z)*fz;if(Math.abs(x)<halfWidth+pad&&Math.abs(z)<halfLength+pad){clear=false;break;}}
  if(clear)return {...p,y:terrainHeight(track,p.x,p.z)};
 }
 return safeSite(track,s/track.length,Math.hypot(halfWidth,halfLength),side);
}
