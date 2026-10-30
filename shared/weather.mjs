import {conditionProfile,normalizeConditions} from './conditions.mjs';
const schedules=new WeakMap();
const category=w=>w<.12?'normal':w<.72?'intermediate':'wet';
// One room-wide clock: a slow driver or a late joiner cannot reset the weather.
const leaderLap=(session,track)=>{
 if(!Number.isFinite(track?.length)||track.length<=0)return 0;
 return session.cars.reduce((best,car)=>!car.retired&&Number.isFinite(car.progress)?Math.max(best,car.progress/track.length):best,0);
};
const duration=session=>1+Math.floor(Math.random()*(session.phase==='race'?Math.max(1,Math.min(3,session.laps-1)):3));
export function applyWeather(session){
 if(!session.weather)return;
 session.conditions=category(session.weather.wetness);
 for(const car of session.cars){car.conditions=session.conditions;car.trackWetness=session.weather.wetness;car.rainIntensity=session.weather.rain;}
}
export function initializeWeather(session,mode='normal',previous,track){
 session.weatherMode=normalizeConditions(mode);
 const dynamic=mode==='dynamic',initial=conditionProfile(previous?category(previous.wetness):dynamic?'normal':mode),laps=dynamic?duration(session):0;
 session.weather={dynamic,rain:initial.wetness,wetness:initial.wetness,trend:'Steady',revision:previous?.revision||0,...(dynamic?{periodLaps:laps,lapsRemaining:laps}:{})};
 // Start after practice positioning, so a sector start still gets a full lap.
 // Only the duration is public; the next condition is chosen at the boundary.
 schedules.set(session,{origin:leaderLap(session,track),clock:0,next:laps});applyWeather(session);
}
export function stepWeather(session,_dt,track){
 const weather=session.weather;if(!weather?.dynamic||session.phase==='race'&&session.cars.some(car=>car.finished&&!car.retired))return;
 let plan=schedules.get(session);
 if(!plan){initializeWeather(session,session.weatherMode||'dynamic',weather,track);return;}
 plan.clock=Math.max(plan.clock,leaderLap(session,track)-plan.origin);
 if(plan.clock+1e-9>=plan.next){
  const choices=['normal','intermediate','wet'].filter(id=>id!==session.conditions),next=conditionProfile(choices[Math.floor(Math.random()*choices.length)]),laps=duration(session);
  weather.rain=next.wetness;weather.wetness=next.wetness;weather.periodLaps=laps;weather.revision++;plan.next+=laps;
  applyWeather(session);
 }
 // Do not round water/grip continuously through other categories within a lap.
 // Every selected preset is held unchanged until its whole-lap period expires.
 weather.lapsRemaining=Math.max(1,Math.ceil(plan.next-plan.clock-1e-9));
}
