# Version 2.2.0 checks — October 9, 2026

- All 17 automated checks passed on the test server (12 physics/session checks, 5 network checks).
- Custom counts 2, 7, 10, 78 and 1000 are accepted; fractional/nonpositive/nonfinite counts are rejected or defaulted. A two-lap race ends after exactly two completed laps.
- Two online clients retain the 78-lap setting from lobby through qualifying to the race.
- Monaco’s start sample is within 12 m of the mapped start/finish location, heads north toward Sainte Dévote, and retains a continuous elevation seam.
- Browser verified typing 78, incrementing to 79, decrementing to 78, and starting a Monaco race whose HUD reads 1 / 78.
- Smaller chevrons and the corrected grid were visually checked; no browser console errors were observed.
- Wheel cylinder orientation is baked into geometry, with tyre and hub parented together and rolling about the car’s local X axle at speed/radius. Wheels stop during solo pause, countdown and after finishing.

# Validation — October 9, 2026 · v2.1.0

- All 15 automated checks passed locally, including two-client multiplayer and an Indian GP qualifying-to-race session.
- Player steering is manual even when a legacy client submits `assist: true`; AI steering remains functional.
- All 41 circuits have closed finite geometry and cached elevation data; AI completed a lap on every circuit.
- Buddh’s mapped full GP loop is approximately 5.141 km before smoothing, within 0.4% of the published 5.125 km. Pit lanes and shortcut connectors are excluded.
- Browser verification: Indian GP selection, 41-destination count, absent steering-assist toggle, visible start buttons at 1280×720, and Indian GP qualifying startup.
- The laptop setup layout was tightened so its start buttons fit without scrolling at 1280×720.
- Buddh terrain comes from coarse SRTM data, which predates circuit construction; its artificial elevation is not accurately captured. Layout is mapped, while elevation, scenery and handling remain approximations.

## Previous v2.0.0 validation

Version 2.0.0 is installed in the local My Drive/APEX 25 folder.

- All 14 automated tests pass against the updated server through its public HTTPS / secure WebSocket tunnel.
- Two clients created and joined a room, drove a car, recovered, transferred host ownership and returned to the lobby.
- Online qualifying advances to the same race grid on both clients. Guest clients cannot advance the session.
- Online free practice starts at the Eau Rouge approach and ends with a practice summary.
- All 40 circuits have finite, closed geometry and elevation profiles. AI completed a lap on each.
- Spa matches all published altitude anchors, has a smooth start/finish seam, and its shaped Raidillon climb peaks between 16% and 18%.
- Steering direction, slope-aware acceleration, car pitch, recovery, valid qualifying order, unlimited practice, partial out laps and invalid-lap handling passed.
- Public assets load and private project files remain inaccessible.
- Browser checks confirmed the 40-track menu, qualifying classification and transition to the race grid. Earlier visual checks showed the Eau Rouge descent/climb, bright racing-line arrows and revised HUD. No console errors were observed during those checks.
- The browser automation connection became unavailable during final public-page visual verification, so a new final screenshot could not be captured. Both local and public health endpoints returned version 2.0.0 after installation.

Physical gamepad operation and touch input on an actual phone were not exercised. Internet tests used two clients on this Mac routed through Cloudflare, not a second human on a remote device. Elevations and scenery are approximations, not laser-scanned reconstructions. Google Drive local placement is verified; cloud synchronization is managed by Google Drive.

## 2.4.0 — 13 October 2026

- 62 automated checks passed locally: physics on all 41 circuits, track surfaces,
  input replay, contacts, venue clearance, and real WebSocket room/session flows.
- Added a two-human/four-AI traffic simulation with changing steering and network
  jitter. Largest authoritative correction: 0.730 m at 100 ms RTT; 2.198 m at
  300 ms RTT (previous code: 0.777 m / 2.352 m). Presentation blends corrections;
  unavoidable network delay and unpredictable opponent inputs remain limitations.
- Delayed packets use simulation timestamps and an adaptive interpolation buffer.
  Only the most recent queued snapshot is reconciled per display frame. Nearby
  opponents follow curved dead reckoning, and drafting shares the server formula.
- All 41 landmark models rendered in a browser, with no model-footprint failures.
  Actual mesh vertices are checked against conservative road-clearance bounds.
- Controlled 15-car Singapore view: drawing calls 181 before, 64 after final
  batching/clearance changes. Median frame interval stayed display-limited at
  16.7 ms; p95 was 18.3 ms before / 17.5 ms after. These are this Mac's measurements,
  not a promised speedup on every device or a real-world internet latency guarantee.
- Static boxes and mapped buildings are batched by spatial cell; distant cars
  omit small wheel details and shadows. Sustained slow frames reduce resolution.
- Sound sliders no longer swallow driving keys during a race. Saved zero volume
  stays zero on reload. Prior user sound, reverse, track and qualifying edits retained.
