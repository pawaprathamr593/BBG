# BBG Phase 1 marketplace baseline migration

Creates the marketplace schema dependencies needed for public storefront and customer-cart development:

- `BUSINESS_PROFILES`
- `CATEGORIES`
- `TENANT_PRODUCT_CATEGORIES`
- `UNITS_OF_MEASURE`
- `PRODUCTS`
- `PRODUCT_VARIANTS`
- `STOREFRONT_SETTINGS`
- `CUSTOMER_IDENTITIES`
- `TENANT_CUSTOMERS`
- `CUSTOMER_ADDRESSES`
- `ORDERS`
- `ORDER_ITEMS`
- `ORDER_STATUS_HISTORY`
- `ORDER_FULFILMENTS`

The DDL is generated from the proposed column definitions in `BBG_Database_Design_Final_v2.0.md`. It is not a schema diff and does not alter existing tables. Existing auth/tenant tables are intentionally excluded because they have already been inspected and are live.

**Important:** apply only to a verified local development database after backup. This script uses `CREATE TABLE IF NOT EXISTS`; if a table already exists, it is not reconciled or altered. Compare existing structures before using this migration where any of these tables may already exist. No physical foreign keys are added, following `.agents/skills/db-design/SKILL.md`.

Apply migration 001 first (business application and cart tables), then this baseline. Cart APIs require `BUSINESS_PROFILES`, `STOREFRONT_SETTINGS`, `PRODUCTS`, `PRODUCT_VARIANTS`, `UNITS_OF_MEASURE`, and the existing `TENANTS` table.
