# Barcelona-Catalunya Mediterranean environment — 2.45.0

Dedicated `es-1991` scenery replaces the generic venue. Original procedural models,
textures and neutral venue lettering; no licensed sponsor/team artwork added.

## Layout retained and reference confidence

The existing loop matches the **modern 14-corner layout without the final chicane**:
T13 and T14 are fast right-handers. It is not converted to the old 16-corner route.
Its exact source geometry, sampled XY/headings, **4669.556m** game length, **17m**
game width and start station remain. The legacy metadata still says 4.655km; the
current official no-chicane reference says 4.657km. Those differences are documented
rather than silently rebuilding the centreline. Other 41 circuits are unchanged.

Neutral T1–T14 boards follow the FIA map: R/L/R/R/L/L/L/R/R/L/L/R/R/R. The centreline
comparison establishes the no-chicane variant; it does not certify every radius or
survey point as identical to current homologation. Existing alternate motorcycle,
national, old-layout and pit/access branches remain reserved, including the T1
motorcycle long-lap route. Nearby karting/other circuit branches are retained too.
No user photos were attached. Official 2025 maps/notes and the circuit's illustrated
2024 facilities brochure were inspected; third-party reference artwork is not shipped.

## Elevation and ground

All original SRTM anchors remain. **129** periodic EU-DEM25m road samples (~36m
spacing) are smoothed with two circular 1:2:1 passes, then fitted to the existing
**112.08–142.77m / 30.69m** range. Raw DEM range is **32.962m**. This compares and
refines the coarse shape without claiming a survey of current pavement gradients,
camber, kerbs or bumps. Maximum interpolated grade is **8.58%**, an approximate
coarse-terrain result, not an independently verified real-world local gradient.
No banking or physics constants are invented.

A cached **21×21 / 441-point**, 150m grid supplies rolling Mediterranean terrain.
Road verges/runoff follow the driving profile, blending to the DEM away from the
ribbon. Off-road cross slopes are bounded to ±12%; foundations are graded and the
post-pit terrain constraint keeps actual terrain triangles under the road. Existing
pitch, gravity and camera systems consume the profile through their established hooks.

## Corner-by-corner runoff, gravel and grass

All distances are outward from the racing edge in metres. Target values are artistic
fits unless stated otherwise, not certified safety measurements. Red/white/flat/
serrated classifications use the game's existing kerb system (~1.03m width,
~0.082m visual height), plus a white edge line and painted accents. Gravel has a
**0.08m** shallow sinusoidal depression rather than a road bump.

| Turn | Kerb | Target tarmac / gravel / grass m | Fitted at station m | Barrier; target / fitted edge distance | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | red-white | 5 / 65 / 8 | 4.47 / 58.13 / 7.15 | covered; 78 / 69.75m | T1 expanded gravel confirmed; radial extent fitted |
| 2 | red-white | 4 / 18 / 7 | 1.70 / 7.63 / 2.97 | covered; 29 / 12.30m | Numbering confirmed; surface extents interpretive |
| 3 | red-white | 8 / 25 / 8 | 3.66 / 11.43 / 3.66 | covered; 41 / 18.74m | Numbering confirmed; surface extents interpretive |
| 4 | red-white | 6 / 20 / 7 | 5.59 / 18.63 / 6.52 | covered; 33 / 30.75m | Numbering confirmed; surface extents interpretive |
| 5 | red-white | 5 / 18 / 7 | 4.60 / 16.55 / 6.43 | covered; 30 / 27.58m | Blue exit line confirmed; other extents fitted |
| 6 | flat-exit | 3 / 0 / 12 | 0.28 / 0.00 / 1.12 | armco; 15 / 1.40m | Numbering confirmed; surface extents interpretive |
| 7 | serrated | 5 / 14 / 6 | 2.42 / 6.77 / 2.90 | covered; 25 / 12.08m | Numbering confirmed; surface extents interpretive |
| 8 | serrated | 6 / 0 / 10 | 0.60 / 0.00 / 1.01 | armco; 16 / 1.61m | Numbering confirmed; surface extents interpretive |
| 9 | red-white | 8 / 25 / 8 | 4.73 / 14.79 / 4.73 | covered; 41 / 24.25m | Blue exit line confirmed; other extents fitted |
| 10 | red-white | 12 / 18 / 6 | 12.00 / 18.00 / 6.00 | covered; 36 / 36.00m | Blue exit line confirmed; other extents fitted |
| 11 | flat-exit | 5 / 0 / 10 | 0.47 / 0.00 / 0.93 | armco; 15 / 1.40m | Numbering confirmed; surface extents interpretive |
| 12 | red-white | 8 / 18 / 6 | 2.59 / 5.82 / 1.94 | covered; 32 / 10.35m | Blue exit line confirmed; other extents fitted |
| 13 | red-white | 12 / 12 / 5 | 12.00 / 12.00 / 5.00 | concrete; 29 / 29.00m | Numbering confirmed; surface extents interpretive |
| 14 | red-white | 14 / 12 / 5 | 14.00 / 12.00 / 5.00 | concrete; 31 / 31.00m | Blue exit line confirmed; other extents fitted |

The table is exported by `public/data/barcelona-runoff.js`, with readable target
comments and a single runtime definition in `shared/barcelona-runoff-data.mjs`.
Fitted station values can vary along each corner and may contain masked branch
gaps. T6/T8/T11 become especially narrow beside existing alternate routes; the
centreline and those branches take precedence over the proposed widths.

**T1 receives a substantial gravel area:** ~58.13m fitted radial gravel at its
reference station before branch masks, rather than incorrectly treating the mapped
motorcycle long-lap route as the outer edge of the entire trap. Broad bands are
split into ≤3m strips; each complete quad is masked against every access and actual
external pit branch. The long-lap ribbon stays clear and the gravel continues beyond
it. The official 70m reference describes a gravel-area extent, not a uniform radial
strip around every point of T1. No exact 70m survey shape is claimed.

Main/pit straight, T3–4 rise and back straight have explicit connecting-edge rows;
remaining edges have classified paving/grass defaults. Shared boundaries locate the
outer walls; shared strip geometry drives visible surface coverage. Surface queries
preserve normal grip on the reserved branch footprints, then use the same boundary
classes for tarmac, paint, gravel and grass. Racing-line/track-limit/wet-grip hooks
reuse those classes; track limits and recovery rules are retained.

FIA notes confirm RHS concrete/fencing approaching T1, realigned T2 white line and
blue exit lines at T5/T9/T10/T12/T14. Final safety treatment uses neutral concrete/
absorbing-block forms without branding. Other gravel shapes, widths, depths and
barrier offsets are interpretive: OSM had no tagged circuit gravel-trap polygons in
this snapshot. They are not described as verified current trap extents.

Grey tarmac runoff, beige raked gravel with **4,000** individually road-checked stones,
mown straw/olive grass, greener outer vegetation, bare ochre patches, drainage/service
strips, tyre marbles, dust/oil/skid and small gravel-spill decals complete the surfaces.
Tarmac uses near-normal grip/reduced off-track penalty; gravel slows heavily; wet
and sloping grass loses more grip; paint/kerbs are slippery when wet. Barcelona
retains normal high-grip asphalt without Hungaroring's off-line dust grip reduction.
Rain darkens gravel/grass and mud-colours edge soil, enables shallow cosmetic puddles,
and suppresses dust/heat/smoke. Whole-lap dynamic-weather scheduling is unchanged.

## Landmarks, placement and dressing

- **Pit OSM 33742578:** long neutral glazed garages, two occupied facade levels,
  covered terrace, original solar-style roof bands, pit boards and podium/control
  labels. The broad irregular mapped footprint cannot fit intact between all road
  branches. A **36×260m** checked facade envelope is fitted parallel to the unchanged
  external pit axis on the correct side, shifted **~59.50m** from the mapped envelope
  centre. This is a shorter, narrower representation, not a survey-accurate building.
- **Main stand 33742643:** sweeping segmented canopy, dense seats/crowd, supports,
  generic video boards; source envelope scaled **0.85**, shifted **11.66m**. Mapped
  B/C/E/J/K/L/M/A/T1 stands are fitted separately. G/N/H use smaller checked substitute
  modules after their broad mapped envelopes fail clearance. The T10 VIP stand is
  omitted where it cannot fit; no false claim that its exact roof has been reproduced.
- **Rooftop 1372681544:** two glazed upper levels, deep red horizontal roof planes,
  concrete towers, generic venue lettering and shared solid deck/rails/glazing.
  OSM envelope/reference controls the orientation and back-straight location; clear
  support fitting moves the centre **40m** and extends the span to **144m**. It is
  deliberately labelled approximate. A 30m tower-height cue comes from the official
  facility reference; final support heights fit the game's terrain and overhead gap.
- **Footbridge 152013463:** fitted **49.13m** crossing shifted **10m** from its map
  centre; shares deck/pier/rail solids with collision. Other mapped underpasses and
  crossings are cached/reserved, but unsurveyed tunnel excavations and portals are
  not invented. No new bumps or holes are cut into the racing mesh.
- A generic pit-exit timing tower, hospitality, medical/recovery dressing, industrial
  flat-roof warehouses, terracotta domestic roofs, masts/pylons and motorway-style
  surroundings. Backdrop geometry is approximate; no speculative wind turbines added.
- **22,726** instanced spectators, **123** waving original senyera/crest-free Spanish
  flags, summer clothes/caps, wet umbrellas and pooled smoke. **900** checked tree
  crowns represent Mediterranean pines, slender cypress, olive/broadleaf and shrubs;
  exact tree species/locations are artistic. **10,440** dry-grass tufts and weeds.
- One fitted camp (**72 tents, 12 caravans**), parking clusters and two safe viewing
  banks. One camp, one bank one marshal post and three grass-patch candidates are omitted for clearance.

All ground-level objects reserve their COMPLETE envelope against the racing/runoff,
external pit and mapped vehicle-road corridors, then against earlier reservations.
Trees reserve complete crowns. Overhead structures intentionally cross the road only
above their measured static clearance; supports remain footprint-clear. Checked
Barcelona site groups bypass the generic world-axis pit cleanup, which otherwise
mistakes rotated long buildings' empty bounding-box corners for obstructions.

| Dressing requirement | Included treatment / limits |
| --- | --- |
| Pit and speed markings | Existing external pit ribbon/connections, entry/exit lines; 80, PIT LIMIT, PIT OUT; generic pit boards |
| Grid / timing | Existing checker line/gantry; 22 staggered boxes and numbers; fitted SC1/SC2, S1/S2 and DRS-detection labels |
| Braking / turn boards | T1 200/150/100/50; T4/T5/T7/T10/T13 150/100/50; all 14 corner boards |
| Marshals / fire / flags | Fitted orange marshals and huts, flag stands, live green/yellow LED panels, fire boards/extinguishers |
| Broadcast / utility | TV and recovery cranes, camera/timing/speaker poles, pit/paddock light masts, short checked cable runs |
| Recovery / medical | Neutral parked vehicles, shelter and service clearances outside runoff |
| Fences / access | Shared catch/Armco/concrete/covered-tyre geometry, gates and spectator fences; terrain-following endpoints |
| Surface details | Rubber/marble, gravel spill, skid/oil decals, raking, mowing bands, dusty soil and rain mud/puddles |
| Beyond barriers | 23 checked service/drainage/gate reservations, 92 spare tyres, 414 weeds/flowers, spectator/woodland edges |
| Signs / flags | Original APEX/CATALUNYA/MONTMELO boards and venue lettering; no copied sponsor marks or national crests |

Sector labels use the FIA offsets fitted to source stations: S1 ~1605m (50m before
T4), S2 ~3346m (89m before T10), DRS detection ~2714m (86m before T9). Existing game
timing/DRS logic is not rewritten by these decorative labels. Free Practice adds
**Turn 1 braking 540m**, **Sector 2 approach 2270m**, **Final sector approach 3280m**;
partial starts are untimed out laps. Car model, engine/tyre balance, multiplayer
protocol, pit route/stop logic, track-limit validation and recovery are unchanged.

## Performance and weather

Instancing covers spectators, trees, grass, flags, tents, cars, gravel and weeds.
Static geometry is spatially batched; procedural textures/sign atlases are shared;
tree near/far LOD switches at 850m; effects update at 80ms. Existing scene disposal
owns GPU cleanup. All maps/DEM/data are local; no network geography request occurs
while driving. Dry atmosphere uses a blue Mediterranean sky, thin clouds, warm
surfaces and distant haze; wet mode uses storm grey, rain, darker ground and umbrellas.

Measured scenery construction: **283** mesh objects including both tree LOD levels,
**267** maximum active-LOD mesh submissions before culling/shadows, excluding road,
runoff, safety meshes, car and HUD. **1,988** boxes become **17** spatial batches.
About **2.05M triangles** counts all instances and both LODs; not a hardware FPS test.

## Verification actually performed

- Syntax: **23** changed/new JS modules; strict no-undefined/no-shadow checks on new
  modules, established allowances for edited legacy modules; **22** module imports.
  Both `npm run build` and `npm run build:vercel`; whitespace check.
- **1,168** complete scenery reservations against **5,721** access-road segments,
  full racing/runoff and external pit: no blocked required sites, mesh/instance
  overflow or rejected required placement. Minimum footprint clearance **2.017m**;
  complete tree-crown clearance ≥**6.07m**. Safety-edge/actual-road minimum **1.008m**.
- **4,000** stone footprints: minimum actual-road clearance **0.652m**; generation
  additionally checks mapped access/external pit. Intentional road paint and tiny
  cosmetic decals are not obstacles and are checked separately from scenery.
- **12,101** actual shared split-band runoff quads: no other-racing-branch, pit,
  access or building overlaps (**59** building/support footprints). Includes **147**
  blue exit-line quads. Conservative whole-quad clipping leaves small branch gaps.
- All **14** corners classified with kerb, white/paint edge, surface, barrier and
  beyond stack; each proposed gravel corner has nonzero actual rendered gravel.
- Original centreline XY/headings, original anchors, all other elevation records
  and pit XY geometry retained. Maximum adjacent ~3m grade change **1.165 percentage
  points**, maximum vertical step **0.257m**; across a 2mm lap seam height/pitch
  difference ~**0.0000204m / 0.000000297rad**. No sampled runoff/road-edge mismatch.
- **2,337** road-to-actual-terrain triangle probes: no intrusions; minimum gap
  **0.635m**. **3,051** default chase-camera poses: minimum unclamped terrain gap
  **4.315m**. **2,337** static camera-to-car rays against conservative tree/building/
  stand boxes: no occlusions. Not a complete check of steering/smoothing/all views.
- **326** static full-car pit poses: zero safety contacts. **5,523** shared safety
  solids have matching rendered sources/vertex counts, no extra or missing solids.
  Both documented overpasses have ≥**14.45m** static underside-to-road clearance.
  Other **41** circuit safety hashes remain unchanged.
- Parked dry/wet browser views and console inspection are recorded in local release
  evidence. No game test-suite files were run or edited. No driving, live impacts,
  recovery, multiplayer, complete whole-lap weather transition or hardware FPS test
  is claimed. An idle car may coast downhill under existing gravity.

## Uncertain or fitted details to compare with photos

Exact modern corner radii vs retained coarse source; current trap polygons/depths;
wall distances; old mapped building/stand footprints vs renovated roofs; pit scale/
setback; G/N/H stand substitutions and omitted T10 stand; Rooftop span/shift and
support heights; detailed underpass portals; DEM-derived local gradients/camber;
individual vegetation, camp and industrial/backdrop positions. This is procedural
browser-game scenery, not scan-level fidelity or official-game assets.

## References

- [Official modern no-final-chicane layout, enlarged T1 gravel and signalling tower](https://www.circuitcat.com/en/news/formula-1/the-formula-1-aws-gran-premio-de-espana-2023-changes-its-track-configuration/).
- [FIA 2025 circuit/pit/sector/DRS maps](https://www.fia.com/system/files/decision-document/2025_spanish_grand_prix_-_race_director_event_notes_-_circuit_map_pit_lane_quarantine_zone_and_red_zones.pdf).
- [FIA 2025 concrete approach wall and blue exit-line changes](https://www.fia.com/system/files/decision-document/2025_spanish_grand_prix_-_race_directors_event_notes_.pdf).
- [Official 2024 facilities plan and architecture photographs](https://premsa.circuitcat.com/2024/MotoGP/Presentacio/La%20transformacio%20del%20Circuit_Novetats_2024_CAT.pdf).
- [Official Rooftop opening and 30m south-tower reference](https://www.circuitcat.com/ca/noticies/formula-1/el-rooftop-ya-se-alza-como-nuevo-emblema-del-circuit/).
- [Official pit/control/terrace redevelopment context](https://www.circuitcat.com/es/noticias/circuit/la-transformacion-del-circuit-de-barcelona-catalunya/).
- [Official solar-panel/roof context](https://www.circuitcat.com/en/news/sostenibilidad-en/the-circuit-saves-52-tons-of-co2-emissions-in-only-four-months/).
- [OSM venue, alternate/access roads, buildings, woodland and crossings; cached 2026-11-06](https://api.openstreetmap.org/api/0.6/map?bbox=2.241,41.558,2.275,41.580).
- [EU-DEM25m via Open Topo Data](https://www.opentopodata.org/datasets/eudem/).
