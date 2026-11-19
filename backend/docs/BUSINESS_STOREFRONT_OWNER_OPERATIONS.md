# BBG owner-scoped storefront configuration and publication

## Purpose
The existing storefront read/update/publish operations require tenant permission codes that remain part of the existing RBAC flow. This feature adds narrowly scoped owner operations so an approved business owner can configure and publish their own storefront without changing RBAC definitions, tenant permission evaluation, guards or interceptors.

## Routes

All routes use the businessParam envelope and the existing authenticated API request pipeline.

| Operation | Route | Action |
| --- | --- | --- |
| Read storefront settings | POST /api/v1/business/storefront/owner/get | getOwnedStorefront |
| Update storefront settings | POST /api/v1/business/storefront/owner/update | updateOwnedStorefront |
| Publish | POST /api/v1/business/storefront/owner/publish | publishOwnedStorefront |
| Unpublish | POST /api/v1/business/storefront/owner/unpublish | unpublishOwnedStorefront |

## Authorization and validation
- Core Services resolves the authenticated principal.
- BusinessDao verifies active TENANT_OWNER membership for the supplied tenant and returns the business profile owned by that user.
- The business profile must have approval_status=APPROVED.
- The existing storefront.enabled plan entitlement is still required.
- Existing field validation, transaction boundaries and DAO update methods are reused.
- Existing non-owner storefront operations and their permission checks are unchanged.

## Publication lifecycle
Publishing updates BUSINESS_PROFILES.publication_status to PUBLISHED and STOREFRONT_SETTINGS.storefront_status to ACTIVE. Unpublishing sets publication_status to DRAFT and storefront_status to INACTIVE.

The public /store/:businessSlug route still applies the existing MarketplaceDao requirements: approved/published business, active tenant, active storefront and an active subscription within its validity dates. This owner API does not bypass those public marketplace checks.

## Frontend
The approved business card exposes Configure storefront, which opens /business/storefront?tenant_id=... . The page loads settings, saves title/description/theme/price/order/WhatsApp options, and allows publish/unpublish. The public URL is displayed after loading the business slug.

## No RBAC changes
No role, permission, ROLE_PERMISSIONS seed, auth service, tenant permission DAO, guard or interceptor was modified for these operations.
