# Bug audit — 2.65.1

This pass checks the path from driving input and room controls to the running
game: input source selection → prediction/command encoding → authoritative
session → displayed car, plus AI decisions before a pit entry. The existing
checkout stalled on cloud-stored files; work was performed in a separate checkout
of published main, leaving that folder untouched.

## Reproduced bugs and corrections

| Bug | Evidence on 2.65.0 | Correction |
|---|---|---|
| Held gamepad takes over after keyboard release | The control diagnostic reports `gamepad` with throttle still true after W is released while RT remains held | Only a new observed controller-button press can switch back from keyboard/touch; a newly connected held controller is baselined without activation |
| Unfocused controller keeps driving | Inactive-input reproduction returned steering -0.7, throttle true and brake false | The app passes window visibility/focus and menu state to the input selector; inactive input is neutral steering, brake/park, no throttle/boost. Returning focus does not rearm a held trigger |
| Leaving while reconnecting preserves the old retry state | `forgetRoom()` left `reconnecting === true` in the deterministic socket reproduction | Cancel retry/resume timers immediately, invalidate the abandoned socket generation, ignore late old-socket events, and guard app callbacks against replaced connections |
| Lapped AI calls for tyres after the chequered flag | A zero-life AI with more than one nominal race lap remaining requested a stop despite a race finisher already taking the flag | Cancel pending/new calls on that driver's final tour. Keep ordinary critical-tyre stops before the flag and service already underway |

The flag check requires an actual non-retired race finisher completing the race
distance. A retirement alone cannot suppress the other drivers' tyre strategy.
Cars already committed to pit service complete it normally.

## Verification performed

- New standalone control safety check: keyboard takeover/release, fresh pad press,
  loss/return of focus, held buttons, reconnecting pad, and arrow-key steering.
  Existing input-source check also passes.
- New deterministic socket lifecycle check: leaving during a queued retry and
  an in-progress resume, stale socket events, normal successful resume, cancelled
  timeout and reuse of a healthy connection after leaving.
- New AI strategy check on actual Monza geometry: new/queued pit calls after the
  flag, critical tyre calls before it, retirement exclusion and committed service.
- Six-circuit superseded-input drift diagnostic: zero phantom-runoff and
  stale-physics runoff frames. Predictor geometry is unchanged in this release.
- Countdown with throttle/boost held: maximum frame movement 0.524 m and maximum
  immediate-server reference error 0.589 m.
- Contact replication checks: rear, side and head-on solver contacts, rounded
  packet round-trip, paired fresh timelines, delayed snapshots and snapshot
  immutability pass. Pit ghosting remains unchanged.
- Input-route delay spikes of 650/1000 ms: maximum frame movement 1.569/1.368 m
  in the focused synthetic straight diagnostic.
- Two actual local WebSocket clients, ten seconds: approximately 20.10 updates/s,
  no reconnects, no server off-track state, no heading change with zero steering,
  both shown bodies within the Monza ribbon.
- Two diagnostic clients against the actual Vercel gateway: terminate the host
  transport, resume the same driver in the same two-player room, receive continued
  session updates. Observed recovery was 756 ms in this run. This is not a
  prolonged weak-link or two-device race.
- Local browser: Free Practice launched, W acceleration reached a displayed
  168 km/h, S brake/reverse and the pause menu responded, no console errors were
  captured. The controller and focus-state cases use the deterministic diagnostic;
  no physical controller was attached for this audit.
- Syntax, undefined-name/shadow checks with Node/browser globals, changed-module
  imports, both build commands and whitespace checks.

The game's test suite was neither run nor edited. No full-distance race,
all-weather matrix, all-circuit rendered lap or user's exact network/device
configuration was checked. The 756 ms observation is a single recovery check,
not a latency guarantee. The game's existing car handling, circuit geometry,
barrier solver, pit ghosting, weather and multiplayer provider are unchanged.

Standalone verification scripts live in `scripts/verify-control-safety.mjs`,
`verify-room-reconnect.mjs`, `verify-ai-chequered-strategy.mjs` and
`verify-live-reconnect.mjs`. Supporting reports are under
`docs/benchmarks/bug-audit-*-2.65.1.json`. Final production asset/deployment checks
are saved separately after the release is ready.
