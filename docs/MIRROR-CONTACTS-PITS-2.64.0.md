# Rear view, contact replication and open pit garages — 2.64.0

The previous pit work still used a six-metre corridor and closed modular doors. Rival cars were displayed behind the local predicted car's timeline, so an authoritative collision could appear to happen before the rival reached it.

## Changes

- A live mirrored rear camera sits centrally above the race HUD. `V` or the Mirror button toggles it. On narrow portrait screens the timing panels move below it. The focused car is hidden only for the rear pass. One reusable target is capped at 512 × 152; refresh is capped at 24 Hz, or 15 Hz after resolution reduction. The pass reuses shadows and water reflections instead of regenerating them.
- Within 60 metres, rivals blend toward the local prediction's reference clock; within 30 metres they use that clock fully. Far cars retain the adaptive smoothing buffer. Nearby presentation also shares the local correction translation, capped at four metres.
- The server attaches a paired, sequenced contact marker to real impulses. Both compact and full snapshots carry it. On receiving a new contact, the affected local car reconciles immediately and both involved cars leave the old smoothing timeline for 300 ms. Duplicate markers do not reapply impulses. The server remains authoritative; no client awards contact damage or penalties. Existing pit ghosting and collision shape/impulse calculations remain in place.
- The shared pit planner now considers 12/10/8-metre corridors and divides them into a through lane and a service apron. All 42 current circuits select 12 metres: 6.24 metres through lane and 5.76 metres apron. Eight numbered stops remain unique. Their green floors, white outlines, white arrows and garage-mounted YOUR BOX board identify the stopping place without depending on colour alone.
- Garages have open fronts, recessed workshop interiors and neutral upper glazing. Sides, rear walls and raised lintels come from exactly the same segment list for rendering and collision. The outer boundary moves behind the row, including the dedicated Singapore and shared venue wall builders. Singapore and Lusail start gantry supports, plus the shared venue gantry planner, also reserve the new garage footprints. Older boundary segments through garage footprints are replaced by the shared garage shell. Old overlapping scenery is cleared before batching. The focused pit car remains opaque; other pit cars retain ghost presentation.

These are original procedural assets informed by the reference's fast-lane/apron/open-garage organisation; they do not copy ApexDrawn artwork or source code. Circuit centrelines, car model, collision impulse mechanics, multiplayer provider, tyre-service distribution and penalty accounting are unchanged. The pit path's lateral offsets change to fit the wider lane.

## Verification

The standalone diagnostics do not invoke or modify the game's test suite.

- Syntax and undefined-name/shadow checks for changed modules; shared module imports; `npm run build` and `npm run build:vercel` passed. The first Vercel build attempt hit local disk space exhaustion; clearing task-created temporary build files/cache allowed both builds to complete.
- Three actual shared-solver scenarios: rear impact, head-on and side contact. Both affected cars receive markers; compact packet round-trip, duplicate handling and snapshot immutability pass. Two presentation views agree at the same receipt clock. Delayed-marker checks at 90/180 ms one-way delay also pass. This is not a measurement of two-device collision latency.
- Deterministic packet delay/jitter/drop runs at 10/20 Hz updates and 30/60/120 Hz presentation remain finite through braking and boost transitions.
- 336 actual assisted stops across all 42 circuits: eight unique bays, tyre service, four-second penalty on the first car, and automatic exit. Minimum displayed pit limit stays 80 km/h.
- Complete modular-garage footprints checked against every racing-ribbon segment and the generated local pit corridor. Segment equality checked between the garage render source and authoritative collision list. Additional checks reject other low walls/supports inside garage footprints. Across all 336 garages the measured minimum garage-to-racing-road clearance is 1.399 m; garage-to-pit-corridor clearance is 1.200 m. This is not an exhaustive re-audit of every original mapped access road or every circuit building.
- A 15-second local room with two clients and six AI cars delivered approximately 19.85 updates/second per client with no reconnection. Both clients and server ran on one machine; this establishes integration, not internet performance.

Diagnostic outputs are in `docs/benchmarks/*2.64.0.json`. Local browser checks passed for the narrow portrait race HUD, mirror button, Monza open workshop interiors and Singapore night pits, with no warnings/errors logged in the pit-preview tab. Preview cars were staged stationary for visual inspection, separate from the real-stop simulation.

## Limits

Latency still delays authoritative contact information; no implementation can guarantee zero delay or identical views over different poor connections. A two-device race with the user's friend remains the useful acceptance check. The modular garage row is a gameplay pit design, not a surveyed reconstruction of every circuit's actual garage complex. Full-distance races, every circuit/weather camera combination and low-end-device GPU performance have not been exhaustively checked.
