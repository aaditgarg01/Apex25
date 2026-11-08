# Portimão environment audit · 2.55.0

## Layout and baseline

The retained `pt-2008` centreline measures 4,656.79 m clockwise with 1,553
samples. Its 15 turns match the Portuguese Grand Prix layout on the
[2021 FIA map](https://www.fia.com/sites/default/files/doc_1_-_2021_portuguese_grand_prix_-_circuit_map_1.pdf),
which lists 4,653 m. The operator's
[technical page](https://autodromodoalgarve.com/the-park/racing-track/)
describes a 4,684 m, 16-turn configuration. The FIA map is the reference for
this release's corner numbering.

| Item | Before | Evidence and action |
| --- | --- | --- |
| Centreline and direction | Correct | FIA race map and the retained game samples agree on layout and direction. |
| Road elevation | Approximately right | The cached SRTM profile spans 31.58 m. A 27-point Mapzen check gave 1.46 m RMS and 3.38 m maximum difference. All road elevation anchors carry over. |
| Terrain and horizon | Approximately right | The previous relief followed the track. A cached Mapzen grid now shapes the surrounding bowls and the distant Monchique ridge, with road and pit clearance enforced on the terrain mesh. |
| Pit side and access | Correct side, approximate buildings | OSM way 38167081 anchors the garages on the driver's right. The fitted 200 m building runs parallel to the retained pit lane. |
| Main grandstand | Approximately right | The mapped stand footprint and the operator's photos informed the split tiers and white canopy. The side stands and grass-bank seating use positions fitted from the operator's event map. |
| VIP tower and paddock | Missing as distinct landmarks | OSM way 157736297 and the operator's tower photo anchor the circular four-balcony model by the Turn 5 area. Other mapped buildings supply paddock, hospitality and control-room anchors. |
| Runoff, gravel and grass | Generic | Shared per-side strips provide tarmac, edge paint, grass, red earth and gravel. Race control documents Turn 1 gravel. Widths and depths in the table are fitted. |
| Barriers and fences | Generic | The shared plan supplies covered tyres, Armco, pit concrete and fencing. Mapped perimeter segments are clipped clear of road branches and runoff. |
| Pedestrian crossings | Missing as a coordinated set | Four mapped pedestrian crossings have fitted deck heights and clear support locations. The overhead start gantry uses the same placement checks. |
| Track furniture and fan areas | Generic | Corner and distance boards, marshal/fire points, flag panels, timing and floodlight masts, camera cranes, medical bays, fan tents, service paths and Portuguese flags now follow the venue placement plan. |
| Lighting and surface weather | Generic | Algarve sun, haze and an Atlantic rain palette now drive the environment. Existing wet reflections and dynamic-weather timing are used. |

## Corner runoff

Distances are metres from the retained asphalt edge at the dominant side
before local clearance clipping. The opposite edge and straight sections use
base bands, tapered around mapped roads, barriers and the external pit lane.
Each corner includes edge paint, the listed kerb, an apron, grass/red-earth
transition, barrier and a service verge. Each nonzero gravel depth describes
the centre of the depression. Every number in the table is fitted.

| Turn | Kerb | Tarmac | Gravel width × depth | Grass | Barrier and target setback | Evidence |
| ---: | --- | ---: | --- | ---: | --- | --- |
| 1 | serrated | 9 | 15 × 0.18 | 3 | Covered tyres · 28 | Gravel documented, dimensions fitted |
| 2 | flat | 5 | — | 6 | Armco · 12 | Fitted |
| 3 | serrated | 7 | 11 × 0.17 | 4 | Covered tyres · 23 | Fitted |
| 4 | red-white | 8 | 6 × 0.13 | 5 | Armco · 20 | Fitted |
| 5 | serrated | 8 | 15 × 0.20 | 4 | Covered tyres · 28 | Fitted |
| 6 | flat | 4 | — | 6 | Armco · 11 | Fitted |
| 7 | red-white | 6 | 8 × 0.16 | 4 | Armco · 19 | Fitted |
| 8 | serrated | 8 | 12 × 0.18 | 4 | Covered tyres · 25 | Fitted |
| 9 | flat | 7 | — | 7 | Armco · 15 | Fitted |
| 10 | red-white | 8 | 10 × 0.17 | 4 | Covered tyres · 23 | Fitted |
| 11 | red-white | 7 | 8 × 0.16 | 4 | Covered tyres · 20 | Fitted |
| 12 | flat | 7 | — | 7 | Armco · 15 | Fitted |
| 13 | serrated | 7 | 9 × 0.17 | 4 | Covered tyres · 21 | Fitted |
| 14 | red-white | 8 | 11 × 0.18 | 5 | Covered tyres · 25 | Fitted |
| 15 | flat | 11 | 14 × 0.18 | 5 | Covered tyres · 31 | Fitted |

The shared polygons drive rendering, off-track grip and track limits. On a
dry track, a sustained excursion in the probe cost 0.5 s on tarmac and 1 s
on grass, dirt or gravel. Gravel slowed the car more than grass. Rain lowers
grip on the same surfaces, with additional loss on slopes in the grass and
red earth. Kerbs use the painted grip treatment. Turn 2 has small remnants of
the adjoining gravel tapers. It has no dedicated trap.

## Placement and performance

- All 550 scenery reservations use complete horizontal footprints, checked
  against the full racing, pit and mapped access network, plus runoff, barriers
  and other sites. All 15 mapped structures were placed. Three minor ones
  needed smaller footprints. Grass banks and forest groves leave the approach
  to the major crests open.
- Instanced assets include 7,666 spectators, 267 trees, 77 scrub patches,
  61 flags, 15 tents, 17 vehicles and 466 gravel stones. Static scenery is
  batched spatially. Three parked views submitted 101, 116 and 121 draw calls,
  respectively. These are renderer counts for the sampled views.
- Dry summer lighting uses the existing shared sun and hemisphere light.
  Weather and surface effects use local materials. Flag, marshal and smoke
  updates use the existing throttled loop. The new scenery uses cached data.

## Verification

| Check | Result |
| --- | --- |
| Syntax, undefined names, shadowing and module imports | Passed. |
| Local and Vercel production build scripts | Passed. |
| Complete scenery footprint clearance | Minimum conservative pad of 4.67 m to the racing ribbon, 9.43 m to the pit ribbon and 0.78 m to mapped access. Rendered scenery stayed inside the reserved footprints. |
| Bridges and barriers | Minimum pier clearance of 9.46 m race, 1.38 m pit and 0.38 m access. Minimum deck headroom of 7.80 m over race, 7.80 m over pit and 5.00 m over access. The 6,020 wall, fence and bridge pieces used their collision records in rendering, within 0.00006 m. All 6,020 contact probes registered. |
| Terrain continuity | 31.58 m road elevation span, sampled gradients from −12.03% to +9.66%, largest consecutive road-height change 0.362 m over about 3 m, and 0.004 mm height difference across the sampled start/finish seam. No terrain intersection at sampled road and runoff vertices and centres. Minimum vertical margin 0.23 m across those samples. |
| Runoff | All 15 corner stacks passed. No overlap between the 16,503 runoff polygons and the racing ribbon, pit lane, mapped access or placed building footprints. |
| Pit and recovery | Confirmed no false braking before entry, successful late entry, clear pit travel and exit, a valid pit lap and 17.99 s transit loss excluding service. Track-limit and recovery probes passed. |
| Practice starts | Turn 1 drop, climbs and final corner resolve through room settings and local session spawn logic. |
| Parked WebGL | Dry Turn 10 approach, wet Turn 5 aerial and dynamic-weather pit straight at intermediate wetness loaded without console warnings or errors. |

The game test suite was left for the player. Full laps, a live dynamic
weather transition and frame rate across a range of devices remain to be
verified. The exact corner-by-corner surface dimensions, temporary stand
layouts, pit-building envelope, bridge headroom in the real venue, and
locations of small props are fitted. The skyline ridge uses the DEM, while
the villas, groves and other distant details are stylised. The saved
centreline, road elevation, car model, pit route and multiplayer message
format carry over.

See [Track sources](../TRACK-SOURCES.md#portimão-environment-2550) and
[Data licence](../TRACK-DATA-LICENSE.md#portimão-cached-venue-data-2550).
