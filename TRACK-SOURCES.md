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

## Interlagos dedicated environment — 2.34.0

The [GP São Paulo organiser sector guide](https://f1saopaulo.com.br/arquibancadas/)
and [2026 event map](https://f1saopaulo.com.br/wp-content/uploads/2026/10/Mapa-completo-v2.webp)
locate main-straight sectors B/M, Senna S sector D, Curva do Sol H/R, Reta Oposta G,
sector A and the infield lake. Temporary stands change between events. The
[government aerial, Beto Issa / GP São Paulo, 2022](https://www.flickr.com/photos/governosp/52497080967/)
is a visual reference for roof massing, green paved escapes, grass banks and
surrounding low-rise neighbourhoods; no photo texture or sponsor artwork is bundled.
The [FIA 2025 circuit/pit map](https://www.fia.com/system/files/decision-document/2025_sao_paulo_grand_prix_-_event_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_quarantine_zone_and_red_zones_map.pdf)
informs corner numbering and infrastructure relationships. Junção is T12;
T13–15 form the climb back to the straight. The [municipal circuit description](https://autodromodeinterlagos.prefeitura.sp.gov.br/pistaoficial)
and [runoff/safety maintenance report](https://prefeitura.sp.gov.br/w/noticia/prefeitura-conclui-mais-uma-etapa-da-requalificacao-do-autodromo-de-interlagos)
provide topography and gravel/guardrail context.

`public/data/interlagos-architecture.js` caches original reference-fitted anchors
and a separate `osm` object downloaded on 2026-11-04 from the direct OSM map API
(bbox -46.701,-23.706,-46.692,-23.696). © OpenStreetMap contributors, ODbL 1.0.
The lake uses way **138417940**'s actual polygon (not its bounding rectangle).
Permanent main-straight stand stations use way **138420844** (M) and **138550780**;
pit pavilion way **33779114** and adjacent permanent footprints are retained for
comparison. The pit building is intentionally fitted parallel to the existing
2.33.0 generated service corridor; the corridor is not replaced by a surveyed pit route.

`shared/interlagos-boundary.mjs` specifies original, approximate corner-specific
surface widths: broad green/paved escape at Senna S, a paved apron then selected
gravel at Descida do Lago, more selective Ferradura gravel, and grass-dominated
infield/climb verges. These widths are fitted to the existing game coordinates,
limited against other branches and corner radius, and shared by visible boundary
geometry and collision. This is not an exact reconstruction of every year's gravel
or resurfacing work. Existing centreline, road mesh, elevations, pit layout,
vehicle physics and transport protocol are retained. Terrain outside those surfaces
is artistic, road-height-constrained rolling landscape, not LiDAR terrain.

## Zandvoort banked road, dunes and runoff — 2.35.0

The [official corner guide](https://www.circuitzandvoort.nl/en/corners/) identifies
progressive Hugenholtz banking up to 18° and Arie Luyendyk banking of 15–18°;
these official values take precedence over secondary reports quoting 19°.
Named constants and smooth entry/exit station profiles are in
`shared/zandvoort-road-data.mjs`, re-exported by `public/data/zandvoort-road.js`.
Inner Hugenholtz camber (4°), station limits and the progressive transverse curve
are artistic fits, not measured road cross-sections. No extra Tarzan banking was
added because a reliable numeric angle was not established.

The same guide describes Gerlach gravel; a paved Hugenholtz escape; grass/paved
changes at Slotemaker; Scheivlak gravel and tyre protection; a Masters exit strip;
Hans Ernst paved escape plus gravel; and Turn 13 gravel/tyre protection.
Those distinctions inform the complete per-turn surface table. Widths and exact
polygons are approximate, constrained to the existing game centreline and nearby
branches. Red/white kerbs and dark rubber follow the banked road. The [official
Dutch GP event map](https://www.dutchgp.com/en/circuit-map/) and its [2024/2025
hospitality/map brochure](https://dutchgp.com/app/uploads/2023/11/DutchGP-Hospitality-2024-2025-V3.pdf)
provide grandstand and paddock relationships; temporary stand shapes vary by year.

The road's modest dune relief is an original landmark-fitted profile, informed by
previously cached SRTM and the official descriptions of Hunserug, Slotemaker,
Scheivlak and the final approach. It is **not** a set of surveyed asphalt heights:
SRTM alone flattened the dune character to ~5.38m in the previous game profile.
The new local-base anchor range is 12m; the pit straight is level and periodic
shape-preserving interpolation joins the anchors. The geographic centreline is
unchanged. Elevation and progressive cross-slope are shared by server/local/client
simulation, road rendering, kerbs, barriers, guide line, AI and camera pose.

`public/data/zandvoort-architecture.js` includes OSM ways 52473177 (Pitgebouw) and
52473180 (Hoofdtribune), fetched 2026-11-05 via the direct map API, bbox
4.535,52.381,4.553,52.394. © OpenStreetMap contributors, ODbL 1.0. The pit complex
is intentionally fitted to the existing generated external service corridor.
Dune banks, temporary stands, town/hotel silhouettes, vegetation and distant
wind turbines are original approximations. Turbines do not assert a mapped
wind-farm location. The North Sea is an artistic distant western horizon.
No reference photos, licensed sponsor graphics or official game assets are included.


## Miami stadium, marina and surface reference — 2.36.0

The [organiser glossary](https://f1miamigp.com/miami-grand-prix-glossary/)
places the fake marina inside Turns 6–8 and describes yachts on a 25,000 sq ft
vinyl water treatment. The [Marina grandstand guide](https://f1miamigp.com/tickets/grandstand/marina/)
and the user-supplied aerial photo inform the aqua runoff / beach / boat-club
character. No source photo is shipped as a texture.
The [FIA 2025 circuit and pit map](https://www.fia.com/system/files/decision-document/2025_miami_grand_prix_-_event_notes_-_circuit_map_pit_lane_quarantine_zone_emergency_exits_and_red_zones_.pdf)
and [Formula 1 circuit guide](https://www.formula1.com/en/latest/article/circuit-guide-everything-you-need-to-know-about-the-miami-international-autodrome.zMEQ1nU4xZKuvc9EsGXDr)
provide corner-order and T13–16 ramp context. The existing driving elevation is
retained; the highway deck is an artistic overhead structure, not a new ramp.

`public/data/miami-architecture.js` caches OSM stadium way 171419981 and adjacent
stadium way 1368495807 from the [map API subset](https://api.openstreetmap.org/api/0.6/map?bbox=-80.252,25.948,-80.227,25.966),
retrieved 2026-11-05. The principal stadium envelope uses the complete footprint's
oriented bounding box. The actual rendered bowl/canopy/masts are original,
simplified geometry without branded signage. The adjacent tennis footprint is
retained as reference data, not currently rendered.

Other stands, marina boats, hospitality, overpass piers and parking anchors are
original approximations fitted to whole-footprint clearance reservations. The
surface plan is original per-corner width data, not surveyed runoff. Small gravel
beds at T1/T17 are artistic safety additions: their real-world presence/locations
were not verified. Paved/teal escapes, grass verges and close walls are the dominant
Miami treatment. Generic text and colour artwork are original; no licensed logos
or exact photographic leaf/sponsor graphics are included.


## Silverstone Wing, airfield and surface references — 2.37.0

Primary references:

- [FIA 2025 circuit map](https://www.fia.com/system/files/decision-document/2025_british_grand_prix_-_event_notes_-_circuit_map_v2.pdf): 5.891km centreline, 18-corner order and Hamilton Straight start.
- [Formula 1 corner-name guide](https://www.formula1.com/en/latest/article/explained-how-every-silverstone-corner-got-its-name.idMlxFC2gfN2ApcPmifxN): Abbey through Club, airfield/Wellington/Hangar context.
- [Silverstone maintenance guide](https://www.silverstone.co.uk/maintaining-race-track): 2023 tarmac replacement at the former Abbey gravel area and Becketts/Chapel viewing changes.
- [FIA 2024 event notes, section 12](https://www.fia.com/sites/default/files/decision-document/2024%20Silverstone%20Event%20-%20F2%20Event%20Notes.pdf): new left-side T14 gravel, T15 gravel extension, 1.7m right-side T16 paved strip/gravel, T18–T1 grass and tyre-barrier changes. These inform type, not surveyed widths elsewhere.
- [Official 2025 spectator map](https://www.silverstone.co.uk/sites/default/files/pdf/British%20Grand%20Prix%202025%20Map.pdf) and [grandstand guide](https://www.silverstone.co.uk/news/silverstone-grandstands-faqs): named stand, camping and viewing relationships.
- [Wing roof supplier case study](https://www.ashandlacy.com/wp-content/uploads/2017/04/silverstone_wing_cs-1.pdf): 390m length, changing curved roofline, neutral metallic cladding and red accent context. Original game geometry, not copied construction drawings.

OSM snapshot retrieved 2026-11-05:
https://api.openstreetmap.org/api/0.6/map?bbox=-1.039,52.061,-1.005,52.087 .
`public/data/silverstone-architecture.js` caches complete source outlines,
oriented envelopes, woodland, pedestrian bridge and camping references. Important
ways include Wing 227332429, Becketts 227342446, museum 437429280, national garages
4859937/4859939 and pedestrian bridge 1412628538. The shared cached road subset in
`shared/silverstone-access.mjs` is re-exported by the public data module and serves
all-branch placement/surface clearance. No live OSM downloads occur during play.

All 3D shapes, generic signs, flags, paint and foliage textures are original
procedural assets. Some stands are moved/reduced to clear the retained geographic
road, safety widths and generated external pit lane. The Wing is narrowed/shifted
and aligned to that lane. Control tower, extra hangar, temporary camp arrangements,
field/village silhouettes, roof detail, exact runoff extents and bridge dimensions
are explicitly approximate. Existing elevation anchors remain; no verified new
camber dataset was found or added. Reference photos/maps are not bundled as assets.


## Red Bull Ring hillside, architecture and surface references — 2.38.0

- [Red Bull Ring official gradients, hillside setting and main straights](https://www.redbullring.com/en/track/red-bull-ring-f1-motogp-track/).
- [Official Austrian GP corner order and 65m elevation relief](https://www.redbullring.com/de/events-tickets/formel-1/formel-1-circuit/).
- [FIA Austrian GP 2025 circuit, pit lane and emergency access map](https://www.fia.com/system/files/decision-document/2025_austrian_grand_prix_-_event_notes_-_circuit_map_pit_lane_emergency_exit_map_quarantine_zone_red_zones.pdf).
- [Formula 1 2024 T9/T10 2.5m gravel strips and T4 gravel proximity](https://www.formula1.com/en/latest/article/explained-how-key-changes-to-the-red-bull-ring-look-to-avoid-last-years.2ubjMYkbT3HHpwuEJ7PoHw.2ubjMYkbT3HHpwuEJ7PoHw).
- [Red Bull Ring OSM pit/stand/woodland/access geometry, snapshot 2026-11-05](https://api.openstreetmap.org/api/0.6/map?bbox=14.742,47.205,14.785,47.24).
- [EU-DEM v1.1 25m data, accuracy, datum and attribution](https://www.opentopodata.org/datasets/eudem/).

The original clockwise XY centreline (~4.307km sampled versus the official
4.326km reference) and original 97 SRTM 90m anchors are retained. A separate
`refinedAnchors` profile blends those original heights with 25% datum-aligned
EU-DEM road samples, smooths coarse terrain noise, fits 65m relief, and limits
local gradients below the published maximum 12% uphill / 9.3% downhill. The
sampled game road reaches approximately +10.97% / -8.53%; these are constrained
approximations, not surveyed racing-surface gradients or new camber data.

`shared/redbullring-terrain-data.mjs` caches 441 terrain points on a 180m query
grid and 97 road samples from EU-DEM v1.1 via Open Topo Data `eudem25m`, retrieved
2026-11-05. The upstream dataset is nominally 25m resolution, ±7m vertical RMSE,
in EVRS2000. The coarser cached query grid supports landscape shape, not bumps,
kerbs or precise road heights. `public/data/redbullring-dem.js` re-exports this
locally served cache. Bilinear landscape interpolation blends into the road;
near-road ground vertices are conservatively constrained below every nearby
racing/runoff branch and clear scenery foundations.

`public/data/redbullring-architecture.js` caches complete outlines and oriented
rectangles for pit Box way 118364939, nine mapped grandstands and hospitality
building 155581853, plus woodland/farmhouse and bridge reference data. The pit
model is 28×305m, aligned to the existing generated external pit axis and shifted
about 17m from its mapped envelope to clear the lane and emergency access. Mapped
stand footprints can be shifted/shrunk to fit the retained road and service
corridors; the runtime plan records each adjustment. `shared/redbullring-access.mjs`
caches linear service/raceway branches; OSM `area=yes` service-apron outlines are
not misinterpreted as road centreline branches. Temporary camps, parking, control
tower, viewing terraces and all model detail remain original artistic fits.
No new bridge/tunnel, named castle or church is added without verified fit/height.

Per-corner runoff types use the official/FIA/F1 context above. T9/T10 include a
visible 2.5m gravel edge band within broader fitted gravel beds; exact longitudinal
extent and all broader trap widths are approximate. T4 has a short paved gap
before gravel. Access conflicts mask both runoff overlays and their grip sampling.
Walls and fences are created from the same shared solid list used by collisions.
No new driving banking or bumps are invented. No downloaded reference photos,
official artwork, sponsor graphics, logos or bull sculptures are distributed.


## Mexico City stadium and full-lap dressing refresh — 2.39.0

- [FIA 2025 circuit, sector and pit drawings](https://www.fia.com/system/files/decision-document/2025_mexico_city_grand_prix_-_event_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_quarantine_zone_area.pdf).
- [Official Mexican GP spectator access and stand locations](https://www.mexicogp.mx/informacion/accesos/?IDM=LANG_EN).
- [Official Mexican GP corner names](https://www.mexicogp.mx/noticia/mexico-gp-como-se-llaman-las-curvas-del-autodromo-hermanos-rodriguez/).
- [Official T4–8 viewing stand context](https://www.mexicogp.mx/boleto/generales-grada-11/?IDM=LANG_EN).
- [Formula 1 4.304km circuit, park setting and retained final Peraltada section](https://www.formula1.com/en/racing/2025/mexico).
- [Copper-domed sports arena architectural context](https://www.palaciodelosdeportes.mx/nosotros).
- [OSM architecture, stadium and road snapshot 2026-11-05](https://api.openstreetmap.org/api/0.6/map?bbox=-99.107,19.390,-99.078,19.414).
- [Public aerial reference, stadium canopy and surrounding park; image not redistributed](https://commons.wikimedia.org/wiki/File:Vista_a%C3%A9rea_del_Aut%C3%B3dromo_Hermanos_Rodr%C3%ADguez_01.jpg).
- [SRTM 90m elevation cross-check dataset](https://www.opentopodata.org/datasets/srtm/).

`public/data/mexico-architecture.js` retains full OSM source outlines and IDs for
stadium stand ways 377679562/1315400018, pit 377679570, three main stands,
central copper arena 126607350, sports facilities, urban and park references.
`shared/mexico-access.mjs` retains the linear road subset for road-clear placement,
re-exported by the public module; no OSM requests are made during racing. Seven
pedestrian bridge paths remain reference-only because heights and two-pier
clearance were not verified. Nearby baseball stadium 828705077 is also reference
data rather than a claim of a new roof model.

The retained road is 4,307.28m sampled vs 4.304km official. Original XY, elevations
and pit route are unchanged. Nine fresh SRTM 90m samples span 4m; they only
cross-check the near-flat setting and do not replace the original 2.56m game
profile or establish centimetre accuracy. No new banking/camber is added.

Stadium stand inner edges use OSM; canopy, deck heights and temporary event stands
are artistic. Three stand patches narrow and two end patches are omitted for
roads. Pit frontage fits at 29.44×280.6m on the mapped centre, aligned to the
existing generated pit lane. The arena model fits a 176m central circular footprint;
its 226m outer annex envelope is not fully built. Old-banking remnant slope is
artistic and the remnants are not a second driving route. The official history
supports a stadium bypass that retains the final section of Peraltada.

`public/data/mexico-runoff.js` re-exports the complete shared per-corner table;
all numeric widths, barrier distances/styles and kerb details are fitted
approximations. No gravel trap location was verified, so gravel widths are zero.
FIA map offsets inform cosmetic sector paint, not a change to existing timing.
See `docs/MEXICO-AUDIT-2.39.0.md` for the full baseline audit and fitted widths.
No raw photos/PDF, licensed logos or real sponsor/team/venue artwork are bundled.
