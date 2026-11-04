# PLANRIFT Geometry Contract

Status: Draft v1 (written before implementation; the engine must satisfy this document).

This contract defines the supported geometry, the door-sweep solver, the status model, tolerances,
and the independent verification methods. The engine lives in `src/domain/` and must not import
React, Three.js, or browser APIs.

## 1. Units and coordinates

- Canonical unit: integer millimetres. Every stored coordinate, dimension, tolerance and threshold
  is a safe integer. Non-integers, `NaN` and `Infinity` are rejected at the schema boundary.
- Each room has a local frame. Origin is the room's south-west interior corner. +X points east,
  +Y points north (into the room from the south wall). Room interior is `[0, W] x [0, D]`.
- A room is placed in the shared plan by `originMm` (global offset of its local origin). Analysis
  always runs in room-local coordinates, so a room's results cannot depend on where it is placed.
- Display conversions (mm to m, rounding to 0.1 mm) happen only in presentation code.
- Coordinate bound: |value| <= 100 000 mm. Squared sums stay below 2^53, so integer arithmetic on
  squares is exact in IEEE-754 doubles.

## 2. Walls

Walls are explicit records `{ id, side, thicknessMm }` on an axis-aligned rectangular room. The
segment of each wall is derived from the room rectangle (single source of truth), oriented
counter-clockwise so the interior is on the left:

| Side  | Start    | End      | Direction t | Interior normal n |
|-------|----------|----------|-------------|-------------------|
| south | (0, 0)   | (W, 0)   | (1, 0)      | (0, 1)            |
| east  | (W, 0)   | (W, D)   | (0, 1)      | (-1, 0)           |
| north | (W, D)   | (0, D)   | (-1, 0)     | (0, -1)           |
| west  | (0, D)   | (0, 0)   | (0, -1)     | (1, 0)            |

## 3. Doors

A door is `{ wallId, hingeOffsetMm, leafWidthMm, operation, swingDeg, swingSide, leafDirection }`.

- Hinge point `H = start + hingeOffsetMm * t`.
- `leafDirection = toward-end`: the closed leaf lies along +t. `toward-start`: along -t.
- Supported: `operation = hinged-single`, `swingDeg = 90`, `swingSide = interior`.
  Anything else is `UNSUPPORTED` (never `PASS`).

### Door-local frame

Unit axes: `u = +t` (toward-end) or `-t` (toward-start), `v = n`. Both have integer components,
so the map `local(p) = ((p - H) . u, (p - H) . v)` is exact on integers. It is a rotation
(toward-end) or a reflection (toward-start). Axis-aligned rectangles map to axis-aligned
rectangles.

In this frame the swept region of a 90-degree interior swing with leaf length R is the quarter disk

    Q = { (u, v) : u >= 0, v >= 0, u^2 + v^2 <= R^2 }

Q is exactly the union of all leaf positions for opening angles 0..90 degrees. It is convex.

### Door validity (INVALID)

- Hinge outside the wall: `hingeOffsetMm < 0` or `> wallLength`.
- Leaf outside the wall: toward-end requires `offset + R <= wallLength`; toward-start requires
  `offset - R >= 0`.
- Sweep outside the room: `R` greater than the room dimension perpendicular to the wall.
- Overlapping openings on the same wall.

Flagship invalid case: hinge 5400 mm, leaf 850 mm toward-end on a 6000 mm wall ends at 6250 mm,
250 mm beyond the wall.

## 4. Signed separation (the solver)

For convex compact sets A and B, the signed separation is

    s(A, B) = max over unit u of [ min_{b in B} b.u  -  h_A(u) ],   h_A(u) = max_{a in A} a.u

- If A and B are disjoint, s equals their Euclidean distance (> 0).
- If they overlap, s equals minus the penetration depth (minimum translation of B that separates
  them).
- s = 0 means touching.

For Q and a local rectangle B = [a1, a2] x [b1, b2] the support functions are piecewise per
quadrant of u, which gives a closed form. s is the maximum of these candidates:

| Candidate | Value | Included when |
|-----------|-------|---------------|
| E0 (u = +x) | a1 - R | always |
| E1 (u = +y) | b1 - R | always |
| E2 (u = -x) | -a2 | always |
| E3 (u = -y) | -b2 | always |
| S1 radial (corner a1,b1 vs arc) | sqrt(a1^2 + b1^2) - R | a1 > 0 and b1 > 0 |
| S2 open-leaf tip (0,R) vs corner (a2,b1) | sqrt(a2^2 + (b1-R)^2) | a2 < 0 and b1 > R |
| S3 hinge (0,0) vs corner (a2,b2) | sqrt(a2^2 + b2^2) | a2 < 0 and b2 < 0 |
| S4 closed-leaf tip (R,0) vs corner (a1,b2) | sqrt((a1-R)^2 + b2^2) | a1 > R and b2 < 0 |

### Exact status predicates

Statuses are decided without floating-point: for an integer threshold k, `s >= k` holds iff some
candidate is >= k. Linear candidates compare as integers. A root candidate `sqrt(n) - c >= k`
holds iff `k + c <= 0` or `n >= (k + c)^2`. The displayed value is rounded to 0.1 mm.

## 5. Status model

Settings: contact tolerance `tau = 1 mm`, advisory near-clearance threshold `T = 100 mm`
(both integers, `0 <= tau < T`).

| Status | Rule |
|--------|------|
| CONFLICT | s < -tau |
| CONTACT_REVIEW | -tau <= s <= tau |
| NEAR_CLEARANCE | tau < s < T |
| PASS | s >= T |
| INVALID | door or furniture violates a declared constraint; pair not evaluated |
| UNSUPPORTED | valid concept outside the implemented model; pair not evaluated |
| REVIEW_REQUIRED | document-level only: a linked record needs human review |

REVIEW_REQUIRED is never merged into geometric statuses.

## 6. Derived measurements

- First-strike angle: the smallest opening angle at which the leaf meets B. With B clipped to the
  first quadrant `[x1, x2] x [y1, y2]` and `x1^2 + y1^2 <= R^2`:
  `theta_first = atan2(y1, min(x2, sqrt(R^2 - y1^2)))`. Maximum achievable opening = theta_first.
- Overlap area: `integral over x of max(0, min(y2, sqrt(R^2 - x^2)) - y1) dx`, closed form with
  `F(x) = (x sqrt(R^2 - x^2) + R^2 asin(x / R)) / 2`.
- Overlap footprint: boundary of `B ∩ Q` (lines plus sampled arc) for display.

## 7. Flagship hand-computed oracle (R-512, leaf 850 mm, F-07 = [3620, 4100] x [230, 650])

| Hinge x | Local B | Governing candidate | s (mm) | Status | Notes |
|---------|---------|---------------------|--------|--------|-------|
| 1700 | [1920, 2400] x [230, 650] | S1 | +1083.73 | PASS | sqrt(3 739 300) - 850 |
| 2400 | [1220, 1700] x [230, 650] | S1 | +391.49 | PASS | sqrt(1 541 300) - 850 |
| 3000 | [620, 1100] x [230, 650] | S1 | -188.71 | CONFLICT | sqrt(437 300) - 850; strike at 15.70 deg on F-07 south face at x = 3818.3 |
| 4150 | [-530, -50] x [230, 650] | E2 | +50 | NEAR_CLEARANCE | console is behind the open leaf |
| 5400 | n/a | n/a | n/a | INVALID | leaf ends 250 mm past the wall |

Revision A overlap area is about 41 400 mm^2.

Status bands for D-101 along the south wall (integer hinge offsets, only F-07 in the y < 950 band):

| Hinge x (mm) | Status |
|---|---|
| 0-2698 | PASS |
| 2699-2800 | NEAR_CLEARANCE |
| 2801-2802 | CONTACT_REVIEW |
| 2803-4098 | CONFLICT |
| 4099-4101 | CONTACT_REVIEW |
| 4102-4199 | NEAR_CLEARANCE |
| 4200-5150 | PASS |
| 5151-6000 | INVALID |

Boundary checks: x = 2698 gives s = 100.25 (PASS); 2699 gives 99.28 (NEAR); 2801 gives 0.68
(CONTACT); 2802 gives -0.28 (CONTACT); 2803 gives -1.24 (CONFLICT); 4099 gives -1 (CONTACT).

All other R-512 furniture must keep `minY >= 950` (100 mm beyond the sweep's reach) so the bands
above hold exactly.

## 8. Independent verification

- Hand-computed oracle values above (not derived from production code).
- Sampling oracle (disjoint case): densely sample the boundary of Q and compute exact
  point-to-rectangle distance; result must be >= s and within the sampling error bound.
- Support-function oracle: brute-force maximum over 36 000 directions with h_Q from sampled arc
  points; must match s within 1e-3 mm.
- Grid oracle: any sample point strictly inside both shapes implies s < 0.
- Metamorphic: rotating or reflecting the whole room (door moves to another wall), or translating
  the room origin, leaves s unchanged.
- Lipschitz: translating B by t changes s by at most |t|.
- Overlap area formula vs shoelace area of the sampled footprint polygon (within 0.5%).
