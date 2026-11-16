import {sampleGuide} from './racing-line.mjs';
import {angleDiff,targetSpeed} from './tracks.mjs';
// Identical scripted controller for browser and command-line comparisons.
export function networkLabDrive(track,car,elapsed){
 if(!car||car.finished||elapsed<0)return {steer:0,brake:true,park:true};
 const guide=sampleGuide(track,car.s+Math.max(12,Math.abs(car.v)*.45)),aim=Math.atan2(guide.x-car.x,guide.z-car.z),pace=targetSpeed(track,car.s)*.73,segment=Math.floor(elapsed%30),brake=car.v>pace+1.5||segment===12||segment===13;
 return {steer:Math.max(-1,Math.min(1,angleDiff(aim,car.heading)*3)),throttle:!brake,brake,boost:!brake&&segment>=15&&segment<=23};
}
