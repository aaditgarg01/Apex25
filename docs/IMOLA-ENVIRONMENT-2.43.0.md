# Imola parkland environment — 2.43.0

Dedicated scenery for Imola (`it-1953`), replacing generic objects. The exact
existing anticlockwise centreline, horizontal headings and 17m game road width
are retained. Imola’s 288m generated pit corridor is mirrored to the mapped
garage side (driver’s right); its fixed axis, length, tapers and service logic
are retained. The former infield-side default did not match the pit building. Sampled lap length is **4903.671m**, while the
existing UI/FIA nominal length is 4.909km; the source is not rescaled to force a
match. No car model, driving-engine constants, multiplayer packet format, tyre
balance, recovery or weather scheduling changes are introduced. Circuit-specific
off-track surface/height hooks use the established engine.

## Verified layout and terrain approach

Current F1 uses the Tamburello T2–4 chicane, Villeneuve T5–6, Tosa T7, Piratella T9,
Acque Minerali T11–13, Variante Alta T14–15, Rivazza T17–18 and fast pit approach
T19. It bypasses the old Variante Bassa chicane. The brief's old Bassa description
is not added to the retained centreline. Turn labels follow the FIA 2025 map;
the stand-price map is used for area context rather than its older numbering.

All original SRTM anchors remain. An additional **129-point EU-DEM25m** periodic
profile (~38m sample spacing) gives **33.985m** relief versus **35.12m** previously.
A **21×21** surrounding grid uses the same dataset, spaced **150m**. These are
coarse terrain samples, not laser scans, surveyed racing camber or current bumps.
Existing interpolation, road pitch, gravity/gradient and camera logic consume
the refined profile. Maximum interpolated grade is **12.99%**, not independently
confirmed as a current racing-surface gradient. No artificial banking is added.

Road-aware terrain blends cached foothills/park slopes toward runoff. Off-road
cross slopes are limited to ±12%; building foundations are graded and the river
bed is lowered only inside checked water patches. The final triangle constraint
runs after pit-ground blending. Grass loses grip in rain and on cross slopes.
Imola's runoff height hook also supplies the car's off-road ground reference.

## Mapped landmarks and original dressing

- Pit way **60890960**: long multi-level garages, glazing, flat segmented roof,
  hospitality/control, podium and original **APEX · PIT & PADDOCK** / pit signage.
  It follows the generated external pit lane. Safe model uses 74% of the expanded
  source envelope and a 45m longitudinal adjustment; not an exact building scan.
- Control way **60890958**: seven above-ground levels, glazed terraces and neutral
  styling. Seven storeys are officially documented; ~25m rendered height is fitted.
  Source footprint is set back 32m to clear the safety/road corridor.
- Eleven usable mapped stand footprints around the main straight, Tosa, Acque
  Minerali and Rivazza, plus five separate viewing banks including Tamburello,
  Piratella and Alta. Main stands use flat/partial canopies, steel supports, red
  seats, original video/section boards and dense instanced tifosi. Roofs and
  temporary seating are approximate. Some source fits shift up to **81.54m** and
  shrink to **74%** to keep complete geometry outside all corridors. Narrow source
  references remain in data but are not enlarged across roads.
- **18,257 spectators**, **78** original Italian
  tricolore flags, **1,600** checked tree crowns with broadleaf/pine
  variation, understorey, grass tufts and leaf litter. Generic species evoke the
  park, not a botanical survey. Dense vegetation uses spatial LOD groups.
- Santerno follows mapped way **771601726**, retaining only locally relevant
  complete safe water patches. Its geographic course is mapped rather than
  assuming the brief's western-side description. Water width/depth, ripples,
  bank carving and low mist are artistic fits. Road-crossing portions are omitted;
  no new road bridge or driveable crossing is invented.
- **180** checked small park-path sections from mapped footways, benches and lamps,
  three documented small footbridges (**133483858/859/860**) and one clear mapped
  park gate (**13645591538**). Original bridge decks, rails and brick-colour gate
  solids share renderer/collision geometry. Dimensions/materials are fitted.
  Other source underpasses/gates remain cached without cutting new tunnels.
- Warm brick/terracotta town houses, two camp clusters (**144 tents, 24 caravans**),
  one parking cluster, hospitality, marshals/flag LEDs, TV/recovery cranes,
  original generic colour-block banners, 150/100/50 braking boards and turn boards.
  The extra Rivazza viewing-bank and second parking candidate are omitted when
  they cannot fit. No licensed sponsor/team art is added.

## Memorial areas

Mapped Senna node **2112865605** is represented by a small original abstract seated
marker, flowers, paving and bench. It does not copy the existing sculpture's
likeness/design or inscriptions. The mapped point lies inside the conservative
service-road reservation; the **5×5m model is set back 16m into adjacent clear
park space**. This displacement is recorded and approximate, not a claim of exact
statue placement. Ratzenberger node **11495410131** is mapped **by Tosa**, not Bassa;
a small **1×1m blank marker/flowers** remains on that mapped anchor. No incident,
commercial art, names or inscriptions appear on the models. Separate quiet buffers
exclude stands, boards, marshals, banners/camps; no smoke pool lies within 100m.

## Every corner: gravel, grass, paving and safety

Target metres beyond the outside road edge are **paved / gravel / grass**. Actual
values are capped/smoothed against every nonlocal racing branch and mapped access
road, then omitted wherever a complete quad would cross a reserved road or pit.
Inside edges also retain classified grass/paving. FIA notes support selected edge
relationships; broad trap dimensions below are original interpretations.

| Turn / area | Station m | Target stack | Fitted at station | Barrier |
| --- | ---: | --- | --- | --- |
| T1 Pit straight bend | 350 | 2 / 0 / 7 | 1.28 / 0.00 / 4.50 | armco |
| T2 Tamburello entry | 702 | 7 / 18 / 5 | 7.00 / 18.00 / 5.00 | covered |
| T3 Tamburello middle | 756 | 3 / 12 / 5 | 3.00 / 12.00 / 5.00 | covered |
| T4 Tamburello exit | 879 | 2 / 18 / 6 | 2.00 / 18.00 / 6.00 | covered |
| T5 Villeneuve entry | 1335 | 2 / 17 / 5 | 2.00 / 17.00 / 5.00 | covered |
| T6 Villeneuve exit | 1407 | 2 / 19 / 5 | 1.95 / 18.52 / 4.87 | covered |
| T7 Tosa | 1710 | 2 / 17 / 6 | 1.96 / 16.62 / 5.87 | covered |
| T8 Tosa climb | 2090 | 1.6 / 0 / 9 | 1.60 / 0.00 / 9.00 | armco |
| T9 Piratella | 2336 | 2 / 20 / 5 | 1.53 / 15.32 / 3.83 | covered |
| T10 Piratella descent | 2516 | 2 / 0 / 8 | 2.00 / 0.00 / 8.00 | armco |
| T11 Acque Minerali entry | 2732 | 2 / 16 / 5 | 2.00 / 16.00 / 5.00 | covered |
| T12 Acque Minerali right | 2840 | 2 / 20 / 6 | 1.22 / 12.23 / 3.67 | covered |
| T13 Acque Minerali exit | 2909 | 2 / 16 / 5 | 2.00 / 16.00 / 5.00 | covered |
| T14 Variante Alta entry | 3353 | 2 / 14 / 5 | 0.66 / 4.61 / 1.65 | covered |
| T15 Variante Alta exit | 3383 | 2 / 18 / 5 | 0.15 / 1.32 / 0.37 | covered |
| T16 Rivazza descent | 3945 | 2 / 0 / 8 | 0.28 / 0.00 / 1.12 | armco |
| T17 Rivazza first | 4133 | 2 / 20 / 5 | 0.92 / 9.19 / 2.30 | covered |
| T18 Rivazza second | 4259 | 2 / 22 / 5 | 0.66 / 7.31 / 1.66 | covered |
| T19 Pit straight approach | 4622 | 2.5 / 0 / 2.5 | 2.01 / 0.00 / 2.01 | concrete |

Tosa's post-apex/exit gravel blends into **grass**, consistent with the 2025 FIA
exit note. Red/white raised/serrated kerbs use the established renderer, with
rubber/braking marks and short blue edge accents. **IMOLA** original painted text
is confined to the wider paved Tamburello apron when the full lettering footprint
fits; no copied venue/sponsor artwork. These are not exact reproductions of every
FIA 1.5m edge-line offset or surveyed current trap outline.

One shared surface plan supplies rendered paving/gravel/grass, scenery footprint
reservations, wall lines, track-limit/recovery boundary, wet/slope grip/drag and
racing-line surface grip. Tarmac retains near-normal grip with the existing reduced
penalty; gravel slows heavily; grass is slippery especially wet/on slopes; paint
and kerbs lose wet grip. Armco, covered tyre walls, concrete and catch fencing
consume the exact same shared solids used for collision. Park bridge/gate solids
use that list too. No separate invisible safety-collider layout is added.

## Weather, practice and performance

Soft spring Italian light, warm highlights, broad moving clouds, dappled tree
shadows and gentle haze. Rain darkens grass/foliage, enables umbrellas and low
river mist, suppresses smoke, and uses existing rain/spray/reflections. Dry, damp,
wet and dynamic whole-lap weather remain available; no scheduler changes.

Free Practice adds **Tamburello approach 540m, Tosa 1550m, Acque Minerali 2630m,
Rivazza 4000m**. Partial-circuit starts are untimed out laps, as before.

Instanced crowds, flags, tents, cars and forest; original shared procedural maps;
static meshes batched spatially; tree LOD at 650m; animations throttled at 80ms;
existing scene disposal on change. All data/assets local, no playtime geographic
requests. Measured scenery-only budget: **251 mesh objects including
both tree LOD levels**, **224 maximum active-LOD submissions**
before frustum culling/shadow passes, excluding road, car, runoff and safety.
**1,439** individual boxes become **16** spatial batches. About **1.60M triangles**
including repeated instances and both LOD levels. No hardware FPS claim is made.

## Verification scope and results

- Syntax, strict undefined-name/shadow checks for new modules; existing shadow
  allowances for edited legacy files. Browser/server module import checks,
  `npm run build`, `npm run build:vercel` and whitespace checks.
- **2,187** complete reservations against **4,789**
  access segments plus all racing/pit branches: zero blocked footprints,
  mesh/instance overflow or rejected required placement. Minimum full-footprint
  corridor clearance **1.164m** (small Tosa marker), tree-crown clearance **5.020m**.
  Sampled barrier-edge/racing-road clearance **0.724m**.
- **2,994 runoff quads**, zero other-racing-branch, pit,
  access or building intersections (**49** fitted building/structure footprints).
  **263** access-conflicting and **13** additional pit-conflicting quads omitted.
- Elevation continuity: max adjacent 3m grade difference **1.251 percentage points**,
  max vertical increment **0.3895m**; start/finish height/pitch differences over
  a 2mm interval **0.00000574m / 0.00000184rad**. Zero sampled road/runoff edge
  height mismatches. Original anchors and all other elevation records retained.
- **2,454** road-to-actual-generated-terrain-triangle probes: zero intrusions,
  minimum road/ground separation **0.702m**. **1,302** static default chase-camera
  poses through Piratella/Acque/Alta at three speeds: minimum camera-to-terrain
  **4.350m** before floor clamping. This does not verify every dynamic smoothed
  frame, tree occlusion ray or line of sight.
- **145** static full-car-envelope pit poses: zero barrier contacts; pit side
  corrected, with its fixed-axis frame, length and tapers unchanged. **6,075 shared safety solids** match rendered sources, with no missing,
  extra or vertex-count issues. Other **41 circuits** retain identical safety
  geometry hashes and elevation records.
- Parked browser dry/wet scenery views and console inspection only; detailed
  final observations are in the release verification folder. The game's test suite
  was neither run nor edited. No driving, live impacts, recovery, online multiplayer,
  full dynamic-weather transition or frame-rate playtest is claimed.

## Uncertain / approximate

No photos were attached to this brief. Official maps and the tourism memorial
photo were inspected. Exact temporary stands/roofs, pit/control scale and set-backs,
trap extents, current camber/bumps and precise gradients, river level/width, species,
small bridge/gate construction, campsites and distant town silhouettes are fitted.
Memorial references are geographic; the Senna model is intentionally set back for
clearance and is original abstract geometry. This is procedural game scenery,
not scan-level fidelity or official F1 game assets.

## References

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
