# BBG backend implementation status — Phase 1

**Branch:** `feature/auth-foundation`  
**Stack:** Yii 3 / PHP 8.4 / MySQL 8.4  
**Status:** active implementation; not yet production-ready

## Implemented

- Password registration/login, access-token issuance and verification, rotating refresh sessions, reuse detection, logout/logout-all and authenticated profile.
- Customer cart: retrieve, add, update, remove, clear.
- Customer checkout: server-side product/price revalidation, tax calculation, customer identity association, order/item snapshots, order status history, delivery-address snapshot and cart conversion in one Core Service transaction.
- Customer order history: paginated own-order list and own-order detail with line items, status history and fulfilment snapshots.
- Customer order history: paginated own-order list and own-order detail with line items, status history and fulfilment.
- Additive Phase 1 schema scripts for business application history, carts, storefront/catalogue, customer records, orders and fulfilment.
- Seven-layer Cart and Order module wiring; parameterized DAO queries; A/Z soft-delete on cart lines.

## Automated validation

GitHub Actions workflow `.github/workflows/backend-validation.yml` checks PHP syntax and applies the two additive migrations to a clean MySQL 8.4 service, then verifies the expected tables and four generated cart-key columns.

A passing CI run validates PHP syntax and migration compatibility only. It is not an end-to-end API test against the developer's local database.

## Not yet implemented

- Business application HTTP workflows: submit/edit/resubmit, document upload/versioning, Platform Admin reopen/review/approve/reject.
- Tenant creation/activation workflow and initial role/permission seeding/assignment.
- Product/category CRUD and public business directory/storefront/product read APIs.
- Business-side incoming order list/detail/status transitions.
- Customer address-book CRUD; checkout currently accepts and stores a delivery-address snapshot.
- Payment initiation, QR/payment-proof review, gateway integration, reconciliation, refunds and invoices.
- Customer enquiries/conversations, promotions/engagement, notifications and moderation APIs.
- Full permission catalogue enforcement and comprehensive cross-tenant/security integration tests.
- Angular integration.

## Current constraints

- Cart is per customer per business. No guest cart or multi-vendor combined checkout.
- Checkout creates an order with provisional status `PLACED`, payment `UNPAID`, fulfilment `UNFULFILLED`; delivery fee and discount are currently zero.
- Payment is not collected by checkout. A QR display or uploaded proof is not proof of payment.
- The approved database design defines `ORDER_ITEMS.quantity` with two decimal places. Checkout rejects quantities with more than two decimal places rather than rounding.
- Inventory, stock reservation and purchasing remain future scope.
- Migrations are additive. They have not been applied to the user's local database by this implementation process.
- No production deployment or merge to `main` has been performed.

## Next backend sequence

1. Business application and Platform Admin approval APIs.
2. Role/permission seed and enforcement.
3. Catalogue management and public storefront APIs.
4. Business-side order management and status transitions.
5. Payments and invoices after payment method/provider decisions.
6. End-to-end API tests against a local MySQL database.
