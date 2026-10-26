import {damageTyres} from './tyres.mjs';
import {carShapes,CONTACT_SLOP} from './car-shape.mjs';
import {velocityOf,setVelocity,projectMotion} from './motion.mjs';
import {yawRate,conditionProfile} from './conditions.mjs';
// Finite mass/inertia for impulses; detailed contact shapes match the model.
const HALF_WIDTH=1.24,HALF_LENGTH=2.6,CENTER_OFFSET=.3,MASS=800,INV_MASS=1/MASS,INV_INERTIA=12/(MASS*((HALF_LENGTH*2)**2+(HALF_WIDTH*2)**2));
const dot=(a,b)=>a.x*b.x+a.z*b.z;
const lever=(r,n)=>r.z*n.x-r.x*n.z;
const radius=(b,axis)=>Math.abs(dot(axis,b.forward))*b.halfLength+Math.abs(dot(axis,b.right))*b.halfWidth;
function body(c){const forward={x:Math.sin(c.heading),z:Math.cos(c.heading)},right={x:forward.z,z:-forward.x};return {forward,right,x:c.x+forward.x*CENTER_OFFSET,z:c.z+forward.z*CENTER_OFFSET};}
function shapeContact(A,B){
 const delta={x:B.x-A.x,z:B.z-A.z};let depth=Infinity,normal;
 for(const axis of [A.forward,A.right,B.forward,B.right]){
  const separation=dot(delta,axis),overlap=radius(A,axis)+radius(B,axis)-Math.abs(separation);
  if(overlap<=CONTACT_SLOP)return null;
  if(overlap<depth){depth=overlap;const sign=separation<0?-1:1;normal={x:axis.x*sign,z:axis.z*sign};}
 }
 const tangent={x:-normal.z,z:normal.x},aT=dot(A,tangent),bT=dot(B,tangent),low=Math.max(aT-radius(A,tangent),bT-radius(B,tangent)),high=Math.min(aT+radius(A,tangent),bT+radius(B,tangent)),along=(low+high)/2,across=(dot(A,normal)+radius(A,normal)+dot(B,normal)-radius(B,normal))/2;
 return {depth,normal,point:{x:normal.x*across+tangent.x*along,z:normal.z*across+tangent.z*along}};
}
export function carContact(a,b){
 if(a.finished||b.finished||a.retired||b.retired||a.contactUncertain||b.contactUncertain)return null;
 if(Math.abs(a.y-b.y)>1.5||Math.abs(a.x-b.x)>7||Math.abs(a.z-b.z)>7)return null;
 let deepest=null;const shapesA=carShapes(a),shapesB=carShapes(b);
 for(const A of shapesA)for(const B of shapesB){const hit=shapeContact(A,B);if(hit&&(!deepest||hit.depth>deepest.depth))deepest=hit;}
 return deepest;
}
function contactVelocity(car,r){const v=velocityOf(car),spin=yawRate(car)+(car.impactYaw||0);return {x:v.x+spin*r.z,z:v.z-spin*r.x};}
function impulse(car,r,p,weight){
 if(!weight)return;const v=velocityOf(car);setVelocity(car,v.x+p.x*INV_MASS,v.z+p.z*INV_MASS);
 car.impactYaw=Math.max(-3,Math.min(3,(car.impactYaw||0)+lever(r,p)*INV_INERTIA));
}
function collide(a,b,hit,wa,wb,bounce){
 const A=body(a),B=body(b),ra={x:hit.point.x-A.x,z:hit.point.z-A.z},rb={x:hit.point.x-B.x,z:hit.point.z-B.z},n=hit.normal,t={x:-n.z,z:n.x};
 const relative=()=>{const av=contactVelocity(a,ra),bv=contactVelocity(b,rb);return {x:bv.x-av.x,z:bv.z-av.z};};
 const effective=axis=>(wa+wb)*INV_MASS+(wa*lever(ra,axis)**2+wb*lever(rb,axis)**2)*INV_INERTIA;
 const closing=-dot(relative(),n);if(closing<=.001)return;
 if(bounce){if(wa)damageTyres(a,closing);if(wb)damageTyres(b,closing);}
 // Equal finite masses transfer momentum in the contact direction. The small
 // restitution is applied once; solver passes never add repeated bounce energy.
 const normalImpulse=(1+(bounce&&closing>2?.06:0))*closing/effective(n);
 impulse(a,ra,{x:-n.x*normalImpulse,z:-n.z*normalImpulse},wa);impulse(b,rb,{x:n.x*normalImpulse,z:n.z*normalImpulse},wb);
 const wet=Math.max(conditionProfile(a.conditions).wetness,conditionProfile(b.conditions).wetness),limit=(.10-wet*.04)*normalImpulse,tangentImpulse=Math.max(-limit,Math.min(limit,-dot(relative(),t)/effective(t)));
 impulse(a,ra,{x:-t.x*tangentImpulse,z:-t.z*tangentImpulse},wa);impulse(b,rb,{x:t.x*tangentImpulse,z:t.z*tangentImpulse},wb);
}
function nearbyPairs(cars,movingId){
 const grid=new Map(),pairs=[];
 for(let i=0;i<cars.length;i++){const c=cars[i];if(c.retired||c.finished)continue;const x=Math.floor(c.x/8),z=Math.floor(c.z/8);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const j of grid.get(`${x+dx},${z+dz}`)||[])if(movingId===null||c.id===movingId||cars[j].id===movingId)pairs.push([j,i]);const key=`${x},${z}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(i);}
 return pairs;
}
export function resolveCarContacts(cars,movingId=null,{impulses=true,maxCorrection=.8,fixedIds=null,time=null}={}){
 if(Number.isFinite(time))return timedContacts(cars,movingId,{impulses,maxCorrection,fixedIds},time);
 let contacts=0;const pairs=nearbyPairs(cars,movingId),bounced=new Set();
 for(let pass=0;pass<4;pass++){
  let touched=false;
  for(const [i,j] of pairs){
   const a=cars[i],b=cars[j],hit=carContact(a,b);if(!hit)continue;
   const wa=a.finished||fixedIds?.has(a.id)?0:1,wb=b.finished||fixedIds?.has(b.id)?0:1,total=wa+wb;if(!total)continue;
   if(impulses){const key=i+':'+j;collide(a,b,hit,wa,wb,!bounced.has(key));bounced.add(key);}
   const {normal:n,depth}=hit,push=Math.min(depth+.001,maxCorrection);touched=true;
   a.x-=n.x*push*wa/total;a.z-=n.z*push*wa/total;b.x+=n.x*push*wb/total;b.z+=n.z*push*wb/total;
   contacts++;
  }
  if(!touched)break;
 }
 return contacts;
}

// Never collide a just-simulated driver with another driver's older input pose.
// Only contact corrections/impulses return to the originals, not projected travel.
function timedContacts(cars,movingId,options,time){
 const views=cars.map(car=>{const view={...car},stamp=car.physicsTime??car.inputTime??time,dt=time-stamp;const moving=Math.abs(car.v)>2||Math.hypot(car.impactVX||0,car.impactVZ||0)>.5;view.contactUncertain=Math.abs(dt)>.25&&moving;if(Math.abs(dt)<=.25)projectMotion(view,dt);return view;}),before=views.map(c=>({x:c.x,z:c.z,velocity:velocityOf(c),spin:c.impactYaw||0}));
 const contacts=resolveCarContacts(views,movingId,options);if(!contacts)return 0;
 for(let i=0;i<cars.length;i++){const c=cars[i],view=views[i],base=before[i];c.x+=view.x-base.x;c.z+=view.z-base.z;if(options.impulses){const old=velocityOf(c),after=velocityOf(view);setVelocity(c,old.x+after.x-base.velocity.x,old.z+after.z-base.velocity.z);c.impactYaw=Math.max(-3,Math.min(3,(c.impactYaw||0)+(view.impactYaw||0)-base.spin));if(Number.isFinite(view.tyreLife)){c.tyreLife=view.tyreLife;c.tyreImpactCooldown=view.tyreImpactCooldown;}}}
 return contacts;
}
