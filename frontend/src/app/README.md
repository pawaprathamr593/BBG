# Angular Application Source

## Application structure
- `app.ts`, `app.html`, `app.scss`: root shell; public header/footer hide on storefront and workspace routes.
- `app.routes.ts`: lazy route definitions grouped by feature.
- `app.config.ts`: router, HttpClient/interceptor and application bootstrap providers.
- `core/`: cross-feature infrastructure (auth, theme, workspace context, shared API services).
- `features/`: route-level feature pages (marketplace, storefront, auth, workspace, catalogue, business registration).
- `shared/`: reusable presentational UI (auth experience/popup, profile drawer, filter drawer).

## Current routes
- Marketplace: `/`, `/businesses`, `/products`, `/promotions`, `/about`, detail placeholders
- Storefront: `/store/:businessSlug` (+ products, about, contact, login)
- Auth: `/login`, `/register`, `/auth/social/callback`
- Business onboarding: `/business/register`, `/workspace`
- Workspace: `/dashboard`, `/dashboard/catalogue`, `/dashboard/:section`

## Frontend conventions
- Angular standalone components and lazy `loadComponent` routes.
- Reactive Forms for auth input; Signals for local/auth/workspace state.
- Shared cross-feature services belong in `core`; feature pages belong in `features`.
- Keep API base URLs in environment configuration.
- Do not store access or refresh tokens in browser storage. Access token is memory-only; refresh token remains in backend-managed HttpOnly cookie.
- Frontend route visibility is not authorization. Yii 3 enforces authentication, permissions and tenant scope.
- Agent skills and coding standards: `frontend/.agent/` and `frontend/CODING_STANDARDS.md`.
