# Angular Application Source

## Application structure
- `app.ts`, `app.html`, `app.scss`: root shell, responsive header/navigation, routed content outlet and footer. Preserve this shell when adding features.
- `app.routes.ts`: lazy route definitions. Keep feature routes grouped by feature and avoid eager-loading page components.
- `app.config.ts`: router, HttpClient/interceptor and application bootstrap providers.
- `core/`: cross-feature infrastructure such as API configuration and authentication.
- `features/`: route-level feature components. Current features are `auth` and the presentation-only `dashboard`.

## Current routes
- `/`: public overview placeholder.
- `/login`: password login.
- `/register`: account registration.

## Frontend conventions
- Angular standalone components and lazy `loadComponent` routes.
- Reactive Forms for user input; Signals for local/authentication state.
- Shared cross-feature services belong in `core`; feature-specific pages and UI belong in `features`.
- Keep API base URLs in environment configuration.
- Do not store access or refresh tokens in browser storage. Access token is memory-only; refresh token remains in backend-managed HttpOnly cookie.
- Frontend route visibility is not authorization. Yii 3 must enforce authentication, permissions and tenant scope for every protected operation.
- Do not introduce database schema changes from frontend work.

## Implemented versus pending
Implemented: responsive application shell, overview placeholder, login, registration, refresh-cookie restoration, Bearer interceptor, profile API method and logout.
Pending: authenticated workspace routes/guards, profile/settings screens, social authentication, verification/password reset, automatic refresh/retry for expired access tokens, tenant/business onboarding and business feature modules.
