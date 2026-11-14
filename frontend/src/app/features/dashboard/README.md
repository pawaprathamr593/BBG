# Dashboard Feature

The `/dashboard` route renders BBG's unified, responsive workspace for authenticated users.

## Access model

- One dashboard shell serves consumer, platform and tenant contexts.
- The active context is explicit. A tenant is never selected automatically.
- The dashboard loads permissions from `/api/v1/auth/permissions` and renders modules only when the matching permission is present for the active scope.
- Platform/global permissions are loaded with `tenant_id: 0`; tenant permissions are loaded only after the user explicitly selects a tenant.
- Tenant membership and role labels come from `/api/v1/tenants/mine/list`.
- The existing consumer and entrepreneur summary endpoints provide the current dashboard metrics when their backend authorization conditions are met.
- Backend authorization remains authoritative. Hiding a module in Angular is not a security boundary.

## Current module permission mapping

Tenant context: `CATALOGUE_MANAGE`, `BUSINESS_PROFILE_MANAGE`, `CUSTOMERS_MANAGE`, `ENQUIRIES_MANAGE`, `ORDERS_MANAGE`, `PAYMENTS_VIEW`, `PROMOTIONS_MANAGE`, `SUBSCRIPTIONS_MANAGE`, `TENANT_MEMBERS_VIEW`, and `ANALYTICS_VIEW`.

Platform context: `PLATFORM_USERS_MANAGE`, `BUSINESS_APPROVE`, `SUBSCRIPTIONS_APPROVE`, `CATEGORIES_MANAGE`, `MODERATION_MANAGE`, `SYSTEM_HEALTH_VIEW), and platform-scoped `ANALYTICS_VIEW`.

Custom tenant roles can use this same model later: the dashboard resolves permission codes and scope rather than depending on a fixed role-name allowlist.

## Current scope and limitations

- The dashboard shell, context selector, role display, module visibility and existing summary widgets are implemented.
- Module cards currently represent permission-backed access. Dedicated catalogue, orders, customer, analytics and administration screens remain separate feature work and are not falsely presented as implemented by this dashboard.
- Consumer summary metrics are loaded for the global `CONSUMER` role. The current database seed does not define consumer-specific module permissions, so no consumer module cards are fabricated.
- Tenant summary metrics currently use the existing backend requirement for `TENANT_MEMBERS_VIEW`; roles without that permission still see their authorized modules, but not those summary metrics.
- No database tables or columns are added or changed by this feature.
