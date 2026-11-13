# BBG backend implementation status — Phase 1

**Working branch:** fix/bbg-seven-layer-audit (based on feature/auth-foundation)  
**Stack:** Yii 3 / PHP 8.4 / MySQL 8.4  
**Status:** 122 unique POST routes across 15 route groups are registered (the 120 original routes plus product-media and subscription-proof S3 upload-URL routes); production readiness and integration verification remain incomplete.

## Implemented API areas

- **Authentication:** registration/login, access-token verification, rotating refresh sessions, reuse detection, logout/logout-all, profile read/update and permission snapshot.
- **Tenant context:** own tenant list/detail and tenant-member list, with server-side membership/permission checks.
- **Business:** application submit/read/update/resubmit, business profile read/update, verification state and storefront settings read/update/publish/unpublish.
- **Marketplace:** public business directory/storefront/products, home summary, public categories and public promotions.
- **Catalogue:** tenant categories and product CRUD, product limits through subscription entitlements, product media metadata list/link/delete, AWS S3 presigned product-image upload and download URLs with server-side object verification.
- **Customer:** customer identity/profile and tenant-scoped address list/create/update/delete/default.
- **Cart and orders:** cart read/add/update/remove/clear, transactional checkout and WhatsApp handoff; customer order history/detail; tenant-wide order queue/detail and guarded status changes.
- **Enquiries:** customer create/history/thread and tenant list/detail/respond/close.
- **Engagement:** product/post likes, comments, reports and eligible view records.
- **Promotions:** tenant promotion create/update/soft-delete/publish/unpublish and engagement summary.
- **Subscriptions:** active plans, tenant subscription list/detail/request/renewal, presigned S3 proof upload URLs and server-side proof object verification.
- **Payments:** customer and tenant payment list/detail, including safe transaction/refund metadata reads. No payment collection or gateway mutation is implemented.
- **Platform administration:** user list/detail/suspend/restore; business review/approve/reject/reopen; subscription review/approve/reject/active list; category CRUD/statistics; analytics summary/trends; moderation queue/action/history; safe health summary.
- **Dashboards:** consumer and entrepreneur summary endpoints.

All newly added modules use the seven logical layers and the .agents $resArr response convention. Public DAO methods take the database connection first and scalar arguments thereafter. Tenant-scoped operations verify membership and permissions in Core Services.

## Automated validation

GitHub Actions workflow .github/workflows/backend-validation.yml runs PHP 8.4 syntax checks, the static API route/actionType contract checker, and applies the two additive migration scripts to a clean MySQL 8.4 service before verifying the expected tables and generated cart-key columns.

A passing workflow validates PHP syntax, the static route/actionType contract assertions and clean-database migration compatibility only. It does not establish live-schema compatibility, API integration correctness, business workflow correctness, or production readiness. No end-to-end API/security suite has been completed as part of this implementation pass.

## Guarded / not implemented

- Binary upload/storage for business verification documents remains unimplemented. Product images and subscription payment proofs use AWS S3 presigned PUT URLs with tenant-scoped keys; proof submission verifies object existence, actual MIME type, file signature, extension and size before saving metadata. Live S3 end-to-end verification still requires configured bucket credentials and IAM permissions.
- Payment initiation, UPI QR generation, gateway webhooks, reconciliation, payment confirmation automation and refund workflows. The approved schema has no tenant UPI/QR configuration contract; QR display or proof submission must never mark an order paid.
- Automated invoice generation and invoice numbering/tax policy.
- Expense and cash-session/movement workflows.
- Tenant member invitations, role assignment, role changes and the broader tenant workspace permissions UI.
- Notification delivery providers and notification preference/dispatch workflows.
- Expanded workspace reporting and exports.
- OAuth provider integration until the provider/credentials/callback contract is approved.
- Deep-link token contract for enquiry/order status sharing.
- Full moderation policy for comments and other target types beyond the supported product/post report actions.
- Comprehensive API integration, concurrency, IDOR, cross-tenant, rate-limit, CSRF and security tests.

The workspace candidates above are not automatically treated as future inventory/purchasing scope; they remain unimplemented because their Phase 1 inclusion or business rules are not approved in the current API catalogue.

## Plan and role configuration dependencies

- The Gold PRODUCT_LIMIT=50 and Platinum PROMOTIONAL_POSTS=1 seed applies only when active plans with matching plan codes exist.
- Other product limits and entitlements must be configured from approved commercial plan definitions.
- Platform administration is default-deny until a trusted platform operator is explicitly assigned the PLATFORM_ADMIN role.
- Tenant APIs require the relevant tenant role/permission assignment. The seed scripts do not grant platform administration to a test user.

## Data and release constraints

- Preserve the existing database; migrations are additive and must not be used as a database reset.
- The 70 canonical tables use the five common columns status, created_by, created_on, updated_by, updated_on; the three migration-only BUSINESS_APPLICATION* tables are documented separately pending an approved workflow. use status='A' for active and status='Z' for soft-deleted rows.
- No physical delete is used for application records.
- Cart remains per customer per business; no guest cart or multi-vendor combined checkout.
- Checkout creates an order with provisional status PLACED, payment UNPAID, fulfilment UNFULFILLED; delivery fee and discount remain zero in the current implementation.
- Tenant order status transitions are currently restricted to REQUESTED/PLACED → CONFIRMED/CANCELLED. Further fulfilment/payment transitions require approved lifecycle rules.
- Checkout does not collect payment. An uploaded proof or displayed QR is not proof of payment.
- ORDER_ITEMS.quantity uses two decimal places; checkout rejects quantities with more than two decimal places rather than rounding.
- Supplier, purchasing and inventory/costing tables remain future scope and have no active APIs.
- No production deployment, merge to main, or end-to-end verification against the user's local database has been performed.

## Next verification sequence

1. Confirm the latest PHP 8.4 GitHub Actions syntax job passes.
2. Run the migration workflow against a clean MySQL 8.4 service.
3. Compare every DAO query against the user's actual live schema (schema-only inspection; no destructive changes).
4. Run API smoke tests for authentication, tenant isolation, customer flows, business approval, catalogue, orders, enquiries, subscriptions, engagement and admin.
5. Run security tests for cross-tenant access, privilege escalation, stale tokens, IDOR, replay and rate limiting.
6. Review the guarded storage, payment, OAuth and workspace contracts before implementing those dependencies.


## AWS S3 product media integration

- Product images are uploaded directly from Angular to AWS S3 using short-lived presigned PUT URLs. The API never accepts client-selected bucket keys; it generates tenant/product-scoped object keys.
- The existing media-link operation confirms the S3 object with HeadObject and validates its MIME type and actual size before persisting PRODUCT_MEDIA metadata.
- Media reads return short-lived presigned GET URLs. Media deletion soft-deletes the metadata and attempts S3 object cleanup.
- Configure AWS_S3_BUCKET, AWS_DEFAULT_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in the root local .env (or use a workload IAM role). AWS credentials must never be committed. AWS_S3_URL_TTL_MINUTES defaults to 10; AWS_S3_MAX_UPLOAD_BYTES defaults to 10 MiB.
- The AWS SDK for PHP is declared as a Composer dependency. Run composer update/install in the backend environment to install it before using the media endpoints.
