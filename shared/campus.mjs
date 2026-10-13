// Campus infrastructure is tied to positions on the geographic race route.
const mod=(n,m)=>((n%m)+m)%m;
export const campusScale=track=>track.campus?.raceScale||1;
export const campusLocal=(track,location)=>({x:(location[0]-track.origin.lon)*111320*Math.cos(track.origin.lat*Math.PI/180)*campusScale(track),z:-(location[1]-track.origin.lat)*111320*campusScale(track)});
export const campusDistance=(track,s,center)=>Math.abs(mod(s-center+track.length/2,track.length)-track.length/2);
export function prepareCampus(track){
 if(!track.campus)return;
 for(const tunnel of track.campus.tunnels){
  const site=campusLocal(track,tunnel.location);let best=Infinity,index=0;
  track.points.forEach((p,i)=>{const d=Math.hypot(p.x-site.x,p.z-site.z);if(d<best){best=d;index=i;}});
  tunnel.center=index*track.step;
 }
 for(let i=0;i<track.points.length;i++){
  const p=track.points[i];p.groundY=p.y;
  for(const tunnel of track.campus.tunnels){
   const d=campusDistance(track,i*track.step,tunnel.center),edge=tunnel.covered/2;
   const t=Math.max(0,Math.min(1,(d-edge)/tunnel.approach));
   p.y-=tunnel.depth*(1-t*t*(3-2*t));
  }
 }
 const heights=track.points.map(p=>p.y),low=Math.min(...heights),high=Math.max(...heights),base=track.elevation.min;track.elevation.min=base+low;track.elevation.max=base+high;track.elevation.range=high-low;
 track.elevation.source+=' · reconstructed railway underpasses';
}
export function campusTunnelAt(track,s,padding=0){return track.campus?.tunnels.find(t=>campusDistance(track,s,t.center)<t.covered/2+padding)||null;}
