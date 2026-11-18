---
id: REQ-WORKSPACE-004
title: Business workspace operations and overview
area: workspace
type: enhancement
owner: unset
status: in-progress
---

# Business workspace operations and overview

## 1. Problem
Authorized business members need a tenant-scoped workspace for supported profile, storefront, catalogue, customer-facing, order, enquiry, payment, promotion and subscription operations.

## 2. Personas
| Persona | Device | Goal |
| --- | --- | --- |
| Business owner / tenant administrator | Mobile, tablet, desktop | Manage business presentation and operations |
| Authorized business member | Mobile, tablet, desktop | Perform permitted tenant tasks |

## 3. Scope
**In scope:** Business profile/storefront; existing catalogue feature; read-only tenant member list; tenant orders and supported transitions; incoming enquiries/respond/close; read-only tenant payments; promotions and supported media flow; subscription plans/history/request/renewal/proof; entrepreneur summary and supported analytics.
**Out of scope:** Member invitations/role assignment; inventory/purchasing/suppliers; gateway/refunds/invoices/expenses; business verification document upload; unsupported analytics.

## 4. Entry and context
Existing /dashboard, /dashboard/profile, /dashboard/catalogue, /dashboard/members, /dashboard/customers, /dashboard/orders, /dashboard/enquiries, /dashboard/payments, /dashboard/promotions, /dashboard/subscriptions and /dashboard/analytics. Requires active server-authorized tenant.

## 5. Flow
1. Select authorized Business context.
2. Load tenant summary.
3. Open a supported section; backend scopes data to active tenant.
4. Perform a supported operation with validation and permission-aware affordances.
5. Refresh affected data only after successful mutation; retain safe data on failure.
6. Do not expose unsupported actions as functional controls.

## 6. Screens / regions
| Region | Intent | Reuse expectation |
| --- | --- | --- |
| Overview | Tenant metrics and shortcuts | Existing dashboard summary |
| Profile/storefront | Business settings and publication | Existing forms |
| Catalogue | Products/categories/media | Existing Catalogue feature |
| Team | Member list | Read-only existing list |
| Orders/enquiries | Queues and conversations | Existing list/detail patterns |
| Payments | Tenant payment history | Read-only list/detail |
| Promotions | Compose and publish | Existing composer |
| Subscriptions | Plans, requests and proof | Existing subscription flow |
| Analytics | Supported summary | Existing summary/engagement |

## 7. API
| Operation | Method | Path | Action | Status |
| --- | --- | --- | --- | --- |
| Tenant summary | POST | /api/v1/dashboard/entrepreneur/summary | getEntrepreneurDashboard | Existing |
| Members list | POST | /api/v1/tenants/members/list | listTenantMembers | Existing, read-only |
| Profile/storefront | POST | /api/v1/business/profile/get, update; /api/v1/business/storefront/get, update, publish, unpublish | Business actions | Existing |
| Tenant orders | POST | /api/v1/orders/tenant/list, detail, status | Tenant order actions | Existing |
| Tenant enquiries | POST | /api/v1/enquiries/tenant/list, detail, respond, close | Tenant enquiry actions | Existing |
| Tenant payments | POST | /api/v1/payments/tenant/list, detail | Tenant payment actions | Existing, read-only |
| Promotions and media | POST | /api/v1/promotions/mine/list, mine/detail, create, update, delete, publish, unpublish, engagement; /api/v1/promotions/media/upload-url, link, delete | Promotion and media actions | Existing on this branch; media upload requires configured S3 and an eligible promotion entitlement |
| Subscriptions | POST | /api/v1/subscriptions/plans/list, mine/list, mine/detail, request, renewal/request, proofs/upload-url, proofs/submit | Subscription actions | Existing; live S3 requires configuration |
| Customer directory | POST | /api/v1/customers/tenant/list | listTenantCustomers | Route and worker exist on this branch; API V1 catalogue is stale and should be reconciled separately |

## 8. Permissions
Reuse existing keys: BUSINESS_PROFILE_MANAGE, CATALOGUE_MANAGE, CUSTOMERS_MANAGE, ENQUIRIES_MANAGE, ORDERS_MANAGE, PAYMENTS_VIEW, PROMOTIONS_MANAGE, SUBSCRIPTIONS_MANAGE, TENANT_MEMBERS_VIEW, ANALYTICS_VIEW. Backend authorization remains authoritative.

## 9. Rules and validation
Tenant ID is not an authorization grant. Order transitions limited to backend-supported lifecycle. Payments read-only. Subscription proof uses presigned upload + submit and does not approve/settle. Product media uses documented presigned upload/link. No tenant customer list until documented.

## 10. UI states
Loading, empty, error/retry, success, validation, saving/disabled and upload progress/failure. Prevent duplicate mutations and confirm destructive actions.

## 11. Responsive and theme
Preserve BBG responsive patterns, dialogs/drawers, theme tokens and accessible focus.

## 12. Acceptance criteria
1. Business data is scoped to the active authorized tenant.
2. Team list is read-only; no unsupported invitation/role actions.
3. Supported order transition updates only after server success.
4. Enquiry response/close refreshes after success.
5. Payments expose no unsupported capture/refund actions.
6. Proof upload never marks subscription approved or order paid.
7. Given a tenant member opens Customers, when the directory loads, then the existing tenant customer API returns only records authorized for that tenant and the CUSTOMERS_MANAGE permission.

## Open questions
- Verify the tenant customer response DTO against the existing DAO result and current frontend rendering before introducing a dedicated customer-detail workflow.
- UNKNOWN: Live S3 bucket/CORS configuration for end-to-end media/proof verification.
- UNKNOWN: Tenant analytics beyond entrepreneur summary and promotion engagement.

## Implementation log
- Added business module cards to the workspace overview from the same permission-filtered navigation registry used by the sidebar; cards link to the existing business routes.
- Requirement created on approved branch HG_CODE_IMPROVEMENTS.
- Added tenant-scoped order, enquiry, payment and subscription detail views using the existing API V1 routes and read actions; the backend remains responsible for tenant membership and record ownership.
- Added previous/next pagination to supported tenant record lists, using server-reported totals.
