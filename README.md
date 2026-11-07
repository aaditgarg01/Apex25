# APEX 25

An original 3D browser racing game inspired by the 2025 open-wheel season. It is an arcade game, not a reproduction of EA/Codemasters F1 25.

## Play online

[Play APEX 25](https://apex-25-production.up.railway.app/).

Current source version: **2.52.0**. Includes dry, damp and wet conditions, scenery and stylized landmarks for all
42 circuits, improved multiplayer prediction and rendering, and purple sectors
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

## Las Vegas Strip environment — 2.23.0

Las Vegas now has a dedicated night environment with geographically anchored,
original simplified models of the Sphere, Eiffel Tower replica, Bellagio,
Caesars Palace, Venetian, Flamingo and Wynn. The Sphere displays animated LED
patterns; Bellagio has animated illuminated fountain jets. Permanent circuit-wide
road illumination and emissive floodlight fixtures stay on independently of
player location. Casino windows, neon trims, pedestrian bridges, the GP paddock,
occupied grandstands, phone lights, LED sticks and hospitality add trackside scale.

Grey concrete walls and black catch fences share the same boundary. Scuffed
red/white safety cladding follows solid collision walls at technical corners.
Palms, hedges, marshals, LED warning panels, cranes, medical vehicles and an
infield stage are kept outside the road. Faint brake haze is cosmetic only.
Whole-model checks protect all road branches; static geometry is batched.

These are procedural approximations, not a scanned or licensed replica of the
commercial F1 game. References: official Las Vegas GP circuit/zone information
(https://www.f1lasvegasgp.com/2026/), Sphere engineering dimensions
(https://www.walterpmoore.com/projects/msg-sphere-at-the-venetian), and the Paris
Las Vegas fact sheet (https://newsroom.caesars.com/files/images/fact-sheets-images/Paris-Las-Vegas-Fact-Sheet_July-2023_FINAL.pdf).

Verification: syntax/undefined-name checks, source build, static model geometry,
road clearance and batching inspection. No driving or multiplayer playtests.

## Driver setup, private-room settings and qualifying joins — 2.24.0

Start by choosing a driver name and livery, then choose Free Play or Play with
Friends. Free Play keeps the solo circuit/session setup without a multiplayer
button. Play with Friends opens host/join first; room settings then appear in the
lobby. The host can change circuit, conditions, session type, lap count, AI count
and practice start, with changes synchronized to guests. Guests see the settings
without editing them. Driver/livery selections persist locally.

An invite link retains its code through driver setup, and the join field accepts
either a six-character code or a full invite link. Players can join an active
qualifying session until the seven-minute clock expires. They start their own
single outlap with a fresh car and the remaining session time. Existing driver
states, valid laps and the session clock are preserved. A late human replaces an
AI if necessary; rooms never exceed eight cars. Races and qualifying results are
closed to new entrants. Invite-copy controls are also available in the online
qualifying menu.

Verification: syntax, undefined-name and DOM-target checks, asset build, and
isolated room/session component checks covering timer/result preservation,
outlaps, input clocks, AI replacement, capacity, closed sessions, invite parsing
and settings validation. No driving, browser gameplay or multiplayer playtests.

## Vercel site with persistent Railway multiplayer — 2.24.1

The website can now deploy independently to Vercel. `npm run build:vercel`
builds the pinned Three.js assets and copies public assets plus shared browser
modules into `dist/`. Vercel hosts those files; a small configuration function
checks the existing Railway server and supplies its secure WebSocket URL and
supported room features. Live driving inputs go directly to Railway.

For the current Railway 2.23 server, friends choose settings before creating a
room and the lobby displays those settings without editing. Joining qualifying
and editing an existing lobby stay unavailable until the Railway backend accepts
the prepared 2.24+ update. The client detects backend capabilities when connecting
and enables the new behavior once supported. Free Play remains entirely local to
the browser. Vercel does not run the in-memory racing simulation.

Deploy with `vercel --prod`; the configuration endpoint defaults to the existing
APEX25 Railway server. Set APEX_MULTIPLAYER_ORIGIN in Vercel to change the persistent
backend. Do not expose credentials in that origin. Normal `npm start` continues
to use the same-origin Node multiplayer server.

Verification: asset build, syntax/undefined-name checks, DOM identifiers and static
module paths. Deployment verification checks public assets and backend selection;
no driving or multiplayer gameplay tests were run.

## Precise contacts and synchronized multiplayer poses — 2.25.0

Car contact uses separate oriented shapes for the visible floor/body, front and
rear wings, and tyres, including front-wheel steering. Empty space beside the
nose and between the wheels is not filled by one oversized rectangle. Collision
slop is two millimetres to tolerate rounded network coordinates.

Every physics step records its simulation time. Server contact resolution projects
nearby car poses to one time, resolves contact there, and transfers only position
corrections and momentum changes back to the original states. It never advances
another driver's input clock or lap progress. Uncertain moving poses older than
250 ms are excluded from speculative contact; stationary cars stay solid.

Client prediction corrects contact positions without inventing braking impulses
against guessed rival inputs. Momentum remains server-authoritative. Nearby rival
rendering uses the player's visual correction as one rigid frame, preserving the
same visible gap as the collision poses. Remote-clock catch-up is bounded but
faster after a delivery stall.

The Esc menu shows the room code and copy controls in every friends session,
including practice, race and qualifying. Host lobby editing remains enabled on
the prepared backend until Start Session; guests cannot edit it. Vercel detects
the running backend's capabilities and does not advertise unavailable features.

Verification: syntax/undefined-name checks, asset build, DOM identifiers and ten
isolated contact/timing cases covering clear gaps, true contact, four impact types,
clock alignment, stationary cars and coherent nearby display offsets. These check
momentum conservation and no added impact energy. No driving or internet playtests.

## Direct server positions — 2.26.0

Online cars now display the latest received server position and heading exactly,
including the local car. Removed input replay for rendered poses, rival prediction,
interpolation buffering, extrapolation, visual correction offsets and client-only
contact resolution. Between snapshots, positions hold; no guessed movement is
shown during a delivery stall. Input commands still send at 60 Hz with acknowledgments,
epoch resets and a bounded queue. Free Play keeps its local simulation unchanged.

The prepared backend now broadcasts after every simulation tick, up to 60 Hz,
while skipping backed-up sockets and sending only the newest completed state.
Network transit remains unavoidable; this mode adds no presentation delay, but
controls become visible after their authoritative update returns from the server.

Lobby editing already exists in the prepared backend. It remains unavailable on
the live Railway 2.23 server: Railway rejected the deployment with “Deploys have
been paused temporarily.” Do not unlock the fields against an unsupported server
or claim room updates are live until that backend has actually been deployed.

## Shared-clock multiplayer and compact updates — 2.27.0

New clients send their latest control state on change, with 50 ms heartbeats and
an 80-message/second ceiling for high-refresh analog input. Unsent controls are
coalesced when a socket is backed up. The authoritative server advances each car
once per 60 Hz simulation step on the shared session clock, instead of waiting
for one queued command for every client frame. Lost connections brake after
700 ms and invalidate the old input epoch. Older command-stream clients remain
compatible until refreshed.

Protocol 3 sends compact, exact motion samples at up to 60 Hz and full timing and
classification snapshots about every 100 ms. Phase changes, roster/history changes
and periodic history refreshes force complete snapshots. Backed-up sockets skip
obsolete snapshots. The sample eight-car payload is 999 bytes versus 5,499 bytes;
10 complete plus 50 motion updates per second use about 32% of the former traffic.
Positions are held between confirmed updates: no client prediction, extrapolation
or artificial interpolation delay was introduced.

Deploy the backend before the Vercel client. Health/config capability flags select
the new input and snapshot protocols only when the connected backend supports them.
Refresh every player's browser and create a new room after deployment.

Validation: production asset build, syntax/undefined-name checks and focused input,
clock, epoch, compact-packet and exact-pose checks. No browser driving playtest.

## Restored smooth multiplayer tracking — 2.28.0

Restores the earlier tracking approach for multiplayer presentation: an adaptive
90–220 ms snapshot buffer, shortest-angle interpolation and at most 100 ms of
projection to bridge missing rival samples. Every received full/compact sample
is recorded, including bursts between browser paints. Recovery, input epochs,
phase changes and finished cars reset or bypass interpolation.

The local car again responds through a reconciled visual simulation, adapted to
the current shared-clock controls. It replays recent held controls over an RTT
estimate, blends small corrections and caps projection at 250 ms after the
confirmed input horizon. Long stalls hold the last bounded pose. This only changes
rendered tracking: server collision impulses, lap validity, results, lobby editing,
the shared 60 Hz simulation and compact transport remain unchanged. No speculative
car-contact solver or old per-frame input queues are restored. Free Play is unchanged.

Refresh all players after deployment. Driving verification is left to the user;
only syntax and production packaging are checked for this change.

## Pit stops and tyre strategy — 2.29.0

Press **P** or the Pit button to request/cancel a tyre change. Choose Soft, Medium,
Hard, Intermediate or Wet in the Esc menu before requesting. A cyan service lane
is generated on a straight near the start/finish using the existing paved ribbon;
it is a gameplay service lane, not surveyed real-world pit-lane geometry. Once
requested, assist brakes toward entry, follows an 80 km/h lane, queues behind cars
at the box, stops for three seconds, fits a fresh set and rejoins at the lane end.
The pit box is painted yellow and has a simple animated crew. Stops do not refill
battery instantly, remove penalties or count as recovery. Driving through the
pits invalidates the current timed lap; the original qualifying clock/outlap rules
remain in force. Finished/retired drivers cannot request a stop.

Fresh-set life scales with configured race distance. Gentle baseline stints are
60% of race laps on Soft, 80% Medium, 105% Hard, 85% Intermediate and 95% Wet,
with a 1.5-lap floor. A three-lap race therefore gives approximately 1.8 / 2.4 /
3.15 laps for the dry compounds. One/two-lap sprints use a longer 170% baseline
so an ordinary sprint does not force a stop. Practice/qualifying use an eight-lap
reference, and everyone starts the race with a fresh condition-appropriate set.

Wear is driven by distance, with extra scrub/sliding/off-track wear. Using overtake
adds 25–80% wear while active as boost heat rises over six seconds and cools over
ten. Actual car/wall impacts above 2 m/s remove up to 14 percentage points, with
a 0.4-second cooldown to avoid repeated losses per solver pass. No battery use or
stationary idling alone consumes distance-based life. Grip/braking progressively
fall below 35% remaining and more sharply below 10%; wrong weather compounds also
lose grip and wet tyres wear faster on dry roads. AI follows the same wear rules
and requests a stop below 35% when enough race distance remains.

Tyre/pit state is server-authoritative online. Optional parallel strategy rows
preserve compatibility with existing compact motion packets; the Vercel client
only enables online pit controls when Railway advertises `pitStops`. Free Play
works immediately with the same shared physics. Previous multiplayer tracking
and collision geometry/impulses are retained. Refresh clients and start a new room.

Validation for this change: production packaging, syntax and undefined-name
checks, module imports and UI identifier checks. No test suite or driving playtest.

## Graphics startup fix — 2.29.1

Renamed the local wheel cross-section array that shadowed the imported tyreProfile
lookup in RaceScene.makeCar. The conflict threw before the renderer could draw
even one frame, leaving menus on a blank background. Tyre wear, pit stops and
multiplayer behaviour are unchanged. Confirmed the live error before the fix;
verification covers the rendered scene and browser error log after deployment.

## Keyboard tyre choices and external pit lanes — 2.30.0

Use **1 Soft / 2 Medium / 3 Hard / 4 Intermediate / 5 Wet**, or **T** to cycle.
Before a session, during its countdown and between qualifying/race these select
starting tyres; during live driving they select the next pit set. **0** restores
condition-matching Automatic starting tyres. Text/number entry fields retain
normal typing. The starting selector appears on the driver, Free Play, friends'
lobby and qualifying-results screens. It remains each driver's own choice,
including guests; room settings remain host-controlled. Starting tyres lock at
lights out; next-stop choices lock only while the crew is changing tyres.

Pits now use a separate six-metre asphalt lane beyond the racing ribbon. Shared
geometry defines a dedicated edge entrance, gradual entry/exit connectors, service
box, divider, outer walls, terrain clearance and blue route markings. The selected
side near the start line avoids nearby branches of the circuit. Existing street
wall width clamps do not fold the new lane boundaries back onto its entrance.
Only conflicting Jeddah Tecpro blocks are omitted from the reserved corridor;
scenery is cleared before batching. These remain generated gameplay pit lanes,
not surveyed replicas of each circuit's real pit complex.

Request with **P**, then steer to the marked left/right entrance. A booking no
longer drags a car across the racing line. Missing the entrance retains the booking
for the next lap. Pit assist holds 80 km/h along the actual path, queues at the box,
changes tyres in three seconds and yields to approaching traffic before merging.
AI drivers steer toward the same entrance. Existing tyre wear, racing collision
rules and multiplayer tracking remain in place.

The server validates per-driver starting/pit choices. Full snapshots carry starting
preferences and existing strategy motion rows carry the next set. Health/config
advertise `tyreSelection` and `externalPits`; no input protocol version changed.
Refresh all players and create a fresh room after deployment.

Verification: syntax, undefined-name/shadow checks, module loading and production
packaging; all 42 service lanes lie outside the racing ribbon and their sampled
paths have no solid-barrier contacts. Local UI inspection confirmed number-key
starting selection, a different next pit set during a parked practice session,
and rendered external asphalt/divider without browser errors. No driving playtest
or full test suite was run.

## Mexico City, dynamic weather and tyre strategy — 2.31.0

**Dynamic / changing weather** is a fourth conditions choice in solo and friends'
room setup. Sessions begin dry; a front can arrive after 30–70 seconds, then change
again at irregular 45–110 second intervals. Rain ramps rather than switching
instantly. Water accumulates over about 34 seconds and dries much more slowly,
so a clearing sky does not immediately restore dry grip. The server owns the
weather; full and compact snapshots carry the same actual rain/surface state to
all drivers, including mid-qualifying joiners. The future schedule stays private.
Qualifying time, the single outlap and valid-lap classification are unchanged.

Tyre performance interpolates continuously with surface water. At full life on a
dry surface, intermediates have 66% grip / 86% speed factor / 2.25× wear and full
wets 48% grip / 75% speed factor / 3.05× wear relative to a medium slick. In heavy
rain, slicks have about 36% compound grip before speed-dependent aquaplaning,
while inters have 72%; wets suit standing water. Weather itself further reduces
traction, braking and speed, and worn tyres compound these effects. Lower speed
ceilings bleed off overspeed progressively, avoiding an instantaneous speed snap.
These are game-balance coefficients, not measured real tyre data. Existing boost,
scrub, off-track and impact wear continue to apply. The racing line and AI pace
also respond to surface water, compound grip and wear.

The starting tyre selector shows an **estimated fastest strategy** over the chosen
race distance, including compound degradation and the pit-time cost. It respects
a manually chosen starting compound. The live HUD shows the best next set; the
Esc menu explains whether a stop is estimated to save time over staying out.
**Y** selects the recommended starting or next-pit set. It does not book a stop or
overwrite a driver's selection automatically. **P** books/cancels a stop. Advice
assumes the currently observed surface continues; unpredictable future weather,
traffic, incidents and driver pace can change the best decision. Long races use
at most 60 planning intervals to keep setup responsive.

A pit booking no longer applies the brakes before the entrance. The 80 km/h
assist begins only when the car crosses the marked entry gate on the correct
side. Mexico's generated gameplay lane follows the inside of the final corner
onto the pit straight, with a longer service corridor. It remains an approximation
rather than a survey of the real pit entry/exit footprint.

Mexico City now has a dedicated procedural environment: opposing, tiered GNP
stadium banks with crowds and Mexican flags, screens and a podium; a 33-bay pit
building and control tower; a roofed main grandstand; football fields, park paths,
vegetation, a copper sports-palace dome and hazy distant urban blocks. No generic
stadium is duplicated. Free Practice offers a **Mexico stadium approach** start.
The existing geographic centreline is retained. Coarse SRTM relief is reduced to
a near-flat 2.6 m surface blockout, avoiding building/tree-height bumps. A 0.78
air-density factor reduces drag and aerodynamic cornering support, preserving
Mexico's high straight-line speeds. Stadium resurfacing is visually distinct.
Architecture is an original artistic representation, not a laser-scanned model.
Engine/turbo thermal simulation and surveyed variable widths are not implemented.

Reference: the FIA's [2025 circuit/pit drawing](https://www.fia.com/system/files/decision-document/2025_mexico_city_grand_prix_-_event_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_quarantine_zone_area.pdf)
and Mercedes' [high-altitude explanation](https://www.mercedesamgf1.com/news/what-impact-does-high-altitude-have-on-an-f1-car).

Verification: production packaging, syntax/undefined-name/shadow checks, tyre
coefficient and strategy calculations, weather snapshot round-trip and all 42
pit-route clearance checks. A parked local graphics inspection rendered Mexico's
new environment without browser errors. No driving playtest or full suite run.

## Late pit entry and longer practice tyres — 2.31.1

A requested stop can now activate after the entrance line when the car merges
into the physical pit lane before the service box. Detection projects the car
onto the nearby lane segments, checks height, direction and the expected circuit
branch, and rejects cars merely passing nearby on the racing surface. Pit assist
starts at the car's actual position and blends into the lane; progress is retained
rather than credited from the original entrance. Valid pit entry is recognized
before ordinary off-track penalties are evaluated. The normal three-second tyre
change increments the stop count once. Joining beyond the box is a drive-through
and shows `MISSED BOX`; it does not claim a tyre change that never happened.
Existing barriers still apply. Press **P** to request the stop as before.

Merge offsets travel as optional compact metadata, preserving the existing
motion/strategy row formats. They are discarded when the blend completes.

Free Practice uses a 24-lap reference distance instead of eight for its wear
balance, making distance-based tyre life **three times longer**. Mediums have a
nominal 19.2-lap stint rather than 6.4 before driving/wetness adjustments; softs
and hards scale likewise. Heavy boost, sliding, wrong-condition tyres and collision
damage still shorten life. Qualifying and finite race-distance wear are unchanged.
The pit menu and tyre advice use the same practice wear balance.

Focused checks covered 168 late-entry/service scenarios across all 42 circuits,
racing-surface/reverse/missed-box rejection, continuous merge positioning, compact
snapshot preservation and the 3:1 practice/qualifying wear ratio. Production
packaging and syntax/name checks passed. No driving playtest or full suite run.

## Whole-lap weather periods and integer tyre life — 2.32.0

Dynamic weather now holds one exact dry, intermediate or wet preset for **1–3
whole leader laps**. Short races cap the interval so a three-lap race can change
before its finish. Wall-clock time no longer changes weather: parking for several
minutes keeps the same condition. Rain, surface water and grip stay fixed within
each period, avoiding rapid transitions through several categories in one lap.
The next preset is chosen only at the lap boundary and differs from the current
one. The HUD shows an integer number of leader laps left in the current period.
Everyone in a room shares that state, and late joiners do not restart its clock.

A sector-based practice start begins its own full-lap-distance period from that
position. Moving from qualifying to a race preserves the current condition and
starts a fresh whole-lap period. No new front is selected after the race winner
has finished. Qualification duration and outlap/flying-lap rules are unchanged.

Nominal tyre life in laps now uses `Math.ceil` in the shared model, so physics,
strategy and the pit-menu estimate agree on an integer lifespan. For example,
Free Practice mediums round from 19.2 to **20 laps**. Remaining tyre percentages
and their HUD bar also round upwards: 50.01% displays **51%**, while a fully worn
set displays **0%**. Internal wear remains fractional, so per-frame rounding
cannot stop tyres from wearing down. Wrong-condition, boost, sliding and collision
wear remain active; Free Practice retains its longer reference distance.

Focused arithmetic/state checks covered whole-lap boundaries, stationary cars,
practice sector starts, late joins, qualifying-to-race transitions, shared weather
snapshots and ceiling rounding. Production packaging and syntax checks passed.
No driving playtest or full suite run.

## Pit lanes alongside the main straight — 2.33.0

Pit placement is now anchored to the straight containing the existing start/finish
line. The search cannot jump to a longer neighboring straight. A lane shortens to
fit that segment: Monaco uses about 192 m and Las Vegas about 306 m, rather than
placing their service areas beside a different part of the circuit.

The service corridor follows one fixed axis parallel to that straight's chord.
Only the entrance and exit connectors bend back toward the racing-road edge.
Width remains six metres, with about two metres between the service-lane edge
and racing surface. The corridor follows the local road elevation. Its ground,
markings, service box, barrier openings, limiter and late-entry detection all use
the same shared geometry.

Existing mapped pit-building sides and service stations guide dedicated venues;
other circuits prefer the infield when it is clear of other road branches.
Generic garages move to the selected lane side and service station, run parallel
to the corridor, and face their doors toward it. Entrance paint now agrees with
the HUD's left/right directions. These remain artistic gameplay pit layouts,
not surveyed reproductions of every venue's real pit complex.

Focused geometry checks covered all 42 circuits: service sections parallel to
their main-straight axis, no racing-surface overlap, a minimum sampled edge gap
of 1.97 m, and no solid-barrier obstruction along the route. Late-entry, tyre
service/counting and exit checks passed in 84 scenarios. Production packaging
and syntax checks passed. No driving playtest or full suite run.

## Interlagos bowl, crowd and reference-fitted runoff — 2.34.0

Interlagos now replaces the generic scenery with a dedicated São Paulo environment:

- A long, multi-storey pit pavilion, glass hospitality/control room and podium face
  the existing external service corridor. Permanent B/M stand stations come from
  cached OpenStreetMap footprints; reference-fitted D/H/R/G/A stands and two grass
  crowd banks frame Senna S, Curva do Sol, the back straight and the climb.
- The infield lake uses OSM way 138417940's shoreline, with reeds, subdued ripples
  and a 256px planar reflection refreshed at most every 180ms. The reflection
  target is disposed when changing circuits. No live external map requests.
- Rolling grass banks stay below the unchanged road and expanded escape surfaces;
  subtropical broadleaf trees, palms, araucaria-inspired pines, low-rise housing,
  rooftop tanks and distant apartment silhouettes give the circuit a local setting.
- 14,475 instanced spectators, 97 shader-animated original green/yellow/blue flags,
  187 trees, 159 background buildings, raised-arm fans and subtle crowd haze. Static
  boxes and signs batch spatially; the dedicated scenery has 93 full-scene draw
  calls after batching (roughly 1.07 million instanced triangles). This count
  excludes the existing road, cars, terrain and planar-reflection pass; it is not
  a frame-rate guarantee or benchmark on a physical mid-range laptop.
- Original colour-block sponsor-style boards, 150/100/50 braking markers, marshals,
  camera cranes and instanced LED panels responding to local off-track/sliding
  cautions. No new licensed sponsor artwork, liveries, audio or game assets.
- Reference-fitted grass/paved/green-painted escape areas and selected gravel:
  broad Senna S escape, Descida do Lago gravel behind a paved apron, selective
  Ferradura gravel, and tighter grass verges in the infield and on the climb.
  One shared boundary plan positions renderer and collision walls. Dark covered
  impact-wall sections reuse those exact wall solids rather than extra cosmetic
  or invisible colliders. Existing off-track/tyre behaviour is retained.
- Circuit-only warm humid cloud lighting, more overcast grey-purple wet skies and
  darker wet vegetation alongside existing rain, asphalt wetness and spray.
  Dynamic whole-lap weather timing remains unchanged.
- Free Practice offers **Senna S approach · out lap**; existing starts remain.

**Retained:** the centreline, 17m game driving width, road mesh, cached elevation
profile, car model, handling, tyre physics, lap timing, multiplayer messages and
external pit path. Only the environment's safety-boundary positions and the new
optional practice start change the shared session's environment configuration.

**Approximations / photo comparison:** temporary stand dimensions and roofs,
housing, vegetation species, grass-bank terrain, runoff/gravel extents and surface
colours are reference-fitted, not surveyed. The reference set spans a 2022 aerial,
2025 FIA map and 2026 organiser map; temporary structures/surface changes may differ
between editions. The pit pavilion is shortened to fit the game's generated pit
corridor. The lake keeps its mapped outline but its level and reflection treatment
are artistic. Optional access tunnels/footbridges were omitted rather than guessing
structural positions or altering the road elevations.

**Verified:** syntax and browser-module imports; undefined-name and shadow checks;
`npm run build` and `npm run build:vercel`; complete footprint checks against all
racing/safety and external pit branches; rendered model envelopes vs reservations;
381 reservations, no rejected placements, no intrusions, minimum conservative
scenery clearance **4.70m**, minimum sampled wall-to-driving-edge clearance **3.45m**.
Parked dry/wet rendering and console inspection are recorded with the release.
The game's test suite and a full driving/multiplayer playtest were not run.

References and ODbL attribution are in `TRACK-SOURCES.md`,
`TRACK-DATA-LICENSE.md` and `public/data/track-visual-references.json`.

## Zandvoort banking, dunes and mixed runoff — 2.35.0

Zandvoort now has dedicated coastal scenery and a shared banked-road model:

- **Hugenholtz T3 and Arie Luyendyk T14:** progressive cross-slope, up to the official
  circuit guide's 18° outer-edge maximum, with smooth quintic entry/exit ramps.
  Named angles and station profiles live in `shared/zandvoort-road-data.mjs`, also
  exposed from `public/data/zandvoort-road.js`. Hugenholtz's fitted inner slope is
  4°; Luyendyk uses the published 15–18° range. Other reports quote 19°; this model
  follows the circuit's guide. Tarzan has no newly invented numeric camber.
- **Shared driving geometry:** `banked-road.mjs` supplies cross-slope heights,
  gravity/normal-load support and road-normal attitude. The sampler, vehicle
  simulation, AI speed plan, guide/rubber, asphalt subdivisions, kerbs, walls,
  fences and car/camera orientation use it. Server and local/client prediction
  run the same simulation. Roll is derived at presentation time from the same
  surface, without changing the compact motion fields or input protocol.
- **Banking physics:** normal load includes the centripetal contribution on the
  bank; gravity supplies lateral support, and wet conditions attenuate usable
  tyre support. Grip saturation remains understeer, not steering assistance.
  Forward grip and braking continue to use the existing tyre/weather system.
- **Dune elevation:** the retained geographic centreline now follows a smooth,
  periodic landmark-fitted elevation profile, including Hunserug/Scheivlak crests,
  short dips, a rise before the final bank and a level pit straight. This is an
  artistic improvement informed by cached coarse SRTM and circuit descriptions,
  not surveyed asphalt or new measured altitude data. The 12m local-base anchor
  range is intentionally labelled approximate.
- **One shared surface/boundary plan:** paved apron plus gravel at Tarzan;
  Gerlach gravel; Hugenholtz paved escape; grass/paved Slotemaker transitions;
  Scheivlak gravel; Masters exit tarmac; selected T9/T10 gravel; Hans Ernst
  paved escape plus gravel; T13 gravel; close sand/grass and protection at T14.
  Surface widths taper and cap against other branches. Renderer and collision
  share their outer safety-wall geometry; covered impact sections reuse those
  exact solids. Sand/gravel/grass are traversable terrain, not invisible walls.
- **Surface behaviour:** tarmac runoff keeps near-normal grip and has a smaller
  time penalty while still invalidating an illegal timed lap. Gravel and sand
  add heavy drag and low grip; grass loses more grip in rain; deep dune ground
  strongly slows the car. Existing track-limit invalidation, recovery and tyre
  scrub/off-track wear continue. Surface effects are scoped to Zandvoort.
- **Scenery:** mapped pit/main-stand anchors, external pit-facing garage pavilion,
  podium, orange crowd stands and dune banks around Tarzan, Hugenholtz, Hunserug,
  Scheivlak, the arena and the final corner. Pale dunes, instanced beach grass,
  pine/scrub/broadleaf groups, distant town/hotel silhouettes, original sponsor
  placeholders, marshals, cranes, distance boards, animated flags, restrained
  orange smoke, western North Sea horizon and distant artistic wind turbines.
- **Weather:** cool coastal light and haze, slow sky movement, dry sand mist and
  gentle sea waves. Wet modes darken sand and vegetation while retaining existing
  rain, spray, reflective asphalt and dynamic whole-lap weather.
- **Free Practice:** **Tarzan approach** and **Banked final corner** starts.

**Madrid and other tracks:** the previous Madrid code had visual scenery banks,
not a shared driving-bank model. There was no existing Madrid physics mechanism
that could be reused honestly. The new model is enabled only for `nl-1948`;
Madrid's road/handling/scenery path is retained. Car models, other geographic
centrelines, multiplayer packet formats and session rules remain unchanged.

**Placement/performance:** whole envelopes are reserved against every racing,
runoff/safety and external-pit branch before rendering. Dune grass, vegetation,
crowds and flags are instanced; static structures batch spatially. The design
budget is ~12–16k spectators, ~100 flags and ~3–5k grass tufts, with an estimated
100–130 scenery draw calls. These are targets, not measured counts or FPS claims.
Animations update at most every 80ms; shared materials/textures are disposed by
normal circuit cleanup. No live external map requests during play.

**Uncertain / compare manually:** exact banking start/end stations and inner
Hugenholtz camber; unmeasured crest heights; individual gravel/tarmac/sand widths;
season-specific temporary stands; dune vegetation and town/turbine silhouettes.
Only two permanent architecture footprints were present in the downloaded map
subset. All other scenery is explicitly approximate. No additional photos were
attached to this brief; the official corner photos and organiser map were used
as references, without redistributing them as textures.

**Testing left to the user:** no game tests, banking/elevation regression checks,
clearance audit, static-name/shadow checker, browser render or multiplayer playtest
were run for this release, at the user's request. Placement reservations execute
when the circuit is built; they are an implementation safeguard, not a claim of
independent verification. Production packaging is reported separately. In
particular, Madrid regression equivalence, final visual placement, bank feel,
runoff overlap, surface balance and frame rate remain for manual testing.

References and ODbL attribution: `TRACK-SOURCES.md`, `TRACK-DATA-LICENSE.md`,
`public/data/track-visual-references.json` and `public/data/zandvoort-architecture.js`.


## Miami stadium, marina, runoff and track dressing — 2.36.0

Miami (`us-2022`) now has a dedicated tropical campus environment, replacing its
previous generic scenery. The existing geographic centreline, 19-corner order,
17m game road width, cached elevation anchors, car models, multiplayer packet
formats and session rules are retained. No unverified driving ramps were added.
The 5.412km published length corresponds to ~5.422km in the retained sampled road.

- **Stadium:** the OSM stadium footprint supplies position, orientation and a
  conservative 274 × 261m envelope. An original neutral bowl, seating rings,
  canopy and four plain masts reproduce its general silhouette. No stadium logo,
  sponsor artwork or reference photograph is bundled.
- **Marina:** placed in the T6–8 infield, as the organiser confirms, rather than
  beside the pit straight. The complete ~97 × 50m envelope contains original
  flat aqua vinyl-style fake water, nine instanced yachts, a dock, sandy beach,
  loungers, umbrellas and cabanas. The theme and region are reference-informed;
  boat arrangement, scale and exact anchor are approximate clearance-safe fits.
- **Pits and event grounds:** garages face the existing external pit lane from
  a pavilion parallel to its service corridor. Hospitality, podium, ten temporary
  stands, parking lots, palms/shrubs, low commercial buildings, marshals, camera
  cranes, recovery vehicles, flag panels, distance markers and original generic
  signs populate reserved space. A high expressway deck has separately checked
  supports near T14–15; it does not alter the driving elevation.
- **Surface dressing and text:** broad original teal painted areas, pink accents,
  red/white kerbs, asphalt escapes, textured grass verges and small gravel beds.
  Large original **MIAMI** lettering is painted into selected runoff surfaces;
  boards, hospitality, marina and venue signs carry readable generic text.
- **Shared surfaces:** `shared/miami.mjs` defines smoothly tapered widths, capped
  near other branches and tight inner curves. Renderer, wall/collision placement,
  scenery reservations, off-track grip/drag, track-limit penalty and guide speed
  consume this plan. The main asphalt remains unchanged. Tarmac escapes retain
  near-normal grip and a smaller time penalty; illegal timed laps still become
  invalid. Gravel strongly slows the car; grass and paint lose more grip in rain.
  Visible covered impact sections reuse the shared wall solids, rather than
  adding independent invisible colliders. Unsafe corner wall segments are omitted
  from both rendering and collision. Existing recovery remains in place.
- **Atmosphere:** high humid sunshine, blue sky/cumulus and subtle parking-lot heat
  shimmer in dry conditions; darker tropical storm light in wet conditions.
  Existing rain, spray, reflective asphalt and whole-lap dynamic weather remain.
  Flags, restrained pooled confetti and flag LEDs update on the existing loop,
  with cosmetic updates throttled to 80ms. Confetti is hidden in heavy rain.
- **Free Practice:** Turn 1 approach, back straight and marina approach starts.

**Corner-by-corner surface treatment** (original fitted widths, not a surveyed map):

| Turns | Treatment outside the road |
| --- | --- |
| T1 | Broad paved/teal escape, small approximate gravel bed, grass, covered protection |
| T2–4 | Narrow paved/painted shoulders, grass and close concrete protection |
| T5 | Medium paved/painted escape and grass |
| T6–8 | Broad teal/pink painted tarmac, grass islands and marina dressing |
| T9–10 | Tight paved shoulders, grass and concrete walls |
| T11 | Broad braking escape, paint and covered impact protection |
| T12 | Medium paved escape and grass |
| T13–16 | Tight chicane shoulders, narrow grass, close concrete walls and high overpass |
| T17 | Broad paved/painted escape, small approximate gravel bed and covered protection |
| T18–19 | Modest paved/painted shoulders and grass |

**Approximate / compare manually:** the organiser verifies the marina's T6–8
region and fake vinyl water, but not these exact boat/club dimensions. The stadium
position/orientation is map-derived; its architecture is simplified original
geometry. Temporary stands, individual palms, hospitality, parking, overpass shape
and support stations are reference-fitted artistic assets. Corner stations and
runoff widths are fitted to the existing road. No reliable source established
small Miami gravel trap positions: the T1/T17 beds are explicitly artistic safety
additions behind paved escapes, not claims of real gravel traps. Exact building
facades, stand seasons and sponsor placement are not reproduced.

**Static verification:** syntax and module imports, undefined-name/shadow checks,
`npm run build`, `npm run build:vercel` and whitespace checks passed. A dedicated
Three.js construction audit found **355 reservations**, no rejected required
placements, no road/pit/runoff-envelope intrusions and no model envelope overflow.
Minimum conservative scenery clearance: **3.24m** beyond the reserved safety/pit
corridors. Minimum sampled wall-edge clearance from the racing road: **0.78m**.
An independent polygon check examined **3,476 runoff quads** against non-local
road branches (local 65m neighbourhood excluded), with **zero intersections**;
140 quads at the pit corridor are masked out. Overpass underside clearance over
covered road samples: **10.20m**. These are static checks, not driving guarantees.

**Measured construction budget:** 12,443 spectators, 257 palms, 88 flags and nine
boats; dedicated scenery becomes **128 mesh submissions** after spatial batching,
~1.07M triangles including repeated spectator geometry. This excludes the road,
HUD, cars, weather and shadow passes, and is not a measured FPS claim. Large
geometry is batched; spectators, palms, boats and poles are instanced. Assets are
local; normal circuit cleanup disposes geometry/materials/textures.

**Render inspection:** parked local dry and wet views loaded with no captured
browser errors; the dry overhead preview visibly shows the MIAMI runoff text.
No driving, multiplayer playtest or game test suite was run. Surface balance,
full-lap visual fidelity and frame rate remain for the user's manual testing.

Sources and data licensing: `TRACK-SOURCES.md`, `TRACK-DATA-LICENSE.md`,
`public/data/track-visual-references.json` and `public/data/miami-architecture.js`.


## Silverstone Wing, airfield surroundings and mixed runoff — 2.37.0

Silverstone (`gb-1948`) now has a dedicated former-airfield environment instead
of generic venue scenery. The existing clockwise geographic centreline, Hamilton
Straight start alignment, 18-corner order, 17m game road width and cached SRTM
anchors remain. The sampled road is ~5.884km versus the published 5.891km; its
retained coarse elevation range is 12.97m. No new driving camber, banking, ramps
or elevation measurements are invented. Car models, engine/steering/contact
algorithms, multiplayer packet formats, weather scheduling and session rules
are retained; the existing per-venue off-track surface hook gains Silverstone.

- **The Wing:** OSM way 227332429 supplies its anchor and orientation reference.
  A neutral original pavilion has a gently curved plan, three sweeping roof
  crests, glass hospitality frontage, ground-floor garages, podium and readable
  pit/venue signs. It is aligned with the generated external pit service axis.
  The source footprint envelope is ~32.9 × 375.9m; the model envelope is 28 × 390m,
  shifted ~17m and rotated ~2° to clear both the generated lane and mapped roads.
  The 390m reference length comes from the roof supplier's project case study.
  This is a simplified architectural interpretation, not a scan or exact replica.
- **Mapped grandstands and heritage:** Copse, Becketts, Chapel, Stowe, Club, Vale,
  Abbey, Farm, Village, Wellington, Luffield, Woodcote and both pit-straight areas
  use cached named OSM outlines. Museum, experience and national-garage footprints
  inform neutral buildings. A low control tower and additional hangar are artistic
  airfield-heritage props, not verified surviving RAF structures. A cached
  pedestrian bridge route (way 1412628538) informs a high walkway with a connection
  within the already-cleared Wing envelope; dimensions/height are approximate.
- **Open countryside:** OSM woodland regions inform tree blocks, with scattered
  mature broadleaf trees, hedgerows, grass viewing banks and distant village/farm
  silhouettes with tiled roofs and church spires. A safe portion of a documented
  former runway/taxiway is dressed as a flat, faded strip. It is not a new racing
  route. Campsites, caravans, parked cars, masts and hospitality fill reserved
  spaces. One camp begins from the mapped Whittlebury camping region; remaining
  temporary camp/parking arrangements are original approximate fits.
- **Crowds and event dressing:** ~19,800 instanced fans in jackets/caps, original
  procedural Union Jack motifs, wet-weather umbrellas, restrained pooled smoke,
  marshal huts/LED panels, camera/recovery cranes, distance boards and screens.
  Signs use one original text atlas, including **SILVERSTONE · THE WING**, stand
  names, airfield/camping labels and generic commercial placeholders. No sponsor
  logos, real team artwork or reference photos are bundled as textures.
- **Shared ground surfaces:** `shared/silverstone.mjs` owns per-corner paved,
  painted, gravel and grass widths. The plan feeds surface meshes, scenery
  reservations, shared safety-wall placement, off-track grip/drag/penalties and
  guide-speed sampling. Tarmac runoff retains near-normal grip and a smaller
  penalty; illegal timed laps still become invalid. Gravel adds heavy drag/low
  grip; grass and paint lose more grip in rain. Existing recovery remains.
  Branch conflicts suppress the affected runoff overlays and use the grass
  fallback in surface sampling. No decorative surface is allowed over a cached
  access-road branch. Walls/fences are omitted from both render and collision
  where their solids would cross a road opening. Covered tyre-protection artwork
  uses those same wall volumes; it does not create separate invisible colliders.
- **Kerbs and wear:** retained red/white raised corner kerbs, dark guide rubber,
  repaired tarmac seams and braking-zone marks. Large original **SILVERSTONE**
  lettering is painted into selected wide asphalt escape areas.
- **Atmosphere:** cool summer light, soft shadows, moving cumulus sky and distant
  haze; darker grey sky, existing rain/spray/asphalt reflections and sodden ground
  in wet conditions. Existing damp and dynamic whole-lap weather paths are kept.
  Cosmetic flags/smoke/LEDs/sky movement update at most every 80ms; umbrellas show
  when wet and smoke fades out. Normal circuit cleanup releases materials/maps.
- **Free Practice:** Copse approach, Maggotts–Becketts and Stowe approach starts.
- **Related correction:** removed a duplicate Miami scenery dispatch so its
  dedicated environment is constructed once.

**Corner-by-corner surface plan** (original fitted widths, not surveyed extents):

| Turns | Treatment |
| --- | --- |
| T1 Abbey | Broad tarmac escape and grass beyond; reflects modern replacement of old gravel |
| T2 Farm | Paved shoulder, broad grass verge |
| T3 Village | Paved braking escape, selected gravel and grass |
| T4 The Loop | Grass island with paved outside escape |
| T5 Aintree | Paved exit and grass |
| T6 Brooklands | Paved apron transitioning to gravel and grass |
| T7 Luffield | Narrow paved apron, gravel outside and grass |
| T8 Woodcote | Paved exit, grass strips |
| T9 Copse | Wide asphalt escape and grass; no invented new Copse gravel trap |
| T10–13 Maggotts–Becketts | Alternating paved escapes, selected gravel beds and grass |
| T14 Chapel | Paved exit plus documented left-side gravel |
| T15 Stowe | Paved apron and broad left-side gravel |
| T16 Vale | Nominal 1.7m right-side asphalt strip followed by gravel, capped where needed |
| T17–18 Club | Paved escape, grass and pit-side protection |

**Placement and approximations:** complete envelopes include roofs, people,
flags, umbrellas, tree crowns and crane travel. They are reserved against every
racing/safety, external-pit and cached local access/crossing branch. Map-derived
anchors are not all rendered exactly at their original coordinates: oversized
road/safety corridors and retained generated pits require relocations or reduced
stand envelopes. Most named stands keep their source scale; Abbey is reduced to
74%, Luffield Corner to 62%, and the curved Luffield stand uses a smaller 48m
replacement. Some stands/clubhouse move up to ~190m to find safe space. These
positions are explicitly approximations and should be compared manually against
season-specific photos. Individual runoff widths, gravel extents, banks, species,
control-tower/hangar styling, bridge height and villages are also approximate.
The modern Abbey tarmac and Chapel/Stowe/Vale gravel changes have primary-source
support; not every bed's numeric extent was verified. No additional Silverstone
photos were attached to this brief; official maps/pages and internet reference
images were consulted, without redistributing them.

**Requested static verification:** syntax checks for all changed JS/MJS modules,
undefined-name/shadow checks (strict on new modules; existing-file allowances
retained), renderer/shared module graph imports, `npm run build`,
`npm run build:vercel` and whitespace checks passed. The Three.js construction
audit found **795 reservations**, no rejected placements, no blocked envelopes and
no model footprint overflow. It includes **3,387 cached access-road segments**.
Minimum conservative scenery clearance: **1.07m** beyond the reserved safety/pit/
access corridors. Minimum sampled wall-edge clearance from the driving road:
**1.00m**. These are static results, not a driving guarantee.

The independent polygon audit checked **3,627 runoff quads** against non-local
racing branches (65m local neighbourhood excluded), plus generated pit bands and
cached access-road polygons: **zero intersections**. 146 access-conflict quads
and 151 additional pit-corridor quads are masked out. The walkway underside is
at least **9.76m** above covered racing-road samples. Its Wing connection shares
that building's already-reserved footprint.

**Measured construction budget:** 19,784 spectators, 540 trees, 126 flags, 360 tents
and 60 caravans. Dedicated scenery produces **145 mesh submissions** after spatial
batching, ~1.79M triangles including repeated crowd geometry. This excludes the
racing road, HUD, cars, weather, shadow passes and visibility/frustum reductions;
it is not an FPS measurement. Static boxes and shared-atlas signs batch in 480m
cells; crowds, vegetation, flags, umbrellas, camps and cars use instancing. Cached
assets require no external map/service requests during play.

**Render inspection and limits:** parked local dry Wing and wet Stowe views loaded
with no captured browser errors. No game test suite, driving laps, collision
playtest, multiplayer playtest or full dynamic-weather race was run. Handling
balance, exact visuals around an entire lap and frame rate remain for manual
user testing. Verification reports accompany the local release archive.

References/attribution: `TRACK-SOURCES.md`, `TRACK-DATA-LICENSE.md`,
`public/data/track-visual-references.json`, `public/data/silverstone-architecture.js`
and `shared/silverstone-access.mjs`.

## Red Bull Ring alpine hillsides, gravel and circuit dressing — 2.38.0

Spielberg (`at-1969`) now uses a dedicated Austrian environment. The unchanged
clockwise XY centreline is ~4.307km sampled; source display metadata is retained.
The original 97 SRTM anchors remain in the data. A separate refined road profile
blends in cached EU-DEM heights, smooths noise and fits the published 65m relief
within official gradient limits. The 3.6km landscape cache shapes the surrounding
valley, rolling grass meadows and forested slopes. Near-road terrain is constrained
below every nearby racing/runoff branch, with reserved foundations under buildings
and stands. Existing pitch/gravity/camera handling reads the refined profile.
This is DEM-informed procedural scenery, not laser-scanned or photorealistic terrain.

- **Complete surface dressing:** one shared per-corner plan defines asphalt
  escapes, coloured paint, gravel beds, grass verges/banks and outer safety lines.
  T1/T3 have paved braking escapes and gravel; T4 has a short paved gap into close
  gravel; T6/T7 have paved aprons and gravel with sloping grass; T9/T10 have a
  distinct 2.5m gravel edge band within wider fitted traps. T2/T5/T8 retain narrower
  paved shoulders and grass. Surface meshes follow road/terrain height; adjacent
  roads and pits cap or mask the areas. Red/white corner kerbs, raised exit detail,
  racing-line rubber, repair seams and darker braking marks remain. Large original
  **SPIELBERG** lettering appears on selected wide escape areas. No sponsor logos,
  bull emblems or official brand artwork are included.
- **Shared gameplay surface data:** paved runoff has near-normal grip and a
  smaller time penalty; gravel adds heavy drag and low grip; grass and paint lose
  grip in rain, with additional grass-slope sensitivity. Track-limit invalidation
  and recovery remain. The same shared plan feeds guide-speed sampling, scenery
  reservations and barriers. Renderer and collisions consume one wall/fence solid
  list, with tyre-cover artwork at selected impact zones and Armco elsewhere.
  Openings crossing cached service roads are omitted from both representations.
- **Pit and paddock:** a neutral angular 28×305m multi-level pavilion uses the
  mapped Box envelope, fitted parallel to the existing external pit lane. It has
  glass hospitality frontage, garage bays, podium and readable pit signs. Its
  anchor shifts ~17m to clear the generated lane and emergency route. A generic
  control tower, hospitality blocks, normal start gantry and pit furniture remain
  within complete reserved footprints.
- **Stands and landscape:** nine mapped stand envelopes, six grass viewing
  terraces, a mapped hillside hospitality reference, farm silhouettes, conifer
  woods, scattered broadleaf trees, meadow grass/wildflowers, three safely fitted
  campsites and three parking areas. Mapped stands can be relocated or reduced;
  all adjustments are recorded in the clearance report. One optional extra camp
  is omitted because no clear fit was available.
- **Event atmosphere:** predominantly orange crowds, Austrian red-white-red flags,
  generic orange banners, wet umbrellas, restrained orange smoke, camera/recovery
  cranes, marshal huts, live caution LEDs, 150/100/50 boards and shared-atlas venue
  signs. Dry conditions use cool alpine haze, brighter summer light and drifting
  cumulus; wet conditions use darker mountain-storm colours, existing rain/spray/
  reflections and low cosmetic mist. Existing damp and dynamic whole-lap weather
  scheduling is unchanged. Cosmetic animation updates at most every 80ms and normal
  circuit cleanup releases assets.
- **Free Practice:** Turn 1 climb, Downhill run and Final corners starts.

**Corner treatment** (original fitted widths, not surveyed runoff boundaries):

| Turn | Outside surface sequence |
| --- | --- |
| T1 uphill right | Paved escape → gravel → grass bank |
| T2 gentle climb left | Narrow paved shoulder → grass |
| T3 crest right | Paved braking escape → gravel → grass |
| T4 downhill right | Short paved gap → close gravel → grass |
| T5 gentle right | Modest paving → grass |
| T6 left | Paved apron → gravel → sloping grass |
| T7 left | Paved apron → gravel → sloping grass |
| T8 right | Paved exit → grass |
| T9 Jochen Rindt right | Kerb/paved edge → 2.5m gravel edge band within broader gravel → grass |
| T10 right | Kerb/paved edge → 2.5m gravel edge band within broader gravel → grass/pit-side protection |

**Accuracy limits:** official circuit information/FIA map support corner order,
valley setting, relief and maximum gradients. EU-DEM's upstream 25m data has stated
±7m vertical RMSE; the cached landscape grid is sampled every 180m. Road heights
are constrained approximations, not survey measurements. Refined game gradients
reach about +10.97% / -8.53%, below the published 12% / 9.3% maxima. No driving
camber is invented. The main pit axis follows the generated service lane, rather
than exactly retaining the mapped footprint angle. Start/finish stand scale is
86%, middle stand 62%; some mapped stands/hospitality move up to ~104m for road
clearance. Exact roof details, trap widths/lengths, temporary seating, campsite
arrangements, species and event dressing remain artistic. No extra photos were
attached to this brief. No named castle/church or new road bridge/tunnel is added
without a verified location, clearance and height. Cached bridge reference data
is retained without inventing a traversable structure.

**Requested checks:** syntax, undefined-name/shadow checks (strict new modules;
existing-file allowances retained), browser/server module imports, `npm run build`,
`npm run build:vercel` and whitespace checks passed. Complete-envelope audit:
**903 reservations**, **1,929 cached linear access segments**, no rejected required
placements, blocked envelopes or model footprint overflows. Minimum conservative
scenery clearance beyond racing/safety/pit/access corridors: **3.01m**. Minimum
sampled wall-edge clearance to the driving road: **0.80m**. The independent runoff
polygon audit checked **2,348 quads** against non-local racing branches (65m local
neighbourhood excluded), pit bands and access roads: **zero overlaps**. 464 access
conflicts and 60 additional pit conflicts are masked. Elevation samples are finite;
maximum 0.5m-station height change is 5.48cm. Start/finish seam differences are
0.013mm height and 0.00000026rad pitch. Sampled constrained ground stays at least
0.84m below the associated road/runoff surface. These are static measurements.

**Measured scenery construction budget:** 18,686 instanced spectators, 752 trees,
5,600 meadow tufts, 88 flags, 216 tents and 36 caravans. After spatial batching:
**111 mesh submissions**, ~1.56M triangles including repeated crowd geometry;
static box batches reduce 1,229 boxes to 16. This excludes cars, racing road,
weather, HUD and extra shadow passes; it is not an FPS result. Shared textures,
spatial batches, instancing and local caches avoid external data requests in play.

**Render inspection:** parked local dry and wet views were inspected with the
browser console checked. No game test suite, driving laps, collision playtest,
multiplayer playtest or full dynamic-weather session was run. Handling, full-lap
visuals and frame rate remain for the user's manual checks. Reports and preview
images accompany the local release archive.

References and data terms: `TRACK-SOURCES.md`, `TRACK-DATA-LICENSE.md`,
`public/data/track-visual-references.json`, `public/data/redbullring-architecture.js`,
`public/data/redbullring-dem.js` and the corresponding shared caches. EU-DEM is
© European Union, with funding by the European Union; adaptations are not endorsed
by the Union. OSM data is © OpenStreetMap contributors, ODbL 1.0.


## Mexico City stadium, sports park and surface correction — 2.39.0

Mexico City (`mx-1962`) now follows two mapped L-shaped stadium stand arms instead
of two misplaced straight banks. Tiered decks, neutral canopies, 23,576 instanced
fans, screens, a podium and original festive dressing frame the stadium corners.
The pit building is recentered on its OSM reference and fitted parallel to the
unchanged external pit corridor. The copper arena moves to its mapped location;
main-straight stands, Turn 1/technical-section seating, park fields, broadleaf trees
and dense urban blocks replace percentage-based landmark placement.

The entire lap has an explicit corner-by-corner paved/paint/grass/kerb/safety plan,
including pit entry/exit. Original runoff lettering, grid/sector/pit signs,
150/100/50 boards, corner signs, marshal LEDs, cranes, spare tyres, drainage and
festival props add track dressing. No gravel trap was verified in the reviewed
sources, so none is invented. The same plan feeds surfaces, wet grip, track limits,
barriers and guide-speed sampling. Walls/fences share their collision geometry.
Dry and storm colours layer over the existing damp/wet/dynamic whole-lap weather.

**Preserved:** exact centreline, existing 2.56m elevation relief/anchors, pit route,
car, physics core and multiplayer packet structure. Practice adds **Mexico Turn 1
approach** and **Mexico stadium interior**, retaining the original stadium approach.
This is procedural, data-informed scenery, not a scanned/photorealistic recreation.

**Accuracy limits:** mapped stadium inner edges and landmark centres are retained;
roof/deck detail, temporary seating and runoff/barrier dimensions are approximate.
Three stadium patches narrow and two small end patches are omitted for roads.
The pit model fits at 92% of the requested size; the arena includes only the central
dome. Five old-banking remnants are decorative, with an unverified artistic slope.
Cached footbridge paths are not rendered because a safe two-pier fit/height was not
verified. Named mountains, flyovers and the separate nearby baseball-stadium roof
are not reproduced. Sector markings follow FIA reference offsets; existing game
sector timing remains unchanged. No real sponsor, team or venue artwork is added.

**Checks:** 18 syntax checks, strict new-module undefined/shadow checks, existing-file
lint, imports, both production builds and static clearance checks passed. Across
1,009 scenery reservations the minimum conservative clearance is **1.536m**, with
zero blocked/overflowing model footprints. 2,213 runoff quads have zero other-road,
pit/access or building overlaps. 326 static pit-route car probes have no wall
contacts or route deviation. All 4,600 collision wall solids match renderer sources;
17/17 corners are classified. Other 41 circuits retain their static wall geometry.
Scenery construction: 113 mesh submissions, ~2.00M triangles including repeated
crowd geometry, excluding road/cars/runoff/shadows. Parked dry/wet previews were
inspected; the test suite, driving and multiplayer playtests were not run.

See [the complete baseline audit, per-corner width table, references and remaining
uncertainties](docs/MEXICO-AUDIT-2.39.0.md), [sources](TRACK-SOURCES.md) and
[data attribution](TRACK-DATA-LICENSE.md).

## Circuit tyre strategy, race allocation and interval standings — 2.40.0

Tyre selectors show estimated fresh-set life in brackets, rounded up to whole
laps. Estimates update with the selected race length, circuit and surface; the
pit menu uses the active session. Boost, sliding and impacts can shorten that
life. Starting tyres are selected in session setup, the friends lobby or after
qualifying, rather than on the driver-name/livery screen. Existing keyboard
shortcuts remain available where tyre selection is shown.

Each driver has **two sets each of Soft, Medium and Hard per race**, including the
starting set. Selecting a compound or requesting/cancelling a pit stop does not
consume a set; fitting it does. Missed boxes do not consume a set. Exhausted
compounds are disabled and rejected by the authoritative server, including keyboard
selection. Wet and Intermediate are unlimited. Qualifying and Free Practice have
unlimited supplies; their use does not spend race stock. A new race resets stock.

All 42 circuits have explicit original arcade tyre-balance profiles in
`shared/tyre-circuits.mjs`: degradation, straight-line pace/drag, corner-versus-power
weight and compound grip gains. Soft, Medium and Hard have distinct speed trims;
weather mismatch, degradation and the existing wet-grip behaviour still apply.
These are game-balance parameters, not real Pirelli data or measured F1 top speeds.
The pre-race planner tracks all 27 slick-stock states, includes circuit pit loss,
and selects whole-lap stop points. Automatic starting tyres are included accurately;
Y can choose a recommended start. The live recommendation compares keeping the
current used set against stopping and future permitted stints, without reading
future dynamic-weather changes. The search samples at most 60 pre-race / 30 live
stop points; advice is an estimate rather than a guaranteed optimum.

Race standings now show a coloured current-compound badge for every driver.
**IN PIT** appears for pit-lane travel, service and exit; a requested stop alone
does not trigger it. The leader shows **Interval** and other drivers show the gap
to the driver immediately ahead, including when only part of the standings is
shown. Finished intervals use finish-time differences; running gaps retain the
existing distance/pace estimate. Results retain each finisher's total time.
Qualifying and practice continue to show best valid lap times.

Validation: syntax, undefined-name/shadow checks, module imports, both builds and
focused allocation/planner/display checks passed. Coverage includes all 42 circuit
profiles; 1/3/60/1000-lap planning in dry/wet conditions, stock enforcement and reset,
unlimited qualifying/practice/weather tyres, adjacent-driver and finished
intervals, pit-status states, and isolation of predicted inventory from server
state. A parked UI inspection checked the driver/setup/standings/pit displays.
The game test suite was not run or edited; no driving or online playtest is claimed.


## Minimum race distance — 2.40.1

Solo and multiplayer races now require at least **3 whole laps**. The lap counter
clamps its minus button at 3, typed values below 3 fail validation, room-setting
updates reject them, and session/room creation normalizes invalid counts to 3.
The strategy preview uses the same minimum. Free Practice remains unlimited.
Syntax, both builds and focused shared-validation checks passed; no game test
suite or driving playtest was run for this adjustment.


## Monza Royal Park, historic banking and mixed runoff — 2.41.0

Monza (`it-1922`) now replaces generic scenery with a dedicated park environment:
2,706 checked trees with near/far forest detail, shrubs and leaf litter; 28 mapped
stand envelopes and 24,219 predominantly red fans; a mapped/fitted pit building,
frontage podium, park hospitality, medical/control structures, original Italian
flags/boards, camping/parking, marshals, cranes and readable braking/corner signs.
No real sponsor logos, team artwork or official venue signage is copied.

All 11 turns have explicit paved/gravel/grass/kerb/barrier treatment. The FIA's
2.5m gravel strips at Rettifilo and Roggia are included, while broader trap widths
remain fitted approximations. Shared data feeds surface meshes, wet grip, existing
track-limit penalties, racing-line guide speed, scenery clearance and safety walls.
Original VELOCITA lettering and existing grid/pit/rubber dressing remain readable.

The mapped historic north/south banking has 240 non-driveable concrete patches,
weathered procedural artwork and rust-coloured rails. A fitted 16-step progressive
profile uses the official 6.2m rise reference; exact cross-section/supports are not
surveyed. 57 conflicting patches are omitted. The banking's own mapped curve is
its asset reference; every other road branch is reserved. All visible wall/bank/
bridge solids use the same geometry source as contact detection. One documented
footbridge has fitted clear piers and 8.60m minimum road clearance; its extended
64m span and height are approximate. Other underpass references are cached only.

**Unchanged:** exact 5.793km centreline, 17m game road width, original elevations,
pit route, car, tyre balance and multiplayer packet structure. The existing 17.86m
game relief agrees broadly with a fresh coarse SRTM 16m range; no new driving
banking/camber or engineered hills are introduced. Warm parkland dry light and
storm colours layer on existing damp/wet/dynamic whole-lap weather. Practice adds
Rettifilo, Lesmos and Parabolica approach starts.

**Checks:** syntax, undefined/shadow checks, imports and both builds passed.
2,913 complete reservations have zero blocked/overflowing model bounds; minimum
scenery clearance 2.49m, complete tree clearance 4.00m, bank-to-other-road clearance
2.14m. 3,490 runoff quads have zero other-road/pit/access/building overlaps. All
11,389 wall solids match renderer sources; 326 static pit-route car probes remain
clear with zero route deviation. Other 41 circuits retain static wall geometry.
Parked previews were inspected; the game test suite, driving and online playtests
were not run. Construction budget is 205 maximum active-LOD scenery mesh
submissions before culling/shadows, excluding road/cars/walls/runoff; no FPS
benchmark is claimed. A checked placement cache avoids the forest search
on normal startup.

Mapped stand shapes can shift up to 68m; the pit fits at ~27.53×220.40m, shifted
~41m along/across the generated corridor. Roofs, temporary seating, broad runoff
widths, species and event camps remain artistic. One hospitality reference, a
viewing terrace and a second camp are omitted for clearance. No extra user photos
were attached. See [the complete corner table, provenance, checks and accuracy
limits](docs/MONZA-ENVIRONMENT-2.41.0.md), [sources](TRACK-SOURCES.md) and
[data attribution](TRACK-DATA-LICENSE.md).


## Austin Hill Country, Turn 1 hill and tower — 2.42.0

COTA now has a dedicated environment: a mapped 76.5m observation tower with deck
and helical stairs, mapped concert stage, generic fan plaza, mapped/fitted pits
and seven grandstands, stadium crowds, hillside viewing, scattered Texas-style
scrub, dry grass, limestone/soil cuts, camps, parking and original readable signs.
No real sponsor, venue, team or tower signage is copied.

All 20 corners have a shared paved/gravel/grass/kerb/barrier plan, following the
hill profile and capped at other roads and the external pit lane. It drives
rendering, safety walls, scenery clearance, surface grip/drag, existing track
limits and guide speeds. LONE STAR lettering, rubber and braking marks are included.
The exact retained XY centreline/road width, pit XY route, car, physics engine,
tyre balance and multiplayer packet format remain unchanged. Original elevation
anchors are retained; a separate 129-sample USGS profile refines the hill with
30.990m relief. This agrees with F1's 30.9m description rather than forcing the
older conflicting 41m claim. A 441-point cached terrain grid shapes the surroundings.
The tower and concert venue are beside Turns 16–18; the back straight runs T11–T12.

Warm dry light, sparse clouds/haze/heat shimmer and storm mood layer on existing
weather, including dynamic whole-lap conditions. Practice adds Turn 1 climb,
Esses approach and Stadium section starts. Complete placements and actual model
bounds are checked against all road branches; the documented footbridge uses
shared solids with 8.966m minimum racing-road underside clearance. Data-driven anchors and
fitted dimensions/temporary seating are distinguished in the detailed notes.

Static/build verification and parked previews are recorded in the release
snapshot. The game test suite, driving and multiplayer playtests were not run.
No FPS claim is made. See [corner-by-corner surfaces, numeric checks, references
and uncertainty list](docs/COTA-ENVIRONMENT-2.42.0.md), [sources](TRACK-SOURCES.md)
and [attribution](TRACK-DATA-LICENSE.md).


## 2.43.0 — Imola parkland, hills and gravel

Dedicated Imola scenery replaces generic decoration: mapped pits/control tower,
main/park hillside stands, dense mature trees, Santerno, park paths/bridges/gate,
respectful original memorial areas, Italian flags, camps and terracotta town
buildings. All 19 turns have shared paving/gravel/grass/safety planning, original
readable dressing, slope/wet surface behaviour and four Free Practice approaches.
Cached EU-DEM refines the undulating profile (~33.985m relief); original anchors,
exact XY centreline, car and multiplayer protocol remain retained. The pit
corridor is corrected onto the mapped garage side.

Complete footprints reserve all racing/pit/access branches; visible safety and
collision share geometry. 18,257 spectators and 1,600 trees are instanced, with
226 maximum active scenery mesh submissions before culling/shadows. Both builds,
static clearance/runoff/elevation/parity checks and parked browser views are
reported; the game test suite and driving/multiplayer playtests were not run.
Current F1 bypasses the old Variante Bassa. Source-driven vs fitted details,
memorial set-back, limitations and references are in
[the Imola release note](docs/IMOLA-ENVIRONMENT-2.43.0.md).


## 2.46.0 — Montreal island, walls, pit timing and AI

Dedicated Montreal parkland, mapped basin/lagoons/river, fitted paddock and unsigned
pavilions, main/hairpin stands, skyline/dome silhouettes and complete track dressing.
All 14 corners have shared surface stacks; the mapped final-chicane wall carries
original **Respect the final turn** lettering. Walls, fences, canal rails and bridge
structures share rendering/collision geometry. Centreline and original elevations
are retained. Footprints, temporary stands, runoff widths, wall shifts and distant
skyline visibility include documented approximations.

Pit transit targets about **18s lost versus dry racing**, with service and penalties
extra; arcade limiter speeds/signs are fitted to each existing lane. Stationary pit
results now include served penalties (2.337 + 4 = **6.337s**) for everyone. AI uses
strategy-based starting/next tyres and can recover when stranded without gaining
progress, with lap invalidity and the normal recovery penalty.

Syntax/import/name checks, both builds, clearance/runoff/wall/elevation/corner audits
and parked browser dry/wet previews are recorded; the game test suite is neither
run nor edited. See [the runoff table, sources, limitations and release details](docs/MONTREAL-ENVIRONMENT-2.46.0.md).

## 2.45.2 — Variable pit service and shared stop times

Tyre changes use integer millisecond durations: 98% of stops take 2.000–3.000s,
1% take 1.800–1.999s and 1% take 3.001–5.000s. Each range is uniform. A per-car
server seed and stop count keep motion replay consistent with the selected time;
authoritative snapshots distribute the service result. Fractional-step release
preserves millisecond timing within the simulation tick. Strategy estimates use
the weighted mean service time (2.509s).

Every completed stop produces a queued announcement to everyone in the session.
The latest service time remains beside the driver in standings and results, with
a brief gold highlight. Penalty waiting time is excluded from this figure and
served before crew work. Mid-session joins show the latest receipt without
replaying earlier notifications. Drive-throughs produce no service receipt.

Verification: focused service/penalty/wire-format checks, syntax/name/import
checks and both production builds. The game test suite is neither run nor edited;
driving and multiplayer playtesting remain with the user.

## 2.45.1 — Lap deficits, penalty service and valid pit visits

Lapped drivers show +1L, +2L, etc. against the race leader in both the live standings
and results, even when the car directly ahead is only a few seconds away. Other
cars retain intervals to the driver ahead; the leader shows Interval.

Outstanding race time penalties are served stationary at the pit box before the
three-second tyre change. Served seconds are removed from the outstanding penalty
so the race finish does not add them twice. A drive-through or a missed box does
not serve the penalty. The HUD shows the penalty countdown before changing tyres.

Legal pit-road entry and pit stops no longer invalidate laps in race, qualifying
or practice. Existing invalidity from an earlier cut/recovery is retained, and
shortcuts outside the actual pit ribbon remain subject to track limits. The
qualifying clock, outlap and best-valid-lap rules remain in place.

Verification: focused standings/pit/penalty scenarios, syntax/import checks and both
production builds; the game test suite was neither run nor edited. Driving and
multiplayer playtesting remain with the user.

## 2.45.0 — Barcelona-Catalunya Mediterranean scenery and runoff

Dedicated modern no-final-chicane environment: mapped/fitted pits, sweeping main
stand, Rooftop/footbridge, lettered stands, Mediterranean vegetation and industrial
surroundings. All 14 corners have classified tarmac/gravel/grass/safety stacks;
T1 gravel continues beyond the clear motorcycle long-lap branch through split-quad
clipping. Original venue lettering, grid/pit/sector markings, officials, cameras,
service/drainage strips and wet mud/puddles complete the dressing.

Centreline, original anchors, pit XY route, car and multiplayer protocol are retained.
Local DEM refines the coarse height shape within the original range. Trap widths,
building/stand setbacks and bridges are fitted approximations. Syntax/import/static
geometry checks, both builds and parked dry/wet console views are documented;
the game test suite is neither run nor edited. See
[the corner table, references and verification scope](docs/BARCELONA-ENVIRONMENT-2.45.0.md).

## 2.44.0 — Hungaroring bowl, gravel, grass and dressing

Dedicated Hungaroring scenery replaces generic decoration: rebuilt-complex-inspired
pits/main stand, bowl viewing banks, dry fields, trees, camps, service bridge and
village silhouettes. Every one of the 14 corners has a shared kerb/edge/paving/
gravel/grass/barrier/beyond stack, with raked gravel, 4,000 stones, mowing bands,
marbles/skids/spillage, original readable markings, 22 grid positions, flags,
marshals, recovery/medical and utility dressing. Rain adds dark gravel/grass,
muddy service patches and shallow puddles. Three Free Practice approaches are added.

Original XY centreline, pit route and SRTM anchors remain. A smoothed DEM profile
fits published 34.7m relief. 18,394 spectators, 950 trees and 10,680 grass tufts
are instanced; 269 maximum active scenery mesh submissions before culling/shadows.
Both builds and requested static clearance/elevation/coverage checks pass; idle
browser views are inspected. The game test suite and driving/multiplayer playtests
were not run. Broad gravel extents, rebuilt building/stand setbacks, bridge scale
and local gradients remain approximate. Full target/fitted table, verification
limits and references: [Hungaroring release note](docs/HUNGARORING-ENVIRONMENT-2.44.0.md).


## 2.47.0 — Yas Marina twilight, marina and landmark placement

Dedicated post-2021 Yas Island scenery replaces the generic environment: mapped hotel wings with a glowing grid shell and high track-spanning link, marina shoreline, 65 instanced yachts, unsigned landmark buildings, palms, grandstands and original track dressing. Full-lap shared runoff adds painted turquoise tarmac, irrigated grass and sandy margins. Concrete, covered impact protection, fencing, marina rails and structural supports use the same solids for rendering and contact.

A session-clock sunset fades to night, with a local fixed-night option also available in the pause menu. Permanent whole-circuit illumination uses two added fixed directional lights, emissive mast heads, a world-space field and throttled marina reflections. No per-pole lights or camera-triggered lighting. Free Practice adds hairpin, marina and hotel starts. The existing centreline, elevations, car, core equations, pit geometry/timing and multiplayer messages remain intact; surface adapters consume the new runoff plan. The covered pit approach is approximate and does **not** recreate the real under-T1 tunnel.

Also corrects unnecessary landmark displacement in Montreal (Biosphere/amusement park) and Silverstone (clubhouse), using nearest-safe-position searches. Eleven existing cached planners were measured and eleven older dedicated environment placement implementations were reviewed for the same fallback issue; this was not an on-track visibility survey of every circuit.

Requested static checks, builds and a parked browser inspection are recorded in [the release details, runoff table, sources and limitations](docs/YASMARINA-ENVIRONMENT-2.47.0.md). The game test suite was neither run nor edited. Driving and multiplayer playtesting remain manual.

## 2.48.0 — Lusail night race environment

Lusail has a dedicated floodlit desert setting with a fitted pit and paddock,
grandstands, three pedestrian bridges, a desert fan zone, service roads, and
original maroon-and-white signage. A single runoff plan draws and classifies
the paved, painted, gravel, and sand surfaces, with barriers shared between
the renderer and collision system. There are three new Free Practice starts:
Turn 1 approach, Fast sweepers, and Final corner. Full floodlight effects can
be switched off in setup or while paused; the track stays lit at night.

The circuit centreline, existing elevations, pit route and timing, car model,
and multiplayer protocol are unchanged. The FIA documents the corner sequence
and selected gravel and kerb treatments; venue geometry is fitted to the game
and many widths, roof profiles and light positions are approximate.
[See the corner table, sources, and verification results](docs/LUSAIL-ENVIRONMENT-2.48.0.md).
The game test suite was neither run nor edited.

## 2.49.0 — Marina Bay night-race refresh

The Singapore refresh keeps the mapped bay, Flyer and city landmarks and adds
the lotus museum, Padang clubhouse, memorials, fitted bridges and eleven
grandstand areas. The post-2023, 19-turn game route supplies the geometry for
the new shared wall, kerb and runoff plan. Pit markings, surface repairs and
street furniture follow the existing road height. The new night switch keeps
a lit circuit with fewer effects when disabled.

FIA and promoter references establish the layout, documented markings and
viewing areas. OSM supplies permanent footprints and road branches. Temporary
walls, stands and light positions use fitted dimensions. See the
[Singapore audit, corner table and verification](docs/SINGAPORE-REFRESH-2.49.0.md)
for clearance, collision, pit and parked-browser results.

## 2.49.1 — Singapore runoff paint and Yas Marina sunset

Singapore's corner aprons now use blue, white and gold paint, red-and-white
kerbs and original ground lettering. The widest first-corner sections fit
up to about 14 m beyond the white line. Additional complexes carry the same
palette. The opening sector also gains the fitted Sheares viaduct and more
frequent wall boards. The referenced photo supplies the styling. Deck height
and temporary apron dimensions are fitted to the game.

At Yas Marina the visible sky, sun and floodlight gain now fade continuously.
A single baked reflection probe stays in place through the transition, and
the moving sunset shadow pass has been removed for this venue. A parked
browser preview checked the scene through the transition to full night.

## 2.49.2 — Singapore Turn 1 dressing on both sides

The supplied Turn 1 photo guided the gold approach stripe, layered blue,
white and gold outside apron, and tapered blue inside wedge with a gold
geometric emblem. The inside wedge has red-and-white kerbs and an unpainted
escape strip behind it. Both sides now have illuminated race screens and
blue wall boards. The infield gains a second spectator stand, and a red
Marina Bay gantry faces the approach beneath the Sheares viaduct sightline.

The paint and temporary fixtures are fitted approximations using the existing
racing and pit geometry and the cached mapped road branches. The outer apron
reaches about 13.9 m from the white line and the blue inner wedge reaches
about 7.6 m across. The two screens, stands and gantry supports clear mapped
road footprints by at least 1.53 m. The overhead board has 8.20 m clearance.
Syntax, module imports, lint, both builds, wall geometry, runoff overlaps
and pit entry/exit checks passed. Parked dry and wet previews rendered both
sides without browser console warnings or errors.

## 2.50.0 — Buddh International Circuit and Singapore runoff lettering

Buddh now has a dedicated Indian GP environment on its retained 16-turn
clockwise route. The right-side pit complex, main grandstand canopy, fan
zones, hazy farmland and skyline frame a shared runoff and barrier plan.
The FIA’s 14 m T1–T3 climb is fitted over the retained elevation anchors.
The runoff includes original Greater Noida lettering, kerbs, tarmac, gravel
and grass. Three venue-specific Free Practice starts are available.

Singapore now reads “SINGAPORE” on both blue aprons at Turn 1. The lettering
follows the existing paint boundaries on each side.

Both builds, static clearance, shared barrier geometry, terrain and pit
checks passed. Parked dry and wet views and the practice menu loaded with a
clean browser console. Dimensions for temporary safety furniture and
secondary stands are fitted estimates. [Audit, corner table and verification](docs/BUDDH-ENVIRONMENT-2.50.0.md).

## 2.51.0 — Sepang International Circuit

Sepang now has a dedicated Malaysian GP environment. A double-front tensile
grandstand overlooks both straights, with a petal canopy at the final hairpin.
The pit building and external lane sit on the FIA-mapped side of the straight.
Plantation rows, laterite verges, drainage, fan plazas and original `MALAYSIA`
and `SELANGOR` runoff lettering replace the generic scenery. All 15 corners
have a surface and barrier schedule. The tropical weather adds storm clouds,
standing water, heavier rain and spray, and vapour as the track clears.

The existing centreline, elevation anchors, car model and multiplayer protocol
remain in place. The mapped building and road footprints and sampled terrain
are source-driven. Kerb profiles, safety setbacks, secondary grandstands and
canopy details are fitted approximations. Free Practice adds three out-lap
starts near the opening hairpin, back straight and final hairpin.

Both builds, source checks, shared barrier geometry, pit entry and exit,
runoff clearance and parked browser rendering were checked. The
[Sepang audit](docs/SEPANG-ENVIRONMENT-2.51.0.md) records the corner table,
measured clearances, weather checks and reference limitations.

## 2.51.1 — Sepang canopy and grandstand roofs

Photo references guide a shallower final-hairpin canopy with a continuous
scalloped edge, pale fabric, dark radial steelwork and a stepped circular
tower. The covered grandstands use the same fabric and steel treatment in
repeated bays. The existing reserved footprints still protect the racing
ribbon, pit lane and mapped service roads.

## 2.52.0 — Buddh runoff and Greater Noida dressing

Buddh now has dusty runoff verges that darken and lose grip in the wet,
fitted braking and tyre-marble decals, mapped boundary fencing and
drainage, and cosmetic traffic on the Yamuna Expressway. Jali-style pit
detailing, local planting, fan bunting, and kiln and water-tank silhouettes
round out the scenery. The existing clockwise F1 centreline, elevation
profile, external pit lane and three Free Practice starts are preserved.

The [Buddh environment audit](docs/BUDDH-ENVIRONMENT-2.50.0.md) includes the
16-corner runoff table, FIA and OSM references, fitted details and measured
clearances. Both builds, placement and collision probes, pit entry and exit,
whole-lap weather, and parked browser views passed the targeted checks.
