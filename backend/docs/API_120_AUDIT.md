# BBG API Audit — Original 120 Endpoints

**Audit date:** 13 November 2026  
**Repository:** `pawaprathamr593/BBG`  
**Working branch:** `fix/bbg-seven-layer-audit`  
**Audited baseline:** `b57f18be68426b7425ef7cda2187b8871c231d6c`  
**Scope:** The original 120 POST API endpoints. The subsequently added `POST /api/v1/catalogue/products/media/upload-url` is excluded from the 120-endpoint inventory and is assessed separately as an S3 extension.

## 1. Executive summary

The route inventory contains **120 original POST endpoints across 15 modules**. The current branch registers 122 POST routes: the original 120 plus the product-media and subscription-proof S3 upload-URL routes.

This was a **static source audit**, not a live API penetration test. The audit traced the route/controller/DTO/versioned-service/core-service/DAO paths, inspected SQL construction and tenant checks, compared DAO table usage with the supplied database design, and checked the current CI workflow result.

| Area | Result |
|---|---|
| Original endpoint count | 120 |
| Current registered POST routes | 122 (120 original + 2 S3 upload URLs) |
| Route groups | 15 |
| Seven-layer structure | Present in the repository |
| InDto / Versioned Services | Generally follow the expected factory/delegation pattern |
| Core action dispatch | **Remediated:** all module Level 1 dispatchers now use route-derived `actionType`; Catalogue was already compliant |
| Route-to-worker binding | **Remediated:** controllers derive operation values from matched routes and overwrite body action selectors |
| DAO SQL | Parameter binding is generally used; three wildcard SELECTs remain in AdminDao |
| Tenant/permission checks | Implemented in the reviewed private-operation flows; see module review |
| Product image S3 | Presigned upload + object verification implemented |
| Subscription proof S3 | Presigned upload URL and server-side object verification implemented; live S3 test pending |
| Database design alignment | **Documented in v2.1 amendment:** CARTS/CART_ITEMS adopted as tables 69–70; three BUSINESS_APPLICATION* tables documented as migration-only/dormant |
| CI | Run #43374241981 completed successfully on remediation commit `d4b23cc4e53df36a3ac0c42f83d66cf834953720`; covers PHP syntax, static route/actionType checks and clean MySQL migrations |
| End-to-end/security tests | Not demonstrated by the current workflow |

**Overall assessment: P1 source-level corrections implemented; NOT READY FOR PRODUCTION API SIGN-OFF.** CI syntax/migration validation and live endpoint/S3 integration tests remain required. The source audit is not a penetration test.

## 2. Audit criteria

The audit used these supplied project sources as the authority:

1. `.agents.zip` — seven-layer architecture and coding rules.
2. `BBG_Backend_Architecture_v1.0.md` — Yii 3 adaptation and request/response, tenant, DAO, transaction and security conventions.
3. `BBG_Database_Design_Final_v2.0.md` — 68-table data dictionary, common columns, A/Z soft deletion and logical relationships.
4. Current repository source on `fix/bbg-seven-layer-audit`.

Each route was checked for:

- Route registration and controller handler.
- Controller-to-Versioned Services delegation.
- InDto construction and parameter envelope.
- Core Services Level 1/Level 2 dispatch.
- Authentication, tenant membership and permission checks in the relevant worker.
- DAO method usage, parameterized SQL, active-row filters and tenant predicates.
- Soft-delete/audit-field handling for writes.
- Database table/column alignment where visible from the supplied schema and migrations.
- Known workflow gaps and verification coverage.

## 3. Findings by severity

### P1 — Must resolve before production sign-off

#### API-AUD-001 — Core Services dispatch does not consistently follow the required actionType rule

**Affected modules:** Admin, Auth, Business, Cart, Customer, Dashboard, Engagement, Enquiry, Marketplace, Order, Payment, Promotion, Subscription and Tenant.

The supplied `.agents` rules specify that Level 1 Core Services validates the envelope and switches directly on `actionType` to the Level 2 worker. In the current implementation, these 14 modules first validate a generic module action such as `getBusiness` or `manageAdmin`, then dispatch again using `actionData['action']`.

Catalogue is the only module currently dispatching directly on the route-derived `actionType`.

**Impact:** Two competing action selectors exist. The code is harder to reason about, the route contract is not consistently authoritative, and the implementation diverges from the locked seven-layer rule.

**Required correction:** Make the route-derived operation the `actionType` value and dispatch directly to the corresponding Level 2 worker. Preserve existing public paths, request fields unrelated to the action selector, and response payloads. Remove the nested `actionData.action` discriminator only after controller and Core Services are updated together.

#### API-AUD-002 — URL path is not bound to the operation for 12 modules

**Affected modules:** Admin, Auth, Business, Cart, Customer, Dashboard, Engagement, Enquiry, Payment, Promotion, Subscription and Tenant.

For ten modules, controllers build a path-to-action map but do not forward the mapped action to Core Services. Auth and Cart do not have a complete path-to-action map in their controllers. The Core Services then use the client-provided `actionData.action` to choose the worker.

Marketplace and Order do copy the route-selected action into `actionData`, but still use the second Core Services dispatch described in API-AUD-001. Catalogue passes the mapped action as `actionType` and is the current reference implementation.

**Impact:** The operation represented by a URL is not consistently the operation executed by the server. For example, a request to one management URL can select another management worker in the same module by changing the body action. The reviewed workers still perform their own authorization checks, so this finding is not, by itself, proof of an authorization bypass; it is a route-contract and control-flow defect that can lead to unintended operations and confusing audit trails.

**Required correction:** Derive the action from the registered route on the server, pass it as `actionType`, and reject unknown route/action combinations. Never trust a client-supplied action selector when the URL already defines the operation.

#### API-AUD-003 — Subscription proof metadata is not backed by verified S3 upload

**Affected endpoint:** `POST /api/v1/subscriptions/proofs/submit`.

The Core Service checks that `proof_file_path` starts with `tenants/{tenantId}/subscription-proofs/` and rejects absolute paths, traversal fragments and URL schemes. It then stores the supplied path. It does not call S3 to verify that the object exists, is owned by the tenant, has an allowed MIME type, or is within a size limit. There is no subscription-proof presigned upload-URL endpoint in the current route inventory.

The API catalogue describes the reference as server-issued, but the current code does not issue it.

**Impact:** A tenant-authorized caller can submit a fabricated or unverified object key as payment-proof metadata. The record may appear to have a proof file when no valid file exists.

**Required correction:** Add a dedicated proof upload-URL flow using the same private-bucket approach as product media, or explicitly keep proof submission disabled until storage is implemented. Verify S3 object ownership, MIME, actual size and file signature before inserting proof metadata. Do not treat a path-prefix check as proof of upload.

#### API-AUD-004 — Runtime schema and authoritative database document are out of sync

The supplied Database Design Final v2.0 defines 68 tables and does not define `CARTS`, `CART_ITEMS`, `BUSINESS_APPLICATIONS`, `BUSINESS_APPLICATION_DOCUMENTS` or `BUSINESS_APPLICATION_REVIEWS`.

Migration `20261112_001_business_application_and_cart.sql` creates all five additional tables. CartDao uses `CARTS` and `CART_ITEMS`, so these two are active runtime dependencies. The current BusinessDao business-application flow instead reads/writes `BUSINESS_PROFILES`; the three `BUSINESS_APPLICATION*` tables created by the migration are not used by the reviewed BusinessDao/Core Services flow.

**Impact:** The repository has a schema extension that is not captured in the authoritative data dictionary, plus three apparently unused business-application tables. This creates ambiguity for database deployment, future migrations and API implementation.

**Required correction:** Reconcile with the project owner and database architect. Either add the approved cart tables to a versioned database-design document and document their columns/constraints, or redesign Cart against an approved schema. Decide whether business applications are represented by `BUSINESS_PROFILES` or the new application tables; remove or implement the unused tables only through an approved migration plan. Do not silently treat the extra tables as part of the 68-table design.

### P2 — Resolve before broad rollout

#### API-AUD-005 — AdminDao uses wildcard SELECTs

**Affected DAO methods:**
- `AdminDao::getBusinessForReview()` — selects `bp.*`.
- `AdminDao::getSubscriptionForReview()` — selects `ts.*`.
- `AdminDao::getModerationReport()` — selects `*` from `CONTENT_REPORTS`.

The backend architecture explicitly requires selected column lists and advises against wildcard reads.

**Impact:** Unnecessary columns can be exposed to higher layers, schema changes can silently alter response contents, and the query contract is less auditable.

**Required correction:** Replace each wildcard with the exact columns needed by its corresponding Core Service and admin response. Confirm that sensitive/internal fields are intentionally included.

#### API-AUD-006 — Business application category reference is not validated in Core Services

**Affected endpoints:** `POST /api/v1/business/application/submit`, `/update` and `/resubmit`.

The service validates `primary_category_id` as a positive integer but the reviewed business-application worker does not verify that the referenced global category exists, is active and is of the appropriate category type before writing the business profile.

**Impact:** Because the supplied database design uses logical relationships rather than physical foreign keys, an invalid or inactive category ID can be persisted unless another database constraint prevents it.

**Required correction:** Add a DAO lookup for the active eligible category and validate it in Core Services before insert/update. Keep the category validation in the business layer, not in the DAO.

#### API-AUD-007 — Authentication throttling is not present in the inspected backend source tree

No rate-limiting/throttling middleware or service was found in the current source tree. This particularly affects login, registration, refresh attempts, public view recording and enquiry creation.

**Impact:** The current implementation has no visible application-level control for repeated credential guesses or high-volume abuse. Infrastructure-level controls may exist outside this repository, but were not available for this audit.

**Required correction:** Add configurable throttling at the appropriate edge/application boundary, with stricter limits for login/refresh and abuse controls for public write-like endpoints. Confirm proxy/IP trust configuration before relying on client IP headers.

#### API-AUD-008 — Cart checkout performs monetary arithmetic using PHP floating-point values

**Affected endpoints:** `POST /api/v1/cart/checkout` and `POST /api/v1/cart/get`.

CartServices converts quantity, unit price and tax values to PHP floats, calculates line values with `round()`, and accumulates subtotal/tax using floats. The database design deliberately retains DOUBLE monetary columns and warns about floating-point approximation risk.

**Impact:** Repeated arithmetic and rounding can produce small discrepancies between line totals, subtotal, tax and grand total, especially as cart sizes grow.

**Required correction:** Keep the approved schema types unchanged unless separately approved, but use a deterministic money-calculation strategy (for example, integer minor units for currency calculations) and add tests for fractional quantities, tax rounding and multi-line totals.

#### API-AUD-009 — Enquiry message history has no visible pagination/limit

**Affected endpoint:** `POST /api/v1/enquiries/mine/detail` and `POST /api/v1/enquiries/tenant/detail`.

The service loads the full message list for the enquiry through `EnquiryDao::getMessages()`; the DAO query does not accept a page size or offset.

**Impact:** Long-running enquiry threads can return increasingly large payloads and increase database/memory work.

**Required correction:** Add bounded pagination or a documented latest-message window, preserving chronological ordering and authorization.

#### API-AUD-010 — Concurrency-sensitive quota checks need transactional/unique enforcement

The reviewed service flows use check-then-write patterns for subscription request/proof creation and product-limit enforcement. The code checks existing rows/counts and then performs inserts or updates. The audit did not establish database uniqueness/locking guarantees for every invariant.

**Impact:** Concurrent requests may pass the same precondition and create duplicate pending records or exceed the product limit.

**Required correction:** For each invariant, document the concurrency guarantee and enforce it with a transaction/row lock or a suitable unique/index constraint where supported by the approved schema. Add concurrent integration tests. Do not add constraints without checking the database design and existing data.

## 4. Positive findings / controls observed

- All 15 modules have InDto, Controller, Versioned Services and Core Services implementation files, and matching DAO classes.
- InDtoObjectFactory maps the module parameter array into the InDto property and rejects non-array module envelopes.
- The DAO implementations generally use Yii 3 parameter binding. The dynamic SQL fragments observed are based on fixed application-controlled clauses with user values passed as bound parameters; no direct raw user-value interpolation was identified in the inspected DAO patterns.
- DAO method signatures generally take the database connection first and scalar arguments after it.
- Model is retained as reference/scaffolding and is not used as the new persistence layer, consistent with the supplied architecture.
- Standard response arrays use `status`, `msgArr` and `data`; failure paths generally return empty data arrays.
- Reviewed tenant operations derive the principal from the access token and check tenant membership/permissions before tenant reads/writes. Specific examples include tenant member listing, tenant order management, payment viewing, subscription management, catalogue operations and enquiry responses.
- Admin workers use platform-scoped permission checks; tenant roles are not used as platform authority.
- Standard DAO reads and writes generally filter `status='A'`; ordinary delete operations use A/Z soft deletion rather than physical DELETE.
- Order status changes are restricted to the currently supported lifecycle transitions in Core Services and persisted with history.
- Payment APIs are read-only in the current scope. No payment gateway, webhook, reconciliation or refund mutation is claimed.
- Product media and subscription proofs use S3 presigned PUT URLs with tenant-scoped generated keys and server-side object metadata/signature/size verification. Business verification document binary storage remains unimplemented.

## 5. Module-level audit summary

| Module | Original routes | Core dispatch | Route action binding | Authentication / authorization observations | Main module-specific notes |
|---|---:|---|---|---|---|
| Auth | 8 | Nested body action | Not route-bound | Access-token principal resolution, rotating refresh sessions, refresh-cookie handling and CSRF header check for refresh/logout are present | No visible rate limiting; URL and body operation can disagree |
| Cart | 7 | Nested body action | Not route-bound | Authenticated user owns cart; storefront availability is checked | Checkout transaction/locking exists; float money arithmetic; CARTS/CART_ITEMS absent from DB v2.0 |
| Orders | 7 | Generic L1 then nested body action | Route action copied to body | Customer history is identity-scoped; tenant operations check tenant order-management permission | Lifecycle transitions are restricted; integration/concurrency tests remain outstanding |
| Marketplace | 8 | Nested body action | Route action copied to body | Public reads filter approved/published active businesses/products/promotions | Convert to direct actionType dispatch; public abuse throttling not found |
| Tenant | 3 | Nested body action | Route map not forwarded | Own-tenant queries are membership-scoped; member list checks TENANT_MEMBERS_VIEW | No tenant-management write routes are exposed; manageTenant worker explicitly rejects out-of-scope actions |
| Business | 11 | Nested body action | Route map not forwarded | Application/profile access is tied to authenticated owner in the reviewed flow | Validate primary_category_id; no verification-document upload flow |
| Catalogue | 13 | Direct actionType dispatch | Direct route-derived actionType | Tenant context/permission checks; product ownership and plan limits are checked | Best-conforming dispatch; S3 product media verification implemented |
| Customers | 6 | Nested body action | Route map not forwarded | Customer identity and tenant-customer context scope address operations | Bind each URL to its operation; verify address/default concurrency |
| Enquiries | 7 | Nested body action | Route map not forwarded | Customer identity is used for own enquiries; tenant responses require tenant permission | Message history is unbounded |
| Promotions | 8 | Nested body action | Route map not forwarded | Tenant permission and promotion entitlement checks are present | Check quota enforcement under concurrent writes |
| Engagement | 5 | Nested body action | Route map not forwarded | Authenticated principal for likes/comments/reports; public view path can be anonymous | Rate limiting/abuse controls not found |
| Subscriptions | 6 | Nested body action | Route map not forwarded | Tenant permission required for subscription management | Proof object is not verified against S3; no upload-url route |
| Admin | 25 | Nested body action | Route map not forwarded | Platform permission context is checked by admin workers | Three wildcard SELECTs; platform actions still body-selected |
| Payments | 4 | Nested body action | Route map not forwarded | Customer identity and PAYMENTS_VIEW tenant permission are checked | Read-only scope; no collection/verification mutation |
| Dashboard | 2 | Nested body action | Route map not forwarded | Consumer summary is own-user scoped; entrepreneur summary checks tenant membership permission | Route action not forwarded; summary SQL needs integration tests |

## 6. Original 120-endpoint inventory

The following inventory excludes the later S3 upload-URL endpoint. Every route is currently registered as POST.

| Endpoint | Module | Controller handler | Current action binding |
|---|---|---|---|
| `/api/v1/auth/register` | Auth | `actionManageAuth` | Not route-bound; body action selects worker |
| `/api/v1/auth/login` | Auth | `actionManageAuth` | Not route-bound; body action selects worker |
| `/api/v1/auth/refresh` | Auth | `actionManageAuth` | Not route-bound; body action selects worker |
| `/api/v1/auth/logout` | Auth | `actionManageAuth` | Not route-bound; body action selects worker |
| `/api/v1/auth/logout-all` | Auth | `actionManageAuth` | Not route-bound; body action selects worker |
| `/api/v1/auth/profile` | Auth | `actionGetAuth` | Not route-bound; body action selects worker |
| `/api/v1/auth/profile/update` | Auth | `actionManageAuth` | Not route-bound; body action selects worker |
| `/api/v1/auth/permissions` | Auth | `actionGetAuth` | Not route-bound; body action selects worker |
| `/api/v1/cart/get` | Cart | `actionGetCart` | Not route-bound; body action selects worker |
| `/api/v1/cart/add` | Cart | `actionManageCart` | Not route-bound; body action selects worker |
| `/api/v1/cart/update` | Cart | `actionManageCart` | Not route-bound; body action selects worker |
| `/api/v1/cart/remove` | Cart | `actionManageCart` | Not route-bound; body action selects worker |
| `/api/v1/cart/clear` | Cart | `actionManageCart` | Not route-bound; body action selects worker |
| `/api/v1/cart/checkout` | Cart | `actionManageCart` | Not route-bound; body action selects worker |
| `/api/v1/cart/whatsapp-order` | Cart | `actionManageCart` | Not route-bound; body action selects worker |
| `/api/v1/orders/list` | Order | `actionGetOrders` | Route mapped to actionData; Core re-dispatches |
| `/api/v1/orders/detail` | Order | `actionGetOrders` | Route mapped to actionData; Core re-dispatches |
| `/api/v1/orders/tenant/list` | Order | `actionGetOrders` | Route mapped to actionData; Core re-dispatches |
| `/api/v1/orders/tenant/detail` | Order | `actionGetOrders` | Route mapped to actionData; Core re-dispatches |
| `/api/v1/orders/tenant/status` | Order | `actionManageOrders` | Route mapped to actionData; Core re-dispatches |
| `/api/v1/orders/tenant/confirm` | Order | `actionManageOrders` | Route mapped to actionData; Core re-dispatches |
| `/api/v1/orders/tenant/cancel` | Order | `actionManageOrders` | Route mapped to actionData; Core re-dispatches |
| `/api/v1/marketplace/businesses/list` | Marketplace | `actionGetMarketplace` | Route mapped to actionData; Core re-dispatches |
| `/api/v1/marketplace/businesses/detail` | Marketplace | `actionGetMarketplace` | Route mapped to actionData; Core re-dispatches |
| `/api/v1/marketplace/products/list` | Marketplace | `actionGetMarketplace` | Route mapped to actionData; Core re-dispatches |
| `/api/v1/marketplace/products/detail` | Marketplace | `actionGetMarketplace` | Route mapped to actionData; Core re-dispatches |
| `/api/v1/marketplace/home` | Marketplace | `actionGetMarketplace` | Route mapped to actionData; Core re-dispatches |
| `/api/v1/marketplace/categories/list` | Marketplace | `actionGetMarketplace` | Route mapped to actionData; Core re-dispatches |
| `/api/v1/marketplace/promotions/list` | Marketplace | `actionGetMarketplace` | Route mapped to actionData; Core re-dispatches |
| `/api/v1/marketplace/promotions/detail` | Marketplace | `actionGetMarketplace` | Route mapped to actionData; Core re-dispatches |
| `/api/v1/tenants/mine/list` | Tenant | `actionGetTenant` | Route map not forwarded; body action selects worker |
| `/api/v1/tenants/mine/detail` | Tenant | `actionGetTenant` | Route map not forwarded; body action selects worker |
| `/api/v1/tenants/members/list` | Tenant | `actionGetTenant` | Route map not forwarded; body action selects worker |
| `/api/v1/business/application/submit` | Business | `actionManageBusiness` | Route map not forwarded; body action selects worker |
| `/api/v1/business/application/get` | Business | `actionGetBusiness` | Route map not forwarded; body action selects worker |
| `/api/v1/business/application/update` | Business | `actionManageBusiness` | Route map not forwarded; body action selects worker |
| `/api/v1/business/application/resubmit` | Business | `actionManageBusiness` | Route map not forwarded; body action selects worker |
| `/api/v1/business/profile/get` | Business | `actionGetBusiness` | Route map not forwarded; body action selects worker |
| `/api/v1/business/profile/update` | Business | `actionManageBusiness` | Route map not forwarded; body action selects worker |
| `/api/v1/business/verification/get` | Business | `actionGetBusiness` | Route map not forwarded; body action selects worker |
| `/api/v1/business/storefront/get` | Business | `actionGetBusiness` | Route map not forwarded; body action selects worker |
| `/api/v1/business/storefront/update` | Business | `actionManageBusiness` | Route map not forwarded; body action selects worker |
| `/api/v1/business/storefront/publish` | Business | `actionManageBusiness` | Route map not forwarded; body action selects worker |
| `/api/v1/business/storefront/unpublish` | Business | `actionManageBusiness` | Route map not forwarded; body action selects worker |
| `/api/v1/catalogue/units/list` | Catalogue | `actionGetCatalogue` | Direct actionType binding |
| `/api/v1/catalogue/categories/list` | Catalogue | `actionGetCatalogue` | Direct actionType binding |
| `/api/v1/catalogue/categories/create` | Catalogue | `actionManageCatalogue` | Direct actionType binding |
| `/api/v1/catalogue/categories/update` | Catalogue | `actionManageCatalogue` | Direct actionType binding |
| `/api/v1/catalogue/categories/delete` | Catalogue | `actionManageCatalogue` | Direct actionType binding |
| `/api/v1/catalogue/products/list` | Catalogue | `actionGetCatalogue` | Direct actionType binding |
| `/api/v1/catalogue/products/detail` | Catalogue | `actionGetCatalogue` | Direct actionType binding |
| `/api/v1/catalogue/products/create` | Catalogue | `actionManageCatalogue` | Direct actionType binding |
| `/api/v1/catalogue/products/update` | Catalogue | `actionManageCatalogue` | Direct actionType binding |
| `/api/v1/catalogue/products/delete` | Catalogue | `actionManageCatalogue` | Direct actionType binding |
| `/api/v1/catalogue/products/media/list` | Catalogue | `actionGetCatalogue` | Direct actionType binding |
| `/api/v1/catalogue/products/media/link` | Catalogue | `actionManageCatalogue` | Direct actionType binding |
| `/api/v1/catalogue/products/media/delete` | Catalogue | `actionManageCatalogue` | Direct actionType binding |
| `/api/v1/customers/profile` | Customer | `actionGetCustomer` | Route map not forwarded; body action selects worker |
| `/api/v1/customers/addresses/list` | Customer | `actionGetCustomer` | Route map not forwarded; body action selects worker |
| `/api/v1/customers/addresses/create` | Customer | `actionManageCustomer` | Route map not forwarded; body action selects worker |
| `/api/v1/customers/addresses/update` | Customer | `actionManageCustomer` | Route map not forwarded; body action selects worker |
| `/api/v1/customers/addresses/delete` | Customer | `actionManageCustomer` | Route map not forwarded; body action selects worker |
| `/api/v1/customers/addresses/default` | Customer | `actionManageCustomer` | Route map not forwarded; body action selects worker |
| `/api/v1/enquiries/create` | Enquiry | `actionManageEnquiry` | Route map not forwarded; body action selects worker |
| `/api/v1/enquiries/mine/list` | Enquiry | `actionGetEnquiry` | Route map not forwarded; body action selects worker |
| `/api/v1/enquiries/mine/detail` | Enquiry | `actionGetEnquiry` | Route map not forwarded; body action selects worker |
| `/api/v1/enquiries/tenant/list` | Enquiry | `actionGetEnquiry` | Route map not forwarded; body action selects worker |
| `/api/v1/enquiries/tenant/detail` | Enquiry | `actionGetEnquiry` | Route map not forwarded; body action selects worker |
| `/api/v1/enquiries/tenant/respond` | Enquiry | `actionManageEnquiry` | Route map not forwarded; body action selects worker |
| `/api/v1/enquiries/tenant/close` | Enquiry | `actionManageEnquiry` | Route map not forwarded; body action selects worker |
| `/api/v1/promotions/mine/list` | Promotion | `actionGetPromotion` | Route map not forwarded; body action selects worker |
| `/api/v1/promotions/mine/detail` | Promotion | `actionGetPromotion` | Route map not forwarded; body action selects worker |
| `/api/v1/promotions/create` | Promotion | `actionManagePromotion` | Route map not forwarded; body action selects worker |
| `/api/v1/promotions/update` | Promotion | `actionManagePromotion` | Route map not forwarded; body action selects worker |
| `/api/v1/promotions/delete` | Promotion | `actionManagePromotion` | Route map not forwarded; body action selects worker |
| `/api/v1/promotions/publish` | Promotion | `actionManagePromotion` | Route map not forwarded; body action selects worker |
| `/api/v1/promotions/unpublish` | Promotion | `actionManagePromotion` | Route map not forwarded; body action selects worker |
| `/api/v1/promotions/engagement` | Promotion | `actionGetPromotion` | Route map not forwarded; body action selects worker |
| `/api/v1/engagement/likes/toggle` | Engagement | `actionManageEngagement` | Route map not forwarded; body action selects worker |
| `/api/v1/engagement/comments/list` | Engagement | `actionGetEngagement` | Route map not forwarded; body action selects worker |
| `/api/v1/engagement/comments/create` | Engagement | `actionManageEngagement` | Route map not forwarded; body action selects worker |
| `/api/v1/engagement/reports/create` | Engagement | `actionManageEngagement` | Route map not forwarded; body action selects worker |
| `/api/v1/engagement/views/record` | Engagement | `actionManageEngagement` | Route map not forwarded; body action selects worker |
| `/api/v1/subscriptions/plans/list` | Subscription | `actionGetSubscription` | Route map not forwarded; body action selects worker |
| `/api/v1/subscriptions/mine/list` | Subscription | `actionGetSubscription` | Route map not forwarded; body action selects worker |
| `/api/v1/subscriptions/mine/detail` | Subscription | `actionGetSubscription` | Route map not forwarded; body action selects worker |
| `/api/v1/subscriptions/request` | Subscription | `actionManageSubscription` | Route map not forwarded; body action selects worker |
| `/api/v1/subscriptions/renewal/request` | Subscription | `actionManageSubscription` | Route map not forwarded; body action selects worker |
| `/api/v1/subscriptions/proofs/submit` | Subscription | `actionManageSubscription` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/users/list` | Admin | `actionGetAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/users/detail` | Admin | `actionGetAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/users/suspend` | Admin | `actionManageAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/users/restore` | Admin | `actionManageAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/businesses/pending/list` | Admin | `actionGetAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/businesses/detail` | Admin | `actionGetAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/businesses/approve` | Admin | `actionManageAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/businesses/reject` | Admin | `actionManageAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/businesses/reopen` | Admin | `actionManageAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/subscriptions/pending/list` | Admin | `actionGetAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/subscriptions/detail` | Admin | `actionGetAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/subscriptions/active/list` | Admin | `actionGetAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/subscriptions/approve` | Admin | `actionManageAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/subscriptions/reject` | Admin | `actionManageAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/categories/list` | Admin | `actionGetAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/categories/stats` | Admin | `actionGetAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/categories/create` | Admin | `actionManageAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/categories/update` | Admin | `actionManageAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/categories/delete` | Admin | `actionManageAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/analytics/summary` | Admin | `actionGetAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/analytics/trends` | Admin | `actionGetAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/moderation/queue` | Admin | `actionGetAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/moderation/history` | Admin | `actionGetAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/moderation/action` | Admin | `actionManageAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/admin/health/summary` | Admin | `actionGetAdmin` | Route map not forwarded; body action selects worker |
| `/api/v1/payments/mine/list` | Payment | `actionGetPayment` | Route map not forwarded; body action selects worker |
| `/api/v1/payments/mine/detail` | Payment | `actionGetPayment` | Route map not forwarded; body action selects worker |
| `/api/v1/payments/tenant/list` | Payment | `actionGetPayment` | Route map not forwarded; body action selects worker |
| `/api/v1/payments/tenant/detail` | Payment | `actionGetPayment` | Route map not forwarded; body action selects worker |
| `/api/v1/dashboard/consumer/summary` | Dashboard | `actionGetDashboard` | Route map not forwarded; body action selects worker |
| `/api/v1/dashboard/entrepreneur/summary` | Dashboard | `actionGetDashboard` | Route map not forwarded; body action selects worker |

**Current additional route, excluded from the original 120:** `POST /api/v1/catalogue/products/media/upload-url` → `CatalogueController::actionManageCatalogue()` → direct `actionType=generateProductMediaUploadUrl`.

## 7. Database and DAO review

### 7.1 Table coverage

The reviewed DAO SQL references the expected current-release tables from the 68-table design, with two additional cart tables used by CartDao:

- `CARTS`
- `CART_ITEMS`

These are created by migration `20261112_001_business_application_and_cart.sql` but are not documented in Database Design Final v2.0.

The same migration creates `BUSINESS_APPLICATIONS`, `BUSINESS_APPLICATION_DOCUMENTS` and `BUSINESS_APPLICATION_REVIEWS`. The reviewed BusinessDao/Core Services flow uses `BUSINESS_PROFILES` as the business-application record and does not use those three additional tables. They should be treated as migration/schema drift until the business application data model is confirmed.

### 7.2 SQL safety and selection

- Parameterized Yii 3 command parameters are used throughout the reviewed DAOs.
- Search filters are assembled from fixed SQL fragments and bound values.
- No physical `DELETE FROM` operation was found in the reviewed DAO files.
- Wildcard SELECTs remain in three AdminDao methods (API-AUD-005).
- DAO reads generally include active status filters and tenant predicates where applicable; the three AdminDao review lookups are platform-scoped operations.
- No physical foreign-key enforcement should be assumed: the supplied database design specifies logical references and Core Services validation.

### 7.3 Common audit columns and soft deletion

The documented five common columns are `status`, `created_by`, `created_on`, `updated_by` and `updated_on`. The additional tables created in migration 001 include these fields. Reviewed DAO writes generally populate actor fields and rely on timestamp defaults/on-update behavior. Soft-delete methods use `status='Z'` and ordinary reads filter `status='A'`.

## 8. Seven-layer conformance matrix

| Layer | Static audit result | Notes |
|---|---|---|
| 1. InDto | Pass with caveat | Module DTOs are present; factory maps the named module parameter array. |
| 2. Controller | Partial | Controllers delegate to V1 Services, but route-derived action is not consistently passed as authoritative actionType. |
| 3. Versioned Services | Pass with caveat | Implementations use InDtoObjectFactory and call the Core Services layer. Public HTTP serialization/status mapping is implemented in controllers. |
| 4. Core Services | **Fail / partial** | 14 modules use a nested action selector rather than direct actionType-to-Level-2 dispatch. Business rules and tenant checks are present in reviewed workers. |
| 5. DAO | Partial | Parameterized queries and connection-first signatures are generally followed; AdminDao wildcard SELECTs remain. |
| 6. Model | Pass | Not used for new persistence operations, consistent with the supplied architecture. |
| 7. Utils | Partial | Shared token, InDto and S3 utilities exist. Subscription proof storage is not integrated with S3. |

## 9. Validation evidence and limitations

### Passed

The latest GitHub Actions run for the audited baseline completed successfully:

- Workflow: **BBG backend validation**
- Run: **254**
- Commit: `b57f18be68426b7425ef7cda2187b8871c231d6c`
- Result: **success**
- PHP 8.4 syntax lint: workflow covers all PHP files under `backend/src` and `backend/config`, plus `backend/yii`.
- MySQL 8.4 clean-database migration job: both additive migrations applied and expected migration tables/generated cart columns verified.

### Not proven by this workflow

- No API endpoint integration tests for the 120 routes.
- No automated cross-tenant IDOR or privilege-escalation suite.
- No auth brute-force/rate-limit tests.
- No concurrent checkout, quota or duplicate-submission tests.
- No verification against the user's existing/live database.
- No real AWS S3 upload/download/delete test with configured bucket credentials.
- No browser/Angular contract test.
- No production deployment or merge to `main`.

A green syntax/migration workflow must not be interpreted as proof that all 120 endpoints behave correctly.

## 10. Recommended correction sequence

1. **Resolve action dispatch and route binding** across all modules, starting with Auth, Admin, Business, Cart, Orders, Customers and Subscriptions. Keep existing public route paths unchanged.
2. **Add subscription proof S3 upload and verification** or disable proof submission until that flow is ready.
3. **Reconcile the database document and migrations** for cart and business application tables; confirm whether BUSINESS_PROFILES or BUSINESS_APPLICATIONS is authoritative.
4. Replace the three AdminDao wildcard SELECTs with explicit fields.
5. Validate the business primary category logical reference in Core Services.
6. Add rate limiting and bounded enquiry message pagination.
7. Add deterministic cart money-calculation tests and concurrency tests for quota checks.
8. Build API integration/security tests covering all 120 original endpoints, then repeat the inventory and mark each endpoint runtime-verified only after tests pass.

## 11. Sign-off

**Static audit status:** Completed for the original 120 registered routes and their implemented module flows.  
**Production sign-off:** Not granted.  
**Recommended next phase:** Correct the dispatch/route-binding design and the subscription-proof storage gap, then add automated API/security tests before production deployment.


---

## 5. P1 remediation update — 13 November 2026

The original findings above describe the audited baseline. The following corrections have since been committed to `fix/bbg-seven-layer-audit`.

| Finding | Remediation | Current status |
|---|---|---|
| API-AUD-001 — Core Services dispatch | All module Level 1 dispatchers now switch/match on the route-derived `actionType`. The validated action is copied into `actionData.action` only for compatibility with existing Level 2 worker logic. | **Source correction implemented** |
| API-AUD-002 — route-to-worker binding | Auth, Cart, Order, Marketplace, Tenant, Business, Catalogue, Customer, Enquiry, Promotion, Engagement, Subscription, Admin, Payment and Dashboard controllers bind the matched route operation to `actionType`. Unknown paths/actions are rejected by controller or dispatcher. | **Source correction implemented** |
| API-AUD-003 — subscription proof S3 | Added `POST /api/v1/subscriptions/proofs/upload-url`. It issues a tenant-scoped, random S3 object key and presigned PUT URL for JPEG, PNG, WebP or PDF. Proof submission verifies S3 existence, actual Content-Type, file signature, extension and actual size before inserting proof metadata. | **Source correction implemented; live S3 verification pending** |
| API-AUD-004 — schema drift | Added `backend/docs/BBG_DATABASE_DESIGN_V2.1_AMENDMENT.md`: `CARTS` and `CART_ITEMS` are canonical tables 69–70; `BUSINESS_APPLICATIONS`, `BUSINESS_APPLICATION_DOCUMENTS` and `BUSINESS_APPLICATION_REVIEWS` are explicitly documented as migration-only/dormant pending a separately approved workflow. | **Documentation reconciliation implemented; live schema not inspected** |

### Validation boundaries

- Existing public API URLs and request/response envelopes were preserved. The new subscription proof upload-URL route is the one approved additive API route.
- The route count is now 122 (120 original routes plus product-media and subscription-proof upload-URL routes).
- `backend/docs/API_ACTION_TYPE_CATALOGUE.md` records the route-derived action catalogue and internal-only `getPrincipal` action.
- `backend/docs/API_V1_SUBSCRIPTION_PROOFS.md` records the upload sequence and request/response contract.
- GitHub Actions syntax and migration checks do not prove API authorization, cross-tenant isolation, real S3 permissions, or full upload/submit behavior.
- No live S3 bucket or production database was accessed. No production merge or deployment was performed.

**Release recommendation:** Keep the branch out of production until the latest workflow passes and endpoint-level tests cover every route action, cross-tenant access, proof upload/submit failure cases, and S3 configuration.
