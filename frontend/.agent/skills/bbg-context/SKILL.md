---
name: bbg-context
description: Product, domain, architecture and codebase-map knowledge for the BBG Angular marketplace frontend. Use before analysing, planning, reviewing or changing any code under frontend/, and whenever another BBG skill says "load context".
---

# BBG context

BBG is a business management and marketplace platform: public marketplace discovery, per-business storefronts, auth, business registration, and authenticated workspace (catalogue, dashboard modules, platform admin).

## Load only what the task needs

| Task | Read |
| --- | --- |
| Any code change | [references/architecture.md](references/architecture.md) |
| Locating files, routes, services | [references/codebase-map.md](references/codebase-map.md) |
| Requirement analysis, UX, personas | [references/product-and-users.md](references/product-and-users.md) |

## Ground truth order

1. The code on the **current branch**.
2. Skills in `.agent/skills/` and `frontend/CODING_STANDARDS.md`.
3. Backend docs under `backend/docs/` and `docs/architecture/` when API/RBAC contracts are needed.

## Non-negotiables (apply everywhere)

1. Read the sibling feature before writing code; follow its structure and style.
2. Never invent endpoints, DTO fields, permission keys or routes — ask.
3. Keep HTTP in core/feature API services; use the existing auth interceptor; do not bypass it.
4. Feature/route components own data, permissions and navigation; shared presentational components receive inputs and emit outputs.
5. Mobile-first, light/dark theme tokens, and explicit UI states (loading, empty, error, success).
6. Do not log or persist access tokens, credentials or unnecessary personal data.
7. Keep changes scoped; report exactly what was verified.
8. Standards refactors must not change UI or behaviour.

## Related skills

| Need | Skill |
| --- | --- |
| Coding standards / safe refactors | `coding-standards` |
| Implement a requirement file | `implement-requirement` |
| Write / validate a requirement | `requirement-intake` |
| Screens, templates, SCSS, shared UI | `build-ui` |
| Models, services, signals, routes, permissions | `data-layer` |
| Review before PR, release note | `review-and-release` |
