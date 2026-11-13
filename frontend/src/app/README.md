# Angular Application Source

## Application composition
- app.ts / app.html / app.scss: root router host only.
- app.routes.ts: lazy route tree grouped by layout and feature.
- core/layouts/public-layout: shared public marketplace navigation and footer.
- core/layouts/auth-layout: minimal sign-in and registration shell.
- core/auth: session, token handling, guest/authenticated guards and auth API calls.
- core/permissions: permission context from the authenticated backend endpoint; unknown permission and missing scope deny.
- core/http: shared POST API client, response envelope and error normalization.
- features/marketplace: public marketplace DTOs, API service and route-level pages.
- features/auth: password login and registration pages.

## Active public routes
- / — marketplace home summary.
- /businesses — searchable, filterable and paginated business directory.
- /businesses/:businessSlug — published business storefront and public product list.
- /businesses/:businessSlug/products/:productId — public product detail.
- /promotions — public promotion feed.
- /promotions/:promotionId — public promotion detail.
- /login and /register — guest-only authentication pages.
- /access-denied and wildcard — safe navigation states.

## Authorization boundaries
- authenticatedGuard redirects anonymous users to login and retains the requested return URL.
- guestGuard redirects authenticated users away from login/registration.
- permissionGuard requires an explicit backend permission code and PLATFORM/TENANT scope.
- AuthService loads platform-scope permission records after login/session restoration using the current /api/v1/auth/permissions contract.
- Tenant permission loading is explicit and requires a tenant ID; no tenant selection or tenant workspace routes are active.
- Frontend route guards improve navigation only. Yii 3 remains authoritative for every protected operation and tenant isolation.

## Feature conventions
- Use standalone components and lazy loadComponent routes.
- Use Signals for local view state and RxJS/HttpClient for asynchronous operations.
- Keep feature DTOs and services inside the owning feature.
- Keep presentational components free of HttpClient and authorization logic.
- Use only request fields and response fields confirmed in the checked-in backend controller/service/DAO source.
- Do not add routes for conditional tenant workspace, purchasing or inventory features.

## Validation status
Marketplace API and permission scope tests have been added. Build, unit tests, browser tests and production build have not yet been run in the current environment.
