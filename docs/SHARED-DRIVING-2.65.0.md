# Shared multiplayer driving reconciliation — 2.65.0

The report that keyboard cars leave the road on every circuit required a shared
fix beyond the earlier Monza spawn alignment. A controlled reproduction used
actual circuit physics and a 250 ms locally predicted steering tap which was
superseded before reaching the server. The authoritative driver stayed on the
road. The old predictor retained a different heading, showed phantom runoff,
then snapped back when its correction threshold was reached. This is a verified
failure mode; it does not prove the same packet sequence occurred on the user's
computer.

## Changed behavior

- Rebuild the complete local physics state from every accepted authoritative
  snapshot, including heading, travel direction, slip, speed and collision state.
  Replay known recent controls using acknowledged input timing. Keep existing
  bounded fallback timing when acknowledgements are unavailable.
- Never add reconciliation forces to physical steering or velocity. Maintain a
  separate, damped presentation offset with bounded correction velocity. Apply
  real contact, reset, pit-state and lights-out transitions immediately.
- Bound presentation error to 1.5 m laterally, 80 m longitudinally, 0.4 m
  vertically and 0.08 radians of heading. Large longitudinal errors converge
  with a bounded catch-up speed of up to 15 m/s and acceleration of 12 m/s²;
  small errors retain the 3 m/s correction cap. When the canonical physical car is
  safely on the ribbon, trim display error that would place it outside. This
  only constrains display error; actual off-track driving remains possible.
- Keep the 500 ms prediction cap during interrupted updates. Reanchor on fresh
  snapshots instead of simulating a backlog as live driving.
- Use predicted road station for the local displayed pose. Race timing,
  classification and penalties still come from authority.
- Keyboard/touch driving takes priority over the connected controller. An idle
  stick cannot activate controller input; a controller button activates it.
- Add a local 10 Hz driving trace, bounded to 450 samples. **Esc → Save driving
  report** exports controls, poses and reconciliation timing. Driver names,
  driver IDs, room codes and credentials are excluded. Nothing is uploaded.

Shared physics rules, car models, track centrelines, elevation/banking, pit
ghosting, collision solver and multiplayer provider are unchanged. This is not
an automatic steering assist and does not keep a manually misdirected physical
car on the road.

## Measured checks

These standalone diagnostics do not invoke or modify the game's test suite.

| Check | Observed result |
|---|---|
| Superseded-tap reproduction, original 2.64.2, six real circuits | 375 phantom-runoff frames; largest frame movement 27.538 m; largest post-tap error 26.941 m |
| Same eight-second scenario after correction, all 42 circuits | Zero phantom-runoff frames; zero stale-physics runoff frames; largest frame movement 1.155 m; largest post-tap error 1.243 m |
| Input-route delay jumps to 650/1000 ms with a fast snapshot/ping route | Old 12 m longitudinal clamp caused 18.058/17.235 m frame jumps; corrected smoothing gives 1.569/1.368 m |
| Five-second countdown with throttle and boost held | Maximum frame movement 0.524 m; maximum immediate-server reference error 0.589 m |
| Neutral steering with 180/300 ms uplink, jitter and misleading gateway ping | Unrotated synthetic straight: zero lateral error; rotated straight: less than 0.05 m and heading within packet rounding |
| Two-second snapshot interruption during acceleration/braking/boost | Prediction stopped at its cap; zero additional frozen movement; canonical position and heading matched after recovery |
| Rear, head-on and side contacts, compact packets and two presentation views | Matching paired contact markers; zero pose difference at identical receipt clocks; delayed 90/180 ms cases finite; source snapshots unchanged |
| Keyboard/controller source checks | Keyboard acceleration excludes idle stick drift; intentional controller activation and keyboard takeover pass |
| Local actual WebSocket room, two diagnostic clients and six AI cars, 15 seconds | Approximately 19.90 updates/s, no reconnects; integration only |
| Local actual WebSocket straight, two clients, zero steering, throttle/boost/braking | Both server cars stayed on road and both shown bodies inside ribbon; about 20 updates/s, no reconnects |
| Local browser | Online practice launched; keyboard acceleration and Esc report control observed; captured console contained no errors |
| Report serialization outside browser | 450 bounded samples exported, controls/poses retained, private identifiers excluded |
| Static and build checks | Syntax, no-undefined/no-shadow with browser globals, module imports, `npm run build`, `npm run build:vercel` |

The browser automation stalled while awaiting the download event, so successful
completion of the browser's download is **not verified**. The report generation
itself was checked independently. The two local WebSocket clients share one
machine and cannot measure the user's connection. The live traffic jerk metric
includes contacts and scripted driving; it was not used to claim smoother
internet play. The separate synthetic presentation sweep includes delays,
drops, braking/boost and 30/60/120 Hz rendering; its jerk values are not uniformly
better than the old predictor, so this release makes no zero-jitter claim.

No full-distance race, all-circuit rendered lap, all-weather matrix or two-device
weak-connection race was performed. Refresh both players' tabs and create a new
room to ensure both load the updated predictor. If unwanted drift persists, the
local driving report can distinguish actual controls/physics from presentation
correction without exposing room credentials.

Reports are in `docs/benchmarks/shared-driving-*-2.65.0.json`. Post-deployment
production checks are recorded separately after the release is ready.


## Follow-up from production verification

The first production straight check kept both cars on the ribbon with zero
heading change, but caught a forward snap of about 25–26 m. Input acknowledgement
latency rose independently of the gateway ping; clipping the longitudinal
presentation offset at 12 m caused that snap. A focused live-input delay
reproduction confirmed the cause. The longitudinal presentation budget now
absorbs that timing change, while damped catch-up and the unchanged tight lateral
bound preserve the correct course. This changes no physical steering.

Two diagnostic clients against the live Vercel server, running the corrected
client code, passed with about 20.17 snapshots/s, zero reconnects, no off-track
server cars, no heading change, and maximum frame movement 1.340/1.370 m. Both
clients ran on this computer. This is an integration check, not the user's exact
internet connection. Final deployment/asset records remain outside Git.
