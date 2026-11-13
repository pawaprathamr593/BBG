# Frontend Core

## Authentication and session

- auth/auth.models.ts: current auth request/response DTOs; backend public user identifier is user_id.
- auth/auth.service.ts: registration, password login, refresh-cookie restoration, profile read, logout and permission bootstrap.
- auth/auth.interceptor.ts: attaches the in-memory Bearer token only to BBG API requests; it does not leak the token to unrelated origins.
- auth/auth.guards.ts: guest and authenticated route guards.
- config/api-base-url.ts: environment-specific API base URL.
- layouts/public-layout: public marketplace navigation/footer.
- layouts/auth-layout: minimal authentication shell.

All API calls use POST. Auth requests use the module-specific authParam envelope.

## Permission context

The current backend permission endpoint is POST /api/v1/auth/permissions. AuthController maps the route to getPermissions and injects the verified bearer principal. AuthServices reads tenant_id from actionData and returns:
- tenant_id: null for platform scope (request tenant_id = 0), or the selected tenant ID for tenant scope.
- permissions: rows containing role_code, scope_type, permission_code and module_code.

AuthService loads platform-scope permissions after login and refresh/session restoration. Tenant-scope permissions can be loaded by calling loadPermissions(tenantId) only after an approved tenant context is established. No tenant selector or tenant role routes are active in this increment.

PermissionService stores only backend-returned permission records. Permission checks must specify PLATFORM or TENANT scope. permissionGuard denies if either the permission code or scope is absent. The frontend never infers a role from the profile, route or user-supplied tenant ID; the backend independently validates membership and authorization.

## Token and request constraints

- Access tokens remain in Angular memory; do not persist them in localStorage or sessionStorage.
- Refresh token is an HttpOnly cookie owned by the backend; frontend code must never read it.
- Cookie-based refresh/logout requests use withCredentials and the required X-BBG-CSRF: 1 header.
- The application attempts session restoration during bootstrap.
- Backend remains the final authorization and tenant-isolation authority.
- Social sign-in, verification, password reset, automatic refresh/retry for arbitrary failed requests and logout-all UI remain outside this increment.

## API configuration

Local API base URL is configured in src/environments/environment.ts. Production uses an empty base URL and same-origin /api/v1 paths. Feature services must keep endpoint paths relative to the configured base URL.
