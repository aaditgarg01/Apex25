# Istanbul Park environment audit · 2.56.0

## Layout and baseline

The retained `tr-2005` centreline is 5,313.21 m long, runs anticlockwise and has
1,772 samples. The FIA and TOSFED publish 5,338 m for the 14-turn GP layout.
Turn numbering follows the FIA map, with metre stations fitted to the game
centreline. The driving ribbon, saved road elevations, car model, pit lane and
multiplayer message format carry over. [2021 FIA circuit map](https://www.fia.com/sites/default/files/doc_1_-_2021_turkish_grand_prix_-_circuit_map.pdf) · [TOSFED circuit specifications](https://tosfedistanbulpark.com/en/the-circuit/)

| Item | Previous treatment | Evidence and change |
| --- | --- | --- |
| Centreline and direction | Correct GP configuration | Same racing ribbon and corner order. Added three Free Practice approaches. |
| Road elevation | Approximately right | Retained the existing SRTM samples and compared 31 stations with the independent local cache. The in-game profile spans 42.55 m. |
| Hills, earth and coastline | Generic | The cached elevation grid shapes the immediate hills and a coarser south-facing Marmara backdrop. Earth cuts, meadows, scrub and urban silhouettes are fitted. |
| Pit, race control and paddock | Generic | OSM way 295742112 anchors a 344 m building parallel to the pit. The photos inform the arched glazing and twin canopy-topped end towers. The upper concourse is a fitted interpretation of the building, and the mapped real pit-road branch is separate from the retained playable lane. |
| Main stand and viewing banks | Generic | OSM way 316361269 anchors the main roof and tiers. Mapped bleachers and fitted general-admission banks fill out the rest of the circuit. |
| Runoff and track limits | Generic | The shared plan supplies road-edge paint, kerbs, tarmac, gravel, grass, earth and service verges. The car uses those same classifications. |
| Barriers and crossings | Generic or missing | The solver uses one wall, fence and bridge geometry for drawing and collision. The venue boundary informs fitted fencing. One service bridge is mapped. Turn 1 and Turn 8 footbridge locations and arch shapes are fitted from photographs. |
| Weather and track dressing | Generic | Local sky and mist, damp grass, wet asphalt, mud, puddles, flags, ponchos, umbrellas, pit/grid paint, timing and brake boards, marshal signals, recovery equipment, aid stations, service gates and fan areas. |

Road heights are preserved. The near terrain samples the Mapzen tile on a
50 m grid and blends to the saved road height. The independent comparison
at 31 stations gave 1.57 m RMS and 3.43 m maximum difference. The game
samples ranged from −8.04% to +9.88% grade. TOSFED publishes a maximum
of 8.145%. This difference and the exact crest locations remain survey
uncertainties.

## Per-corner runoff

Widths and setbacks are in metres from the asphalt edge on the dominant
side, before fitting around branches. The opposite side and straights use
base bands. All corners include edge paint, a kerb, grass/red-earth
transition and service verge. The gravel depth is the fitted depression
at the centre of each trap.

| Turn | Kerb | Tarmac | Gravel width × depth | Grass | Barrier and setback | Evidence |
| ---: | --- | ---: | --- | ---: | --- | --- |
| 1 | Double exit | 13 | 14 × 0.18 | 4 | Covered tyres · 32 | FIA double exit kerb. Dimensions fitted. |
| 2 | flat | 5 | — | 6 | Armco · 12 | Fitted |
| 3 | Red/white | 8 | 9 × 0.15 | 5 | Armco · 23 | Fitted |
| 4 | serrated | 8 | 10 × 0.16 | 4 | Covered tyres · 23 | Fitted |
| 5 | Double exit | 9 | 8 × 0.15 | 4 | Covered tyres · 22 | FIA double exit kerb. Dimensions fitted. |
| 6 | Red/white | 7 | 8 × 0.15 | 5 | Armco · 21 | Fitted |
| 7 | serrated | 10 | 13 × 0.18 | 4 | Covered tyres · 28 | Fitted |
| 8 | serrated | 23 | 18 × 0.19 | 5 | Covered tyres · 47 | Wide apron visible. Dimensions fitted. |
| 9 | serrated | 11 | 12 × 0.17 | 4 | Covered tyres · 28 | Fitted |
| 10 | Red/white | 8 | — | 6 | Armco · 15 | Fitted |
| 11 | flat | 10 | 8 × 0.15 | 6 | Armco · 25 | Fitted |
| 12 | serrated | 14 | 15 × 0.19 | 4 | Covered tyres · 34 | Fitted |
| 13 | serrated | 8 | — | 5 | Covered tyres · 14 | Fitted |
| 14 | Double exit | 10 | 10 × 0.16 | 4 | Covered tyres · 25 | FIA double exit kerb. Dimensions fitted. |

The FIA records double exit kerbs at Turns 1, 5 and 14. The Turn 8 apron
covers the four-apex arc and includes a green painted shoulder, raised
kerb segments and darkened rubber along the existing racing guide. Exact
gravel edges, depths, kerb profiles and wall setbacks are fitted.
[FIA race director’s notes](https://www.fia.com/sites/default/files/decision-document/2021%20Turkish%20Grand%20Prix%20-%20Race%20Directors%27%20Event%20Notes%20Version%202.pdf) · [TOSFED circuit overview](https://tosfedistanbulpark.com/en/the-circuit/)

## Placement and performance

- The planner reserved 656 complete footprints against the racing ribbon,
  generated pit lane, mapped road network, runoff, walls and other sites.
  All 25 mapped landmark reservations fitted. All 19 stands and spectator
  banks received a share of the 7,900 instanced spectators.
- The scene uses 318 instanced trees, 80 scrub patches, 104 Turkish flag
  instances, 15 tents, 19 service/fan vehicles, 425 small gravel stones
  and 1,432 rainwear instances. Static scenery uses spatial batches.
  Weather, flags, smoke and the marshal LEDs use throttled updates.
- Final parked measurements were 115 draw calls for the dry Turn 1
  chase view, 88 for the wet Turn 8 aerial and 176 for the wider damp
  paddock view. The wide paddock view exceeds the typical-view estimate.
  These are draw-call counts on the sampled views, not frame rates.

## Verification

| Check | Result |
| --- | --- |
| Syntax, undefined names, shadowing and module imports | Passed. |
| Local build and Vercel build | Passed. |
| Road and placement clearance | Minimum conservative scenery pad of 4.83 m to race, 10.32 m to pit and 0.79 m to mapped access. Geometry stayed inside reserved footprints. |
| Bridge clearance | Minimum pier clearance of 13.29 m to race, 2.41 m to pit and 0.45 m to access. Minimum deck headroom 7.80 m over race and pit, 5.00 m over access and runoff. |
| Wall, fence and bridge collision | All 7,205 pieces matched renderer geometry and returned contact in the geometry probe. Worst vertex difference 0.000066 m. |
| Road and terrain continuity | Largest adjacent road-height step 0.297 m over about 3 m. Start/finish seam changed 0.015 mm over the sampled 2 cm. The smallest sampled vertical terrain gap under road, pit or runoff was 0.23 m. |
| Runoff and track limits | All 14 stacks passed. The 45,526 polygons had no ground-level overlap with the race, pit, access branches or placed sites. The two projected footbridge crossings are vertically separated. Dry probes measured 0.5 s for a sustained tarmac excursion and 1 s on gravel, dirt or grass. Gravel slowed the car more than grass. Recovery cleared the off-track state. |
| Pit entry and exit | No premature braking, successful late entry, clear lane and exit, and a valid pit lap. Measured 18.00 s transit loss before service. |
| Other circuits | All 41 matched the previous release for wall geometry, sampled driving steps and guide speeds in dry, damp and wet conditions. |
| Practice starts | All three spawn stations passed the room-settings and session checks. |
| Parked WebGL | Dry Turn 1, full-wet Turn 8 and the damp state of dynamic weather at the paddock all rendered without console warnings or errors. |

The release uses published FIA and operator references, OSM, and the cached
terrain grid. The submission did not contain photo attachments, so the
reference photos came from the grandstand engineer, Formula 1 and the
circuit guide. The exact pit-to-paddock link, bridge position and span, fitted
stand and gravel dimensions, unnamed corner labels, and distant coastal
sightlines remain approximate. Full driving laps and a weather change across
a live lap were not exercised. The game test suite was neither run nor edited.

[Track sources](../TRACK-SOURCES.md#istanbul-park-environment-2560) · [Data licence](../TRACK-DATA-LICENSE.md#istanbul-park-cached-venue-data-2560)
