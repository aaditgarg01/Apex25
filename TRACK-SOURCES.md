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


## Monza dedicated park, surface and historic oval references — 2.41.0

- [Official corner order and straight/circuit character](https://www.monzanet.it/tracciato-pista-monza/).
- [FIA 2025 circuit, pit lane and emergency map](https://www.fia.com/system/files/decision-document/2025_italian_grand_prix_-_event_notes_-_circuit_map_pit_lane_emergency_exit_map_quarantine_zone_and_red_zones.pdf).
- [FIA 2024 revised kerbs, resurfacing and 2.5m gravel strips](https://www.fia.com/sites/default/files/decision-document/2024%20Italian%20Grand%20Prix%20-%20Race%20Director%27s%20Event%20Notes%20V2.pdf).
- [Official historic oval geometry and banking context](https://www.monzanet.it/en/the-flyover-of-monza/).
- [Official brochure: 6.2m raised banking and 82% maximum gradient](https://www.monzanet.it/wp-content/uploads/2023/05/2023_Brochure_Experience_Monza_compressed.pdf).
- [Official stand-area map; 2026 reference, temporary event arrangements vary](https://www.monzanet.it/wp-content/uploads/2026/06/GP_F1_2026_LISTINO_PREZZI_6_17.pdf).
- [Primary team discussion of 2024 kerb and gravel changes](https://www.mclaren.com/racing/formula-1/2024/italian-grand-prix/the-italian-gp-briefing-powered-by-google-cloud/).
- [OSM pits, stands, woodland, access and historic oval snapshot 2026-11-05](https://api.openstreetmap.org/api/0.6/map?bbox=9.265,45.605,9.302,45.640).
- [SRTM 90m source and resolution for unchanged-profile cross-check](https://www.opentopodata.org/datasets/srtm/).

`public/data/monza-architecture.js` retains mapped building/stand outlines,
woodland ways and complete joined multipolygon rings/holes, parking/crossing
references and the coarse nine-point DEM check. `shared/monza-access.mjs` retains
linear access/alternate/historic roads with IDs and raw coordinate paths; corridor
widths are conservative game fits where surveyed widths are absent. Public modules
re-export shared road/placement data as locally served game assets. Own
historical curve segments are the reference for bank geometry; other road branches
are reserved. No duplicated driveable oval or slip road is added. Placement cache
`shared/monza-placement-data.mjs` is original fitted geometry derived from these
OSM references, guarded by a road/source/config signature and planner revision.

Current 5.793km XY/elevation/pit data are unchanged. Nine fresh SRTM90m samples
span 16m versus 17.86m retained game relief; no survey-level accuracy is implied.
The old oval's official 6.2m rise / maximum 82% gradient informs an approximate
stepped static wall cross-section; official history also describes ~80% grade.
The exact local cross-section and hollow structural details are not verified.
Mapped footbridge 194458112 is fitted to a 64m span and >=8.60m road clearance;
height and support extensions are artistic, not OSM survey measurements.

FIA 2024 notes support the two 2.5m gravel strips. Other trap dimensions and
barrier offsets in `public/data/monza-runoff.js` are fitted original data. The
2026 stand map supports area names/placement context; it does not establish the
exact 2025 temporary seating arrangement. No attached photos were supplied.
Raw reference images/PDFs, official logos and licensed sponsor artwork are not
redistributed. Complete limitations/table: `docs/MONZA-ENVIRONMENT-2.41.0.md`.


## COTA environment and cached terrain — 2.42.0

- [Official F1 circuit flow, stadium and 5.513km context](https://www.formula1.com/en/racing/2025/united-states).
- [FIA 2025 numbered circuit, pit and emergency maps](https://www.fia.com/system/files/decision-document/2025_united_states_grand_prix_-_event_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_quarantine_zone_map_red_zones_map.pdf).
- [Official tower location, 251ft height, double helix and amphitheatre relationship](https://circuitoftheamericas.com/blog/2024/2/20/all-about-the-cota-tower/).
- [Official campus, plaza, camping and paddock context](https://circuitoftheamericas.com/campus-map/).
- [F1 elevation comparison: 30.9m, conflicting with older 41m descriptions](https://www.formula1.com/en/latest/article/highs-and-lows-which-f1-track-has-the-most-elevation-changes-.7I9JEcBw3R2AqXbnJ6hyvc).
- [Older FIA description with 41m claim, retained as conflicting reference](https://api.fia.com/news/f1-usa-gp-race-preview).
- [USGS NED 10m data provenance, public API dataset vintage 2020-04-23](https://www.opentopodata.org/datasets/ned/).
- [OSM buildings, tower, service roads and crossings snapshot 2026-11-05](https://api.openstreetmap.org/api/0.6/map?bbox=-97.650,30.120,-97.620,30.145).

`public/data/cota-architecture.js` stores sanitized OSM building/stand outlines,
observation node, parking/woodland/crossing references and clearly approximate
plaza/event anchors. `shared/cota-access.mjs` retains source road-way coordinates,
IDs and conservative widths. `shared/cota-terrain-data.mjs` / public re-export
cache 441 surrounding and 129 road samples from USGS NED via Open Topo Data.
Original SRTM anchors remain in elevations.json; only COTA adds a refined profile.
NED relief ~30.99m supports F1's 30.9m reference, not older conflicting 41m claims.
No driving camber or current resurfacing bumps are inferred from old terrain.
Mapped tower node 7911006730, pit 376713391, stage 847781223, stand ways
460658889/890/891/892, 460683347, 998801547 and 1183793500 inform original fits.
Footbridge 191582102 location is mapped; 80m span/height are safe artistic fits.
Runoff widths/gravel boundaries and temporary event dressing are interpretive.
All sampled data are local; no raw official map/photo artwork is redistributed.
Complete limits: docs/COTA-ENVIRONMENT-2.42.0.md.


## Imola parkland and cached terrain — 2.43.0

- [Official present-day track and separate motorcycle Variante Bassa](https://www.autodromoimola.it/tracciato/).
- [FIA 2025 19-turn circuit, pit and emergency maps](https://www.fia.com/system/files/decision-document/2025_emilia_romagna_grand_prix_-_race_director_event_notes_-_circuit_map_pit_lane_emergency_exits_quarantine_zone_and_red_zones.pdf).
- [FIA 2025 edge-line and gravel/grass change notes](https://www.fia.com/system/files/decision-document/2025_emilia_romagna_grand_prix_-_race_directors_event_notes_.pdf).
- [Official 2025 grandstand-area map; use FIA map for turn numbering](https://www.autodromoimola.it/downloads/f1/F1_IMOLA_2025_pricelist_v1.pdf).
- [Official F1 current circuit flow and nominal 4.909km](https://www.formula1.com/en/racing/2025/emiliaromagna).
- [Official control tower seven above-ground floors](https://www.autodromoimola.it/business/torre/).
- [Official tourism memorial context and photograph](https://turismoimolese.cittametropolitana.bo.it/it/luoghi/piazze-vie-monumenti/monumento-ayrton-senna).
- [Municipal remembrance context for both drivers](https://www.comune.imola.bo.it/novita/comunicati/2024/03/senna-30-years-imola-propone-un-ricco-calendario-di-eventi-per-ricordare-ayrton-senna-e-roland-ratzenberger).
- [OSM park, pit, stand, river, memorial and road snapshot 2026-11-06](https://api.openstreetmap.org/api/0.6/map?bbox=11.695,44.329,11.733,44.354).
- [EU-DEM 25m terrain dataset provenance via Open Topo Data](https://www.opentopodata.org/datasets/eudem/).

`public/data/imola-architecture.js` retains sanitized OSM source outlines/IDs for
pits, stands, woods/park, town houses, Santerno, footpaths, memorial nodes and
crossings. `shared/imola-access.mjs` retains mapped vehicle/service/alternate
roads, small park bridges and gate candidates with conservative corridor widths.
Only geographic/name/type tags needed for the scene are kept; private contact
metadata from the raw response is excluded. Source coordinates remain alongside
original fitted envelopes and displacement records.

`shared/imola-terrain-data.mjs`, re-exported in `public/data/imola-terrain.js`,
caches 441 surrounding points at 150m spacing and 129 road samples (~38m) from
EU-DEM25m via Open Topo Data. Original SRTM anchors are retained; only Imola adds
refined anchors. Relief is 33.985m versus the original 35.12m, not a forced exact
30m. This old/coarse terrain does not verify current road bumps or camber.
FIA 2025 notes establish selected gravel/grass edge context, including grass at
Tosa exit; exact widths and trap outlines remain game fits. Current F1 uses the
Tamburello chicane and bypasses the old Variante Bassa. The official stand map
contains older turn-label conventions; the FIA 19-turn map controls numbering.
No user reference photos accompanied the attachment. Official maps and the
respectful tourism memorial photo were inspected; their artwork is not shipped.
Complete uncertainties and checks: docs/IMOLA-ENVIRONMENT-2.43.0.md.


## Hungaroring bowl, surfaces and dressing — 2.44.0

- [FIA 2025 circuit, pit, sector, DRS and emergency maps](https://www.fia.com/system/files/decision-document/2025_hungarian_grand_prix_-_event_notes_-_circuit_map_pit_lane_emergency_exits_map_quarantine_zone_and_red_zones.pdf).
- [FIA 2025 notes: T5 gravel, T7 blue line, T14 left-side concrete/fence, resurfacing](https://www.fia.com/system/files/decision-document/2025_hungarian_grand_prix_-_race_directors_event_notes_v2.pdf).
- [Official 2025 media kit: temporary control/media site and campus context](https://hungaroring.hu/site/files/ops/f1mediakit2025.pdf).
- [Official rebuilt pit complex and covered stand, operative levels and tunnels](https://hungaroring.hu/site/en/media/news/hungaroring-the-future-has-begun).
- [Project architect photographs and rebuilding scale](https://dvmgroup.com/en/references/projects/hungaroring).
- [Official main-straight resurfacing context](https://hungaroring.hu/site/en/media/news/new-asphalt-surface).
- [Official F1 circuit/bowl/heat context](https://www.formula1.com/en/information/hungary-hungaroring-budapest.3Sz0BTKiIf7ov9bnezZ5dU).
- [Team-published highest/lowest elevations: 238.9m / 204.2m, 34.7m relief](https://www.mercedesamgf1.com/news/why-hungary-is-the-best-grand-prix-on-the-f1-calendar).
- [EU-DEM25m cached terrain source via Open Topo Data](https://www.opentopodata.org/datasets/eudem/).
- [OSM pit/stand/building/woodland/camp/access/crossing snapshot 2026-11-06](https://api.openstreetmap.org/api/0.6/map?bbox=19.231,47.570,19.268,47.596).

Architecture/road caches retain sanitized OSM coordinates and IDs with conservative
widths. Pit 123905481, main stand 230979479, other stand references 230979485/500
and service bridge 54843543 guide original fitted models. OSM may predate the 2025
rebuild; current official/architect photos guide exterior styling. Source active
main-ribbon ways 231328650/1333262244 are deduplicated because the preserved racing
ribbon already reserves them; alternative, pit and service roads remain checked.
Raw 129 EU-DEM25m road samples span 39.029m. Original SRTM anchors remain; a separate
smoothed profile is fitted to published 204.2–238.9m endpoints (34.7m relief).
The 441-point terrain grid has 150m spacing. These are not current pavement/camber
survey measurements. Target/fitted runoff tables and explicit verified-vs-fitted
notes are in public/data/hungaroring-runoff.js and the release document. No user
reference photos were attached, and no official photo/map artwork is shipped.

## Barcelona-Catalunya dedicated environment — 2.45.0

- [Official modern no-final-chicane layout, enlarged T1 gravel and signalling tower](https://www.circuitcat.com/en/news/formula-1/the-formula-1-aws-gran-premio-de-espana-2023-changes-its-track-configuration/).
- [FIA 2025 circuit/pit/sector/DRS maps](https://www.fia.com/system/files/decision-document/2025_spanish_grand_prix_-_race_director_event_notes_-_circuit_map_pit_lane_quarantine_zone_and_red_zones.pdf).
- [FIA 2025 concrete approach wall and blue exit-line changes](https://www.fia.com/system/files/decision-document/2025_spanish_grand_prix_-_race_directors_event_notes_.pdf).
- [Official 2024 facilities plan and architecture photographs](https://premsa.circuitcat.com/2024/MotoGP/Presentacio/La%20transformacio%20del%20Circuit_Novetats_2024_CAT.pdf).
- [Official Rooftop opening and 30m south-tower reference](https://www.circuitcat.com/ca/noticies/formula-1/el-rooftop-ya-se-alza-como-nuevo-emblema-del-circuit/).
- [Official pit/control/terrace redevelopment context](https://www.circuitcat.com/es/noticias/circuit/la-transformacion-del-circuit-de-barcelona-catalunya/).
- [Official solar-panel/roof context](https://www.circuitcat.com/en/news/sostenibilidad-en/the-circuit-saves-52-tons-of-co2-emissions-in-only-four-months/).
- [OSM venue, alternate/access roads, buildings, woodland and crossings; cached 2026-11-06](https://api.openstreetmap.org/api/0.6/map?bbox=2.241,41.558,2.275,41.580).
- [EU-DEM25m via Open Topo Data](https://www.opentopodata.org/datasets/eudem/).

Cached sanitized OSM geometry in barcelona-architecture/access and cached EU-DEM
in barcelona-terrain-data. Original anchors/centreline retained; refined samples
keep the original 30.69m range. T1 gravel/blue lines/modern layout are documented;
other trap extents, roof details, setbacks and bridge fits are approximate. Full
scope and per-corner target/fitted table: docs/BARCELONA-ENVIRONMENT-2.45.0.md.

## Montreal island environment (2.46.0)

- [FIA 2025 circuit, pit and marshalling map](https://www.fia.com/system/files/decision-document/2025_canadian_grand_prix_-_event_notes_-_circuit_map_pit_lane_emergency_exits_map_ers_battery_containment_area_red_zones.pdf).
- [Official F1 circuit facts](https://www.formula1.com/en/racing/2025/canada).
- [Promoter grandstand positions and views](https://gpcanada.ca/en/type-de-billet/grandstands/).
- [Olympic Basin geography](https://www.parcjeandrapeau.com/en/olympic-basin-montreal/).
- [OSM island buildings, waterways, parkland, access and wall geometry](https://api.openstreetmap.org/api/0.6/map?bbox=-73.544,45.494,-73.512,45.518).
- [Complete OSM river relation](https://api.openstreetmap.org/api/0.6/relation/15956768/full).

OSM ways 42229671 (paddock), 26698931/439917766 (unsigned pavilion complex),
26288030 (dome), 166808419 (final wall), 129924946 (rowing basin), complete local
lagoon multipolygons and river relation 15956768 supply cached geometry. All
464 mapped access/path ways are reserved, including documented bridge crossings.
Original SRTM 90m via Open Topo Data road anchors remain untouched (7.37m range).
No new surveyed road elevations or gravel-trap locations are claimed. Temporary
stands, skyline silhouettes/visibility, bridge heights, radial runoff widths and
clearance-fitted architecture/wall shifts are approximate. See
`docs/MONTREAL-ENVIRONMENT-2.46.0.md` for the table and measured scope.


## Yas Marina / Abu Dhabi — 2.47.0 (2026-11-07)

- [Yas Marina post-2021 North / South / hotel layout changes](https://www.yasmarinacircuit.com/en/w/ymc-track-changes-1)
- [FIA 2025 Abu Dhabi circuit map and pit lane drawing, 16 corners / 5281 m](https://www.fia.com/system/files/decision-document/2025_abu_dhabi_grand_prix_-_event_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_quarantine_zone_and_red_zones.pdf)
- [Official marina setting](https://www.yasmarinacircuit.com/en/aboutus/discover-yas-island/yas-marina)
- [2025 official Formula 1 Abu Dhabi overview](https://www.formula1.com/en/racing/2025/united-arab-emirates)
- [Yas Island OSM architecture and coastline extract](https://api.openstreetmap.org/api/0.6/map?bbox=54.599,24.461,54.616,24.479)
- [Yas Island northern landmark OSM extract](https://api.openstreetmap.org/api/0.6/map?bbox=54.596,24.478,54.615,24.491)

OSM building ways 133907082 (pits), 133907079/133907081/133907352/168411369/188731381 (stands), 520940413/1228229328 (hotel wings), 188732696 (media/hospitality), 168412289/188852394 (resorts), 855448338 (unsigned red roof), 312812656 (mall), 227206840 (waterpark). Coastline ways 312181485/188215353/188205155 define the marina shoreline; offshore closure is fitted. All 1,192 mapped highway/path ways are cached before corridor filtering; 10,215 remaining access segments are reserved. OSM © contributors, ODbL 1.0.

The preserved centreline matches the post-2021 16-corner layout, not the 21-corner original. Existing SRTM 90 m / OpenTopoData elevation anchors retain the 6.52 m range; no new surveyed dip is invented. Hotel upper wings stay at source anchors with fitted supports and raised clearance. The generated pit route is unchanged: a covered approach is approximate, not a true under-T1 tunnel. Runoff types/widths, kerbs, wall setbacks, arena omission, mast locations, appearance and ground-clearance fits are approximate. No current racing gravel trap was verified; none is invented. No reference photographs accompanied this request. See docs/YASMARINA-ENVIRONMENT-2.47.0.md.

## Lusail / Qatar — 2.48.0 (2026-11-07)

- [FIA 2025 Qatar circuit, sectors, DRS and marshal map](https://www.fia.com/system/files/decision-document/2025_lusail_event_-_circuit_map_-_qatar_2025.pdf).
- [FIA 2025 Qatar runoff and gravel changes](https://www.fia.com/system/files/decision-document/2025_qatar_grand_prix_-_race_directors_event_notes_v2.pdf).
- [Formula 1 2024 Lusail rounded kerb locations](https://www.formula1.com/en/latest/article/what-tyres-will-the-teams-and-drivers-have-for-the-2024-qatar-grand-prix.3wg5fMRihKy4tF17WRrDvw).
- [Formula 1 2023 historical Turns 1 and 2 gravel reference](https://www.formula1.com/en/latest/article/verstappen-cruises-to-qatar-gp-victory-over-piastri-and-norris-after-mercedes.63iY0CEd0WFzm1y0Z4ycui).
- [Lusail International Circuit promoter stand names and viewing areas](https://www.lcsc.qa/news/lusail-international-circuit-announces-early-bird-promotion-formula-1-qatar-airways-qatar).
- [OpenStreetMap Lusail pit, stand, access and parking footprints](https://api.openstreetmap.org/api/0.6/map?bbox=51.443,25.482,51.466,25.499).
- [OpenTopoData SRTM90m terrain source](https://www.opentopodata.org/datasets/srtm/).

The FIA map identifies the 5,419 m, 16-corner F1 layout. The retained game
ribbon samples to approximately 5,427 m. OSM ways 152483596 and 152483597
identify the main grandstand and pit building; 1316236372, 1316236376 and
1316236368 locate three footbridges. Overlaps between the mapped raceway and
the game's main ribbon are deduplicated only for nearby parallel segments
of three identified raceway ways. Separate pit branches, motorcycle and kart
layouts, roads and paths remain in the clearance data.

Five independent SRTM90m spot elevations of 10–13 m above sea level were
consistent with the retained SRTM90m anchors and their 6.55 m range. No
new road anchors, camber or banking were added. Positions, heights, surface
widths and reference dates are qualified in the
[Lusail release details](docs/LUSAIL-ENVIRONMENT-2.48.0.md).

## Singapore Marina Bay refresh (2.49.0)

The saved 19-turn, post-2023 centreline is the basis for the refresh. The
FIA 2025 race map specifies 4,927 m and documents the pit lane, marshalling
and race markings. The game samples to 4,948 m. OSM supplies permanent
footprints, bridges and public roads. The scene uses the retained SRTM90
anchors. Temporary wall offsets, runoff widths, grandstand envelopes and
lighting positions are fitted for the game.

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
