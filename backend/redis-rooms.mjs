import { createHash, randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { serialize, deserialize } from 'node:v8';
import Redis from 'ioredis';
import { WebSocket } from 'ws';
import { createRaceEngine } from './race-engine.mjs';

const leaseMs = 8000;
const refreshMs = 2000;
const freshId = () => randomBytes(16).toString('hex');
const hash = token => createHash('sha256').update(token).digest('hex');
const isHex = (value, length) => typeof value === 'string' && value.length === length && /^[0-9a-f]+$/.test(value);
const preview = process.env.VERCEL_ENV === 'preview' ? process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL : '';
const prefix = 'apex25:rooms:v1:' + (preview || 'production');
const leaseKey = prefix + ':lease';
const stateKey = prefix + ':state';
const channel = worker => prefix + ':worker:' + worker;

const elect = `
 local leader = redis.call('GET', KEYS[1])
 if leader then return {leader} end
 redis.call('PSETEX', KEYS[1], ARGV[2], ARGV[1])
 return {ARGV[1], redis.call('GET', KEYS[2]) or ''}
`;

const save = `
 if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
 if ARGV[3] == '' then
   redis.call('DEL', KEYS[2])
 else
   redis.call('SET', KEYS[2], ARGV[3], 'EX', 90)
 end
 if ARGV[4] == 'release' then redis.call('DEL', KEYS[1])
 else redis.call('PEXPIRE', KEYS[1], ARGV[2]) end
 return 1
`;

function redisEndpoint() {
 if (process.env.REDIS_URL) return process.env.REDIS_URL;
 const endpoint = new URL(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL);
 const url = new URL('rediss://' + endpoint.hostname + ':6379');
 url.username = 'default';
 url.password = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
 return url.href;
}

export function createRoomGateway() {
 const instanceId = randomBytes(12).toString('hex');
 const redis = new Redis(redisEndpoint(), {
  lazyConnect: true,
  connectTimeout: 3500,
  commandTimeout: 2800,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 0,
 });
 const subscriber = redis.duplicate({ enableOfflineQueue: true });
 const sockets = new Map();
 const routes = new Map();
 const outbound = new Map();
 let leader = null;
 let owner = null;
 let engine = null;
 let deadline = 0;
 let lastRefresh = 0;
 let lastErrorAt = 0;
 let connecting = null;
 let refreshing = null;
 let flushTimer = null;
 let checkpointTimer = null;

 const send = (ws, data) => {
  if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 250000) ws.send(data);
 };

 function dispatch(worker, packet, replaceable = false) {
  if (worker === instanceId) {
   receive(packet);
   return;
  }
  const queue = outbound.get(worker) || { reliable: [], latest: new Map(), sending: false };
  if (replaceable) {
   const key = packet.route + ':' + (packet.kind === 'snapshot' && packet.data.startsWith('{"type":"state"') ? 'state' : packet.kind);
   queue.latest.delete(key);
   queue.latest.set(key, packet);
  }
  else if (queue.reliable.length < 512) queue.reliable.push(packet);
  outbound.set(worker, queue);
  flushTimer ??= setTimeout(flush, 0);
 }

 function flush() {
  flushTimer = null;
  for (const [worker, queue] of outbound) {
   if (queue.sending) continue;
   const batch = queue.reliable.splice(0).concat([...queue.latest.values()]);
   queue.latest.clear();
   if (!batch.length) {
    outbound.delete(worker);
    continue;
   }
   queue.sending = true;
   redis.publish(channel(worker), JSON.stringify(batch))
    .catch(() => {
     // Lost control messages must surface as a reconnect rather than silently
     // leaving a client in a room it can no longer control.
     if (batch.some(packet => packet.kind !== 'snapshot' && packet.kind !== 'input')) {
      for (const entry of sockets.values()) {
       if (entry.leader?.split('.')[0] === worker) entry.ws.close(1012, 'Room connection interrupted');
      }
     }
    })
    .finally(() => {
     queue.sending = false;
     if (queue.reliable.length || queue.latest.size) flushTimer ??= setTimeout(flush, 0);
     else outbound.delete(worker);
    });
  }
 }

 function receive(packet) {
  if (['reply', 'snapshot', 'close-socket'].includes(packet.kind)) {
   const entry = sockets.get(packet.route);
   if (!entry || packet.leader !== entry.leader) return;
   if (packet.kind === 'close-socket') entry.ws.close(packet.code, packet.reason);
   else if (packet.kind === 'reply' || entry.ws.bufferedAmount === 0) send(entry.ws, packet.data);
   return;
  }
  if (packet.leader !== owner || !engine || Date.now() >= deadline) return;
  if (packet.kind === 'presence') {
   for (const route of packet.routes) {
    const peer = routes.get(route);
    if (peer) engine.touch(peer.id);
   }
   return;
  }
  if (packet.kind === 'attach') {
   const peer = new EventEmitter();
   peer.id = packet.id;
   peer.readyState = WebSocket.OPEN;
   peer.bufferedAmount = 0;
   peer.send = data => {
    const snapshot = data.startsWith('{"type":"motion"') || data.startsWith('{"type":"state"');
    dispatch(packet.worker, {
     kind: snapshot ? 'snapshot' : 'reply', route: packet.route, leader: packet.leader, data,
    }, snapshot);
   };
   peer.close = (code, reason) => {
    peer.readyState = WebSocket.CLOSED;
    routes.delete(packet.route);
    dispatch(packet.worker, { kind: 'close-socket', route: packet.route, leader: packet.leader, code, reason });
    peer.emit('close');
   };
   if (engine.attachPeer(peer, packet)) routes.set(packet.route, peer);
   return;
  }
  const peer = routes.get(packet.route);
  if (!peer) return;
  if (packet.kind === 'message' || packet.kind === 'input') peer.emit('message', packet.data);
  if (packet.kind === 'detach') {
   routes.delete(packet.route);
   peer.readyState = WebSocket.CLOSED;
   peer.emit('close');
  }
 }

 subscriber.on('message', (_channel, payload) => {
  try { for (const packet of JSON.parse(payload)) receive(packet); } catch {}
 });
 for (const connection of [redis, subscriber]) connection.on('error', () => {});

 function startRedis() {
  if (!connecting) {
   connecting = Promise.all([redis, subscriber].map(connection => connection.status === 'wait' || connection.status === 'end' ? connection.connect() : null))
    .then(() => subscriber.subscribe(channel(instanceId)))
    .catch(error => { connecting = null; throw error; });
  }
  return connecting;
 }

 function setLeader(next) {
  if (leader === next) return;
  leader = next;
  for (const entry of sockets.values()) {
   if (entry.leader && entry.leader !== leader) entry.ws.close(1012, 'Room server changed');
  }
 }

 function stopAuthority() {
  engine?.close();
  engine = null;
  owner = null;
  deadline = 0;
  routes.clear();
 }

 function refresh() {
  if (refreshing) return refreshing;
  refreshing = updateAuthority().then(() => { lastRefresh = Date.now(); }).finally(() => { refreshing = null; });
  return refreshing;
 }

 async function updateAuthority() {
  const started = Date.now();
  if (owner && started < deadline) {
   const rooms = engine.checkpoint();
   const encoded = rooms.length ? serialize(rooms).toString('base64') : '';
   const release = sockets.size === 0;
   const saved = await redis.eval(save, 2, leaseKey, stateKey, owner, leaseMs, encoded, release ? 'release' : '');
   if (saved && !release) {
    deadline = started + leaseMs;
    return;
   }
   stopAuthority();
   setLeader(null);
   if (release) return;
  }
  if (owner) stopAuthority();
  if (!sockets.size) return;
  const candidate = instanceId + '.' + freshId();
  const [current, saved] = await redis.eval(elect, 2, leaseKey, stateKey, candidate, leaseMs);
  if (current === candidate) {
   owner = candidate;
   deadline = started + leaseMs;
   engine = createRaceEngine({
    canStep: () => Date.now() < deadline,
    changed() {
     checkpointTimer ??= setTimeout(() => {
      checkpointTimer = null;
      refresh().catch(() => {});
     }, 100);
    },
   });
   if (saved) engine.restore(deserialize(Buffer.from(saved, 'base64')));
  }
  setLeader(current);
 }

 const maintain = setInterval(() => {
  if (!connecting || (!owner && ![...sockets.values()].some(entry => entry.leader))) return;
  refresh().then(() => {
   if (!leader) return;
   const active = [...sockets.values()].filter(entry => entry.leader === leader && entry.ws.readyState === WebSocket.OPEN);
   if (active.length) dispatch(leader.split('.')[0], {kind: 'presence', leader, routes: active.map(entry => entry.route)});
  }).catch(() => {
   if (owner && Date.now() >= deadline) stopAuthority();
   if (Date.now() - lastRefresh >= leaseMs) setLeader(null);
  });
 }, refreshMs);
 maintain.unref();

 function accept(ws) {
  if (sockets.size >= 80) {
   ws.close(1013, 'Server full');
   return;
  }
  const route = freshId();
  const token = randomBytes(24).toString('hex');
  const entry = { ws, route, id: freshId(), key: hash(token), leader: null, busy: false };
  sockets.set(route, entry);
  send(ws, JSON.stringify({ type: 'welcome', id: entry.id, resumeToken: token }));
  let requests = 0;
  let windowStart = Date.now();
  let alive = true;
  ws.on('pong', () => { alive = true; });
  const heartbeat = setInterval(() => {
   if (!alive) ws.terminate();
   else { alive = false; ws.ping(); }
  }, 15000);
  heartbeat.unref();
  ws.on('error', () => {});
  ws.on('close', () => {
   clearInterval(heartbeat);
   sockets.delete(route);
   if (!entry.leader) return;
   dispatch(entry.leader.split('.')[0], {kind: 'detach', leader: entry.leader, route});
   if (entry.leader === owner && !sockets.size) refresh().catch(() => {});
  });
  ws.on('message', async raw => {
   if (Date.now() - windowStart > 1000) { windowStart = Date.now(); requests = 0; }
   if (++requests > 100 || entry.busy) return;
   let message;
   try { message = JSON.parse(raw); } catch { return; }
   if (!message || typeof message !== 'object') return;
   if (message.type === 'ping') {
    send(ws, JSON.stringify({type: 'pong', time: message.time}));
    return;
   }
   try {
    if (!entry.leader) {
     const resume = message.type === 'resume';
     if (!resume && !['create', 'join'].includes(message.type)) return;
     if (resume && (!isHex(message.id, 32) || !isHex(message.token, 48))) {
      send(ws, JSON.stringify({type: 'resume-failed', message: 'Invalid room credentials.'}));
      return;
     }
     entry.busy = true;
     await startRedis();
     await refresh();
     if (ws.readyState !== WebSocket.OPEN) return;
     if (!leader) throw Error('Room server unavailable');
     entry.leader = leader;
     entry.liveInput = resume || message.inputVersion === 3;
     const id = resume ? message.id : entry.id;
     dispatch(leader.split('.')[0], {
      kind: 'attach', leader, route, id, key: resume ? hash(message.token) : entry.key,
      resume, worker: instanceId,
     });
     if (resume) return;
    }
    if (message.type === 'resume') return;
    // V3 live controls replace earlier controls. Preserve legacy command batches.
    const input = message.type === 'input' || message.type === 'commands' && entry.liveInput;
    dispatch(entry.leader.split('.')[0], {
     kind: input ? 'input' : 'message', leader: entry.leader, route, data: raw.toString(),
    }, input);
   } catch (error) {
    if (Date.now() - lastErrorAt > 10000) {
     lastErrorAt = Date.now();
     const message = String(error?.message);
     const reason = message.startsWith('WRONGPASS') ? 'authentication rejected'
      : message.startsWith('NOAUTH') ? 'authentication required'
      : /timed? ?out|ETIMEDOUT/i.test(message) ? 'connection or command timed out'
      : 'connection or command failed';
     console.warn('APEX 25 room store: ' + reason);
    }
    send(ws, JSON.stringify({
     type: message.type === 'resume' ? 'resume-failed' : 'error',
     retryable: true,
     message: 'The room server is temporarily unavailable.',
    }));
   } finally {
    entry.busy = false;
   }
  });
 }
 return { accept };
}
