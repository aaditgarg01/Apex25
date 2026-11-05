# Monza Royal Park environment — 2.41.0

This replaces the generic Monza scenery for `it-1922`. The exact clockwise
5,793.044m sampled centreline, 17m game road width, elevation anchors and generated
pit route are retained. The game width is wider than the 10–12m described by the
older official brochure; it is intentionally not changed in this environment pass.
Original game elevation relief is 17.86m; nine fresh SRTM 90m samples span 16m.
That is a coarse consistency check, not a surveyed road or justification for new
banking/camber. No elevation values or tyre balance profiles are changed.

## Landmarks, park and event dressing

- OSM pit way **34404652**, facing garages, glass hospitality/control levels,
  original pit/garage signage and a generic podium above the frontage. The
  source building is ~25.3×230.5m. The fitted reserved model is ~27.53×220.40m,
  shifted ~41.18m and aligned to the existing generated external pit axis.
  Actual rendered building is inset within that complete envelope. The mapped
  podium way 219396377 is retained as reference; the safe podium model is fitted
  into the pit footprint rather than placed across the live road.
- **28 mapped stand envelopes**, including main-straight stands, Alta Velocità,
  Lesmo/Ascari and Parabolica areas, plus five fitted open viewing terraces.
  Roofs, deck heights, exact temporary seating and stand labels remain original
  approximations. Mapped models can shift up to 68m or shrink to fit retained
  road/service corridors. Seats face the associated racing branch.
- **24,219 instanced fans**, mostly red, Italian tricolores and original red
  banners, wet umbrellas, restrained cosmetic red smoke and video screens.
  No horse emblem, team artwork, real sponsor or official venue signage is copied.
- **2,706 complete-crown tree reservations** following cached woodland outlines;
  broadleaf crowns/trunks use shared procedural leaves with taller silhouettes,
  scattered pines, instanced shrubs/leaf litter and 4,400 grass tufts. Fifteen
  complete multipolygon woodland rings were joined from OSM members, respecting
  inner clearings. Incomplete rings are not invented. Species and tree spacing
  are artistic rather than a tree survey.
- Spatial forest cells use detailed near trees and simpler distant canopy
  geometry, with one LOD level active at a time. Forest and crowds are instanced;
  static boxes and mapped meshes are batched, cosmetic updates throttled to 80ms,
  and circuit cleanup disposes assets. An original checked placement cache avoids
  searching thousands of forest sites on every load. Its signature covers the
  road/elevations, corridor/runoff data and source architecture/woodland data;
  a mismatch falls back to the complete placement planner. Placement-rule revision
  must be bumped when changing envelopes or planner rules.
- One safely fitted temporary campsite (72 tents, 12 caravans), two parking
  clusters fitted near cached parking references, generic low-rise town buildings,
  17 marshal/LED stations, five camera/recovery cranes, 150/100/50 boards, corner
  signs, timing/light poles and generic colour-block boards. Camps are not claimed
  as a verified event layout. One optional hospitality building, a viewing terrace
  and a second camp are omitted; two initial parking anchors were replaced by
  smaller fits near mapped parking areas.

## Historic banking and documented bridge

The north and south historic concrete curves use cached OSM source alignments,
including ways 19982933, 19983025, 34404730, 231256009 and 725687994. Some source
ways are tagged `note=draft`; these are not surveyed engineering outlines.
The official history describes an approximately 80% maximum grade; the official
brochure gives a 6.2m rise and 82% maximum grade. A fitted 15.2m-wide progressive
cross-section rises to 6.2m, approximated with 16 narrow solid steps, cracked/mossy
concrete artwork and rust-coloured upper rail remnants. Exact local section,
support construction and remnant condition are approximate; the model represents
solid stepped masses rather than a scanned hollow reinforced-concrete structure.

**240 bank patches / 4,080 shared solids** are included; **57 candidate patches**
near active roads/service crossings are omitted. The banking is a static obstacle,
never a second driving ribbon. Its own mapped historical curve is the source
alignment of the asset; it is excluded only from that asset's own clearance check.
All other racing, pit, service and historic road branches remain reserved. Other
scenery and trees reserve both the complete old-road corridors and bank envelopes.

Footbridge way **194458112** is modelled over the approach to Parabolica. OSM
verifies the crossing location, not the height. Supports are extended to a fitted
64m span, each complete pier footprint clears the reserved ground routes, and the
deck deliberately spans the road with a measured minimum underside clearance of
**8.60m** against the retained road. The height and extended supports are artistic.
Deck, piers and rails use the same renderer/contact solid list. Other mapped
underpasses/footways remain cached references, not new driveable roads or invented
tunnels cut into the unchanged track mesh. No unverified Villa Reale or named
church silhouette is added; town buildings remain generic.

## Per-corner runoff plan

All rows have low red/white revised apex/exit kerbs and restrained serration.
The 2024 replacement kerbs are not represented as exaggerated old tall blocks.
Numbers below are metres outside the racing edge: **paved / gravel / grass**.
The paint lies within paving. Broader trap widths, barrier distances/styles and
longitudinal limits are fitted approximations, not certified safety specifications.
The sampled fitted widths are at the corner station; transitions and access/pit
masks vary along the corner. `covered` is protective tyre artwork on shared solids.

| Turn | Target paved/gravel/grass | Barrier / target edge distance | Fitted widths at station | Status |
| --- | --- | --- | --- | --- |
| T1 Rettifilo right | 16 / 19 / 5 | covered / 40 | 11.84 / 14.06 / 3.70 | Masked access opening |
| T2 Rettifilo left | 10 / 14 / 5 | covered / 29 | 0.48 / 0.68 / 0.24 | Fitted |
| T3 Biassono / Grande | 2 / 0 / 7 | armco / 9 | 2.00 / 0.00 / 7.00 | Fitted |
| T4 Roggia left | 12 / 18 / 5 | covered / 35 | 12.00 / 18.00 / 5.00 | Fitted |
| T5 Roggia right | 5 / 15 / 6 | covered / 26 | 3.73 / 11.20 / 4.48 | Fitted |
| T6 Lesmo 1 | 2 / 18 / 5 | covered / 25 | 2.00 / 18.00 / 5.00 | Fitted |
| T7 Lesmo 2 | 2 / 20 / 6 | covered / 28 | 1.76 / 17.61 / 5.28 | Fitted |
| T8 Ascari entry | 2 / 17 / 5 | covered / 24 | 1.82 / 15.44 / 4.54 | Fitted |
| T9 Ascari middle | 2 / 16 / 5 | covered / 23 | 0.98 / 7.85 / 2.45 | Fitted |
| T10 Ascari exit | 2 / 22 / 6 | covered / 30 | 0.09 / 1.03 / 0.28 | Masked access opening |
| T11 Alboreto / Parabolica | 16 / 22 / 7 | covered / 45 | 1.80 / 2.47 / 0.79 | Fitted |

The FIA-documented **2.5m strip at T2 LHS** and **2.5m strip between T4/T5 RHS,
1m from the edge**, are explicit additional bands. Their longitudinal spans are
approximate. The separate access variant at Rettifilo is classified as an escape
area for runoff, not a new driveable course; architecture still reserves its
corridor. Broad tarmac/gravel areas at heavy-braking/exit zones are interpretive
fits from official context and layout rather than mapped gravel polygons.
No gravel polygon was identified in the downloaded OSM surface tags.

Long edges retain paved shoulders and grass before Armco/catch fencing. One shared
plan caps/masks surfaces against racing branches, the external pit lane, service
roads and historical routes. It drives rendering, scenery reservations, wall
placement, wet-grip/drag classification, existing track-limit penalties and guide
speed sampling. Tarmac has near-normal grip and a reduced penalty; gravel slows
heavily, grass is slippery especially wet, and paint loses wet grip. Existing
track-limit invalidation/recovery code and the physics core are retained, with
only the circuit-specific surface hook added. No multiplayer packet format changes.
Original **VELOCITA** runoff lettering, racing-line rubber, braking marks, red/white
kerbs and the normal grid/start/pit-lane dressing are included.

## Atmosphere and practice starts

Warm Italian late-summer light, green woodland, pale valley haze and soft golden
shadows are layered over the existing dry/damp/wet/dynamic whole-lap weather.
Rain darkens the atmosphere and verges, uses existing rain/spray/reflection effects,
adds umbrellas and low cosmetic mist, and suppresses smoke. Scheduling is unchanged.
Free Practice adds **Rettifilo approach (420m)**, **Lesmos approach (2070m)** and
**Parabolica approach (4700m)**. Part-circuit starts remain untimed out laps.

## Verification and performance

- Syntax, strict new-module undefined-name/shadow checks, existing-file lint with
  established allowances, browser/server imports, `npm run build`,
  `npm run build:vercel` and whitespace checks passed.
- **2,913 complete site reservations**, **5,414 access-road segments**; zero
  rejected required placements, blocked footprints or actual mesh/instanced bounds
  escaping their reserved footprints. Minimum scenery clearance **2.489m**;
  minimum complete tree-crown reservation clearance **4.00m**. Minimum sampled
  ordinary barrier-edge clearance to the driving ribbon **0.907m**.
- Banking: zero blocked included patches; minimum clearance to other reserved
  road corridors **2.136m**. Own historical source alignment exception is explicit
  above. The documented overpass uses a separate vertical-clearance check.
- **3,490 runoff quads**, zero non-local racing-branch, pit/access or building
  overlaps; 285 access-conflicting and 89 additional pit-conflicting candidates
  are masked. The independent building comparison includes 75 footprint polygons.
- **326 static full-car-envelope pit-route probes**: zero wall contacts or route
  deviation. Centreline, source elevations and generated pit geometry are identical
  to the baseline. All 11 turns have a classified surface stack.
- All **11,389 shared wall solids** match renderer source solids, with zero
  missing/extra solids or wall vertex-count discrepancies. The extra bank and
  bridge geometry is included in this parity check.
- Other **41 circuits** retain identical static wall geometry hashes. This is not
  a complete gameplay/scenery regression test.
- Scenery construction: **229 mesh objects including both inactive/active LOD
  levels**, at most **205 mesh submissions with one level selected**, before
  frustum culling and shadow passes; ~2.13M triangles including repeated instance
  geometry and both LOD levels. 1,896 individual boxes become 14 spatial batches.
  These counts exclude cars, road, runoff, safety walls and UI. No FPS benchmark
  is claimed. Precomputed complete placements reduce startup search work.
- Parked dry/wet views and browser-console inspection only. The game test suite
  was neither run nor edited. No driving, multiplayer, wall-impact, recovery or
  dynamic-weather transition playtest is claimed.

## Remaining comparison points

Exact roof/deck designs, temporary stand locations/counts, pit shift/scale, bank
cross-section/supports and omitted crossings, bridge height/span, broad trap
boundaries, campsite arrangements and vegetation species remain approximate.
No user reference photos accompanied this attachment. All local cached reference
geometry and source identifiers remain available; raw photos and official PDF
artwork are not redistributed. This is procedural scenery, not a scan or the
asset fidelity of an official licensed F1 game.

## References

- [Official corner order and straight/circuit character](https://www.monzanet.it/tracciato-pista-monza/).
- [FIA 2025 circuit, pit lane and emergency map](https://www.fia.com/system/files/decision-document/2025_italian_grand_prix_-_event_notes_-_circuit_map_pit_lane_emergency_exit_map_quarantine_zone_and_red_zones.pdf).
- [FIA 2024 revised kerbs, resurfacing and 2.5m gravel strips](https://www.fia.com/sites/default/files/decision-document/2024%20Italian%20Grand%20Prix%20-%20Race%20Director%27s%20Event%20Notes%20V2.pdf).
- [Official historic oval geometry and banking context](https://www.monzanet.it/en/the-flyover-of-monza/).
- [Official brochure: 6.2m raised banking and 82% maximum gradient](https://www.monzanet.it/wp-content/uploads/2023/05/2023_Brochure_Experience_Monza_compressed.pdf).
- [Official stand-area map; 2026 reference, temporary event arrangements vary](https://www.monzanet.it/wp-content/uploads/2026/06/GP_F1_2026_LISTINO_PREZZI_6_17.pdf).
- [Primary team discussion of 2024 kerb and gravel changes](https://www.mclaren.com/racing/formula-1/2024/italian-grand-prix/the-italian-gp-briefing-powered-by-google-cloud/).
- [OSM pits, stands, woodland, access and historic oval snapshot 2026-11-05](https://api.openstreetmap.org/api/0.6/map?bbox=9.265,45.605,9.302,45.640).
- [SRTM 90m source and resolution for unchanged-profile cross-check](https://www.opentopodata.org/datasets/srtm/).
