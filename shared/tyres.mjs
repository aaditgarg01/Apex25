// Arcade strategy balance, scaled by race distance rather than wall-clock time.
export const TYRES=Object.freeze({
 soft:{id:'soft',name:'Soft',letter:'S',color:'#ff4c50',life:.60,grip:1.04},
 medium:{id:'medium',name:'Medium',letter:'M',color:'#ffd642',life:.80,grip:1},
 hard:{id:'hard',name:'Hard',letter:'H',color:'#edf1f3',life:1.05,grip:.97},
 intermediate:{id:'intermediate',name:'Intermediate',letter:'I',color:'#50d17d',life:.85,grip:1},
 wet:{id:'wet',name:'Wet',letter:'W',color:'#5ca9ff',life:.95,grip:1}
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const defaultTyre=conditions=>conditions==='wet'?'wet':conditions==='intermediate'?'intermediate':'medium';
export const tyreProfile=id=>TYRES[id]||TYRES.medium;
export function tyreStintLaps(laps,compound='medium'){
 const distance=Number.isFinite(laps)&&laps>0?laps:8;
 // One/two-lap sprints do not require a stop simply to reach the finish.
 return Math.max(1.5,distance<3?distance*1.7:distance*tyreProfile(compound).life);
}
export function prepareTyres(car,laps=Infinity){
 car.tyreCompound=defaultTyre(car.conditions);car.tyreLife=100;car.tyreRaceLaps=laps;
 car.tyreBoostHeat=0;car.tyreDistance=0;car.pitStops=0;car.pitState='none';car.pitRequested=false;
 car.pitCompound=car.tyreCompound;car.pitTimer=0;car.pitTravel=0;car.tyreImpactCooldown=0;
}
export function tyreGrip(car){
 if(!Number.isFinite(car.tyreLife))return 1;
 const life=clamp(car.tyreLife,0,100),degradation=life>=35?1:life>=10?.78+(life-10)/25*.22:.54+life/10*.24;
 const compound=tyreProfile(car.tyreCompound),condition=car.conditions||'normal';
 const match=condition==='wet'?(compound.id==='wet'?1:compound.id==='intermediate'?.78:.52):condition==='intermediate'?(compound.id==='intermediate'?1:compound.id==='wet'?.88:.84):compound.id==='wet'?.78:compound.id==='intermediate'?.88:1;
 return degradation*compound.grip*match;
}
export function wearTyres(car,track,dt,distance,boosting=false){
 if(!Number.isFinite(car.tyreLife)||car.finished||car.pitState&&car.pitState!=='none')return;
 car.tyreImpactCooldown=Math.max(0,(car.tyreImpactCooldown||0)-dt);
 const speed=Math.abs(car.v),moving=speed>8;
 car.tyreBoostHeat=clamp((car.tyreBoostHeat||0)+dt*(boosting&&moving?1/6:-1/10),0,1);
 if(distance<=0||!Number.isFinite(distance))return;
 const scrub=Math.min(.35,Math.abs(car.steer||0)*speed/140),boostWear=boosting&&moving?.25+.55*car.tyreBoostHeat:0;
 const mismatch=car.conditions==='normal'&&['intermediate','wet'].includes(car.tyreCompound)?1.65:1;
 const wear=100*distance/(track.length*tyreStintLaps(car.tyreRaceLaps,car.tyreCompound))*(1+scrub+boostWear+(car.sliding?.2:0)+(car.offtrack?.3:0))*mismatch;
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
