# Frontend Core

## Contents

- `auth/`: models, `AuthService`, Bearer interceptor, auth dialog service
- `config/api-base-url.ts`: environment-specific API base URL
- `theme/theme.service.ts`: light/dark theme via `data-theme`
- `workspace/workspace-context.service.ts`: personal / business / platform context and permissions
- `marketplace/marketplace-api.service.ts`: public discovery APIs
- `dashboard/dashboard-api.service.ts`: workspace dashboard and permission APIs
- `business/business-registration-api.service.ts`: business onboarding APIs

## Authentication

### API contract

Auth requests use the backend `authParam` envelope where applicable.

- `/api/v1/auth/register`, `/login`, `/refresh`, `/profile`, `/logout`
- Social: `/api/v1/auth/social/config` and provider-specific flows

### Security constraints

- Access tokens remain in Angular memory; do not persist them in localStorage or sessionStorage.
- Refresh token is an HttpOnly cookie owned by the backend; frontend code must never read it.
- Cookie-based refresh/logout requests use `withCredentials` and the required CSRF header pattern.
- On application bootstrap, the app attempts one refresh to restore an existing session.
- Backend remains the final authorization and tenant-isolation authority.

## Configuration

Local API base URL is configured in `src/environments/environment.ts`; production uses `environment.production.ts`. Keep endpoint paths relative to the configured base URL.
