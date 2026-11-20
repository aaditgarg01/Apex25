// Redis processes publications on one connection in order. A small pipeline
// avoids waiting an entire Redis round trip before sending fresh live input.
// Unsent input/snapshots remain replaceable; reliable actions retain FIFO order.
export class RelayOutbox {
 constructor({publish,onFailure=()=>{},schedule=setTimeout,maxInFlight=2}){
  this.publish=publish;this.onFailure=onFailure;this.schedule=schedule;
  this.maxInFlight=maxInFlight;this.queues=new Map();this.timer=null;
 }
 enqueue(worker,packet,replaceable=false){
  const queue=this.queues.get(worker)||{reliable:[],latest:new Map(),inFlight:0};
  if(replaceable){const key=packet.route+':'+(packet.kind==='snapshot'&&packet.data.startsWith('{"type":"state"')?'state':packet.kind);queue.latest.delete(key);queue.latest.set(key,packet);}
  else if(queue.reliable.length<512)queue.reliable.push(packet);
  else{this.onFailure(worker,[packet]);return;}
  this.queues.set(worker,queue);this.requestFlush();
 }
 requestFlush(){if(this.timer===null)this.timer=this.schedule(()=>{this.timer=null;this.flush();},0);}
 flush(){
  for(const [worker,queue]of this.queues){
   if(queue.inFlight>=this.maxInFlight)continue;
   const batch=queue.reliable.splice(0).concat([...queue.latest.values()]);queue.latest.clear();
   if(!batch.length){if(!queue.inFlight)this.queues.delete(worker);continue;}
   queue.inFlight++;
   Promise.resolve().then(()=>this.publish(worker,batch)).catch(()=>this.onFailure(worker,batch)).finally(()=>{
    queue.inFlight--;
    if(queue.reliable.length||queue.latest.size)this.requestFlush();
    else if(!queue.inFlight&&this.queues.get(worker)===queue)this.queues.delete(worker);
   });
  }
 }
}
