# BBG Database Design v2.3 — Global My Account Address Amendment

**Date:** 17 November 2026  
**Applies to:** `CUSTOMER_ADDRESSES`  
**Migration:** `20261117_001_global_customer_addresses.sql`  
**Target:** MySQL 8.4 / InnoDB / utf8mb4

## 1. Decision

Saved addresses in **My Account** are global personal data owned by the authenticated platform user. They are not owned by whichever business workspace happens to be active. A user can therefore use the same saved addresses while browsing or transacting with different businesses.

Business-side customer records remain tenant-scoped in `TENANT_CUSTOMERS`. Existing tenant relationships are retained for historical compatibility and business workflows.

## 2. `CUSTOMER_ADDRESSES` changes

| Column | Definition after migration | Purpose |
|---|---|---|
| `user_id` | `INT UNSIGNED NULL` | Global owner; logical reference to `USERS.id`. Required for new My Account rows. Nullable only to preserve legacy rows that cannot be backfilled. |
| `tenant_id` | `INT UNSIGNED NULL` | Optional legacy/business context. New My Account rows leave it NULL. |
| `tenant_customer_id` | `INT UNSIGNED NULL` | Optional legacy tenant customer link. New My Account rows leave it NULL. |

The migration adds `idx_customer_addresses_user_status (user_id, status)`. Existing address data is backfilled through `CUSTOMER_ADDRESSES.tenant_customer_id` → `TENANT_CUSTOMERS.customer_identity_id` → `CUSTOMER_IDENTITIES.user_id`. Rows that cannot be resolved remain with `user_id IS NULL` and retain their old tenant references; they are not assigned to an inferred user.

No physical foreign keys are introduced, consistent with the current backend migration convention. The five common audit columns and A/Z soft-delete convention remain unchanged.

## 3. Ownership and service rules

- My Account list/create/update/delete/default-address operations resolve the owner from the authenticated access token via the server-side auth profile.
- The API must never trust a client-supplied `user_id` or require a `tenant_id` for personal saved-address operations.
- Reads and mutations are scoped by `CUSTOMER_ADDRESSES.user_id` and active `status='A'` rows.
- New personal addresses write `user_id` and set `tenant_id` / `tenant_customer_id` to NULL.
- A user's default address is unique at the application workflow level across their global address book; default changes are transactional.
- Tenant-specific customer management remains based on `TENANT_CUSTOMERS` and its tenant authorization checks. This amendment does not grant a business access to another user's private address book.
- Existing tenant-linked rows are retained and backfilled to their user owner where possible, so those users can see their saved addresses in My Account.

## 4. Deployment procedure

1. Back up the target database.
2. Confirm the live `CUSTOMER_ADDRESSES`, `TENANT_CUSTOMERS` and `CUSTOMER_IDENTITIES` columns match the migration assumptions.
3. Run the migration once in the intended environment.
4. Verify the new column and index, and inspect unresolved legacy rows where `user_id IS NULL`.
5. Deploy the matching backend code only after the migration has completed.
6. Test listing, creating, updating, deleting and setting a default address with no active tenant selected, then switch business workspaces and confirm the same personal address list remains.

This migration is not automatically executed by the application. It must not be run twice without first reconciling the live schema.
