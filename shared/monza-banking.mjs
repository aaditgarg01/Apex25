import {MONZA_ACCESS} from './monza-access.mjs';
import {monzaBoundaries,monzaAccessCorridors} from './monza.mjs';
import {pitLayout,pitRoadPose} from './pit-layout.mjs';
import {terrainHeight} from './tracks.mjs';
const cache=new WeakMap(),roadCache=new WeakMap(),bankWay=id=>MONZA_ACCESS.some(r=>r.way===id&&r.name.startsWith('Sopraelevata'));
function boxHit(a,b,hx,hz){let low=0,high=1;for(const [v,d,h]of [[a.x,b.x-a.x,hx],[a.z,b.z-a.z,hz]]){if(Math.abs(d)<1e-9){if(Math.abs(v)>h)return false;continue;}const p=(-h-v)/d,q=(h-v)/d;low=Math.max(low,Math.min(p,q));high=Math.min(high,Math.max(p,q));if(low>high)return false;}return true;}
function corridors(track){if(roadCache.has(track))return roadCache.get(track);const rows=monzaBoundaries(track),edges=track.points.map((p,i)=>({a:p,b:track.points[(i+1)%track.points.length],half:Math.max(rows[-1][i].offset,rows[1][i].offset)})),pit=pitLayout(track);for(let d=0;d<pit.length;d+=3)edges.push({a:pitRoadPose(track,d),b:pitRoadPose(track,Math.min(d+3,pit.length)),half:pit.width/2});edges.push(...monzaAccessCorridors(track).filter(e=>!bankWay(e.way)));roadCache.set(track,edges);return edges;}
export function monzaBankFootprintClear(track,site,margin=2,includeBanking=false){const c=Math.cos(site.heading),s=Math.sin(site.heading),project=p=>({x:(p.x-site.x)*c-(p.z-site.z)*s,z:(p.x-site.x)*s+(p.z-site.z)*c});const all=includeBanking?corridors(track).concat(monzaAccessCorridors(track).filter(e=>bankWay(e.way))):corridors(track);return !all.some(e=>boxHit(project(e.a),project(e.b),site.w/2+e.half+margin,site.d/2+e.half+margin));}
export function monzaBankingPlan(track){
 if(cache.has(track))return cache.get(track);const patches=[],solids=[],skipped=[],local=p=>({x:(p[0]-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180),z:-(p[1]-track.origin.lat)*111320}),add=(a,b,width,height,kind)=>solids.push({a,b,width,height,kind});
 for(const road of MONZA_ACCESS.filter(r=>r.name.startsWith('Sopraelevata')&&r.tags.surface==='concrete'&&!r.bridge)){
  const points=road.points.map(local),center=points.reduce((p,q)=>({x:p.x+q.x/points.length,z:p.z+q.z/points.length}),{x:0,z:0});
  for(let i=0;i<points.length-1;i++){
   const pa=points[i],pb=points[i+1],distance=Math.hypot(pb.x-pa.x,pb.z-pa.z),steps=Math.max(1,Math.ceil(distance/9));
   for(let k=0;k<steps;k++){
    const a={x:pa.x+(pb.x-pa.x)*k/steps,z:pa.z+(pb.z-pa.z)*k/steps},b={x:pa.x+(pb.x-pa.x)*(k+1)/steps,z:pa.z+(pb.z-pa.z)*(k+1)/steps},heading=Math.atan2(b.x-a.x,b.z-a.z),site={id:'banking-'+road.way+'-'+i+'-'+k,kind:'historic-banking',x:(a.x+b.x)/2,z:(a.z+b.z)/2,w:15.6,d:distance/steps+.3,heading,sourceWay:road.way,margin:2};
    if(!monzaBankFootprintClear(track,site,2)){skipped.push(site.id);continue;}
    site.y=terrainHeight(track,site.x,site.z)-.75;patches.push(site);
    const nx=Math.cos(heading),nz=-Math.sin(heading),outward=(site.x-center.x)*nx+(site.z-center.z)*nz>=0?1:-1;
    // Narrow stepped solids approximate the progressive concrete profile.
    // These are static collision walls, never an additional driving ribbon.
    for(let band=0;band<16;band++){const u=(band+.5)/16,offset=outward*(-7.6+15.2*u),rise=.13+6.07*((band+1)/16)**2;add({x:a.x+nx*offset,z:a.z+nz*offset,y:site.y},{x:b.x+nx*offset,z:b.z+nz*offset,y:site.y},15.2/16+.015,rise,'banking');}
    const railOffset=outward*7.6;add({x:a.x+nx*railOffset,z:a.z+nz*railOffset,y:site.y+6.12},{x:b.x+nx*railOffset,z:b.z+nz*railOffset,y:site.y+6.12},.09,.8,'banking-rail');
   }
  }
 }
 const plan={patches,solids,skipped};cache.set(track,plan);return plan;
}
