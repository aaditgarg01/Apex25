import {tyreGrip} from './tyres.mjs';
// Arcade surface presets. The normal preset retains the original dry handling.
export const CONDITIONS=Object.freeze({
 dynamic:Object.freeze({id:'dynamic',label:'Dynamic / changing weather',description:'Each condition lasts 1–3 whole leader laps before it can change. Everyone shares the same weather.',wetness:0,traction:1,braking:1,steering:1,pace:1,lateral:Infinity,alignment:Infinity,curbGrip:1}),
 normal:Object.freeze({id:'normal',label:'Normal / dry',description:'Dry surface, full grip and normal braking.',wetness:0,traction:1,braking:1,steering:1,pace:1,lateral:Infinity,alignment:Infinity,curbGrip:1}),
 intermediate:Object.freeze({id:'intermediate',label:'Intermediate / damp',description:'Damp surface and light rain. Brake earlier and feed in the throttle.',wetness:.45,traction:.82,braking:.76,steering:.92,pace:.82,lateral:17,alignment:6,curbGrip:.80}),
 wet:Object.freeze({id:'wet',label:'Wet / rain',description:'Heavy rain and low grip. Longer braking distances, more sliding and slippery kerbs.',wetness:1,traction:.63,braking:.54,steering:.80,pace:.65,lateral:11,alignment:3.6,curbGrip:.62})
});
export const normalizeConditions=value=>Object.hasOwn(CONDITIONS,value)?value:'normal';
const blended=new Map();
export function conditionProfile(value,wetness){
 if(!Number.isFinite(wetness))return CONDITIONS[normalizeConditions(value)];
 const key=Math.round(Math.max(0,Math.min(1,wetness))*100);
 if(!key)return CONDITIONS.normal;if(key===100)return CONDITIONS.wet;
 if(blended.has(key))return blended.get(key);
 const w=key/100,a=w<=.45?CONDITIONS.normal:CONDITIONS.intermediate,b=w<=.45?CONDITIONS.intermediate:CONDITIONS.wet,t=w<=.45?w/.45:(w-.45)/.55;
 const profile={...a,id:w<.12?'normal':w<.72?'intermediate':'wet',wetness:w};
 for(const field of ['traction','braking','steering','pace','curbGrip'])profile[field]=a[field]+(b[field]-a[field])*t;
 profile.lateral=(Number.isFinite(a.lateral)?a.lateral:30)+(b.lateral-(Number.isFinite(a.lateral)?a.lateral:30))*t;
 profile.alignment=(Number.isFinite(a.alignment)?a.alignment:22)+(b.alignment-(Number.isFinite(a.alignment)?a.alignment:22))*t;
 blended.set(key,profile);return profile;
}
export function yawRate(car){
 const speed=Math.abs(car.v),profile=conditionProfile(car.conditions,car.trackWetness);
 const rate=speed>1?Math.min(speed/9,1)*(1.9/(1+speed*.025)):0;
 const requested=(car.v>=0?1:-1)*(car.steer||0)*rate*profile.steering*tyreGrip(car);
 const rubber=tyreGrip(car);if(!profile.wetness&&rubber>=.9&&(car.airDensity??1)===1)return requested;
 const grip=car.surfaceGrip??1;
 // Aero provides grip at speed, but hard braking / acceleration uses up some
 // of the available tyre grip. Saturation produces understeer, not assistance.
 const lateral=Number.isFinite(profile.lateral)?profile.lateral:30;
 const limit=(lateral+speed*speed*.0025*(car.airDensity??1))*rubber*grip*(car.cornerGrip??1)/Math.max(1,speed);
 return Math.max(-limit,Math.min(limit,requested));
}
