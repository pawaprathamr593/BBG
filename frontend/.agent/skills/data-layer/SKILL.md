---
name: data-layer
description: Implement BBG frontend data layer — typed models, API services with existing envelopes, Angular signals, lazy routes and workspace permissions. Use when adding or changing endpoints, services, models, feature state, routes or permission checks under frontend/src/app.
---

# Data layer

Flow: **models → service → signals/component state → routes/permissions**.

## References

| Work | File |
| --- | --- |
| Endpoints, envelopes, mapping | [references/api.md](references/api.md) |
| Signals, RxJS, persistence | [references/state.md](references/state.md) |
| Routes and workspace permissions | [references/navigation-permissions.md](references/navigation-permissions.md) |
| Stack / auth | `bbg-context` → `references/architecture.md` |

## Non-negotiables

1. Endpoints, payload fields, response shapes and permission keys come from the requirement or existing code. If `UNKNOWN` → stop and ask.
2. HTTP lives in `core/**` or feature `*-api.service.ts`. Prefer not putting raw `HttpClient` in presentational components.
3. Use existing envelopes (`authParam`, `businessParam`, `customerParam`, …). Do not invent new envelope keys.
4. Keep DTOs distinct from view models when mapping helps.
5. One source of truth per data set. No duplicated component/service copies.
6. Never persist access tokens. Theme and last-workspace keys are the known non-secret exceptions.
7. Do not bypass `authInterceptor` or invent ad-hoc Authorization headers unless an existing upload path already requires it.
8. Frontend route visibility is not authorization — Yii 3 enforces authz/tenant scope.

## Decide before coding

| Decision | Answer |
| --- | --- |
| API | Operation · endpoint · method · status (known / UNKNOWN) · model |
| State | Component signal / feature service signal / URL query |
| Async | Cancel stale loads (`switchMap`), block duplicate submits, no nested subscribes |
| Navigation | Route path, lazy `loadComponent`, title |
| Permissions | Workspace permission codes already returned by dashboard API |

## Build order

1. Models / types
2. API service method
3. Feature signal state + loading/error
4. Route wiring
5. Permission-gated actions in the host

## Verify

```bash
cd frontend
npx ng build --configuration development
```

Report real vs stubbed endpoints and any new permission keys used.
