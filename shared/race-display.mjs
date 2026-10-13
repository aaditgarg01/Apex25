export const isOnTrack=car=>!!car&&!car.finished&&!car.retired;
export const isRaceFinisher=car=>!!car&&car.finished&&!car.retired;
export function finishTimeLabel(seconds){const ms=Math.max(0,Math.round(seconds*1000)),minutes=Math.floor(ms/60000),remainder=(ms%60000/1000).toFixed(3).padStart(6,'0');return `${minutes}:${remainder}`;}
export function raceGapLabel(car,leader,trackLength){
 if(car.retired)return 'DNF';
 if(isRaceFinisher(car)){
  if(!leader||car.id===leader.id||!isRaceFinisher(leader))return finishTimeLabel(car.finishTime);
  return '+'+Math.max(0,car.finishTime-leader.finishTime).toFixed(3);
 }
 // A moving driver's distance from a stopped finisher is not a time gap.
 if(isRaceFinisher(leader))return 'RACING';
 if(!leader||car.id===leader.id)return 'LEAD';
 const distance=Math.max(0,leader.progress-car.progress),laps=Math.floor(distance/trackLength);
 if(laps>0)return `+${laps}L`;
 return '≈+'+(distance/Math.max(20,Math.abs(car.v))).toFixed(1);
}
