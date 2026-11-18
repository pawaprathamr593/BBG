# BBG frontend codebase map

Paths are relative to `frontend/src/app/`.

## Shell

| File | Role |
| --- | --- |
| `app.ts` / `app.html` / `app.scss` | Public header/footer; hides shell on storefront & workspace |
| `app.routes.ts` | Lazy `loadComponent` routes |
| `app.config.ts` | Router, HttpClient, auth interceptor |

## Core

| Path | Role |
| --- | --- |
| `core/auth/auth.service.ts` | Register, login, social, refresh, profile, logout |
| `core/auth/auth.models.ts` | Auth DTOs / user contracts |
| `core/auth/auth.interceptor.ts` | Bearer on BBG API requests |
| `core/auth/auth-dialog.service.ts` | Opens shared auth popup |
| `core/config/api-base-url.ts` | Injected API origin |
| `core/theme/theme.service.ts` | Light/dark theme |
| `core/workspace/workspace-context.service.ts` | Tenant / platform / personal context + permissions |
| `core/marketplace/marketplace-api.service.ts` | Public marketplace discovery APIs |
| `core/dashboard/dashboard-api.service.ts` | Workspace dashboard / permissions APIs |
| `core/business/business-registration-api.service.ts` | Business onboarding APIs |

## Features (routes)

| Area | Path | Routes |
| --- | --- | --- |
| Marketplace | `features/marketplace/` | `/`, `/businesses`, `/products`, `/promotions`, `/about`, detail placeholders |
| Storefront | `features/storefront/` | `/store/:businessSlug/*` |
| Auth | `features/auth/pages/` | `/login`, `/register`, `/auth/social/callback` |
| Business onboarding | `features/business-registration/`, `features/business-workspace/` | `/business/register`, `/workspace` |
| Workspace shell | `features/workspace/` | `/dashboard` layout |
| Dashboard | `features/dashboard/` | `/dashboard`, `/dashboard/:section` |
| Catalogue | `features/catalogue/` | `/dashboard/catalogue` (+ feature-local API service) |

## Shared UI

| Path | Role |
| --- | --- |
| `shared/auth-experience/` | Login/register experience (page + popup) |
| `shared/auth-popup/` | Modal shell for auth |
| `shared/user-profile-drawer/` | Account / theme / workspace switcher |
| `shared/filter-drawer/` | Advanced filters drawer |

## Environments

- `environments/environment.ts` — local API base
- `environments/environment.production.ts` — production / same-origin API
