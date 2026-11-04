# Requirements — Revision workflow (versions, impacts, comparison, persistence)

## Introduction

Proposals are rehearsed as scenarios branched from a committed revision. Their consequences are
compared, reviewed and either accepted (committing a new revision with a receipt) or rejected.
Linked documents are flagged for human review; PLANRIFT never edits them.

## Requirement 1 — Scenarios and edits

1. WHEN the user creates a scenario, THE System SHALL branch it from the current head revision.
2. WHEN the user edits a draft scenario, THE System SHALL validate the edit (whole millimetres,
   finite, in range) and either apply it as one undoable step or reject it with a message,
   leaving the scene unchanged.
3. THE System SHALL support undo, redo and discard (restore the source revision) without
   producing an invalid scene.
4. WHILE a scenario is in review, accepted, rejected or superseded, THE System SHALL prevent edits.

## Requirement 2 — Change detection and document impact

1. THE System SHALL compute a field-level diff between a scenario and its source revision; an
   unchanged scene SHALL produce an empty diff.
2. WHEN a changed field matches an authored link's trigger fields, THE System SHALL mark the linked
   document REVIEW_REQUIRED with the reason, the element and the link note.
3. THE System SHALL keep REVIEW_REQUIRED independent of geometric status (it persists when the
   clearance passes).
4. THE System SHALL NOT create impact records for elements that did not change (room isolation).

## Requirement 3 — Review lifecycle

1. THE System SHALL allow submission for review only when the scenario has changes and no INVALID
   result.
2. THE System SHALL block acceptance while any CONFLICT, UNSUPPORTED or INVALID result remains.
3. WHEN CONTACT_REVIEW or NEAR_CLEARANCE remains, THE System SHALL require a reviewer note.
4. WHEN documents require review, THE System SHALL require the reviewer to acknowledge that the
   documents still need to be revised.
5. WHEN a scenario is accepted, THE System SHALL commit a new revision, record a receipt with
   source and result fingerprints, and supersede other open scenarios from the same source.
6. WHEN a scenario is rejected, THE System SHALL require a note and record a receipt.

## Requirement 4 — Comparison

1. THE System SHALL compare the source revision and selected scenarios for a focus door: hinge
   position and delta, status, max opening, governing clearance, attention pairs, changed
   elements, impacts, remarks and decision.

## Requirement 5 — Persistence, import and export

1. THE System SHALL persist the project in browser storage and restore it on reload; corrupt or
   incompatible data SHALL be discarded with a notice.
2. THE System SHALL export the project as JSON and import it back with identical geometry,
   identifiers and decisions.
3. IF an import is oversized, not JSON, of unknown format, structurally invalid, inconsistent or
   fingerprint-mismatched, THEN THE System SHALL reject it with specific errors and keep the
   current project.
4. THE System SHALL export the receipt (JSON and printable HTML), the impact ledger (CSV with
   formula-injection protection) and the plan (SVG).
