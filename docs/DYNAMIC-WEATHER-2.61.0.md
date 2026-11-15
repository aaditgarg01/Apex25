# Dynamic weather 2.61.0

The game uses sparse weather fronts to protect tyre planning. This is a historical-data-informed arcade model. It does not replay an exact race or claim to forecast local weather.

## Race rules

- Under 15 laps: fixed from lights out to the flag, including a wet or damp start.
- 15–29 laps: at most one condition change.
- 30+ laps: at most two changes.
- Each change is separated by the circuit minimum below (10–20 whole leader laps).
- Dry → damp → wet, or wet → damp → dry: no immediate dry/heavy-wet flip.
- A boundary makes change possible, not mandatory. Dry races can stay dry.
- The two sets per dry compound rule stays in place; intermediates and wets remain unlimited.
- Weather is shared and saved with the room. Reconnects and late joins do not reroll it.
- Starting weather is selected before the session. A weekend race inherits the surface present at the end of qualifying; the pre-race tyre panel states that actual surface.

## Evidence and tuning

[OpenF1 documentation](https://openf1.org/docs/) provides historical Race sessions, rainfall flags and tyre stints. The cache covers 70 non-cancelled races in the completed 2023–2025 seasons at 24 venues. The cancelled 2023 Imola event is excluded. Rainfall is binary and is not rainfall intensity; a brief shower need not justify wet tyres. At least 35% of active drivers on intermediates/wets defines a wet-tyre regime. Runs shorter than three laps do not set minimum persistence, but still count as a wet-tyre race.

The sampled fraction of wet-tyre races is not a climatological rain probability. The game uses a dry-prior shrinkage weight `(wetTyreRaces + 0.1) / (raceCount + 2)`, converted to a per-lap chance using the median sampled race distance. Onset checks begin only after the stable period. Rain-clearing and intensity changes are fitted game parameters. Minimum stable laps are 65% of the median persistent wet-tyre phase, clamped to 10–20 laps; if none exists, a quarter of the reference race distance is used. These are deliberately conservative tuning choices.

The eight report-based profiles establish plausible types of weather, not numerical historical frequencies. The ten fallback profiles have no comparable verified weather series in this cache; their numbers are game estimates. Source links and uncertainty notes are stored with each profile. No past-season source is treated as proof of current live weather.

## Per-circuit coverage

| Circuit | Evidence | Sampled races / wet-tyre races | Minimum stable laps |
|---|---|---:|---:|
| Melbourne | recorded-2023-2025 | 3 / 1 | 15 |
| Shanghai | recorded-2023-2025 | 2 / 0 | 14 |
| Suzuka | recorded-2023-2025 | 3 / 0 | 13 |
| Sakhir | recorded-2023-2025 | 3 / 0 | 14 |
| Jeddah | recorded-2023-2025 | 3 / 0 | 13 |
| Miami | recorded-2023-2025 | 3 / 0 | 14 |
| Imola | recorded-2023-2025 | 2 / 0 | 16 |
| Monte Carlo | recorded-2023-2025 | 3 / 1 | 17 |
| Barcelona | recorded-2023-2025 | 3 / 0 | 17 |
| Montréal | recorded-2023-2025 | 3 / 1 | 20 |
| Spielberg | recorded-2023-2025 | 3 / 0 | 18 |
| Silverstone | recorded-2023-2025 | 3 / 2 | 18 |
| Spa-Francorchamps | recorded-2023-2025 | 3 / 1 | 11 |
| Budapest | recorded-2023-2025 | 3 / 0 | 18 |
| Zandvoort | recorded-2023-2025 | 3 / 1 | 10 |
| Monza | recorded-2023-2025 | 3 / 0 | 13 |
| Baku | recorded-2023-2025 | 3 / 0 | 13 |
| Marina Bay | recorded-2023-2025 | 3 / 0 | 16 |
| Austin | recorded-2023-2025 | 3 / 0 | 14 |
| Mexico City | recorded-2023-2025 | 3 / 0 | 18 |
| São Paulo | recorded-2023-2025 | 3 / 1 | 20 |
| Las Vegas | recorded-2023-2025 | 3 / 0 | 13 |
| Lusail | recorded-2023-2025 | 3 / 0 | 14 |
| Yas Marina | recorded-2023-2025 | 3 / 0 | 15 |
| Paul Ricard | historic-report | — | 18 |
| Hockenheim | historic-report | — | 14 |
| Sochi | historic-report | — | 18 |
| Nürburgring GP | conservative-fallback | — | 16 |
| Portimão | historic-report | — | 18 |
| Mugello | historic-report | — | 18 |
| Sepang | historic-report | — | 14 |
| Istanbul Park | historic-report | — | 20 |
| Magny-Cours | conservative-fallback | — | 16 |
| Estoril | historic-report | — | 20 |
| Jacarepaguá (historic) | conservative-fallback | — | 16 |
| Madrid | conservative-fallback | — | 18 |
| Indianapolis · F1 2000–2007 | conservative-fallback | — | 16 |
| Buenos Aires · F1 1995–1998 | conservative-fallback | — | 16 |
| Kyalami | conservative-fallback | — | 16 |
| Watkins Glen | conservative-fallback | — | 16 |
| Buddh · Indian GP | conservative-fallback | — | 16 |
| VIT Vellore · Campus Circuit | conservative-fallback | — | 18 |

## Reproduce the cache

Run `node scripts/update-weather-history.mjs [cache-directory]` outside the game. It reads cached API responses when present, otherwise fetches rate-limited batches from OpenF1. It does not run during installation, builds or gameplay. The JSON retains all source session keys, sample counts and derived per-race phases. See TRACK-DATA-LICENSE.md for attribution and data licensing.

## Verification

Focused temporary checks covered 252 short-race configurations and 168 change-boundary configurations across all 42 circuits; serialised/restored scheduling equality; setup validation; starting tyres; qualifying handover; late joining; and unchanged stock limits. A two-client local socket check and browser UI inspection covered host-edited starting weather, matching tyres, and the frozen-weather label. Both builds and syntax/import checks are required before release. No repository tests were run or changed. Full driving-distance testing is left to the user.
