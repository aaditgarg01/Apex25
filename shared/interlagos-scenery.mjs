import {imolaBoundaries,imolaAccessCorridors} from './imola.mjs';
import {cotaBoundaries,cotaAccessCorridors} from './cota.mjs';
import {monzaBoundaries,monzaAccessCorridors} from './monza.mjs';
import {mexicoBoundaries,mexicoAccessCorridors} from './mexico.mjs';
import {redbullringBoundaries,redbullringAccessCorridors} from './redbullring.mjs';
import {silverstoneBoundaries,silverstoneAccessCorridors} from './silverstone.mjs';
// Environment-only placement. No changes to the driving model or road geometry.
import {sample,terrainHeight} from './tracks.mjs';
import {pitLayout,pitRoadPose} from './pit-layout.mjs';
import {interlagosBoundaries} from './interlagos-boundary.mjs';
import {zandvoortBoundaries} from './zandvoort.mjs';
import {miamiBoundaries} from './miami.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const cache=new WeakMap();
function distanceSegment(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
function segmentDistance(a,b,c,d){const cross=(p,q,r)=>(q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x);if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return 0;return Math.min(distanceSegment(a,c,d),distanceSegment(b,c,d),distanceSegment(c,a,b),distanceSegment(d,a,b));}
export function localInterlagos(track,[lon,lat]){return {x:(lon-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(lat-track.origin.lat)*111320};}
function segmentBox(a,b,hx,hz){
 let low=0,high=1;
 for(const [v,d,h]of [[a.x,b.x-a.x,hx],[a.z,b.z-a.z,hz]]){if(Math.abs(d)<1e-10){if(Math.abs(v)>h)return false;continue;}const p=(-h-v)/d,q=(h-v)/d;low=Math.max(low,Math.min(p,q));high=Math.min(high,Math.max(p,q));if(low>high)return false;}return true;
}
export function interlagosCorridors(track){
 if(cache.has(track))return cache.get(track);
 const pit=pitLayout(track),segments=[],boundary=track.id==='it-1953'?imolaBoundaries(track):track.id==='us-2012'?cotaBoundaries(track):track.id==='it-1922'?monzaBoundaries(track):track.id==='mx-1962'?mexicoBoundaries(track):track.id==='at-1969'?redbullringBoundaries(track):track.id==='gb-1948'?silverstoneBoundaries(track):track.id==='us-2022'?miamiBoundaries(track):track.id==='nl-1948'?zandvoortBoundaries(track):interlagosBoundaries(track);
 for(let i=0;i<track.points.length;i++){const next=(i+1)%track.points.length,left=Math.max(boundary[1][i].offset,boundary[1][next].offset),right=Math.max(boundary[-1][i].offset,boundary[-1][next].offset),shift=(left-right)/2,move=p=>({...p,x:p.x+Math.cos(p.heading)*shift,z:p.z-Math.sin(p.heading)*shift});segments.push({a:move(track.points[i]),b:move(track.points[next]),half:(left+right)/2,kind:'race'});}
 for(let d=0;d<pit.length;d+=3)segments.push({a:pitRoadPose(track,d),b:pitRoadPose(track,Math.min(d+3,pit.length)),half:pit.width/2,kind:'pit'});
 if(track.id==='it-1953')segments.push(...imolaAccessCorridors(track));
 if(track.id==='us-2012')segments.push(...cotaAccessCorridors(track));
 if(track.id==='it-1922')segments.push(...monzaAccessCorridors(track));
 if(track.id==='mx-1962')segments.push(...mexicoAccessCorridors(track));
 if(track.id==='at-1969')segments.push(...redbullringAccessCorridors(track));
 if(track.id==='gb-1948')segments.push(...silverstoneAccessCorridors(track));
 cache.set(track,segments);return segments;
}
// A segment vs expanded oriented rectangle test is conservative for the complete
// footprint, including roofs, crowds, flag motion and props. Checks ALL branches.
export function interlagosFootprintClear(track,site,margin=3){
 if(site.outline){const edges=interlagosCorridors(track).filter(e=>e.kind==='pit').concat(track.points.map((p,i)=>({a:p,b:track.points[(i+1)%track.points.length],half:track.width/2})));for(const edge of edges){if(interlagosContains(site.outline,edge.a.x,edge.a.z))return false;for(let i=0;i<site.outline.length;i++)if(segmentDistance(edge.a,edge.b,site.outline[i],site.outline[(i+1)%site.outline.length])<edge.half+margin)return false;}return true;}
 const c=Math.cos(site.heading||0),s=Math.sin(site.heading||0),project=p=>({x:(p.x-site.x)*c-(p.z-site.z)*s,z:(p.x-site.x)*s+(p.z-site.z)*c});
 for(const edge of interlagosCorridors(track)){const pad=edge.half+margin;if(segmentBox(project(edge.a),project(edge.b),site.w/2+pad,site.d/2+pad))return false;}return true;
}
export function interlagosEnvelopeOverlap(a,b,gap=2){
 for(const h of [a.heading||0,b.heading||0])for(const axis of [[Math.cos(h),-Math.sin(h)],[Math.sin(h),Math.cos(h)]]){
  const extent=p=>Math.abs(axis[0]*Math.cos(p.heading||0)-axis[1]*Math.sin(p.heading||0))*p.w/2+Math.abs(axis[0]*Math.sin(p.heading||0)+axis[1]*Math.cos(p.heading||0))*p.d/2;
  if(Math.abs((a.x-b.x)*axis[0]+(a.z-b.z)*axis[1])>extent(a)+extent(b)+gap)return false;
 }return true;
}
export function interlagosClearance(track,site){
 let low=0,high=1500;if(!interlagosFootprintClear(track,site,0))return -1;
 for(let i=0;i<20;i++){const mid=(low+high)/2;if(interlagosFootprintClear(track,site,mid))low=mid;else high=mid;}return low;
}
export function interlagosPlanner(track){
 const sites=[],rejected=[];
 function reserve(spec){
  const site={heading:0,...spec};if(!interlagosFootprintClear(track,site,site.margin??4)||sites.some(other=>interlagosEnvelopeOverlap(site,other)))return null;
  site.y??=terrainHeight(track,site.x,site.z)-.2;sites.push(site);return site;
 }
 function roadside(spec){
  const road=sample(track,spec.s),heading=spec.heading??road.heading,side=spec.side||1;
  for(let offset=spec.offset??track.width/2+spec.w/2+12;offset<1000;offset+=6){const p=sample(track,spec.s,side*offset),result=reserve({...spec,...p,heading});if(result)return result;}
  rejected.push(spec.id);return null;
 }
 return {sites,rejected,reserve,roadside};
}
export function interlagosTerrainHeight(track,x,z,cell=12){
 // Same cached road elevations. Constrain every vertex beneath every road
 // triangle it could reach, so steep banks cannot protrude through the mesh.
 let closest=track.points[0],best=Infinity;
 for(let i=0;i<track.points.length;i+=4){const p=track.points[i],squaredDistance=(x-p.x)**2+(z-p.z)**2;if(squaredDistance<best){closest=p;best=squaredDistance;}}
 const distance=Math.sqrt(best)-track.width/2,blend=clamp((distance-12)/65,0,1),bank=4+4*Math.sin(x*.008+z*.005)**2;
 let y=terrainHeight(track,x,z)-.9+bank*blend;
 const reach=track.width/2+Math.SQRT2*cell+track.step,boundary=track.id==='it-1953'?imolaBoundaries(track):track.id==='us-2012'?cotaBoundaries(track):track.id==='it-1922'?monzaBoundaries(track):track.id==='mx-1962'?mexicoBoundaries(track):track.id==='at-1969'?redbullringBoundaries(track):track.id==='gb-1948'?silverstoneBoundaries(track):track.id==='us-2022'?miamiBoundaries(track):track.id==='nl-1948'?zandvoortBoundaries(track):interlagosBoundaries(track);
 for(let i=0;i<track.points.length;i++){const p=track.points[i],dx=x-p.x,dz=z-p.z,along=dx*Math.sin(p.heading)+dz*Math.cos(p.heading),across=dx*Math.cos(p.heading)-dz*Math.sin(p.heading),pad=Math.SQRT2*cell+track.step;if(Math.abs(along)<reach&&across>-boundary[-1][i].offset-pad&&across<boundary[1][i].offset+pad)y=Math.min(y,p.y-.9);}
 // Suppress discontinuities close to the asphalt; outside banks stay rolling.
 if(distance<12)y=Math.min(y,closest.y-.9);
 return y;
}
const layoutCache=new WeakMap();
export function planInterlagos(track,data){
 if(layoutCache.has(track))return layoutCache.get(track);
 const planner=interlagosPlanner(track),pit=pitLayout(track),box=pitRoadPose(track,pit.box),pitWidth=30,pitDepth=Math.min(325,pit.length-pit.taper*2-18),normal={x:Math.cos(pit.frame.heading),z:-Math.sin(pit.frame.heading)};
 const pitAnchor=data.anchors.find(p=>p.kind==='pits');
 for(let extra=0;extra<=72;extra+=6){const offset=pit.side*(pit.width/2+pitWidth/2+5+extra);if(planner.reserve({...pitAnchor,x:box.x+normal.x*offset,z:box.z+normal.z*offset,y:box.y-.2,heading:pit.frame.heading,w:pitWidth,d:pitDepth,side:pit.side,margin:3}))break;}
 for(const a of data.anchors.filter(p=>p.kind!=='pits')){let s=a.s;const mapped=data.osm.features.find(f=>f.way===a.mappedWay);if(mapped){const outline=mapped.points.map(p=>localInterlagos(track,p)),center=outline.reduce((v,p)=>({x:v.x+p.x/outline.length,z:v.z+p.z/outline.length}),{x:0,z:0});let best=Infinity;track.points.forEach((p,i)=>{const d=Math.hypot(p.x-center.x,p.z-center.z);if(d<best){best=d;s=i*track.step;}});}planner.roadside({...a,s,margin:12});}
 // OSM outline is preferred. Reserve its entire enclosing rectangle, not just
 // its shoreline points, so both road branches and the pit corridor stay clear.
 const water=data.osm.features.find(p=>p.tags?.natural==='water');let lake=null;
 if(water){const outline=water.points.map(p=>localInterlagos(track,p)),xs=outline.map(p=>p.x),zs=outline.map(p=>p.z),x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2;lake=planner.reserve({id:'lake',kind:'lake',x,z,w:Math.max(...xs)-Math.min(...xs)+8,d:Math.max(...zs)-Math.min(...zs)+8,outline,approximate:false,margin:10,osm:water.way});}
 if(!lake){const p=localInterlagos(track,data.lake.center);lake=planner.reserve({...data.lake,...p,id:'lake',kind:'lake',margin:12});}
 if(lake){lake.y=Math.min(...track.points.map(p=>p.y))-.5;if(!lake.outline)lake.outline=Array.from({length:49},(_,i)=>{const a=i*Math.PI/24,c=Math.cos(lake.heading||0),s=Math.sin(lake.heading||0),x=Math.cos(a)*(lake.w/2-4),z=Math.sin(a)*(lake.d/2-4);return {x:lake.x+c*x+s*z,z:lake.z-s*x+c*z};});}
 for(let i=0;i<16;i++)planner.roadside({id:'official-'+i,kind:'official',s:150+i*track.length/16,side:i%2?1:-1,w:i%4===0?22:9,d:16,margin:11,crane:i%4===0});
 // Explicit braking boards at the end of Reta Oposta. Existing track furniture
 // elsewhere is not used: every complete sign footprint is reserved here.
 for(const distance of [150,100,50])planner.roadside({id:'braking-'+distance,kind:'board',s:1370-distance,side:-1,w:2,d:1.2,margin:3,label:String(distance)});
 for(const [index,s]of [340,1300,2150,3250,3900].entries())planner.roadside({id:'board-brand-'+index,kind:'banner',s,side:-1,w:1.2,d:18,margin:10,label:['APEX ENERGY','SÃO PAULO · RACE','VELOCIDADE','CIRCUIT CLUB','BRASIL · 25'][index]});
 const treeSites=[];
 for(let i=0;i<1050;i++){
  const s=(i*.61803398875%1)*track.length,side=i%2?1:-1,scale=.9+(i%7)*.11,offset=26+(i%29)*4.8,p=sample(track,s,side*offset),type=i%9===0?'palm':i%4===0?'pine':'broadleaf',site=planner.reserve({id:'tree-'+i,kind:'tree',...p,w:12*scale,d:12*scale,heading:i*1.7,scale,type,margin:7});
  if(site){site.y=interlagosTerrainHeight(track,site.x,site.z);treeSites.push(site);}
  if(treeSites.length>=800)break;
 }
 // Low-detail hillside housing, kept well outside every road and pit branch.
 for(let i=0;i<230;i++){
  const a=i*2.399963,r=850+(i%9)*52,x=Math.sin(a)*r,z=Math.cos(a)*r*.85;
  const site=planner.reserve({id:'house-'+i,kind:i%19===0?'apartment':'house',x,z,w:16+i%4*2,d:14+i%3*3,heading:Math.round(a/.35)*.35,height:i%19===0?35+i%4*6:4+i%3*2,margin:20});if(site)site.y=interlagosTerrainHeight(track,x,z);
 }
 const result={...planner,pit,lake,treeSites};layoutCache.set(track,result);return result;
}
export function interlagosContains(outline,x,z){let inside=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){const a=outline[i],b=outline[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;}return inside;}
