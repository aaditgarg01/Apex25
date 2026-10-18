import {conditionProfile} from './conditions.mjs';

// Driving keeps signed longitudinal speed. Impact momentum also needs a lateral
// component: projecting every collision onto the nose can stop a grazing car.
export function velocityOf(car){
 const heading=car.motionHeading??car.heading;
 return {x:Math.sin(heading)*car.v+(car.impactVX||0),z:Math.cos(heading)*car.v+(car.impactVZ||0)};
}
export function setVelocity(car,x,z){
 const heading=car.motionHeading??car.heading,fx=Math.sin(heading),fz=Math.cos(heading);
 car.v=x*fx+z*fz;car.impactVX=x-car.v*fx;car.impactVZ=z-car.v*fz;
}
export function clearImpact(car){car.impactVX=0;car.impactVZ=0;car.impactYaw=0;}
export function impactDamping(car){return (4.8-3.2*conditionProfile(car.conditions).wetness)*Math.max(.4,car.surfaceGrip??1);}
export function dampImpact(car,dt){
 const decay=Math.exp(-impactDamping(car)*dt);
 car.impactVX=(car.impactVX||0)*decay;car.impactVZ=(car.impactVZ||0)*decay;
 car.impactYaw=(car.impactYaw||0)*Math.exp(-(2.8-1.2*conditionProfile(car.conditions).wetness)*dt);
 if(Math.hypot(car.impactVX,car.impactVZ)<.01){car.impactVX=0;car.impactVZ=0;}
 if(Math.abs(car.impactYaw)<.001)car.impactYaw=0;
}
