# Frontend Core

## Authentication foundation

### Files
- `auth/auth.models.ts`: typed request/response contracts for the current Yii 3 auth API. The backend's public user identifier is `user_id`.
- `auth/auth.service.ts`: registration, password login, refresh-cookie session restoration, profile retrieval and logout.
- `auth/auth.interceptor.ts`: adds the in-memory Bearer access token only to BBG API requests; it does not leak the token to unrelated origins.
- `config/api-base-url.ts`: provides the environment-specific API base URL.

### API contract
All requests are POST and use the backend `authParam` envelope.
- `/api/v1/auth/register`: `manageAuth` / `register`; sends full name, optional email/mobile and password. The UI signs in after successful account creation.
- `/api/v1/auth/login`: `manageAuth` / `login`; sends identifier and password.
- `/api/v1/auth/refresh`: `manageAuth` / `refresh`; sends `X-BBG-CSRF: 1` and browser credentials.
- `/api/v1/auth/profile`: `getAuth` / `getProfile`; sends Bearer access token.
- `/api/v1/auth/logout`: `manageAuth` / `logout`; sends `X-BBG-CSRF: 1` and browser credentials.

### Security constraints
- Access tokens remain in Angular memory; do not persist them in localStorage or sessionStorage.
- Refresh token is an HttpOnly cookie owned by the backend; frontend code must never read it.
- Cookie-based refresh/logout requests use `withCredentials` and the required same-origin header.
- On application bootstrap, the app attempts one refresh to restore an existing session.
- Backend remains the final authorization and tenant-isolation authority.
- Social sign-in, email/mobile verification, password reset, automatic token-refresh retry for arbitrary failed requests, and logout-all UI are not implemented in this frontend slice.

### Configuration
Local API base URL is configured in `src/environments/environment.ts`; production uses `environment.production.ts` with same-origin `/api/v1` routing. Keep endpoint paths relative to the configured base URL and do not hardcode environment URLs in feature components.
