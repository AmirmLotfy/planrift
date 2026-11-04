---
inclusion: fileMatch
fileMatchPattern: ["src/components/**", "src/app/**"]
---

# Accessibility requirements (WCAG 2.2 AA target)

- Every drag interaction has a numeric and keyboard alternative. Door hinge: number field plus
  arrow keys on the focused door handle (← → 10 mm, Shift 100 mm, Alt 1 mm).
- Visible focus ring on every interactive element (2 px `--blueprint`, offset 2 px).
- Status is conveyed by text + icon + pattern, never colour alone. Contrast ≥ 4.5:1 for text.
- The plan SVG has `role="img"`-free interactive groups with `role="button"`/labels for
  selectable elements, plus a text summary of the analysis for screen readers.
- Live analysis changes are announced through a polite `aria-live` region with one concise
  sentence (e.g. "D-101 at 3,000 mm: conflict with Console F-07, strike at 15.7°").
- Dialogs use native `<dialog>` with labelled titles; Esc closes; focus returns to the trigger.
- Respect `prefers-reduced-motion`: no door-swing animation, no camera tweening.
- Hit targets ≥ 24 × 24 px. Forms have visible labels and inline, specific error messages.
- Test with `@axe-core/playwright` on `/` and `/demo` in every major state.
