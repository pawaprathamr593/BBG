---
name: review-and-release
description: Review BBG frontend changes against architecture, coding standards, API, permissions, UI/UX and acceptance criteria with severity-ranked findings, and draft release notes from verified changes. Use when reviewing a PR/diff, after implement-requirement, or when asked for a release note or changelog.
---

# Review and release

| Task | Follow |
| --- | --- |
| Review a diff or requirement implementation | This file |
| Release note | [references/release-note.md](references/release-note.md) |

Rules come from `bbg-context`, `coding-standards`, `build-ui` and `data-layer`.

## Scope

1. `git diff --stat` and `git diff` (or named files).
2. Load linked requirement acceptance criteria when present.
3. Load `bbg-context` → `architecture.md` and `coding-standards`.

## Checklist

| Area | Check |
| --- | --- |
| Scope | Only required files; no drive-by refactors |
| UI/behaviour | No unintended visual or interaction changes |
| Routing | Lazy load; titles; shell hide rules preserved |
| Smart vs presentational | No API/permission logic in pure shared UI |
| State | Single source of truth; no HTTP in `computed()` |
| API | Existing envelopes; no invented fields; interceptor not bypassed |
| Types | No new `any`; narrow `unknown` at boundaries |
| Templates | `@if`/`@for` with stable `track`; simple bindings |
| UI states | Loading, empty, error, success correct |
| Theme / mobile | Tokens; light/dark; narrow screens |
| Permissions | Known keys; actions hidden/disabled |
| Security | No tokens/PII in logs or storage |
| Hygiene | No debug logs, unused imports, commented-out blocks |
| Verification | Build / format / diff-check reported honestly |

## Commands

```bash
cd frontend
npx prettier --check <touched files>
npx ng build --configuration development
git diff --check
```

## Output format

```markdown
## Review: <scope>

### Critical
- …

### Suggestions
- …

### Nice to have
- …

### Verification
- build: passed | failed | not run
- format: …
- diff-check: …
```
