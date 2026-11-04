# Implementation Plan — Revision workflow

- [x] 1. PLR-04-01 Field-level scene diff
  - Status: Tested (empty diff on unchanged and serialised scenes; single-field change)
  - _Requirements: 2.1_

- [x] 2. PLR-04-02 Scenarios, edits, undo/redo, discard
  - Status: Tested (edit rejection cases; random sequence property 150 runs)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. PLR-08-00 Document impact computation
  - Status: Tested (A-101/A-401/D-01 only; persists on PASS; field-scoped link)
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 4. PLR-04-03 Lifecycle gates, accept/reject, supersede, receipts
  - Status: Tested
  - _Requirements: 3.1–3.6_

- [x] 5. PLR-04-04 Comparison model
  - Status: Tested (Baseline/A/B values)
  - _Requirements: 4.1_

- [x] 6. PLR-10-00 Project file export/import with integrity checks; CSV
  - Status: Tested (round trip; 11 malformed-input cases; CSV injection)
  - _Requirements: 5.2, 5.3, 5.4_

- [ ] 7. PLR-10-03 Receipt HTML generator (escaped, printable)
  - Unit test: every interpolated value escaped; contains limitations and fingerprints
  - _Requirements: 5.4_

- [ ] 8. PLR-10-01 Browser persistence with safe load and reset
  - Versioned key; schema-validated load; notice on discard; e2e reload test
  - _Requirements: 5.1_
