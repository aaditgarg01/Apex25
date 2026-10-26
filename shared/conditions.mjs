import {tyreGrip} from './tyres.mjs';
// Arcade surface presets. The normal preset retains the original dry handling.
export const CONDITIONS=Object.freeze({
 normal:Object.freeze({id:'normal',label:'Normal / dry',description:'Dry surface, full grip and normal braking.',wetness:0,traction:1,braking:1,steering:1,pace:1,lateral:Infinity,alignment:Infinity,curbGrip:1}),
 intermediate:Object.freeze({id:'intermediate',label:'Intermediate / damp',description:'Damp surface and light rain. Brake earlier and feed in the throttle.',wetness:.45,traction:.82,braking:.76,steering:.92,pace:.82,lateral:17,alignment:6,curbGrip:.80}),
 wet:Object.freeze({id:'wet',label:'Wet / rain',description:'Heavy rain and low grip. Longer braking distances, more sliding and slippery kerbs.',wetness:1,traction:.63,braking:.54,steering:.80,pace:.65,lateral:11,alignment:3.6,curbGrip:.62})
});
export const normalizeConditions=value=>Object.hasOwn(CONDITIONS,value)?value:'normal';
export const conditionProfile=value=>CONDITIONS[normalizeConditions(value)];
export function yawRate(car){
 const speed=Math.abs(car.v),profile=conditionProfile(car.conditions);
 const rate=speed>1?Math.min(speed/9,1)*(1.9/(1+speed*.025)):0;
 const requested=(car.v>=0?1:-1)*(car.steer||0)*rate*profile.steering*tyreGrip(car);
 if(!profile.wetness)return requested;
 const grip=car.surfaceGrip??1;
 // Aero provides grip at speed, but hard braking / acceleration uses up some
 // of the available tyre grip. Saturation produces understeer, not assistance.
 const limit=(profile.lateral+speed*speed*.0025)*grip*(car.cornerGrip??1)/Math.max(1,speed);
 return Math.max(-limit,Math.min(limit,requested));
}
