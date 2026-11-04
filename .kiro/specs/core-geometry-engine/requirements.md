# Requirements — Core geometry engine

## Introduction

The geometry engine computes the consequences of a door change on simplified room geometry. It
is pure TypeScript (`src/domain/`), independently testable without a browser, and is the only
source of geometric statuses in PLANRIFT. Mathematical contract:
#[[file:docs/geometry/GEOMETRY_CONTRACT.md]]

## Requirement 1 — Canonical scene

**User story:** As a designer, I want one canonical description of the rooms so every view and
calculation agrees.

1. THE System SHALL store all coordinates and dimensions as safe integers in millimetres.
2. WHEN a scene is imported or loaded, THE System SHALL validate it against the strict schema and
   reject unknown keys, non-integer or non-finite numbers, out-of-range values, duplicate IDs and
   dangling references.
3. THE System SHALL represent rooms as axis-aligned rectangles with one explicit wall record per
   side, doors hosted on walls, furniture with typed footprints, documents and dependency links.
4. THE System SHALL represent unsupported concepts (non-rectangular or rotated footprints,
   non-90° swings, exterior swings, non-hinged operations) so they can be reported.

## Requirement 2 — Door sweep and clearance

**User story:** As a designer, I want to know whether a door's opening sweep hits furniture and
by how much.

1. THE System SHALL model a supported door's sweep as the quarter disk swept by the leaf from 0°
   to 90° in the door's local frame.
2. THE System SHALL compute the signed separation between the sweep and each furniture footprint
   in the same room (distance when disjoint, minus penetration depth when overlapping).
3. THE System SHALL classify each pair as CONFLICT (s < −τ), CONTACT_REVIEW (|s| ≤ τ),
   NEAR_CLEARANCE (τ < s < T) or PASS (s ≥ T) using exact integer arithmetic, where τ is the
   contact tolerance and T the advisory threshold.
4. WHEN a pair conflicts, THE System SHALL report the first-strike opening angle, the strike
   point, the intrusion depth and the overlap area.
5. THE System SHALL report the door's maximum reachable opening angle.

## Requirement 3 — Invalid and unsupported configurations

1. IF a hinge lies outside its wall, the leaf extends beyond the wall, the leaf is longer than
   the room is deep from that wall, or two openings overlap, THEN THE System SHALL mark the door
   INVALID with a measured explanation and SHALL NOT evaluate its pairs.
2. IF furniture extends outside its room or has a degenerate footprint, THEN THE System SHALL mark
   it INVALID.
3. IF a door or footprint is outside the supported model, THEN THE System SHALL report
   UNSUPPORTED for the affected pairs and SHALL NOT report PASS.

## Requirement 4 — Determinism and isolation

1. THE System SHALL produce identical analysis for structurally identical scenes.
2. WHEN only elements in one room change, THE System SHALL leave every result in other rooms
   unchanged.
3. THE System SHALL produce identical results when a room is rotated, mirrored or translated as a
   whole.

## Requirement 5 — Hinge position map

1. WHEN a door is selected, THE System SHALL compute its status at every integer hinge offset on
   its wall using the same validity and classification rules as the scene analysis.
