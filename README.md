# APEX 25

An original 3D browser racing game inspired by the 2025 open-wheel season. It is an arcade game, not a reproduction of EA/Codemasters F1 25.

## Play online

[Play APEX 25](https://apex-25-production.up.railway.app/).

Current source version: **2.22.0**. Includes dry, damp and wet conditions, scenery and stylized landmarks for all
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

Gamepad: left stick steers; RT accelerates, LT brakes, A boosts. Touch controls appear on touch devices. Engine sound starts after a browser interaction; use the sound button and volume slider to adjust it. Steering is fully manual. Compact, bright chevrons suggest acceleration (green), lifting (amber) and braking (red). Keyboard, touch and gamepad steering follow the driver’s left/right view. The line is a guide, not an exact optimal racing line. Recovery penalties are included in race results. Sustained track-limit violations invalidate timed laps. Qualifying starts with one untimed outlap, followed by repeated flying laps during the unchanged seven-minute session. R recovery and lap restarts are disabled in qualifying: complete the circuit and cross the line to try again. Current-lap penalties and invalid warnings clear at the next flying lap. The fastest of all valid flying laps sets the grid; a flying lap begun before the timer expires can finish after zero. In practice, recovery invalidates the current lap. Starting practice partway around the circuit produces an out lap; timing starts after you cross the line. Use Finish qualifying to end the session early; drivers without a valid completed lap start behind valid times. In multiplayer only the host can end a session or continue from qualifying to the race.

## Included

- 41 real geographic circuit layouts: all 24 destinations on the 2025 calendar and 17 extra venues, including the Indian Grand Prix at Buddh International Circuit.
- 3D open-wheel cars, three camera views, road markings, curbs, scenery and a Suzuka crossover.
- Free Practice with unlimited timed laps and optional sector starts. Spa includes an Eau Rouge approach start.
- Race Weekend: seven minutes of ghosted qualifying, one initial outlap and multiple flying laps, classification by the best valid lap, then a race with any positive whole number of laps.
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


## Smoother VIT corners and short apex barriers (2.8.5)

Rounded campus road joins with tangent circular arcs, removing unnecessary
collinear survey points so short map segments cannot force pointed corner kinks.
The PRP return onto Jimmy Carter Road now follows a smooth bend. The original
traced loop, start/finish and 16 m road width are retained; the lap is about 3.45 km.
Cached terrain anchors and campus scenery are aligned with the revised geometry.

Short red/white barriers protect the inside of substantial tight bends to block
corner shortcuts. Their visible meshes and collisions share the same layout and
retain clearance below crossing road decks. Ordinary roads and outside runoff
remain open; subway infrastructure and the roundabout island retain their walls.
Gameplay tests were omitted at the user's request. All players should refresh.


## Broader VIT bends and roomier starting grids (2.8.6)

Rebuilt dense mapped bend sections from their entry/exit street tangents, letting
multiple campus corners use broad circular joins with a 28 m target radius.
Adjacent bends share their available space. Enlarged the Fleming round curve and
PRP turnaround; improved the hostel loop, M-block turns, Q-block approach and
Jimmy Carter detour. Removed the artificial red/white apex walls and their
colliders. Subway infrastructure and the physical roundabout island retain walls.
The 16 m road, traced loop and start/finish are preserved; the lap is about 3.41 km.
Geographic campus scenery and cached terrain anchors are updated together.

Every circuit now uses 13 m between starting-grid rows (previously 10 m) and
7.2 m between side-by-side car centres (previously 6.2 m). The shared car placement
applies to solo races, weekend grids and multiplayer. Gameplay tests were omitted
at the user's request. All players should refresh.


## Longer VIT straights and detailed campus buildings (2.8.7)

Enlarged the VIT racing layout by 30%, extending its straights and retaining the
traced shape and rounded bends. The racing lap is now about 4.44 km; road width
remains 16 m. This is a gameplay enlargement, not a surveyed campus distance.
Railway crossings, subway walls, landmarks and lake placement follow the same
coordinate transform. Individual building footprints keep their original sizes.

Replaced plain campus building extrusions with VIT-inspired academic, hostel,
research, auditorium and shop facades. Buildings have repeated window bays and
floor bands, entrances, name boards, roof parapets, solar panels and water tanks.
Named OpenStreetMap footprints and available heights are retained; missing
heights and architectural details are approximate. VIT's academic-block gallery
and hostel/PRP pages are listed in the source credits. Placement checks the whole
footprint against the road, while windows and static details share materials and
are batched to limit rendering cost. Gameplay tests were omitted at the user's
request. All players should refresh.


## Circuit visual overhaul (2.9.0)

Added textured asphalt, painted kerbs, gravel, grass and ribbed Armco materials
across all 42 circuits. Kerbs and runoff accents concentrate around bends, with
subtle tyre rubber along the driving line. Spa retains red/yellow kerbs and Paul
Ricard has red/blue runoff accents; environment palettes follow each circuit's
parkland, forest, desert, coastal or city setting. Wire catch fencing now follows
the same geometry as its existing collision boundaries.

Day/night sky gradients, cloud haze and cached environment lighting improve
reflections, especially in intermediate and wet conditions. Shadows have more
local detail without increasing shadow-map resolution. The chase camera sits
lower, while the existing cockpit and overhead modes remain available.

Pit buildings sit closer to suitable straights using a rectangular placement
check against all road branches. Garage fronts show team colours and labels;
braking boards display 150/100/50 near substantial bends. Street circuits gain
windowed frontage buildings, skyline blocks have facade panels, and existing
mapped buildings use detailed facades and roof features. Vegetation is rounded
and casts shadows. Procedural textures are shared and static details are batched.

Track centreline geometry, elevations, car physics and multiplayer simulation
are unchanged. These are artistic visual representations rather than 1:1 scanned
replicas of the official game. Primary references are listed in
public/data/track-visual-references.json. Gameplay tests were omitted at the user's
request. All players should refresh.


## Driver-view realism (2.9.1)

Replaced flat tree crowns with individual drooping palm leaflets and irregular
leaf-textured canopies, using instanced meshes across the circuits. VIT retains
open verges, widened roads, rounded bends and its existing subway boundaries.
Grass gains blade/patch detail and asphalt gains sparse, flush repair seams that
follow road height. Added occasional trackside marshal huts and equipment, plus
shaped spectators and roof supports in grandstands. These are procedural artistic
surroundings, not surveyed positions or new gameplay barriers.

The original car now has rounded sidepods, a tapered nose and engine cover,
carbon details, rounded tyre shoulders, wishbones, mirrors and a halo. Cockpit
mode keeps the nose and front wheels visible and attaches the camera directly to
the displayed car. Only the driver's helmet/visor are hidden in this view. A
moving steering wheel displays gear, speed and battery, replacing the duplicate
external speed panel in cockpit mode. Static car details are batched; the display
updates at most 12.5 times per second, only for the viewed cockpit.

Layouts, elevations, vehicle physics and multiplayer messages are unchanged.
The scenery remains an artistic approximation rather than scanned official-game
assets. Syntax checks were run; gameplay and test suites were omitted at the
user's request. Refresh all clients to receive the visual update.


## Albert Park environment (2.10.0)

Albert Park has a dedicated environment instead of the generic lake/palm set.
Its lake shoreline and three island rings use OpenStreetMap relation 346429,
with a calm blue-gray water shader and reflected trees, sky and structures.
Reflections render to a 512px target without MSAA, at most once per 140ms when
visible; graphics pressure increases that interval to 350ms. The reflection
pass reuses existing shadows. Targets are disposed when changing circuits.

Broad level park lawns blend into the existing road heights and low shoreline
banks. Dense instanced broadleaf trees and scattered mature palms frame the
lap, with tree exclusions around event structures and water. Melbourne-inspired
glass tower silhouettes sit north of the park. Low western golden-hour sunlight,
a warm horizon and longer local shadows apply only to this circuit; intermediate
and wet settings retain overcast weather and subdued sunlight.

Added six scaffold grandstands with 5,292 seated spectators and waving coloured
flags, sponsor-colour Rolex/Pirelli/MSC word boards, three truss bridges, white
hospitality tents, TV cranes, orange marshals and green/yellow LED panels. Panels
show local off-track/sliding incidents; they are decorative status indicators,
not a full FIA flag-rule simulation. Four-deep covered tyre stacks sit outside
the existing driving boundaries. Concrete walls and dark catch fencing share
the same physical endpoints; Melbourne's fence now starts on top of its 1.05m
concrete wall rather than on a separate grass-side offset.

The track centreline/mesh and car model are unchanged. Buildings, vegetation
and event locations are artistic approximations, not scanned official-game
assets or surveyed event placements. Lake data is credited in the data license;
Three.js's Reflector and its MIT license are included and copied during builds.
Syntax checks were run. Gameplay testing and test suites were omitted at the
user's request. Refresh all clients before racing together.


## Albert Park startup correction (2.10.1)

Removed an accidentally duplicated concrete texture-generation block from the
weather material update. That block referenced canvas-local `x` and `random`
variables and stopped Albert Park from loading, even in dry conditions. Texture
generation remains in its original canvas function; concrete weather updates
now only adjust material roughness. Startup messages suggest enabling WebGL
only when the error actually mentions the graphics context.

Syntax/source checks were completed. Gameplay testing was omitted per the
user's preference. Refresh to load the corrected client.


## Shanghai industrial circuit environment (2.11.0)

Shanghai replaces its generic landmark/park scenery with a dedicated environment:
twin colossal curved red canopies at the main straight, a pit/control complex,
two elevated circular glass pavilions, four grass spectator banks and 8,376
instanced spectators with waving flags. Small matching decorative trees and
low hedges line the perimeter; no dense forest or palm scenery is added here.
Broad level lawns blend into the preserved road elevations, with stone-edged
retention ponds, rippled water, service buildings and sweeping access roads.

Outside-corner runoff uses sharp asphalt/red/white/black bands. A shared cached
planner expands suitable outer boundaries by up to 25m, limits them against
neighboring road branches, and smooths the transitions. White concrete walls
and high dark fencing use that same plan on the server and in the renderer.
The racing track mesh, centreline, car model and driving-control code are
unchanged; the physical outer wall/fence positions reflect the expanded runoff.

Lenovo/Pirelli/Aramco word boards, large illuminated sponsor displays, three
live timing screens, incident-responsive LED flag panels, white security camera
poles, neon-orange marshals, TV towers and overhead camera wires dress the venue.
Timing displays update at most once per second. Props are kept behind driving
boundaries; static geometry is batched and crowds/trees use instancing.

Pale blue-gray atmospheric haze and a diffused white sun create cooler,
lower-contrast afternoon lighting. Intermediate/wet weather still applies.
Models and prop locations are artistic approximations of the supplied brief,
not surveyed replicas of Shanghai architecture. Architectural and circuit
references are listed in public/data/track-visual-references.json.
Syntax and undefined-variable source checks were completed. Gameplay testing
and test suites were omitted at the user's request. Refresh all clients.


## Shanghai photographic architecture correction (2.11.1)

Replaced the earlier red-wing/generic disc models with architecture matching the
two photographs supplied by the user. Mapped building and roof outlines anchor
the main grandstand on its correct side, the garages opposite it, and two
lenticular viewing bridges across the main straight at approximately -247m and
+113m from the game's starting line. The bridges have silver cladding and rims,
purple Lenovo/联想 panels, oval viewing terraces with spectators and railings,
and cylindrical glass support towers. The main grandstand has two crowd tiers
and a continuous sloping roof rather than a distant cantilevered red sheet.

Added the mapped H/K grandstands and their 26 cream inverted-cone/lotus canopies:
central columns, flared fabric roofs, radial ribs, silver rims and light fittings.
DHL-colour boards dress the corresponding end of the back straight. The canopy
and bridge positions use the OpenStreetMap outlines saved in
public/data/shanghai-architecture.js; original procedural detail remains an
approximation of the supplied photos. Existing ponds, rain, track/car geometry
and collision boundaries are unchanged. Static roof detail shares materials and
is merged in spatial batches; crowds remain instanced.

Syntax and undefined-variable checks passed. Gameplay testing and test suites
were omitted at the user's request. Refresh all players' browsers.

## Suzuka environment (2.12.0)

Suzuka now has a dedicated environment: mapped main stand/pit and Circuit Wheel locations, a slowly rotating white Ferris wheel with upright coloured cabins, amusement park ride silhouettes, dense broadleaf/evergreen planting, rolling grass terrain and hillside bleachers with Japanese flags and fan hats. A concrete soffit and piers support the existing crossover, outside the lower roadway. White Armco, raked beige gravel, black tyre banks, Honda/Rolex/DHL dressing, steel gantries, green TV towers, white camera poles, warning panels and white-suited marshals add trackside detail. Dry lighting is crisp early afternoon; existing wet/intermediate weather remains available.

The track centreline, driving mesh, car model and physics are unchanged. Landmarks use attributed OpenStreetMap positions; terrain away from the track, building details and amusement ride artwork are procedural approximations. Crowds, vegetation and animated wheel cabins use instancing. Static syntax and undefined-variable checks passed; gameplay and multiplayer tests were not run, as requested.

## Bahrain desert and night environment (2.13.0)

Bahrain has dedicated mapped Sakhir Tower, main/Oasis/first-turn/University/Victory stands and paddock buildings. Procedural tent canopies, occupied terraces, Bahraini flags, tower LED bands and sun shades, oasis lawns and date palms, desert shrubs/rocks, distant highway/oilfield/city silhouettes, blue-white wave aprons, red-white geometric runoff decorations, gravel beds, white safety walls, dark fencing, regional sponsor dressing, camera poles, LED flag gantries and orange-suited marshals provide event atmosphere.

Sunset fades to night over six minutes. All 495 visible floodlight pylons are batched; six nearby active spotlights are pooled, two with shadows. The driving surface, centreline, elevation profile and car model are unchanged. Wider runoff walls use shared geometry for rendering and collision, capped to avoid buildings and other road branches. Landmarks use attributed OpenStreetMap positions; scenery, branding illustrations and distant horizon details remain artistic approximations.

Syntax and undefined-variable checks passed. Gameplay and multiplayer testing were skipped as requested.

## Spa Ardennes environment (2.14.0)

Spa has dedicated rolling valley terrain, steep grassy and rocky banks around the existing official elevation profile, thousands of spatially batched conifers, mossy verges, mapped Eau Rouge chalet/venue and F1/Endurance pits, mapped Endurance/Raidillon/F1/Silver stands, hillside Pouhon/Kemmel terraces, dense spectators and Belgian/European/orange flags. Modern curved roofs contrast with the red-and-white timbered chalet and stepped valley pit buildings. Low directional sunlight varies beneath drifting heavy clouds; occasional orange smoke stays on the spectator hillsides.

Expanded asphalt/gravel runoff uses a shared envelope for guardrails and collision, capped to avoid buildings and other road branches. White Armco, matching catch fences, multi-layer black tyres and protective belts, Rolex/Heineken/MSC dressing, steel gantries, LED panels, orange safety gates/marshals, camera towers, recovery cranes and tractors complete the scenery. The driving mesh, centreline, official track elevation anchors and car are unchanged. Landscape between track samples, architecture details, forest distribution and event dressing are procedural approximations, not scanned official-game assets.

Syntax and undefined-variable checks passed. Gameplay and multiplayer tests were skipped as requested.

## Monaco Riviera environment (2.15.0)

Monaco now uses a mapped Mediterranean coastline, Port Hercule shoreline and 210 city building footprints. Road-clear render rings protect the narrow streets and hairpin; the Fairmont's lower volume clears the original tunnel cover. Pastel facades, shutters and balconies, bougainvillea, spectators, Casino clock towers and roof domes, hotel architecture, potted palms, topiary, hillside vegetation and limestone ridges provide a dense Riviera setting.

The harbor has reflective rippling water and 24 detailed superyachts with deck crowds, layered glazed cabins, teak decks and pools. Boat geometry is batched locally to retain gentle movement. Temporary harbor stands, mapped quay cranes, compressed marshal pockets, luxury sponsor wall decals and pedestrian bridges add event dressing. Dry lighting is clear midday with near-vertical sunlight; existing wet/intermediate weather remains supported. Reflection rendering is throttled and facade geometry is batched by material and location.

The road mesh, centreline, elevations, barrier collision layout, original curved tunnel cover/walls and car model are unchanged. Buildings/coastline use attributed OpenStreetMap data; heights where missing, architectural detailing, skyline terrain, yachts and event dressing are procedural approximations, not scanned official-game assets. Syntax and undefined-variable checks passed. Gameplay and multiplayer testing were skipped as requested.

## Jeddah Corniche night environment (2.16.0)

Jeddah now features a dedicated Red Sea waterfront, northern Corniche lagoon and marina environment hugging the flat coastal strip. The northern Turn 13 loop is framed by a sculpted exterior banking embankment, coastal seawall revetment and animated whitewater surf. The horizon includes the tapered three-winged glass Jeddah Tower, 22 neon-lit coastal skyscrapers in blue, purple and gold, the over-water Al-Rahmah Floating Mosque on stilts with turquoise dome and minaret, the sail-roofed Jeddah Yacht Club, 12 superyachts and four coastal beach resort complexes.

Manicured geometric green lawn islands with animated illuminated water fountains and uplighted date palms contrast against the pale desert sand and dark Red Sea. Runoff zones remain narrow and paved with Aramco green/blue street-circuit stripes and no gravel traps, lined by continuous smooth concrete retaining walls, heavy-duty black debris catch-fencing and corner Tecpro barrier stacks. Saudi Aramco, STC and Rolex branding, seven futuristic live-timing LED gantry arches, wave-roofed grandstands with Saudi flags, VIP hospitality terraces, synchronized fireworks, slender white camera poles, mobile recovery cranes and white-suited marshals with glowing LED vests complete the night-race atmosphere under paired LED floodlight gantries and six pooled point lights.

The track mesh, centreline, elevations and car model are unchanged. Coastline and landmark anchors use attributed OpenStreetMap references; architectural detailing, skyline towers, yachts and event props are original procedural approximations.


## Jeddah corrective release (2.16.1)

The Jeddah terrain formula parses correctly, and visible Tecpro blocks now use the same shared positions, dimensions and collision faces in solo play, client prediction and server simulation. Marshal panels read the actual off-track/sliding state. Gantry lap numbers remain one-based and the displayed leader is selected by race progress. Pooled floodlights follow the viewing camera so illumination stays nearby in multiplayer. Required local filenames are restored; the Jeddah waterfront, night scenery and landmark work are retained.

Static syntax, undefined-variable and module dependency checks were performed before deployment. Gameplay and test suites were skipped as requested.

## Jeddah decoration clearance (2.16.2)

Jeddah scenery placement checks complete model footprints against every continuous road branch. Grandstands, pit buildings, hospitality roofs, resorts and pools, marina piers, yachts, camera equipment, cranes, marshal shelters, lawn fountains and distance boards move clear of the road. Shoreline walls are built as short sections and omitted where they would cross the driving corridor; rocks and animated foam also respect the road clearance. Sponsor gantries retain overhead spans while their support feet remain outside all road branches.

The existing road, layout, racing line, driving physics and shared Tecpro collisions are preserved. Static syntax, undefined-variable and import checks passed; gameplay tests were skipped as requested.

## Bahrain persistent floodlights (2.16.3)

Bahrain's floodlighting no longer moves between the six fixtures closest to the camera. All 495 lamp heads remain visibly illuminated from both sides, and a fixed lighting field illuminates the whole circuit continuously. The sunset-to-night transition changes the entire venue gradually; wet conditions remain supported. The existing shadow light blends toward overhead white floodlighting at night, so cars retain moving shadows. Static syntax and module checks passed; gameplay tests were skipped as requested.


## Baku city environment — 2.17.0

Baku now has a dedicated environment with 520 road-clear mapped city footprints, a reflective Caspian shoreline, curved glass Flame Towers, sandstone Old City walls, Maiden Tower, Government House, the Philharmonic and Carpet Museum. Original facade textures, rooftop spectators, Azerbaijani flags, cypress rows, temporary grandstands, pit equipment, cranes, safety fencing and sponsor bridges replace the generic scenery. Warm afternoon light gradually shifts toward dusk over eight minutes. Existing circuit geometry and driving elevations are retained.

Building and coastline positions come from OpenStreetMap; architectural details, fortress artwork guided by the Old City district boundary, terrain away from the road and event placement are procedural approximations, not scanned official-game assets. Visual footprints are clipped outside every road segment and its barriers; freestanding props are checked as complete models. No gameplay test suite was run, as requested; validation covers syntax, undefined identifiers, packaging and deployed file identity.


## Baku castle visibility — 2.17.1

Added a dedicated sandstone fortress wall and crenellated bastions beside the Turn 8–11 uphill sequence. Nearby building footprints reserve space for this landmark so generic facades cannot hide it. This road-relative architecture is procedural artwork, distinct from the mapped district boundary and the distant palace. Racing geometry remains unchanged.


## Baku road separation and Old City revision — 2.17.2

Baku now uses one shared corridor profile for asphalt, kerbs, fences, collision walls, racing-line bounds, wet-road grip and track limits. Close opposite-direction boulevard sections narrow smoothly to fit their actual separation; the castle passage uses a 7 m asphalt profile with close barriers. This removes the former overlapping roads and fences. Castle-side fencing is omitted behind the retained low solid collision wall, while the opposite catch fence remains.

The Old City revision brings weathered stone walls beside the road, with rounded merlons, battered round bastions, corbels, arrow slits and twin arched pedestrian gates inspired by official F1 reference photographs. The generic district-perimeter wall is no longer rendered. Mapped frontages are clipped to the same corridor and the new fortress footprint. These are procedural approximations rather than a surveyed or scanned reconstruction. Static corridor review found no overlaps between distant road branches or crossings between their fences; syntax and package build checks passed. No gameplay tests were run.


## Singapore Marina Bay night environment — 2.18.0

Singapore now has a dedicated environment with 450 mapped city footprints and mapped Marina Reservoir/Singapore River water outlines. Original procedural landmarks include Marina Bay Sands' three 193 m towers and boat-shaped skypark/pool, the 165 m Singapore Flyer with rotating wheel and level cabins, the Fullerton Hotel, Old Supreme Court copper dome, Esplanade durian roofs and lit financial-district skyscrapers. Window emissive maps and rippled planar bay reflections create the night skyline.

A permanent world-space light field covers the entire road, supported by constantly lit LED fixtures and fixed fill lights. Lighting is not reassigned to the approaching car. Compact white safety walls and black catch fences share the renderer/collision envelope; corner wraps stay inside those walls. Tropical rain-tree canopies, palms, green uplight artwork, planted plazas, raked grandstands, phone/wristband glints, flags, orange marshals, live LED boards, cranes, tyre stacks and warm hospitality suites complete the venue.

The existing 19-corner driving route, elevations and car remain. Colourful waterfront seating is an artistic treatment beside the current route; the pre-2023 Bay Grandstand underpass is not restored. Landmark architecture, event placement, lighting and terrain away from the road are procedural approximations, not scans or official-game assets. Syntax, undefined-name, packaging, placement-data and live deployment checks are used; no gameplay test suite is run.

## Multiplayer smoothing and qualifying — 2.19.0

Multiplayer retains all snapshots delivered between painted frames, interpolates
rivals on the time their movement was simulated, and smooths corrections for
nearby predicted cars. Local correction compares fixed simulation poses and
renders the fraction between ticks; visual contact correction moves rivals
without displacing the player's camera. Delayed input batches have distinct lap
and sector timestamps and bounded catch-up work. Race collisions remain solid.

Qualifying keeps the full 420-second duration. Each driver completes one initial
untimed outlap, then may attempt multiple flying laps. Neither recovery nor R
restarts a qualifying lap. Complete an invalid lap on track; the next crossing
starts a fresh flying lap and clears current-lap penalties/invalid warnings.
The best valid completed flying lap is retained across all attempts. When time
expires, drivers on flying laps may finish that lap, with no further timed lap
allowed; outlap drivers do not receive an extra flying lap. Results wait for
eligible drivers to finish (the host can still end qualifying manually).

Validation for this release: syntax, undefined-name checks, shared-module
imports and asset build only. Gameplay and multiplayer driving checks were not
run, following the preference for manual playtesting.

## Madrid IFEMA and Valdebebas environment — 2.20.0

Madrid now has a dedicated environment: vaulted exhibition halls 12/14, North
Convention Centre, an enclosed pit/hospitality pavilion, parkland, sparse pine
avenues and a 545-metre spectator bowl fitted around the retained La Monumental
curve. Instanced spectators and Spanish flags suggest the large stadium crowd;
the real venue's stated 45,000 capacity is a reference, not a rendered head count.

Two concrete underpass shells enclose the full curved road envelope. Roofs,
portals, permanent ceiling lights, highway parapets, shared collision walls,
rain shelter and tunnel camera clearance use the same placement plan. Branded
boards, overhead gantries, El Búnker block stacks, bank-side reinforced rails,
marshals, working LED status panels, TV cranes, fan zones, distant aircraft,
warm hard sunlight and subtle animated heat shimmer complete the surroundings.

Whole building/stand reservations check every road branch and keep later props
clear. Repeated sponsor textures and static geometry are shared/batched; crowds
use instancing. The road centreline, elevation profile, banking, racing line and
cars are retained. Architecture, prop locations and tunnel envelopes are artistic
reconstructions fitted to that layout, not scanned official-game assets or
surveyed construction dimensions.

Verification: syntax/undefined-name checks, asset build and static geometry
inspection (finite vertices, 97 clear assembly sites, and tunnel collision walls
at least 15.09m from the centreline). No gameplay tests were run.

## Staggered starting grid and Cadillac livery — 2.21.0

Race starts now alternate left/right with each consecutive car 8 metres farther
back, giving 16 metres between cars in the same column. The 7.2-metre lateral
separation is retained. Race spawns, post-qualifying grids and L-shaped painted
slots share the same placement function, including online sessions.

Cadillac is appended as the eleventh livery without changing existing selections.
Its 2026 debut black/white split is rendered across the chassis, nose, engine
cover and sidepods, with contrasting CADILLAC side lettering. The selector shows
the livery year per team (the original ten remain their 2025 schemes).
Reference: https://www.cadillacf1team.com/news/cadillac-formula-1-r-team-reveals-historic-first-livery

Static verification: all 42 circuit grids have non-overlapping car footprints;
all eleven livery models assemble and batch with finite geometry. Syntax,
undefined-name checks and the asset build pass. No gameplay tests were run.

## Momentum-based car collisions — 2.22.0

Car-to-car contact now uses two-dimensional momentum and rotational inertia.
Side swipes push cars sideways instead of projecting the entire impact onto
forward speed. Rear bumps transfer motion to both cars; off-centre hits produce
bounded rotation. Small restitution and limited sliding friction dissipate impact
energy without making light parallel contact stop either driver.

Lateral impact velocity and rotation persist across physics ticks and settle
through tyre grip, more slowly in wet conditions. Barrier contacts use the full
velocity vector, and server snapshots/client prediction carry the same impact
state. The speedometer includes lateral motion. Recovery, retirement and race
finish clear the remaining impact state. Qualifying stays ghosted.

Verification: syntax, undefined-name checks, shared-module imports, asset build
and eight isolated collision-math scenarios covering momentum/energy, grazing,
rear, offset, crossing, head-on and reversing contact. Parallel rubbing retains
speed; all checked scenarios conserve linear momentum and add no impact energy.
These are component calculations, not gameplay or internet playtests.
