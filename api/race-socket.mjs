import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { createRoomGateway } from '../backend/redis-rooms.mjs';
import { hasRoomStorage } from '../backend/room-storage.mjs';

const server = createServer((_req, res) => {
 res.writeHead(hasRoomStorage() ? 426 : 503, {'Cache-Control': 'no-store'});
 res.end('APEX 25 multiplayer WebSocket endpoint');
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });
let gateway;
server.on('upgrade', (req, socket, head) => {
 const origin = req.headers.origin;
 let allowed = !origin;
 try { allowed ||= new URL(origin).host === req.headers.host; } catch {}
 if (!allowed || !hasRoomStorage()) {
  socket.end(allowed ? 'HTTP/1.1 503 Service Unavailable\r\n\r\n' : 'HTTP/1.1 403 Forbidden\r\n\r\n');
  return;
 }
 try {
  gateway ??= createRoomGateway();
  wss.handleUpgrade(req, socket, head, ws => gateway.accept(ws));
 } catch {
  socket.end('HTTP/1.1 503 Service Unavailable\r\n\r\n');
 }
});

export default server;
