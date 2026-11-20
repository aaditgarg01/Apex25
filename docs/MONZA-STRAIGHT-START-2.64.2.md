# Monza straight-start alignment — 2.64.2

The reported keyboard car leaving Monza's straight was reproduced without networking, opponents or steering input. Grid cars faced local tangents of the smoothed centreline. Those tangents vary slightly across the grid and do not point down the long straight. A car could therefore drive diagonally across the ribbon while its heading and steering remained constant. The first front-left baseline run went off track after approximately 8.48 seconds, around station 329 m.

`spawnPose` now fits the existing Monza pit-straight axis from cached road samples between stations -80 m and 480 m. It uses that orientation for grid cars, grid paint, start/finish practice and qualifying starts, qualifying joiners and recovery within that straight section. Position, elevation and banking still come from the existing road sample. It does not steer the moving car, add an assist or change the centreline. Other circuits and Monza spawns outside this straight section retain their existing poses.

## Verification

- A standalone actual-Monza diagnostic reproduced off-track behaviour in all 16 original dry grid runs (eight slots, with/without boost).
- All 48 corrected runs passed: eight slots × dry/damp/wet × with/without boost, from the grid to station 480 m before Turn 1. Steering remained zero. Maximum car-centre lateral distance was 6.010 m on the 17 m road, keeping the model's 1.24 m half-width within the racing ribbon. No car went off track or stopped against the straight-side wall.
- Race, qualifying, practice, joining qualifying, and four recovery starts use the same corrected orientation. The 328 grid poses on the other 41 circuits are unchanged. A hash of Monza's road samples is unchanged.
- Two actual local WebSocket clients, without AI cars, accelerated with zero steering and braked before Turn 1. Neither server car went off track and both rendered cars remained inside the ribbon; approximately 19.96 updates/second, no reconnection. These clients ran on one machine.
- Syntax, undefined-name/shadow and module-import checks; both build commands. Separate pit-stop and contact diagnostics remain applicable and are rerun for this release.

The standalone scripts do not run or modify the game's test suite. This is a straight-start fix, not an autopilot: the driver still has to brake and steer through Turn 1 and the rest of the lap. A two-device race under the user's exact connection remains unmeasured.

Reports: `docs/benchmarks/monza-start-2.64.2.json`, `monza-local-2.64.2.json`, plus pit/contact regression reports. Production verification is recorded separately after deployment.
