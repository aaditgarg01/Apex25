# Acceleration/braking presentation correction — 2.61.2

Checked 15 November 2026. This changes local multiplayer prediction and the
chase camera; authoritative driving physics and the network protocol are unchanged.

## Reproduced causes

A snapshot was placed at `receivedAt - smoothedRTT`. When the same server
trajectory arrived 120 ms later because of jitter, that anchor also moved
120 ms later. The predictor therefore replayed too little elapsed movement.
At 100 m/s that can create roughly 12 metres of error, regardless of how
smoothly the server car was driving. Position-only smoothing limited the jump
but changed correction speed each time, producing a sequence of speed pulses.
Corrections could also be decayed again by a whole frame immediately after
being established at that same render timestamp.

The anchor is now the snapshot's simulation timestamp plus the estimated
shared clock offset minus the prediction lead. Packet jitter changes how much
history is replayed, rather than shifting where the snapshot belongs. A
critically damped correction carries both position and velocity across updates,
and advances by the time actually elapsed since its last integration. The
rendered speed includes the longitudinal correction velocity, keeping wheel,
speed display and camera cues consistent with the presented motion.

Ordinary high-speed drift allows a bounded speed-aware correction distance
before a hard resync. Strong new impact impulses, pit-stage changes, explicit
recovery and session/epoch changes clear that visual correction. Old snapshots
cannot request more than 500 ms of prediction replay. The existing 250 ms
post-receipt safety horizon still stops indefinite prediction on a stalled link.

The chase camera separately eases the speed input used for distance, height,
look-ahead and lens changes. This does not filter steering/throttle controls or
change the physical car speed.

## Controlled comparisons

A temporary diagnostic outside the repository's test suite generated ordinary
shared-physics Monza snapshots and compared 2.61.1 with the new presenter.
It used a 160 ms RTT estimate, 80 ms base one-way delay, up to 24 ms ordinary
arrival variation, ordered 120 ms delay bursts, 10/20 Hz delivery, and 30/60 Hz
rendering. Scenarios were accelerating from 20 m/s with a boost transition,
a short high-speed run beginning at 103 m/s, and braking/re-accelerating from
75 m/s. These are prescribed diagnostic conditions, not an ISP capture.

| Scenario | Delivery/render combinations | Reduction in p95 visual jerk |
|---|---|---:|
| Acceleration and boost | 10/20 Hz × 30/60 fps | 99.5–99.9% |
| High speed | 10/20 Hz × 30/60 fps | 99.8–over 99.9% |
| Brake then throttle | 10/20 Hz × 30/60 fps | 93.8–99.0% |

The metric is the finite difference of rendered longitudinal acceleration over
time, derived from rendered positions. It includes genuine commanded braking,
so it is a comparative presentation measure rather than pure network noise or
real-car telemetry. All twelve short measured windows had no backward frames
and no per-frame position change greater than eight metres. The high-speed
window ended earlier to avoid driving straight into the first corner.

Focused assertions checked that receiving and rendering at the same timestamp
cannot integrate the correction twice; new collision impulses and pit service
clear old correction; recovery resets position and velocity correction; and a
very old snapshot stays within the replay budget. Syntax/import checks and both
builds passed. The local online browser check exercised boost to a displayed
220 km/h and brake/throttle changes, with no captured console errors/warnings.
It was a brief controls check, not a complete driven lap or a quantitative
browser frame-time measurement. The game's test suite was not run or edited.

Production deployment and served asset/version checks are reported separately
in the release response. No full-distance multiplayer race or all-track driving
validation was performed in this pass.
