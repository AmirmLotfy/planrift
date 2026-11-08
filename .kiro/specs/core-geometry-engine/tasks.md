# Implementation Plan — Core geometry engine

- [x] 1. PLR-03-01 Canonical schema and Aster House seed
  - Strict zod schema with integer mm, limits, unique IDs, referential integrity
  - Seed: R-512 flagship room, R-513 mirror, documents A-101/A-401/A-402/D-01, links
  - Status: Tested (tests/domain/analysis.test.ts "Aster House seed")
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. PLR-03-02 Coordinate frames and wall segments
  - Exact integer rotation/reflection from room-local to door-local coordinates
  - Status: Tested (metamorphic rotation and mirror properties)
  - _Requirements: 2.1, 4.3_

- [x] 3. PLR-03-03 Signed separation solver with exact predicates
  - Eight-candidate closed form; `compareSeparation`; `classifySeparation`
  - Status: Tested (flagship values; oracle agreement 300 runs; classification 3000 runs)
  - _Requirements: 2.2, 2.3_

- [x] 4. PLR-03-04 Strike range, overlap area and footprint
  - Status: Tested (shoelace vs closed form; leaf-segment check at the strike angle)
  - _Requirements: 2.4, 2.5_

- [x] 5. PLR-03-05 Invalid and unsupported rules
  - Hinge/leaf outside wall, sweep exceeds room, overlapping openings, furniture outside room,
    degenerate footprint, non-90° swing, exterior swing, non-hinged operation, rotated/circle/polygon
  - Status: Tested
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 6. PLR-03-06 Scene analysis and explanations
  - Status: Tested (explanation mentions 15.7°, south face, 188.7 mm)
  - _Requirements: 2.4, 2.5, 4.1, 4.2_

- [x] 7. PLR-03-07 Hinge position map
  - Status: Tested (bands equal the contract; agreement with analyzeScene every 7 mm)
  - _Requirements: 5.1_

- [x] 8. PLR-13-01 Record geometry test evidence
  - Run `npm run test:domain`, store summary in `docs/evidence/tests-domain.md` with date
  - Status: Recorded 2026-11-08 (3 files, 75 tests passed)
  - _Requirements: 2.3, 4.1_
