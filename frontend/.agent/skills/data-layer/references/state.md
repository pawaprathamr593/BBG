# BBG state patterns

## Default choices

| Data | Where it lives |
| --- | --- |
| Auth user / access token | `AuthService` signals |
| Theme | `ThemeService` (+ localStorage theme key only) |
| Active workspace / permissions | `WorkspaceContextService` signals (+ session keys for last workspace/context, never tokens) |
| Storefront detail for `/store/:slug` | `StorefrontContextService` (route-scoped) |
| Page lists / forms | Feature component signals |

Do **not** introduce NgRx to match external kits.

## Signals vs RxJS

- Signals: synchronous UI/feature state, derived `computed()`, template reads
- RxJS: HTTP, router events, composition, cancellation (`switchMap`, `takeUntilDestroyed`)
- Never put HTTP or side effects inside `computed()`

## Async hygiene

- Loading / empty / error / success explicitly
- Disable buttons while `busy` / mutation in flight
- Cancel or ignore stale search/filter responses when the feature reloads on input
- Prefer operators over nested `.subscribe()` chains
- One-shot HTTP may use `firstValueFrom` (common in this codebase)

## Persistence rules

Allowed today:

- Theme preference
- Last/active workspace id and context keys used by `WorkspaceContextService`
- Transient OAuth state/intent (not access tokens)

Forbidden:

- Access or refresh tokens in `localStorage` / `sessionStorage`
- Logging credentials or PII
