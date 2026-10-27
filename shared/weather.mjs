import {conditionProfile,normalizeConditions} from './conditions.mjs';
const schedules=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const category=w=>w<.12?'normal':w<.72?'intermediate':'wet';
export function applyWeather(session){
 if(!session.weather)return;
 session.conditions=category(session.weather.wetness);
 for(const car of session.cars){car.conditions=session.conditions;car.trackWetness=session.weather.wetness;car.rainIntensity=session.weather.rain;}
}
export function initializeWeather(session,mode='normal',previous){
 session.weatherMode=normalizeConditions(mode);
 const dynamic=mode==='dynamic',w=conditionProfile(dynamic?'normal':mode).wetness;
 session.weather=previous?{...previous,dynamic}:{dynamic,rain:w,wetness:w,trend:'Steady',revision:0};
 // Future fronts stay server-private, so a strategy cannot see an unannounced forecast.
 schedules.set(session,{next:30+Math.random()*40,target:session.weather.rain});applyWeather(session);
}
export function stepWeather(session,dt){
 const weather=session.weather;if(!weather?.dynamic)return;
 let plan=schedules.get(session);if(!plan){plan={next:session.elapsed+35,target:weather.rain};schedules.set(session,plan);}
 if(session.elapsed>=plan.next){
  const choices=plan.target<.15?[.45,1]:plan.target>.75?[0,.45]:[0,1];
  plan.target=choices[Math.floor(Math.random()*choices.length)];plan.next=session.elapsed+45+Math.random()*65;weather.revision++;
 }
 weather.rain=clamp(weather.rain+clamp(plan.target-weather.rain,-dt/22,dt/22),0,1);
 // Rain can stop while the asphalt remains wet. Drying is deliberately slower.
 const target=weather.rain<.05?0:Math.min(1,weather.rain*1.10);
 weather.wetness=clamp(weather.wetness+clamp(target-weather.wetness,-dt/100,dt/34),0,1);
 weather.trend=target>weather.wetness+.025?'Getting wetter':target<weather.wetness-.025?'Drying':'Steady';applyWeather(session);
}
