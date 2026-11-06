# 2.46.0 — Montreal island, walls and parkland

Dedicated scenery replaces the generic Montreal environment. The original
clockwise road, 4.361 km official length / 4.370 km sampled game length, 14 turns
and smoothed SRTM anchors are retained. No new road bumps, banking or hills were
introduced. Existing 5.41–12.78 m anchors retain their 7.37 m range; these coarse
heights are not a pavement survey. Scenery follows the retained road/ground profile.

## Included

- OSM-based paddock envelope, two unsigned curved pavilion volumes, mapped rowing
  basin, lagoon rings with islands, and the complete adjacent river polygon.
- Main-straight, opening-complex, middle-corner and hairpin stands, grass viewing,
  waterfront temporary structures, national/provincial flags, tents and promenades.
- Neutral distant city silhouettes, mapped dome anchor, bridge and amusement-ride
  silhouettes. No casino, venue, sponsor or team artwork is copied.
- Shared full-lap tarmac/paint/grass/wall plan, including pit connections. Actual
  mapped gravel service/parking areas have textured dressing and sparse stones.
  No current racing gravel trap was confirmed, so none was invented.
- Shared concrete/covered-impact walls, fences, canal rails and four mapped
  pedestrian bridge structures. Every rendered wall is the collision segment
  itself. Final-wall OSM way 166808419 is fitted outward up to 3.37m where the
  retained 17m game road would otherwise intersect it. Height 1.05m and width .5m
  are visual estimates. User-chosen original greeting: **Respect the final turn**.
- Painted grid numbers/slots, safety/detection/sector lines, kerbs, braking and
  corner boards, pit-limit markings, original banners, marshals, live LED panels,
  fire points, cameras, recovery/medical equipment, service strips and drainage.
- Park groves, mowing/grass variation, small off-line rubber/skid/oil decals,
  wet edges and puddles. Water has ripples and a shared 256px reflection target
  refreshed at most every 180ms. Existing dry/damp/wet and whole-lap dynamic weather
  remain in use, with a cooler humid Montreal atmosphere.
- Free Practice starts: Hairpin approach, Final chicane and Back straight.

## Shared surface stack

Distances below are radial targets from the road edge, clipped by other road
branches, pit corridor, access paths and buildings. Narrow walls do not imply a
wider track-limit allowance. Tarmac uses the existing reduced penalty; grass is
slower/slipperier, particularly wet; paint/kerbs lose wet grip; service gravel uses
heavy slowing. Recovery and lap validity continue through the existing systems.

| Turn | Kerb | Target tarmac / gravel / grass (m) | Target barrier; distance from road edge | Fitted stack at apex (m) | Evidence |
|---|---|---|---|---|---|
| 1 | serrated | 14 / 0 / 3 | covered; 17 m | 7.66 / 0.00 / 1.64 | FIA turn identity; widths fitted |
| 2 | red-white | 5 / 0 / 6 | covered; 11 m | 0.74 / 0.00 / 0.88 | FIA turn identity; widths fitted |
| 3 | serrated | 8 / 0 / 1 | covered; 9 m | 1.24 / 0.00 / 0.16 | FIA turn identity; widths fitted |
| 4 | red-white | 1.8 / 0 / 0 | concrete; 1.8 m | 1.80 / 0.00 / 0.00 | FIA turn identity; widths fitted |
| 5 | flat | 1.5 / 0 / 1 | concrete; 2.5 m | 1.50 / 0.00 / 1.00 | FIA turn identity; widths fitted |
| 6 | serrated | 10 / 0 / 2 | covered; 12 m | 1.73 / 0.00 / 0.35 | FIA turn identity; widths fitted |
| 7 | red-white | 2 / 0 / 3 | concrete; 5 m | 2.00 / 0.00 / 3.00 | FIA turn identity; widths fitted |
| 8 | serrated | 12 / 0 / 1 | covered; 13 m | 12.00 / 0.00 / 1.00 | FIA turn identity; widths fitted |
| 9 | red-white | 1.8 / 0 / 0 | concrete; 1.8 m | 1.40 / 0.00 / 0.00 | FIA turn identity; widths fitted |
| 10 | red-white | 14 / 0 / 2 | covered; 16 m | 14.00 / 0.00 / 2.00 | FIA turn identity; widths fitted |
| 11 | flat | 2 / 0 / 2 | concrete; 4 m | 1.84 / 0.00 / 1.84 | FIA turn identity; widths fitted |
| 12 | flat | 1.5 / 0 / 1 | concrete; 2.5 m | 1.21 / 0.00 / 0.81 | FIA turn identity; widths fitted |
| 13 | serrated | 12 / 0 / 0 | covered; 12 m | 1.40 / 0.00 / 0.00 | FIA turn identity; widths fitted |
| 14 | red-white | 1.5 / 0 / 0 | concrete; 1.5 m | 1.40 / 0.00 / 0.00 | FIA turn identity; widths fitted |

Both edges between corners default to 1.8m paved + 1.5m grass, concrete and fence.
Painted edge widths and chicane kerb style are in the shared data. The final wall
uses its mapped polyline rather than an independent decoration. Coverage extends
through the pit entry and exit. All distances, trap absence and barrier styles are
explicit data choices, not claims of current engineering accuracy.

## Placement, performance and cleanup

Complete oriented envelopes include roofs, crowd space, moving flags, equipment
and tree crowns. Reservations cover every racing branch, external pit ribbon and
3,128 cached access/path segments from 464 ways. Mapped crossings are overhead;
bridge supports are checked separately and decks maintain measured vertical
clearance. Documented waterfront stand concepts can span water on temporary steel
structures; land is not raised under those stands.

Crowds, vegetation, flags, tents, weeds and surface stones are instanced. Static
architecture/signs are spatially batched; skyline boxes use distant batches. The
sign atlas is shared, flags/LEDs/smoke are throttled and cosmetic. Reflection targets,
textures, geometries and weather effects are disposed when changing circuits.
Measured counts and clearances are in the accompanying verification reports.

## Pit and AI changes included in this release

Non-service pit loss targets **18 seconds versus a dry, fresh-tyre racing
reference**, not 18 seconds of total lane travel. The existing geometric routes
stay in place. Arcade pit-assist speed is calibrated per layout (not the official
FIA limiter); matching limiter values appear on signs/HUD. Montreal's reference
is 6.63s racing versus 24.63s transit. Entry speed, queueing, weather and actual
racing pace can change observed loss. Random 2–3s tyre work and served penalties
are additional. The displayed stationary result includes penalties: 2.337s tyre
work + 4s penalty = **6.337s**, shared with every player. Served penalties are
removed from the outstanding finish-time total once.

AI starts on the lowest-time compound plan and consults the same live strategy
planner for stops, using current weather, wear, remaining distance and dry-set
stock. Advice is staggered/throttled. A car stranded below 1.5m/s for four seconds
can recover at its current station if clear of other drivers; progress is not
advanced, the lap is invalidated and the usual 3s recovery penalty applies. Grid,
service, finished and retired cars are excluded. This prevents indefinite AI
stranding; it is not a claim that every driving situation has been playtested.

## Sources and uncertainty

- [FIA 2025 circuit/pit/marshal map](https://www.fia.com/system/files/decision-document/2025_canadian_grand_prix_-_event_notes_-_circuit_map_pit_lane_emergency_exits_map_ers_battery_containment_area_red_zones.pdf)
- [Official circuit facts](https://www.formula1.com/en/racing/2025/canada)
- [Promoter stand guide](https://gpcanada.ca/en/type-de-billet/grandstands/)
- [Olympic Basin](https://www.parcjeandrapeau.com/en/olympic-basin-montreal/)
- [OSM map extract](https://api.openstreetmap.org/api/0.6/map?bbox=-73.544,45.494,-73.512,45.518)
- [Complete river relation](https://api.openstreetmap.org/api/0.6/relation/15956768/full)

Turns 1–2 are left–right; the long straight follows the hairpin toward the final
chicane. The unsigned pavilion complex is placed from its mapped location,
rather than relocated to the hairpin. Stand identities/turn associations are
reference-driven, but temporary envelopes, some positions and visibility are
approximate. The main paddock is shifted 40m outward to clear the game's pit and
all mapped paths; pavilion footprints are reduced/shifted where necessary.
Bridge spans follow mapped crossings; heights/support arrangements are fitted.
Skyline towers/rides/bridge silhouettes and their visibility are approximate.
No new attached reference photographs were present in this request. Current
racing gravel locations and exact wall height/width remain unverified.

## Verification scope

Syntax, undefined-name/shadow checks, dependency imports, both production builds,
complete-footprint clearance, actual rendered runoff overlap, shared wall geometry
and contact cases, elevation continuity and all-corner coverage were checked.
Parked dry and wet browser previews were inspected; an initial missing practice
option was corrected and the page reloaded. Final reports record precise counts,
clearances and browser scope. The game's test suite was **neither run nor edited**.
Driving, full races and multiplayer playtesting remain with the user.

### Measured results

- 1,265 scenery reservations; minimum complete-envelope clearance **2.07m**.
- 5,523 rendered runoff quads checked: no other-road, pit, access or building overlaps.
- Minimum track-wall clearance from the retained racing ribbon: **0.89m**.
- All **5,190** shared safety segments consumed by the renderer; **5,190** static
  contact fixtures resolved, including **40** fitted final-wall segments.
- Four mapped overhead crossings; minimum underside/road clearance **8.60m**.
- 14 corner stacks and 2,914 edge stations classified; maximum adjacent road-height
  step **0.127m** over approximately 3m, inherited from the unchanged anchors.
- 23,254 instanced spectators, 1,050 trees, 148 flags, 48 tents, 7,080 grass tufts,
  34 service-gravel stones and 432 weeds. **205** maximum active scenery mesh
  submissions after batching/LOD (excludes track/car/safety submissions; reflections
  add a throttled extra pass). This is a geometry budget, not an FPS guarantee.
- Pit timing fixtures across all 42 circuits: **17.984–18.015s** non-service loss
  against the modeled dry racing reference. Penalty receipt and AI strategy/recovery
  fixtures passed. These are focused logic/geometry checks, not full driving tests.
- Final parked dry/wet previews loaded with no new browser console errors.
