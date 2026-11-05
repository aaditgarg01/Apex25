# Austin Hill Country environment — 2.42.0

This replaces generic scenery for COTA (`us-2012`). It retains the exact existing
anticlockwise sampled XY centreline (5,525.861m), 17m game road width, all horizontal
headings and generated pit-route XY geometry. The existing UI nominal length is
5.514km; the FIA 2025 map states 5.513km. This scenery pass does not rescale the
source centreline to force those values to match.

## Terrain, hill and vehicle attitude

The original 97 SRTM anchors remain in `public/data/elevations.json`. A separate
129-anchor refined profile uses cached USGS NED 10m samples at about 43m spacing,
with the same periodic, shape-preserving interpolation already used by the game.
Raw sampled relief is 30.99025m; the refined game relief is 30.9902m versus the
previous 32.55m. Formula 1 published 30.9m in its elevation comparison; older FIA
and promotional descriptions say 41m. Those are conflicting descriptions, not a
reason to inflate the sampled profile. From the retained control-line point to
the sampled crest the rise is about 27.16m. Maximum sampled/interpolated grade is
13.70%, not an invented 20% ramp. The road is not a surveyed kerb/camber scan.

A cached 21×21 surrounding grid samples the same USGS dataset at 140m intervals.
The underlying dataset is nominally 10m, but this shipped terrain mesh is much
coarser. The provider's dataset snapshot is from 2020, so resurfacing bumps and
current engineering cuts are not asserted. Terrain blends to road-height runoff,
with bounded off-road cross slopes, golden dry grass, fitted limestone cuts,
red-brown soil patches and graded building foundations. Road-aware triangle
constraints run after the generic pit-ground blend to prevent that blend raising
the ground through the uphill racing surface. No artificial driving banking or
camber is introduced. Existing pitch, gradient/gravity and camera systems consume
the refined anchors; the driving engine, car and multiplayer packet format remain
unchanged. Only the circuit-specific off-track surface hook is added to physics.

## Landmarks and surroundings

- Observation tower: OSM node **7911006730**, retained at its mapped position;
  nominal height **76.5m**, consistent with the venue's 251ft description.
  Original neutral steel, tapering ribs, viewing deck/glass insert and simplified
  double-helical stairs. Stair counts, rib curves and deck dimensions are fitted,
  not architectural reproductions. No tower signage is copied.
- Concert stage: OSM building **847781223**, source ~20.03×40.51m; fitted reserved
  model ~23.03×43.51m, zero anchor shift. Generic canopy and screen; a separately
  fitted lawn/viewing terrace uses available cleared space. It belongs beside the
  tower near Turns 16–18, not Turn 11. No commercial amphitheatre name/artwork.
- Pit garages: OSM **376713391**, parallel to the generated external pit lane,
  reserved ~34.09×366.09m, shifted 6m; garage fronts, upper glass/control floors,
  podium, original lettering and existing start/pit signage.
- Seven mapped stand footprints (the narrow 998801549 reference is retained as
  data, not expanded into an unsafe model), including main straight, Turn 1 and
  Turn 15/stadium areas. Fitted main canopy, tier supports, large video screens
  and additional clear viewing terraces. Mapped fits can shift ~55.22m and shrink
  to 60% of the envelope. Temporary event stand details are approximate.
- Generic fan plaza with gateway, water feature and food tents is artistically
  fitted near campus context, not a verified fountain survey. Tower, plaza, stage,
  stands and crowds reserve separate complete footprints.
- 15,958 instanced spectators, varied jackets/caps and
  broad-brim hats, 81 original US/Texas flag drawings,
  760 scattered checked tree crowns, 4,880
  grass tufts, shrubs and dry litter. Trees evoke live oak/juniper/mesquite scrub;
  exact species and individual locations are artistic, not a botanical survey.
- Two fitted camp clusters (152 tents including plaza tents,
  24 caravans), one parking cluster, original boards,
  marshals/LED panels, recovery/TV cranes and low-rise suburb/skyline silhouettes.
  Distant towers are generic, not verified individual Austin buildings. Some
  optional stands, hospitality, a parking anchor and the separate control-tower
  prop are omitted for clearance; control detail remains on the pit building.

Documented footbridge **191582102** has an original fitted 80m span and complete
clear pier footprints. Minimum underside-to-racing-road clearance is **8.966m**. Six nearby access-road
centreline probes give at least **6.300m** above the conservative maximum of
cached DEM and rendered ground; this is not a surveyed service-road height. The
location is mapped; height and extended pier positions are artistic. Deck, piers
and rails use shared safety solids. It deliberately spans the road overhead,
with a vertical clearance check; all ground props reserve its envelope and piers.
Other bridge/underpass references remain cached, without invented tunnels through
the unchanged road mesh or a new driveable service route.

## All 20 turns: runoff, gravel, grass, kerbs and barriers

Rows are the main outside stack, metres beyond the racing edge: **paved / gravel /
grass**. Red/white kerbs, subtle serration, rubber/braking patches and original
**LONE STAR** runoff lettering complete the dressing. Accent paint stays within
paving. Turn numbering comes from FIA/OSM; gravel extents and widths below are
interpretive game fits. No OSM gravel-area polygon was found in this snapshot.
These are not certified barrier placements or current surveyed trap dimensions.

| Turn | Station (m) | Target paved/gravel/grass | Barrier | Fitted at station |
| --- | ---: | --- | --- | --- |
| T1 | 333 | 22 / 14 / 10 | covered | 20.58 / 13.10 / 9.36 |
| T2 | 642 | 8 / 0 / 12 | armco | 7.22 / 0.00 / 10.83 |
| T3 | 840 | 15 / 0 / 12 | armco | 15.00 / 0.00 / 12.00 |
| T4 | 954 | 16 / 0 / 10 | armco | 2.58 / 0.00 / 1.61 |
| T5 | 1056 | 16 / 0 / 10 | armco | 16.00 / 0.00 / 10.00 |
| T6 | 1269 | 18 / 0 / 12 | armco | 5.35 / 0.00 / 3.57 |
| T7 | 1407 | 14 / 8 / 10 | covered | 11.32 / 6.47 / 8.09 |
| T8 | 1614 | 8 / 0 / 10 | armco | 5.12 / 0.00 / 6.40 |
| T9 | 1665 | 12 / 10 / 10 | covered | 12.00 / 10.00 / 10.00 |
| T10 | 1875 | 14 / 14 / 10 | covered | 14.00 / 14.00 / 10.00 |
| T11 | 2268 | 18 / 24 / 10 | covered | 16.15 / 21.53 / 8.97 |
| T12 | 3474 | 22 / 20 / 10 | covered | 21.99 / 19.99 / 10.00 |
| T13 | 3705 | 12 / 0 / 8 | concrete | 0.84 / 0.00 / 0.56 |
| T14 | 3789 | 10 / 0 / 8 | concrete | 0.78 / 0.00 / 0.62 |
| T15 | 3930 | 16 / 0 / 8 | concrete | 16.00 / 0.00 / 8.00 |
| T16 | 4080 | 22 / 0 / 10 | armco | 17.12 / 0.00 / 7.78 |
| T17 | 4302 | 24 / 0 / 10 | armco | 15.46 / 0.00 / 6.44 |
| T18 | 4527 | 24 / 0 / 10 | armco | 17.57 / 0.00 / 7.32 |
| T19 | 4737 | 18 / 14 / 10 | covered | 1.73 / 1.35 / 0.96 |
| T20 | 5055 | 18 / 12 / 8 | covered | 18.00 / 12.00 / 8.00 |

All road branches, the complete external pit corridor, service/alternate roads and
building envelopes constrain placement. The shared surface plan supplies renderer
meshes, complete scenery reservations, barrier locations, existing track-limit
penalties, racing-line surface grip and wet drag/grip. Paved runoff has near-normal
grip and reduced penalty; gravel slows heavily; grass loses grip in rain and on
cross slopes; paint/kerbs are slippery in wet conditions. Existing invalidation,
recovery and tyre balance are retained. The back straight goes from Turn 11 to
Turn 12; Turn 11 is the hairpin before that straight.

## Weather, performance and practice

Clear blue dry sky with sparse cumulus, warm sun, muted distant haze and restrained
pooled heat shimmer layer on existing weather. Rain brings storm clouds, reflective
asphalt, darkened grass/soil, umbrellas and low mist while suppressing smoke/heat.
Dry/damp/wet and dynamic whole-lap scheduling remain available; the scheduler is
unchanged. Free Practice starts: **Turn 1 climb 80m**, **Esses approach 720m** and
**Stadium section 3720m**. Partial-circuit starts remain untimed out laps.

Scenery uses instanced crowd/vegetation/flags/tents and spatial static batches,
shared procedural maps, tree LODs and throttled 80ms effects. Circuit cleanup
releases assets through the established scene disposal path. All geometry/data
are local modules; no scenery requests to external services occur during play.
Measured construction budget: **180 mesh objects including both
LOD levels; 169 maximum active-LOD submissions** before
culling/shadows, excluding road, car, safety, runoff and UI. About
1.36M triangles count repeated instances and both LOD levels.
1,471 individual boxes become 13 spatial batches.
The actual crowd count is below the initial 18–26k target after unsafe optional
stands were omitted. No FPS or hardware performance claim is made.

## Verification

- Syntax checks, strict new-module undefined-name/shadow checks, established
  allowances for edited legacy files, browser/server imports, both build commands
  and whitespace checks. Exact final outcomes are in the release snapshot reports.
- **984 complete reservations**, 3,465 mapped access
  segments; zero blocked/overflowing mesh or instanced bounds and no rejected
  required placement. Minimum full-footprint clearance **2.313m**;
  minimum tree-crown clearance **7.012m**; sampled barrier-edge/race clearance
  **0.721m**.
- **3,295 runoff quads**, zero other-racing-branch, pit, service
  or building overlaps (70 fitted building footprints);
  308 access-conflicting and 81 additional
  pit-conflicting quads omitted.
- Elevation is periodic/continuous: max adjacent 3m grade difference **1.45
  percentage points**, max vertical increment **0.411m**. Across a 2mm start/finish
  interval the height difference is ~0.0000103m and pitch difference ~0.00000114rad.
  Road-to-runoff edge height mismatch: zero in sampled comparisons.
- **2,763 road-to-actual-terrain-triangle probes**: zero intrusions,
  minimum clearance **0.406m**. **261** static default chase
  camera samples around the Turn 1 crest at three speeds remain above terrain,
  minimum **6.316m** before camera floor clamping. This
  checks the position path, not every smoothed camera frame/line of sight.
- **326 static full-car-envelope pit poses**: zero wall contacts;
  pit XY route is unchanged and its heights follow the refined road.
- **6,929 shared safety solids** match renderer sources, with zero
  missing/extra solids or vertex-count issues. Other 41 circuits retain identical
  static wall geometry hashes and unchanged elevation source data.
- Parked dry hill/stadium and wet views plus browser-console inspection only.
  The game test suite was neither run nor edited. No driving, impact, recovery,
  online multiplayer, dynamic-weather-transition or FPS playtest is claimed.

## Uncertain / fitted details

Exact stand roofs and temporary seating, broad trap shapes, stage/lawn/plaza
arrangements, the tower's deck/ribs/stairs, bridge height/extended span, vegetation
species, current road bumps/camber, detailed limestone cuts and distant skyline
remain approximate. No user photos accompanied this attachment; official tower
photos and maps were inspected. The initial brief's 41m elevation, tower/amphitheatre
location and back-straight order were corrected using the references below.
This is procedural scenery, not a scan or official-game asset fidelity.

## References

- [Official F1 circuit flow, stadium and 5.513km context](https://www.formula1.com/en/racing/2025/united-states).
- [FIA 2025 numbered circuit, pit and emergency maps](https://www.fia.com/system/files/decision-document/2025_united_states_grand_prix_-_event_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_quarantine_zone_map_red_zones_map.pdf).
- [Official tower location, 251ft height, double helix and amphitheatre relationship](https://circuitoftheamericas.com/blog/2024/2/20/all-about-the-cota-tower/).
- [Official campus, plaza, camping and paddock context](https://circuitoftheamericas.com/campus-map/).
- [F1 elevation comparison: 30.9m, conflicting with older 41m descriptions](https://www.formula1.com/en/latest/article/highs-and-lows-which-f1-track-has-the-most-elevation-changes-.7I9JEcBw3R2AqXbnJ6hyvc).
- [Older FIA description with 41m claim, retained as conflicting reference](https://api.fia.com/news/f1-usa-gp-race-preview).
- [USGS NED 10m data provenance, public API dataset vintage 2020-04-23](https://www.opentopodata.org/datasets/ned/).
- [OSM buildings, tower, service roads and crossings snapshot 2026-11-05](https://api.openstreetmap.org/api/0.6/map?bbox=-97.650,30.120,-97.620,30.145).
