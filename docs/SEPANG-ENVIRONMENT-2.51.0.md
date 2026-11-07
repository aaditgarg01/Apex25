# Sepang International Circuit environment · 2.51.0

## Audit of the previous environment

| Item | Status | Evidence | Action |
| --- | --- | --- | --- |
| Centreline and turn order | Correct | The existing `my-1999` clockwise ribbon follows the two long straights, opening spiral and T15 hairpin on the FIA map. The resampled game lap measures 5,555.43 m, versus the published 5,543 m. | Keep the original centreline, width, start, direction and elevation anchors. |
| Terrain and landscape | Approximate | The generic tropical palette was plausible. The cached game elevations follow the local SRTM profile, but the original scenery lacked the mapped plantation setting, drainage and venue relief. | Fit a 60 m cached SRTM scenery grid to the retained road and pit grades. Add plantations, laterite, drainage, service roads and distant silhouettes. |
| Pit lane and pit building | Wrong side | The FIA drawing and OSM pit building footprint put the garage complex on the right of the start/finish straight in the race direction. The previous generic lane was on the opposite side. | Fit the existing external pit lane system to the correct side and place a multi-level garage and hospitality block in the mapped footprint. |
| Main stands and canopy | Missing | The venue describes a 1.3 km, double-front grandstand. OSM maps its overall footprint and the structure at the hairpin end. | Build a double-front tensile stand in 15 clearance-checked sections and a separate radial petal canopy at T15. |
| Secondary stands and spectator areas | Approximate | OSM locates K1 and F. Generic stands did not follow the site plan or protect the mapped service branches. | Use the mapped areas as guides and fit smaller stand footprints, covered seating, grass-bank spectators and fan plazas. |
| Runoff, kerbs, fencing and protection | Approximate | The generic track surfaces had no dedicated 15-corner schedule. FIA identifies tyre protection at T1, T6, T9, T13 and T15. Formula 1 documents 2016 kerb, camber and drainage work. | Use one shared plan for painted and asphalt runoff, gravel, grass, laterite, safety barriers and fences. |
| Venue roads and footbridges | Missing | OSM locates the road, access and two pedestrian bridge alignments. | Cache the branches and protect their width. Use shared render and collision solids for the fitted bridge decks, railings and piers. |
| Track dressing and signage | Approximate | The basic start line and pit lane markings existed. The FIA map provides sector, marshal and 2017 detection context. | Add numbered grid marks, pit and safety markings, brake and corner boards, a gantry, caution panels, event props and original painted location lettering. |
| Tropical rain and clearing | Missing | The generic weather had wet physics and rain effects. Sepang's storm appearance and runoff drainage were absent. | Add a tropical cloud and lighting blend, stronger existing rain/spray batches, puddles, runoff streaks, umbrellas and clearing vapour. |

[Official FIA circuit and safety map](https://www.fia.com/sites/default/files/2017_malaysian_preview_1.pdf) · [Circuit architecture](https://www.sepangcircuit.com/architecture) · [2016 Formula 1 upgrades](https://www.formula1.com/en/latest/article/f1-malaysia-gp-preview-sepang-revamp.3pYvhHo5JLfokzQzrcLhME.3pYvhHo5JLfokzQzrcLhME) · [OSM venue](https://www.openstreetmap.org/#map=16/2.76075/101.73696) · [Terrain data](https://registry.opendata.aws/terrain-tiles/)

## Corner and runoff schedule

Dimensions are target metres outward from the racing edge. The planner tapers each stack and clips it where the pit lane, service road or another branch gets close. Gravel depth is the shallow modeled depression in metres. Each stack uses a white edge, grass, laterite and protected access beyond the barrier where space permits. Pit and straight defaults are resolved by the same planner. FIA identifies the five tyre-protection locations marked below. All numeric widths, depths, kerb profiles and offsets are fitted game values.

| Corner | Station (m) | Kerb | Tarmac (m) | Gravel (m × depth) | Grass (m) | Barrier and target setback | Evidence |
| --- | ---: | --- | ---: | --- | ---: | --- | --- |
| T1 | 408 | serrated | 18 | 19 × 0.14 | 7 | Covered tyre, 45 m | FIA tyre location, fitted dimensions |
| T2 | 486 | serrated | 10 | 5 × 0.09 | 8 | Armco, 24 m | Fitted from map |
| T3 | 756 | flat | 10 | — | 10 | Armco, 21 m | Fitted from map |
| T4 | 1302 | serrated | 17 | 13 × 0.12 | 7 | Covered tyre, 38 m | Fitted from map |
| T5 | 1599 | red-white | 12 | — | 10 | Armco, 23 m | Fitted from map |
| T6 | 1900 | red-white | 13 | 11 × 0.10 | 8 | Covered tyre, 33 m | FIA tyre location, fitted dimensions |
| T7 | 2292 | red-white | 14 | — | 9 | Armco, 24 m | Fitted from map |
| T8 | 2403 | red-white | 13 | 6 × 0.08 | 8 | Armco, 28 m | Fitted from map |
| T9 | 2889 | serrated | 14 | 16 × 0.12 | 8 | Covered tyre, 39 m | FIA tyre location, fitted dimensions |
| T10 | 3003 | flat | 8 | — | 9 | Armco, 18 m | Fitted from map |
| T11 | 3240 | red-white | 11 | 8 × 0.09 | 7 | Armco, 27 m | Fitted from map |
| T12 | 3567 | flat | 14 | 10 × 0.10 | 8 | Armco, 33 m | Fitted from map |
| T13 | 3760 | red-white | 13 | 12 × 0.11 | 8 | Covered tyre, 34 m | FIA tyre location, fitted dimensions |
| T14 | 3951 | serrated | 16 | 14 × 0.12 | 7 | Covered tyre, 38 m | Fitted from map |
| T15 | 4881 | serrated | 18 | 22 × 0.15 | 8 | Covered tyre, 49 m | FIA tyre location, fitted dimensions |

## Implementation and placement

- The cached venue data covers 710 mapped highway ways, including the service, pit and alternate branches. The planner tests each complete oriented footprint against the racing and generated pit ribbons, the mapped access network, the runoff, barrier footprints and previously placed assets. The roof and mast envelopes are reserved together. The original OSM outline contains road crossings, so the model uses five front and ten back grandstand sections with gaps at crossings.
- The pit block, control area, medical centre and hospitality buildings use mapped footprints as guides. The long grandstand and final-hairpin canopy use the official architectural reference. Other dressing includes covered stands, oil-palm rows, tropical vegetation, Malaysian flags, staff, fan walks, tents, cars, service fencing, cranes, masts, a podium and distant airport traffic.
- Circuit furniture includes the existing start line and pit speed markings, numbered grid positions, pit boxes, two sector lines, detection and safety-car markings, brake boards up to 200 m, corner boards, orange marshals, fire points, recovery areas and caution panels linked to nearby sliding or off-track cars. Flush decals add tyre marbles, braking marks, laterite staining and gravel-edge scatter. Painted aprons read **MALAYSIA** and **SELANGOR**.
- The 60 m terrain grid uses [Skadi N02E101](https://s3.amazonaws.com/elevation-tiles-prod/skadi/N02/N02E101.hgt.gz). Terrain blends down beneath both ribbons, with 25.48 m of retained road relief. The runway and runoff use the same slope-aware surface categories for rendering, tyre grip, track limits and guide planning. Wet laterite has a 0.15 grip multiplier and heavy drag. Tarmac, kerbs, grass and gravel each retain their own grip and penalty treatment.
- Sepang has three additional Free Practice starts, **Opening hairpin**, **Back straight** and **Final hairpin**. Each is an out lap. Tropical weather follows the existing whole-lap conditions schedule. The sky, sunlight and fog blend visually at each change, with existing wet reflections and local standing water. A single baked reflection probe and the existing sun and hemisphere light support the scene.
- Static structure and signage are spatially batched. Spectators, palm trunks and leaves, broadleaf trees, shrubs, flags, tents, stones and umbrellas are instanced. The fitted plan contains 800 reserved sites, 6,079 spectators, 490 plantation trees and 553 rain umbrellas. There are 406 palms and 160 other trees total, including roadside placements. The tropical controller adds zero real-time lights.

## Verification

- Syntax, module loading, undefined-name and shadow checks passed. The browser entry point was checked in the running game. Both the standard and Vercel builds passed.
- Clearance was checked against 21,174 road polygons. The closest accepted scenery footprints were 4.57 m from the racing ribbon, 7.06 m from the generated pit lane and 0.70 m from mapped access roads. The complete roof and mast envelopes kept at least 1.47 m of horizontal clearance. The smallest sampled structural-support margin was about 0.03 m at a mapped access branch. The road and support footprints did not intersect.
- The 16,384 runoff patches had zero overlaps with protected road branches or reserved buildings and scenery. All 15 corners had kerb, edge, tarmac, grass, barrier and a laterite perimeter treatment. Gravel was present at all corners scheduled for it. The sampled terrain was at least 0.106 m below the racing ribbon and 0.098 m below the pit lane. The largest successive centreline elevation step was 0.240 m over approximately 3 m. Twenty-one samples checked against the finer SRTM tile differed by 2.18 m RMS, with the largest difference about 4.9 m.
- The static audit matched 5,472 wall, fence and structural solids to their render vertices and confirmed collision contact for every solid. The pit check covered a pre-entry limiter check, legal late entry, a complete stop and exit, and 18.00 seconds of transit loss before service. All 41 other circuits' pit layouts matched the previous source release. The Buddh clearance and scenery audit also passed after extracting the shared helpers.
- A scene-level dry, damp, wet and clear cycle converged in order without lighting reversals and showed clearing vapour. Parked local snapshots showed the hairpin, pit straight and back straight in rain, with 122–168 draw calls before the final single-batch cosmetic decals. The normal game opened a Free Practice out lap at the final hairpin. The browser console showed zero warnings and errors during these checks. The game test suite was left untouched.

## Details to compare against reference photos

The exact kerb shape, modern gravel boundaries, drain dimensions, temporary fence and barrier setbacks, mast elevations and secondary stands remain approximate. K1 and F are fitted to game corridors near their mapped areas. The main canopy has breaks at protected access roads, and its membrane and structural details are stylized within the mapped envelope. The finer elevation source supports the retained driving profile, while the published 2016 final-hairpin camber change was recorded as a reference without adding a new banking profile. Pit orientation was verified, but the generated entry, exit and box lengths follow the game’s existing pit system. Aircraft paths, horizon buildings and pond reflections are scenic approximations.
