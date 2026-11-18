# BBG Frontend — Agent instructions

This is the Angular 22 frontend for **BBG** (Business Management & Marketplace Platform).

## Always load first

1. `.agent/skills/bbg-context/SKILL.md` (and `references/architecture.md`)
2. `.agent/skills/coding-standards/SKILL.md` (full detail: `CODING_STANDARDS.md`)

## Route work by intent

| Intent | Skill / workflow |
| --- | --- |
| Screens, layout, SCSS, shared UI | `.agent/skills/build-ui` |
| Models, HTTP, signals, routes, permissions | `.agent/skills/data-layer` |
| Write / check a requirement | `.agent/skills/requirement-intake` + `.agent/workflows/check-requirement.md` |
| Implement a requirement | `.agent/skills/implement-requirement` + `.agent/workflows/implement-requirement.md` |
| Review / release note | `.agent/skills/review-and-release` + `.agent/workflows/review-changes.md` |

## Non-negotiables

- Preserve existing UI, routes, API contracts and behaviour unless the user explicitly asks for a product change.
- Do not introduce Tailwind, PrimeNG, NgRx or a new design system.
- Do not invent endpoints, DTO fields or permission keys — ask.
- Access tokens stay in memory; never put tokens in `localStorage` / `sessionStorage`.
- Verify with `npx ng build --configuration development` from `frontend/`.
