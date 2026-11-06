// Outside-edge target table. All values are capped by the shared planner.
// Turn | kerb | paved/gravel/grass m | gravel depth m | barrier @ target edge-distance m | evidence
// T1 | red-white | 12 / 18 / 6 | 0.08 | covered @ 36 | FIA numbering and mapped curve; surface areas/dimensions approximate
// T2 | red-white | 3 / 20 / 7 | 0.08 | covered @ 30 | FIA numbering and mapped curve; surface areas/dimensions approximate
// T3 | red-white | 2 / 10 / 7 | 0.08 | covered @ 19 | FIA numbering and mapped curve; surface areas/dimensions approximate
// T4 | red-white | 2 / 24 / 8 | 0.08 | covered @ 34 | FIA numbering and mapped curve; surface areas/dimensions approximate
// T5 | red-white | 1.5 / 20 / 5 | 0.08 | covered @ 26.5 | FIA 2025 confirms exit gravel (width not specified)
// T6 | raised-serrated | 3 / 8 / 4 | 0.08 | covered @ 15 | FIA numbering and mapped curve; surface areas/dimensions approximate
// T7 | raised-serrated | 2 / 12 / 5 | 0.08 | covered @ 19 | FIA 2025 confirms blue exit line; broad widths fitted
// T8 | red-white | 2 / 12 / 6 | 0.08 | covered @ 20 | FIA numbering and mapped curve; surface areas/dimensions approximate
// T9 | red-white | 2 / 12 / 6 | 0.08 | covered @ 20 | FIA numbering and mapped curve; surface areas/dimensions approximate
// T10 | red-white | 1.6 / 0 / 12 | 0 | armco @ 13.6 | FIA numbering and mapped curve; surface areas/dimensions approximate
// T11 | red-white | 3 / 24 / 7 | 0.08 | covered @ 34 | FIA numbering and mapped curve; surface areas/dimensions approximate
// T12 | red-white | 5 / 18 / 6 | 0.08 | covered @ 29 | FIA numbering and mapped curve; surface areas/dimensions approximate
// T13 | red-white | 3 / 12 / 6 | 0.08 | covered @ 21 | FIA numbering and mapped curve; surface areas/dimensions approximate
// T14 | red-white | 5 / 0 / 4 | 0 | concrete @ 9 | FIA 2025 confirms LHS concrete/fence to bridge; distance fitted
// Canonical runtime table is shared by server/renderer, avoiding divergent collision data.
export {HUNGARORING_CORNERS,HUNGARORING_EDGES} from '/shared/hungaroring-runoff-data.mjs';
