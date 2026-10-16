export const QUALIFYING_LIMIT=420;

export function finishQualifyingCar(car,elapsed){
 car.finished=true;car.finishTime=elapsed;car.v=0;car.boostActive=false;
 car.sliding=false;car.motionYawRate=0;car.inputLag=0;
}
