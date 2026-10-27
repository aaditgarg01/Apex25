// Arcade strategy balance, scaled by race distance rather than wall-clock time.
export const TYRES=Object.freeze({
 soft:{id:'soft',name:'Soft',letter:'S',color:'#ff4c50',life:.60,grip:1.04},
 medium:{id:'medium',name:'Medium',letter:'M',color:'#ffd642',life:.80,grip:1},
 hard:{id:'hard',name:'Hard',letter:'H',color:'#edf1f3',life:1.05,grip:.97},
 intermediate:{id:'intermediate',name:'Intermediate',letter:'I',color:'#50d17d',life:.85,grip:1},
 wet:{id:'wet',name:'Wet',letter:'W',color:'#5ca9ff',life:.95,grip:1}
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const defaultTyre=conditions=>{const w=typeof conditions==='object'?surfaceWetness(conditions):typeof conditions==='number'?conditions:conditions==='wet'?1:conditions==='intermediate'?.45:0;return w>=.72?'wet':w>=.25?'intermediate':'medium';};
export const tyreProfile=id=>TYRES[id]||TYRES.medium;
export const validTyreChoice=id=>id==='auto'||Object.hasOwn(TYRES,id);
export const normalizeTyreChoice=id=>validTyreChoice(id)?id:'auto';
export function tyreStintLaps(laps,compound='medium',practice=false){
 const distance=Number.isFinite(laps)&&laps>0?laps:practice?24:8;
 // One/two-lap sprints do not require a stop simply to reach the finish.
 return Math.max(1.5,distance<3?distance*1.7:distance*tyreProfile(compound).life);
}
export function prepareTyres(car,laps=Infinity,starting=car.startTyre||'auto'){
 car.startTyre=normalizeTyreChoice(starting);car.tyreCompound=car.startTyre==='auto'?defaultTyre(car):car.startTyre;car.tyreLife=100;car.tyreRaceLaps=laps;
 car.tyreBoostHeat=0;car.tyreDistance=0;car.pitStops=0;car.pitState='none';car.pitRequested=false;
 car.pitCompound=car.tyreCompound;car.pitTimer=0;car.pitTravel=0;car.pitMerge=null;car.tyreImpactCooldown=0;
}
export function chooseStartingTyres(session,car,choice){
 if(!car||!validTyreChoice(choice)||session.elapsed>=0&&!session.phase.endsWith('results'))return false;
 car.startTyre=choice;
 if(session.elapsed<0)prepareTyres(car,car.tyreRaceLaps,choice);
 return true;
}
export function choosePitTyres(car,compound){
 if(!car||car.finished||car.retired||!Object.hasOwn(TYRES,compound)||car.pitState==='service')return false;
 car.pitCompound=compound;return true;
}
export const surfaceWetness=car=>clamp(Number.isFinite(car.trackWetness)?car.trackWetness:car.conditions==='wet'?1:car.conditions==='intermediate'?.45:0,0,1);
const mixTable=(w,values)=>w<=.45?values[0]+(values[1]-values[0])*w/.45:values[1]+(values[2]-values[1])*(w-.45)/.55;
const gripTable={slick:[1,.74,.36],intermediate:[.66,1,.72],wet:[.48,.88,1]};
const speedTable={slick:[1,.91,.67],intermediate:[.86,.98,.84],wet:[.75,.90,1]};
const wearTable={slick:[1,1.15,1.45],intermediate:[2.25,1,1.12],wet:[3.05,1.35,1]};
const family=id=>id==='wet'||id==='intermediate'?id:'slick';
export function tyreGrip(car){
 const life=clamp(Number.isFinite(car.tyreLife)?car.tyreLife:100,0,100),degradation=life>=35?1:life>=10?.78+(life-10)/25*.22:.54+life/10*.24;
 const compound=tyreProfile(car.tyreCompound),w=surfaceWetness(car),kind=family(compound.id);
 // Standing water overwhelms slicks at speed; tread disperses it progressively better.
 const aquaplaning=kind==='slick'?1-Math.max(0,w-.5)*Math.max(0,Math.min(1,((car.v||0)-40)/60))*.25:1;
 return degradation*compound.grip*mixTable(w,gripTable[kind])*aquaplaning;
}
export function tyreSpeedFactor(car){
 const w=surfaceWetness(car),life=Number.isFinite(car.tyreLife)?car.tyreLife:100;
 return (1-w*.16)*mixTable(w,speedTable[family(car.tyreCompound)])*(life>=15?1:.90+.10*Math.max(0,life)/15);
}
export const tyreWearFactor=car=>mixTable(surfaceWetness(car),wearTable[family(car.tyreCompound)]);
export function wearTyres(car,track,dt,distance,boosting=false){
 if(!Number.isFinite(car.tyreLife)||car.finished||car.pitState&&car.pitState!=='none')return;
 car.tyreImpactCooldown=Math.max(0,(car.tyreImpactCooldown||0)-dt);
 const speed=Math.abs(car.v),moving=speed>8;
 car.tyreBoostHeat=clamp((car.tyreBoostHeat||0)+dt*(boosting&&moving?1/6:-1/10),0,1);
 if(distance<=0||!Number.isFinite(distance))return;
 const scrub=Math.min(.35,Math.abs(car.steer||0)*speed/140),boostWear=boosting&&moving?.25+.55*car.tyreBoostHeat:0;
 const mismatch=tyreWearFactor(car);
 const wear=100*distance/(track.length*tyreStintLaps(car.tyreRaceLaps,car.tyreCompound,car.practice))*(1+scrub+boostWear+(car.sliding?.2:0)+(car.offtrack?.3:0))*mismatch;
 car.tyreDistance=(car.tyreDistance||0)+distance;car.tyreLife=clamp(car.tyreLife-wear,0,100);
}
export function damageTyres(car,closingSpeed){
 if(!Number.isFinite(car.tyreLife)||car.finished||(car.tyreImpactCooldown||0)>0||closingSpeed<2)return;
 // One loss per impact, not once per contact shape or solver iteration.
 car.tyreLife=clamp(car.tyreLife-clamp((closingSpeed-2)*.55,.25,14),0,100);car.tyreImpactCooldown=.4;
}
export function fitTyres(car){
 car.tyreCompound=tyreProfile(car.pitCompound).id;car.tyreLife=100;car.tyreDistance=0;car.tyreBoostHeat=0;car.tyreImpactCooldown=0;car.pitStops=(car.pitStops||0)+1;
}
