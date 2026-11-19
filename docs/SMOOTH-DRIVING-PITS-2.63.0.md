# Continuous driving and pit presentation — 2.63.0

The requested flow is unchanged: friends join the same Vercel room, drive with
immediate local prediction, and receive shared server decisions. A requested
pit stop follows the shared assisted path into the driver's assigned service
bay, waits for penalties and tyre work, then rejoins through the existing merge.

## Movement changes

The old presenter rebuilt the local simulated car from every server packet and
then hid the difference with a visual offset. Packet timing and changes between
braking, acceleration and boost could repeatedly alter that trajectory. The
fractional frame projection also used a different integration rule from full
physics ticks, producing alternating frame distances on high-refresh displays.

The updated presenter keeps a continuous fixed-step local car and a separate
replayed server reference. It steers corrections toward that reference with
bounded correction velocities and limited speed-correction acceleration.
Authoritative recoveries, finish changes, pit phase changes and major impacts
still reset the local presentation. Controls, collisions and results are not
accepted from client-supplied positions. No backend-provider switch is involved.

Two completed physics states are interpolated for painting. This deliberately
adds one physics step (about 16.7 ms) of presentation delay; it avoids alternating
partial/full-step movement. Rival positions use bounded velocity-aware curves,
limited extrapolation, and a playback clock that changes speed gently as jitter
changes. The adaptive rival buffer targets 110–300 ms, trading some rival display
latency for steadier movement. Extended connection stalls can still pause or
correct cars. No claim of jitter-free internet play is made.

Both local and Vercel gateways now allow 45 seconds for a delayed transport
keepalive instead of closing after one missed interval. Missing driving controls
still brake the car on the existing short timeout. This does not extend room
credentials or remove authentication.

Out-of-order full snapshots are discarded. Pit transit preserves its continuous
local station while reconciling toward the shared pit spline.

## Pit changes

The existing six-metre corridor and eight numbered stations remain. A through
lane and offset service apron now occupy that same corridor. The travel path
blends smoothly toward the assigned bay, then into the through lane, with no
modulo reassignment. Shared helpers determine simulation, local prediction,
paint, crew placement and the pit guidance line.

White edges, dashed separation, arrows, yellow bay outlines, floor numbers,
wall-mounted boards and the driver's highlighted bay make entry and service
positions clearer. Mechanics, helmets, arms and jacks use instancing and
throttled updates. Static garage components use the existing spatial batching.
Optional neutral garages require a complete footprint check against the racing
road and pit ribbon plus existing rendered architecture/vegetation. Dedicated
venue buildings are retained where they occupy a site. The garage check is not
a new survey of every mapped service/access road on every circuit.

No new collision walls were introduced: the existing shared barrier/collision
plan encloses the driving corridor. Existing tyre-service randomness, penalty
waits, tyre-only public service notices and minimum pit limit remain. The
18-second target still uses the existing reference-pace calibration and 80 km/h
floor; actual pit loss varies with circuit length, box position and race pace.
The small lateral service approach also changes actual transit by a small amount.

## Verification

- Syntax/module imports and both builds completed. Undefined-name/shadow checks
  passed for the changed client/shared/diagnostic files; backend undefined-name
  checks passed (pre-existing backend local-name shadowing was not changed).
- A dedicated diagnostic ran eight assisted pit stops on each of 42 circuits:
  336 stops, eight unique stations, finite positions, completed service and exit,
  and a four-second penalty on the first driver. Largest frame movement was
  0.493 m at 60 Hz; minimum configured pit limit was 80 km/h.
- Local prediction responded before another snapshot, did not mutate the server
  snapshot, respected recovery epochs, and held finished cars in place.
- Two actual local browser clients joined and drove the eight-car simulation.
  The new guest tab logged no errors or warnings. A temporary visual-check page
  initially omitted the renderer's map-credit element; that harness error was
  fixed before visual inspection and the page is excluded from deployment.
- Monza and Singapore pit layouts were visually inspected, including assigned-bay signage,
  garages, mechanics and through-lane markings. Singapore retained its existing
  mapped pit building with no additional garage modules. A screenshot is a staged layout
  preview, not an internet race or a measurement of service duration.
- A separate two-client localhost driving diagnostic is recorded in
  [local-online-2.63.0.json](benchmarks/local-online-2.63.0.json). Its input latency
  is local integration evidence and must not be compared with Singapore/Mumbai
  internet measurements.
- A longer background browser check closed its local connection. The local
  five-second single-miss keepalive was replaced with the grace period above;
  a focused check then retained a connection through two unanswered local pings
  over 12 seconds. Long-duration background/reconnection behavior remains
  unverified.
- The game's test suite was not run or edited.

## Deterministic presentation diagnostic

[scripts/verify-network-presentation.mjs](../scripts/verify-network-presentation.mjs)
uses actual shared car physics on a synthetic straight. Both revisions receive
identical scheduled delays, jitter, skipped packets, controls and render rates.
The driving sequence includes boost, braking and acceleration; contacts and
cornering are excluded so they cannot disguise network correction effects.
This checks rendering behavior, not a real ISP, device or production server.

| Snapshots / render rate | Conditions | Before p95 jerk | After p95 jerk | Reduction |
|---|---|---:|---:|---:|
| 20 Hz / 60 fps | Regular delay | 359.41 | 128.19 | 64.3% |
| 20 Hz / 60 fps | Jitter / dropped samples | 340.11 | 131.65 | 61.3% |
| 10 Hz / 60 fps | Jitter / dropped samples | 418.09 | 132.66 | 68.3% |
| 20 Hz / 30 fps | Jitter / dropped samples | 297.21 | 62.54 | 79.0% |
| 20 Hz / 120 fps | Jitter / dropped samples | 39187.15 | 139.37 | 99.6% |

Jerk is the finite-difference rate of change of rendered acceleration in m/s³.
It includes the scripted pedal transitions. Do not interpret these percentages
as network latency reductions or expected improvements on every connection.
The raw before/after reports also retain reference-position errors and maxima:
[presentation-before.json](benchmarks/presentation-before.json),
[presentation-after.json](benchmarks/presentation-after.json).
The pit diagnostic is [pit-layout-2.63.0.json](benchmarks/pit-layout-2.63.0.json).

Not verified: a new friend-on-another-ISP run after release, every circuit's pit
appearance in every weather mode, every access-road footprint, and full-race
soak/reconnection behavior. The previous Photon experiment remains optional;
normal online play continues on the existing Vercel backend.
