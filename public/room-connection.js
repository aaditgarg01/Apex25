const reconnectMs = 26000;

// Hold the room credentials in memory. A fresh tab joins normally with a code;
// only this driver connection can resume the existing seat.
export class RoomConnection extends EventTarget {
 constructor(url) {
  super();
  this.url = url;
  this.credentials = null;
  this.inRoom = false;
  this.reconnecting = false;
  this.generation = 0;
  this.retryTimer = null;
  this.resumeTimer = null;
  this.finished = false;
  this.open(false);
 }

 get readyState() {
  return this.reconnecting ? WebSocket.CONNECTING : this.socket.readyState;
 }

 get bufferedAmount() {
  return this.socket.bufferedAmount;
 }

 send(data) {
  if (this.readyState === WebSocket.OPEN) this.socket.send(data);
 }

 forgetRoom() {
  this.inRoom = false;
  clearTimeout(this.retryTimer);
  this.retryTimer = null;
  if (this.reconnecting) {
   this.reconnecting = false;
   clearTimeout(this.resumeTimer);
   this.resumeTimer = null;
   this.generation++;
   this.socket.close();
  }
 }

 emit(type, event) {
  this.dispatchEvent(new Event(type));
  this['on' + type]?.(event);
 }

 open(resume) {
  const generation = ++this.generation;
  this.finished = false;
  const socket = new WebSocket(this.url);
  this.socket = socket;
  const current = () => generation === this.generation && socket === this.socket;
  if (resume) this.resumeTimer = setTimeout(() => { if (current()) socket.close(); }, 6500);

  socket.onopen = event => {
   if (!current()) return;
   if (resume) socket.send(JSON.stringify({type: 'resume', ...this.credentials}));
   else this.emit('open', event);
  };

  socket.onmessage = event => {
   if (!current()) return;
   let message;
   try { message = JSON.parse(event.data); } catch { return; }
   if (message.type === 'welcome') {
    if (this.reconnecting) return;
    this.credentials = {id: message.id, token: message.resumeToken};
   }
   if (message.type === 'resume-failed') {
    if (!message.retryable) this.inRoom = false;
    socket.close();
    return;
   }
   if (message.type === 'resumed') {
    clearTimeout(this.resumeTimer);
    this.resumeTimer = null;
    this.reconnecting = false;
    this.emit('resume', event);
    return;
   }
   if (message.type === 'lobby') this.inRoom = true;
   // Pass the parsed packet through; existing one-argument consumers still work.
   this.onmessage?.(event, message);
  };

  socket.onerror = event => { if (current() && !this.reconnecting) this.emit('error', event); };
  socket.onclose = event => {
   if (!current()) return;
   clearTimeout(this.resumeTimer);
   this.resumeTimer = null;
   if (this.inRoom && this.credentials?.token && event.code !== 4001) {
    if (!this.reconnecting) {
     this.reconnecting = true;
     this.retryUntil = performance.now() + reconnectMs;
     this.retryDelay = 250;
     this.emit('reconnecting', event);
    }
    if (performance.now() < this.retryUntil) {
     this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (!current()) return;
      if (this.inRoom) this.open(true);
      else this.finish(event);
     }, this.retryDelay);
     this.retryDelay = Math.min(this.retryDelay * 2, 1600);
     return;
    }
   }
   this.finish(event);
  };
 }

 finish(event) {
  if (this.finished) return;
  this.finished = true;
  clearTimeout(this.retryTimer);
  clearTimeout(this.resumeTimer);
  this.retryTimer = null;
  this.resumeTimer = null;
  this.generation++;
  this.inRoom = false;
  this.reconnecting = false;
  this.emit('close', event);
 }
}
