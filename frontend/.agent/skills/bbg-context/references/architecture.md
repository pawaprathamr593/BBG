# BBG frontend architecture

## Stack

- Angular 22 standalone components, TypeScript ~6, RxJS 7.8, SCSS
- Signals for local/feature state; RxJS for HTTP and event streams
- No NgRx, PrimeNG, Tailwind or third-party UI kit
- Yii 3 backend API under `/api/v1/...` with action envelopes (`authParam`, `businessParam`, …)

## Layers

```text
src/app/
├── app.ts / app.routes.ts / app.config.ts   # shell, lazy routes, providers
├── core/                                    # cross-feature infra (auth, theme, APIs, workspace)
├── features/                                # route-level feature pages
├── shared/                                  # reusable presentational / dialog UI
└── environments/                            # API base URL
```

## Auth and security

- Access token: in-memory signal only (`AuthService`)
- Refresh token: backend HttpOnly cookie; frontend never reads it
- `authInterceptor` attaches Bearer only to BBG API URLs
- Bootstrap calls `auth.restoreSession()` once via refresh cookie
- Backend is the authority for authz and tenant scope; route visibility is not security

## State patterns

- Prefer `signal()` / `computed()` / `input()` / `output()` in new code
- Use `inject()` for DI
- Use `ChangeDetectionStrategy.OnPush` when updates are signal/input driven
- Long-lived subscriptions: `takeUntilDestroyed`
- HTTP in services; map envelopes in the service before the component consumes data

## Theming

- CSS custom properties in `src/styles.scss` (`--brand`, `--surface-*`, `--text-*`, `--border`, `--accent`)
- `ThemeService` toggles `data-theme="dark"` on the document
- Reuse tokens; do not introduce a parallel design system
