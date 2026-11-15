# Online delivery verification — 2.61.1

Measured 15 November 2026. The live target is the existing APEX 25 Vercel
production project, backed by the existing Singapore Upstash database. Response
headers distinguish Mumbai edge ingress (`bom1`) from Singapore function execution
(`sin1`); the function and database are already in the same region.

## Findings and changes

- The original eight-car stream delivered roughly 221 KB/s of decoded JSON to
  **each** player. Full session objects were sent ten times per second alongside
  60 Hz motion. The revised protocol retains its compatible field structure,
  sends full state at 1 Hz and motion at 20 Hz, and offers a per-player 10 Hz mode.
  Phase and lap-history changes can cause additional complete updates.
- WebSocket per-message deflate uses level 1, no context takeover, a 512-byte
  threshold and at most four concurrent compression jobs. Clients without the
  extension still work; they benefit from the smaller stream but not compression.
- The delivery hint reacts to available browser connection information, >400 ms
  smoothed ping, or >150 ms arrival jitter. It waits five healthy checks before
  returning to normal. Unavailable browser connection information is harmless.
  The hints do not change simulation speed, input timing, tyres or physics.
- Control delivery no longer depends solely on paint. Key/touch transitions and
  a 60 Hz timer call the same bounded, latest-input sender; held inputs remain
  coalesced and socket backpressure prevents an obsolete input queue.
- The previous prediction horizon was measured from a base timestamp already
  moved back by latency. On high latency, it could expire at packet arrival,
  causing stop/start local movement. The 250 ms safety horizon now starts at
  receipt. Reconciliation compares old and new poses at render time while
  preserving the actual receipt timestamp. Positional corrections are bounded.
- Rival interpolation follows a continuously advancing playback clock with
  bounded speed changes. Buffer targets account for the delivered sample rate.
- Profiling attributed the 2.9-second first live step mainly to lazily built
  runoff/collision and AI speed-profile caches, not the tyre strategy itself.
  These caches now prepare before announcing the countdown. The work still takes
  time on a cold track; it has not been removed or claimed as faster. Heavy
  first-time setup can still briefly occupy the shared authority if another room
  is already racing. Workers/room sharding have not been implemented.
- Restored snapshot timers belong to a new function clock and must be reset.
  The restore/rematch checks deliberately supplied timers far in the future and
  verified that state and motion still resume promptly.

## Checks before deployment

Two actual WebSocket clients, Monza, three laps, six AI (eight cars total),
constant live throttle, 15–20 second measurement windows after countdown:

| Run | Updates/s | Simulation/wall-clock ratio | Decoded KB/s/player | Socket KB/s/player |
|---|---:|---:|---:|---:|
| Original Vercel, normal mode | 60 | 1.002–1.003 | 221 | Not separately measured |
| Revised local, normal | 20 | 1.000 | 51.2 | 16.5 |
| Revised local, reduced data | 10.2 | 1.001 | 30.2 | 8.9 |
| Revised local, reduced data + throttling | 10.3 | 0.999 | 30.9 | 9.3 |

The throttling proxy limited each downstream TCP connection to about 128 kbit/s,
added 100 ms upstream delay and 100–180 ms downstream delay, and retained TCP
ordering. Both clients stayed connected, with 257–258 ms median ping and
331 ms median latest-input acknowledgement. No growing update backlog was
observed in that short window. This was an emulation, not an ISP field trial.
Socket byte counters include WebSocket framing but exclude TLS/IP overhead.

A deterministic straight-line presentation check used 360 ms RTT, ordered
125 ms delay bursts, 10/20 Hz snapshots and 30/60 Hz rendering. Before the
change, the 10 Hz cases included seven near-stationary frames each; after it,
all four cases had no near-stationary or backward frames in the measured window.
The simulated car continued accelerating, so speed spread alone is not a pure
jitter metric. This does not verify collisions, every track or complete races.

A separate 30-second local eight-AI, 60-lap configuration profile measured the
cold first live step at 2,901 ms before preparation. After explicitly preparing
the same caches, preparation took 2,882 ms and the maximum live step was 11.7 ms
(mean 0.21 ms, p95 0.30 ms). These CPU timings are machine-specific and are not
Vercel measurements.

The browser check created two drivers, joined the same room with six AI,
started a quick race and verified throttle response and both shared HUDs.
Neither tab had captured console errors/warnings. Syntax, module imports,
both production builds and focused restore/rematch checks passed. The game's
test suite was not run or edited; full-distance driving remains unverified.

## Production follow-up

The final production connection check and deployment URL are reported in the
release response. The measurements above distinguish the pre-change Vercel
baseline from the controlled local checks.
