# BBG Frontend API Mapping & Traceability

**Target branch:** `feature/frontend-development`  
**Repository:** `pawaprathamr593/BBG`  
**Audit date:** 23 November 2026  
**Status:** Initial repository-backed mapping; runtime verification and final permission/payload contracts remain open.

## 1. Source authority and audit notes

- The `backend_architecture.md` architecture/requirements specification is available in the user's Library as a draft, and `BBG_Backend_Architecture_v1.0.md` was also supplied in the project context. Neither is checked into this repository. Both leave some API payload, permission and workflow decisions open; checked-in backend routes/controllers/services remain the authority for implemented behavior.
- Therefore, exact paths and methods below are taken from the checked-in `backend/config/common/routes.php` on `feature/frontend-development`, and controller dispatch mappings are taken from the corresponding controller source.
- All listed routes are registered as **POST** routes. Registration does not, by itself, prove that every underlying service action is complete or operational.
- The backend's internal/public response currently uses `{ status, msgArr, data }` with `SUCCESS | FAILED | EXCEPTION`; exact per-endpoint data DTOs are not yet defined consistently.
- The frontend now includes a shared API client, auth/session infrastructure, scoped permission bootstrap, public marketplace API adapter and authenticated Consumer, Entrepreneur and Platform Administrator workspace shells. Workspace actions use the module envelope verified in each controller. Exact per-action DTO fields remain unconfirmed for several modules; the UI therefore accepts caller-supplied JSON for writes and does not invent field names.

### Local development API origin

The Angular development environment uses a relative API base URL. `ng serve` loads `frontend/proxy.conf.json` and forwards `/api/**` to `http://localhost:8080`. This is a development-server proxy, not a backend CORS policy and not an API contract change.

The checked-in Yii web middleware stack currently contains content negotiation, error handling, request parsing, routing and not-found handling, but no CORS middleware. The API route catalogue registers POST endpoints; a browser cross-origin `OPTIONS` preflight therefore needs CORS handling before routing if the frontend and API are deployed on different origins. Production currently expects same-origin API routing through the web-server reverse proxy. If cross-origin production hosting is selected, implement explicit credentialed CORS in the backend and allow only approved origins.

## 2. Frontend-to-backend mapping

**Status vocabulary**
- **Registered** — exact POST route exists in `backend/config/common/routes.php`.
- **Controller mapped** — controller source contains a path-to-action mapping or dispatch branch.
- **Service/runtime pending verification** — route/controller presence is not a successful runtime integration test.
- **Not present** — no corresponding route was found in the checked-in route catalogue.

### API-AUTH — authentication and session

**Frontend screens:** Login, registration, logout, session restore, profile, access-denied.  
**Calling service:** AuthService using the shared ApiService.  
**Backend controller/service:** `AuthController` / `AuthServicesV1`.

| Method | Exact path | Screen/action | Status / contract |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Register | Registered; implemented in initial auth increment |
| POST | `/api/v1/auth/login` | Login | Registered; implemented in initial auth increment |
| POST | `/api/v1/auth/refresh` | Session restoration/refresh | Registered; rotating HttpOnly cookie; `X-BBG-CSRF: 1` required |
| POST | `/api/v1/auth/logout` | Logout | Registered; cookie + CSRF header |
| POST | `/api/v1/auth/logout-all` | Revoke all sessions | Registered; bearer token required |
| POST | `/api/v1/auth/profile` | Profile read | Registered; bearer token required |
| POST | `/api/v1/auth/profile/update` | Profile edit | Checked-in AuthController/AuthServices/AuthDao implement updateProfile; older AUTH_MODULE_IMPLEMENTATION.md is stale on this point; frontend form not included |
| POST | `/api/v1/auth/permissions` | Permission bootstrap | Controller/service/DAO implementation verified; returns tenant_id and permission records (role_code, scope_type, permission_code, module_code). Tenant ID 0 resolves platform-scope assignments; positive IDs are tenant-scope and membership-checked. |

**Existing frontend DTOs:** LoginRequest, RegisterRequest, AuthResponseData, AuthUser and the permission context/record DTOs. Permission records are returned as role_code, scope_type, permission_code and module_code; the context contains tenant_id and permissions. The checked-in AuthServices returns `tenant_id: null` for the platform permission request (`tenant_id: 0`) and echoes the positive tenant ID for a tenant-scoped request.  
**Missing/uncertain:** profile-update DTO and final error field mapping.  
**Authentication:** login/register public; refresh/logout cookie-based; profile/logout-all bearer-token protected.  
**Provider login:** the backend route catalogue registers provider start/callback routes for Google, Apple, Facebook and Instagram, plus email OTP send/verify routes. The frontend contains popup and email OTP orchestration. Provider credentials, callback URLs, account-linking behavior and live end-to-end verification remain environment-dependent; route registration alone does not make provider sign-in production-ready.

### API-USER — user profile and account management

**Frontend screens:** Profile and account settings.  
**Calling service:** ProfileService is planned; profile read currently belongs to AuthService.  
**Backend mapping:** no standalone /users/* routes found. Profile read is POST /api/v1/auth/profile. The checked-in AuthController and AuthServices contain the updateProfile dispatch and service/DAO implementation for POST /api/v1/auth/profile/update; this conflicts with the older backend/AUTH_MODULE_IMPLEMENTATION.md note that profile update was not part of the initial increment. The checked-in source is newer evidence, but a frontend profile form is not included in this increment.  
**DTO/auth/permission:** reuse no new fields until response schema is confirmed; authenticated profile access. Platform user administration is mapped separately under API-ADMIN.

### API-PUB — public home, directory, storefront and product discovery

**Frontend screens:** Home, business directory, business storefront, public product detail, public promotion feed and promotion detail.  
**Calling service:** MarketplaceService implemented under frontend/src/app/features/marketplace/services/marketplace.service.ts.  
**Backend controller/service:** `MarketplaceController` / `MarketplaceServicesV1`.

| Method | Exact path | Screen/action | Status / contract |
|---|---|---|---|
| POST | `/api/v1/marketplace/home` | Home summary | Registered; controller maps `getHomeSummary` |
| POST | `/api/v1/marketplace/businesses/list` | Business directory | Registered; `listBusinesses` |
| POST | `/api/v1/marketplace/businesses/detail` | Business storefront | Registered; `getBusiness` |
| POST | `/api/v1/marketplace/products/list` | Public product listing | Registered; `listProducts` |
| POST | `/api/v1/marketplace/products/detail` | Public product detail | Registered; `getProduct` |
| POST | `/api/v1/marketplace/categories/list` | Public category browse/filter | Registered; `listPublicCategories` |
| POST | `/api/v1/marketplace/promotions/list` | Promotion feed | Registered; `listPublicPromotions` |
| POST | `/api/v1/marketplace/promotions/detail` | Promotion detail | Registered; `getPublicPromotion` |

**Frontend DTOs/service:** implemented under features/marketplace/models/marketplace.models.ts and features/marketplace/services/marketplace.service.ts. The service uses the confirmed marketplaceParam envelope; the controller overwrites the action from the matched route, and the service dispatches the corresponding action name.  
**Confirmed directory filters:** page, page_size, search, city, state, category_id; pagination response is page, page_size, total, with items.  
**Confirmed detail inputs:** business_slug; product detail uses business_slug + product_id; promotion detail uses promotion_id.  
**Confirmed response groups:** home returns categories, businesses, promotions; business detail returns business + storefront; product detail returns product + variants; promotion detail returns promotion + media.  
**Authentication:** public read; backend DAO queries enforce active tenant/storefront and published/approved business/product/promotion visibility. Backend remains final authority.  
**Remaining verification:** run API integration tests against a disposable local backend and verify that stored media paths resolve through the deployed public media origin.

### API-BUS — entrepreneur business application and profile

**Frontend screens:** Business registration, business profile, verification/status, storefront settings.  
**Calling service:** planned `EntrepreneurBusinessService`.  
**Backend controller/service:** `BusinessController` / `BusinessServicesV1`.

| Method | Exact path | Screen/action | Status / contract |
|---|---|---|---|
| POST | `/api/v1/business/application/submit` | Submit application | Registered; controller maps `submitBusinessApplication` |
| POST | `/api/v1/business/application/get` | View application | Registered; `getMyBusinessApplication` |
| POST | `/api/v1/business/application/update` | Edit application | Registered; `updateBusinessApplication` |
| POST | `/api/v1/business/application/resubmit` | Resubmit application | Registered; `resubmitBusinessApplication` |
| POST | `/api/v1/business/profile/get` | View business profile | Registered; `getMyBusinessProfile` |
| POST | `/api/v1/business/profile/update` | Update business profile | Registered; `updateMyBusinessProfile` |
| POST | `/api/v1/business/verification/get` | Verification status | Registered; `getBusinessVerification` |
| POST | `/api/v1/business/storefront/get` | Storefront settings | Registered; `getMyStorefront` |
| POST | `/api/v1/business/storefront/update` | Update storefront | Registered; `updateMyStorefront` |
| POST | `/api/v1/business/storefront/publish` | Publish storefront | Registered; `publishMyStorefront` |
| POST | `/api/v1/business/storefront/unpublish` | Unpublish storefront | Registered; `unpublishMyStorefront` |

**DTOs:** not yet present.  
**Authentication/permission:** authenticated tenant member; exact permission codes and application lifecycle are pending.  
**Missing contract:** approved application fields, upload requirements, status transitions, approval eligibility and storefront publication rules.

### API-TEN — tenant context

**Frontend screens:** tenant/business context selector and entrepreneur workspace shell.  
**Calling service:** planned `TenantContextService`.  
**Backend controller/service:** `TenantController` / `TenantServicesV1`.

| Method | Exact path | Screen/action | Status / contract |
|---|---|---|---|
| POST | `/api/v1/tenants/mine/list` | List user's tenants | Registered; `listMyTenants` |
| POST | `/api/v1/tenants/mine/detail` | Current tenant detail | Registered; `getMyTenant` |
| POST | `/api/v1/tenants/members/list` | Tenant members | Registered; `listTenantMembers` |

**DTOs:** not yet present.  
**Authentication/permission:** authenticated user; tenant membership must be verified by backend.  
**Missing contract:** tenant selection/activation mechanism, membership permissions, switching semantics and state-reset contract. Do not trust a client-supplied tenant ID as authorization.

### API-PROD — entrepreneur catalogue and product media

**Frontend screens:** Product list/create/edit/detail, product categories, media manager.  
**Calling service:** planned `EntrepreneurProductService`.  
**Backend controller/service:** `CatalogueController` / `CatalogueServicesV1`.

| Method | Exact path | Screen/action | Status / contract |
|---|---|---|---|
| POST | `/api/v1/catalogue/units/list` | Product form unit selector | Registered; `listUnitsOfMeasure` |
| POST | `/api/v1/catalogue/categories/list` | Product category list | Registered; `listTenantProductCategories` |
| POST | `/api/v1/catalogue/categories/create` | Create product category | Registered; `createTenantProductCategory` |
| POST | `/api/v1/catalogue/categories/update` | Update product category | Registered; `updateTenantProductCategory` |
| POST | `/api/v1/catalogue/categories/delete` | Delete product category | Registered; `deleteTenantProductCategory` |
| POST | `/api/v1/catalogue/products/list` | Product list | Registered; `listTenantProducts` |
| POST | `/api/v1/catalogue/products/detail` | Product detail/edit | Registered; `getTenantProduct` |
| POST | `/api/v1/catalogue/products/create` | Create product | Registered; `createTenantProduct` |
| POST | `/api/v1/catalogue/products/update` | Update product | Registered; `updateTenantProduct` |
| POST | `/api/v1/catalogue/products/delete` | Soft-delete product action | Registered; `deleteTenantProduct` |
| POST | `/api/v1/catalogue/products/media/list` | Product media list | Registered; `listProductMedia` |
| POST | `/api/v1/catalogue/products/media/upload-url` | Request media upload URL | Registered; `generateProductMediaUploadUrl` |
| POST | `/api/v1/catalogue/products/media/link` | Link uploaded media | Registered; `linkProductMedia` |
| POST | `/api/v1/catalogue/products/media/delete` | Remove product media | Registered; `deleteProductMedia` |

**DTOs:** not yet present.  
**Authentication/permission:** authenticated tenant member with product/category permissions; exact permission catalogue pending.  
**Missing contract:** field schemas, product publication/approval constraints, upload provider, signed URL expiry, allowed media types/size, pagination and response shape.

### API-CUST — consumer identity and addresses

**Frontend screens:** Consumer profile/customer details, address book and checkout address selection.  
**Calling service:** planned `CustomerService`.

| Method | Exact path | Screen/action | Status / contract |
|---|---|---|---|
| POST | `/api/v1/customers/profile` | Customer profile | Registered; `getMyCustomerProfile` |
| POST | `/api/v1/customers/addresses/list` | Address list | Registered; `listMyAddresses` |
| POST | `/api/v1/customers/addresses/create` | Add address | Registered; `createMyAddress` |
| POST | `/api/v1/customers/addresses/update` | Edit address | Registered; `updateMyAddress` |
| POST | `/api/v1/customers/addresses/delete` | Delete address | Registered; `deleteMyAddress` |
| POST | `/api/v1/customers/addresses/default` | Set default address | Registered; `setDefaultAddress` |

**DTOs:** not yet present.  
**Authentication:** authenticated consumer expected; guest/customer identity rules are pending.  
**Missing contract:** customer identity linking, address fields, validation and guest checkout policy.

### API-ORD — cart and orders

**Frontend screens:** Cart, checkout/order creation, consumer order list/detail, entrepreneur incoming order list/detail/status.  
**Calling services:** planned `CartService`, `ConsumerOrderService`, `IncomingOrderService`.  
**Backend controllers/services:** `CartController` / `CartServicesV1`; `OrderController` / `OrderServicesV1`.

| Method | Exact path | Screen/action | Status / contract |
|---|---|---|---|
| POST | `/api/v1/cart/get` | View cart | Registered; `getCart` |
| POST | `/api/v1/cart/add` | Add item | Registered; `addItem` |
| POST | `/api/v1/cart/update` | Update quantity | Registered; `updateItem` |
| POST | `/api/v1/cart/remove` | Remove item | Registered; `removeItem` |
| POST | `/api/v1/cart/clear` | Clear cart | Registered; `clearCart` |
| POST | `/api/v1/cart/checkout` | Checkout | Registered; `checkout` |
| POST | `/api/v1/cart/whatsapp-order` | WhatsApp order handoff | Registered; `whatsappOrder` |
| POST | `/api/v1/orders/list` | Consumer order list | Registered; `listMyOrders` |
| POST | `/api/v1/orders/detail` | Consumer order detail | Registered; `getMyOrder` |
| POST | `/api/v1/orders/tenant/list` | Incoming orders | Registered; `listTenantOrders` |
| POST | `/api/v1/orders/tenant/detail` | Incoming order detail | Registered; `getTenantOrder` |
| POST | `/api/v1/orders/tenant/status` | Update permitted order status | Registered; confirm controller/service action and transition rules |
| POST | `/api/v1/orders/tenant/confirm` | Confirm order | Registered; confirm controller/service action and transition rules |
| POST | `/api/v1/orders/tenant/cancel` | Cancel order | Registered; confirm controller/service action and transition rules |

**DTOs:** not yet present.  
**Authentication:** cart/checkout/order actions expected to require authenticated customer/tenant context; guest checkout is pending.  
**Missing contract:** cart payload, order snapshots, stock/availability policy, allowed status transitions, idempotency, cancellation rules, pagination and financial calculations. Frontend must display backend-calculated totals and must not claim payment/order success before server confirmation.

### API-PAY — payment records

**Frontend screens:** Consumer order payment detail and entrepreneur payment records, only to the extent supported by approved workflow.  
**Calling service:** planned `PaymentService`.

| Method | Exact path | Screen/action | Status / contract |
|---|---|---|---|
| POST | `/api/v1/payments/mine/list` | Consumer payment list | Registered; `listMyPayments` |
| POST | `/api/v1/payments/mine/detail` | Consumer payment detail | Registered; `getMyPayment` |
| POST | `/api/v1/payments/tenant/list` | Tenant payment list | Registered; `listTenantPayments` |
| POST | `/api/v1/payments/tenant/detail` | Tenant payment detail | Registered; `getTenantPayment` |

**DTOs:** not yet present.  
**Authentication/permission:** authenticated owner/customer or tenant member; exact permissions pending.  
**Missing contract:** payment evidence, status mapping, reconciliation and gateway provider. A QR display or proof upload is not payment confirmation.

### API-ENQ — enquiries

**Frontend screens:** Enquiry form, consumer enquiry list/detail, entrepreneur incoming enquiry list/detail and response.  
**Calling service:** planned `ConsumerEnquiryService` and `IncomingEnquiryService`.

| Method | Exact path | Screen/action | Status / contract |
|---|---|---|---|
| POST | `/api/v1/enquiries/create` | Submit enquiry | Registered; `createCustomerEnquiry` |
| POST | `/api/v1/enquiries/mine/list` | Consumer enquiry list | Registered; `listMyEnquiries` |
| POST | `/api/v1/enquiries/mine/detail` | Consumer enquiry detail | Registered; `getMyEnquiry` |
| POST | `/api/v1/enquiries/tenant/list` | Incoming enquiry list | Registered; `listTenantEnquiries` |
| POST | `/api/v1/enquiries/tenant/detail` | Incoming enquiry detail | Registered; `getTenantEnquiry` |
| POST | `/api/v1/enquiries/tenant/respond` | Respond to enquiry | Registered; `respondToEnquiry` |
| POST | `/api/v1/enquiries/tenant/close` | Close enquiry | Registered; `closeEnquiry` |

**DTOs:** not yet present.  
**Authentication:** guest enquiry policy is pending; consumer history and tenant responses require authenticated ownership/membership.  
**Missing contract:** guest rules, fields, attachment policy, response format and lifecycle transitions.

### API-PROMO — promotions

**Frontend screens:** Public promotion feed/detail; entrepreneur promotion list/create/edit/publish.  
**Calling services:** planned `PublicPromotionService`, `EntrepreneurPromotionService`.

| Method | Exact path | Screen/action | Status / contract |
|---|---|---|---|
| POST | `/api/v1/marketplace/promotions/list` | Public promotion feed | Registered under API-PUB |
| POST | `/api/v1/marketplace/promotions/detail` | Public promotion detail | Registered under API-PUB |
| POST | `/api/v1/promotions/mine/list` | Entrepreneur promotion list | Registered; `listMyPromotions` |
| POST | `/api/v1/promotions/mine/detail` | Entrepreneur promotion detail | Registered; `getMyPromotion` |
| POST | `/api/v1/promotions/create` | Create promotion | Registered; `createPromotion` |
| POST | `/api/v1/promotions/update` | Edit promotion | Registered; `updatePromotion` |
| POST | `/api/v1/promotions/delete` | Delete promotion | Registered; `deletePromotion` |
| POST | `/api/v1/promotions/publish` | Publish promotion | Registered; `publishPromotion` |
| POST | `/api/v1/promotions/unpublish` | Unpublish promotion | Registered; `unpublishPromotion` |
| POST | `/api/v1/promotions/engagement` | Promotion engagement metrics | Registered; `getPromotionEngagement` |

**DTOs:** not yet present.  
**Authentication:** public read; authenticated tenant permissions for management.  
**Missing contract:** media upload mapping, scheduling, moderation/approval rules, status lifecycle and engagement response schema.

### API-ENG — likes, comments, reports and views

**Frontend screens:** Product/promotion engagement controls, comments, report-content dialog.  
**Calling service:** planned `EngagementService`.

| Method | Exact path | Screen/action | Status / contract |
|---|---|---|---|
| POST | `/api/v1/engagement/likes/toggle` | Like/unlike content | Registered; `toggleContentLike` |
| POST | `/api/v1/engagement/comments/list` | Comment list | Registered; `listContentComments` |
| POST | `/api/v1/engagement/comments/create` | Add comment | Registered; `createContentComment` |
| POST | `/api/v1/engagement/reports/create` | Report content | Registered; `reportContent` |
| POST | `/api/v1/engagement/views/record` | Record content view | Registered; `recordContentView` |

**DTOs:** not yet present.  
**Authentication:** view/read policy and anonymous engagement policy require confirmation; mutations require backend validation.  
**Missing contract:** supported content types, duplicate-like behavior, moderation rules and comment pagination.

### API-SUB — plans, subscriptions and payment proof

**Frontend screens:** Subscription plans, request, detail/status, renewal request, payment proof upload.  
**Calling service:** planned `SubscriptionService`.

| Method | Exact path | Screen/action | Status / contract |
|---|---|---|---|
| POST | `/api/v1/subscriptions/plans/list` | Subscription plans | Registered; `listActivePlans` |
| POST | `/api/v1/subscriptions/mine/list` | My subscriptions | Registered; `listMySubscriptions` |
| POST | `/api/v1/subscriptions/mine/detail` | Subscription detail | Registered; `getMySubscription` |
| POST | `/api/v1/subscriptions/request` | Request subscription | Registered; `requestSubscription` |
| POST | `/api/v1/subscriptions/renewal/request` | Request renewal | Registered; `requestSubscriptionRenewal` |
| POST | `/api/v1/subscriptions/proofs/upload-url` | Generate proof upload URL | Registered; `generateSubscriptionProofUploadUrl` |
| POST | `/api/v1/subscriptions/proofs/submit` | Submit proof metadata | Registered; `submitSubscriptionProof` |

**DTOs:** not yet present.  
**Authentication/permission:** authenticated entrepreneur/tenant owner; exact role and approval rules pending.  
**Missing contract:** plan pricing/entitlements, renewal windows, proof policy, file constraints and approval status transitions. Upload success must not be displayed as subscription approval.

### API-ADMIN — platform administration

**Frontend screens:** Admin users, business review queue/detail, subscription review queue/detail, category management.  
**Calling service:** planned feature-scoped admin services; no admin frontend code exists yet.  
**Backend controller/service:** `AdminController` / `AdminServicesV1`.

| Method | Exact path | Screen/action | Status / contract |
|---|---|---|---|
| POST | `/api/v1/admin/users/list` | User management list | Registered; `listPlatformUsers` |
| POST | `/api/v1/admin/users/detail` | User detail | Registered; `getPlatformUser` |
| POST | `/api/v1/admin/users/suspend` | Suspend user | Registered; `suspendPlatformUser` |
| POST | `/api/v1/admin/users/restore` | Restore user | Registered; `restorePlatformUser` |
| POST | `/api/v1/admin/businesses/pending/list` | Business approval queue | Registered; `listPendingBusinesses` |
| POST | `/api/v1/admin/businesses/detail` | Business review detail | Registered; `getBusinessForReview` |
| POST | `/api/v1/admin/businesses/approve` | Approve business | Registered; `approveBusiness` |
| POST | `/api/v1/admin/businesses/reject` | Reject business | Registered; `rejectBusiness` |
| POST | `/api/v1/admin/businesses/reopen` | Reopen business review | Registered; `reopenBusinessReview` |
| POST | `/api/v1/admin/subscriptions/pending/list` | Subscription approval queue | Registered; `listPendingSubscriptions` |
| POST | `/api/v1/admin/subscriptions/detail` | Subscription review detail | Registered; `getSubscriptionForReview` |
| POST | `/api/v1/admin/subscriptions/active/list` | Active subscriptions | Registered; `listActiveSubscriptions` |
| POST | `/api/v1/admin/subscriptions/approve` | Approve subscription | Registered; `approveSubscription` |
| POST | `/api/v1/admin/subscriptions/reject` | Reject subscription | Registered; `rejectSubscription` |
| POST | `/api/v1/admin/categories/list` | Category list | Registered; `listAdminCategories` |
| POST | `/api/v1/admin/categories/stats` | Category statistics | Registered; `getCategoryStatistics` |
| POST | `/api/v1/admin/categories/create` | Create category | Registered; `createCategory` |
| POST | `/api/v1/admin/categories/update` | Update category | Registered; `updateCategory` |
| POST | `/api/v1/admin/categories/delete` | Delete category | Registered; `deleteCategory` |

**DTOs:** not yet present.  
**Authentication/permission:** platform-admin only; exact platform-admin permission catalogue pending.  
**Missing contract:** review notes, rejection reasons, moderation/audit semantics, pagination and permission codes.

### API-AN — analytics

**Frontend screens:** Admin analytics summary and trends.  
**Calling service:** planned `AdminAnalyticsService`.

| Method | Exact path | Screen/action | Status / contract |
|---|---|---|---|
| POST | `/api/v1/admin/analytics/summary` | Analytics overview | Registered; `getAdminAnalyticsSummary` |
| POST | `/api/v1/admin/analytics/trends` | Analytics trends | Registered; `getAdminAnalyticsTrends` |

**DTOs:** not yet present.  
**Authentication/permission:** platform-admin only.  
**Missing contract:** metric definitions, date-range/filter DTOs, aggregation timezone and response shape.

### API-MOD — moderation

**Frontend screens:** Moderation queue, report detail, action dialog, moderation history.  
**Calling service:** planned `ModerationService`.

| Method | Exact path | Screen/action | Status / contract |
|---|---|---|---|
| POST | `/api/v1/admin/moderation/queue` | Moderation queue | Registered; `listModerationQueue` |
| POST | `/api/v1/admin/moderation/history` | Moderation history | Registered; `listModerationHistory` |
| POST | `/api/v1/admin/moderation/action` | Apply moderation action | Registered; `applyModerationAction` |

**DTOs:** not yet present.  
**Authentication/permission:** platform-admin/moderator permission only; exact catalogue pending.  
**Missing contract:** action types, content status transitions, reason requirements and audit-history schema.

### API-SYS — system health

**Frontend screens:** Safe system-health overview.  
**Calling service:** planned `SystemHealthService`.

| Method | Exact path | Screen/action | Status / contract |
|---|---|---|---|
| POST | `/api/v1/admin/health/summary` | System health | Registered; `getSafeSystemHealth` |

**DTOs:** not yet present.  
**Authentication/permission:** platform-admin/system-health permission only.  
**Missing contract:** exact safe fields, refresh cadence and availability policy. Never expose secrets, filesystem paths or infrastructure internals.

### API-DASH — role dashboard summaries

**Frontend screens:** Consumer dashboard and Entrepreneur dashboard.  
**Calling service:** planned `ConsumerDashboardService`, `EntrepreneurDashboardService`.

| Method | Exact path | Screen/action | Status / contract |
|---|---|---|---|
| POST | `/api/v1/dashboard/consumer/summary` | Consumer dashboard | Registered; `getConsumerDashboard` |
| POST | `/api/v1/dashboard/entrepreneur/summary` | Entrepreneur dashboard | Registered; `getEntrepreneurDashboard` |

**DTOs:** not yet present.  
**Authentication:** authenticated consumer/tenant member as applicable.  
**Missing contract:** exact metrics, permission rules, date ranges and response DTOs.

## 3. Conditional and missing API groups

The frontend master prompt lists these as conditional tenant-workspace groups. No corresponding route family was found in `backend/config/common/routes.php`; keep these screens and calls out of the active Phase 1 navigation.

| Prompt API group | Expected domain | Repository finding | Frontend decision |
|---|---|---|---|
| API-INV | Invoices | No invoice routes found | Disabled / not implemented |
| API-EXP | Expenses | No expense routes found | Disabled / not implemented |
| API-CASH | Cash sessions and movements | No cash routes found | Disabled / not implemented |
| API-WS | Tenant workspace aggregate | No workspace routes found | Disabled / not implemented |
| API-TEN | Tenant context | Tenant list/detail/member routes exist | Context UI only after selection contract approval |
| API-CUST | Customers and addresses | Customer profile/address routes exist | Consumer/customer feature candidate |

Purchasing and inventory are future scope and must not be activated.

## 4. Cross-cutting integration contract

| Concern | Current evidence | Frontend implementation rule |
|---|---|---|
| HTTP methods | All routes in `routes.php` use POST | Keep POST; do not convert to REST verbs |
| Request envelope | Module controllers read a module-specific `*Param` object with `actionType` and `actionData` | Implement typed module envelopes only after confirming each controller's exact module key |
| Response | `status`, `msgArr`, `data` | Central typed envelope; do not invent data fields |
| Auth access token | In-memory access token in current frontend; backend auth uses bearer token | Never persist token to local/session storage |
| Refresh token | `bbg_refresh` HttpOnly cookie; refresh/logout require `X-BBG-CSRF: 1` | `withCredentials: true` and exact CSRF header on refresh/logout |
| Permissions | Platform-admin and tenant permission catalogue pending | Deny unknown permissions; backend remains authority |
| Tenant context | Membership validation required server-side | Clear tenant feature state on context change; never trust tenant ID |
| Pagination/filtering | Pending in backend architecture | Do not invent parameters; add only when endpoint contract is confirmed |
| Financial values | Backend is authoritative | Display server totals; no client-authoritative calculations |
| File uploads | Upload URL/link routes exist for product media and subscription proof | Model upload and finalize steps separately; do not infer approval |
| PWA caching | Private API response caching prohibited | Cache static shell/assets only; exclude authenticated API responses |

## 5. DTO and service implementation inventory

| Feature | Frontend service | Request DTO | Response DTO | Current frontend status |
|---|---|---|---|---|
| Auth | `AuthService` | Auth request models for login/register; profile-update fields remain open | Auth response/user models | Login, registration, refresh, logout and permission bootstrap implemented; profile update exposed through workspace payload editor |
| Marketplace | `MarketplaceService` | Marketplace request models | Marketplace response models | Implemented against checked-in marketplace source; runtime verification pending |
| Consumer | `WorkspaceApiService` | Backend DTOs not finalized for customer/cart/order/enquiry/payment/engagement | Backend response data rendered without assumed fields | Authenticated workspace and registered route actions exposed; field-specific forms pending |
| Entrepreneur | `WorkspaceApiService` | Business/catalogue/order/enquiry/promotion/subscription DTOs not finalized | Backend response data rendered without assumed fields | Authenticated workspace and registered route actions exposed; tenant selection and field-specific forms pending |
| Platform Administrator | `WorkspaceApiService` | Admin mutation DTOs not finalized | Backend response data rendered without assumed fields | Authenticated workspace and registered admin/analytics/health route actions exposed; approved permission map pending |
| Tenant context | `WorkspaceApiService` | Tenant selector/activation contract not approved | Tenant list/detail/member responses not normalized | Read actions exposed; no tenant switching or inferred tenant ID |
| PWA/offline | Not implemented | N/A | N/A | Deferred; authenticated API responses must never be cached |

## 6. Required next contract checks

1. Verify every registered route against its controller dispatch and Core Service action.
2. Run backend API tests against a disposable local environment; route registration alone is not runtime verification.
3. Confirm module envelope key, exact request payload and response DTO for every route.
4. Approve public/guest access, tenant selection and permission catalogues.
5. Confirm pagination/filter/sort and HTTP error mapping.
6. Confirm product-media and subscription-proof upload lifecycle.
7. Confirm order, payment and subscription lifecycle rules before enabling related state-changing UI.
8. Update this matrix as each integration is verified; never mark a route as complete based only on its presence in `routes.php`.


## 7. Frontend implementation update — 13 November 2026

The public marketplace slice is now implemented on feature/frontend-development:

- MarketplaceService calls the exact registered POST routes and uses the controller-confirmed marketplaceParam envelope.
- Request/response DTOs mirror the current MarketplaceServices and MarketplaceDao source, not database columns inferred as API fields.
- Lazy public screens cover home summary, category links, business directory filters/pagination, business storefront/product list, product detail/variants, promotion feed and promotion detail/media references.
- API loading, empty and error states are included. The UI does not fabricate business/product/promotion records.
- Permission bootstrap uses the checked-in /api/v1/auth/permissions action and verified record structure. Platform permissions load after login/session refresh; tenant-scoped permissions require an explicit tenant ID and are not activated by a guessed tenant context.
- Tests have been added for marketplace request envelopes/filter fields and permission scope isolation. They have not yet been executed.

The full Angular build, test suite, browser checks and local API integration remain pending; this update is implementation evidence, not a production-readiness claim.


## 10. Workspace frontend integration

The frontend workspace configuration is in `frontend/src/app/features/workspaces/workspace.config.ts`; the shared page and API adapter are `workspace.ts` and `workspace-api.service.ts`. The route shells are `/consumer`, `/entrepreneur` and `/admin`, and require an authenticated session.

| Workspace | Registered route families exposed in the UI |
|---|---|
| Consumer | Dashboard summary, customer profile and addresses, cart, orders, enquiries, engagement and payments |
| Entrepreneur | Dashboard summary, tenant list/detail/members, business application/profile/verification/storefront, catalogue/categories/units/product media, incoming orders, enquiries, promotions, subscriptions and payments |
| Platform Administrator | Users, business review, subscriptions, categories, analytics, moderation and safe health summary |

The shared API adapter posts the configured module envelope (for example `dashboardParam`, `customerParam`, `cartParam`, `businessParam`, `catalogueParam` and `adminParam`) to the exact registered POST route. Read actions send an empty `actionData` unless the route requires lookup input. Write/detail actions with unknown DTO fields require a non-empty JSON object entered by the operator. This is a contract-safe bridge, not a substitute for field-specific forms, client validation or backend integration tests.

**Still not mapped to an implemented route:** inventory, purchasing/procurement, notifications, direct messaging and conditional tenant ERP modules. Tenant selection/activation semantics and the approved permission-code catalogue also remain open. No tenant ID or role is inferred from a URL.
