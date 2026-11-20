# Multiplayer processing and relay optimization — 2.65.2

This pass follows controls through the Vercel gateway, Redis relay, authoritative
simulation, snapshot decode and displayed cars. It retains Vercel/Upstash, the
existing wire message formats, server collision authority and car handling.

## Changes and reproduced problems

- Cache each driver's presentation timeline when a snapshot arrives. Previously
  each rendered rival rebuilt its history by searching up to 90 whole-field
  snapshots on every paint. The cache preserves the same 90-frame window,
  duplicate-time replacement, repeated input timestamps and phase resets.
- Align nearby rivals to the local displayed physics timestamp. Gateway ping is
  not input-route acknowledgement latency. In the controlled equal-speed case,
  a real 25 m gap was displayed as 4 m with 500 ms of local prediction and an
  80 ms gateway ping. The corrected clock shows 25 m, without adding collision
  impulses or changing the server's gap. Distant cars keep their buffered timeline.
- Derive extrapolated travel-turn rate from fresh snapshots. Compact motion
  carries current travel direction but not `motionYawRate`; retaining the last
  full-state angular rate could project a turning rival straight ahead. The
  controlled 300 ms corner projection had a 4.483 m error. It now agrees with the
  shared projection using the observed rate. Reset, pit, epoch and contact
  transitions are excluded from turn-rate estimation.
- Permit at most two in-flight publications per destination worker on the same
  ordered Redis connection. This avoids serially waiting for every publication's
  acknowledgement before sending fresh controls. Unsent live input and snapshots
  still replace older values, reliable actions retain FIFO order, and queues are
  bounded. The same-worker fast path is unchanged.
- Congested critical socket messages now trigger a resumable reconnect instead
  of silently dropping a lobby/start/result notification. Obsolete motion still
  drops under backpressure. The 250 kB socket threshold is retained.

## Measured results and limits

| Check | Result |
|---|---|
| CPU benchmark: five alternating warmed runs, 3,600 frames each, eight synthetic cars, 120 Hz presentation and 20 Hz snapshots | Median processing time 131.573 ms → 68.373 ms, **48.0% lower**; zero position difference for cached interpolation cases |
| Nearby-clock reproduction, local lead 80/300/400/500 ms, gateway ping 80 ms | Original gap error up to 21 m; corrected direct and full-frame gap error below 0.001 m |
| Controlled corner extrapolation | Original error 4.483 m; corrected error below 0.001 m |
| Relay model with 120 ms Redis acknowledgement and 60 ms subscriber delivery, 20 Hz input | Serial-policy p95 state age 190 ms; two-publication policy 140 ms. Input states delivered 18 → 34 in the same model; reliable actions stayed ordered and at most one unsent input state was retained |
| Congested socket diagnostic | Motion dropped; critical packet closed with 1012 for resume; healthy message delivered |
| Relay publish failure | Failure callback ran and queue drained; no unbounded retry/backlog |
| 42 actual circuit physics, superseded steering input scenario | Zero phantom-runoff and stale-physics runoff frames |
| Countdown, contact replication, input-delay spikes, two-second outage | Standalone checks passed |
| Previous control handoff, reconnect cancellation, lapped AI strategy | Standalone checks passed |
| Actual local two-client/eight-car WebSocket room, 15 seconds | About 20.05 updates/s; no reconnects |
| Local browser, online race with seven AI opponents | Race launched, keyboard acceleration displayed 127 km/h; no console errors captured |
| Static/build checks | Syntax, undefined-name/shadow, changed-module imports, both build commands and whitespace checks passed |

The CPU result concerns snapshot presentation processing, **not total game CPU,
GPU frame rate or internet ping**. The relay comparison is a deterministic delay
model using the actual outbox with serial versus pipelined policies, **not a
measured internet-latency improvement**. The corner case compares kinematic
projection at the observed angular rate; it does not claim perfect anticipation
of another driver's future steering or braking.

The initial live baseline used two diagnostic clients on one computer against
Vercel: around 20.23 updates/s, p95 acknowledged input 154–156 ms and zero
reconnects. Final production deployment, matching-asset, live room and reconnect
records are saved separately after release. Short before/after internet runs
are not controlled comparisons: routing and load can change.

The game test suite was neither run nor edited. No full-distance, all-weather or
two-device weak-link race was performed. Circuit layouts, physics core, pit
ghosting, penalties, weather rules, player limits and multiplayer provider are
unchanged. Refresh both players before creating a new room.

Reports: `docs/benchmarks/multiplayer-opt-*-2.65.2.json`. Focused scripts:
`scripts/benchmark-tracking.mjs`, `verify-peer-clock.mjs`,
`verify-relay-outbox.mjs` and the existing driving/contact/reconnect diagnostics.
The CPU benchmark's `--before` argument points to the prior tracker with imports
resolved to the same shared modules, so both implementations run the same input.
