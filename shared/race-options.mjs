// Shared by solo setup, room setup and the authoritative race engine.
export function orderRaceDrivers(drivers,order=[]){
 const remaining=new Map(drivers.map(driver=>[driver.id,driver])),result=[];
 for(const id of Array.isArray(order)?order:[]){const driver=remaining.get(id);if(driver){result.push(driver);remaining.delete(id);}}
 return [...result,...remaining.values()];
}
export const RACE_COUNTDOWN=5;
const raceCode='mv33';
export function nextRaceCodeIndex(index,key){
 const letter=typeof key==='string'&&key.length===1?key.toLowerCase():'';
 return letter===raceCode[index]?index+1:letter===raceCode[0]?1:0;
}
export function enterRaceCode(session,car,key){
 if(!car||car.ai||car.finished||session?.phase!=='race'||session.elapsed < -RACE_COUNTDOWN||session.elapsed>=0||car.mv33)return false;
 car.raceCodeIndex=nextRaceCodeIndex(car.raceCodeIndex||0,key);
 if(car.raceCodeIndex!==raceCode.length)return false;
 car.mv33=true;car.raceCodeIndex=0;return true;
}
