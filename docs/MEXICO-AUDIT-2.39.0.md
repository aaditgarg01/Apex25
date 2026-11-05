# Mexico City audit and correction — 2.39.0

Audit baseline: commit 643f0855c56b588614c7c80c1651f4e81b11a3c6 (2.38.0),
including the earlier 2.31.0 Mexico implementation. Reference snapshot: 2026-11-05.
No additional user photos accompanied this attachment; official drawings, OSM and
the public aerial below were used. Evidence supports location/shape, not scanned
roof, seating, surface or barrier dimensions.

## Step 0: existing environment audit

| Item | Baseline status and evidence | Action |
| --- | --- | --- |
| Centreline and elevation | Correct for retained game layout: sampled 4,307.28m vs official 4.304km; 17 corners, clockwise. Original relief 2.56m; nine fresh SRTM samples span 4m, consistent with a near-flat circuit at coarse DEM resolution. | Keep every XY/elevation sample and existing thin-air tuning. No banking/camber added. |
| Stadium stands | Wrong position/orientation and shape: two straight banks placed by lap percentage; mapped ways 377679562 and 1315400018 instead form two curved L-shaped stand arms. Old long axes are roughly perpendicular to mapped stands; one bank is displaced hundreds of metres. Public aerial supports separated stands, not a closed circular bowl. | Replace the two banks with 98 checked patches following both mapped inner edges, two deck bands/concourse gap and neutral canopy profile. |
| Stadium ground and infield | Approximately right resurfacing; missing broad concrete arena treatment and detailed spectator furnishings. Exact current event field markings not verified. | Fit 365 concrete forecourt tiles outside road/props; add podium/screens and festival details. Do not invent a baseball diamond on the active event apron. |
| Stadium wall/fence | Approximately right generic safety line; not corner-specific or complete access-aware placement. | Shared per-corner solids for rendering/contact, close concrete stadium edges and masked service gates. Distances remain approximate. |
| Main straight and Turn 1 stands | Missing coverage: one generic straight stand cannot represent mapped stand group or T1 complexes. Official access map confirms multiple event stands; exact temporary footprints vary by year. | Three mapped main-stand envelopes plus five successfully fitted temporary stands covering T1, esses/back section and final approaches. Two optional stands omitted where they cannot fit. |
| Pit building | Approximately right: old 310m length vs mapped 303.4m envelope. Old anchor about 19m off mapped centre; garage frontage worth retaining. | Retain multi-storey garage/glass design, move to mapped centre and align with unchanged generated pit corridor; conservative fit reduces target to 29.44×280.6m. |
| Copper dome | Approximately right recognizable concept, wrong anchor about 497m from mapped arena centre. | Move to mapped centre of way 126607350; model central circular 176m reservation, not the complete 226m ancillary-complex envelope. |
| Other sports park | Approximately right football pitches, broadleaf planting and low skyline; generic exact species/architecture not verified. | Use cached park/pitch/urban outlines and clear placements for five fields, sports pavilions, 650 trees, 129 urban blocks, patchy verges and utility lines. |
| Old Peraltada | Missing decorative remnant. OSM old raceway 772755822 and aerial show retained older route; official F1 history says stadium bisects the banking and current final part remains in use. | Add five small decorative, non-driveable remnants beside cached older route. No duplicate driveable road or unverified physics banking. |
| Runoff/gravel/grass | Approximately right generic tarmac/grass city theme, missing explicit per-corner classification. Baseline did not generate generic gravel here. | Replace generic runoff with explicit 17-corner shared table; cap all bands against road/pit/access branches and scenery. No gravel trap location verified: zero gravel throughout this pass. |
| Track furniture | Approximately right basic marshal posts, flags and braking helpers; missing much detail and original lettering. | Retain normal start gantry/grid; add corner/braking boards, pit and sector/SC marks, officials, caution LEDs, cranes, ambulance, fire points, drains/cables, spare tyres and generic boards. |
| Crowd/festive dressing | Missing dense stadium/event identity beyond basic fans. | Instance 23,576 spectators, hats, wet umbrellas, 56 flags, 24 banner panels, 306 flower clusters, papel picado/skull motifs and pooled cosmetic smoke/confetti. No real brands. |
| Lighting/weather | Approximately right thin-air bright look and working common rain system. | Pale hazy blue dry setting, dark storm palette; keep existing damp/wet/dynamic whole-lap scheduling. No new weather protocol. |
| Pedestrian bridges | Missing visible model; seven OSM reference paths found, heights absent. | Cache references. Current two-pier fit cannot clear all retained service branches; omit the unsafe model rather than claim an accurate bridge. |

## Placement and rendering

The racing ribbon, fitted safety/runoff corridor, complete external pit corridor
and 3,019 segments derived from 528 cached road polylines are reserved first.
OSM `area=yes` apron boundaries are not treated as road centrelines. Stadium patches
reserve their complete envelope, including roof, spectator/flag overhang and
furnishings; only neighbouring patches within the same stadium can intentionally
abut. All other complete footprints must clear every road branch. The arena uses
an analytical circular footprint. Existing geometry heights are respected and
near-road ground is constrained below all nearby branches.

Pit walls, concrete, Armco, protective covers and catch fences are constructed
from one shared wall list also used by contacts. No separate scenery collider is
introduced. Service openings are omitted from both renderer and collision list.
Surface classification feeds rendering, scenery reservations, track limits, wet
grip and guide-speed sampling without changing the physics core.

Instancing is used for fans, trees, hats, grass, flags and festival details; shared
procedural textures/label atlases, 480m static batching and throttled cosmetic
animation keep the environment local. Normal circuit cleanup disposes materials,
geometry and textures. No live OSM/DEM/image requests are made during play.

Measured construction budget: **113 scenery mesh submissions**, **~2.00M triangles**
including repeated spectator geometry; 1,170 individual static boxes become 15
spatial batches. Counts exclude road, cars, runoff, HUD and shadow-pass repetition;
they are construction counts, not a measured runtime FPS or GPU draw-call profile.
The original plan budget was 20–26k fans, 500–800 trees and ~150–200 scenery meshes.

## Per-corner runoff summary

Widths are metres **outside the racing edge**: paved / gravel / grass. The paint
strip is contained within paving. Requested barrier distance is an approximate
target, not a surveyed measurement. The last width column is a sample at the
corner station; transitions and local service/pit openings can reduce or mask it.
`covered` is a protective tyre-cover treatment on the same collision wall solid.
All numeric widths, barrier styles/distances and serration details are approximate;
corner sequence is verified against the FIA map. No gravel trap location was
verified in the reviewed sources, so every gravel width is explicitly zero.

| Corner | Kerb | Target paved/gravel/grass | Barrier / target distance | Fitted widths at station | Status |
| --- | --- | --- | --- | --- | --- |
| T1 | Red/white apex + exit; serrated detail | 35 / 0 / 7 | covered / 42 | 2.54 / 0 / 0.51 | Fitted |
| T2 | Red/white apex + exit; serrated detail | 10 / 0 / 3 | concrete / 13 | 10.00 / 0 / 3.00 | Fitted |
| T3 | Red/white apex + exit; serrated detail | 14 / 0 / 6 | concrete / 20 | 4.59 / 0 / 1.97 | Fitted |
| T4 | Red/white apex + exit; serrated detail | 22 / 0 / 5 | covered / 27 | 16.87 / 0 / 3.83 | Fitted |
| T5 | Red/white apex + exit; serrated detail | 8 / 0 / 4 | concrete / 12 | 0.93 / 0 / 0.47 | Fitted |
| T6 | Red/white apex + exit; serrated detail | 18 / 0 / 7 | covered / 25 | 13.02 / 0 / 5.06 | Fitted |
| T7 | Red/white apex + exit; serrated detail | 15 / 0 / 9 | armco / 24 | 15.00 / 0 / 9.00 | Fitted |
| T8 | Red/white apex + exit; serrated detail | 12 / 0 / 8 | armco / 20 | 1.40 / 0 / 0.93 | Fitted |
| T9 | Red/white apex + exit; serrated detail | 14 / 0 / 8 | armco / 22 | 14.00 / 0 / 8.00 | Fitted |
| T10 | Red/white apex + exit; serrated detail | 12 / 0 / 8 | armco / 20 | 8.03 / 0 / 5.35 | Fitted |
| T11 | Red/white apex + exit; serrated detail | 18 / 0 / 8 | covered / 26 | 16.18 / 0 / 7.19 | Fitted |
| T12 | Red/white apex + exit; serrated detail | 18 / 0 / 3 | covered / 21 | 17.79 / 0 / 2.97 | Opening: overlay masked |
| T13 | Red/white apex + exit; serrated detail | 2 / 0 / 0 | concrete / 2 | 2.00 / 0 / 0.00 | Fitted |
| T14 | Red/white apex + exit; serrated detail | 2 / 0 / 0 | concrete / 2 | 1.57 / 0 / 0.00 | Fitted |
| T15 | Red/white apex + exit; serrated detail | 2 / 0 / 0 | concrete / 2 | 1.98 / 0 / 0.00 | Fitted |
| T16 | Red/white apex + exit; serrated detail | 3 / 0 / 1 | concrete / 4 | 1.05 / 0 / 0.35 | Opening: overlay masked |
| T17 | Red/white apex + exit; serrated detail | 10 / 0 / 3 | concrete / 13 | 9.15 / 0 / 2.75 | Fitted |

Long edges use 1.8m paving (0.6m painted edge) and 3.2m grass before fitting.
The tight stadium interval uses 2m paving and no additional grass. Opposite edges,
pit entry/exit and junctions use the same branch-aware cap/mask. These are game
fits, not measured circuit safety specifications. Access-road masks affect the
renderer and grip sampler consistently. Tarmac has near-normal grip and a smaller
penalty, grass and paint become slippery when wet; gravel support remains in the
shared sampler, although no unverified gravel bed is generated here.

## Dressing coverage and limitations

- Original grid numbers, start line/grid boxes and normal gantry; pit entry/exit
  paint, 80/PIT/OUT signs, SC1/SC2 and sector markings. Sector paint follows FIA
  reference offsets (136m before T4; 242m before T12), but existing equal-third game
  timing is intentionally unchanged. SC positions are fitted to generated pit gates.
- 200/150/100/50 boards at T1 and 150/100/50 at selected heavy braking approaches,
  all-corner number signs, 17 marshal stations with orange figures and responsive
  caution LEDs, fire cabinets, drainage, cables and spare tyre stacks.
- Five camera/recovery cranes, utility/timing/light poles, medical ambulance,
  generic colour boards, stadium screens/podium, garage numbers and pit furniture.
  No source sponsor/team/venue artwork is copied; back faces of signs are plain.
- Shared racing-line rubber/braking marks, original runoff lettering, 600 off-line
  marble details and restrained oil-like strips. Park grass has patches/tufts;
  it is not replaced by invented gravel.
- Three open fan zones, flowers, national/original flags, sombreros, wet umbrellas,
  papel picado, original skull motifs and restrained pooled smoke/confetti.
- No verified heights/fit for the pedestrian bridges, so no bridge model is added.
  Separate nearby baseball-stadium roof, elevated highways, named mountain skyline,
  exact venue portals/lighting arrangements and species are not faithfully surveyed
  or fully modelled. Cached reference outlines are not claims of rendered assets.

## Accuracy and comparison notes

The two L-shaped stand anchors/orientation and retained complete source outlines
are data-driven; seats, concourse/portal suggestion, deck heights and canopy detail
are procedural. Three patches narrow from 34m to 30m depth and two 3m end patches
are omitted for service clearance. Temporary stand positions/counts and their
roof profiles are approximate. One optional fan zone is also omitted for clearance.
The arena is the mapped central dome only; the outer ancillary footprint is not
filled with a box. One sports pavilion shifts 18m and the velodrome model 36m.
The pit stays on the mapped centre but shrinks to 92% of its requested model size
and aligns to the existing generated lane axis. Banking remnant rise of 0.55m over
5m is artistic; actual remnant height/angle could not be verified. No new driving
banking is introduced. Exact gravel locations could not be verified.

## Verification (static and parked only)

- Syntax: 18 changed/new JS/MJS modules; no syntax errors. New modules pass strict
  undefined-name/shadow checks; existing modules pass the established allowances.
- Browser/server module imports, `npm run build` and `npm run build:vercel` passed. The game test suite was neither run nor edited.
- 1,009 complete site reservations; zero rejected required placements, blocked
  envelopes or actual model/instanced footprint overflows. Minimum conservative
  clearance beyond road/safety/pit/access corridors **1.536m**, also the stadium
  minimum. Minimum sampled wall-edge road clearance **0.747m**.
- 2,213 runoff quads: zero non-local racing-branch, pit, cached-access or building
  overlaps. Independent comparison included 245 building/stand/arena polygons;
  542 access-conflicting and 117 additional pit-conflicting candidates are masked.
- 326 stationary full-car-envelope probes along the existing pit route: zero wall
  contacts, zero route-position deviation. Centreline/XY, pit geometry and original
  elevation anchors remain identical to the baseline.
- 4,600 shared wall solids matched 4,600 renderer source solids: zero missing/extra
  walls or vertex-count discrepancies. All 17 corners have a classified stack.
- Other 41 circuits have unchanged static wall geometry hashes. This does not prove
  every gameplay behaviour or every scenery aspect is regression-free.
- Parked dry/wet inspection and console capture only; no lap, driving, multiplayer,
  recovery/penalty or dynamic-weather transition playtest is claimed.

## References and attribution

- [FIA 2025 circuit, sector and pit drawings](https://www.fia.com/system/files/decision-document/2025_mexico_city_grand_prix_-_event_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_quarantine_zone_area.pdf).
- [Official Mexican GP spectator access and stand locations](https://www.mexicogp.mx/informacion/accesos/?IDM=LANG_EN).
- [Official Mexican GP corner names](https://www.mexicogp.mx/noticia/mexico-gp-como-se-llaman-las-curvas-del-autodromo-hermanos-rodriguez/).
- [Official T4–8 viewing stand context](https://www.mexicogp.mx/boleto/generales-grada-11/?IDM=LANG_EN).
- [Formula 1 4.304km circuit, park setting and retained final Peraltada section](https://www.formula1.com/en/racing/2025/mexico).
- [Copper-domed sports arena architectural context](https://www.palaciodelosdeportes.mx/nosotros).
- [OSM architecture, stadium and road snapshot 2026-11-05](https://api.openstreetmap.org/api/0.6/map?bbox=-99.107,19.390,-99.078,19.414).
- [Public aerial reference, stadium canopy and surrounding park; image not redistributed](https://commons.wikimedia.org/wiki/File:Vista_a%C3%A9rea_del_Aut%C3%B3dromo_Hermanos_Rodr%C3%ADguez_01.jpg).
- [SRTM 90m elevation cross-check dataset](https://www.opentopodata.org/datasets/srtm/).

OSM-derived data remain ODbL; see TRACK-DATA-LICENSE.md. Original models, textures,
lettering, placement fits and decorative art are game code. Raw reference photos
and FIA PDF pages are not redistributed as game assets.
