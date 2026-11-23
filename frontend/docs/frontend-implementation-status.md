# BBG Frontend Implementation Status & Repository Audit

**Audit date:** 23 November 2026  
**Repository:** `pawaprathamr593/BBG`  
**Working branch:** `feature/frontend-development`  
**Reviewed implementation head:** `d7d57d4f1ede1214b29d8b92020108c92f149bef`  
**Scope:** Angular frontend only. Backend source and database files are inspected read-only and are not modified by this work.

## 1. Repository and technology baseline

- The repository is private; `main` is the default branch and `feature/frontend-development` is the active implementation branch.
- Frontend: Angular 22, TypeScript 6, RxJS, standalone components, lazy routes, Signals, Reactive Forms and SCSS.
- Backend: Yii 3 / PHP 8.4; database: MySQL 8.4. The frontend accesses data only through the registered backend API.
- The supplied `backend_architecture.md` and `BBG_Backend_Architecture_v1.0.md` are design references, not replacements for checked-in backend behavior. The checked-in routes, controllers, services and DAOs are the source for current API contracts.
- `backend/docs/BBG_DATABASE_DESIGN_V2.1_AMENDMENT.md` adopts `CARTS` and `CART_ITEMS` as canonical tables 69–70; the three business-application history/document tables remain dormant. The amendment retains A/Z soft deletion and the five common audit columns. No frontend code accesses the database directly.

## 2. Design direction and scope

- Product-wide direction: **BBG Marketplace Editorial** — warm neutral surfaces, deep navy typography, restrained blue actions, image-led marketplace discovery and structured operational workspaces.
- Public marketplace, Consumer, Entrepreneur and Platform Administrator are the active product experiences.
- Purchasing/inventory and conditional tenant ERP areas (sales, invoices, expenses, cash and reports) remain out of active scope unless separately approved.
- Payment gateway processing, offline business writes/background sync, notifications and direct messaging are not represented as completed features.

## 3. Implemented frontend foundations

- Root router host with separate public marketplace, authentication and business storefront layouts.
- Lazy-loaded routes for marketplace home, directory, business storefront, product details, promotions, authentication, Consumer, Entrepreneur, Platform Administrator, access denied and not found.
- Shared `ApiService`, response/error normalization and functional auth interceptor using the registered POST routes and module envelopes.
- Authentication/session flow with in-memory access-token state, rotating HttpOnly refresh-cookie requests, `X-BBG-CSRF: 1` on refresh/logout, session restoration and guest/authenticated guards.
- Permission context is loaded from the backend and distinguishes `PLATFORM` from `TENANT` scope. Unknown permissions deny access; the backend remains authoritative. Permission requests are latest-request-wins, the returned `tenant_id` must match the requested context (platform request `0` returns `null`), and logout/new authentication responses invalidate pending permission requests.
- Entrepreneur workspace loads active tenant memberships and provides a business selector. Tenant IDs are attached to tenant-scoped actions only after selection; the backend must still verify membership and authorization.
- Business-context changes now clear displayed response/payload state and invalidate in-flight requests, preventing a late response from the previously selected tenant from repopulating the workspace.
- Shared responsive workspace shell with Consumer, Entrepreneur and Platform Administrator configurations. Actions without confirmed DTOs retain a JSON payload editor rather than inventing field names.
- Public marketplace pages: home, category browse, searchable/paginated business directory, storefront, product detail, promotion feed and promotion detail.
- Storefront customer flows include sign-in return navigation, product variant/quantity selection, per-business cart, quantity update/removal/clear and checkout. Checkout displays the backend-confirmed unpaid state; no payment is implied.
- Theme preference supports light, dark and system. SEO metadata, canonical/Open Graph metadata, JSON-LD, sitemap generation and a public-shell-only PWA service worker are present.
- Shared design tokens and responsive, focus-visible, skip-link and reduced-motion treatments follow `frontend/docs/design-system.md`.

## 4. Remaining contract and scope gates

- The backend permission records and scope discriminator are known, but the complete approved permission-code catalogue and route/action permission matrix still require owner confirmation. The Platform Administrator entry is scope-guarded; that does not replace per-action backend authorization.
- Tenant selection is implemented as a frontend context selector. The backend remains responsible for tenant membership, resource ownership and permission checks on every request.
- Several workspace actions still need confirmed field-level request/response DTOs before they can become dedicated forms. Do not infer fields from database columns.
- OAuth provider routes and frontend popup/email-OTP orchestration exist, but provider credentials, callback configuration, account linking and live provider behavior still need verification.
- API route registration/controller dispatch is not proof of complete service behavior. Local runtime integration, media delivery, checkout and tenant-isolation tests remain required.
- Inventory, purchasing, payment gateway, offline writes, notifications, direct messaging and conditional tenant ERP modules remain inactive.

## 5. Local API development and CORS

- Development API requests use a relative base URL. `npm start` runs Angular with `frontend/proxy.conf.json`, forwarding `/api/**` to `http://localhost:8080`.
- The checked-in Yii web middleware stack currently has no CORS middleware. Direct browser calls from `http://localhost:4200` to `http://localhost:8080` can therefore fail on the `OPTIONS` preflight before the POST route is reached.
- The development proxy keeps browser requests same-origin and avoids that local preflight. It does not add CORS support to Yii and does not change any endpoint or authentication contract.
- Production also uses a relative API base URL and expects the deployment reverse proxy to forward `/api` to Yii. If production is deliberately cross-origin, configure explicit credentialed CORS in the backend; never combine credentials with `Access-Control-Allow-Origin: *`.

## 6. Validation

- Implementation head `d7d57d4f1ede1214b29d8b92020108c92f149bef` passed GitHub Actions [Frontend validation run 45117066676](https://github.com/pawaprathamr593/BBG/actions/runs/45117066676) on 23 November 2026. Dependency installation, sitemap syntax validation, production build and unit tests passed; all 8 test files passed.
- The corresponding [backend validation run 45117066600](https://github.com/pawaprathamr593/BBG/actions/runs/45117066600) also passed. This increment changed no backend source, routes, migrations or database files.
- `package.json` does not define a lint script or an E2E runner. Playwright/browser E2E and automated accessibility checks are not yet configured.
- The production build succeeds with non-blocking component stylesheet budget warnings: `business-directory.scss` (4.01 kB), `workspace.scss` (7.97 kB), `storefront-section.scss` (5.86 kB), `home.scss` (7.63 kB), `storefront-layout.scss` (4.20 kB) and `storefront-cart.scss` (5.67 kB), against a 4.00 kB warning budget. Optimize these without changing the approved design.

## 7. Recommended next work

1. Verify the new same-origin proxy locally with the Yii API running at port 8080, including refresh-cookie restoration and public marketplace home.
2. Run a tenant-switch regression against the real API and confirm the server rejects unauthorized tenant IDs even if a client tampers with the request.
3. Replace generic workspace JSON payloads with typed forms only after the backend DTO contracts and route-to-permission mapping are approved.
4. Add Playwright journeys and accessibility checks for public discovery, sign-in, storefront cart/checkout and tenant switching.

## 8. Safety and release controls

- Commit only to `feature/frontend-development`.
- Do not modify backend source, migrations, seed scripts or database objects as part of frontend work.
- Do not merge into `main` or deploy without explicit approval.
- Keep access tokens in memory, exclude authenticated/private API responses from service-worker caching, deny unknown permissions and let the backend enforce authorization and tenant isolation.
