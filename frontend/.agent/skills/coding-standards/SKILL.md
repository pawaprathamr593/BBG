---
name: coding-standards
description: Apply BBG frontend coding standards for Angular 22/TypeScript/SCSS quality refactors that preserve UI and behaviour. Use when cleaning code, aligning style, adding OnPush/inject/signals, removing any, fixing subscriptions, or when the user mentions coding standards, code quality or safe refactors.
---

# Coding standards

Full standard: [`frontend/CODING_STANDARDS.md`](../../../CODING_STANDARDS.md). This skill is the agent entry point — follow that document.

## When this skill applies

- Code-quality / consistency work
- New frontend code that must match project conventions
- Reviews that score maintainability and type safety

## Hard boundaries

- **Do not** change feature behaviour, API contracts, routes, copy, styling, spacing, colours, animation or interaction patterns unless the user explicitly requests a product change.
- **Do not** add Tailwind, PrimeNG, NgRx, new UI kits or new architecture without approval.
- Existing BBG code wins when an external kit conflicts with it.

## Quick checklist (safe refactors)

1. Prefer `inject()`, standalone components, lazy routes.
2. Prefer `ChangeDetectionStrategy.OnPush` when state is signal/input driven.
3. Prefer `input()` / `output()` / `signal()` / `computed()` in new code; preserve public bindings when migrating.
4. No `any`; use `unknown` at network boundaries and narrow.
5. HTTP in services; typed envelopes; no token logging or browser-storage tokens.
6. `takeUntilDestroyed` for long-lived subscriptions; no nested subscribe chains when operators suffice.
7. Templates: `@if` / `@for` / `@switch` with stable `track`; keep expressions simple.
8. Reuse existing SCSS tokens (`--brand`, `--surface-*`, `--text-*`, `--border`, `--accent`).
9. Format with Prettier (2-space, single quotes, 100 print width).
10. Verify: Prettier on touched files → `npx ng build --configuration development` → `git diff --check`.

## Detailed sections

| Topic | File |
| --- | --- |
| Full rules 1–10 + safe refactor checklist | [references/standards.md](references/standards.md) |
| Architecture / stack context | `bbg-context` → `references/architecture.md` |
