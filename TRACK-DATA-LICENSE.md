Copyright (c) 2019-2025 Tomislav Bacinger

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Revised Buenos Aires centerline

The `ar-1952` feature in `public/data/circuits.geojson` and `public/data/historic-layouts.geojson` is derived from © OpenStreetMap contributors and licensed under the Open Database License 1.0: https://www.openstreetmap.org/copyright . Its way IDs and source are recorded in its properties. Other original circuit features retain the MIT license above; Buddh and mapped scenery retain their existing ODbL attribution.


## Albert Park lake shoreline

`public/data/albert-park-lake.js` contains the lake outline and island rings from
OpenStreetMap relation 346429, retrieved 2026-10-14. © OpenStreetMap contributors,
licensed under ODbL 1.0: https://www.openstreetmap.org/copyright .
Source: https://www.openstreetmap.org/relation/346429 .
The lake data is separate from the original circuit centreline.


## Shanghai reference architecture outlines

`public/data/shanghai-architecture.js` contains building and roof outlines from
© OpenStreetMap contributors, retrieved 2026-10-14, licensed under ODbL 1.0:
https://www.openstreetmap.org/copyright . It records each source way ID.
Main stand roof: https://www.openstreetmap.org/way/1371942058 .
Viewing bridges: https://www.openstreetmap.org/way/1371942059 and
https://www.openstreetmap.org/way/1371942060 .
H/K stands: https://www.openstreetmap.org/way/1372223261 and
https://www.openstreetmap.org/way/1372223262 .
The 3D detailing is original procedural geometry based on the user's supplied
photographs; no photographic textures are redistributed.


## Suzuka landmark positions and footprints

`public/data/suzuka-landmarks.js` contains selected mapped landmark/building outlines from © OpenStreetMap contributors, retrieved 2026-10-14, licensed under ODbL 1.0: https://www.openstreetmap.org/copyright . Each source way ID is retained. Circuit Wheel: https://www.openstreetmap.org/way/184107083 . V2 main stand: https://www.openstreetmap.org/way/183394522 . Pit building: https://www.openstreetmap.org/way/184422099 . Procedural architectural detailing, terrain between track elevations, amusement ride silhouettes and vegetation are original artistic approximations, not scanned assets.


## Bahrain landmark footprints

`shared/bahrain-landmarks.mjs` contains selected building and grandstand outlines from © OpenStreetMap contributors, retrieved 2026-10-14, licensed under ODbL 1.0: https://www.openstreetmap.org/copyright . Each way ID is retained. Sakhir Tower: https://www.openstreetmap.org/way/187123438 . Main Grandstand: https://www.openstreetmap.org/way/187123419 . Architectural detailing, branding illustrations, desert landscaping and distant skyline/industrial silhouettes are original procedural approximations; no photographic textures are redistributed.


## Spa environment landmark footprints

`shared/spa-landmarks.mjs` contains selected building and grandstand outlines from © OpenStreetMap contributors, retrieved 2026-10-14, licensed under ODbL 1.0: https://www.openstreetmap.org/copyright . Source way IDs are retained. Eau Rouge chalet: https://www.openstreetmap.org/way/1509741652 . Endurance grandstand: https://www.openstreetmap.org/way/1353159436 . Raidillon grandstand: https://www.openstreetmap.org/way/1134053908 . Terrain away from the existing official track elevation anchors, conifers, architecture details and event props are original procedural approximations, not scanned or photographic assets.


## Monaco coastline and city footprints

`public/data/monaco-city.js` contains coastline, marina and building outlines from © OpenStreetMap contributors, retrieved 2026-10-14, under ODbL 1.0: https://www.openstreetmap.org/copyright . Source way/relation/node IDs are retained. Port Hercule: https://www.openstreetmap.org/relation/2221179 . Casino: https://www.openstreetmap.org/way/161769674 . Fairmont: https://www.openstreetmap.org/relation/2093796 . Derived render rings are clipped against the existing road for visual clearance, with the tunnel separately protected. Procedural facades, yachts, architecture/terrain details and event dressing are original artwork; no photographic textures are redistributed.


## Jeddah Corniche coastline and landmark positions

`public/data/jeddah-corniche.js` contains Red Sea shoreline coordinates and landmark reference positions from © OpenStreetMap contributors, retrieved 2026-10-14, under ODbL 1.0: https://www.openstreetmap.org/copyright . Source way IDs are retained. Al-Rahmah Floating Mosque (Island Mosque): https://www.openstreetmap.org/way/254891632 . Jeddah Yacht Club & Marina: https://www.openstreetmap.org/way/982415310 . Jeddah Tower: https://www.openstreetmap.org/way/402915628 . Procedural skyscrapers, beach resorts, wave-roofed grandstands, yachts, landscaping, floodlights, fireworks and sponsor/event dressing are original artistic approximations; no photographic textures are redistributed.


## Baku city and Caspian shoreline

`public/data/baku-city.js` contains derived building/park render footprints, shoreline coordinates and Old City district/palace wall outlines from © OpenStreetMap contributors, retrieved 2026-10-15, licensed under ODbL 1.0: https://www.openstreetmap.org/copyright . Source way/relation IDs are retained. Coastline ways: 1528410534 and 287035247. Flame Towers: 253081850, 253081914, 253082095. Maiden Tower: 299418016. Government House: 152809510. Philharmonic: 152190848. Carpet Museum: 253082269. Palace of Shirvanshahs: 299450008; mapped palace wall: 299450006. Fortress artwork uses Old City district outline 152190481 as a guide, not a surveyed outer wall. Render footprints are clipped clear of the existing racing surface and barriers. Facades, curved glass towers, skyline details, terrain shaping and event decorations are original procedural approximations; no photographs or official-game assets are redistributed. Event-area context: https://cdn.bakucitycircuit.com/uploads/faq/road-map.pdf .

The Baku Turn 8–11 roadside wall and bastions added in 2.17.1 are original road-relative procedural artwork, not surveyed fortress-wall coordinates. Nearby derived building footprints are clipped around that artwork as well as the road. Official circuit context: https://cdn.bakucitycircuit.com/uploads/news/377/5adf11efef5c1.pdf .

Baku 2.17.2 derives building/park clipping from the shared variable-width road corridor. The district perimeter remains reference data and is not rendered as a fortress. Roadside architecture uses original procedural geometry/textures, with visual proportions informed by official F1 reference photographs: https://www.formula1.com/en/latest/article/how-the-azerbaijan-grand-prix-became-a-modern-classic.5aL5RCVlpraaMF26WzGnPs . No photographic assets are redistributed.


## Singapore Marina Bay city and reservoir

`public/data/singapore-city.js` contains selected building and park outlines, Marina Reservoir relation 9542146 and Singapore River relation 9569901 from © OpenStreetMap contributors, retrieved 2026-10-16, under ODbL 1.0: https://www.openstreetmap.org/copyright . Source way/relation/node IDs are retained; building/park render rings are clipped clear of the road and compact safety-wall corridor. Marina Bay Sands towers: ways 116801004, 172307471 and 172307472; skypark 116800998. Singapore Flyer: node 13725008268 and footprint 230082125. Fullerton Hotel: 46595395. Old Supreme Court: 170960936. Esplanade domes: 256163011 and 256163012. F1 Pit Building: 49890775.

Original procedural architecture, glowing facades, foliage, lighting and event art use no redistributed photographs or official-game assets. Reference context: https://www.visitsingapore.com/see-do-singapore/recreation-leisure/resorts/marina-bay-sands/ and https://singaporegp.sg/media/2023/circuit-park-map/2023-09-06-circuit-park-map.pdf . Historic Bay Grandstand closure/current-route context: https://singaporegp.sg/en/news/2023/new-grandstands-added-for-the-formula-1-singapore-airlines-singapore-grand-prix-2023/ . Grandstand positions are derived road-clear event artwork, not surveyed seating plans.

## Madrid IFEMA environment references

Procedural Madrid environment assets are original geometry/textures. Named
corner/underpass context, the La Monumental stadium concept and IFEMA architecture
use the official MADRING circuit guide and promotional architectural references:

- https://www.madring.com/en/circuit
- https://www.madring.com/en/press-releases/new-renders-madring
- https://www.madring.com/en/press-releases/pit-building-paddock-club
- https://www.ifema.es/en/doc/2024-annual-report/memoria-anual-en-2024.pdf

No photographs, official logos, third-party 3D assets or new geographic datasets
are bundled. Local tunnel/arena anchors are approximate fits to the already
licensed geographic centreline. Surrounding architecture is an interpretation,
not a surveyed or scanned reproduction. The retained road banking is unchanged.

## Cadillac 2026 livery reference

The additional Cadillac scheme is an original procedural interpretation of the
team's black-and-white 2026 debut livery, applied to this game's original car
geometry. No official logo bitmap or external 3D car model is bundled.
Reference: https://www.cadillacf1team.com/news/cadillac-formula-1-r-team-reveals-historic-first-livery

## Interlagos lake and permanent architecture outlines

The `osm` object in `public/data/interlagos-architecture.js` is derived from
© OpenStreetMap contributors and licensed under ODbL 1.0:
https://www.openstreetmap.org/copyright . Retrieved 2026-11-04 through
https://api.openstreetmap.org/api/0.6/map?bbox=-46.701,-23.706,-46.692,-23.696 .
Source way IDs and complete longitude/latitude outlines are included with each
feature, including lake 138417940, pit pavilion 33779114 and stand M 138420844.
The surrounding `anchors`, procedural models, generic signage and artistic surface
plan are original game code; source photos, maps and trademarked sponsor artwork
are references only and are not redistributed as game assets.

## Zandvoort permanent architecture

The `features` array of `public/data/zandvoort-architecture.js` contains outlines
of OSM ways 52473177 (Pitgebouw) and 52473180 (Hoofdtribune), retrieved 2026-11-05:
https://api.openstreetmap.org/api/0.6/map?bbox=4.535,52.381,4.553,52.394 .
© OpenStreetMap contributors, ODbL 1.0, https://www.openstreetmap.org/copyright .
The adjacent anchor definitions, bank/elevation/surface profiles and 3D assets are
original approximate game data/code. Reference images and sponsor artwork are not
redistributed. Prior cached scenery data retains its original ODbL attribution.


## Miami stadium outlines

The `features` array of `public/data/miami-architecture.js` contains complete
longitude/latitude outlines derived from © OpenStreetMap contributors, ODbL 1.0:
https://www.openstreetmap.org/copyright . Retrieved 2026-11-05 through
https://api.openstreetmap.org/api/0.6/map?bbox=-80.252,25.948,-80.227,25.966 .
Source ways: 171419981 (stadium) and 1368495807 (adjacent tennis stadium).
The enclosing stadium rectangle is also derived from the source outline.
Surrounding anchors, procedural models, lettering and surface profiles are
original game code/data and explicitly approximate. No reference photos, official
stadium signage, sponsor logos or external 3D assets are redistributed.


## Silverstone architecture, access roads and landscape outlines

`public/data/silverstone-architecture.js` and `shared/silverstone-access.mjs`
contain derived OpenStreetMap geometry, © OpenStreetMap contributors, licensed
under ODbL 1.0: https://www.openstreetmap.org/copyright . Retrieved 2026-11-05 from
https://api.openstreetmap.org/api/0.6/map?bbox=-1.039,52.061,-1.005,52.087 .
Way identifiers, complete longitude/latitude outlines and derived oriented
rectangles remain in the cached modules. Examples: Wing 227332429, Becketts
227342446, museum 437429280, national garages 4859937/4859939, Whittlebury camping
606181044 and pedestrian bridge 1412628538. The public architecture module
re-exports the shared clearance-road subset, which is served locally with the
rest of the game. These derived data remain available under ODbL.

Procedural models, text/colour artwork, national-flag drawing, surface profiles,
placement adjustments and cosmetic animation are original game code/data. No
reference photographs, real sponsor/team artwork, licensed logos or external 3D
assets are redistributed. Plain geographic/venue names identify locations; the
neutral models and lettering do not reproduce official branded signage.


## Red Bull Ring mapped architecture, access roads and terrain

`public/data/redbullring-architecture.js` and `shared/redbullring-access.mjs`
contain derived geometry © OpenStreetMap contributors under ODbL 1.0:
https://www.openstreetmap.org/copyright . Snapshot 2026-11-05:
https://api.openstreetmap.org/api/0.6/map?bbox=14.742,47.205,14.785,47.24 .
Complete source outlines, way IDs and derived oriented envelopes are retained.
Examples: pit Box 118364939, stands 118364945/312030917/312030921/565072384/
604402038/1077423719/1077423720/1077517159/1228485529 and hillside building
155581853. These data remain available under ODbL; the original procedural
models, signage, surface widths and adjusted placement are separate game code.

EU-DEM v1.1 elevation values in `shared/redbullring-terrain-data.mjs` (re-exported
by `public/data/redbullring-dem.js`) are © European Union, Copernicus Land
Monitoring Service, with funding by the European Union. Retrieved 2026-11-05 via
Open Topo Data: https://www.opentopodata.org/datasets/eudem/ . EU-DEM is supplied
under the European Union's full, open and free access/reuse terms described by
that provider and its linked attribution notice. Query spacing, local projection,
rounding, bilinear interpolation and road-profile blending are adaptations by
APEX 25; they do not imply endorsement by the European Union. The retained SRTM
anchor provenance remains recorded separately in `public/data/elevations.json`.
No source photographs, official branding or licensed external 3D assets are bundled.


## Mexico City architecture, sports park and access-road data — 2.39.0

`public/data/mexico-architecture.js` and `shared/mexico-access.mjs` contain derived
OpenStreetMap geometry © OpenStreetMap contributors, licensed under ODbL 1.0:
https://www.openstreetmap.org/copyright . Retrieved 2026-11-05 from
https://api.openstreetmap.org/api/0.6/map?bbox=-99.107,19.390,-99.078,19.414 .
Full source outlines/road polylines, way identifiers and derived local envelopes
are retained and available in the shipped modules under ODbL. Examples: stadium
stands 377679562/1315400018, pit 377679570, main stands 377679571/377679572/
736211980, arena 126607350 and older raceway 772755822. Cached bridge and nearby
baseball-stadium outlines are reference data; not all references are rendered.

The nine SRTM 90m sample heights in `demVerification` are a coarse public-data
cross-check retrieved via Open Topo Data, https://www.opentopodata.org/datasets/srtm/ .
Original road elevation provenance remains separately recorded in elevations.json.
Models, procedural textures/lettering, surface width tables, flags, placement fits
and festival artwork are original game code/data. Reference photographs, official
maps, real branded signage and external 3D assets are not redistributed.


## Monza mapped park, architecture, historical oval and placements — 2.41.0

`public/data/monza-architecture.js`, `shared/monza-access.mjs` and OSM-derived
anchors in `shared/monza-placement-data.mjs` contain geometry derived from
© OpenStreetMap contributors, licensed under ODbL 1.0:
https://www.openstreetmap.org/copyright . Retrieved 2026-11-05 from
https://api.openstreetmap.org/api/0.6/map?bbox=9.265,45.605,9.302,45.640 .
Full source coordinate outlines, way/relation identifiers and derived envelopes
remain available in the shipped modules. Examples: pit 34404652, main stands
34404645/193647795/193647796, historic banks 19982933/19983025/725687994,
footbridge 194458112 and joined woodland multipolygon references. Placement cache
adjustments and conservative corridor widths are adaptations by APEX 25.

Nine SRTM90m sample heights are a public-data consistency check retrieved via
Open Topo Data, https://www.opentopodata.org/datasets/srtm/ . Existing elevation
anchors retain their separate recorded provenance. No new elevation is substituted.
Original models, procedural textures/lettering, surface profiles, flags, placement
rules and animations are game code. Reference photos/official map artwork, real
team/sponsor/venue graphics and external 3D assets are not redistributed.


## COTA source geometry and USGS terrain (2.42.0)

COTA architecture/access outlines, identifiers and source geometry are derived
from © OpenStreetMap contributors, ODbL 1.0, retrieved 2026-11-05. These adapted
geographic databases in public/data/cota-architecture.js and shared/cota-access.mjs
remain available under ODbL 1.0 with source identifiers; attribution is displayed
in game. https://www.openstreetmap.org/copyright . The remaining original fitted
models, surface profiles, textures, lettering, flags and code are separate game
work. No commercial venue/sponsor/team artwork is included.

Cached USGS National Elevation Dataset heights are US federal public-domain data,
processed/distributed via Open Topo Data: https://www.opentopodata.org/datasets/ned/ .
The provider documents a 2020-04-23 dataset snapshot. Shipped surrounding samples
are spaced 140m; road samples ~43m. This is not a current engineering/road survey.
Original SRTM anchors retain their provenance alongside the refined COTA profile.
Reference photos, FIA/official map artwork and external 3D assets are not shipped.


## Imola geographic adaptations and EU-DEM (2.43.0)

Imola building/stand/woodland/park/river/path/access/crossing/memorial coordinates
and identifiers derive from © OpenStreetMap contributors, ODbL 1.0, retrieved
2026-11-06. Adapted geographic databases in public/data/imola-architecture.js and
shared/imola-access.mjs remain available under ODbL 1.0 with original coordinates
and IDs: https://www.openstreetmap.org/copyright . In-game attribution is shown.
Event anchors, source-to-model adjustments and conservative widths are original
fitted adaptations, not surveyed dimensions.

EU-DEM © European Union, Copernicus Land Monitoring Service, processed/distributed
via Open Topo Data: https://www.opentopodata.org/datasets/eudem/ . Attribution and
source are retained with cached samples. Shipped grid spacing is 150m and road
spacing ~38m; underlying raster is nominally 25m. No current engineering survey
or commercial high-resolution elevation asset is claimed. Original SRTM data
retain their existing attribution. Procedural models, textures, flags and neutral
lettering are original game work. Reference photos, official maps, sculpture
artwork/inscriptions, trademarks and external 3D assets are not redistributed.


## Hungaroring geography and terrain (2.44.0)

Hungaroring pit/stand/building/woodland/camp/parking/access/crossing geometry derives
from © OpenStreetMap contributors, ODbL 1.0, retrieved 2026-11-06. Adapted geographic
databases in public/data/hungaroring-architecture.js and shared/hungaroring-access.mjs
retain source coordinates/IDs and remain under ODbL 1.0:
https://www.openstreetmap.org/copyright . In-game attribution is displayed.
Private contact/address/operator metadata from the raw response is not shipped.

EU-DEM © European Union, Copernicus Land Monitoring Service, processed/distributed
via Open Topo Data: https://www.opentopodata.org/datasets/eudem/ . Cached raster
samples, source and attribution are retained. Underlying raster is nominally 25m;
shipped terrain/road spacing is 150m/~34m. Original SRTM provenance remains. The
new road profile is smoothed and fitted to team-published 204.2–238.9m endpoints;
this is an original adaptation, not a current engineering survey.
Original procedural models/textures/flags/lettering/surface profiles are separate
game work. Reference photographs, official map artwork, licensed sponsor/team
artwork and external 3D assets are not redistributed.

## Barcelona-Catalunya additions (2.45.0)

`public/data/barcelona-architecture.js` and `shared/barcelona-access.mjs` contain
adapted OpenStreetMap geometry, retrieved 2026-11-06: © OpenStreetMap contributors,
ODbL 1.0 (https://www.openstreetmap.org/copyright). Public building/road/land/crossing
geometry only; contact, operator and address metadata is excluded. Mapped business
names are data references, not copied signs or sponsor artwork.

`shared/barcelona-terrain-data.mjs` (re-exported by public/data/barcelona-terrain.js)
contains EU-DEM25m samples: © European Union, Copernicus Land Monitoring Service,
processed/distributed via Open Topo Data (https://www.opentopodata.org/datasets/eudem/).
Refined road anchors adapt those samples, retaining the original SRTM anchors/range;
no current pavement survey or local-gradient accuracy is asserted.

Runoff targets, architecture, textures, generic lettering, flags and props are
original procedural game content. Official/FIA photographs and diagrams are linked
for reference and not redistributed. No licensed sponsor/team artwork was added.
Consult docs/BARCELONA-ENVIRONMENT-2.45.0.md for fitted/uncertain details.

## Montreal additions (2.46.0)

`public/data/montreal-architecture.js`, `montreal-water.js`, and the shared
Montreal access/ground/wall data adapt OpenStreetMap geometry retrieved 2026-11-06:
© OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright).
Only geographic/structural tags are retained; address, contact and operator data
are omitted. Public skyline data mixes the mapped dome anchor with explicitly
approximate original distant silhouettes. Existing SRTM provenance is retained;
no new DEM survey was introduced.

Buildings, foliage, surface textures, national/provincial flag drawings, original
lettering and neutral event props are procedural game work. Official diagrams and
reference photographs are linked for research; their artwork is not redistributed.
No licensed sponsor, team, casino or venue artwork was added. The wall greeting
“Respect the final turn” is original user-selected text.


### Yas Marina cached environment data (2.47.0)

`public/data/yasmarina-architecture.js`, `shared/yasmarina-access.mjs`, `shared/yasmarina-coast-data.mjs` and `shared/yasmarina-landmark-data.mjs` contain adapted OpenStreetMap geometry, retrieved 2026-11-07: © OpenStreetMap contributors, ODbL 1.0, https://www.openstreetmap.org/copyright . Fitted envelopes and offshore clipping boundaries are modifications, not surveyed geometry. Procedural original artwork/configuration uses this repository’s code license. Official FIA/circuit pages are references only; no official maps, sponsor logos or venue artwork are redistributed. Original road/elevation data licenses remain applicable.

## Lusail cached environment data (2.48.0)

`public/data/lusail-architecture.js` and `shared/lusail-access.mjs` contain
adapted OpenStreetMap geometry retrieved 2026-11-07: © OpenStreetMap contributors,
ODbL 1.0 (https://www.openstreetmap.org/copyright). Fitted architectural
envelopes and assumed widths are not survey geometry. Road and elevation data
keep their existing licenses. Original procedural materials, flags, dressing
and runoff/lighting configuration follow the code license. Official references
are linked; their maps, photos, logos and event artwork are not redistributed.

## Singapore access and venue refresh (2.49.0)

`shared/singapore-roads.mjs` and `shared/singapore-architecture-data.mjs`
adapt OpenStreetMap data retrieved 2026-11-07 (© OpenStreetMap contributors,
ODbL 1.0, https://www.openstreetmap.org/copyright). The original cached
city and water outlines retain the same attribution. The filtered access
extract includes public geometry and road types. Width defaults and fitted
temporary structures are game approximations. Original textures, flags,
architecture and signage follow the repository code license. The linked
official maps, photographs and event artwork are reference material.

## Buddh cached venue data (2.50.0)

`shared/buddh-map-data.mjs` adapts mapped highway ways and selected building
outlines within the Buddh venue bounds, retrieved 2026-11-07. Release 2.52.0
also uses fence and drainage traces from the same extract. © OpenStreetMap
contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright).
`shared/buddh-dem.mjs` samples the Mapzen Terrain Tiles N28E077 Skadi tile,
accessed 2026-11-07 via the [AWS Registry](https://registry.opendata.aws/terrain-tiles/).
See the [Terrain Tiles source attributions](https://github.com/tilezen/joerd/blob/master/docs/attribution.md).
The fitted scenery, colours, flags, dressing and safety dimensions are
original game content. FIA maps and engineering photos are reference links.

## Sepang cached venue data (2.51.0)

`shared/sepang-map-data.mjs` adapts OpenStreetMap highway ways, selected
building and fence outlines, and waterways from the Sepang venue extract
retrieved 2026-11-07. © OpenStreetMap contributors,
[ODbL 1.0](https://www.openstreetmap.org/copyright).
`shared/sepang-dem.mjs` samples the Mapzen Terrain Tiles N02E101 Skadi tile
accessed 2026-11-07 via the [AWS Registry](https://registry.opendata.aws/terrain-tiles/).
See the [Terrain Tiles source attributions](https://github.com/tilezen/joerd/blob/master/docs/attribution.md).
Runoff dimensions, structures, materials, flags and lettering are original game
assets. The official maps and architecture references are linked as references.


## Madrid cached venue data (2.53.0)

The mapped ways, selected boundary traces and building outlines in
`shared/madrid-map-data.mjs` derive from OpenStreetMap data retrieved
2026-11-07. © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright).
The same module caches local terrain heights from Mapzen Terrain Tiles
N40W004, retrieved through the [AWS Registry](https://registry.opendata.aws/terrain-tiles/).
See the [Terrain Tiles source attributions](https://github.com/tilezen/joerd/blob/master/docs/attribution.md).
The original game artwork, fitted widths and safety layouts follow the
repository code license. The official maps and photographs are reference links.


## Paul Ricard cached venue data (2.54.0)

The road, runway, taxiway, boundary and building outlines in
`shared/paulricard-map-data.mjs` derive from OpenStreetMap data retrieved
2026-11-08. © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright).
The module also includes the local scenery grid sampled from Mapzen Terrain
Tiles N43E005 via the [AWS Registry](https://registry.opendata.aws/terrain-tiles/).
See the [Terrain Tiles source attributions](https://github.com/tilezen/joerd/blob/master/docs/attribution.md).
Stripe colours, kerbs, wall dimensions and scenery models are original
game assets. The official maps and supplied photos are reference material.

## Portimão cached venue data (2.55.0)

Roads, crossings, boundaries and building footprints in
`shared/portimao-map-data.mjs` derive from OpenStreetMap data retrieved
2026-11-08. © OpenStreetMap contributors,
[ODbL 1.0](https://www.openstreetmap.org/copyright). The scenery grid uses
Mapzen Terrain Tiles N37W009 from the
[AWS registry](https://registry.opendata.aws/terrain-tiles/).
See the [Terrain Tiles source attributions](https://github.com/tilezen/joerd/blob/master/docs/attribution.md).
Circuit maps and operator photographs informed the original models and
fitted runoff treatment.

## Istanbul Park cached venue data (2.56.0)

The mapped buildings, bleachers, venue outline and road branches in
`shared/istanbul-map-data.mjs` derive from OpenStreetMap data retrieved
2026-11-08. © OpenStreetMap contributors,
[ODbL 1.0](https://www.openstreetmap.org/copyright). The two terrain grids
sample Mapzen Terrain Tiles N40E029 from the
[AWS registry](https://registry.opendata.aws/terrain-tiles/). See
[Terrain Tiles source attributions](https://github.com/tilezen/joerd/blob/master/docs/attribution.md).
The fitted access scenery, track-dressing assets and crossing
models are original work. The venue maps and photos are reference material.
