import {conditionProfile,yawRate} from './conditions.mjs';

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

// Shared kinematic projection for comparing poses at one time. It does not run
// controls, award laps, or mutate an authoritative timestamp.
export function projectMotion(c,dt){
 if(c.finished||!dt)return;
 const yaw=yawRate(c)+(c.impactYaw||0),travel=Number.isFinite(c.motionHeading)?c.motionHeading:c.heading,motionYaw=Number.isFinite(c.motionYawRate)?c.motionYawRate:yaw;
 const impact=Math.hypot(c.impactVX||0,c.impactVZ||0)>.01||Math.abs(c.impactYaw||0)>.001,middle=travel+(impact?0:motionYaw*dt/2),distance=c.v*dt,damping=impactDamping(c),driftTime=(1-Math.exp(-damping*dt))/damping;
 const longitudinal={x:Math.sin(travel)*c.v,z:Math.cos(travel)*c.v};
 c.x+=Math.sin(middle)*distance*Math.cos(c.pitch||0)+(c.impactVX||0)*driftTime;
 c.z+=Math.cos(middle)*distance*Math.cos(c.pitch||0)+(c.impactVZ||0)*driftTime;
 c.y+=(Math.sin(c.pitch||0)*distance);c.heading+=yaw*dt;c.motionHeading=travel+motionYaw*dt;
 if(dt>0)dampImpact(c,dt);
 if(impact)setVelocity(c,longitudinal.x+(c.impactVX||0),longitudinal.z+(c.impactVZ||0));
 c.progress+=distance;
}
