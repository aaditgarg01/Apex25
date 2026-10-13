# APEX 25

An original 3D browser racing game inspired by the 2025 open-wheel season. It is an arcade game, not a reproduction of EA/Codemasters F1 25.

## Play online

[Play APEX 25](https://apex-25-production.up.railway.app/).

Current source version: **2.6.2**. Includes dry, damp and wet conditions, scenery and stylized landmarks for all
41 circuits, improved multiplayer prediction and rendering, and purple sectors
that compare valid times across the whole field.

## Run locally

Install Node.js 20 or newer, then run:

```sh
npm ci
npm run build
npm start
```

Open **http://localhost:3333**. Keep the server running for multiplayer.

## macOS launcher

Double-click **Start Local.command**, then choose a circuit and a session. Keep its Terminal window open. If macOS asks you to confirm opening a launcher, use Finder's Open command. Node.js 20+ is required.

The game opens at **http://localhost:3333**. All rendering libraries and track data are stored locally; solo play does not need the internet after setup. If dependencies are missing, the launcher installs the pinned versions first.

## Race with friends over the internet

1. For the optional macOS tunnel launcher, download the official [cloudflared release](https://github.com/cloudflare/cloudflared/releases) for your Mac, save the executable as `bin/cloudflared`, and give it execute permission. The binary is excluded from this repository. Then double-click **Start Internet.command**.
2. Wait for the temporary `https://…trycloudflare.com` address. It opens in the browser and is also saved in **INTERNET-LINK.txt**.
3. Open that address yourself. Enter your driver name, choose a circuit and laps, then **Race with friends → Create room**.
4. **Copy invite link** and send it to your friends. They enter a name and click Join; you press **Lights out**. Up to eight human drivers per room.
5. Keep the Mac awake, connected, and the hosting window open. Press Control-C in that window to stop hosting.

Friends need only a modern browser; they do not need this folder or a Google Drive account. A localhost invite works only on the host Mac. Quick Tunnel addresses change on restart and depend on Cloudflare availability. No router forwarding or Cloudflare account is required. For always-on play, run this same Node server on a host supporting persistent WebSockets and HTTPS.

Do not share the Google Drive folder to invite players. The tunnel exposes the game's public assets and race protocol, not the rest of My Drive. Rooms are invite-only by code, with no public lobby list; codes are not authenticated accounts. This is a casual multiplayer prototype, not an audited competitive anti-cheat service. Physics and race timing are calculated by the host server. An inactive/disconnected driver brakes or becomes AI; the next connected player inherits room hosting. Rejoining an ongoing race is not supported.

## Driving

| Control | Action |
|---|---|
| W / Up | Accelerate |
| S / Down | Brake |
| A D / Left Right | Steer |
| Shift / Space | Overtake boost |
| C | Chase, cockpit and overhead cameras |
| R | Recover to track; adds 3 seconds |
| Escape | Pause solo; open menu online |

Gamepad: left stick steers; RT accelerates, LT brakes, A boosts. Touch controls appear on touch devices. Engine sound starts after a browser interaction; use the sound button and volume slider to adjust it. Steering is fully manual. Compact, bright chevrons suggest acceleration (green), lifting (amber) and braking (red). Keyboard, touch and gamepad steering follow the driver’s left/right view. The line is a guide, not an exact optimal racing line. Recovery penalties are included in race results. Sustained track-limit violations invalidate timed laps. In qualifying, R restarts the flying lap with a fresh timer, up to three times; in practice, recovery invalidates the current lap. Starting practice partway around the circuit produces an out lap; timing starts after you cross the line. Use Finish qualifying to end the session early; drivers without a valid completed lap start behind valid times. In multiplayer only the host can end a session or continue from qualifying to the race.

## Included

- 41 real geographic circuit layouts: all 24 destinations on the 2025 calendar and 17 extra venues, including the Indian Grand Prix at Buddh International Circuit.
- 3D open-wheel cars, three camera views, road markings, curbs, scenery and a Suzuka crossover.
- Free Practice with unlimited timed laps and optional sector starts. Spa includes an Eau Rouge approach start.
- Race Weekend: one ghosted flying qualifying lap with up to three restarts, classification, then a race with any positive whole number of laps with a grid based on valid qualifying times.
- Quick Race skips qualifying. Solo and online race modes allow zero to seven AI opponents.
- All circuits have elevation profiles; Spa uses published circuit altitude markers and a shaped Raidillon climb. Car pitch, gradient, gravity, camera and terrain follow the road.
- Private rooms for up to eight players with shared countdown, live standings, lap times and rematches.
- Original synthesized engine sound, boost, off-track grip loss and recovery.

### Circuit accuracy

The original 40 circuit centerlines come from [Tomislav Bacinger's f1-circuits dataset](https://github.com/bacinger/f1-circuits), downloaded October 8, 2026, under the included MIT license. Calendar selection follows the [official 2025 calendar](https://www.formula1.com/en/racing/2025). Coordinate samples are projected to meters and lightly smoothed. The dataset is not a laser scan or a guarantee of each exact 2025 revision. Width, buildings, trees, barriers and grid location are simplified; Suzuka's bridge is an approximation. Displayed published lengths can differ from the computed driving distance. No licensed F1 logos, liveries, audio or game assets are included. No pit stops, weather, damage model or career mode are simulated. See [TRACK-SOURCES.md](TRACK-SOURCES.md) for elevation methods, approximation limits and source attribution.

## Development

- `npm ci` — install locked dependencies.
- `npm run build` — copy Three.js browser modules into public/vendor.
- `npm start` — start HTTP/WebSocket server on port 3333.
- `npm test` — game, networking, collisions, track-surface and scenery checks; keep the server running first.
- `TEST_URL=https://your-host npm test` — run network tests through an internet host as well.
- Set `PORT` to use another port; optionally set `HOST` for a different listening address.

Source: `public/app.js` (UI, input and game loop), `public/scene.js` (3D rendering), `shared/tracks.mjs` (geography), `shared/physics.mjs` (shared simulation), `server.mjs` (static files and authoritative multiplayer). The cloud server runs independently of local copies. Runtime files and installed dependencies are excluded from Git.

Third-party software: Three.js (MIT), ws (MIT), and optional cloudflared (Apache 2.0). Three.js and ws license files are in `licenses/`; track and cloudflared licenses are also included. The optional browser-agent tools are `list_circuits` and `select_circuit` and use the same setup state as the UI.

Buddh International Circuit (Indian GP) is the 41st venue, derived from OpenStreetMap under ODbL 1.0; its source and downloadable geometry are documented in TRACK-SOURCES.md.

Race length: type any positive whole number in the lap counter, or use its − / + buttons. The same count is used in solo and online races; practice remains unlimited. Monaco’s start/finish is aligned to Boulevard Albert Ier. Racing-line arrows are smaller, and tyres/hubs rotate together around the axle at road speed.

## Deploy your own server

`Dockerfile` and `railway.json` support Railway deployment. `render.yaml` is also
included. Use a single running server instance: multiplayer rooms live in memory
and all players in a room must connect to the same process.

Sector colours: purple is the fastest valid sector across the session; green is a
personal best when another driver is faster; yellow is slower or invalid.


## Track conditions (2.5.0)

Choose **Normal / dry**, **Intermediate / damp**, or **Wet / rain** in race setup.
The choice applies to practice, qualifying and races. In multiplayer the host's
choice applies to every driver and carries into the race and rematches.

Normal keeps the original dry handling. Intermediate lowers acceleration traction
and braking grip with mild sliding; wet reduces them further, limits cornering grip
and gives the car more sideways slip. Wet kerbs and grass have less grip. AI slows
down and anticipates braking; the racing-line colours account for lower grip.
Rain, tyre spray, shinier asphalt, cloudy lighting and reduced visibility accompany
the damp/wet presets. These are arcade tuning presets, not measured tyre simulation.
Gameplay tests for this update were omitted at the user's request.


## Display, guide and multiplayer refinements (2.6.0)

The race display starts compact. Press **H**, choose **Details**, or use the race
menu checkbox to reveal full timing, all drivers, the minimap and extra controls.
Camera (C), recovery (R) and Menu (Escape) remain keyboard shortcuts. The setup
screen folds driver/car appearance options to reduce clutter.

The guide follows a bounded outside-entry/apex/exit path, with curvature smoothing
and a forward/backward acceleration/braking speed plan. Colour responds to approach
speed, available boost and surface conditions; it no longer labels every slow target
with fixed red thresholds. It is a computed arcade guide, not a measured professional
line. AI follows the new path/speed plan. Only the next ~300 m of markers is rendered.

Rain moves in world space with wind; pooled soft wheel spray trails, grows and fades.
Multiplayer rivals are aligned by their input delay before replay, remote render time
never runs backwards, and snapshots publish up to 30 times/second. New clients omit
unchanged lap-history arrays between periodic/event updates; older clients still
receive full history. Broad-phase contact pairs and early exits avoid repeated work.
Collision response uses impact angle and separate presentation-only separation.
Race/practice cars remain solid and qualifying remains ghosted.

Gameplay tests were omitted at the user's request. All players should refresh after
deployment to use the new guide, display and multiplayer client.


## Finish handling and display fixes (2.6.2)

The racing-line legend sits inside the timing card, and session messages stack above
the speed card so expanded telemetry cannot cover them. Finishing cars disappear
from the scene and minimap immediately and no longer collide or create drafting.
Their records stay in the classification, with a 🏁 beside each race finisher. DNF
drivers do not receive a finish flag. Finished drivers cannot retire afterwards.

Once the leader finishes, unfinished drivers display RACING rather than a distance
gap against a stopped car. Finishers show recorded, penalty-adjusted time differences.
Live distance-derived gaps are marked approximate. Results remain provisional until
the field finishes; spectators follow only cars still racing. Tests were omitted at
the user's request.


## Random circuit and conditions (2.6.3)

Use Randomise beside Circuit or Track Conditions to choose a different option
before starting. Circuit selection includes every available circuit, including
extras; conditions choose between Normal / dry, Intermediate / damp, and Wet / rain.
The selected values and preview update immediately and are saved like manual choices.
Both solo and multiplayer room creation use the displayed setup; all online drivers
share the host's circuit and surface. Gameplay tests were omitted at the user's request.


## Final race gaps and 2025 team liveries (2.7.0)

The results screen retains each finisher's penalty-adjusted gap to the winner, with
their total race time underneath. The winner shows total race time. Gaps also stay
on the race leaderboard after completion. Drivers still racing after the leader
finishes show a clearly marked approximate arrival gap until their final time is
recorded; retired drivers continue to show DNF.

Driver and car now offers all ten 2025 teams: Ferrari, Mercedes, Williams, McLaren,
Red Bull Racing, Racing Bulls, Alpine, Aston Martin, Haas, and Kick Sauber. The game's
original car model uses team-style body panels, wings, accent stripes and lettering
based on the [2025 launch liveries](https://www.formula1.com/en/latest/article/in-photos-every-2025-f1-car-livery-after-their-spectacular-f1-75-live.2BZTh37ifdxAASqub3X1HK).
The menu preview changes immediately, the choice is saved, and the server shares
each driver's validated selection through qualifying and races. These are procedural
paint schemes, not official licensed models or sponsor artwork. Tests were omitted
at the user's request. Refresh every player's browser after deployment.


## Faster cars and clean gap labels (2.7.1)

Higher engine pull and lower straight-line drag let dry cars reach substantially
higher speeds, with a 106 m/s normal limit and a 115 m/s overtake limit. Wet
conditions retain their lower traction. The racing-line speed profile and guide
forecast use the new pace so fast straights are not painted as automatic braking.

Race gaps display with a plain + sign. Live gaps remain estimates while cars are
still driving; finished drivers keep their recorded, penalty-adjusted time gaps.
The results legend explains when a live gap becomes final. Gameplay tests were
omitted at the user's request.


## VIT Vellore campus circuit (2.8.0)

A new Campus circuit entry follows the user's traced route around VIT Vellore,
aligned to mapped campus roads. The roughly 3.7 km loop starts westbound on Jimmy
Carter Road and includes Fleming Road's roundabout, Main Subway, Lee/Lehn/Planck
roads, Kissinger Road, the M-block loop, and the PRP/SJT underpass and outside return
hairpin. Road width is 14 m; the smallest turn radii are rounded for racing.

SRTM terrain samples supply gentle campus elevation changes. The railway underpasses
use separate reconstructed descents, level covered floors, climbs, retaining walls,
portal markings, and roofs. Chase-camera clearance follows the lowered road;
overhead view moves under the ceiling inside a covered section. Rain is hidden
under the cover. Tight-turn shoulders and lowered terrain prevent road clipping.

The scenery includes locally cached OpenStreetMap building footprints, VIT Lake,
campus signs, palms, lamp poles, and both railway tracks. There are no map-data
requests during play. The circuit is available in practice, qualifying, races,
multiplayer and circuit randomisation. Fine elevations and tunnel dimensions are
a playable reconstruction rather than a measured survey. Sources and attribution
are saved in public/data/vit-vellore-sources.json. No gameplay tests were run, per
the user's preference.


## VIT junction corrections (2.8.1)

Removed the duplicated straight section across the Jimmy Carter Road landscaped
loop. Drivers now enter the curved detour from the east and exit to the west
without retracing the bypass. The minimap, racing line, lap progress and AI use
the same corrected geometry. Fleming Road roundabout entry and exit use continuous
tangent joins rather than short reversing connectors. The revised lap is about
3.6 km; cached terrain heights and campus footprints are remapped to it.

Campus road edges now shrink together on the inside of tight bends so kerbs,
edge paint and barriers stay ordered and do not collapse onto one another. Map
attribution sits below the timing panel. Gameplay tests were omitted at the
user's request.


## Fleming approach and solid barriers (2.8.2)

Corrected the direction of the Fleming Road approach: it now travels westbound
once before joining the roundabout. The previous reversed way recreated
overlapping passes even after the roundabout joins were smoothed. The roughly
3.5 km route, scenery origin and terrain profile are updated together.

Track walls and fences now collide with the car's full oriented footprint in every
session, including ghost qualifying. Monaco tunnel walls, VIT retaining walls and
portal pillars, and the roundabout island also have contacts. Movement is swept
through short steps to catch fast impacts; collisions block the normal movement
and allow sliding along the wall. Vertical checks keep separate road levels apart.
Visible primary barriers use the same geometry as shared collision logic.

Server simulation, local driving, client prediction and remote presentation all
apply the same barrier contacts. Car contact separation also respects track walls.
The racing line leaves space for the car inside narrowed corner boundaries.
Gameplay tests were omitted at the user's request. All players should refresh.


## VIT subway wall clearance and wider road (2.8.3)

The VIT race road is now 16 m wide. Retaining walls, yellow coping, portal pillars
and track barriers are trimmed below crossing road decks or removed where they
would intrude into another part of the race route. Tunnel walls follow the same
corner edge geometry as the road and are rendered vertically, with sloping bases.

The renderer and collision system share the tunnel wall layout, so visible walls
still block cars and removed sections leave no invisible obstacle. Ground banks
also keep more clearance from neighboring roads. The traced route is unchanged.
Gameplay tests were omitted at the user's request. All players should refresh.


## Selective VIT barriers (2.8.4)

Removed the continuous track-side walls from the VIT campus circuit, leaving
normal streets and verges open. Solid walls remain only at the two subway ramps
and tunnel entrances, with the physical curb around the roundabout island.
Rendering and collision logic use the same selection, so removed roadside walls
do not leave invisible obstacles. The 16 m road width and subway clearance fixes
are retained. Gameplay tests were omitted at the user's request. Refresh to update.
