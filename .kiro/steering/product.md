---
inclusion: always
---

# PLANRIFT product philosophy

PLANRIFT is an architecture revision consequence studio. A designer proposes a change to a
room (move a door), sees the computed geometric consequences, sees which drawings and schedules
need human review, compares alternatives, and records a decision with a receipt.

Workflow: LOAD → PROPOSE → SIMULATE → DETECT → COMPARE → REVIEW → COMMIT.

Positioning: fast, understandable pre-commit revision rehearsal for simplified room geometry.
It complements CAD/BIM tools; it does not compete with their modelling or clash detection.

## The three defining requirements

1. A real architectural change can be proposed interactively.
2. Its geometric consequences are computed by the domain engine, never hardcoded.
3. The user can understand, compare and document those consequences before accepting a revision.

## Truthfulness rules (non-negotiable)

- Every displayed status comes from `analyzeScene` or from author-mapped `scene.links`. No fake
  markers, no hardcoded demo results, no special-casing of demo coordinates (e.g. 3000 mm).
- Never claim: code compliance, construction approval, safety, DWG/DXF/IFC/Revit support,
  automatic drawing updates, structural analysis, or AI design.
- Linked documents are references. PLANRIFT never says it updated A-101, A-401 or D-01. It says
  they require review.
- Unsupported configurations report `UNSUPPORTED`, never `PASS`.
- Screenshots and video show the real running product only.

## Flagship scenario (Aster House Hotel)

R-512 (6000 × 4500 × 2900 mm), door D-101 on the south wall (hinge x = 1700, leaf 850 mm,
90° inward, leaf toward +x), console F-07 at x 3620–4100, y 230–650. Revision A: hinge 3000 →
CONFLICT (strike at 15.7°, intrusion 188.7 mm). Revision B: hinge 2400 → PASS (391.5 mm).
Documents A-101, A-401, D-01 → REVIEW_REQUIRED whenever D-101 changes. R-513 stays unaffected.
Authoritative numbers: `docs/geometry/GEOMETRY_CONTRACT.md`.

## Scope

P0 ships first and completely (see `docs/plan/MASTER_PLAN.md` §C). P1 only after P0 is verified.
P2 is out of scope for Kiroween. Prefer one exceptional workflow over many shallow tools.
