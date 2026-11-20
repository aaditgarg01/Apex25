# Multiplayer client processing — 2.65.4

This pass follows a received WebSocket message through the room connection, application decoder and displayed rival poses. It reduces client CPU work while retaining the existing message format, server authority, input timing, reconciliation and interpolation behavior. Server physics, collisions, provider, snapshot rates and compression settings are unchanged.

## Changes and measurements

| Change | Evidence | Scope |
|---|---|---|
| Parse once | `RoomConnection` already parsed each message for connection lifecycle handling; the application then parsed the same text again. The connection now passes the parsed object as an optional second callback argument, and the game reuses it. The focused check counts exactly one parse. | One-argument consumers and native/older connection paths keep their fallback. |
| Index compact rows directly | Replace intermediate filter/map arrays with direct validated-row indexes. Eighty actual eight-car Monza motion packets and six optional/malformed-field fixtures decode identically to 2.65.3, without mutating previous states. | Input acknowledgments, contacts, tyre/pit service, penalties and finish fields retain their decoded values. |
| Binary lookup for ordered histories | Find the same bracketing rival samples without scanning up to 90 samples from the oldest entry on every display frame. Non-monotonic or non-finite input clocks retain the old arrival-order search; phase changes and duplicate-frame rebuilds clear ordering metadata. | Same chosen samples, interpolation curves, extrapolation bounds and contact rules. |
| Pose assembly | Assign the existing pose fields without building key/value pair arrays. | Same displayed fields and fallback values. |

Five alternating warmed receive-path runs each dispatched 6,000 captured motion packets through the actual room connection and decoder: median **144.670 → 94.856 ms**, about **34.4% less processing time**. Five presentation runs each processed 3,600 frames at synthetic 120 Hz with eight cars and 20 Hz snapshots: median **69.547 → 67.393 ms**, about **3.1% less processing time**, with zero pose difference.

These are CPU microbenchmarks of the named paths on this computer, not total game CPU, GPU FPS, internet ping or a measured reduction in visible jitter. They must not be combined with earlier release percentages. No garbage-collection pause reduction was measured.

## Verification

- Complete displayed frame outputs match 2.65.3 at 2,440 target times across eight timeline fixtures: ordered, held controls, clock resets, duplicate snapshots, phase reset, epoch/pit/finish fields, trimmed history and a non-finite clock. Targets include before, at, between and beyond sample boundaries.
- The peer-clock diagnostic retains the expected 25 m gap for local prediction leads of 80–500 ms and gateway RTT of 80 ms; observed-turn-rate extrapolation remains consistent.
- Six actual circuit reconciliation scenarios retain zero phantom display runoff and zero stale-physics runoff frames. This round did not rerun all 42 circuits.
- Existing standalone collision checks pass for rear, head-on and side contacts, two presentation viewpoints, compact round-trips, snapshot immutability and delayed delivery at 90/180 ms. Existing pit ghost behavior is retained.
- Countdown prediction passes; the existing impaired-packet diagnostic completed at 10/20 Hz updates and 30/60/120 Hz presentation with finite poses. The latter records behavior and is not proof that every movement is smooth.
- Actual local room check: two diagnostic clients, eight cars, about 20.04–20.05 updates/s, compression negotiated and no reconnects.
- Reconnect lifecycle checks pass, including cancellation, old socket event suppression and successful resume.
- Syntax, undefined-name/shadow checks, changed shared/client module imports, `npm run build`, `npm run build:vercel` and whitespace checks pass.
- The game's `test/` suite was neither run nor edited. No full-distance race, physical two-device weak-link trial or GPU/browser visual verification was performed this round.

The direct local Node server does not supply gateway resume credentials. An attempted local reconnect check timed out; the diagnostic now rejects that unsupported endpoint immediately with an explanatory error. Actual interrupted-connection verification targets the Vercel gateway after deployment. Production room/reconnect checks are recorded separately as they complete. Pre-release reports do not assert deployment success. Reports are in `docs/benchmarks/multiplayer-client-*-2.65.4.json`.

## Reproduction

Extract 2.65.3's `shared/netcode.mjs`, `shared/multiplayer-tracking.mjs` and `public/room-connection.js` into temporary modules, resolving relative shared imports to the checkout. Run the focused diagnostics outside the game suite:

```sh
node scripts/benchmark-multiplayer-receive.mjs --before=/absolute/path/to/netcode-before.mjs --connectionBefore=/absolute/path/to/room-connection-before.mjs
node scripts/benchmark-tracking.mjs --before=/absolute/path/to/multiplayer-tracking-before.mjs
node scripts/verify-timeline-lookup.mjs --before=/absolute/path/to/multiplayer-tracking-before.mjs
node scripts/compare-multiplayer.mjs --seconds=15 --requireInputTiming=true --out=/absolute/path/to/live.json
node scripts/verify-live-reconnect.mjs --out=/absolute/path/to/reconnect.json
```

The live diagnostics use the same optional parsed-message callback as the game and create disposable rooms. Both diagnostic clients run on one computer; this does not reproduce independent players on two weak networks. Refresh both players before creating a new room.
