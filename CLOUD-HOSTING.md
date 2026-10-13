# APEX 25 cloud hosting

This package contains the latest Google Drive game and deployment configurations. It is deployed at https://apex-25-production.up.railway.app.

Railway project: 218fbc1c-71cf-4281-9cc5-7d7eb3fc2676
Service: d84f064a-e4ba-4ce4-bee6-980e79434500
Public domain routes to port 8080, assigned by Railway.

The cloud package uses patched ws 8.22.0. All 15 physics tests and six network tests passed; the network tests also passed against the public Railway URL. Hosting initially uses the account’s $5 / 30-day trial, checked 9 October 2026. No paid plan was purchased.

Future edits in Google Drive do not automatically publish. Copy them into this cloud package, keep the patched dependency, and deploy with `npx @railway/cli up --project 218fbc1c-71cf-4281-9cc5-7d7eb3fc2676 --service d84f064a-e4ba-4ce4-bee6-980e79434500`.

Deploy the whole Node application as one web service. The same HTTPS address serves the game and secure WebSocket multiplayer. Use one instance: rooms are held in process memory. Restarting or redeploying clears active rooms.

## Render

Connect a Git repository containing this package and create a Blueprint using render.yaml, or create a Node web service with build command `npm ci --omit=dev && npm run build`, start command `node server.mjs`, and health check `/health`. Explicitly choose the free plan. Render provides the port and public HTTPS URL. No local tunnel is needed.

The free plan sleeps after inactivity and wakes when visited. For an always-running service, choose a paid plan only after approving its current price.

## Railway or another container host

The Dockerfile packages the game server and assets. Railway reads railway.json; generate a public domain once deployment is healthy. Check the account plan and cost before deploying. The host supplies PORT; HOST must remain 0.0.0.0.

## Verification

Run `npm ci`, `npm run build`, then `node --test test/physics.test.mjs`. After deployment, run `TEST_URL=https://your-host node --test test/network.test.mjs`. Also create a room in one browser and join its invite link in another.

The server requires no Google Drive login, local Mac, database, API keys, or Cloudflare tunnel. A hosting account is required to deploy. Keep account credentials out of this package.

## Multiplayer latency update

The live service now runs as one replica in Railway Singapore (`asia-southeast1-eqsg3a`). Keep one replica because rooms are stored in process memory. The latest deployment is `cd292de0-a553-459c-92d8-964da23ca562`.

The client now predicts the local car for immediate presentation and interpolates opponents between snapshots. The server remains authoritative for progress, lap times, penalties, and classification. Prediction stops on stale connections and snaps to confirmed recoveries. Server snapshots are serialized once per room, rounded to millimetre/millisecond precision, and dropped on backed-up connections. Catch-up ticks publish only the newest state.

Validation: 15 physics tests, 5 network-motion tests, and 6 multiplayer tests passed. All 6 multiplayer tests also passed on the live deployment. Browser checks started an eight-car online race without console errors. A seven-ping network sample measured median 88 ms / maximum 112 ms, compared with an earlier median 919 ms / maximum 2919 ms sample. These samples are connection-specific, not a guaranteed latency. A controlled eight-car snapshot was 17% smaller.

Preserve `shared/netcode.mjs` and its integration in `public/app.js` and `server.mjs` when merging later changes from the Google Drive copy.


## Multiplayer correction update — 11 October 2026 (2.2.1)

Replaced RTT-based local extrapolation with fixed 60 Hz input commands and server acknowledgments. Clients replay only commands the server has not simulated. Commands are batched at up to 30 messages/second; server simulation is limited by elapsed server time. Recovery and disconnect braking invalidate older command generations. Original clients remain compatible, but everyone should refresh to use the improved movement. Online car models no longer add a second layer of movement smoothing.

Verification: 32 tests passed locally, including two real WebSocket clients, recovery, qualifying, all 41 circuits, and deterministic bidirectional delay tests. In the isolated driving scenario, maximum reconciliation corrections were 0.004 m at 100 ms RTT, 0.013 m at 300 ms RTT plus jitter, and 0.035 m at 500 ms RTT with jitter and a 500 ms traffic stall. This is a controlled simulation result, not a guarantee for every connection or contact with other cars.

Deployment 7df8315d-04ac-4015-9627-1a4e09cd234c is live. Public /health reports version 2.2.1. All 7 network integration checks also passed against Railway; browser room creation, race start, and input smoke checks passed with no browser errors. Screenshot: ../apex-25-input-replay-live.png.


## Solid race cars — 11 October 2026 (2.2.2)

Cars now use a rotated, full-length footprint including the wings and tyres. Rear-end, side and angled contact separates the bodies and removes closing speed. Collision checks also run between batched online input steps to prevent fast cars passing through each other. Local prediction shares the collision handling, and nearby cars are shown at the player's predicted time. Correction smoothing cannot render overlapping bodies. Qualifying remains ghosted; practice is solid and uses separated spawn positions. Cars at different bridge elevations remain independent.

All 39 checks passed locally, including a three-client race where the trailing player reaches and slows against the stationary driver, and the prior delayed-input regression tests.

Deployment f11abda5-c7b6-418a-85b1-908f7b37bf70 succeeded; public health reports 2.2.2. All 8 network checks passed against Railway, including the three-player rear-end collision test.

## Multiplayer and scenery — 13 October 2026 (2.4.0)

Traffic prediction now uses curved opponent motion and the shared drafting force.
Jitter-buffer timestamps follow simulation time, and bursts of old snapshots are
coalesced before reconciliation. Static scenery uses spatial batching, with lighter
car shadows/details and automatic resolution reduction on sustained slow frames.
Every circuit has a stylized named landmark and regional landscape clusters.
See VALIDATION.md for measured results and remaining latency limits.

Deployment `2b43d12b-158b-4590-9065-2722d55843ae` serves version 2.4.0 at
https://apex-25-production.up.railway.app. All nine multiplayer integration checks
passed on the live service. The deployed client, physics and new scenery modules
match the tested local files. Temporary inspection pages are excluded from hosting.


## Sector colours — 2.4.1

Purple sectors compare valid sector times across the whole session, including AI and
retired drivers, rather than only the viewed driver's personal best. Current valid
sectors participate before lap completion; comparisons use displayed milliseconds.
Green marks a personal best when another driver holds a faster sector. Invalid lap
and out-lap sectors do not establish purple records. Tests omitted at user request.
Deployment: `3b1e0b89-6b04-48c2-8659-d655b58a5982`.


## Conditions — 2.5.0

Added Normal / dry, Intermediate / damp and Wet / rain presets for all session modes.
The server normalizes the host's choice, includes it in lobby and session state, and
preserves it through qualifying, restarts and rematches. Physics and client replay
share traction, braking, cornering grip and sideways-slip calculations. Opponent
motion and collision impulses account for travel direction during sliding.

Rain and tyre spray each use one small rendering batch; road materials, lighting,
visibility, AI braking/pace and guide colours adapt to conditions. No gameplay
tests or browser test sessions were run, per the user's instruction.


## Display, guide, weather and multiplayer — 2.6.0

Compact/default HUD with optional H/Details expansion; cached map backgrounds and
nearby-driver rows reduce UI work. A computed road-bounded racing path replaces the
centre line, with curvature-based speed planning and approach-speed colours. AI uses
the same path/condition speed profiles. Rain is world anchored with wind; soft wheel
spray uses pooled particles. No additional rain/spray drawing batches are required.

Input-stream credit estimates per-car input lag for client time alignment. Snapshot
publication changes from 20 Hz to 30 Hz. New clients request stateVersion 2, permitting
unchanged lap histories to be omitted, with complete event/periodic refreshes; old
clients retain full snapshots. Remote interpolation time is monotonic and small
correction errors use a dead zone. Contacts use a spatial broad phase, early exit,
angle-dependent effective mass and capped positional correction. Final rendered
separation never applies another velocity impulse. Qualifying remains ghosted.

No automated game tests or browser gameplay checks were run, per user preference.


## Finish handling and display fixes — 2.6.2

Finish state now removes cars from rendering, minimap, contacts, drafting, and
spectator targets while preserving timing/classification data. Retirement rejects
finished drivers in both shared logic and the UI. Finish badges appear next to race
finishers; unfinished followers display RACING after a leader finishes, and completed
gaps use recorded finish times. Provisional results update as the field completes.
The guide legend and status/speed card use layout flow to avoid overlap. No gameplay
tests or browser test sessions were run, following the user's preference.


## Random circuit and conditions (2.6.3)

Use Randomise beside Circuit or Track Conditions to choose a different option
before starting. Circuit selection includes every available circuit, including
extras; conditions choose between Normal / dry, Intermediate / damp, and Wet / rain.
The selected values and preview update immediately and are saved like manual choices.
Both solo and multiplayer room creation use the displayed setup; all online drivers
share the host's circuit and surface. Gameplay tests were omitted at the user's request.


## Final race gaps and 2025 team liveries (2.7.0)

The results screen retains each finisher's penalty-adjusted gap to the winner, with
their total race time underneath. The winner shows total race time. Gaps also stay
on the race leaderboard after completion. Drivers still racing after the leader
finishes show a clearly marked approximate arrival gap until their final time is
recorded; retired drivers continue to show DNF.

Driver and car now offers all ten 2025 teams: Ferrari, Mercedes, Williams, McLaren,
Red Bull Racing, Racing Bulls, Alpine, Aston Martin, Haas, and Kick Sauber. The game's
original car model uses team-style body panels, wings, accent stripes and lettering
based on the [2025 launch liveries](https://www.formula1.com/en/latest/article/in-photos-every-2025-f1-car-livery-after-their-spectacular-f1-75-live.2BZTh37ifdxAASqub3X1HK).
The menu preview changes immediately, the choice is saved, and the server shares
each driver's validated selection through qualifying and races. These are procedural
paint schemes, not official licensed models or sponsor artwork. Tests were omitted
at the user's request. Refresh every player's browser after deployment.


## Faster cars and clean gap labels (2.7.1)

Higher engine pull and lower straight-line drag let dry cars reach substantially
higher speeds, with a 106 m/s normal limit and a 115 m/s overtake limit. Wet
conditions retain their lower traction. The racing-line speed profile and guide
forecast use the new pace so fast straights are not painted as automatic braking.

Race gaps display with a plain + sign. Live gaps remain estimates while cars are
still driving; finished drivers keep their recorded, penalty-adjusted time gaps.
The results legend explains when a live gap becomes final. Gameplay tests were
omitted at the user's request.


## VIT Vellore campus circuit (2.8.0)

A new Campus circuit entry follows the user's traced route around VIT Vellore,
aligned to mapped campus roads. The roughly 3.7 km loop starts westbound on Jimmy
Carter Road and includes Fleming Road's roundabout, Main Subway, Lee/Lehn/Planck
roads, Kissinger Road, the M-block loop, and the PRP/SJT underpass and outside return
hairpin. Road width is 14 m; the smallest turn radii are rounded for racing.

SRTM terrain samples supply gentle campus elevation changes. The railway underpasses
use separate reconstructed descents, level covered floors, climbs, retaining walls,
portal markings, and roofs. Chase-camera clearance follows the lowered road;
overhead view moves under the ceiling inside a covered section. Rain is hidden
under the cover. Tight-turn shoulders and lowered terrain prevent road clipping.

The scenery includes locally cached OpenStreetMap building footprints, VIT Lake,
campus signs, palms, lamp poles, and both railway tracks. There are no map-data
requests during play. The circuit is available in practice, qualifying, races,
multiplayer and circuit randomisation. Fine elevations and tunnel dimensions are
a playable reconstruction rather than a measured survey. Sources and attribution
are saved in public/data/vit-vellore-sources.json. No gameplay tests were run, per
the user's preference.
