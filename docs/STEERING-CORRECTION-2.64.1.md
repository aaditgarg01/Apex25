# Multiplayer centred-steering correction — 2.64.1

The driver reported drifting left or right on a straight without steering. The prediction reconciler could rotate the local car toward an estimated server heading even with centred controls. It also inferred control delay from gateway ping, which does not necessarily include the room relay's input delay.

The client now records each outgoing live-control sequence and its send time. The server stamps when that sequence was accepted. Full and compact snapshots return matching acknowledgement timing, allowing prediction to replay from the accepted control timeline. Timing is used only when its sequence matches the pose's acknowledgement; older servers retain the bounded fallback. Existing motion row lengths are unchanged.

With centred steering, reconciliation now contributes zero yaw. Its lateral correction velocity is limited to 0.25 m/s; this limit applies only to network reconciliation, not real tyre slip or collision impulses. During manual steering its yaw correction is capped at 0.03 rad/s rather than 0.3. Collision, pit-transition and recovery discontinuities still reconcile to the server. Contact bookkeeping clears at phase/reset boundaries.

The mirror, open garages and paired contact presentation from 2.64.0 are included unchanged.

## Checks performed

- Syntax, undefined-name/shadow and shared-module import checks.
- Standalone control/relay diagnostic with actual LiveInputStream, shared car physics and compact packet round-trip. It covers asymmetric 180/70 and 300/90 ms input/snapshot delays, jitter/reordering, braking, boost and centred steering, on axis-aligned and diagonal straights.
- In the straight-without-steering runs: zero added heading change; zero lateral error on the axis-aligned straight and at most 0.0167 m on the diagonal straight. The latter includes millimetre/angle packet rounding.
- The two-turn then release scenarios reduce residual correction yaw after release to about 0.001 degrees over the observed interval. Under severe jitter, lateral differences from the immediate-input reference still reach approximately three metres. These results do not establish zero lag or identical driver trajectories on poor connections.
- Rear/head-on/side contact replication checks and packet impairment presentation checks pass. The separate 2.64.0 all-circuit pit geometry and 336-stop reports still apply; this patch does not change pit geometry.
- Both build commands pass. A local two-client/six-AI room check completed with approximately 20 updates/second and no reconnection.

Reports: `docs/benchmarks/steering*-2.64.1.json`, `contact-sync-2.64.1.json`, `presentation-2.64.1.json`. Existing game tests were not run or changed.

## Practical limit

The reported two-device drift has not been reproduced on the user's devices. These changes remove two concrete correction paths that can contribute to it; a fresh two-device room remains the acceptance check. Refresh both clients and create a new room so an existing room owner running the previous deployment cannot keep the old simulation code alive. Physics, penalties and actual collision deflections remain server-authoritative.
