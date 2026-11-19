# BBG Database Design v2.1 — Reconciliation Amendment

**Date:** 13 November 2026  
**Supersedes:** Relevant table-count and sales/cart sections of *BBG Database Design & Data Dictionary — Final v2.0*  
**Migration source:** `backend/database/migrations/20261112_001_business_application_and_cart.sql`  
**Target:** MySQL 8.4 / InnoDB / utf8mb4

## 1. Reconciliation decision

The v2.0 data dictionary defined 68 canonical tables but did not include the two cart tables created by migration 001. This amendment adopts `CARTS` and `CART_ITEMS` as canonical Phase 1 tables, increasing the canonical data dictionary count from 68 to **70 tables**.

The same migration also creates three business-application tables. The currently implemented Business Core Services/DAO flow continues to use `BUSINESS_PROFILES`; the three new business-application tables are not referenced by the reviewed active Business DAO/Core Services workflow. They are therefore recorded below as **migration-only / dormant tables**, not counted among the 70 canonical application tables until a separate business-application-history and document workflow is approved and implemented. They are not silently dropped or treated as active application storage.

No migration DDL is changed by this documentation amendment. No physical foreign keys are added; relationships remain logical, consistent with the backend migration convention.

## 2. Canonical table 69 — CARTS

**Purpose:** One active cart per customer user and business tenant. A customer can maintain separate carts for different businesses; checkout converts a tenant cart into an order.

| Column | MySQL definition | Notes |
|---|---|---|
| `id` | `INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY` | Cart identifier |
| `tenant_id` | `INT UNSIGNED NOT NULL` | Owning business tenant; logical reference to `TENANTS.id` |
| `user_id` | `INT UNSIGNED NOT NULL` | Customer platform user; logical reference to `USERS.id` |
| `cart_status` | `VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'` | Business lifecycle state |
| `currency` | `VARCHAR(3) NOT NULL DEFAULT 'INR'` | Cart currency snapshot |
| `last_activity_on` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` | Last cart activity |
| `converted_on` | `DATETIME NULL` | Set when cart converts to an order |
| `status` | `VARCHAR(1) NOT NULL DEFAULT 'A'` | Universal active/deleted marker; A/Z |
| `active_user_id` | `INT UNSIGNED GENERATED ALWAYS AS (CASE WHEN cart_status = 'ACTIVE' AND status = 'A' THEN user_id ELSE NULL END) STORED` | Generated uniqueness helper |
| `active_tenant_id` | `INT UNSIGNED GENERATED ALWAYS AS (CASE WHEN cart_status = 'ACTIVE' AND status = 'A' THEN tenant_id ELSE NULL END) STORED` | Generated uniqueness helper |
| `created_by` | `INT UNSIGNED NULL` | Common audit actor |
| `created_on` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` | Common audit timestamp |
| `updated_by` | `INT UNSIGNED NULL` | Common audit actor |
| `updated_on` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Common audit timestamp |

**Indexes and constraints**

- Primary key: `id`.
- Unique: `uq_carts_one_active_per_customer_store (active_user_id, active_tenant_id)` — enforces at most one active, non-deleted cart for a user/tenant pair.
- Index: `idx_carts_customer_tenant_status (user_id, tenant_id, cart_status, status)`.
- Index: `idx_carts_tenant_activity (tenant_id, last_activity_on)`.

## 3. Canonical table 70 — CART_ITEMS

**Purpose:** Product and optional variant lines belonging to a cart, with quantity and unit-price snapshot captured when added or updated.

| Column | MySQL definition | Notes |
|---|---|---|
| `id` | `INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY` | Cart line identifier |
| `tenant_id` | `INT UNSIGNED NOT NULL` | Owning tenant; logical reference to `TENANTS.id` |
| `cart_id` | `INT UNSIGNED NOT NULL` | Logical reference to `CARTS.id` |
| `product_id` | `INT UNSIGNED NOT NULL` | Logical reference to `PRODUCTS.id` |
| `variant_id` | `INT UNSIGNED NULL` | Optional logical reference to `PRODUCT_VARIANTS.id` |
| `quantity` | `DECIMAL(12,3) NOT NULL` | Quantity precision up to three decimal places |
| `unit_price_snapshot` | `DECIMAL(12,2) NOT NULL DEFAULT 0.00` | Price snapshot at cart update time |
| `status` | `VARCHAR(1) NOT NULL DEFAULT 'A'` | Universal active/deleted marker; A/Z |
| `variant_key` | `INT UNSIGNED GENERATED ALWAYS AS (COALESCE(variant_id, 0)) STORED` | Generated uniqueness helper; NULL variant represented as zero |
| `active_cart_id` | `INT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status = 'A' THEN cart_id ELSE NULL END) STORED` | Generated uniqueness helper |
| `created_by` | `INT UNSIGNED NULL` | Common audit actor |
| `created_on` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` | Common audit timestamp |
| `updated_by` | `INT UNSIGNED NULL` | Common audit actor |
| `updated_on` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Common audit timestamp |

**Indexes and constraints**

- Primary key: `id`.
- Unique: `uq_cart_items_active_product_variant (active_cart_id, product_id, variant_key)` — prevents duplicate active product/variant lines in one cart.
- Index: `idx_cart_items_cart_status (cart_id, status)`.
- Index: `idx_cart_items_tenant_product (tenant_id, product_id, variant_id)`.

## 4. Logical relationship and lifecycle rules

- `CARTS.tenant_id` → `TENANTS.id`.
- `CARTS.user_id` → `USERS.id`.
- `CART_ITEMS.cart_id` → `CARTS.id`.
- `CART_ITEMS.tenant_id` → `TENANTS.id`.
- `CART_ITEMS.product_id` → `PRODUCTS.id`.
- `CART_ITEMS.variant_id` → `PRODUCT_VARIANTS.id` when non-null.
- These are logical relationships; this amendment does not create physical FK constraints.
- Soft deletion uses `status='Z'`; application queries must exclude deleted rows using `status='A'`.
- Generated columns exist only to support the migration's active-row uniqueness rules. They are database-generated and must not be set by application writes.
- The decimal quantity and price column types are authoritative. Core Services should avoid floating-point arithmetic for monetary calculations; a separate implementation fix may be required if current service arithmetic still uses floats.

## 5. Migration-only business-application tables

Migration 001 also creates the following tables. They are recorded here for schema transparency, but are **not part of the 70-table canonical application data dictionary** until the related application-history/document-review workflow is approved and wired into Core Services and DAO.

### 5.1 BUSINESS_APPLICATIONS

Columns in migration: `id`, `tenant_id`, `applicant_user_id`, `application_status`, `business_name`, `legal_name`, `business_type`, `primary_category_id`, `business_email`, `business_phone`, `website_url`, `address_line_1`, `address_line_2`, `city`, `state`, `postal_code`, `country_code`, `tax_identifier`, `applicant_notes`, `submitted_on`, `resubmitted_on`, and the five common columns `status`, `created_by`, `created_on`, `updated_by`, `updated_on`.

Migration constraints/indexes: primary key `id`; unique `tenant_id`; index `(applicant_user_id, application_status)`; index `(application_status, created_on)`.

### 5.2 BUSINESS_APPLICATION_DOCUMENTS

Columns in migration: `id`, `application_id`, `document_type`, `document_name`, `file_path`, `original_file_name`, `mime_type`, `file_size_bytes`, `version_no`, `document_status`, `uploaded_by`, `uploaded_on`, `review_status`, `reviewed_by`, `reviewed_on`, `review_notes`, and the five common columns.

Migration constraints/indexes: primary key `id`; unique `(application_id, document_type, version_no)`; indexes `(application_id, status)` and `(application_id, review_status)`.

### 5.3 BUSINESS_APPLICATION_REVIEWS

Columns in migration: `id`, `application_id`, `reviewer_user_id`, `decision`, `reason_code`, `review_reason`, `internal_notes`, `reviewed_on`, and the five common columns.

Migration constraints/indexes: primary key `id`; indexes `(application_id, reviewed_on)` and `(reviewer_user_id, reviewed_on)`.

**Usage restriction:** Do not route current business application/profile reads or writes to these three tables until the application lifecycle, document upload/storage, review history, and migration strategy are approved. The current implementation's `BUSINESS_PROFILES` flow remains the active source of truth.

## 6. Version and scope note

This amendment changes the documented canonical table count from 68 to 70 by adopting only `CARTS` and `CART_ITEMS`. It does not change the mandatory common-column convention, A/Z soft deletion, existing table definitions, payment model, or the physical foreign-key policy. It does not claim that a live database has been inspected or migrated.

## 6. Business profile geolocation precision amendment

Migration `20261119_001_business_profile_geolocation_precision.sql` updates the active `BUSINESS_PROFILES` geolocation columns used by the current Business Core Services/DAO flow:

| Column | Current definition after migration | Notes |
|---|---|---|
| `latitude` | `DECIMAL(10,7) NULL` | Preserves seven decimal places from browser Geolocation API |
| `longitude` | `DECIMAL(10,7) NULL` | Preserves seven decimal places from browser Geolocation API |
| `location_accuracy_m` | `DECIMAL(10,2) NULL` | Optional reported horizontal accuracy in metres |

The migration is additive/idempotent: it adds missing columns and widens existing coordinate columns. It does not add a map SDK or reverse-geocoding dependency. The application keeps address text independently editable; browser geolocation supplies coordinates and accuracy, not a postal address. Apply only after confirming the active database/schema and taking a backup. The migration is covered by the MySQL 8.4 CI workflow.
