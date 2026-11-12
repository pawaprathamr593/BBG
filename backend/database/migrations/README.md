# BBG database migrations

## Phase 1 local development sequence

1. Verify the selected database and compare the live schema with the proposed baseline. The existing nine auth/identity/tenant tables are not recreated or altered by these scripts.
2. Back up the local database.
3. Apply `20261112_001_business_application_and_cart.sql` for business application/document/review history and cart persistence.
4. Apply `20261112_002_marketplace_baseline.sql` for the business storefront, catalogue, customer, and order tables required by the first marketplace slice.
5. Verify table definitions, generated columns, indexes, and row counts before starting the API.

Both migrations are additive and use `CREATE TABLE IF NOT EXISTS`; they do not alter or drop existing tables. If a target table already exists, the script leaves its existing structure untouched. This is not a schema reconciliation tool.

## Safety rules

- Apply only to a verified local development database after backup.
- Never run destructive migrations or reset the MySQL volume.
- Existing tables and user data must be preserved.
- No physical foreign keys are added, following the supplied `.agents/skills/db-design/SKILL.md`.
- All new tables include the five required common columns: `status`, `created_by`, `created_on`, `updated_by`, `updated_on`.
- Soft deletion uses `status='Z'`; ordinary application operations must not physically delete records.
- Review the scripts and inspect the live schema before any production deployment.

## Current implementation boundary

The cart API currently supports authenticated cart retrieval, add, update, remove, and clear. Checkout/order creation, business application HTTP workflows, product-management APIs, payment reconciliation, and admin approval APIs are not yet implemented. The schema is the foundation, not evidence that those modules are complete.
