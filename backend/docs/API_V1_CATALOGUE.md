# BBG API V1 Catalogue

**Branch:** `feature/auth-foundation`  
**Framework:** Yii 3 / PHP 8.4 / MySQL 8.4  
**Client:** Angular 22  
**Status:** Implementation catalogue derived from the approved BBG backend/database/frontend architecture and Phase 1 backend status.  
**HTTP method:** POST for all API actions, preserving the locked `.agents` convention.

## 1. Layer contract

Every module follows:

`InDto → Controller → Versioned Services V1 → Core Services (Level 1 dispatcher → Level 2 worker) → DAO → MySQL`

The Model layer remains reference-only for new development; Utils contains reusable technical helpers only.

- InDto: one module parameter array, named `<moduleName>Param`.
- Controller: thin HTTP boundary; forwards the request envelope and trusted token context.
- Versioned Services: maps input to InDto and calls `get<Module>()` / `manage<Module>()`.
- Core Services: L1 dispatchers validate `actionType` and `actionData`; L2 workers own business rules, authorization, tenant checks and transactions.
- DAO: every public method receives the Yii 3 database connection first, then scalar arguments only; all SQL is parameterized.
- Every Core Services and DAO method initializes and returns exactly `status`, `msgArr`, and `data`. Failure/exception data is always `[]`.
- Soft deletion uses `status='Z'`; normal reads filter `status='A'`.
- Tenant ID, user ID, role and permissions are resolved from verified server-side identity. Client-supplied IDs are selectors only and must be membership/ownership checked.
- All API paths below are POST. The module envelope is `{ "<moduleName>Param": { "actionType": "get<Module>" | "manage<Module>", "actionData": { ... } } }`.

## 2. Existing API routes to preserve

### Authentication
| Route | Dispatcher/action | Purpose |
|---|---|---|
| `POST /api/v1/auth/register` | `manageAuth/register` | Register account |
| `POST /api/v1/auth/login` | `manageAuth/login` | Sign in |
| `POST /api/v1/auth/refresh` | `manageAuth/refresh` | Rotate refresh session |
| `POST /api/v1/auth/logout` | `manageAuth/logout` | Revoke current session |
| `POST /api/v1/auth/logout-all` | `manageAuth/logoutAll` | Revoke all user sessions |
| `POST /api/v1/auth/profile` | `getAuth/getProfile` | Read authenticated profile |
| `POST /api/v1/auth/profile/update` | `manageAuth/updateProfile` | Update own name/email/mobile |
| `POST /api/v1/auth/permissions` | `getAuth/getPermissions` | Read platform or authorized tenant permission snapshot |

### Cart and orders
| Route | Dispatcher/action | Purpose |
|---|---|---|
| `POST /api/v1/cart/get` | `getCart/getCart` | Read active customer cart |
| `POST /api/v1/cart/add` | `manageCart/addItem` | Add item |
| `POST /api/v1/cart/update` | `manageCart/updateItem` | Update quantity |
| `POST /api/v1/cart/remove` | `manageCart/removeItem` | Soft-delete cart line |
| `POST /api/v1/cart/clear` | `manageCart/clearCart` | Clear active cart |
| `POST /api/v1/cart/checkout` | `manageCart/checkout` | Transactional checkout |
| `POST /api/v1/cart/whatsapp-order` | `manageCart/createWhatsAppOrder` | Create WhatsApp handoff order |
| `POST /api/v1/orders/list` | `getOrders/listMyOrders` | Customer order history |
| `POST /api/v1/orders/detail` | `getOrders/getMyOrder` | Customer order detail |
| `POST /api/v1/orders/tenant/list` | `getOrders/listTenantOrders` | Tenant order queue |
| `POST /api/v1/orders/tenant/detail` | `getOrders/getTenantOrder` | Tenant order detail |
| `POST /api/v1/orders/tenant/status` | `manageOrders/changeTenantOrderStatus` | Validated order transition |
| `POST /api/v1/orders/tenant/confirm` | compatibility alias | Confirm supported requested order |
| `POST /api/v1/orders/tenant/cancel` | compatibility alias | Cancel supported requested order |

### Marketplace
| Route | Dispatcher/action | Purpose |
|---|---|---|
| `POST /api/v1/marketplace/businesses/list` | `getMarketplace/listBusinesses` | Public business directory |
| `POST /api/v1/marketplace/businesses/detail` | `getMarketplace/getBusiness` | Public storefront |
| `POST /api/v1/marketplace/products/list` | `getMarketplace/listProducts` | Public product listing |
| `POST /api/v1/marketplace/products/detail` | `getMarketplace/getProduct` | Public product detail |

## 3. Marketplace and consumer APIs

### Marketplace / Home / Categories
| Route | Action | Purpose |
|---|---|---|
| `POST /api/v1/marketplace/home` | `getHomeSummary` | Home summary and featured content |
| `POST /api/v1/marketplace/categories/list` | `listPublicCategories` | Active public categories |
| `POST /api/v1/marketplace/promotions/list` | `listPublicPromotions` | Published eligible promotions |
| `POST /api/v1/marketplace/promotions/detail` | `getPublicPromotion` | Public promotion detail |

### Customers
| Route | Action | Purpose |
|---|---|---|
| `POST /api/v1/customers/profile` | `getMyCustomerProfile` | Current customer identity |
| `POST /api/v1/customers/addresses/list` | `listMyAddresses` | Own address book |
| `POST /api/v1/customers/addresses/create` | `createMyAddress` | Add address |
| `POST /api/v1/customers/addresses/update` | `updateMyAddress` | Update own address |
| `POST /api/v1/customers/addresses/delete` | `deleteMyAddress` | Soft-delete own address |
| `POST /api/v1/customers/addresses/default` | `setMyDefaultAddress` | Set the default address for the selected tenant |

### Enquiries
| Route | Action | Purpose |
|---|---|---|
| `POST /api/v1/enquiries/create` | `createCustomerEnquiry` | Submit storefront enquiry |
| `POST /api/v1/enquiries/mine/list` | `listMyEnquiries` | Own enquiry history |
| `POST /api/v1/enquiries/mine/detail` | `getMyEnquiry` | Own enquiry thread |
| `POST /api/v1/enquiries/tenant/list` | `listTenantEnquiries` | Incoming tenant enquiries |
| `POST /api/v1/enquiries/tenant/detail` | `getTenantEnquiry` | Tenant enquiry thread |
| `POST /api/v1/enquiries/tenant/respond` | `respondToEnquiry` | Add tenant response |
| `POST /api/v1/enquiries/tenant/close` | `closeEnquiry` | Close tenant enquiry |

### Engagement
| Route | Action | Purpose |
|---|---|---|
| `POST /api/v1/engagement/likes/toggle` | `toggleContentLike` | Idempotent like/unlike |
| `POST /api/v1/engagement/comments/list` | `listContentComments` | Visible comments |
| `POST /api/v1/engagement/comments/create` | `createContentComment` | Add comment |
| `POST /api/v1/engagement/reports/create` | `reportContent` | Report content for moderation |
| `POST /api/v1/engagement/views/record` | `recordContentView` | Record eligible content view |

## 4. Entrepreneur APIs

### Tenant context
| Route | Action | Purpose |
|---|---|---|
| `POST /api/v1/tenants/mine/list` | `listMyTenants` | List active tenant memberships |
| `POST /api/v1/tenants/mine/detail` | `getMyTenant` | Read an authorized tenant |
| `POST /api/v1/tenants/members/list` | `listTenantMembers` | List authorized tenant members |

### Business profile and application
| Route | Action | Purpose |
|---|---|---|
| `POST /api/v1/business/application/submit` | `submitBusinessApplication` | Create tenant and pending business application |
| `POST /api/v1/business/application/get` | `getMyBusinessApplication` | Read own application |
| `POST /api/v1/business/application/update` | `updateBusinessApplication` | Update editable pending/rejected application |
| `POST /api/v1/business/application/resubmit` | `resubmitBusinessApplication` | Resubmit after rejection |
| `POST /api/v1/business/profile/get` | `getMyBusinessProfile` | Read tenant business profile |
| `POST /api/v1/business/profile/update` | `updateMyBusinessProfile` | Update allowed business fields |
| `POST /api/v1/business/verification/get` | `getBusinessVerification` | Read approval/publication state |
| `POST /api/v1/business/storefront/get` | `getMyStorefront` | Read own storefront settings |
| `POST /api/v1/business/storefront/update` | `updateMyStorefront` | Update storefront preferences and WhatsApp settings |
| `POST /api/v1/business/storefront/publish` | `publishMyStorefront` | Publish an approved business storefront |
| `POST /api/v1/business/storefront/unpublish` | `unpublishMyStorefront` | Unpublish own storefront |

### Catalogue
| Route | Action | Purpose |
|---|---|---|
| `POST /api/v1/catalogue/units/list` | `listUnitsOfMeasure` | Active units |
| `POST /api/v1/catalogue/categories/list` | `listTenantProductCategories` | Tenant product categories |
| `POST /api/v1/catalogue/categories/create` | `createTenantProductCategory` | Create tenant category |
| `POST /api/v1/catalogue/categories/update` | `updateTenantProductCategory` | Update tenant category |
| `POST /api/v1/catalogue/categories/delete` | `deleteTenantProductCategory` | Soft-delete tenant category |
| `POST /api/v1/catalogue/products/list` | `listTenantProducts` | Tenant product list |
| `POST /api/v1/catalogue/products/detail` | `getTenantProduct` | Tenant product detail |
| `POST /api/v1/catalogue/products/create` | `createTenantProduct` | Create product |
| `POST /api/v1/catalogue/products/update` | `updateTenantProduct` | Update product |
| `POST /api/v1/catalogue/products/delete` | `deleteTenantProduct` | Soft-delete product |
| `POST /api/v1/catalogue/products/media/list` | `listProductMedia` | Product media metadata |
| `POST /api/v1/catalogue/products/media/upload-url` | `generateProductMediaUploadUrl` | Generate a short-lived S3 presigned PUT URL for an authorized product image |
| `POST /api/v1/catalogue/products/media/link` | `linkProductMedia` | Confirm an S3 upload, verify object MIME type and size, and persist media metadata |
| `POST /api/v1/catalogue/products/media/delete` | `deleteProductMedia` | Soft-delete media metadata |

### Subscriptions
| Route | Action | Purpose |
|---|---|---|
| `POST /api/v1/subscriptions/plans/list` | `listActivePlans` | Public active plans and entitlements |
| `POST /api/v1/subscriptions/mine/list` | `listMySubscriptions` | Tenant subscriptions |
| `POST /api/v1/subscriptions/mine/detail` | `getMySubscription` | Subscription detail |
| `POST /api/v1/subscriptions/request` | `requestSubscription` | Create pending subscription request |
| `POST /api/v1/subscriptions/proofs/submit` | `submitSubscriptionProof` | Store proof metadata/path |
| `POST /api/v1/subscriptions/renewal/request` | `requestSubscriptionRenewal` | Create renewal request when eligible |

### Promotions
| Route | Action | Purpose |
|---|---|---|
| `POST /api/v1/promotions/mine/list` | `listMyPromotions` | Tenant promotions |
| `POST /api/v1/promotions/mine/detail` | `getMyPromotion` | Tenant promotion detail |
| `POST /api/v1/promotions/create` | `createPromotion` | Create entitled promotion |
| `POST /api/v1/promotions/update` | `updatePromotion` | Update own promotion |
| `POST /api/v1/promotions/delete` | `deletePromotion` | Soft-delete own promotion |
| `POST /api/v1/promotions/publish` | `publishPromotion` | Publish eligible promotion |
| `POST /api/v1/promotions/unpublish` | `unpublishPromotion` | Unpublish own promotion |
| `POST /api/v1/promotions/engagement` | `getPromotionEngagement` | Tenant promotion engagement summary |

## 5. Payments

| Route | Action | Purpose |
|---|---|---|
| `POST /api/v1/payments/mine/list` | `listMyPayments` | Authorized customer/tenant payment records |
| `POST /api/v1/payments/mine/detail` | `getMyPayment` | Authorized payment detail |
| `POST /api/v1/payments/tenant/list` | `listTenantPayments` | Tenant payment records |
| `POST /api/v1/payments/tenant/detail` | `getTenantPayment` | Tenant payment detail |

**Payment boundary:** gateway initiation, webhook capture, reconciliation and refunds are future scope. A QR display or proof upload must never mark an order/payment as paid. Subscription proof review is handled through the subscription proof APIs and admin review APIs. No order-payment QR is fabricated because the approved schema does not define a tenant UPI/QR configuration contract.

## 6. Platform administration APIs

### Users
| Route | Action | Purpose |
|---|---|---|
| `POST /api/v1/admin/users/list` | `listPlatformUsers` | Paginated user search |
| `POST /api/v1/admin/users/detail` | `getPlatformUser` | User detail |
| `POST /api/v1/admin/users/suspend` | `suspendPlatformUser` | Suspend eligible account |
| `POST /api/v1/admin/users/restore` | `restorePlatformUser` | Restore eligible account |

### Business approvals
| Route | Action | Purpose |
|---|---|---|
| `POST /api/v1/admin/businesses/pending/list` | `listPendingBusinesses` | Approval queue |
| `POST /api/v1/admin/businesses/detail` | `getBusinessForReview` | Review detail |
| `POST /api/v1/admin/businesses/approve` | `approveBusiness` | Approve application |
| `POST /api/v1/admin/businesses/reject` | `rejectBusiness` | Reject with reason |
| `POST /api/v1/admin/businesses/reopen` | `reopenBusinessReview` | Reopen eligible review |

### Subscription administration
| Route | Action | Purpose |
|---|---|---|
| `POST /api/v1/admin/subscriptions/pending/list` | `listPendingSubscriptions` | Pending subscription queue |
| `POST /api/v1/admin/subscriptions/detail` | `getSubscriptionForReview` | Subscription/proof detail |
| `POST /api/v1/admin/subscriptions/approve` | `approveSubscription` | Approve after proof review |
| `POST /api/v1/admin/subscriptions/reject` | `rejectSubscription` | Reject with review reason |
| `POST /api/v1/admin/subscriptions/active/list` | `listActiveSubscriptions` | Active subscriptions |

### Categories
| Route | Action | Purpose |
|---|---|---|
| `POST /api/v1/admin/categories/list` | `listAdminCategories` | Paginated category list |
| `POST /api/v1/admin/categories/create` | `createCategory` | Create category |
| `POST /api/v1/admin/categories/update` | `updateCategory` | Update category |
| `POST /api/v1/admin/categories/delete` | `deleteCategory` | Soft-delete if no active dependencies |
| `POST /api/v1/admin/categories/stats` | `getCategoryStatistics` | Category business counts |

### Analytics, moderation and health
| Route | Action | Purpose |
|---|---|---|
| `POST /api/v1/admin/analytics/summary` | `getAdminAnalyticsSummary` | Platform summary metrics |
| `POST /api/v1/admin/analytics/trends` | `getAdminAnalyticsTrends` | Time-bucketed metrics |
| `POST /api/v1/admin/moderation/queue` | `listModerationQueue` | Open reports |
| `POST /api/v1/admin/moderation/action` | `applyModerationAction` | Moderate eligible target |
| `POST /api/v1/admin/moderation/history` | `listModerationHistory` | Moderation audit history |
| `POST /api/v1/admin/health/summary` | `getSafeSystemHealth` | Safe operational status only |

## 7. Dashboard APIs

| Route | Action | Purpose |
|---|---|---|
| `POST /api/v1/dashboard/consumer/summary` | `getConsumerDashboard` | Own orders and enquiries summary |
| `POST /api/v1/dashboard/entrepreneur/summary` | `getEntrepreneurDashboard` | Tenant products, orders, enquiries and subscription summary |

## 8. Scope exclusions and guarded gaps

The following are deliberately not operationalized in this API set:

- Suppliers, purchase orders, goods receipts, inventory, stock locations/balances/movements, FIFO, reservations, transfers and adjustments.
- Payment gateway integrations, gateway webhooks, reconciliation and refunds.
- Email/SMS/push delivery providers.
- Ratings/reviews, wishlist, bulk orders, advanced location discovery and full offline writes/background sync.
- Automated invoice generation.
- Expenses/cash workflows and expanded workspace reporting, because their Phase 1 inclusion and business rules are not approved in the current frontend requirements.
- Binary upload/storage endpoints until a storage provider, MIME/size limits, retention and access policy are selected. The media/proof metadata endpoints accept only a server-issued stored file reference, never an arbitrary public URL.

## 9. Implementation status and guarded dependencies

The routes listed in Sections 2–7 are registered on `feature/auth-foundation`: **120 unique POST routes across 15 route groups**. They have corresponding V1/Core Services and DAO implementations, including the additions below:

- Auth: profile update and permission snapshot.
- Business: storefront read/update/publish/unpublish.
- Customers: default-address selection.
- Catalogue: product media linking from an already stored, tenant-scoped relative path.
- Orders: tenant order queue covers all tenant orders; status changes remain limited to REQUESTED/PLACED → CONFIRMED/CANCELLED.

Implementation is **not production-verified** until the PHP 8.4 workflow, clean MySQL migration workflow, live-schema compatibility checks, and API integration/security tests pass. A registered route is not a claim that a local or production API call has been tested.

Guarded dependencies:
- Subscription proof submission stores a server-issued relative file reference; binary upload is not implemented until private storage is selected.
- Product media linking likewise expects a file reference already created by a storage/upload service. The route does not upload bytes or verify an external storage provider.
- Gold product cap (50) and Platinum promotional-post entitlement are seeded only when matching plan codes exist. Other plan entitlements must be configured from approved commercial plan definitions.
- Platform admin APIs remain unavailable until a trusted platform user is explicitly assigned the PLATFORM_ADMIN role.
- Workspace candidates for members/roles management, invoices, expenses, cash sessions/movements and expanded reporting remain outside the approved API V1 scope; they are not future inventory/purchasing APIs, but their Phase 1 inclusion/business rules are still unapproved.

## 10. Contract rules

- Pagination defaults and maximums are validated server-side; tenant/active filters are applied before counts.
- Existing response keys and request envelopes are preserved. No silent breaking changes.
- Public APIs return only published/approved active records and only public fields.
- Every tenant operation derives the tenant from a verified user membership and checks module permission/entitlement.
- Platform administration requires a platform-scoped role/permission; tenant roles never imply platform authority.
- Every write validates lifecycle transitions and records the relevant actor/audit metadata.
- Unsupported action types return `FAILED` with `data=[]`; unexpected exceptions return `EXCEPTION` with safe client messages and internal structured logs.


## 9. Product image storage (AWS S3)

- Angular requests `POST /api/v1/catalogue/products/media/upload-url` with `tenant_id`, `product_id`, `original_file_name`, `mime_type`, `file_size_bytes`, and optional `variant_id`.
- The authenticated tenant permission and product/variant ownership are checked before an S3 object key is generated by the backend.
- The response contains a short-lived presigned PUT URL, the generated `object_key`, the required `Content-Type` header, and expiry seconds. The browser uploads the binary directly to S3.
- Angular then calls the existing `POST /api/v1/catalogue/products/media/link` with the returned `object_key` and media metadata. The backend performs S3 HeadObject verification and compares actual MIME type and size before inserting `PRODUCT_MEDIA` metadata.
- The existing media list route returns short-lived presigned GET URLs for media and optional thumbnails. The existing delete route soft-deletes metadata and attempts S3 object cleanup; cleanup failures are logged for later reconciliation.
- Supported image MIME types: JPEG, PNG and WebP. Default maximum file size: 10 MiB (configurable). Presigned URL expiry defaults to 10 minutes (configurable).
- Credentials are supplied to the PHP container through environment variables or an AWS workload IAM role. Never commit a populated `.env` file.
