# BBG Frontend Implementation Status & Repository Audit

**Date:** 13 November 2026  
**Repository:** `pawaprathamr593/BBG`  
**Working branch:** `feature/frontend-development`  
**Scope:** Frontend only; backend and database are read-only for this work.

## 1. Repository audit

- Repository exists and is private.
- Default branch is `main`.
- Required development branch `feature/frontend-development` exists.
- Frontend lives in `frontend/`; Yii backend lives in `backend/`.
- Work must remain on `feature/frontend-development`; no changes to `main`, backend source or database schema are authorized by this frontend task.

### Frontend baseline

- Angular dependencies are declared at `^22.2.0`; Angular CLI/build at `^22.2.5`; TypeScript `~6.0.2`; RxJS `~7.8.0`.
- Existing app uses standalone-style Angular components, lazy `loadComponent` for the three current routes, Signals and Reactive Forms.
- Existing routes are only `/`, `/login`, `/register`, and wildcard redirect.
- Existing screens are a platform-foundation placeholder, login and registration.
- Existing auth service uses POST endpoints, an in-memory access-token signal, credentialed refresh cookie requests and `X-BBG-CSRF: 1` on refresh/logout.
- Existing frontend has no PWA manifest/service-worker setup, feature API mapping, full shared design system, feature stores, role layouts, permission guards, or Playwright E2E suite.
- Existing global styling is a light blue/navy foundation; dashboard styles are partly duplicated between global styles and component/layout styles.

## 2. Backend integration audit

- `backend/config/common/routes.php` contains registered POST route families for authentication, cart, orders, marketplace, tenants, business, catalogue, customers, enquiries, promotions, engagement, subscriptions, admin, payments and dashboards.
- Backend controller files exist for these modules.
- The authentication implementation note confirms registration, password login, short-lived HS256 access tokens, rotating HttpOnly refresh cookie, refresh-token hash storage, refresh rotation/reuse handling, logout, logout-all and profile read in the initial increment.
- Google/Facebook/Instagram provider sign-in is not enabled.
- Profile update is not implemented in the initial authentication increment.
- Backend architecture leaves permission catalogues, some payload DTOs, pagination/filtering, provider callbacks and several lifecycle rules pending.
- The exact file `backend_architecture.md` referenced by the master prompt was not found among the supplied documents or at repository root. The supplied `BBG_Backend_Architecture_v1.0.md` and actual checked-in backend source are used instead. This source discrepancy is recorded rather than silently assumed away.
- The complete route-level matrix is in `docs/frontend-api-mapping.md`.

## 3. Scope guardrails

### Active Phase 1 experiences

1. Public marketplace.
2. Consumer.
3. Entrepreneur.
4. Platform Administrator.

### Not active without approval

- Conditional tenant business workspace modules (members, customers, sales, invoices, expenses, cash, reports).
- Purchasing and inventory.
- Social sign-in and provider callback screens.
- Payment gateway integration.
- Offline transactions/background sync/offline writes.

## 4. Design direction

Two distinct directions were evaluated conceptually against BBG's dual marketplace + business-platform purpose.

### Direction A — BBG Marketplace Editorial (selected)

- Warm, low-contrast neutral page surfaces with deep navy/ink typography.
- Restrained blue as the primary action color; muted teal/green only for positive states.
- Marketplace discovery uses generous imagery, clear category navigation, compact business/product cards and editorial promotion surfaces.
- Consumer mobile navigation uses a clear bottom bar.
- Entrepreneur/Admin experiences retain the same typography and tokens but use more structured navigation, data views and operational status summaries.
- Borders and subtle elevation define hierarchy; avoid excessive gradients, glass effects and rounded-card overload.

### Direction B — Enterprise Command Center

- Cool grey surfaces, stronger blue/indigo accents and denser information layouts.
- Persistent desktop sidebar, compact tables, dashboard metrics and highly structured workflows.
- Strong fit for Admin and operations, but less distinctive and less inviting for public marketplace discovery.

**Decision:** Use Direction A as the product-wide visual language and borrow Direction B's information density only inside Admin and data-heavy entrepreneur screens. This gives BBG a unified brand without making public marketplace screens look like an internal ERP.

## 5. Proposed implementation sequence

| Phase | Work | Exit criteria |
|---|---|---|
| 0 | Route/API traceability and contract gaps | Matrix checked against repository routes/controllers; unresolved contracts recorded |
| 1 | Design system and app shell | Tokens, typography, layouts, navigation and responsive primitives |
| 2 | Core infrastructure | Typed ApiService, error normalization, auth/session, permission guards, tenant-state boundary |
| 3 | Public marketplace | Home, directory, storefront, product detail and promotions with real API adapters |
| 4 | Consumer | Dashboard, profile, addresses, cart/orders, enquiries and engagement where supported |
| 5 | Entrepreneur | Business application/status, subscriptions, catalogue, promotions, incoming orders/enquiries |
| 6 | Administrator | Users, business/subscription review, categories, analytics, moderation and safe health |
| 7 | PWA/accessibility | Manifest, icons, offline shell, update prompt, cache exclusions, accessibility pass |
| 8 | QA/release readiness | Unit/component, Playwright E2E, responsive, security-boundary and production-build checks |

## 6. Non-negotiable implementation controls

- All frontend commits target `feature/frontend-development`.
- Do not modify files under `backend/`, database scripts, migrations or database objects.
- Do not invent endpoints, methods, request fields, response properties, permissions or commercial rules.
- Do not mark a workflow live when the backend route/action/DTO is not verified.
- Keep access tokens in memory only.
- Never cache authenticated API responses or tenant-private data in the PWA.
- Unknown permission must deny access.
- Backend authorization remains authoritative.
- No active navigation to conditional workspace or future purchasing/inventory modules.

## 7. Current completion snapshot

### Changes committed during this implementation increment

- Added `frontend/src/app/core/http/api.models.ts`, `api-error.ts` and `api.service.ts`.
- Refactored the existing authentication service to use the centralized POST client while preserving the checked-in auth request envelope and cookie/CSRF behavior.
- Fixed the auth interceptor's production-mode URL matching: an empty production API base URL previously matched every request and could attach the BBG bearer token to unrelated absolute URLs. The interceptor now limits token attachment to BBG API paths.
- Added initial BBG color, spacing, radius, shadow and motion tokens in `src/styles.scss`, retaining aliases for the existing starter UI.
- Added the route/API matrix, implementation audit and design direction documents under `frontend/docs/`.

These changes are committed to `feature/frontend-development`. Angular build/tests have not been executed in this environment; compile/runtime verification remains required.

| Deliverable | Status |
|---|---|
| Repository/branch audit | Complete |
| Frontend stack audit | Complete |
| Backend route catalogue extraction | Complete |
| API-to-screen mapping | Committed in `docs/frontend-api-mapping.md`; service/runtime verification pending |
| Design direction | Selected and documented in `docs/design-system.md` |
| Design system implementation | Initial centralized SCSS tokens implemented; component system pending |
| Angular role layouts/routes | Not started |
| Feature API DTOs/services | Shared `ApiService`, typed envelope and error normalization added; feature DTOs/services pending |
| Consumer/Entrepreneur/Admin pages | Not started |
| PWA | Not started |
| Unit/component tests | Existing starter only; feature coverage not started |
| Playwright E2E | Not started |
| Production validation | Not run; remote repository changes have not been built locally |
