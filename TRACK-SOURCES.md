# Track geometry, elevation and scenery sources

## Circuit centerlines

40 circuit centerlines from [Tomislav Bacinger / f1-circuits](https://github.com/bacinger/f1-circuits), MIT license, downloaded October 8, 2026. The original 24-calendar collection now includes 16 additional current and historic tracks. Madrid and Jacarepaguá are explicitly included as extra circuits; a historical circuit's scenery does not recreate its historical period. Centerlines are projected to meters and lightly smoothed; official lengths and the driven geometry may differ slightly.

## Spa-Francorchamps elevation

Source: [Circuit de Spa-Francorchamps — 2026 access and circuit map, page 3](https://www.spa-francorchamps.be/assets/e70cff50-ae5d-4aaa-896b-54c8a953a357/all-plan-acces.pdf).

The game uses the published distance/altitude pairs (0 m / 418 m, 890 m / 391 m, 1130 m / 415 m, 1490 m / 446 m, 2470 m / 470 m, 5100 m / 373 m, and the other map markers), aligned to the geographic centerline. Shape-preserving periodic interpolation keeps crests and the start/finish seam smooth. Two additional shaping points between the published markers concentrate the Raidillon ramp to approximately 17%, consistent with the circuit's description of the gradient. These two shaping points are an approximation, not surveyed measurements.

[Official circuit gradient reference](https://www.spa-francorchamps.be/en/search?q=gradient). [Official corner descriptions](https://www.spa-francorchamps.be/en/news/96_the-corners-of-the-spa-francorchamps-circuit). [Official red/yellow curb and runoff colours](https://www.spa-francorchamps.be/en/news/275_the-spa-francorchamps-track-is-decked-out-in-new-colours).

The profile rises and falls by 97 m across these published markers. This is the range of the sampled model, not a claim that every extremum on the real surface has been captured.

## Other elevations

40 circuits use 96 terrain samples each from SRTM 90 m, accessed October 9, 2026 through the [Open Topo Data API](https://www.opentopodata.org/api/). [SRTM dataset information](https://www.opentopodata.org/datasets/srtm/). Two light smoothing passes remove raster stair-steps before periodic cubic interpolation. The cache is included in `public/data/elevations.json`, so play does not depend on the elevation service.

SRTM is terrain data, not a modern laser scan of the asphalt. Buildings, trees, bridges, subsequent resurfacing and coarse sampling can affect the result. Suzuka retains an additional bridge clearance approximation. Widths, camber and detailed bumps are not survey-accurate. Car pitch, gravity-assisted acceleration, road geometry, nearby ground, camera and racing-line pitch use the same height profile. Cars remain attached to the road; suspension and airborne dynamics are not simulated.

## Surroundings

Stylized circuit-specific scenery includes Spa's wooded hills and Raidillon stand, Monaco harbor/tunnel, Suzuka's wheel, Silverstone's Wing-inspired pits, COTA's tower, Bahrain's tiered tower, Yas Marina's canopy and Paul Ricard's red/blue runoffs. These structures are visual approximations, not exact architectural models. Reference pages include [Monza Park](https://www.monzanet.it/en/monza-park/), [Silverstone Wing](https://www.silverstone.co.uk/news/silverstone-wing-shining-light-renewable-energy), [Suzuka park map](https://www.suzukacircuit.jp/map_s/pdf/suzuka_mp_guide_en.pdf) and [Paul Ricard's runoff system](https://www.circuitpaulricard.com/fr/circuit/technologies-et-innovations).

Geographic building and water footprints are cached for Austin, Zandvoort and Estoril from **© OpenStreetMap contributors**, [ODbL 1.0](https://www.openstreetmap.org/copyright), via the public Private.coffee Overpass mirror. Other scenery downloads were unavailable. The raw derived geometry is included under `public/data/scenery/`; those data files remain available under ODbL 1.0. Map attribution is displayed whenever this layer is rendered. Building heights are from tags where available and otherwise estimated. Rendering caps the number of features for performance. OSM snapshots report their source timestamps in the individual files.

## Indian Grand Prix — Buddh International Circuit

The 41st circuit uses the full clockwise Grand Prix loop from [OpenStreetMap relation 2532569](https://www.openstreetmap.org/relation/2532569), fetched October 9, 2026. The six connected main-track ways exclude the pit lane and short-layout connectors; the loop starts at the relation’s mapped start node. © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright). The derived geometry is separately available in `public/data/buddh.geojson` under ODbL; the corresponding feature in the combined collection retains its source and license properties. Existing Bacinger features retain their MIT license. Published GP length: 5.125 km, confirmed by the [FIA Indian GP preview](https://www.fia.com/news/2013-indian-grand-prix-preview-0). Elevation is sampled and smoothed using the same terrain method as other non-Spa circuits, so the artificial track elevation and precise asphalt surface remain approximations.

## Monaco start/finish correction

The existing centerline started near Casino. It is now cyclically re-indexed to the centerline sample nearest [OpenStreetMap start/finish node 4937755860](https://www.openstreetmap.org/node/4937755860) at 7.4212652° E, 43.7350269° N, on Boulevard Albert Ier. Start/finish placement was cross-checked against the [FIA 2025 revised Monaco circuit map](https://www.fia.com/system/files/decision-document/2025_monaco_event_-_circuit_map_-_monaco_2025_-_revised.pdf). Elevation and grades are calculated before re-indexing so their geographic alignment stays intact. The game uses a single timing/grid reference on this straight; precise real-world start and control-line offsets remain simplified. Mapped reference © OpenStreetMap contributors, ODbL.

## Shanghai and Silverstone start placement — verification, October 11, 2026

Visually cross-checked the start straights and driving direction against the [FIA 2025 Chinese GP circuit map, page 2](https://www.fia.com/system/files/decision-document/2025_chinese_grand_prix_-_event_notes_-_circuit_map_pit_lane_and_quarantine_zone.pdf) and [FIA 2025 British GP circuit map, page 2](https://www.fia.com/system/files/decision-document/2025_british_grand_prix_-_event_notes_-_circuit_map_v2.pdf). Shanghai starts westbound on the main pit straight toward Turn 1; Silverstone starts northeast on Hamilton Straight toward Abbey. The current reference coordinates were retained because these maps do not supply surveyed GPS coordinates for the lines.

The game combines its grid/timing reference at one line. The FIA maps distinguish the race start line and control line; their real-world separation is not modeled. The coordinates used here are approximate placements on the correct straights, not certified GPS locations. In Shanghai's modeled geometry the first sustained heading change greater than 0.15 radians occurs roughly 275 m after the reference line. A regression test now checks the entire first 200 m and that a sustained turn follows within 350 m; these distances describe the model, not a surveyed measurement.

## October 12, 2026: direction, historic layouts and tight bends

- **Paul Ricard:** reversed the closed source centerline to clockwise, keeping its geographic start point. Reversed the cached elevation anchors at the same time so the terrain remains geographically aligned. Direction checked against [SRO's Paul Ricard event regulations](https://www.gt-world-challenge-europe.com/documents/notice/965/Appendix%2B1.pdf).
- **Indianapolis:** explicitly the **2000–2007 F1 course**, not the modern IndyCar road course. The supplied centerline mixed a later flowing infield with the original oval finish. The restored opposing T9–T10 hairpins are an approximate reconstruction of the [Allianz 2007 event circuit graphic](https://sidepodcast.com/static/content/2007/06/usacircuit.jpg), anchored to the existing straight and oval entry. They are not surveyed GPS coordinates. [IMS's own history](https://www.indianapolismotorspeedway.com/history/formula-one) confirms 13 turns, clockwise running and use of the oval's first turn. The driven centerline is approximately 4.26 km versus the published 4.192 km; no artificial scaling was applied to the surrounding geography.
- **Buenos Aires:** explicitly the **1995–1998 F1 Circuit 6S**, retaining S de Senna. Rebuilt from connected OpenStreetMap centerline ways, excluding Boxes, the Tobogán bypass and alternate loops. This removes the artificial kink at the final hairpin exit and refines the corner shapes. The geographic reference at the start was projected onto the mapped main straight. Derived route approximately 4.30 km versus published 4.259 km. [Mapped Senna section](https://www.openstreetmap.org/way/48747028), [Horquilla](https://www.openstreetmap.org/way/48747024). All way IDs are recorded in the feature properties. © OpenStreetMap contributors, ODbL 1.0. The separately downloadable `public/data/historic-layouts.geojson` contains the revised features with their respective attribution; Indianapolis retains the original MIT data license, Buenos Aires is ODbL.

Both revised layouts reuse cached terrain samples by geographic proximity to the original route, rather than stretching the old height profile around the new length. New Indianapolis infield heights are therefore approximate.

**Monaco rendering:** compact street-circuit verges, bend-radius limits on ribbon offsets, separate shoulder strips, and an 8 m terrain grid held below nearby road surfaces keep the hairpin clear. These are rendering corrections, not a new asphalt survey or a change to the driving centerline.

## October 2026 scenery pass

All 41 playable venues have a named, procedural landmark and ten landscape clusters.
These are stylized representations: dimensions, building placement and skyline spacing
are adjusted for visibility and road clearance, not surveyed architectural replicas.
Venue motifs include Singapore's three towers and roof deck, Suzuka's wheel, the
Indianapolis Pagoda, the Montréal Biosphere, the Vegas Sphere, Baku's walls, the
Spielberg bull, Monza's banking and regional grandstands/pavilions elsewhere.
Historic circuits retain period-inspired scenery, not a reconstruction of a particular year's surroundings.

Primary visual/context references:
- Marina Bay Sands architecture: https://www.marinabaysands.com/guides/exceptional-experiences/marina-bay-sands-architecture.html
- Indianapolis Pagoda: https://www.indianapolismotorspeedway.com/news-multimedia/news/2011/11/16/the-pagoda-never-looks-the-same
- Circuit Gilles-Villeneuve and Parc Jean-Drapeau: https://www.parcjeandrapeau.com/fr/circuit-gilles-villeneuve-piste-multifonctionnelle-provelo-entrainement-sportif-montreal/
- Las Vegas Sphere zone: https://www.f1lasvegasgp.com/2026/
- Singapore circuit context: https://www.formula1.com/en/information/singapore-marina-bay-streetcircuit.7LXNQUCHTyR5yMQPlIk7Lv

New landmarks use complete-model radius checks against every segment of the circuit.
Their terrain platforms have an additional 45 m road-clearance margin, covering the
24 m terrain-cell diagonal. Pit buildings and generic stands also check their whole
footprint against all branches, including hairpins. Existing mapped OSM data retains
its own attribution. No commercial game assets or photos were copied.


## Computed racing guide (2.6.0)

The guide uses circuit geometry, a road-width constraint, entry/apex/exit seeds and
curvature smoothing. A closed-loop forward/backward speed plan accounts for braking,
acceleration, elevation and surface presets. Display colour also considers approach
speed. It is an arcade approximation rather than surveyed telemetry or a guaranteed
minimum-time trajectory. No professional racing-line dataset was copied.

Background references: Stanford Dynamic Design Lab, [A Sequential Two-step Algorithm
for Fast Generation of Vehicle Racing Trajectories](https://ddl.stanford.edu/publications/conference-proceeding/sequential-two-step-algorithm-fast-generation-vehicle-racing),
and Formula 1's [Silverstone aerodynamic-efficiency discussion](https://www.formula1.com/en/latest/article/tech-tuesday-why-aerodynamic-efficiency-now-rules-at-silverstone.65XAovu8LiK7IEqysQ4Sx0).
The game implementation is a simpler bounded heuristic, not the research solver.
