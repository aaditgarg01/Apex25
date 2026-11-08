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
  if (this.reconnecting) this.socket.close();
 }

 emit(type, event) {
  this.dispatchEvent(new Event(type));
  this['on' + type]?.(event);
 }

 open(resume) {
  const socket = new WebSocket(this.url);
  this.socket = socket;
  let timeout;
  if (resume) timeout = setTimeout(() => socket.close(), 6500);

  socket.onopen = event => {
   if (resume) socket.send(JSON.stringify({type: 'resume', ...this.credentials}));
   else this.emit('open', event);
  };

  socket.onmessage = event => {
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
    clearTimeout(timeout);
    this.reconnecting = false;
    this.emit('resume', event);
    return;
   }
   if (message.type === 'lobby') this.inRoom = true;
   this.onmessage?.(event);
  };

  socket.onerror = event => { if (!this.reconnecting) this.emit('error', event); };
  socket.onclose = event => {
   clearTimeout(timeout);
   if (this.inRoom && this.credentials?.token && event.code !== 4001) {
    if (!this.reconnecting) {
     this.reconnecting = true;
     this.retryUntil = performance.now() + reconnectMs;
     this.retryDelay = 250;
     this.emit('reconnecting', event);
    }
    if (performance.now() < this.retryUntil) {
     setTimeout(() => {
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
  this.inRoom = false;
  this.reconnecting = false;
  this.emit('close', event);
 }
}
