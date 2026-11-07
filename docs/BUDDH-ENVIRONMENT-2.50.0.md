# Buddh International Circuit environment

## Audit of the prior game

| Item | Prior status | Evidence and correction |
|---|---|---|
| Centreline | Correct | The existing OSM loop matches the clockwise, 16-turn F1 route. Retained all 1,714 driving samples in plan and the start/finish position. The game measures 5,141 m. The FIA lists 5,125 m. |
| Elevation | Wrong through T1–T3 | Coarse SRTM anchors gave a small fall. The FIA records a 14 m climb. A smooth local fit reaches 14 m and blends back to the existing profile on the back straight. |
| Pit lane and building | Wrong side | The FIA map and mapped pit building show the pit lane to the driver's right. The existing external lane generator now prefers that side for Buddh. The 300 m game garage block is aligned to that corridor. |
| Grandstands | Approximate | Replaced generic stands with a mapped main grandstand, sweeping canopy and hospitality band. Secondary stands and viewing banks use fitted locations informed by the event guide. |
| Runoff and barriers | Missing circuit-specific treatment | The FIA plan shows distinct runoff and gravel zones. The 2023 engineering report shows upgraded gravel, kerbs and barriers. The game uses layered asphalt, paint, kerbs, gravel and grass, with mapped branches cutting back the footprints. |
| Scenery and dressing | Missing circuit-specific treatment | Added farmland, dry vegetation, a hazy skyline, local access ribbons, stands, fan stalls, original signs, start gantry, pit and grid markings, marshal panels and recovery equipment. |

## Runoff and safety table

Widths are game targets in metres beyond the white line. The fit tapers each
stack and clips it against other branches. Distances give the intended wall
centreline setback before clipping. Gravel depth gives the visual depression
at the trap centre. Grass verges lead to dry ground, mapped service roads and
spectator areas. Pit tapers use separately checked geometry.

| Turn | Station (m) | Outside | Kerb | Tarmac / gravel / grass (m) | Gravel depth (m) | Barrier and target setback | Evidence |
|---|---:|---|---|---|---:|---|---|
| 1 | 306 | Left | serrated | 12 / 14 / 6 | 0.12 | Covered tyres, 33 m | FIA map and 2023 upgrade references, fitted dimensions |
| 2 | 449 | Right | flat | 5 / 0 / 7 | 0.00 | Armco, 13 m | FIA map interpretation, fitted dimensions |
| 3 | 693 | Left | serrated | 10 / 12 / 6 | 0.10 | Covered tyres, 29 m | FIA map and 2023 upgrade references, fitted dimensions |
| 4 | 1980 | Left | serrated | 14 / 18 / 7 | 0.14 | Covered tyres, 40 m | FIA map and 2023 upgrade references, fitted dimensions |
| 5 | 2550 | Right | Red/white | 10 / 12 / 6 | 0.10 | Covered tyres, 29 m | FIA map and 2023 upgrade references, fitted dimensions |
| 6 | 2667 | Right | serrated | 7 / 0 / 8 | 0.00 | Armco, 16 m | FIA map interpretation, fitted dimensions |
| 7 | 2709 | Left | serrated | 9 / 7 / 6 | 0.09 | Covered tyres, 23 m | FIA map interpretation, fitted dimensions |
| 8 | 2889 | Left | Red/white | 6 / 0 / 7 | 0.00 | Armco, 14 m | FIA map interpretation, fitted dimensions |
| 9 | 2955 | Right | Red/white | 8 / 0 / 7 | 0.00 | Armco, 16 m | FIA map interpretation, fitted dimensions |
| 10 | 3315 | Left | flat | 15 / 0 / 9 | 0.00 | Armco, 25 m | FIA map interpretation, fitted dimensions |
| 11 | 3538 | Left | Red/white | 12 / 0 / 8 | 0.00 | Armco, 21 m | FIA map interpretation, fitted dimensions |
| 12 | 3657 | Right | flat | 9 / 0 / 8 | 0.00 | Armco, 18 m | FIA map interpretation, fitted dimensions |
| 13 | 3887 | Right | Red/white | 10 / 7 / 7 | 0.08 | Covered tyres, 25 m | FIA map interpretation, fitted dimensions |
| 14 | 4010 | Left | serrated | 9 / 7 / 6 | 0.09 | Covered tyres, 23 m | FIA map interpretation, fitted dimensions |
| 15 | 4322 | Left | Red/white | 13 / 9 / 6 | 0.10 | Covered tyres, 29 m | FIA map interpretation, fitted dimensions |
| 16 | 4700 | Right | serrated | 10 / 10 / 6 | 0.10 | Covered tyres, 27 m | FIA map interpretation, fitted dimensions |

## Placement and atmosphere

The racing ribbon, generated pit lane and 206 mapped public, service and
alternate-course ways are indexed together. The scenery planner reserves
oriented footprints against those roads, runoff and ground-level barriers.
The gantry spans the track and pit route with at least 7.8 m of planned
vertical clearance. Armco, concrete, covered tyres and catch fence share
the same segments with collision detection. Wall signage sits against the
rendered faces. Three Free Practice starts cover T1 braking, the back
straight and the final sector.

Cached terrain is an 80 m grid sampled from Mapzen Terrain Tiles.
Low relief in the plains blends into the road profile at the venue.
The warm dry palette shifts to grey skies, darker gravel, muddy verges
and reflective asphalt as wetness rises. Spectators, trees, scrub, flags,
gravel detail, tents and vehicles are instanced. Static boxes and signs
are grouped into spatial batches. Flags and cosmetic fan-zone smoke
use throttled updates.

## Verification

| Check | Result |
|---|---|
| Syntax, imports and lint | 26 scripts parsed, 25 module imports and undefined-name and shadow checks passed. The browser entry point loaded through the game menu. |
| Builds | Node and Vercel builds passed. |
| Static placement | 515 fitted sites. Minimum measured footprint clearance was 2.36 m to the racing ribbon, 2.81 m to the pit lane and 0.56 m to mapped access. Gantry supports were checked separately with a 0.71 m sampled minimum. |
| Runoff and walls | 11,457 runoff patches cleared other road branches and building footprints. All 16 corners had the planned surface and safety layers. All 3,712 shared wall records matched rendered vertices and registered a contact probe. |
| Terrain continuity | T1–T3 rose 14.00 m. The largest adjacent elevation step was 0.22 m at approximately 3 m spacing. Mesh probes cleared the racing and pit surfaces by at least 0.11 m and 0.10 m, respectively, and the runoff layers by at least 0.028 m. |
| Pit | Early requests did not slow the car. Late legal entry worked and the lap stayed valid through service and exit. Simulated loss before service was 17.98 s. |
| Parked renders | Dry pit straight, wet Turn 4, a dynamic-weather snapshot at Turn 3 and Singapore Turn 1. No browser console errors or warnings observed. The dry pit-straight view recorded 124 draw calls with 9,672 spectator instances. |
| Regression scope | Pit geometry and elevation outputs matched the previous version on all 41 other circuits. Singapore's road, runoff and wall clearance audit passed. The game test suite was left for manual testing. |

## Approximation and open details

- Neutral corner numbers follow the FIA course. Exact apex stations at
  broad kinks and the separation of T10–T12 are interpretations of the
  map and retained centreline.
- The FIA map gives schematic surface coverage. Exact trap widths, depths
  and modern gravel changes at individual corners remain approximate.
- The main grandstand footprint shifted 10 m to clear mapped roads.
  The pit complex is a fitted 300 m model on the documented side.
  The separate mapped support building was omitted where no safe envelope fit.
- Secondary stands, outlying development, access-road elevations and
  spectator facilities are representative. Detailed footbridge structures,
  live expressway traffic and asphalt heat distortion were outside the
  verified implementation.
- The FIA constrains the T1–T3 rise. Intermediate slopes and the
  return to the old profile are interpolated. No new banking was added.

[Sources and provenance](../TRACK-SOURCES.md)
