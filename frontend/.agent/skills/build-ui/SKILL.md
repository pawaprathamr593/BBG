---
name: build-ui
description: Build or change BBG Angular screens — marketplace, storefront, auth, workspace, catalogue and shared presentational components — reusing existing SCSS tokens and shared UI, without Tailwind/PrimeNG/de-* kits. Use for any screen, template, styling, layout or shared-component work under frontend/src/app.
---

# Build UI

**Reuse first, configure second, never duplicate.** Preserve existing visual design unless the user asks for a UI change.

## References

| Need | File |
| --- | --- |
| Stack, layers, auth | `bbg-context` → `references/architecture.md` |
| File / route locations | `bbg-context` → `references/codebase-map.md` |
| Mobile, dark mode, states, a11y | [references/ui-ux-standards.md](references/ui-ux-standards.md) |
| Coding rules | `coding-standards` |
| API / signals / routes | `data-layer` |

## Reuse ladder

Stop at the first option that fits:

1. Existing feature page pattern (copy the nearest sibling under `features/`).
2. Existing shared component (`shared/auth-experience`, `auth-popup`, `user-profile-drawer`, `filter-drawer`, `workspace-nav-icon`).
3. Compose existing markup + CSS tokens in the host.
4. New shared presentational component under `shared/` (typed inputs/outputs, no API calls).
5. Bespoke host markup — last resort, small, with a stated reason.

## Screen ownership

- **Feature / route components** own orchestration: route context, service calls, loading/error, permissions, navigation.
- **Presentational components** receive typed inputs and emit outputs only.
- Keep templates declarative; move non-trivial transforms into typed members or pure helpers.
- Use `@if` / `@for` / `@switch` with stable `track` identities.
- Prefer `OnPush` + signals for new components.

## Styling rules

- Use tokens from `src/styles.scss` and existing component SCSS.
- Support light and dark (`data-theme="dark"`).
- Mobile-first; respect `prefers-reduced-motion` and focus styles.
- Do not introduce Tailwind, PrimeNG or a parallel token set.

## Before coding (non-trivial work)

Present a short plan:

| Screen region | Intent | Reuse choice | Ladder level | Notes |
| --- | --- | --- | --- | --- |

Include API/state decisions from `data-layer`. Wait for confirmation when the work is non-trivial.

## Verify

```bash
cd frontend
npx prettier --check <touched files>
npx ng build --configuration development
git diff --check
```

Manually check affected flows at mobile and desktop, light and dark, when UI-adjacent.
