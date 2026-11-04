import {sample,terrainHeight} from './tracks.mjs';
import {pitLayout,pitRoadPose} from './pit-layout.mjs';
import {interlagosPlanner,localInterlagos,interlagosFootprintClear} from './interlagos-scenery.mjs';
import {zandvoortBoundaries} from './zandvoort.mjs';
import {bankedHeight} from './banked-road.mjs';
const cache=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function zandvoortTerrainHeight(track,x,z,cell=16){
 let closest=track.points[0],best=Infinity,station=0;
 for(let i=0;i<track.points.length;i+=4){const p=track.points[i],sq=(x-p.x)**2+(z-p.z)**2;if(sq<best){best=sq;closest=p;station=i;}}
 const across=(x-closest.x)*Math.cos(closest.heading)-(z-closest.z)*Math.sin(closest.heading),distance=Math.sqrt(best),edge=track.width/2,blend=clamp((distance-edge-12)/65,0,1),wave=5+5*Math.sin(x*.009+Math.cos(z*.006))**2;
 let y=terrainHeight(track,x,z)-.8+wave*blend;
 if(distance<edge+18)y=Math.min(y,bankedHeight(track,station*track.step,across,closest.y)-.8);
 const rows=zandvoortBoundaries(track),pad=Math.SQRT2*cell+track.step;
 for(let i=0;i<track.points.length;i+=2){const p=track.points[i],dx=x-p.x,dz=z-p.z,along=dx*Math.sin(p.heading)+dz*Math.cos(p.heading),o=dx*Math.cos(p.heading)-dz*Math.sin(p.heading);if(Math.abs(along)<pad&&o>-rows[-1][i].offset-pad&&o<rows[1][i].offset+pad)y=Math.min(y,bankedHeight(track,i*track.step,o,p.y)-.8);}
 return y;
}
export function planZandvoort(track,data){
 if(cache.has(track))return cache.get(track);const planner=interlagosPlanner(track),pit=pitLayout(track),box=pitRoadPose(track,pit.box),width=28,depth=Math.min(310,pit.length-2*pit.taper-20),normal={x:Math.cos(pit.frame.heading),z:-Math.sin(pit.frame.heading)};
 for(let extra=0;extra<130;extra+=6){const offset=pit.side*(pit.width/2+width/2+5+extra);if(planner.reserve({id:'pits',kind:'pits',x:box.x+normal.x*offset,z:box.z+normal.z*offset,y:box.y-.15,heading:pit.frame.heading,w:width,d:depth,side:pit.side,margin:4}))break;}
 for(const anchor of data.anchors.filter(a=>a.kind!=='pits')){
  let s=anchor.s,side=anchor.side;const mapped=data.features.find(f=>f.way===anchor.mappedWay);
  if(mapped){const points=mapped.points.map(p=>localInterlagos(track,p)),center=points.reduce((sum,p)=>({x:sum.x+p.x/points.length,z:sum.z+p.z/points.length}),{x:0,z:0});let best=Infinity;track.points.forEach((p,i)=>{const distance=Math.hypot(p.x-center.x,p.z-center.z);if(distance<best){best=distance;s=i*track.step;side=Math.sign((center.x-p.x)*Math.cos(p.heading)-(center.z-p.z)*Math.sin(p.heading))||side;}});}
  planner.roadside({...anchor,s,side,margin:12});
 }
 for(let i=0;i<14;i++)planner.roadside({id:'official-'+i,kind:'official',s:130+i*track.length/14,side:i%2?1:-1,w:i%4===0?22:9,d:16,margin:11,crane:i%4===0});
 for(const distance of [150,100,50])planner.roadside({id:'braking-'+distance,kind:'board',s:470-distance,side:1,w:2,d:1.2,margin:3,label:String(distance)});
 for(let i=0;i<9;i++)planner.roadside({id:'branding-'+i,kind:'banner',s:200+i*track.length/9,side:i%2?-1:1,w:1.2,d:16,margin:8,label:['DUNE RACING','NORTH SEA ENERGY','APEX · NEDERLAND'][i%3]});
 const dunes=[];
 for(let i=0;i<110;i++){const s=i*track.length/110,side=i%2?1:-1,site=planner.roadside({id:'dune-'+i,kind:'dune',s,side,w:20+i%4*8,d:26+i%3*10,offset:60+i%5*7,margin:18,height:3+i%5});if(site){site.y=zandvoortTerrainHeight(track,site.x,site.z);dunes.push(site);}}
 const trees=[];for(let i=0;i<560;i++){const s=(i*.61803398875%1)*track.length,p=sample(track,s,(i%2?1:-1)*(30+i%21*6)),scale=.8+(i%6)*.1,site=planner.reserve({id:'tree-'+i,kind:'tree',...p,w:11*scale,d:11*scale,heading:i*1.7,scale,type:i%4===0?'broadleaf':'pine',margin:8});if(site){site.y=zandvoortTerrainHeight(track,site.x,site.z);trees.push(site);}}
 const tufts=[];for(const dune of dunes)for(let i=0;i<32;i++){const px=(-.4+(i%8)/7*.8)*dune.w,pz=(-.4+Math.floor(i/8)/3*.8)*dune.d,c=Math.cos(dune.heading),s=Math.sin(dune.heading);tufts.push({x:dune.x+c*px+s*pz,z:dune.z-s*px+c*pz,y:dune.y+dune.height*Math.sqrt(Math.max(0,1-(px/(dune.w/2))**2-(pz/(dune.d/2))**2)),heading:i*2.1,scale:.7+i%5*.15});}
 for(let i=0;i<90;i++){const x=-780-(i%9)*45,z=-650+Math.floor(i/9)*130,site=planner.reserve({id:'town-'+i,kind:'house',x,z,w:22+i%3*5,d:20,heading:.25,height:i%14===0?30:7+i%4*3,margin:20});if(site)site.y=zandvoortTerrainHeight(track,x,z);}
 // Turbines are distant artistic silhouettes, not mapped wind-farm locations.
 for(let i=0;i<5;i++)planner.reserve({id:'turbine-'+i,kind:'turbine',x:650+i*170,z:-1050,w:80,d:80,heading:0,height:55,margin:20,y:0});
 planner.reserve({id:'north-sea',kind:'sea',x:-2500,z:0,y:-1.5,w:1900,d:4500,heading:0,margin:20});
 const result={...planner,pit,dunes,trees,tufts};cache.set(track,result);return result;
}
