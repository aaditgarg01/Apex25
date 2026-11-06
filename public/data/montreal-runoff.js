export {MONTREAL_CORNERS,MONTREAL_EDGES} from '/shared/montreal-runoff-data.mjs';
// Full-lap defaults apply to both edges, then corner-specific outside stacks.
// Gravel is deliberately zero on the race edge: current traps not verified. OSM service gravel is rendered separately.

/*
| Turn | Kerb | Target tarmac / gravel / grass (m) | Target barrier; distance from road edge | Fitted stack at apex (m) | Evidence |
|---|---|---|---|---|---|
| 1 | serrated | 14 / 0 / 3 | covered; 17 m | 7.66 / 0.00 / 1.64 | FIA turn identity; widths fitted |
| 2 | red-white | 5 / 0 / 6 | covered; 11 m | 0.74 / 0.00 / 0.88 | FIA turn identity; widths fitted |
| 3 | serrated | 8 / 0 / 1 | covered; 9 m | 1.24 / 0.00 / 0.16 | FIA turn identity; widths fitted |
| 4 | red-white | 1.8 / 0 / 0 | concrete; 1.8 m | 1.80 / 0.00 / 0.00 | FIA turn identity; widths fitted |
| 5 | flat | 1.5 / 0 / 1 | concrete; 2.5 m | 1.50 / 0.00 / 1.00 | FIA turn identity; widths fitted |
| 6 | serrated | 10 / 0 / 2 | covered; 12 m | 1.73 / 0.00 / 0.35 | FIA turn identity; widths fitted |
| 7 | red-white | 2 / 0 / 3 | concrete; 5 m | 2.00 / 0.00 / 3.00 | FIA turn identity; widths fitted |
| 8 | serrated | 12 / 0 / 1 | covered; 13 m | 12.00 / 0.00 / 1.00 | FIA turn identity; widths fitted |
| 9 | red-white | 1.8 / 0 / 0 | concrete; 1.8 m | 1.40 / 0.00 / 0.00 | FIA turn identity; widths fitted |
| 10 | red-white | 14 / 0 / 2 | covered; 16 m | 14.00 / 0.00 / 2.00 | FIA turn identity; widths fitted |
| 11 | flat | 2 / 0 / 2 | concrete; 4 m | 1.84 / 0.00 / 1.84 | FIA turn identity; widths fitted |
| 12 | flat | 1.5 / 0 / 1 | concrete; 2.5 m | 1.21 / 0.00 / 0.81 | FIA turn identity; widths fitted |
| 13 | serrated | 12 / 0 / 0 | covered; 12 m | 1.40 / 0.00 / 0.00 | FIA turn identity; widths fitted |
| 14 | red-white | 1.5 / 0 / 0 | concrete; 1.5 m | 1.40 / 0.00 / 0.00 | FIA turn identity; widths fitted |
All widths are fitted game targets; not surveyed. Final-wall polyline comes from OSM way 166808419.
*/
