# BBG UI / UX standards

## Tokens (required)

From `src/styles.scss`:

- Brand: `--brand`, `--brand-strong`, `--brand-soft`, `--accent`
- Surfaces: `--surface-page`, `--surface-header`, `--surface-card`, `--surface-subtle`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`
- Border: `--border`

Prefer tokens over hard-coded colours when a token already exists. Keep light/dark pairs working.

## Layout

- Mobile-first; validate ~360–390px, tablet, desktop
- Workspace and storefront shells already hide the public header/footer — do not break that
- Avoid layout shift while loading; reserve space for lists/cards when practical

## UI states (every data-driven region)

| State | Expectation |
| --- | --- |
| Loading | Status text or spinner; disable duplicate submits |
| Empty | Explain why + next step when possible |
| Error | Accurate message; retry when safe |
| Success | Only after a real success |
| Permission denied | Hide/disable actions; do not fake empty data |

## Accessibility

- Semantic landmarks, headings, labels, buttons
- Every interactive control has an accessible name and keyboard path
- Visible `:focus-visible`; do not rely on hover alone
- Use `role="status"` / `role="alert"` / `aria-live` for async feedback
- Confirm destructive actions

## Motion

- Prefer subtle transitions already used in the feature
- Honour `prefers-reduced-motion`
- Do not add decorative animation noise during standards refactors
