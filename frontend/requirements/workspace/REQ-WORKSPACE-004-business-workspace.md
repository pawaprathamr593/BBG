---
id: REQ-WORKSPACE-004
title: Business workspace operations
area: workspace
type: enhancement
owner: frontend
status: draft
---

# Business workspace operations

## 1. Problem
Business owners and authorized staff need one workspace to manage business presence and day-to-day marketplace operations, while all tenant data and actions remain scoped and authorized by the backend.

## 2. Personas
| Persona | Device | Goal |
| --- | --- | --- |
| Business owner / tenant admin | Tablet / desktop | Manage business profile, storefront and business operations |
| Authorized business staff | Tablet / desktop | Perform only assigned tenant actions |
| Customer-facing business operator | Phone / tablet | Respond to enquiries and process supported orders |

## 3. Scope
**In scope:**
- Business profile and storefront read/update/publish/unpublish.
- Catalogue integration and navigation to existing catalogue feature; preserve its own contracts.
- Tenant member listing only (read-only).
- Business order queue/detail and supported status actions.
- Incoming enquiry list/detail/respond/close.
- Tenant payment list/detail (read-only).
- Promotion list/detail/create/update/publish/unpublish and supported media flow.
- Subscription plans, own subscription history/detail, request/renewal and payment-proof upload/submit.
- Entrepreneur dashboard summary and supported analytics views.
- Customer-related business views only where a confirmed backend endpoint and DTO exist.

**Out of scope:**
- Tenant invitations, member creation, role assignment or permission editing.
- Business verification document upload.
- Payment gateway, automated payment confirmation, refunds or invoice generation.
- Supplier, purchasing, inventory and expense workflows.
- Unconfirmed tenant customer-list APIs or unapproved analytics endpoints.

## 4. Entry and context
- Routes: preserve current business workspace sections (profile, storefront, catalogue, customers, orders, enquiries, payments, promotions, subscriptions, members, analytics).
- Required params / auth / workspace context: authenticated user with backend-authorized tenant membership; tenant context derived and verified server-side.

## 5. Flow
1. User selects an authorized business context.
2. UI loads the relevant section and its tenant-scoped data.
3. User opens a record, edits supported fields or invokes a supported action.
4. UI validates the request using existing DTO rules and prevents duplicate submission.
5. After success, reloads or reconciles the record from the server response.
6. On cancel, discard unsaved changes; on failure, preserve safe form input and display the error.

## 6. Screens / regions
| Region | Intent | Reuse expectation |
| --- | --- | --- |
| Business profile/storefront | Edit business information and public presence | Existing forms and publish controls |
| Catalogue | Manage product/category data | Existing catalogue module |
| Members | Inspect authorized tenant members | Read-only member list |
| Orders | Review tenant orders and supported transitions | Existing list/detail/dialog patterns |
| Enquiries | Review/respond/close enquiries | Existing enquiry list and thread |
| Payments | Read tenant payment records | Read-only history |
| Promotions | Manage eligible promotions and media | Existing composer and upload flow |
| Subscriptions | Plans, history, renewal and proof | Existing subscription screens and S3 proof flow |
| Analytics | Display available summary metrics | Existing dashboard summary patterns |

## 7. API
Existing POST contracts from backend API V1 catalogue:
| Operation | Path | Status |
| --- | --- | --- |
| Tenant members list | `/api/v1/tenants/members/list` | Documented |
| Business profile/storefront | `/api/v1/business/profile/get`, `profile/update`, `storefront/get`, `storefront/update`, `storefront/publish`, `storefront/unpublish` | Documented |
| Catalogue | `/api/v1/catalogue/*` | Documented; owned by catalogue feature |
| Tenant orders | `/api/v1/orders/tenant/list`, `tenant/detail`, `tenant/status` | Documented |
| Tenant enquiries | `/api/v1/enquiries/tenant/list`, `tenant/detail`, `tenant/respond`, `tenant/close` | Documented |
| Tenant payments | `/api/v1/payments/tenant/list`, `tenant/detail` | Documented |
| Promotions | `/api/v1/promotions/mine/list`, `mine/detail`, `create`, `update`, `delete`, `publish`, `unpublish`, `engagement` | Documented |
| Subscriptions | `/api/v1/subscriptions/plans/list`, `mine/list`, `mine/detail`, `request`, `renewal/request`, `proofs/upload-url`, `proofs/submit` | Documented |
| Entrepreneur summary | `/api/v1/dashboard/entrepreneur/summary` | Documented |
| Tenant customer directory | Existing frontend call `/api/v1/customers/tenant/list` | UNKNOWN — not in API V1 catalogue; do not depend on it |

## 8. Permissions
| Action | Permission key | Status |
| --- | --- | --- |
| View/manage business profile and storefront | Existing tenant permissions | Exact keys must be verified; backend authoritative |
| Catalogue operations | Existing catalogue permissions | Reuse existing keys |
| Orders/enquiries/promotions/subscriptions | Existing module permissions | Verify exact keys; no new keys |
| View tenant members | Existing tenant membership permission | Verify exact key |
| Tenant customer directory | UNKNOWN | Hide/disable until contract and permission confirmed |

## 9. Rules and validation
- Never send or trust a browser-selected tenant ID as proof of access.
- Do not add endpoints, DTO fields, status transitions or permission codes.
- Order actions are limited to backend-supported transitions; current catalogue documents REQUESTED/PLACED to CONFIRMED/CANCELLED.
- Payment history is read-only; proof upload is not payment confirmation.
- Subscription proof upload follows presigned URL → direct upload → submit; backend verifies the object.
- Respect plan entitlements and backend lifecycle rules; do not infer entitlement from UI state.
- Member management is read-only.

## 10. UI states
Each section must support loading, empty, error/retry, success, validation and permission-denied states. Mutations prevent duplicate submission and destructive actions require confirmation.

## 11. Responsive and theme
Mobile-first; order/enquiry detail and promotion forms must adapt to narrow screens. Preserve light/dark tokens, accessible labels and keyboard/touch operation.

## 12. Acceptance criteria
1. Given an authorized user opens business profile/storefront, when the API succeeds, then the current tenant's data is displayed and supported edits are saved through existing contracts.
2. Given a user opens tenant orders, when records load, then only authorized tenant records appear and only documented transitions are available.
3. Given a user responds to or closes an enquiry, when the backend confirms success, then the thread/list reflects the server result.
4. Given a user manages a promotion, when a mutation succeeds, then its server-confirmed state is shown and unsupported media/actions are not offered.
5. Given a user requests or renews a subscription, when proof is required, then the established proof upload flow is used without marking payment as paid.
6. Given the frontend references an undocumented customer directory endpoint, when this requirement is implemented, then that call is not treated as a supported capability until backend contract approval.
7. Given a user opens tenant members, when the list loads, then it is read-only.
8. Given any tenant API request is unauthorized, when the server rejects it, then no cross-tenant data is displayed.

## Open questions
- UNKNOWN: current frontend API call for `/api/v1/customers/tenant/list` has no matching route in the backend catalogue.
- UNKNOWN: admin payment QR configuration currently referenced by the frontend is not in the backend catalogue; remove/deactivate unsupported controls unless a backend contract is approved.
- UNKNOWN: exact permission keys and response DTOs must be verified in code/backend before changing API service boundaries.
- Readiness: Ready with gaps — most workflows have documented API contracts; customer directory and payment QR configuration are explicitly blocked.

## Implementation log
- Pending implementation.
