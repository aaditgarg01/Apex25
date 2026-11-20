import {sample,wrap} from './tracks.mjs';
import {pitLayout} from './pit-layout.mjs';
const axes=new WeakMap();
// Monza's sampled ribbon has small tangent variations along the pit straight.
// A parked car/grid marking must face the straight's axis, rather than inherit
// one of those local tangents and cross the road while driving straight ahead.
function monzaAxis(track){
 if(axes.has(track))return axes.get(track);
 const heading=pitLayout(track).frame.heading,origin=sample(track,0),fx=Math.sin(heading),fz=Math.cos(heading),rx=Math.cos(heading),rz=-Math.sin(heading),points=[];
 for(let station=-80;station<=480;station+=5){const p=sample(track,station),x=p.x-origin.x,z=p.z-origin.z;points.push({along:x*fx+z*fz,across:x*rx+z*rz});}
 const meanAlong=points.reduce((sum,p)=>sum+p.along,0)/points.length,meanAcross=points.reduce((sum,p)=>sum+p.across,0)/points.length;
 const numerator=points.reduce((sum,p)=>sum+(p.along-meanAlong)*(p.across-meanAcross),0),denominator=points.reduce((sum,p)=>sum+(p.along-meanAlong)**2,0),axis=heading+Math.atan2(numerator,denominator);
 axes.set(track,axis);return axis;
}
export function spawnPose(track,station,offset=0){
 const p=sample(track,station,offset),wrapped=wrap(station,track.length),signed=wrapped>track.length/2?wrapped-track.length:wrapped;
 if(track.id==='it-1922'&&signed>=-80&&signed<=480)p.heading=monzaAxis(track);
 return p;
}
