# BBG database migrations and seed scripts

## Existing local database

Do not recreate, reset, drop, or truncate the existing BBG database. Verify the active database and compare its live schema with the approved database design before applying any schema script.

The additive table scripts are:

1. `20261112_001_business_application_and_cart.sql`
2. `20261112_002_marketplace_baseline.sql`

They use `CREATE TABLE IF NOT EXISTS`; they do not reconcile an already-existing table definition. Review the live schema first. No destructive migration is authorized.

## RBAC and entitlement seeds

Apply these additive, idempotent seeds after verifying the target database and backing it up:

1. `../seeds/20261112_001_tenant_order_manager.sql` — tenant-scoped `TENANT_ORDER_MANAGER` role and `ORDERS_MANAGE` permission assignment for the configured test user/tenant pair. The seed checks the active membership precondition and does not assign the role if it is missing.
2. `../seeds/20261112_002_api_rbac_baseline.sql` — `TENANT_OWNER` and `PLATFORM_ADMIN` roles, tenant/platform permissions, and role-permission links. It deliberately does **not** assign `PLATFORM_ADMIN` to any user. A trusted platform operator must be assigned separately through an authorized administrative process.
3. `../seeds/20261112_003_plan_entitlements.sql` — the documented Gold `PRODUCT_LIMIT=50` and Platinum `PROMOTIONAL_POSTS=1` entitlements, when matching plan codes exist. Other plan limits and features are not guessed.

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
- Subscription proof metadata accepts a safe relative `proof_file_path` expected to be issued by the future private file-storage/upload integration. No arbitrary public URL is accepted. The upload provider, file-size/type policy and retention rules are not yet selected, so this repository does not claim to implement binary proof upload.
- Platform administration APIs remain default-deny until a trusted user is explicitly assigned the `PLATFORM_ADMIN` role.

## Scope boundary

The current API work covers authentication/profile/permissions, tenant context and tenant orders, business application/storefront, marketplace/cart/orders, catalogue, customer address book, enquiries, engagement, promotions, subscriptions and platform administration.

The 16 database tables explicitly marked future scope in the database design (supplier, purchasing and inventory/costing) remain inactive. Do not add their APIs, screens, jobs or workflows without separate approval.
