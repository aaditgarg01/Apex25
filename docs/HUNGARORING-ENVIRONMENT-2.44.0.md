# Hungaroring bowl, surfaces and dressing — 2.44.0

Dedicated Mogyoród/Hungarian GP scenery for `hu-1986`, replacing generic decoration.
The exact clockwise centreline (**4380.970m**, nominal **4.381km**, 14 turns),
horizontal headings and **17m** game width remain. The existing **650m** external
pit corridor already uses the mapped garage side; its XY axis, connections,
service box and logic remain. Car model, engine constants, tyre balance, multiplayer
packet format, track recovery and whole-lap weather scheduler are retained.
Only the established circuit-specific surface/ground hooks are added to physics.

## References and corrected layout

T1 is a **right-hander**, T2 left, T3 right; the brief's T1-left description is
corrected. T4 is the fast left, T5 right, T6–7 right/left chicane, T8 left, T9 right,
T10 left, T11 right, T12 right, T13 left and T14 right onto the pit straight.
Numbered corners follow the FIA 2025 map, avoiding uncertain honorary names.
Timing-line positions use FIA offsets fitted to the existing sampled stations.

The 2025 pit/covered-stand rebuilding references control the exterior treatment.
OSM footprints may predate that reconstruction. No user photos or RaceFans image
were attached to this request; official maps and the project architect's main-
straight photographs were inspected. Their artwork is not redistributed.

## Elevations, hills and camera

Original SRTM anchors remain unchanged alongside a new 129-point periodic profile.
Raw EU-DEM25m road samples span **39.029m**; the old profile spanned **36.31m**.
Two circular 1:2:1 smoothing passes reduce coarse terrain noise, then the profile
is scaled/offset to the team-published **204.2–238.9m** endpoints (**34.7m** relief).
This combines a documented overall range with coarse DEM shape; it is **not** a
survey of current local gradients, bumps, camber or kerbs. Maximum interpolated
grade is **6.92%**. No artificial driving banking is added.

The 21×21 surrounding grid caches the same underlying DEM at **150m spacing**;
road spacing is ~34m. Bowl hills blend toward road-following verges/runoff, with
bounded ±12% off-road cross slopes and graded foundations. The terrain constraint
runs after pit-ground blending to keep actual triangles below the road. Existing
pitch/gravity/camera consume the refined profile. Camera floor checks and complete
crown reservations keep trees out of the road corridor. The distant hills are
coarse terrain silhouettes, not a scan of every Gödöllő ridge.

## Runoff, gravel, grass and beyond — every corner

Targets below are metres outward from the racing edge: **paved / gravel / grass**.
Kerbs are red/white, about **1.03m** wide with the established ~**0.082m** visual
height; T6–7 are classified raised/serrated. White lines use ~0.15m strips; painted
edge accents and existing exit kerbs are retained. Target gravel depression is
**0.08m**, blended with a smooth cross-trap profile; pits/other branches override
any surface patch. These are original fitted widths, not certified safety distances.

| Turn | Kerb | Target P/G/grass m | Fitted at station m | Barrier · target/fitted edge distance | Verification |
| --- | --- | --- | --- | --- | --- |
| 1 | red-white | 12 / 18 / 6 | 7.25 / 10.88 / 3.63 | covered · 36 / 21.76m | Numbering/curve verified; surface extents fitted |
| 2 | red-white | 3 / 20 / 7 | 1.61 / 10.76 / 3.77 | covered · 30 / 16.14m | Numbering/curve verified; surface extents fitted |
| 3 | red-white | 2 / 10 / 7 | 2.00 / 10.00 / 7.00 | covered · 19 / 19.00m | Numbering/curve verified; surface extents fitted |
| 4 | red-white | 2 / 24 / 8 | 0.08 / 0.99 / 0.33 | covered · 34 / 1.40m | Numbering/curve verified; surface extents fitted |
| 5 | red-white | 1.5 / 20 / 5 | 1.50 / 20.00 / 5.00 | covered · 26.5 / 26.50m | Exit gravel verified; widths fitted |
| 6 | raised-serrated | 3 / 8 / 4 | 2.85 / 7.59 / 3.80 | covered · 15 / 14.24m | Numbering/curve verified; surface extents fitted |
| 7 | raised-serrated | 2 / 12 / 5 | 0.55 / 3.30 / 1.38 | covered · 19 / 5.23m | Exit blue line verified; widths fitted |
| 8 | red-white | 2 / 12 / 6 | 1.75 / 10.47 / 5.24 | covered · 20 / 17.45m | Numbering/curve verified; surface extents fitted |
| 9 | red-white | 2 / 12 / 6 | 2.00 / 12.00 / 6.00 | covered · 20 / 20.00m | Numbering/curve verified; surface extents fitted |
| 10 | red-white | 1.6 / 0 / 12 | 1.47 / 0.00 / 11.01 | armco · 13.6 / 12.48m | Numbering/curve verified; surface extents fitted |
| 11 | red-white | 3 / 24 / 7 | 2.97 / 23.74 / 6.92 | covered · 34 / 33.63m | Numbering/curve verified; surface extents fitted |
| 12 | red-white | 5 / 18 / 6 | 1.54 / 5.55 / 1.85 | covered · 29 / 8.95m | Numbering/curve verified; surface extents fitted |
| 13 | red-white | 3 / 12 / 6 | 0.38 / 1.54 / 0.77 | covered · 21 / 2.69m | Numbering/curve verified; surface extents fitted |
| 14 | red-white | 5 / 0 / 4 | 5.00 / 0.00 / 4.00 | concrete · 9 / 9.00m | LHS concrete/fence verified; distance fitted |

The shared table is exported by **public/data/hungaroring-runoff.js**, with a
readable target table in that file and one canonical runtime definition in
shared/hungaroring-runoff-data.mjs. Connecting sections are explicit too: pit
straight/approach, T3–4 climb, T5–chicane link and T11–12 braking straight. Other
long edges receive classified default paving and grass. T6–7 inside edges use
fitted concrete protection, while pit entry/exit/straight use concrete/fencing.

The FIA confirms the T5 exit's grass-to-gravel change, T7 exit blue line and T14
left-hand concrete/fence to the bridge. Other broad gravel areas are **interpretive
placements**, not verified current trap polygons: no circuit gravel-area polygons
were present in this OSM snapshot. Some fitted stacks become narrow beside actual
reserved branches. Unsafe complete quads are omitted instead of covering a road.
The active OSM main-ribbon ways are deduplicated because the full racing ribbon
already reserves them; every alternative/service/pit branch remains reserved.

Pale beige raked gravel, **4,000** checked instanced stones, subtle brown/grey
marble/gravel-spillage/oil/skid decals at the edges and braking zones, mowing-band
grass tints, dry patches, longer grass, weeds and shallow drainage/service strips
complete the coverage. **24** separate beyond-barrier reservations hold dirt/gravel
service dressing, drainage channels, gates, spare tyres and weeds. Drainage is a
shallow visual channel treatment, not a fully simulated hydraulic excavation.

Tarmac runoff has near-normal grip and the existing reduced penalty; gravel slows
heavily; grass loses grip in rain and on slopes; kerbs/paint are slippery when wet.
Dry asphalt far from the prepared rubbered guide loses up to **4.5%** surface grip.
This is an approximate arcade dust effect, not a tyre/track simulation. Existing
traction/penalty/recovery logic consumes the shared surface classification. Rain
darkens gravel/grass, mud-colours service patches, enables shallow cosmetic puddles
and suppresses dust/heat/smoke. Whole-lap dynamic scheduling is unchanged.

## Landmarks, grandstands and surroundings

- Pit **OSM 123905481**: long neutral glazed garages, stacked hospitality/terraces,
  angular white framing, burgundy roof volumes, original podium/control labels,
  garage/pit boards. Expanded source reservation **~26.2×317.2m**, adjusted
  **55.22m** for clearance, with its front parallel to the external pit corridor.
  The architect describes a building over 340m long; the game fit is shorter and
  simplified, not an exact reproduction of that new structure.
- Main stand **230979479**: broad white cantilever/segmented roof, red/blue seats,
  supports, original section/video boards. It needs a **90m** setback from the old
  mapped anchor to satisfy the conservative complete-footprint corridors. Two
  other mapped stand references **230979485/230979500** and five fitted hillside
  viewing banks add early/infield/final-sector atmosphere. Exact roofs, capacities,
  temporary positions and that large main-stand setback remain approximate.
- Control/timing details are an original fitted part of the pit model. Official
  2025 media/race control used a temporary site; no exact current room/standalone
  control-tower survey is claimed. The architecture cache records this uncertainty.
- Mapped service bridge **54843543** has a fitted **144m** span with supports outside
  all road envelopes; it is deliberately longer than the mapped short crossing.
  Deck, supports and rails share renderer/collision solids. Minimum sampled racing-
  road underside clearance **8.383m**. Height/span
  are safe game fits; no road tunnel or altered racing mesh is invented. Other
  mapped bridges/tunnels remain cached, including older passages that may have
  changed with the rebuilding.
- **18,394** instanced summer spectators, **104** waving original
  horizontal Hungarian tricolores, caps, umbrellas in rain and pooled smoke.
  **950** scattered checked tree crowns, understorey and **10,680** dry-grass tufts
  evoke small woodland blocks and the bowl. Far LOD trees have rounded crowns and
  visible trunks. Species/individual tree positions are artistic fits.
- One clear camp cluster (**72 tents, 12 caravans**) and parking cluster, hospitality,
  medical/recovery dressing, village roofs, pylons, masts and a few distant generic
  turbine silhouettes. Turbines are approximate backdrop dressing; no exact local
  turbine installation was verified. Two viewing-bank candidates, one camp/parking
  candidate and one marshal post are omitted where complete footprints cannot fit.

## Dressing checklist coverage

| Requested group | Included treatment / limit |
| --- | --- |
| Pit entry/exit and speed limits | Existing dedicated external pit mesh, cyan connections/edges, 80/BOX/PIT OUT marks; added limit labels and generic pit boards |
| Start/finish and grid | Existing gantry/checker line; 22 staggered grid boxes and original position numbers |
| Safety/detection/sector lines | Fitted SC1/SC2, S1/S2 and detection lines/labels; timing/DRS behaviour is not changed |
| Braking and turn boards | T1 200/150/100/50; T2/T6/T12/T13 150/100/50; numbered boards for all 14 turns |
| Marshals and signaling | 19 fitted posts, orange clothing, live green/yellow LED flag panels, fire-point boards and extinguishers |
| Broadcast / utilities | TV/recovery cranes, timing/camera/speaker poles, light masts, checked cable-run segments, mapped service bridge |
| Medical / recovery | Medical shelter/vehicle dressing and recovery vehicles/cranes outside reserved runoff |
| Safety / gates / tyres | Shared Armco, covered multi-stack tyre/concrete walls and catch fencing; checked gate/spectator-fence solids; 96 spare tyres |
| Sponsor boards / flags | Original APEX/MAGYAR/MOGYOROD colour-block boards and original Hungarian flags; no licensed commercial/team artwork |
| Vegetation and surfaces | Tree/shrub batches, grass/weed/flower variation, gravel stones/raking, marbles, skid/oil/spillage decals and dry patches |
| Paddock / spectators | Glazed pit/hospitality, main/other stands, natural viewing banks, camp/parking and village silhouettes |

## Performance, weather and practice

Instanced crowds, trees, grass, flags, tents, stones, spare tyres and weeds; static
spatial batches; shared original procedural textures; tree LOD at **850m**; effects
throttled at **80ms**. The established scene cleanup disposes GPU assets. All
geographic data/assets are local: no external map/elevation requests during play.

Measured scenery-only construction budget: **304 mesh objects including both
LOD levels**, **269 maximum active-LOD submissions** before culling/shadows,
excluding road/car/runoff/safety/UI. **1,330** individual boxes become **18** spatial
batches. About **1.73M triangles** counts repeated instances and both LOD levels.
This is not a hardware FPS benchmark. Summer light uses clear blue sky, sparse
moving cumulus, straw tones, distant haze, restrained dust/heat. Wet mode uses
darker storm clouds, reflective asphalt/rain, umbrellas, mud and puddle details.

Free Practice adds **Turn 1 approach 220m**, **Infield approach 2020m** and
**Final corner approach 3610m**. Partial starts are untimed out laps.

## Verification actually performed

- Syntax: **23** changed/new JS modules. Strict undefined-name/shadow checks for
  new modules; established shadow allowances for edited legacy files. Browser/
  server module imports, both build commands and whitespace checks. Reports are
  included with the local release snapshot.
- **1,205** complete scenery reservations against all racing/pit branches and
  **3,173** mapped access segments: zero blocked footprints, actual mesh/instance
  overflow or rejected required placement. Minimum clearance **2.200m**; tree-
  crown minimum **6.145m**. Sampled safety-wall edge/racing-road minimum **1.021m**.
- **4,000** surface-stone footprints checked separately as intentional in-trap
  decoration: minimum actual road-edge clearance **0.547m**; mapped access/pit
  clearance is checked during generation. Road paint/decals intentionally lie
  on their own ribbon and are not treated as obstacles.
- **2,537** rendered runoff quad regions: zero other racing-branch, pit, access or
  building overlaps (**38** fitted building/structure footprints); **181** access-
  conflicting and **204** additional pit-conflicting regions omitted.
- All **14** corners have kerb/edge/surface/barrier/beyond classification and safe
  span samples. Every target gravel corner has nonzero unblocked gravel coverage.
  This validates classification/geometry, not the accuracy of unverified trap extents.
- Elevation periodic/continuous: maximum adjacent 3m grade difference **0.616
  percentage points**, maximum vertical increment **0.2074m**. Across a 2mm seam,
  height/pitch differences are ~**0.0001107m / 0.000000052rad**. Zero sampled
  road/runoff edge-height mismatches. Original anchors and other circuits' source
  elevation records retained.
- **2,193** road-to-generated-terrain triangle probes: no intrusions, minimum
  separation **0.313m**. **3,051** static chase-camera positions through most of
  the lap at three speeds: minimum terrain separation **4.340m**, before floor
  clamping. **2,193** static camera-to-car rays against conservative complete tree,
  stand and building boxes: no occlusions. Steering/smoothing/full-view visibility
  and all camera modes were not exhaustively checked.
- **326** static full-car pit poses: zero barrier contacts; pit XY unchanged.
  **5,643** shared safety solids match rendered sources, no missing/extra solids or
  vertex-count issues. Other **41** circuits retain identical safety geometry hashes.
- Idle dry/wet browser views and console inspection only; final browser observations
  are in the release evidence. The game test suite was neither run nor edited.
  No driving, live impacts, recovery, multiplayer, full dynamic-weather transition
  or hardware FPS playtest is claimed. Cars may coast on descents under existing
  gravity during idle previews; no driving input was applied.

## Uncertain / fitted details to compare with photos

Exact current gravel polygons/depths and barrier distances outside the documented
FIA changes; temporary stands and roofs; old OSM footprint vs rebuilt pit/stand
scale/setbacks; current control/media room locations; bridge span/height and changed
passages; local gradients/camber/bumps from coarse terrain; campsite positions,
species, distant village/turbine/mast silhouettes. The 34.7m profile is an overall
published-height fit, not surveyed local pavement. This remains procedural game
scenery rather than official-game assets or scan-level fidelity.

## References

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
