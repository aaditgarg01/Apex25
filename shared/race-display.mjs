export const isOnTrack=car=>!!car&&!car.finished&&!car.retired;
export const isRaceFinisher=car=>!!car&&car.finished&&!car.retired;
export function finishTimeLabel(seconds){const ms=Math.max(0,Math.round(seconds*1000)),minutes=Math.floor(ms/60000),remainder=(ms%60000/1000).toFixed(3).padStart(6,'0');return `${minutes}:${remainder}`;}
export function raceGapLabel(car,leader,trackLength,elapsed){
 if(car.retired)return 'DNF';
 if(isRaceFinisher(car)){
  if(!leader||car.id===leader.id||!isRaceFinisher(leader))return finishTimeLabel(car.finishTime);
  return '+'+Math.max(0,car.finishTime-leader.finishTime).toFixed(3);
 }
 // Once the leader stops, estimate arrival at the finish instead of treating
 // the distance to their parked position as a live time gap. Exact gaps replace
 // this clearly marked estimate as each driver finishes.
 if(isRaceFinisher(leader)){
  if(!Number.isFinite(elapsed))return 'RACING';
  const remaining=Math.max(0,leader.progress-car.progress),pace=Math.max(20,Math.abs(car.v));
  return '≈+'+Math.max(0,elapsed+(car.penalty||0)+remaining/pace-leader.finishTime).toFixed(1);
 }
 if(!leader||car.id===leader.id)return 'LEAD';
 const distance=Math.max(0,leader.progress-car.progress),laps=Math.floor(distance/trackLength);
 if(laps>0)return `+${laps}L`;
 return '≈+'+(distance/Math.max(20,Math.abs(car.v))).toFixed(1);
}
