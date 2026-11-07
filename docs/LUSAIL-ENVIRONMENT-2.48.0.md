# Lusail — dedicated night environment (2.48.0)

The game keeps its existing clockwise, 16-turn, 5,427 m sampled layout, close
to the 5,419 m FIA F1 map. The elevation anchors, pit route, car model,
handling equations and network protocol are retained. Lusail-specific inputs
feed the existing surface, track-limit, racing-line and collision systems.

## Architecture, landscape and dressing

- The neutral pit and paddock building is oriented to the game's external
  pit lane on the mapped side. The OSM footprint supplies the anchor; the
  fitted game block is roughly 215 m long and shifted 24.7 m to clear the
  retained pit and access corridors. The garage fronts, warm hospitality
  windows, roof, control tower, podium and media/medical styling are original.
- The mapped main stand did not fit as a single block. Four covered bays on
  its side of the straight, plus fitted North, T2, T3, T16 and desert viewing
  terraces, preserve the road openings. Three mapped footbridges use fitted
  spans and common pier/deck/rail solids. A start gantry, light and timing
  displays, national and original flags, phones and rain umbrellas dress the
  viewing areas. One mapped car park was fitted; three candidate car parks
  were omitted after clearance checks.
- The terrain follows the existing shallow relief. Pale desert soil,
  rippled gravel, sparse scrub, palms and small irrigated lawns sit around
  the neutral fan zone, parking, and service roads. The horizon uses utility
  masts rather than an unverified city silhouette.
- The pit lanes retain the entry and exit edging and box markings, with
  Lusail-specific limit and pit-board lettering. Other dressing includes
  grid positions, cosmetic safety-car/sector/detection marks, braking and
  corner boards, marshal posts, caution LEDs, fire points, service gates
  marked as clear openings, cable runs, camera/recovery equipment, sponsor
  placeholders, sand/dust, rubber and wet patches. The race still uses its
  existing timing and DRS rules. No event or sponsor artwork is shipped.
- The flat-to-rounded kerb profiles, paint, tarmac, raked gravel and sand
  are layered using one plan. A painted or gravel patch ends at a competing
  road branch. Paved runoff maintains near-road grip with a reduced time
  penalty for leaving the limits; laps still invalidate under the existing
  rules. Sand has the greatest drag; wet paint and grass lose extra grip.
  Recovery and legal pit-entry handling remain in their existing paths.

## Runoff and barriers by corner

Targets are widths in metres outward from the racing edge, on the outside
of each bend. The inside is classified too, with the apex kerb and default
edge treatment. Depth is nominal design depth, not physical excavation.
The fitted pair is sampled at the apex; the setbacks can be clipped or
opened for access. A zero apex gravel width at T6, T14 or T16 can coexist
with a strip farther around the corner. Paint and the kerb lie within the
listed bands, and service/drainage land lies beyond the barrier. Where a
real-world treatment is referenced, the game width and setback still use
fitted values.

| Turn | Station (m) | Kerb | Target paved / gravel / sand (m) | Gravel depth (m) | Barrier / target setback (m) | Fitted apex paved / setback (m) | Evidence |
|---:|---:|---|---|---:|---|---|---|
| 1 | 471 | rounded | 24 / 12 / 6 | 0.20 | covered / 42 | 12.8 / 22.5 | historical F1 gravel evidence |
| 2 | 831 | rounded | 15 / 7 / 5 | 0.15 | covered / 27 | 15.0 / 27.0 | historical F1 gravel evidence |
| 3 | 1080 | red-white | 18 / 0 / 6 | 0.00 | armco / 24 | 18.0 / 24.0 | Fitted |
| 4 | 1440 | rounded | 20 / 0 / 6 | 0.00 | armco / 26 | 1.2 / 1.5 | Fitted; rounded profile referenced |
| 5 | 1617 | red-white | 15 / 0 / 5 | 0.00 | armco / 20 | 15.0 / 20.0 | Fitted |
| 6 | 1938 | red-white | 20 / 3 / 6 | 0.12 | covered / 29 | 2.1 / 2.7 | 2025 FIA exit strip |
| 7 | 2325 | red-white | 22 / 0 / 7 | 0.00 | covered / 29 | 22.0 / 29.0 | Fitted |
| 8 | 2562 | flat | 13 / 0 / 6 | 0.00 | armco / 19 | 13.0 / 19.0 | Fitted |
| 9 | 2694 | red-white | 16 / 0 / 6 | 0.00 | armco / 22 | 16.0 / 22.0 | Fitted |
| 10 | 2892 | rounded | 19 / 3 / 6 | 0.12 | covered / 28 | 19.0 / 27.9 | 2025 FIA right strip |
| 11 | 3130 | flat | 15 / 0 / 6 | 0.00 | armco / 21 | 1.1 / 1.5 | Fitted |
| 12 | 3501 | rounded | 24 / 0 / 7 | 0.00 | armco / 31 | 24.0 / 31.0 | Fitted; rounded profile referenced |
| 13 | 3744 | rounded | 26 / 0 / 8 | 0.00 | armco / 34 | 26.0 / 34.0 | Fitted; rounded profile referenced |
| 14 | 3921 | rounded | 25 / 3 / 7 | 0.12 | covered / 35 | 24.8 / 34.7 | 2025 FIA earlier exit strip |
| 15 | 4266 | red-white | 21 / 0 / 6 | 0.00 | armco / 27 | 21.0 / 27.0 | Fitted |
| 16 | 4707 | red-white | 24 / 3 / 6 | 0.12 | covered / 33 | 24.0 / 30.0 | 2025 FIA exit strip |

T1/T2 gravel is a historical F1 reference. The four near-edge strips at
T6/T10/T14/T16 follow 2025 FIA notes. Rounded profiles at T1/T2/T4/T10/T12–
T14 follow the 2024 Formula 1 description; their geometry is cosmetic.
Main-straight concrete walls and maroon accent strips follow the same
planner. No laser survey was available for extents, offsets or widths.

## Lighting and placement

The entire lap has a fixed illumination texture, including scenery and
new cars. The 238 instanced masts have bright heads and baked glow.
Two extra fixed lights supplement the existing sun and hemisphere; there
are no per-mast lights or Lusail shadow casters. The effects switch leaves
a simpler lit night. Wet modes use darker sand and gravel, lower paint
grip, rain and asphalt reflections; the existing dynamic weather schedule
is unchanged. Visual motion is throttled; scene resources are disposed
when switching venue.

The planner reserves full oriented footprints (including roof and prop
overhang), then places small props and vegetation. It checks the racing
ribbon plus runoff, the external game pit lane and 7,053 cached access
segments, including other raceway branches. Overpasses use separate
clearance-fitted supports; bridges do not turn into flat-track walls.
Architecture and smaller props share procedural materials, and repeated
fixtures, spectators, plants and tents are instanced.

## Verification

- Syntax and module imports; undefined names and shadow checks; Node and
  Vercel production builds. Browser startup, parked dry grid and wet
  Turn 1 outlap, and lighting fallback: no captured console warnings or errors.
- 811 reserved scenery footprints: minimum conservative clearance
  1.51 m to reserved corridors; smallest measured
  barrier-to-racing-edge clearance 1.09 m.
  Pebble footprints were at least 0.74 m clear.
  The lowest measured overpass clearance above the racing surface was
  13.65 m; actual bridge heights are fitted.
- 25,252 shared rendered runoff quads and
  7,632 visible access patches checked against other road branches,
  the pit and reserved building footprints; zero forbidden overlaps.
  All 16 corner stacks had rendered kerb, paint, asphalt and sand coverage;
  all six specified gravel zones had rendered gravel.
- 6,124 wall, fence and structure segments matched
  rendered vertices to the shared collision envelopes (maximum vertex
  deviation 0.037 mm) and resolved a contact case.
  Original elevation range 6.55 m; maximum adjacent
  change 0.142 m over the retained 3 m samples.
- Four pit regression cases passed, including late legal entry, full transit
  and penalty service. Transit lost 18.00 seconds against
  the existing dry racing reference, excluding tyre service.
- 184 environment mesh submissions estimated after batching
  for the scenery group, excluding the base terrain, racing ribbon, barriers
  and cars. The scene has 9,809 spectators,
  440 plants, 59 flags, and 60 tents.
  The lighting controller was checked dry, damp, wet and with the fallback.
  This is a scene count, not a GPU frame-time benchmark.
- The game test suite was neither run nor edited. Full-lap driving,
  multiplayer and a live dynamic-weather lap transition were not played.

## References and uncertainties

[FIA circuit map](https://www.fia.com/system/files/decision-document/2025_lusail_event_-_circuit_map_-_qatar_2025.pdf) ·
[FIA runoff notes](https://www.fia.com/system/files/decision-document/2025_qatar_grand_prix_-_race_directors_event_notes_v2.pdf) ·
[Formula 1 kerb reference](https://www.formula1.com/en/latest/article/what-tyres-will-the-teams-and-drivers-have-for-the-2024-qatar-grand-prix.3wg5fMRihKy4tF17WRrDvw) ·
[Venue stand names](https://www.lcsc.qa/news/lusail-international-circuit-announces-early-bird-promotion-formula-1-qatar-airways-qatar) ·
[OpenStreetMap geometry](https://api.openstreetmap.org/api/0.6/map?bbox=51.443,25.482,51.466,25.499) ·
[SRTM90m](https://www.opentopodata.org/datasets/srtm/).

The corner numbers are FIA numbers matched to approximate game stations.
The fitted stand footprints, building shapes, bridge deck heights, pole
spacing, gravel depth and exact runoff boundaries are approximate. The OSM
access widths without source tags use road-class defaults. No Lusail photos
accompanied the request. Five SRTM90m spot checks returned 10–13 m above sea
level, supporting the low relief but not resolving drainage or kerb detail.
