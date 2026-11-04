# Design — Revision workflow

## State model

```
ProjectState
  revisions: CommittedRevision[]   REV-0 baseline, REV-n per acceptance (immutable scenes + SHA-256)
  scenarios: Scenario[]            id, label A/B/…, sourceRevisionId, scene, past[], future[],
                                   status, remarks, decision
  receipts:  RevisionReceipt[]
```

Lifecycle: `draft → ready_for_review → accepted | rejected`, `ready_for_review → draft`,
open siblings → `superseded` on acceptance. Gates in `src/domain/revision/scenario.ts`
(`submissionBlockers`, `acceptanceBlockers`).

## Modules

| Module | Responsibility |
|---|---|
| `revision/diff.ts` | field-level diff by element ID; descriptions with signed deltas |
| `revision/impact.ts` | links × diff → REVIEW_REQUIRED records per document |
| `revision/scenario.ts` | edits, undo/redo, discard, lifecycle, commit |
| `revision/receipt.ts` | receipt structure and model limitations text |
| `revision/compare.ts` | comparison columns from analysis |
| `io/canonical.ts` | canonical JSON and SHA-256 fingerprints |
| `io/projectFile.ts` | project file schema, export, import with integrity checks |
| `io/csv.ts` | CSV quoting and formula-injection protection |
| `io/receiptHtml.ts` | escaped, printable receipt document |

## Decisions

- Undo stacks are session-local and not exported (smaller files, simpler validation).
- Documents' issued metadata comes from the source revision; links from the proposal.
- Receipt IDs derive from the result fingerprint, so the same decision on the same scene yields
  a recognisable ID.
