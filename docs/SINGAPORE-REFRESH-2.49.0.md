# Marina Bay Street Circuit refresh (2.49.0)

The saved game lap is the anticlockwise, 19-turn, post-2023 configuration.
Its sampled length is 4,948 m. The 2025 FIA map lists 4,927 m. The long
bayfront straight bypasses old Turns 16–19 by the floating platform.
The modern Turns 10–11 and the civic and memorial sections still belong
to the lap. The environment uses the existing racing ribbon, pit route,
car, handling equations and multiplayer protocol.

## Audit of the 2.18.0 environment

| Existing feature | Status | Evidence and action |
|---|---|---|
| Circuit variant | Correct | FIA 2025 numbering and the saved bypass line match the 19-turn configuration. |
| Reservoir and river | Correct | Existing OSM relations 9542146 and 9569901 supply the water outline. Retained one throttled, rippled reflection. |
| Three hotel towers and skypark | Approximately right | Existing OSM tower footprints and roof deck align with the bay shore. Retained the locations and improved the tapered tower silhouette. Upper pool and garden remain procedural. |
| Lotus museum | Missing | Added a fitted ten-petal model at OSM node 11361584770. Its footprint is compressed to clear pedestrian routes. |
| Financial district and aviation lights | Approximately right | Reused emissive window textures, mapped outlines and tagged heights. Fitted close shapes, excluded conflicts and batched the retained city. |
| Observation wheel | Correct | The mapped Flyer sits at OSM node 13725008268. Its 165 m height, 150 m diameter and 28 capsules follow the operator. The checked foundation assemblies support the retained landmark, with instanced rotating cabins. |
| Esplanade | Approximately right | Both mapped shells were already modeled. Their fitted base footprints and original metallic sunshades follow the venue's twin-domed silhouette. |
| Fullerton, City Hall and old court | Approximately right | Retained the mapped heritage massing and copper-green court dome. City Hall and former court use tighter footprints around adjacent access ways. |
| Padang, cricket club and memorial park | Missing in part | Added a clipped Padang lawn, clubhouse, Cenotaph, Lim Bo Seng memorial and four-column Civilian War Memorial. The legacy park outlines still supply greenery where they clear roads. |
| Anderson, Esplanade and pedestrian bridges | Missing in part | The roadway crosses the river. The new bridge structures use mapped reaches for Anderson and Esplanade, and mapped spans for Cavenagh, Jubilee and Helix. Rails, deck bodies and piers have matching collision records. |
| Pit and paddock | Approximately right | Old mapped pit extrusion lacked corridor fit. The new block follows OSM way 49890775 and the game pit axis, with 41 garage bays, an upper gallery and podium signage. The fitted block is 330.6 m by 16.0 m, at a nominal 2 m apron gap. |
| Grandstands and fan zones | Wrong or missing in part | Four old stands omitted several promoter viewing areas. Eleven fitted areas cover Pit, Super Pit, Turns 1–3, Stamford, Padang, Connaught, Esplanade, Promenade and Bayfront. Three fan zones and a medical position fit around them. |
| Walls, fences and runoff | Wrong | The old common offset and decorative corner tyres did not describe individual corners. The new planner generates fitted setbacks, covered protection, concrete and mesh; openings stay clear of other branches. |
| Street furniture, planting and dressing | Approximately right | Kept the theme of orange posts, cranes, flags, tropical trees and phone glints. Added checked lamps, traffic signals, benches, bins, bollards, planters, local walks, drain covers, repaired asphalt, blue safety lines and generic event boards. |
| Lighting | Approximately right | Kept the world-space field and changed mast shapes, checked the complete light footprint, retained a warm/cool grade and added a fallback switch in setup and pause. The promoter documents 1,618 real projectors. |

## Corner wall and runoff table

The station is measured along the **game** centreline. Width and setback
are target metres outside the white line on the outside of the bend.
Inside edges use a narrow painted margin, kerb and concrete protection.
Escapes are fitted paved recesses. The geometry is clipped at pit lanes
and mapped crossings, so actual widths and lengths can be smaller.
The wall segment column counts installed segments near the corner on
both sides. The FIA map and photographs verify the route, numbering,
blue safety-line treatment and sections of kerb/paint. Temporary barrier
setbacks, exact kerb profiles and escape sizes use fitted estimates.
The data records zero gravel at every turn.

| Turn | Station (m) | Kerb | Runoff / target width (m) | Barrier / target setback (m) | Wall segments near turn | Width evidence |
|---:|---:|---|---|---|---:|---|
| 1 | 303 | 55 | escape / 4.4 | covered / 4.8 | 61 | Fitted |
| 2 | 384 | 20 | paint / 1.4 | concrete / 1.8 | 37 | Fitted |
| 3 | 441 | 17 | tarmac / 3.2 | covered / 3.6 | 41 | Fitted |
| 4 | 582 | 24 | paint / 1.2 | concrete / 1.6 | 36 | Fitted |
| 5 | 865 | 56 | tarmac / 2.6 | covered / 3.0 | 77 | Fitted |
| 6 | 1340 | 86 | paint / 1.1 | concrete / 1.5 | 93 | Fitted |
| 7 | 1676 | 37 | escape / 4.4 | covered / 4.8 | 38 | Fitted |
| 8 | 1892 | 33 | tarmac / 2.5 | covered / 2.9 | 43 | Fitted |
| 9 | 2093 | 43 | paint / 1.8 | concrete / 2.2 | 65 | Fitted |
| 10 | 2558 | 28 | tarmac / 2.4 | covered / 2.8 | 30 | Fitted |
| 11 | 2669 | 14 | paint / 1.3 | concrete / 1.7 | 27 | Fitted |
| 12 | 2750 | 22 | paint / 1.1 | concrete / 1.5 | 49 | Fitted |
| 13 | 2951 | 45 | escape / 3.3 | covered / 3.7 | 45 | Fitted |
| 14 | 3506 | 53 | escape / 4.0 | covered / 4.4 | 66 | Fitted |
| 15 | 3728 | 27 | paint / 1.5 | concrete / 1.9 | 42 | Fitted |
| 16 | 4231 | 10 | tarmac / 3.1 | covered / 3.5 | 19 | Fitted |
| 17 | 4300 | 22 | tarmac / 2.0 | concrete / 2.4 | 37 | Fitted |
| 18 | 4591 | 37 | tarmac / 1.9 | concrete / 2.3 | 63 | Fitted |
| 19 | 4693 | 24 | tarmac / 2.1 | concrete / 2.5 | 35 | Fitted |

The FIA documents localized patching at Turns 5, 6, 13 and 14, and blue
Safety Car and pit-entry lines. Cosmetic detection and sector paint is
based on the map. Game timing and pit control continue to use the
existing rules. The shared surfaces feed both visuals and handling.
The tarmac runoff multiplier stays close to the road value, paint loses
more wet grip, and exceeding the track limit still invalidates a lap.

## Verification

| Check | Result |
|---|---|
| Source | Syntax, unresolved-name and shadow checks passed. Imported 18 changed modules and checked the browser entry point in a local preview. |
| Builds | Both production builds passed. |
| Complete placement | 571 fitted scenery envelopes and 375 city outlines checked against the racing ribbon, pit and 26,956 access segments. No detected modeled-envelope overflow. |
| Minimum measured conservative clearance | City outlines 0.30 m, stands 1.33 m, pit building 1.24 m, street props and light supports 0.71 m, bridge/gantry supports 1.13 m. Minimum checked overhead road clearance 8.11 m. |
| Runoff and access | 6,364 rendered runoff, paint, kerb and pavement quads checked with no prohibited road or building overlap. Each of the 19 corner stacks had rendered kerb, paint, asphalt and a fitted barrier. Rendered 3,749 additional clipped side-street and walkway patches. |
| Collision | 4,798 wall, fence and structure records matched rendered geometry and responded to contact probes. Maximum renderer vertex difference 0.082 mm. Pit corridor was sampled through the entrance and exit. |
| Pit timing | Four regressions passed, including early request, late legal entry, transit and penalty service. Measured time loss 17.99 s before service. |
| Lighting and performance | 227 instanced supports, 1,362 emissive heads, 11,358 spectators, 66 trees, 66 planters, 68 flags. Two additional fixed lights when enabled, zero per-pole lights and one throttled reflector. Estimated 385 scene submissions after batching before view culling and reflection passes, excluding the base road and cars. This is a scene count. |
| Weather and browser | Dry grid, wet Sector 3 and the night fallback checked while parked. No captured console warnings or errors. Damp, wet and fallback light states were checked in isolation. A simulated leader-progress check confirmed the existing whole-lap dynamic weather boundaries. |

Full-lap driving, simultaneous multiplayer and GPU frame-time measurement
remain unverified. The game test suite was outside the requested verification scope.

## Uncertainties

The OSM extract and promoter map locate venues and viewing areas. The street
index reserves mapped branches and clips access patches at the playable lanes.
Co-located, parallel stretches of the mapped raceway and mapped pit lane are
represented by the retained game ribbons. Missing OSM road widths use class
defaults. Temporary
stand extents, crossbar count, bridge heights and shapes, wall offsets and
precise kerb dimensions are fitted. The clinic, podium and garage facade use
original styling. An auxiliary retail block near the wheel and one background
tower were omitted when their envelopes conflicted with access ways. The wheel
itself remains visible. The museum uses about 60% of its nominal footprint
at the mapped anchor. The cricket club and three memorial placements needed
clearance shifts of up to 18 m. The scale of their surrounding plazas is
approximate.

Five SRTM90 spot checks returned 11–24 m absolute. The saved SRTM anchors
span 27.62 m with a maximum 0.411 m step in the sampled
game lap. Urban surface DEM at 90 m cannot resolve the bridge decks, road
crowns or exact camera sightlines. No surveyed local grades were available.
No Singapore photos accompanied this request. The FIA pit-lane photos and
public venue architecture were the visual references.

## References

- [FIA Singapore 2025 centreline, pit lane, site photos and emergency exits](https://www.fia.com/system/files/decision-document/2025_singapore_grand_prix_-_event_notes_-_circuit_map_pit_lane_emergency_exits_map_and_quarantine_zone.pdf)
- [FIA Singapore 2025 Race Director notes v2, resurfacing and safety lines](https://www.fia.com/system/files/decision-document/2025_singapore_grand_prix_-_race_directors_event_notes_v2.pdf)
- [Formula 1 post-2023 layout change](https://www.formula1.com/en/latest/article/singapore-grand-prix-set-to-feature-revised-track-layout-in-2023.6KsrU6hQw3hxrVJ6zKeJ74)
- [Singapore GP promoter circuit-park and grandstand map](https://singaporegp.sg/media/2023/circuit-park-map/2023-09-16-circuit-park-map.pdf)
- [Singapore GP LED installation, 1,618 projectors](https://singaporegp.sg/media/2023/press-release/20230609/Annex_A.pdf)
- [OpenStreetMap Singapore civic district, bay and access extract](https://api.openstreetmap.org/api/0.6/map?bbox=103.8482,1.2799,103.8673,1.3002)
- [Hotel towers, SkyPark and lotus museum architectural reference](https://www.marinabaysands.com/guides/exceptional-experiences/marina-bay-sands-architecture.html)
- [Singapore Flyer dimensions and capsule count](https://www.singaporeflyer.com/en/fun-facts)
- [Esplanade twin sunshade domes](https://www.esplanade.com/about-us/our-story/architecture)
- [URA National Gallery colonnades and Padang](https://www.ura.gov.sg/-/media/Corporate/Guidelines/Conservation/Best-Practices/Vol-8-Managing-Change.pdf)
- [National Heritage Board Singapore River bridges](https://www.nhb.gov.sg/-/media/nhb/files/media/releases/new-releases/15-oct-2019-singapore-river-bridges-gazette.pdf)
- [National Heritage Board Esplanade Park memorials](https://www.nhb.gov.sg/~/media/nhb/files/places/sites%20monuments/public%20programmes/monument%20open%20house/monument_open_house_brochure_2012_d.pdf?la=en)
- [OpenTopoData SRTM90m](https://www.opentopodata.org/datasets/srtm/)
