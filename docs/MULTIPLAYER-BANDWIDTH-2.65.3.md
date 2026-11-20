# Multiplayer bandwidth and serialization — 2.65.3

The flow remains controls → room WebSocket → authoritative simulation → compressed snapshots → client prediction/presentation. This change reduces work and bytes on that path without changing physics, controls, prediction, the hosting provider or the message format.

## Changes and measured results

| Change | Evidence | Limits |
|---|---|---|
| Single-pass motion encoder | Byte-identical JSON versus 2.65.2 on 80 actual eight-car Monza snapshots plus explicit input timing, contact, pit merge/service/penalty, finish and unusual-number fixtures. Median 4,000 encodes: 46.79 → 43.63 ms (about 6.8% less codec time). | Codec-only microbenchmark on this computer; not total server CPU, FPS or latency. |
| Lazy packet serialization | Two simulated seconds: all-modern 10 Hz room builds 40 → 21 packets; legacy-only room 220 → 120; fully blocked modern room 40 → 0. Normal 20 Hz and mixed rooms remain 40. | Controlled actual-engine execution in countdown, counted position reads measure serialization. Not network latency. |
| WebSocket deflate level 1 → 6 | Same 84 packets: compressed message bodies 81,108 → 77,047 bytes, about 5% smaller. Median compression cost 30.95 → 36.50 µs per packet. | Context-free deflate body estimate excludes WebSocket/TLS/TCP framing; small CPU tradeoff. |
| Diagnostic receive counter | Actual local eight-car run negotiates compression, receives about 20 updates/s without reconnects; compressed WebSocket receive bytes recorded separately from decoded JSON. | Headless clients on one computer; no GPU/browser visual or independent weak-link trial. |

Packet delivery types and timestamps match the previous scheduling policy exactly for modern 20 Hz, modern 10 Hz, mixed 10/20 Hz, legacy and blocked clients. History and phase keyframes remain immediate when a connection is writable. Building fewer unused packets does not lower a player's update rate. Fresh compression contexts, threshold 512 bytes and concurrency cap four remain unchanged.

The baseline live Vercel run recorded 17.87 KiB/s of received WebSocket data per diagnostic connection, about 20.31 updates/s, with compression negotiated and no reconnects. This is an uncontrolled internet sample, not a causal before/after performance result. Node socket counters include WebSocket frames/control after TLS decryption and exclude TLS/TCP overhead. A reconnect starts a new measurement segment. Decoded JSON bytes are larger and must not be described as compressed traffic.

## Verification

- Both `npm run build` and `npm run build:vercel` passed at 2.65.3.
- Syntax, changed-module imports and ESLint undefined-name/shadow checks passed.
- Existing standalone authority check passed on six circuits with no stale or phantom steering; this round did not rerun all 42 circuits.
- Existing standalone delayed contact, countdown, peer presentation and relay checks passed. Countdown maximum movement was 0.524 m and reference error 0.589 m.
- Real local WebSocket integration passed with two diagnostic clients and eight cars.
- The `test/` suite was neither run nor edited. No full race, GPU render or physical two-device weak-connection trial was performed this round.

The JSON reports are in `docs/benchmarks/multiplayer-bandwidth-*-2.65.3.json`. Production deployment and post-release live checks are reported separately after rollout; these pre-release artifacts do not assert deployment success.

## Reproduction

Run the standalone scripts from the repository root. For a comparison, extract the previous release's `shared/netcode.mjs` and `backend/race-engine.mjs` into temporary modules and resolve their relative imports to this repository. For the engine fixture also resolve its package/root imports to this checkout. Then run:

```sh
node scripts/benchmark-motion-codec.mjs --before=/absolute/path/to/previous-netcode.mjs
node scripts/verify-snapshot-cadence.mjs --before=/absolute/path/to/previous-race-engine.mjs
node scripts/compare-multiplayer.mjs --seconds=15 --out=/absolute/path/to/live.json
node scripts/verify-live-reconnect.mjs --out=/absolute/path/to/reconnect.json
```

The first two comparison scripts exercise real session/engine code with controlled clocks or captured snapshots. The latter two create disposable diagnostic rooms on the configured server. They are outside the game's test suite.
