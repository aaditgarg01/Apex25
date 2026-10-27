import {prepareCampus} from './campus.mjs';
import {racingSpeedAt} from './racing-line.mjs';
import {applyElevation} from './elevation.mjs';
export const CALENDAR = [
['au-1953','Australia','Melbourne','AU',14],['cn-2004','China','Shanghai','CN',16],['jp-1962','Japan','Suzuka','JP',18],['bh-2002','Bahrain','Sakhir','BH',15],['sa-2021','Saudi Arabia','Jeddah','SA',27],['us-2022','Miami','Miami','US',19],['it-1953','Emilia-Romagna','Imola','IT',19],['mc-1929','Monaco','Monte Carlo','MC',19],['es-1991','Spain','Barcelona','ES',14],['ca-1978','Canada','Montréal','CA',14],['at-1969','Austria','Spielberg','AT',10],['gb-1948','Great Britain','Silverstone','GB',18],['be-1925','Belgium','Spa-Francorchamps','BE',19],['hu-1986','Hungary','Budapest','HU',14],['nl-1948','Netherlands','Zandvoort','NL',14],['it-1922','Italy','Monza','IT',11],['az-2016','Azerbaijan','Baku','AZ',20],['sg-2008','Singapore','Marina Bay','SG',19],['us-2012','United States','Austin','US',20],['mx-1962','Mexico','Mexico City','MX',17],['br-1940','Brazil','São Paulo','BR',15],['us-2023','Las Vegas','Las Vegas','US',17],['qa-2004','Qatar','Lusail','QA',16],['ae-2009','Abu Dhabi','Yas Marina','AE',16]
];
export const EXTRAS = [
['fr-1969','France','Paul Ricard','FR',15],['de-1932','Germany','Hockenheim','DE',17],['ru-2014','Russia','Sochi','RU',18],['de-1927','Germany','Nürburgring GP','DE',15],['pt-2008','Portugal','Portimão','PT',15],['it-1914','Italy','Mugello','IT',15],['my-1999','Malaysia','Sepang','MY',15],['tr-2005','Türkiye','Istanbul Park','TR',14],['fr-1960','France','Magny-Cours','FR',17],['pt-1972','Portugal','Estoril','PT',13],['br-1977','Brazil','Jacarepaguá (historic)','BR',11],['es-2026','Spain','Madrid','ES',22],['us-1909','United States','Indianapolis · F1 2000–2007','US',13],['ar-1952','Argentina','Buenos Aires · F1 1995–1998','AR',16],['za-1961','South Africa','Kyalami','ZA',16],['us-1956','United States','Watkins Glen','US',11],['in-2011','India','Buddh · Indian GP','IN',16],['in-vit-vellore','India','VIT Vellore · Campus Circuit','IN',27]
];
export const wrap=(n,m)=>((n%m)+m)%m;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function makeTracks(data,elevations={}){
 return [...CALENDAR,...EXTRAS].map(([id,country,city,code,turns],round)=>{
 const f=data.features.find(f=>f.properties.id===id), coords=f.geometry.coordinates,scale=f.properties.campus?.raceScale||1;
 const lon=coords.reduce((a,c)=>a+c[0],0)/coords.length,lat=coords.reduce((a,c)=>a+c[1],0)/coords.length;
 let pts=coords.map(([x,y])=>({x:(x-lon)*111320*Math.cos(lat*Math.PI/180)*scale,z:-(y-lat)*111320*scale}));
 if(Math.hypot(pts[0].x-pts.at(-1).x,pts[0].z-pts.at(-1).z)<1)pts.pop();
 const ds=[0];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];ds.push(ds.at(-1)+Math.hypot(b.x-a.x,b.z-a.z));}
 const length=ds.at(-1);if(!Number.isFinite(length)||length<100||length>30000)throw new Error(`Invalid circuit geometry: ${id}`);const n=Math.ceil(length/3),step=length/n;let j=0;
 let points=Array.from({length:n},(_,i)=>{const d=i*step;while(ds[j+1]<d)j++;const a=pts[j],b=pts[(j+1)%pts.length],t=(d-ds[j])/(ds[j+1]-ds[j]);return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};});
 // Light smoothing removes survey-point kinks while retaining the source footprint.
 for(let k=0;k<2;k++)points=points.map((p,i)=>({x:(points[wrap(i-1,n)].x+p.x*6+points[(i+1)%n].x)/8,z:(points[wrap(i-1,n)].z+p.z*6+points[(i+1)%n].z)/8}));
 points.forEach((p,i)=>{const a=points[wrap(i-2,n)],b=points[(i+2)%n];p.heading=Math.atan2(b.x-a.x,b.z-a.z);p.y=0;});
 const elevation=applyElevation(id,points,length,elevations);
 points.forEach(p=>p.groundY=p.y);
 const campus=f.properties.campus?JSON.parse(JSON.stringify(f.properties.campus)):null;if(campus)prepareCampus({campus,origin:{lon,lat},points,length,step,elevation});
 // Suzuka's two branches must remain physically and visually separate at the crossover.
 if(id==='jp-1962'){
  let pair=null;outer:for(let i=0;i<n;i+=2)for(let j=i+80;j<n-80;j+=2){if(Math.hypot(points[i].x-points[j].x,points[i].z-points[j].z)<9){pair=[i,j];break outer;}}
  if(pair){const center=pair[1];points.forEach((p,i)=>{const d=Math.min(wrap(i-center,n),wrap(center-i,n))*step;p.y+=d<135?9*(.5+.5*Math.cos(Math.PI*d/135)):0;});}
 }
 points.forEach((p,i)=>{const a=points[wrap(i-2,n)],b=points[(i+2)%n];p.grade=(b.y-a.y)/(step*4);p.pitch=Math.atan(p.grade);});
 // Monaco's source starts at Casino; rotate the completed 3D loop to the mapped start line.
 if(id==='mc-1929'){
  const x=(7.4212652-lon)*111320*Math.cos(lat*Math.PI/180),z=-(43.7350269-lat)*111320;let index=0,best=Infinity;
  points.forEach((p,i)=>{const d=(p.x-x)**2+(p.z-z)**2;if(d<best){best=d;index=i;}});points=[...points.slice(index),...points.slice(0,index)];
 }
 // Silverstone source starts between turn 8 and 9 (historic national pit straight); rotate to Hamilton Straight in front of The Wing.
 if(id==='gb-1948'){
  const x=(-1.0219-lon)*111320*Math.cos(lat*Math.PI/180),z=-(52.0695-lat)*111320;let index=0,best=Infinity;
  points.forEach((p,i)=>{const d=(p.x-x)**2+(p.z-z)**2;if(d<best){best=d;index=i;}});points=[...points.slice(index),...points.slice(0,index)];
 }
 // Shanghai source placed start line too close to Turn 1; push back along pit straight in front of main grandstand.
 if(id==='cn-2004'){
  const x=(121.2201-lon)*111320*Math.cos(lat*Math.PI/180),z=-(31.3372-lat)*111320;let index=0,best=Infinity;
  points.forEach((p,i)=>{const d=(p.x-x)**2+(p.z-z)**2;if(d<best){best=d;index=i;}});points=[...points.slice(index),...points.slice(0,index)];
 }
 const arid=['bh-2002','sa-2021','qa-2004','ae-2009','us-2023'].includes(id);
 const urban=['mc-1929','sg-2008','az-2016','us-2023','sa-2021','in-vit-vellore'].includes(id);
 return {id,country,city,code,turns,round:round<24?round+1:null,category:campus?'Campus circuit':round<24?'2025 season':'More circuits',origin:{lon,lat},name:f.properties.Name,officialLength:f.properties.length*scale,elevation,length,step,points,width:f.properties.width||(id==='mc-1929'?13:17),arid,urban,campus};
 });
}
export function sample(track,s,offset=0){const f=wrap(s,track.length)/track.step,i=Math.floor(f),t=f-i,a=track.points[i],b=track.points[(i+1)%track.points.length];const heading=a.heading+angleDiff(b.heading,a.heading)*t;return {x:a.x+(b.x-a.x)*t+Math.cos(heading)*offset,z:a.z+(b.z-a.z)*t-Math.sin(heading)*offset,y:a.y+(b.y-a.y)*t,pitch:a.pitch+(b.pitch-a.pitch)*t,grade:a.grade+(b.grade-a.grade)*t,heading};}
export function nearest(track,x,z,previous=0){
 const center=Math.floor(wrap(previous,track.length)/track.step),n=track.points.length;let best={distance:Infinity};
 for(let d=-24;d<=24;d++){const i=wrap(center+d,n),a=track.points[i],b=track.points[(i+1)%n],dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),px=a.x+dx*t,pz=a.z+dz*t,dist=Math.hypot(x-px,z-pz);if(dist<best.distance){const h=a.heading+angleDiff(b.heading,a.heading)*t;best={s:wrap((i+t)*track.step,track.length),distance:dist,offset:(x-px)*Math.cos(h)-(z-pz)*Math.sin(h),heading:h};}}
 return best;
}
export function targetSpeed(track,s,conditions='normal',wetness){return racingSpeedAt(track,s,conditions,wetness);}

export function terrainHeight(track,x,z){
 let nearest=Infinity,closest=track.points[0],second=Infinity,other=closest;
 for(let i=0;i<track.points.length;i+=6){const p=track.points[i],d=(x-p.x)**2+(z-p.z)**2;if(d<nearest){second=nearest;other=closest;nearest=d;closest=p;}else if(d<second){second=d;other=p;}}
 const w=1/(nearest+1),v=1/(second+1);return(closest.groundY*w+other.groundY*v)/(w+v);
}
