# Photon prototype and APEX comparison

The live game retains its current Vercel/Upstash-backed multiplayer. The
separate `/network-lab.html` page is an opt-in development experiment, not a
migration or an assurance that Photon performs better.

## What is implemented

- An actual Photon Realtime 6.0.2 app on the free **20 CCU development** tier.
  The App ID shipped in the lab is a public client identifier, not a password.
  No paid plan was activated. This app is for development, not a production
  multiplayer launch. No service credentials or account tokens are in the repo.
- The official JavaScript/WASM SDK, pinned in the lockfile. Build copies it
  alongside its license and third-party notices. Only the Photon lab worker
  imports it. APEX's normal app, connection routing and race engine are unchanged.
- Monza, three dry laps, eight cars total. Both providers use the existing
  shared car/session physics, tyre handling, collisions and `NetworkMotion`.
  This is not a recreation of Smash Karts' proprietary movement algorithm.
- The current provider uses the existing server and `RoomConnection`. Photon
  uses private, unlisted, separately versioned rooms with authenticated Photon
  actor identities. A guest's controls can affect only that guest's driver;
  state is accepted only from the original test host.
- Photon browser networking and host physics run in **separate workers**.
  Loading geometry and simulation must not block Photon's service pump. Initial
  integration exposed this startup timeout; the separation and preloading were
  checked in later runs. It does not guarantee connectivity through device sleep.
- The browser creator simulates the Photon race. Local host results explicitly
  have a shortcut and are excluded from guest comparisons. Leaving the original
  host ends the prototype; host migration, ranked fairness, production account
  authentication and general game-mode parity are not implemented.
- Reliable full state and replaceable motion share an ordered Photon channel;
  controls use another channel. The browser uses WSS/TCP, so choosing an
  'unreliable' event does not turn the connection into UDP or avoid TCP stalls.
- Targeted 20 Hz snapshots and 1 Hz full state, plus phase/history refreshes.
  The experiment fixes delivery at 20 Hz for comparison; it does not reproduce
  the normal game's automatic 10 Hz congestion fallback.
- Keyboard controls, optional guided driving, input delay, update gaps, decoded
  data and frame timing. Reports can be saved on the device, compared in a table
  and exported as JSON. Reports exclude the App ID, room credentials and names.

## Timed runs

The raw files contain their collection timestamps and full metrics. These
one-minute runs used two real internet clients on **one machine**, after closing
the 3D browser checks. The command-line presenter ran without GPU rendering.
The Photon host was a Node execution of the same browser-host authority class;
the current authority was the Vercel server configured in Singapore. This
changes both transport **and authority placement**. It is not a controlled
measurement of Photon versus WebSocket alone, nor a two-device/ISP trial.

The same guided driver and eight-car workload were used. Its steering, braking,
boost and normal contacts also affect presentation metrics. Random pit-service
seeds, AI interactions and internet conditions are not perfectly identical.
One run per configuration is insufficient to estimate long-term reliability.

Only the comparable guest/remote-client row is shown here. Photon host latency
in the raw report is intentionally not used to claim an improvement.

| Configuration | Median input acknowledgement | p95 input acknowledgement | p95 update gap | Largest update gap | Updates/s |
|---|---:|---:|---:|---:|---:|
| Current APEX server | 107 ms | 126 ms | 65 ms | 213 ms | 20.18 |
| Photon Singapore | 135 ms | 144 ms | 55 ms | 281 ms | 19.70 |
| Photon Mumbai | 154 ms | 173 ms | 67 ms | 309 ms | 19.83 |

All three held a simulation-to-wall-clock ratio of 1.00 and had no reconnects
in the measured minute. Photon Singapore had a smaller p95 update gap but
higher input delay and a larger worst gap. Neither Photon region demonstrated
an overall input-response advantage in these runs. **Keep the current live
backend; collect matched two-device guest runs before deciding on migration.**

Raw reports:

- [Current APEX, 60 seconds](benchmarks/current-60s.json)
- [Photon Singapore, 60 seconds](benchmarks/photon-singapore-60s.json)
- [Photon Mumbai, 60 seconds](benchmarks/photon-mumbai-60s.json)

Decoded JSON payload was about 55 KB/s for the current server and 51 KB/s for
Photon. This is **not wire bandwidth**: it excludes framing, provider overhead
and compression effects. The current server negotiates WebSocket compression;
this prototype does not claim bandwidth savings from Photon. The recorded
connection-ping samples included countdown warmup and use different endpoint
measurements, so they were not used to choose a winner. Subsequent lab runs
begin collecting ping samples only after the measurement window starts.

Latest acknowledged-input latency samples the newest acknowledged command,
not the delay of every command. Snapshot rate influences that statistic. Visual
jerk includes real driving/collisions and frame-time variation; no conclusion
about smoothness is based on it alone. Both maximum gaps and input tails matter.

## Try it with a friend

1. Open `/network-lab.html` on two devices. Keep both active and use the same
   graphics/browser conditions for each run.
2. Choose **Current APEX server**. Create a test room, copy its invite, join on
   the second device, then start. Enable **Repeatable guided drive** on both.
3. Wait at least 60 measured seconds. Save the second driver's run. Leave.
4. Repeat with **Photon prototype**, first Singapore, then Mumbai if relevant.
   The original creator must stay connected. Save the **guest's** result.
5. Compare similar-length guest runs and download the report. Repeat runs,
   reverse their order, and include the slower connection. Do not compare
   Photon local-host results with current remote-server results.

No comparison report is sent to a third party by the page; saved results stay
in browser storage or the downloaded file. Game traffic uses the selected
network provider.

## Reproduce the command-line checks

Requires Node 22+ for the Photon SDK. Normal local APEX play retains its existing
Node requirement. Install dependencies and build first:

```sh
npm ci
npm run build
node scripts/compare-multiplayer.mjs --transport=current --seconds=60 --out=docs/benchmarks/current-60s.json
node scripts/compare-multiplayer.mjs --transport=photon --region=asia --seconds=60 --out=docs/benchmarks/photon-singapore-60s.json
node scripts/compare-multiplayer.mjs --transport=photon --region=in --seconds=60 --out=docs/benchmarks/photon-mumbai-60s.json
```

`--appId=` accepts another public Realtime development App ID. `--url=` can
point the current-provider diagnostic to another WebSocket endpoint. Each run
creates and cleans up its own temporary room; both clients still run on one
machine. Do not run provider benchmarks concurrently when comparing CPU load.

## Verification and limits

Completed: official SDK load/version, two real Photon clients joining the
private Singapore room and exchanging a targeted control message; two browser
Photon clients joining and driving the eight-car simulation; displayed metrics,
saved-run state and exported report schema; real shared-physics control
acknowledgements; sender identity checks; 20 Hz authority cadence; targeted
pings; duplicate-time and payload-accounting checks; local SDK/WASM imports and
MIME type; syntax checks; both builds. Browser checks captured no console
errors/warnings during driving. A host departure ends the trial as documented;
it does not provide continuity through host migration or extended sleep.

The exported browser check was a 27.6-second guest sample, not the one-minute
headless comparison above. The game's test suite was not run or edited. Full
race distance, all circuits, multiple physical devices, cellular throttling,
cheat resistance and production-grade Photon hosting are unverified. The
prototype must not be described as a production multiplayer replacement.

## Primary references

- [Photon Realtime JavaScript API](https://doc.photonengine.com/realtime-core/v6/bindings/javascript-typescript-api)
- [SDK download/version](https://doc.photonengine.com/realtime-core/v6/getting-started/sdk-download)
- [Manual region selection](https://doc.photonengine.com/realtime-core/v6/manual/connection-and-regions)
- [Custom events and channels](https://doc.photonengine.com/realtime-core/v6/manual/events/custom-events)
- [Realtime pricing](https://www.photonengine.com/realtime/pricing)
- [Free-plan rules](https://doc.photonengine.com/photon/current/pricing)
