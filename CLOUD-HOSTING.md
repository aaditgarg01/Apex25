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
