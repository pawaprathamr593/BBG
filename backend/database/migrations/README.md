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
3. `../seeds/20261112_003_plan_entitlements.sql` — the documented Gold `PRODUCT_LIMIT=50` and Platinum `PROMOTIONAL_POSTS=1` entitlements, when matching plan codes exist. Other plan limits and features are not guessed.
4. `../seeds/20261113_004_global_consumer_role.sql` — creates the global `CONSUMER` role and idempotently assigns it to all active existing accounts. New password and social registrations assign the same role inside the account-creation transaction.

The seeds do not alter table structures. Review each script before execution and verify the result queries afterwards.

## Locked data conventions

- All tables use the five required common columns: `status`, `created_by`, `created_on`, `updated_by`, `updated_on`.
- `status='A'` is active and `status='Z'` is soft-deleted.
- Normal application operations must not physically delete records.
- No physical foreign keys are introduced by these scripts.
- Tenant-scoped reads and writes must be authorized in Core Services; a client-supplied `tenant_id` is never trusted by itself.

## API implementation dependencies

- Product creation requires an active subscription with a configured `PRODUCT_LIMIT` entitlement. Only the Gold value of 50 is seeded here; any other plan's value must be configured from an approved commercial plan definition.
- Promotion publishing requires an active subscription with `PROMOTIONAL_POSTS`. The seed attaches it to an active plan whose `plan_code` is `PLATINUM`.
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

