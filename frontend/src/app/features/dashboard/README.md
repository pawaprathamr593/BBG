# Dashboard Feature

The `/dashboard` route renders BBG's unified, responsive workspace for authenticated users.

## Access model

- One dashboard shell serves consumer, platform and tenant contexts.
- The active context is explicit. A tenant is never selected on first visit; a previously selected workspace may be restored for the same signed-in user during the current browser session.
- The dashboard loads permissions from `/api/v1/auth/permissions` and renders modules only when the matching permission is present for the active scope.
- Platform/global permissions are loaded with `tenant_id: 0`; tenant permissions are loaded only after the user explicitly selects a tenant.
- Tenant membership and role labels come from `/api/v1/tenants/mine/list`.
- `WorkspaceContextService` is the shared source of active tenant context and permissions for the dashboard and the reusable profile drawer in both platform and storefront navigation.
- The profile drawer allows users to switch only to workspaces returned by the authenticated membership endpoint; it reloads permissions before applying the new context and routes to `/dashboard`.
- The selected workspace is stored in session storage under a user-specific key and is cleared on logout.
- The existing consumer and entrepreneur summary endpoints provide the current dashboard metrics when their backend authorization conditions are met.
- Backend authorization remains authoritative. Hiding a module in Angular is not a security boundary.

## Current module permission mapping

Tenant context: `CATALOGUE_MANAGE`, `BUSINESS_PROFILE_MANAGE`, `CUSTOMERS_MANAGE`, `ENQUIRIES_MANAGE`, `ORDERS_MANAGE`, `PAYMENTS_VIEW`, `PROMOTIONS_MANAGE`, `SUBSCRIPTIONS_MANAGE`, and `TENANT_MEMBERS_VIEW`.

Platform context: `PLATFORM_USERS_MANAGE`, `BUSINESS_APPROVE`, `SUBSCRIPTIONS_APPROVE`, `CATEGORIES_MANAGE`, `MODERATION_MANAGE`, `SYSTEM_HEALTH_VIEW`, and `ANALYTICS_VIEW`.

Custom tenant roles can use this same model later: the dashboard resolves permission codes and scope rather than depending on a fixed role-name allowlist.

## Feature component boundaries

- `BusinessProfileModule` owns its profile edit form and mutation workflow; the dashboard supplies the existing tenant-scoped profile DTO and refreshes after a successful save.
- `StorefrontModule` owns storefront settings edits and publish/unpublish actions; the dashboard supplies the current storefront DTO and refreshes after successful mutations.
- `PersonalAccountModule` owns personal profile editing and password set/change flows; it uses the authenticated profile DTO and requests a refresh after successful updates.
- `PersonalAddressesModule` owns the consumer address book, create/edit/default/delete actions and its responsive right-side drawer.
- `PersonalAddressesModule` owns the consumer address book, create/edit/default/delete actions and its responsive right-side drawer.
- `PlatformCategoriesModule` owns category create/edit/delete workflows, confirmation and pagination presentation; the dashboard supplies the server-paged category DTOs and refreshes after mutations.
- `Catalogue` remains its own lazy feature page with separate Products and Categories sections and a shared right-side drawer for product/category creation.
- `WorkspaceRecordsModule` is the shared presentational record-list component for record-oriented modules. It receives typed card models and emits user actions; it does not call APIs.
- `WorkspaceDrawer` is the common right-side drawer shell used by workspace add/edit forms, including mobile safe-area handling, Escape/backdrop close, focus management and body-scroll restoration.
- `WorkspaceModuleApiService` centralizes context-checked API requests for extracted feature components. Existing endpoints, action names and envelope keys are retained. Feature components also ignore late mutation results after teardown.

## Current scope and limitations

- The dashboard shell continues to own context selection, navigation, permission resolution and route-level loading.
- Business Profile, Storefront, Personal Account and Platform Categories now own their feature-specific editing workflows. Catalogue is already a separate feature page.
- Other record-heavy workflows (members, business customers, orders, enquiries, payments, platform users and business/subscription reviews), promotion upload orchestration, subscription proof workflows and payment-QR administration still use the dashboard module for orchestration and remain candidates for further extraction.
- The shared record list remains presentational; backend authorization and tenant ownership checks remain authoritative.
- This refactor adds no database tables or columns and does not introduce API endpoints or permission codes.
