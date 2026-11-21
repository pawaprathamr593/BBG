# BBG database migrations and seed scripts

## Existing local database

Do not recreate, reset, drop, or truncate the existing BBG database. Verify the active database and compare its live schema with the approved database design before applying any schema script.

The additive table scripts are:

1. `20261112_001_business_application_and_cart.sql`
2. `20261112_002_marketplace_baseline.sql`
3. `20261113_001_public_marketplace_engagement.sql` — creates `CONTENT_VIEWS` and `CUSTOMER_ENQUIRIES` when absent for public business-view tracking and enquiry-based discovery ranking.\n4. `20261113_002_social_identity_mapping.sql` — creates `USER_IDENTITIES` when absent for verified Google, Facebook, Apple and Instagram professional-account identities.

They use `CREATE TABLE IF NOT EXISTS`; they do not reconcile an already-existing table definition. Review the live schema first. No destructive migration is authorized.

## RBAC and entitlement seeds

Apply these additive, idempotent seeds after verifying the target database and backing it up:

1. `../seeds/20261112_001_tenant_order_manager.sql` — tenant-scoped `TENANT_ORDER_MANAGER` role and `ORDERS_MANAGE` permission assignment for the configured test user/tenant pair. The seed checks the active membership precondition and does not assign the role if it is missing.
2. `../seeds/20261112_002_api_rbac_baseline.sql` — `TENANT_OWNER` and `PLATFORM_ADMIN` roles, tenant/platform permissions, and role-permission links. It deliberately does **not** assign `PLATFORM_ADMIN` to any user. A trusted platform operator must be assigned separately through an authorized administrative process.
3. `../seeds/20261112_003_plan_entitlements.sql` — the Gold/Diamond/Platinum entitlement matrix: Gold storefront capabilities; Diamond product management and one promotion per tenant-local day; Platinum product management, five promotions per tenant-local day, and SEO/AEO/GEO plus advanced analytics entitlements.
4. `../seeds/20261113_004_platform_consumer_role.sql` — ensures the platform-scoped `CONSUMER` role and idempotently assigns it to all active existing accounts. New password and social registrations assign the same role inside the account-creation transaction.

The seeds do not alter table structures. Review each script before execution and verify the result queries afterwards.


### Global My Account saved addresses — 17 November 2026

- `20261117_001_global_customer_addresses.sql` adds `CUSTOMER_ADDRESSES.user_id`, backfills resolvable legacy tenant addresses through `TENANT_CUSTOMERS` and `CUSTOMER_IDENTITIES`, makes the two legacy tenant-link columns nullable, and adds an owner/status index.
- This migration is a one-time schema change. Back up and inspect the live schema before running it; do not run it twice.
- Deploy the matching `CustomerServices` / `CustomerDao` code only after the migration is applied. My Account address operations no longer require `tenant_id` and derive ownership from the authenticated user profile.
- See `../docs/BBG_DATABASE_DESIGN_V2.3_GLOBAL_MY_ACCOUNT_ADDRESSES.md` for ownership, compatibility and rollout rules.

### `20261118_001_bbg_contribution_number.sql`

Adds nullable unique `TENANT_SUBSCRIPTIONS.bcn` and the single-row `BBG_BCN_SERIAL_COUNTER` used for global, transaction-locked serial allocation. It does not backfill subscriptions approved before BCN was introduced. Apply only after verifying the physical `TENANT_SUBSCRIPTIONS` schema and taking a backup; this migration is not run automatically by the application.

## Locked data conventions

- All tables use the five required common columns: `status`, `created_by`, `created_on`, `updated_by`, `updated_on`.
- `status='A'` is active and `status='Z'` is soft-deleted.
- Normal application operations must not physically delete records.
- No physical foreign keys are introduced by these scripts.
- Tenant-scoped reads and writes must be authorized in Core Services; a client-supplied `tenant_id` is never trusted by itself.

## API implementation dependencies

- Product create/update/publish requires both the tenant-scoped `CATALOGUE_MANAGE` permission and an active `PRODUCT_MANAGEMENT` entitlement. `PRODUCT_LIMIT` is optional; a cap is enforced only when a commercial limit is explicitly configured.
- Promotion creation/publishing requires both `PROMOTIONS_MANAGE` and an active numeric `DAILY_PROMOTION_LIMIT`. Publishing is counted against the tenant's local calendar day using `TENANTS.timezone`; the published timestamp is stored in UTC.
- Angular receives the active tenant's entitlement codes through the existing `/api/v1/tenants/mine/list` response. The UI filters modules using both permissions and entitlements; Core Services independently enforces both on every write.
- Subscription proofs use `POST /api/v1/subscriptions/proofs/upload-url` to obtain a tenant-scoped S3 presigned PUT URL. `POST /api/v1/subscriptions/proofs/submit` verifies the object exists and checks its actual MIME type, file signature, extension and size before saving proof metadata. The proof flow is implemented in code but requires live bucket credentials/IAM and end-to-end verification. No arbitrary public URL is accepted.
- Platform administration APIs remain default-deny until a trusted user is explicitly assigned the `PLATFORM_ADMIN` role.

## Social identity mapping\n\nThe `USER_IDENTITIES` table stores provider names, immutable provider subjects and optional provider emails only. It must not store provider access tokens or ID tokens. The authentication service verifies provider credentials server-side before creating a BBG session. The additive migration is not executed automatically; verify the live table definition and back up the database before applying it.\n\n## Scope boundary

The current API work covers authentication/profile/permissions, tenant context and tenant orders, business application/storefront, marketplace/cart/orders, catalogue, customer address book, enquiries, engagement, promotions, subscriptions and platform administration.

The 16 database tables explicitly marked future scope in the database design (supplier, purchasing and inventory/costing) remain inactive. Do not add their APIs, screens, jobs or workflows without separate approval.

## Schema reconciliation

- `CARTS` and `CART_ITEMS` are adopted as canonical tables 69 and 70 in `../docs/BBG_DATABASE_DESIGN_V2.1_AMENDMENT.md`.
- `BUSINESS_APPLICATIONS`, `BUSINESS_APPLICATION_DOCUMENTS` and `BUSINESS_APPLICATION_REVIEWS` remain migration-only/dormant. The active BusinessServices/BusinessDao flow continues to use `BUSINESS_PROFILES`; do not wire the three dormant tables into the application until the business application history/document-review workflow is approved.

### `20261113_003_public_product_discovery_support.sql`

Creates `CONTENT_LIKES` and `PRODUCT_MEDIA` when they are not already present. These tables support persisted product popularity (likes) and public catalogue image/variant filtering. The migration is additive and does not alter an existing table. Review the live schema and take a backup before applying it.



## 20261117_002 — Subscription payment and review workflow

File: `20261117_002_subscription_payment_review_workflow.sql`

Adds versioned Platform Admin UPI QR configuration, immutable per-subscription payment-instruction snapshots, and an append-only subscription review history with a legacy decision backfill. Apply after `20261117_001_global_customer_addresses.sql` on a verified local/staging database after backup. The migration is not automatically executed by the application.


## 20261119 — Business onboarding lifecycle additions
- `20261119_001_business_profile_coordinate_precision.sql` widens nullable business latitude/longitude columns to `DOUBLE(10,7)` for browser-captured coordinates. It preserves existing values and must be applied after verifying the live BUSINESS_PROFILES schema.
- `20261119_002_subscription_upgrade_lineage.sql` adds nullable
- `20261119_002_subscription_upgrade_lineage.sql` adds nullable `TENANT_SUBSCRIPTIONS.upgrade_from_subscription_id` and its tenant-scoped index. A replacement subscription remains pending while the current subscription remains active; the previous subscription is closed only inside the admin approval transaction.
- `20261119_003_tenant_member_invitations.sql` creates `TENANT_INVITATIONS` for one-time, seven-day tenant invitations. Only a SHA-256 token hash is stored; the raw token is returned once to the owner for sharing.
- The application onboarding flow uses additive application-owner operations to save drafts, list owned applications, create payment requests and submit payment proof. These operations verify the authenticated user's active `TENANT_OWNER` membership for the specific tenant/application. They do not change RBAC roles, permission rows, tenant permission evaluation, authentication, guards or interceptors.
- The payment-backed admin queue is the existing subscription review queue. Approval continues through the existing admin subscription decision path, which also approves the business profile and activates its tenant.
- Team management uses only the already-seeded `TENANT_ORDER_MANAGER` role with `TENANT` scope. No new roles or permission codes are introduced. Tenant owners cannot assign `TENANT_OWNER` or any `PLATFORM` role.
- Before applying either migration to a real database, verify the live schema and take a backup. CI validates these scripts against a clean MySQL 8.4 test database; that does not replace staging/production schema verification.

## 20261120_001 — Product reviews, helpful voting, reporting and promotional post reactions
File: `20261120_001_product_reviews_and_reactions.sql`

- Extends `CONTENT_LIKES` to add `reaction_type VARCHAR(20) NOT NULL DEFAULT 'LIKE'` to support rich reactions (`LIKE`, `LOVE`, `HAHA`, `WOW`, `SAD`, `ANGRY`) on promotional posts.
- Creates `PRODUCT_REVIEWS` to store 1–5 star ratings, review titles, review text, review moderation status, and timestamps for individual products (zero cart/order dependencies, `is_verified_purchase = 0`).
- Creates `PRODUCT_REVIEW_MEDIA` to store optional image attachments.
- Creates `PRODUCT_REVIEW_VOTES` to track helpful votes by authenticated users.
- Creates `PRODUCT_REVIEW_REPORTS` to enable users to report inappropriate reviews for moderation.
- All tables strictly enforce the five mandatory BBG audit and soft-delete fields (`status`, `created_by`, `created_on`, `updated_by`, `updated_on`) and `tenant_id`.
