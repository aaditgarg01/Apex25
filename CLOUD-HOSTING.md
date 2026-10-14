# APEX 25 cloud hosting

This package contains the latest Google Drive game and deployment configurations. It is deployed at https://apex-25-production.up.railway.app.

Railway project: 218fbc1c-71cf-4281-9cc5-7d7eb3fc2676
Service: d84f064a-e4ba-4ce4-bee6-980e79434500
Public domain routes to port 8080, assigned by Railway.

The cloud package uses patched ws 8.22.0. All 15 physics tests and six network tests passed; the network tests also passed against the public Railway URL. Hosting initially uses the account’s $5 / 30-day trial, checked 9 October 2026. No paid plan was purchased.

Future edits in Google Drive do not automatically publish. Copy them into this cloud package, keep the patched dependency, and deploy with `npx @railway/cli up --project 218fbc1c-71cf-4281-9cc5-7d7eb3fc2676 --service d84f064a-e4ba-4ce4-bee6-980e79434500`.

Deploy the whole Node application as one web service. The same HTTPS address serves the game and secure WebSocket multiplayer. Use one instance: rooms are held in process memory. Restarting or redeploying clears active rooms.

## Render

Connect a Git repository containing this package and create a Blueprint using render.yaml, or create a Node web service with build command `npm ci --omit=dev && npm run build`, start command `node server.mjs`, and health check `/health`. Explicitly choose the free plan. Render provides the port and public HTTPS URL. No local tunnel is needed.

The free plan sleeps after inactivity and wakes when visited. For an always-running service, choose a paid plan only after approving its current price.

## Railway or another container host

The Dockerfile packages the game server and assets. Railway reads railway.json; generate a public domain once deployment is healthy. Check the account plan and cost before deploying. The host supplies PORT; HOST must remain 0.0.0.0.

## Verification

Run `npm ci`, `npm run build`, then `node --test test/physics.test.mjs`. After deployment, run `TEST_URL=https://your-host node --test test/network.test.mjs`. Also create a room in one browser and join its invite link in another.

The server requires no Google Drive login, local Mac, database, API keys, or Cloudflare tunnel. A hosting account is required to deploy. Keep account credentials out of this package.

## Multiplayer latency update

The live service now runs as one replica in Railway Singapore (`asia-southeast1-eqsg3a`). Keep one replica because rooms are stored in process memory. The latest deployment is `cd292de0-a553-459c-92d8-964da23ca562`.

The client now predicts the local car for immediate presentation and interpolates opponents between snapshots. The server remains authoritative for progress, lap times, penalties, and classification. Prediction stops on stale connections and snaps to confirmed recoveries. Server snapshots are serialized once per room, rounded to millimetre/millisecond precision, and dropped on backed-up connections. Catch-up ticks publish only the newest state.

Validation: 15 physics tests, 5 network-motion tests, and 6 multiplayer tests passed. All 6 multiplayer tests also passed on the live deployment. Browser checks started an eight-car online race without console errors. A seven-ping network sample measured median 88 ms / maximum 112 ms, compared with an earlier median 919 ms / maximum 2919 ms sample. These samples are connection-specific, not a guaranteed latency. A controlled eight-car snapshot was 17% smaller.

Preserve `shared/netcode.mjs` and its integration in `public/app.js` and `server.mjs` when merging later changes from the Google Drive copy.


## Multiplayer correction update — 11 October 2026 (2.2.1)

Replaced RTT-based local extrapolation with fixed 60 Hz input commands and server acknowledgments. Clients replay only commands the server has not simulated. Commands are batched at up to 30 messages/second; server simulation is limited by elapsed server time. Recovery and disconnect braking invalidate older command generations. Original clients remain compatible, but everyone should refresh to use the improved movement. Online car models no longer add a second layer of movement smoothing.

Verification: 32 tests passed locally, including two real WebSocket clients, recovery, qualifying, all 41 circuits, and deterministic bidirectional delay tests. In the isolated driving scenario, maximum reconciliation corrections were 0.004 m at 100 ms RTT, 0.013 m at 300 ms RTT plus jitter, and 0.035 m at 500 ms RTT with jitter and a 500 ms traffic stall. This is a controlled simulation result, not a guarantee for every connection or contact with other cars.

Deployment 7df8315d-04ac-4015-9627-1a4e09cd234c is live. Public /health reports version 2.2.1. All 7 network integration checks also passed against Railway; browser room creation, race start, and input smoke checks passed with no browser errors. Screenshot: ../apex-25-input-replay-live.png.


## Solid race cars — 11 October 2026 (2.2.2)

Cars now use a rotated, full-length footprint including the wings and tyres. Rear-end, side and angled contact separates the bodies and removes closing speed. Collision checks also run between batched online input steps to prevent fast cars passing through each other. Local prediction shares the collision handling, and nearby cars are shown at the player's predicted time. Correction smoothing cannot render overlapping bodies. Qualifying remains ghosted; practice is solid and uses separated spawn positions. Cars at different bridge elevations remain independent.

All 39 checks passed locally, including a three-client race where the trailing player reaches and slows against the stationary driver, and the prior delayed-input regression tests.

Deployment f11abda5-c7b6-418a-85b1-908f7b37bf70 succeeded; public health reports 2.2.2. All 8 network checks passed against Railway, including the three-player rear-end collision test.

## Multiplayer and scenery — 13 October 2026 (2.4.0)

Traffic prediction now uses curved opponent motion and the shared drafting force.
Jitter-buffer timestamps follow simulation time, and bursts of old snapshots are
coalesced before reconciliation. Static scenery uses spatial batching, with lighter
car shadows/details and automatic resolution reduction on sustained slow frames.
Every circuit has a stylized named landmark and regional landscape clusters.
See VALIDATION.md for measured results and remaining latency limits.

Deployment `2b43d12b-158b-4590-9065-2722d55843ae` serves version 2.4.0 at
https://apex-25-production.up.railway.app. All nine multiplayer integration checks
passed on the live service. The deployed client, physics and new scenery modules
match the tested local files. Temporary inspection pages are excluded from hosting.


## Sector colours — 2.4.1

Purple sectors compare valid sector times across the whole session, including AI and
retired drivers, rather than only the viewed driver's personal best. Current valid
sectors participate before lap completion; comparisons use displayed milliseconds.
Green marks a personal best when another driver holds a faster sector. Invalid lap
and out-lap sectors do not establish purple records. Tests omitted at user request.
Deployment: `3b1e0b89-6b04-48c2-8659-d655b58a5982`.


## Conditions — 2.5.0

Added Normal / dry, Intermediate / damp and Wet / rain presets for all session modes.
The server normalizes the host's choice, includes it in lobby and session state, and
preserves it through qualifying, restarts and rematches. Physics and client replay
share traction, braking, cornering grip and sideways-slip calculations. Opponent
motion and collision impulses account for travel direction during sliding.

Rain and tyre spray each use one small rendering batch; road materials, lighting,
visibility, AI braking/pace and guide colours adapt to conditions. No gameplay
tests or browser test sessions were run, per the user's instruction.


## Display, guide, weather and multiplayer — 2.6.0

Compact/default HUD with optional H/Details expansion; cached map backgrounds and
nearby-driver rows reduce UI work. A computed road-bounded racing path replaces the
centre line, with curvature-based speed planning and approach-speed colours. AI uses
the same path/condition speed profiles. Rain is world anchored with wind; soft wheel
spray uses pooled particles. No additional rain/spray drawing batches are required.

Input-stream credit estimates per-car input lag for client time alignment. Snapshot
publication changes from 20 Hz to 30 Hz. New clients request stateVersion 2, permitting
unchanged lap histories to be omitted, with complete event/periodic refreshes; old
clients retain full snapshots. Remote interpolation time is monotonic and small
correction errors use a dead zone. Contacts use a spatial broad phase, early exit,
angle-dependent effective mass and capped positional correction. Final rendered
separation never applies another velocity impulse. Qualifying remains ghosted.

No automated game tests or browser gameplay checks were run, per user preference.


## Finish handling and display fixes — 2.6.2

Finish state now removes cars from rendering, minimap, contacts, drafting, and
spectator targets while preserving timing/classification data. Retirement rejects
finished drivers in both shared logic and the UI. Finish badges appear next to race
finishers; unfinished followers display RACING after a leader finishes, and completed
gaps use recorded finish times. Provisional results update as the field completes.
The guide legend and status/speed card use layout flow to avoid overlap. No gameplay
tests or browser test sessions were run, following the user's preference.


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
