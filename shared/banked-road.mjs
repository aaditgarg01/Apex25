import {ZANDVOORT_BANKING} from './zandvoort-road-data.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),smooth=n=>{n=clamp(n,0,1);return n*n*n*(n*(n*6-15)+10);};
// No dependency on tracks.mjs: the track sampler and physics share this function.
export function bankingAt(track,station,offset=0){
 if(track.id!=='nl-1948')return {height:0,roll:0,bank:0,outerSide:0};
 const s=((station%track.length)+track.length)%track.length*ZANDVOORT_BANKING.nominalLength/track.length,half=track.width/2;
 for(const profile of ZANDVOORT_BANKING.profiles){
  if(s<=profile.start||s>=profile.end)continue;
  const ramp=smooth((s-profile.start)/(profile.full-profile.start))*smooth((profile.end-s)/(profile.end-profile.release)),low=Math.tan(profile.innerDegrees*Math.PI/180)*ramp,high=Math.tan(profile.outerDegrees*Math.PI/180)*ramp,q=profile.outerSide*offset,limited=clamp(q,-half,half),mean=(low+high)/2,slopeQ=mean+(high-low)*limited/(2*half),height=mean*limited+(high-low)*limited*limited/(4*half)+(q-limited)*slopeQ;
  const bank=Math.atan(slopeQ);return {height,roll:profile.outerSide*bank,bank,outerSide:profile.outerSide,turn:profile.turn};
 }return {height:0,roll:0,bank:0,outerSide:0};
}
export function bankedHeight(track,station,offset,centerHeight){return centerHeight+bankingAt(track,station,offset).height;}
export function bankSupport(bank,speed,radius,wetness=0){
 // Banking resolves part of gravity into the turn and increases normal load.
 // Weather attenuates tyre-usable support; gravity itself is never switched off.
 const angle=Math.abs(bank),normal=9.81*Math.cos(angle)+(speed*speed/Math.max(radius,3))*Math.sin(angle),usable=Math.max(0,1-wetness*.45);
 return {normalLoad:normal/9.81,lateralGravity:9.81*Math.sin(angle),gain:Math.min(.4,Math.max(0,normal/9.81-1))*usable,extraLateral:9.81*Math.tan(angle)*usable};
}

// Resolve one road normal into a chassis/camera heading, including sideways cars.
export function surfaceAttitude(road,heading=road.heading){
 const lateral=Math.tan(road.roll||0),longitudinal=road.grade??Math.tan(road.pitch||0),nx=-Math.cos(road.heading)*lateral-Math.sin(road.heading)*longitudinal,nz=Math.sin(road.heading)*lateral-Math.cos(road.heading)*longitudinal,norm=Math.hypot(nx,1,nz),normal={x:nx/norm,y:1/norm,z:nz/norm},localX=normal.x*Math.cos(heading)-normal.z*Math.sin(heading),localZ=normal.x*Math.sin(heading)+normal.z*Math.cos(heading);
 return {roll:Math.asin(clamp(-localX,-1,1)),pitch:Math.atan2(-localZ,normal.y),normal};
}
