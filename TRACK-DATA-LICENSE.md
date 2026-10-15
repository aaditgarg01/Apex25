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
