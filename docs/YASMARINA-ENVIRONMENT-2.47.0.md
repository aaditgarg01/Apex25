# 2.47.0 — Yas Marina twilight and landmark placement

## Included and retained

The existing `ae-2009` centreline matches the **post-2021 16-corner configuration**, with the reworked T5 hairpin, T9 curve and hotel section. Its official length is 5,281 m; the existing smoothed sampling measures 5,298.702 m. No centreline or elevation source was changed. The original cached SRTM 90 m / OpenTopoData road elevation range remains **6.52 m**. These are coarse existing anchors, not a new survey of a perfectly flat island or an accurate tunnel dip. The car, driving equations, wire messages, pit layout, limiter, timing and tyre service files are retained. Dedicated surface adapters connect the requested runoff types to the established grip/drag/penalty and recovery paths.

New scenery uses cached OSM footprints for the two hotel wings, pits, stands, media building, resorts, unsigned red-roof amusement structure, mall and waterpark. Upper hotel bodies remain at the two mapped centres; eight fitted ground supports and an elevated link give a clear passage. Their facades, heights, shell and LED colours are original procedural interpretations, not scanned architecture. The basin uses the actual three-way coastline with an approximate offshore closure, 65 instanced yachts and a dock. Arena placement was not verified and is omitted. No real sponsor/venue artwork is shipped.

The pit exit is **not rerouted below Turn 1**. The generated lane reconnects beside the main straight; changing it would alter existing pit timing, entry and collision behavior. Instead a short signed covered approach sits over the existing lane body at travel 336–348 m. The elevated roof/support positions are fitted and approximate. No fake dip or external ramp is added where the current road does not support one. This is not a faithful geometric reconstruction of the real pit-exit tunnel.

## Runoff, grass, sand and dressing

Every side of every station has a classified edge stack: kerb/white line, asphalt and turquoise original paint, optional gravel, irrigated grass, sand-coloured margin, shared wall/covered impact protection and fence, then service/drainage/access/landscape. Connecting straights and pit approach have defaults and explicit edge sections. Heavy braking corners have larger target tarmac. Inner curvature folds and all road branches cap the shared widths; complete rendered quads are clipped against racing, pit and every cached access corridor. Tarmac uses normal grip and the existing reduced runoff penalty; paint is slippery when wet, grass loses grip strongly in rain, and sand adds drag. Original racing-line speed calculations query the same surface profile.

**No current racing gravel trap was verified from the current official map/OSM material. All table gravel widths and depths are explicitly zero.** Gravel behavior remains supported if confirmed data is supplied later; service/drainage dressing is not represented as an invented race gravel trap. No reference photographs accompanied the attachment. Radial extents, surface classification and barrier distances below are design fits, not surveyed measurements.

| Turn | Kerb | Target tarmac / gravel / grass / sand (m) | Barrier; target setback (m) | Fitted tarmac / grass / sand at corner (m) | Evidence |
|---|---|---|---|---|---|
| 1 | red-white | 22 / 0 / 3 / 4 | covered; 29 | 2.69 / 0.37 / 0.49 | FIA turn identity; fitted widths |
| 2 | flat | 10 / 0 / 3 / 4 | concrete; 17 | 3.86 / 1.16 / 1.54 | FIA turn identity; fitted widths |
| 3 | red-white | 12 / 0 / 3 / 4 | concrete; 19 | 9.65 / 2.41 / 3.22 | FIA turn identity; fitted widths |
| 4 | flat | 8 / 0 / 3 / 5 | concrete; 16 | 0.70 / 0.26 / 0.44 | FIA turn identity; fitted widths |
| 5 | red-white | 30 / 0 / 3 / 5 | covered; 38 | 30.00 / 3.00 / 5.00 | FIA turn identity; fitted widths |
| 6 | serrated | 32 / 0 / 2 / 5 | covered; 39 | 26.06 / 1.63 / 4.07 | FIA turn identity; fitted widths |
| 7 | red-white | 18 / 0 / 2 / 4 | concrete; 24 | 1.05 / 0.12 / 0.23 | FIA turn identity; fitted widths |
| 8 | flat | 10 / 0 / 3 / 5 | concrete; 18 | 1.43 / 0.43 / 0.71 | FIA turn identity; fitted widths |
| 9 | red-white | 28 / 0 / 3 / 5 | covered; 36 | 17.19 / 1.84 / 3.07 | FIA turn identity; fitted widths |
| 10 | flat | 12 / 0 / 2 / 4 | concrete; 18 | 8.25 / 1.37 / 2.75 | FIA turn identity; fitted widths |
| 11 | red-white | 12 / 0 / 2 / 3 | concrete; 17 | 12.00 / 2.00 / 3.00 | FIA turn identity; fitted widths |
| 12 | red-white | 15 / 0 / 2 / 3 | concrete; 20 | 13.55 / 1.81 / 2.71 | FIA turn identity; fitted widths |
| 13 | red-white | 10 / 0 / 2 / 3 | concrete; 15 | 10.00 / 2.00 / 3.00 | FIA turn identity; fitted widths |
| 14 | red-white | 10 / 0 / 2 / 3 | concrete; 15 | 2.86 / 0.57 / 0.86 | FIA turn identity; fitted widths |
| 15 | flat | 12 / 0 / 3 / 4 | concrete; 19 | 10.95 / 2.74 / 3.65 | FIA turn identity; fitted widths |
| 16 | red-white | 18 / 0 / 2 / 4 | concrete; 24 | 14.36 / 1.60 / 3.19 | FIA turn identity; fitted widths |


Widths are radial metres **outward from the road edge**, with barrier setback equal to the sum of surface widths. Fitted values are the outside corner station only; transitions and the inside edge can be smaller. Paint is a subset of tarmac, not an extra width. Gravel depth is 0 m for all 16 corners. Kerb widths follow the existing ~1 m treatment, serrated at T6; kerb class is approximate.

Dressing includes start/finish and grid boxes, 22 position labels, pit entry/exit and speed markings, safety/sector/detection lines, readable original boards, 200/150/100/50 braking boards at heavy braking zones, all 16 corner numbers, marshal/fire posts and live LED warning panels, cameras/cranes, medical/recovery dressing, service strips, drainage, short cable runs, spare tyres, flags, tents, palms, hedges/flower tufts, subtle sand/marble/oil/skid decals and wet edge puddles. Some large optional sites/stands are omitted or reduced when no complete safe footprint fits; the JSON clearance report lists these decisions. Cosmetic LEDs/flags/reflections are throttled. No game test files were run or edited.

## Twilight and performance

A 360-second **session-clock** transition follows warm late-afternoon → magenta dusk → deep-blue night keyframes. Players can disable it for fixed night in setup or the pause menu, including friends sessions. The existing weather system controls wetness; the venue layers its sky/fog/material treatment on top. Illumination covers the entire lap permanently through an instancing-aware world-space light field, emissive mast lenses/halos and **two added fixed directional fills**. The normal sun and hemisphere bring the measured total to **four real lights**, with zero point lights, no car-following lights and no per-pole shadow casters. The remaining sun shadow is the existing renderer shadow.

Actual geometry audit budget: **5,252 spectators, 718 trees/palms, 214 mast sites, 65 yachts, 67 flags, 48 tents, 3,000 grass tufts**. Spectators are below the proposed 20–25k upper target because complete site clearance took priority over placing large stands in the road/access space. Post-batch maximum environment mesh submissions are **203** (not a measured GPU draw-call benchmark; excludes track/car/shared safety, reflection refresh is an extra pass). Reflection target is 256², refreshed at most every 180 ms. Shared textures, instancing and spatial static batches are disposed on circuit changes. Yas placement uses a conservative spatial index; 2360 placements/probes matched the original full all-branch predicate.

## Requested checks actually performed

- Syntax: 30 changed/new JS modules; imports: 29 modules plus browser entry boot. Undefined-name and shadow checks passed for new modules and touched integration files.
- `npm run build` and `npm run build:vercel`: passed. `git diff --check`: passed.
- Full rendered footprint audit: 1160 sites, minimum corridor clearance **2.004 m**, zero blocked sites or renderer/instance envelope overflow. Includes the full reserved crowd, canopy, mast-head and prop envelopes.
- Hotel supports: eight, minimum all-corridor clearance **2.625 m**. Portal ground geometry: minimum actual-road clearance **0.871 m**. Complete hotel/portal overhead checks: minimum underside/body-road clearance **12.419 m**, across 12,144 road segments.
- Shared walls/fences/rails/structure solids: **4,936** consumed by the real barrier renderer and **4,936** direct contact fixtures resolved. Rendering and contact use the same objects.
- Shared rendered runoff: **14,561** split quads; zero other-road, pit, access or fitted-building overlaps. Every one of 16 corners and both sides of all 1,767 samples has a classified stack.
- Elevation source files unchanged; maximum adjacent sample step **0.1333 m**, maximum retained sampled grade **4.44%**. No new tunnel grade or camber.
- Four focused pit regressions passed: no early slowdown, late legal entry remains valid, complete transit/exit, penalty-inclusive service. Measured non-service loss **17.989 s** against the same dry racing reference; no pit or wire file changes.
- Lighting controller at 0/180/360 seconds: four lights, zero point lights; fixed-night fallback, wet mode, instanced field and light cleanup checked.
- Parked local hotel render inspected in dry twilight and fixed night; pause toggle works; no browser warnings/errors in captured console. This was **not a driven lap, multiplayer session, all-track render sweep or GPU frame-time benchmark**. Driving/playtesting remains manual.

## Montreal and other circuit landmark check

The Montreal fallback scanned the far corner of a rectangle before nearby candidates, unnecessarily displacing landmarks. It now reserves iconic attractions before optional crowds/trees and searches nearest clear positions first. Biosphere map-anchor shift changed **113.14 → 11.31 m**; amusement-park landmark **113.14 → 16 m**. The Biosphere remains roughly 302 m from the nearest circuit centre, and the amusement park roughly 972 m away: their across-water locations are not moved beside the racing road. Montreal's unsigned pavilion complex remains clearance-fitted, not surveyed/scanned. Its first-half fallback shift improves from 89.44 to about 73.76 m while retaining the larger .66 fit.

Measured 11 existing cached placement planners (Montreal, Barcelona, Hungaroring, Imola, COTA, Monza, Mexico City, Red Bull Ring, Silverstone, Miami, Zandvoort); reviewed the older 11 dedicated renderer placement paths (Albert Park, Shanghai, Suzuka, Bahrain, Spa, Monaco, Jeddah, Baku, Singapore, Madrid, Las Vegas) for the same far-corner scan. Silverstone's clubhouse had another size-first relocation: **about 192 → 30 m** anchor shift after nearest-safe fitting. Other distant geographic skylines/landmarks remain at their source locations. Mexico stadium sections are pieces around a perimeter, so distance from the whole-building centre is not treated as a relocation bug. Full safety/renderer-envelope checks passed again for changed Montreal and Silverstone sites; runoff overlap checks also passed. This source/planner audit does not claim every attraction's visibility was verified from a moving car.

## Sources and uncertainties

See `TRACK-SOURCES.md`, `TRACK-DATA-LICENSE.md`, `public/data/track-visual-references.json`, and the source/way IDs in `public/data/yasmarina-architecture.js`. Primary references: [official 2021 revisions](https://www.yasmarinacircuit.com/en/w/ymc-track-changes-1), [FIA 2025 map/pit drawing](https://www.fia.com/system/files/decision-document/2025_abu_dhabi_grand_prix_-_event_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_quarantine_zone_and_red_zones.pdf), [official marina](https://www.yasmarinacircuit.com/en/aboutus/discover-yas-island/yas-marina), [F1 2025 overview](https://www.formula1.com/en/racing/2025/united-arab-emirates), and two cached OSM map extracts, © contributors / ODbL 1.0.

Verified at source level: post-2021 layout identity, official length/turn count, source hotel/stand/pit/coastline anchors. Approximate: all procedural appearance, hotel support locations and raised bodies/link, covered pit approach, radial runoff/kerbs/wall distances, mast positions, smaller stand/mall fitting, offshore boundary, yachts/piers and distant attraction visibility. No current gravel trap, surveyed DEM refinement, real under-T1 routing, arena position or attached-photo match is claimed. Existing pit orientation is parallel to its generated corridor; source footprint is reduced to fit it. The real 2025 event was in December, so the reference's generic late-November description is not treated as a fixed date.
