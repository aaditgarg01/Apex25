# Paul Ricard environment refresh

The existing clockwise game route is 5,824.615 m and retains the 15-turn
French Grand Prix layout with the North Chicane on the Mistral Straight.
The official course is 5,842 m. The playable centreline and elevation data
carry over, as do the car model and multiplayer protocol.

## Audit

| Previous item | Status | Evidence and action |
|---|---|---|
| Circuit layout | Correct variant | The FIA turn diagram matches the game’s clockwise lap and the North Chicane between the two Mistral legs. |
| Runoff | Approximate | The old renderer placed four narrow generic ribbons around curves. The operator confirms abrasive blue and red pavement, and the aerials show broad colour zones, dark gaps and white inner stripes at Le Beausset. The new procedural surfaces use the shared runoff polygons. |
| Walls, kerbs and fences | Wrong in places | Uniform offsets put walls close to the old strips. The shared plan moves safety geometry behind the clipped aprons and keeps the pit divider close to the lane. |
| Pit and paddock | Approximate | The generic garage block and tower used a guessed location. Mapped building 158903945 and the FIA paddock plan anchor the dedicated white building, tower, podium and hospitality. The current simulated lane runs on the FIA driver-right side. |
| Stands and pedestrian bridges | Approximate or missing | The event plan lists main straight, Pont, Sainte-Baume and chicane spectator areas. Six stand footprints use OSM anchors, seven temporary stands use fitted positions, and two documented bridge traces pass the placement check. |
| Aerodrome and alternate roads | Missing dedicated treatment | The civil aviation chart identifies runway 12/30, taxiways, apron, tower and hangars. OSM supplies the runway alignment, terminal, eleven hangars, karting, nearby alternate racing branches and service lanes. |
| Vegetation and terrain | Approximate | The aerials show scrub, pines and distant limestone relief. The cached terrain grid and instanced pines, cypress-like forms, scrub, cultivated patches and limestone rocks add local character. The village uses a mapped direction with representative buildings. |
| Lighting and equipment | Approximate | The dedicated scene adds a Provence palette, heat shimmer, wet paint response and apron puddles. The sporting fixtures include grids, pit markings, an LED gantry, corner and braking boards, active marshal panels, fire points, masts, medical/recovery props, drainage grates, generic signs and flags. |

## Runoff schedule

Widths and setbacks are nominal metres from the racing edge on the dominant
side. The blue and red widths include their dark separators. Edge paint,
plain tarmac, dry grass and a pale service verge fill out the stack. The
solver narrows or interrupts it at adjacent roads and pit merges. Gravel
trap width and depth are zero throughout. The outside service verge is
decorative aggregate.

| Turn | Kerb | Blue (m) | Red (m) | White (m) | Barrier | Setback (m) | Evidence |
|---|---|---:|---:|---:|---|---:|---|
| 1 | serrated | 13 | 18 | – | Covered tyres | 40 | FIA numbering, treatment fitted |
| 2 | red-white | 13 | 10 | – | Armco | 31 | FIA numbering, treatment fitted |
| 3 | serrated | 13 | 14 | – | Covered tyres | 35 | FIA numbering, treatment fitted |
| 4 | red-white | 10 | 7 | – | Armco | 25 | FIA numbering, treatment fitted |
| 5 | serrated | 14 | 16 | – | Covered tyres | 39 | FIA numbering, treatment fitted |
| 6 | red-white | 17 | 16 | – | Covered tyres | 43 | FIA numbering, treatment fitted |
| 7 | flat | 10 | 6 | – | Armco | 24 | FIA numbering, treatment fitted |
| 8 | serrated | 16 | 18 | – | Covered tyres | 45 | FIA numbering, treatment fitted |
| 9 | serrated | 17 | 15 | – | Covered tyres | 41 | FIA numbering, treatment fitted |
| 10 Signes | flat | 22 | 24 | – | Covered tyres | 57 | FIA numbering, treatment fitted |
| 11 Le Beausset | red-white | 24 | 27 | 14 inside | Covered tyres | 64 | Photo pattern, dimensions fitted |
| 12 | red-white | 16 | 16 | – | Armco | 42 | FIA numbering, treatment fitted |
| 13 | flat | 17 | 14 | – | Armco | 41 | FIA numbering, treatment fitted |
| 14 | serrated | 14 | 13 | – | Covered tyres | 35 | FIA numbering, treatment fitted |
| 15 | red-white | 11 | 10 | – | Concrete | 29 | FIA numbering, treatment fitted |

## Verification

- Checked 712 scenery footprints against 24,699 road polygons. The minimum
  conservative footprint clearances were 4.76 m to the race ribbon, 3.49 m to
  the pit lane and 0.79 m to mapped access branches. The terminal and closest
  hangar clearances were 3.50 m and 1.31 m respectively. Bridge and gantry
  piers cleared racing, pit and access branches by 8.55 m, 2.32 m and 0.45 m.
  Deck headroom was at least 7.80 m over race and pit crossings and 7.70 m
  over sampled mapped access crossings.
- All 18,792 generated surface bands passed the road and scenery overlap
  check. All 15 corners have edge paint, kerb, blue and red pavement, plain
  tarmac, grass, protection and a beyond-barrier verge. All 8,301 transverse
  pavement seams shared the same boundary coordinates. Cross-section
  polygons had no positive-area overlap at the 3 mm check tolerance.
  4,433 abrasive-zone probes agreed with gameplay. Driving probes verified
  red produced stronger drag than blue, both kept the 0.5 s paved-runoff
  penalty, grass received 1 s, and recovery returned the car to the road.
- All 8,100 rendered safety records matched the collision geometry and
  registered contact. The maximum mesh-vertex difference was 0.117 mm.
  Terrain cleared the sampled race, pit and runoff surfaces by 0.23 m or
  more. The preserved elevation profile spans 28.35 m, with a maximum
  0.171 m step between adjacent centreline points. The initial 25 DEM probes
  differed by 0.90 m RMS and up to 1.76 m. A second sampling interval across
  26 points measured 1.03 m RMS and up to 2.77 m. Neither comparison changed
  the track elevations.
- The driver-right pit stayed 650 m long, retained early/late entry behaviour
  and exited without invalidating the lap. The calculated time loss was
  17.99 s excluding service. All three practice starts resolved to the
  requested stations. Madrid, Buddh and Sepang runoff and safety records
  matched the prior release.
- The venue has 7,971 spectators, 376 trees, 95 scrub clusters, 58 flags,
  9 tents, 14 vehicles, 34 marshal lights and 3 pooled smoke sprites. Static
  scenery had 185 mesh submissions across the full venue after batching.
  Parked browser views showed 86–193 draw calls, with the pit-straight view
  above the initial 150-call target. The dry, wet and dynamic-damp views
  had no browser console warnings. Whole-lap weather transitions were not
  driven in a live session.
- Syntax, undefined-name and shadow checks, client and server imports,
  `npm run build` and `npm run build:vercel` passed. The game test suite was
  neither run nor edited.

## Reference gaps

The FIA number map and the cached geometry agree on the layout family and
turn order. The sources do not establish every local corner name, paint
boundary, pigment, kerb profile, gravel absence or exact wall setback.
The strip widths, venue colours and temporary stands are fitted. The pit
building is aligned with the existing simulated corridor, whose entry and
exit are simplified relative to the FIA event routing. Two mapped bridges
fit the full reserved footprint. Other crossing traces lacked a fit and
were not elevated. Airport building elevations, the village silhouettes
and details of the surrounding landscape are approximations.

[Track sources](../TRACK-SOURCES.md) · [Data attribution](../TRACK-DATA-LICENSE.md)
