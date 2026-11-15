import {conditionProfile,normalizeConditions} from './conditions.mjs';
import {WEATHER_HISTORY} from './weather-history-data.mjs';
const category=w=>w<.12?'normal':w<.72?'intermediate':'wet';
export const normalizeWeatherStart=value=>['normal','intermediate','wet'].includes(value)?value:'normal';
export const weatherProfile=track=>WEATHER_HISTORY[track?.id]||{minStableLaps:16,referenceLaps:60,rainChance:.10,heavyChance:.12,clearChance:.10,evidence:'conservative-fallback'};
export const raceWeatherChangeLimit=laps=>laps<15?0:laps<30?1:2;
export function dynamicWeatherSummary(track,laps,mode='race',start='normal'){
 const profile=weatherProfile(track),initial=conditionProfile(normalizeWeatherStart(start)).label;
 const stability=mode==='practice'?`At least ${profile.minStableLaps} whole laps between weather changes.`:laps<15?`Fixed for the whole ${laps}-lap race (under 15 laps).`:`At least ${profile.minStableLaps} whole laps between changes; at most ${raceWeatherChangeLimit(laps)} in the race. Changes are possible, not guaranteed.`;
 return `Starting weather: ${initial}. ${stability}`;
}
// One room-wide leader-lap clock. All scheduling fields are checkpointed with
// the session, so reconnecting or moving Vercel workers cannot reroll a front.
const leaderLap=(session,track)=>{
 if(!Number.isFinite(track?.length)||track.length<=0)return 0;
 return session.cars.reduce((best,car)=>!car.retired&&Number.isFinite(car.progress)?Math.max(best,car.progress/track.length):best,0);
};
function random(weather){let seed=weather.seed>>>0;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;weather.seed=seed>>>0;return weather.seed/4294967296;}
export function applyWeather(session){
 if(!session.weather)return;
 session.conditions=category(session.weather.wetness);
 for(const car of session.cars){car.conditions=session.conditions;car.trackWetness=session.weather.wetness;car.rainIntensity=session.weather.rain;}
}
export function initializeWeather(session,mode='normal',previous,track){
 session.weatherMode=normalizeConditions(mode);
 const dynamic=session.weatherMode==='dynamic',profile=weatherProfile(track),starting=previous?category(previous.wetness):dynamic?normalizeWeatherStart(session.dynamicStart):session.weatherMode,initial=conditionProfile(starting);
 const fixedForRace=dynamic&&session.phase==='race'&&session.laps<15,maxChanges=session.phase==='race'?raceWeatherChangeLimit(session.laps):session.phase==='practice'?100000:1;
 session.weather={dynamic,rain:initial.wetness,wetness:initial.wetness,trend:'Steady',revision:previous?.revision||0,startingCondition:starting,...(dynamic?{planVersion:2,fixedForRace,changes:0,maxChanges,periodLaps:profile.minStableLaps,lapsRemaining:fixedForRace?0:profile.minStableLaps,originLap:leaderLap(session,track),clock:0,stableUntilLap:profile.minStableLaps,nextCheckLap:profile.minStableLaps,seed:(previous?.seed>>>0)||Math.floor(Math.random()*4294967295)+1}:{})};
 applyWeather(session);
}
export function stepWeather(session,_dt,track){
 let weather=session.weather;
 if(!weather?.dynamic||session.phase==='race'&&session.cars.some(car=>car.finished&&!car.retired))return;
 // Respect the new short-race rule even for an older saved room.
 if(session.phase==='race'&&session.laps<15){weather.fixedForRace=true;weather.maxChanges=0;weather.lapsRemaining=0;return;}
 if(weather.planVersion!==2){initializeWeather(session,session.weatherMode||'dynamic',weather,track);weather=session.weather;}
 if(weather.fixedForRace||weather.changes>=weather.maxChanges){weather.lapsRemaining=0;return;}
 const profile=weatherProfile(track);
 weather.clock=Math.max(weather.clock,leaderLap(session,track)-weather.originLap);
 // Chance is per whole leader lap after the minimum stable period, rather
 // than a guaranteed change at every boundary. Heavy rain must pass through
 // the damp state; two changes can describe one rain spell and a return to dry.
 while(weather.nextCheckLap<=weather.clock+1e-9&&weather.changes<weather.maxChanges){
  const lap=weather.nextCheckLap++;
  const chance=session.conditions==='normal'?1-Math.pow(1-profile.rainChance,1/profile.referenceLaps):profile.clearChance;
  if(random(weather)>=chance)continue;
  const next=session.conditions==='normal'?'intermediate':session.conditions==='wet'?'intermediate':random(weather)<profile.heavyChance?'wet':'normal',surface=conditionProfile(next);
  weather.rain=surface.wetness;weather.wetness=surface.wetness;weather.revision++;weather.changes++;weather.trend=next==='normal'?'Clearing':next==='wet'?'Heavy rain':'Damp';
  weather.stableUntilLap=lap+profile.minStableLaps;weather.nextCheckLap=weather.stableUntilLap;applyWeather(session);
 }
 weather.lapsRemaining=weather.changes>=weather.maxChanges?0:Math.max(0,Math.ceil(weather.stableUntilLap-weather.clock-1e-9));
}
