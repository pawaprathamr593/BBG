# BBG Phase 1 additive schema extension

## Included in this migration

- `BUSINESS_APPLICATIONS`: one application per tenant, editable/resubmittable after Platform Admin reopens a rejected application.
- `BUSINESS_APPLICATION_DOCUMENTS`: append a new version for corrected documents; do not overwrite prior versions.
- `BUSINESS_APPLICATION_REVIEWS`: append-only review history for approve/reject/additional-information/reopen decisions.
- `CARTS` and `CART_ITEMS`: persistent authenticated-customer carts.

## Cart boundary

The first release uses **one cart per customer per business**. The customer can have separate carts for different storefronts. Checkout is scoped to one tenant and produces that tenant's order. Multi-business combined checkout and automatic order splitting are not part of this first slice.

Only authenticated customers are supported initially. Guest cart/checkout remains pending product approval. Cart prices are display snapshots only; checkout must reload active product/variant prices and calculate totals on the server. Never trust client-supplied prices or totals.

## Application workflow

- New business application and tenant start in pending state.
- Applicant may add new document versions to the same application.
- A rejection is not applicant-editable. Only Platform Admin can reopen it.
- Each decision/reopen is appended to `BUSINESS_APPLICATION_REVIEWS`; never overwrite prior decisions.
- Approval must update tenant/business activation through a Core Service transaction and explicit status policy.

## Database conventions

- MySQL 8.4 / InnoDB / utf8mb4.
- All five common columns are present: `status`, `created_by`, `created_on`, `updated_by`, `updated_on`.
- Soft deletion is `status='Z'`; normal application workflows do not physically delete records.
- No physical foreign keys, following the supplied `.agents/skills/db-design/SKILL.md`. Logical relationships are represented by indexed IDs and validated in Core Services.
- The migration is additive and uses `CREATE TABLE IF NOT EXISTS`. It does not modify existing tables.

## Apply safely

1. Confirm the active database name and inspect the current schema.
2. Take a database backup.
3. Apply this SQL only to the local development database.
4. Verify all five tables and indexes exist.
5. Do not apply to production until reviewed and separately approved.

The script intentionally does not create the existing catalogue, customer, order, payment or tenancy tables described in Database Design v2.0. Those require the full Phase 1 baseline migration and a live-schema comparison first.
