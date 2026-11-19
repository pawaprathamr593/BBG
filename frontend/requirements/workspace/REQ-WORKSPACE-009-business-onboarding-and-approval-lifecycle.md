---
id: REQ-WORKSPACE-009
title: Multi-business onboarding, payment review and workspace lifecycle
area: workspace
type: enhancement
owner: unset
status: in-progress
---

# Multi-business onboarding, payment review and workspace lifecycle

## 1. Problem
A signed-in person must be able to register more than one business, save and resume incomplete applications, choose a subscription plan, pay using BBG's configured payment instructions, upload proof and submit one complete request for platform review. Admins need one payment-backed review queue. Approval activates the business workspace and subscription. Business owners must later manage subscription changes and eligible team access without changing the existing RBAC model.

## 2. Personas
| Persona | Device | Goal |
| --- | --- | --- |
| Business owner | Desktop / tablet | Register and manage multiple businesses, pay, resume applications, manage subscription and team |
| Platform admin | Desktop | Review business details and payment receipt, approve or reject with remarks |
| Invited user | Phone / desktop | Sign in or register using the invited email and accept a business-team invitation |

## 3. Scope
**In scope:**
- Multiple business applications per authenticated owner.
- Draft save, resume, and application list.
- Active subscription plan selection.
- Existing BBG UPI QR/payment instructions and S3 receipt upload.
- Submit the application for admin review only after receipt submission.
- Admin queue showing business, plan and payment state; full details and receipt in the existing review drawer.
- Admin approval/rejection with remarks and consistent business/subscription/tenant status transitions.
- Business workspace access after approval.
- Subscription upgrades and renewals with the old subscription retained until the replacement is approved.
- Storefront configuration/publication through existing workspace capabilities.
- Existing-user team search/add and secure invitation links for new users.
- Assign only the existing tenant-scoped TENANT_ORDER_MANAGER role through this workflow.

**Out of scope:**
- Any change to authentication, RBAC role/permission definitions, tenant permission evaluation, guards or interceptors.
- New tenant roles or platform-role assignment by tenant owners.
- A payment gateway integration; BBG's manual QR and receipt workflow remains.
- Email-provider integration where no approved provider is configured; return a copyable invitation link.
- Physical deletion of applications, subscriptions, memberships or invitations.

## 4. Entry and context
- Routes: /business/register, /workspace, /dashboard/subscription-approval, /dashboard/subscriptions, /business/team, /business/storefront, /business/subscriptions, /invite/accept.
- Business registration and application-scoped payment actions require an authenticated user who owns the selected business application.
- Admin review uses the existing platform-admin authorization path.
- Team management requires the active tenant owner. Invitation acceptance requires an authenticated account whose email matches the invitation.

## 5. Flow
1. Owner starts a new business registration or resumes an existing draft.
2. Owner enters a business name and URL-safe storefront slug; the draft can be saved before the rest of the details are complete.
3. Owner completes the required business details and address, then loads active plans.
4. Owner selects one plan. BBG creates a pending subscription and snapshots the current payment instructions/QR configuration.
5. Owner pays and uploads a receipt. BBG verifies the uploaded object and stores proof metadata. Only then does the business application transition from DRAFT to PENDING.
6. The owner can return to a draft/payment request and continue where they left off. A rejected proof can be replaced and resubmitted.
7. The platform admin sees the business name, selected plan and payment proof in the subscription-backed onboarding queue; opening details shows the full business profile and receipt.
8. Approval activates the subscription, approves the business and activates its tenant in one transaction. Rejection records remarks and leaves the previous active subscription intact for upgrade/renewal cases.
9. The owner opens the approved business workspace, manages storefront publication and later requests an upgrade or renewal. The previous subscription remains active until a replacement is approved.
10. The owner searches for an existing BBG user by email and adds that user with the existing TENANT_ORDER_MANAGER role, or creates a single-use seven-day invitation link for a new user. The invitee registers/signs in with that email and accepts the invitation.

## 6. Screens / regions
| Region | Intent | Reuse expectation |
| --- | --- | --- |
| Business details | Save draft and complete required registration fields | Existing business registration page and location capture |
| Plan selection | Compare active plans | Existing plan data and BBG visual patterns |
| Payment | Show QR, payee, UPI ID and instructions; upload receipt | Existing payment QR snapshot and S3 upload pattern |
| Application status | List all owned businesses and resume draft/rejected proof | Existing /workspace status page |
| Admin onboarding review | Business name, plan, payment status, approve/reject and details | Existing subscription review queue and drawer |
| Subscription management | Upgrade/renew and upload proof | Owner-only subscription management page for plan changes, renewals and proof upload |
| Team & Access | Search/add existing user or generate invitation link | Owner-only Team & Access page, core tenant API service and tenant context |
| Invitation acceptance | Sign in/register then accept invite | Existing auth experience and lazy route pattern |

## 7. API
| Operation | Method | Path | Envelope | Status |
| --- | --- | --- | --- | --- |
| List owned business applications | POST | /api/v1/business/application/list | businessParam | Added |
| Save/update draft | POST | /api/v1/business/application/draft/save | businessParam | Added |
| List active plans | POST | /api/v1/subscriptions/plans/list | subscriptionParam | Existing |
| Create application subscription | POST | /api/v1/subscriptions/application/request | subscriptionParam | Added |
| Restore current application payment | POST | /api/v1/subscriptions/application/current | subscriptionParam | Added |
| List owned subscriptions | POST | /api/v1/subscriptions/application/list | subscriptionParam | Added |
| Create proof upload URL | POST | /api/v1/subscriptions/application/proofs/upload-url | subscriptionParam | Added |
| Submit payment proof | POST | /api/v1/subscriptions/application/proofs/submit | subscriptionParam | Added |
| Upgrade subscription | POST | /api/v1/subscriptions/application/upgrade/request | subscriptionParam | Added |
| Renew subscription | POST | /api/v1/subscriptions/application/renewal/request | subscriptionParam | Added |
| Review pending payment-backed onboarding | POST | Existing admin subscription queue/detail/approve/reject paths | adminParam | Existing; queue query extended |
| List team members (owner) | POST | /api/v1/tenants/members/owner-list | tenantParam | Added |
| Search eligible existing users | POST | /api/v1/tenants/members/search | tenantParam | Added |
| Add existing user | POST | /api/v1/tenants/members/add | tenantParam | Added |
| Create invitation | POST | /api/v1/tenants/invitations/create | tenantParam | Added |
| Get owner storefront | POST | /api/v1/business/storefront/owner/get | businessParam | Added |
| Update owner storefront | POST | /api/v1/business/storefront/owner/update | businessParam | Added |
| Publish owner storefront | POST | /api/v1/business/storefront/owner/publish | businessParam | Added |
| Unpublish owner storefront | POST | /api/v1/business/storefront/owner/unpublish | businessParam | Added |
| Accept invitation | POST | /api/v1/tenants/invitations/accept | tenantParam | Added |

## 8. Permissions
| Action | Permission / authorization | Status |
| --- | --- | --- |
| Save/list/pay for a business application | Authenticated owner verified against TENANT_OWNER membership for that application; no tenant RBAC bypass | Added as scoped application-ownership operations |
| Admin review and decision | Existing platform admin permission path | Existing |
| Upgrade/renew and subscription proof | Active TENANT_OWNER for the selected tenant; server validates ownership | Added as scoped owner operations |
| Manage team | Active TENANT_OWNER for the selected tenant; server validates ownership | Added as scoped owner operations |
| Configure/publish storefront | Active TENANT_OWNER plus existing STOREFRONT_ACCESS entitlement; server validates ownership and approved business | Added as scoped owner operations; existing entitlement rules retained |
| Team member role | Existing TENANT_ORDER_MANAGER with TENANT scope only | Existing role; no RBAC seed changes |
| Invitation acceptance | Authenticated user email must match invitation email; token is one-time and expires after seven days | Added |

## 9. Rules and validation
- One owner can own multiple independent business applications.
- A draft requires business name and URL-safe unique slug; other business details can be completed before plan selection.
- Draft status remains DRAFT until a verified payment receipt is submitted.
- Payment requests snapshot the active QR/payee instructions so later QR changes do not alter an existing request.
- A pending or rejected subscription request blocks duplicate requests for the same tenant.
- Proof upload accepts only supported image/PDF types, verifies S3 object existence, actual MIME signature, extension and maximum size.
- Admin approval requires a pending proof. Approval activates the new subscription and business; for an upgrade/renewal it closes the linked previous subscription only after approval.
- Rejected upgrade/renewal leaves the previous active subscription unchanged.
- Invitation tokens are random, single-use, stored only as SHA-256 hashes and expire after seven days.
- Team invitations and assignments are tenant-scoped; TENANT_OWNER and all PLATFORM roles are not assignable through this workflow.
- No normal application operation physically deletes records.
- No changes to RBAC, auth, guards, interceptors or tenant permission evaluation.

## 10. UI states
Loading, empty, error, success and permission-denied states are required for application lists, plans, payment, admin review, team search and invitation acceptance. Disable duplicate mutations and show success only after the backend confirms success.

## 11. Responsive and theme
Use existing BBG SCSS tokens and light/dark themes. The registration, payment, team and invitation screens must remain keyboard accessible and usable at mobile widths (~360–390px), tablet and desktop.

## 12. Acceptance criteria
1. Given an authenticated owner with existing businesses, when they start another registration, then a new independent business draft can be created.
2. Given an incomplete draft, when the owner leaves and returns, then the draft can be reopened with previously saved values.
3. Given completed business details, when active plans load, then the owner can select one available plan.
4. Given a selected plan, when the payment request is created, then BBG shows the snapshotted QR, payee, UPI ID, amount and instructions.
5. Given a payment receipt, when it is uploaded and verified, then proof metadata is stored and the application becomes PENDING.
6. Given a pending payment request without a submitted receipt, when the owner resumes, then the existing payment request is restored rather than duplicated.
7. Given a rejected payment proof, when the owner returns, then they can upload a replacement receipt.
8. Given a submitted payment-backed application, when an admin opens the queue, then business name, selected plan and payment status are visible.
9. Given an admin opens application details, then the full business profile and uploaded receipt are available.
10. Given a valid pending proof, when the admin approves, then business approval, tenant activation and subscription activation succeed together.
11. Given a rejected upgrade/renewal, then the previous active subscription remains active.
12. Given an approved business, when the owner opens the workspace, then the existing business modules and storefront controls remain available.
13. Given an active subscription, when the owner requests an upgrade, then the replacement remains pending and the current plan stays active until approval.
14. Given an owner searches an existing active BBG user by email, then the owner can add them only with TENANT_ORDER_MANAGER.
15. Given no active BBG account exists for an email, then the owner can create a seven-day invitation link.
16. Given an invitee signs in/registers with the invited email and accepts the token, then membership and the existing tenant role are assigned.
17. Given an approved business with the storefront entitlement, when the owner saves storefront settings and publishes, then STOREFRONT_SETTINGS and BUSINESS_PROFILES publication states are updated and the existing /store/:businessSlug route can resolve the public storefront.
18. At no point does this workflow modify RBAC definitions, auth, guards, interceptors or tenant authorization logic.

## Open questions
- The new SQL migrations are additive and covered by CI; applying them to a real development/staging database still requires schema verification and backup.
- No email-delivery provider was found in the current frontend/backend implementation; the initial release returns a copyable invitation URL.

## Implementation log
- Added owned-application listing and draft save/update with server-side TENANT_OWNER checks.
- Added application-scoped subscription request, payment-instruction restoration, proof upload and proof submission. Draft becomes PENDING only after a verified receipt.
- Added payment-backed admin queue filtering and business/plan fields; existing subscription approval atomically approves the business and activates the tenant/subscription.
- Added subscription replacement lineage for upgrades/renewals; prior subscription closes only after replacement approval.
- Added owner-scoped team search/add and seven-day single-use invitation tokens on /business/team. Existing dashboard permission guard/navigation remain unchanged. Only existing TENANT_ORDER_MANAGER role is assignable.
- Added owner-scoped storefront configuration/publication using existing DAO operations and entitlement checks, exposed from the approved business card.
- Added owner-only subscription management page for upgrade, renewal, payment-proof resume and receipt upload, exposed from the approved business card.
- Added a workspace invitation acceptance route and multi-business status/resume UI.
- Verification at commit 407cce0e19cd8fdc0e2df6f597386a37680a5420: Angular frontend build, backend PHP syntax lint, static API route/actionType contract checks, and MySQL 8.4 migration/schema checks all passed in GitHub Actions. The current branch head after that run contains documentation-only updates. Prettier, git diff --check, visual browser checks and applying migrations to a real development/staging database remain to be completed.
