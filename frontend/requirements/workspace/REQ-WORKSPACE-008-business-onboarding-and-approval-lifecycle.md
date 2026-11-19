---
id: REQ-WORKSPACE-008
title: Business onboarding, payment and approval lifecycle
area: workspace
type: enhancement
owner: unset
status: in_progress
---

# Business onboarding, payment and approval lifecycle

## 1. Problem

The current registration API creates a tenant, owner membership, tenant-owner assignment, business profile and storefront settings. The frontend then immediately attempts to switch into that tenant and navigate to subscriptions. A pending tenant is not necessarily available through the normal active-workspace list, so the application can be successfully persisted while the registration page remains visible and reports a misleading failure.

The current flow also treats an authenticated user's first business application as their only application. A user who already owns or belongs to another business, or who has roles in other businesses, must be able to register additional independent businesses.

Business details, location, plan selection, QR payment instructions, receipt upload, admin review, workspace activation and public storefront availability must behave as one recoverable lifecycle. An incomplete application must be resumable without creating duplicate tenants, profiles, subscriptions or payment proofs.

## 2. Personas

| Persona | Device | Goal |
| --- | --- | --- |
| Authenticated individual / business applicant | Mobile, tablet, desktop | Register one or more businesses and resume each application |
| Business owner | Mobile, tablet, desktop | Complete payment, monitor review and access an approved workspace |
| Platform administrator | Desktop, tablet, mobile | Review a concise business queue and inspect complete application/payment details before deciding |
| Public marketplace visitor | Mobile, tablet, desktop | Open an approved and published business storefront by slug |

## 3. Scope

**In scope:**

- Require an authenticated account before starting or saving a business application.
- Allow a user to create multiple independent business applications regardless of existing tenant memberships, business ownerships, or roles in other tenants.
- Replace the single-application redirect with an application list/status experience and a clear action to start another business registration.
- Provide a resumable multi-step wizard: business identity/contact/address; optional browser geolocation capture; plan selection; versioned platform QR/payment instructions; payment reference and receipt upload; review and final submission.
- Persist draft progress server-side after each safe step; reload saved draft when the owner returns or signs in on another device.
- Preserve the selected QR configuration/version and payee details shown when the payment step was started.
- Reuse the existing presigned S3 upload and proof submission flow where compatible.
- Show an explicit success/status screen after each successful server operation. A later workspace-switch/navigation failure must not be reported as registration failure or cause duplicate application creation.
- Provide an admin queue whose primary row/card shows business name, selected plan and decision actions (Approve and View details).
- Reuse the existing right-side workspace drawer for full application details, location, selected plan, payment reference, receipt preview/download and review history.
- Ensure approval is one consistent, transaction-safe lifecycle decision. Subscription, business approval, tenant activation, owner workspace access and storefront publication must not become partially active.
- Automatically publish/activate the public storefront after successful approval and payment verification. The owner may subsequently unpublish it from the workspace.
- Make the public route /store/:businessSlug resolve only when all publication, approval, subscription and tenant conditions are satisfied.
- Preserve the existing Yii 3 seven-layer backend architecture, API response envelope and tenant authorization.
- Add database migrations only after current live schema and migration history have been reconciled. Migrations must be additive and safe for existing records.

**Out of scope:**

- Online payment gateway integration or automatic bank/UPI settlement verification; receipt review remains manual unless separately approved.
- Changes to marketplace catalogue, order, promotion or customer workflows unrelated to storefront visibility.
- Subscription upgrade/downgrade policy beyond initial plan selection (REQ-WORKSPACE-009).
- Tenant team invitations and role assignment (REQ-WORKSPACE-010).
- Physical deletion of business, tenant, subscription or review records.
- Trusting client-supplied tenant IDs, user IDs, approval states, prices, plan entitlements or payment status.

## 4. Entry and context

- Routes: existing /business/register, /workspace, /dashboard and /store/:businessSlug.
- Registration and draft retrieval require an authenticated user. Unauthenticated users are directed to sign in and returned to the intended registration flow.
- A draft, payment-pending or review-pending application must not require the tenant to appear in the active workspace list. Do not switch to a pending tenant merely to continue onboarding.
- The backend derives the applicant from the authenticated principal. Client-supplied applicant user IDs or tenant IDs are never authorization grants.
- Application list/detail queries return only applications owned by or explicitly accessible to the authenticated user.

## 5. Flow

### 5.1 Applicant

1. Sign in or create a personal BBG account.
2. Open Business Registration. See all owned business applications and their statuses.
3. Choose Continue for an existing incomplete application or Register another business.
4. Complete business details and address. Optionally select Get My Location; after browser permission, save latitude, longitude and reported accuracy. Keep every address field editable so the applicant can correct or replace the business address. Geolocation is optional; manual address entry remains available.
5. Continue to plan selection. Display only active, purchasable plans and their current prices/entitlements.
6. Select a plan and review its billing amount and billing period.
7. Display the currently effective platform QR configuration and payment instructions captured for this subscription request.
8. Enter payment reference when available and upload the receipt using the existing secure upload flow.
9. Review all business, location, plan and payment information, then submit for approval.
10. Show a durable confirmation with application reference, business name, plan, submitted time and status. Do not switch to a pending tenant as a prerequisite for showing success.
11. On later visits, resume saved application at its last incomplete step. Submitted applications are read-only except for an explicit correction/resubmission flow.
12. When approved, refresh the user's business list and allow entry to the activated business workspace. The public storefront is available at /store/:businessSlug.

### 5.2 Administrator

1. Open the unified pending business/payment review queue.
2. See concise rows/cards with business name, selected plan, payment amount and current review status; primary actions are Approve and View details.
3. Open View details in the shared right-side drawer.
4. Inspect full business details, editable address values, captured coordinates/accuracy, selected plan, captured QR/payee snapshot, payment reference, uploaded receipt and review history.
5. Approve or reject with a reason according to the agreed review policy.
6. On approval, backend performs the full activation transition atomically. On rejection, the owner sees the reason and can correct/resubmit without losing application history.
7. Repeated approval/rejection requests are idempotently rejected or return the already-final state; no duplicate subscriptions or review rows are created.

### 5.3 Failure and resume

- If draft save fails, keep entered values in the current page session and show a retryable error; do not advance the wizard.
- If the backend successfully saves/submits but the response is lost, reload by application identifier/list and reconcile server state before retrying.
- If S3 upload succeeds but proof submission fails, retain the uploaded object reference and allow retry without unnecessarily uploading duplicate objects.
- If workspace context refresh fails after approval, show the approved application and retry workspace loading separately.
- If a plan or QR configuration becomes unavailable before payment submission, explain the change and require explicit plan/payment-instruction refresh; never silently alter the selected amount or payee.

## 6. Screens / regions

| Region | Intent | Reuse expectation |
| --- | --- | --- |
| My businesses | List all applications, statuses and next actions | Existing /workspace page and shared record/card patterns |
| Business details step | Capture identity/contact/address fields | Existing business registration form patterns |
| Location capture | Optionally capture device coordinates and manually edit address fields | Browser Geolocation API; no map SDK or geocoding provider |
| Plan selection step | Compare eligible plans and select one | Existing subscription plans module and plan DTOs |
| QR payment step | Show versioned QR and instructions | Existing platform QR configuration and captured subscription payment instructions |
| Receipt step | Upload proof and enter payment reference | Existing S3 presigned upload service and subscription proof workflow |
| Review/confirmation | Review complete details and show durable status | Existing card/summary patterns |
| Admin review queue | Compact pending review rows | Existing Platform Administration record-list patterns |
| Admin details drawer | Complete application and receipt details | Existing shared WorkspaceDrawer and subscription review detail pattern |
| Public storefront | Render approved/published business by slug | Existing /store/:businessSlug route and storefront API |

## 7. API

All current paths below are confirmed from backend/config/common/routes.php. Request/response DTO details must be taken from the current V1 service and frontend API service; do not infer fields from route names.

| Operation | Method | Path | Envelope | Status |
| --- | --- | --- | --- | --- |
| Submit initial business application | POST | /api/v1/business/application/submit | businessParam | Existing; currently creates tenant/profile and rejects a second application for the user |
| Get business application | POST | /api/v1/business/application/get | businessParam | Existing; currently returns one application, not a collection |
| Update pending application | POST | /api/v1/business/application/update | businessParam | Existing |
| Resubmit rejected application | POST | /api/v1/business/application/resubmit | businessParam | Existing |
| List all my business applications | POST | /api/v1/business/applications/mine/list | businessParam | Implemented in current branch; authenticated owner-scoped query |
| Save/resume application draft | POST | UNKNOWN | businessParam | Required; action/contract and draft persistence mapping not implemented |
| List active plans | POST | /api/v1/subscriptions/plans/list | subscriptionParam | Existing |
| Request subscription for a business | POST | /api/v1/subscriptions/request | subscriptionParam | Existing; confirm compatibility with pending onboarding |
| Get current platform payment QR | POST | /api/v1/admin/subscriptions/payment-qr/current | adminParam | Existing admin route; confirm safe applicant read access or use an existing public/payment-config read action |
| Request proof upload URL | POST | /api/v1/subscriptions/proofs/upload-url | subscriptionParam | Existing |
| Submit payment proof | POST | /api/v1/subscriptions/proofs/submit | subscriptionParam | Existing |
| List pending business applications/payments | POST | Existing admin pending-list route(s) | adminParam | Existing routes; unify list semantics and selected-plan projection |
| Get admin business/payment detail | POST | Existing admin detail route(s) | adminParam | Existing routes; confirm receipt and QR snapshot are included |
| Approve/reject business/payment | POST | Existing admin approve/reject route(s) | adminParam | Existing routes; reconcile duplicate business and subscription approval transitions |
| Public storefront by slug | POST | Existing marketplace/storefront data action | Existing marketplace/storefront envelope | Existing; verify all public visibility predicates and route/API mapping |

New or changed endpoint/action contracts must be documented and implemented consistently across Controller, V1 DTO/Service, Core Service and DAO layers. Do not add frontend calls until the backend contract exists.

## 8. Permissions

| Action | Permission key | Status |
| --- | --- | --- |
| Create/save own business application | Authenticated principal; no tenant permission because no active tenant is required | Required policy; verify backend |
| List/get own applications | Authenticated principal + ownership predicate | Required; permission key not applicable |
| Choose plan and submit own payment proof | Existing pending-tenant subscription permission path | subscription.create / subscription.update candidates; verify exact backend checks |
| View admin review queue/details | Existing platform-admin authorization | Exact permission code UNKNOWN |
| Approve/reject payment-backed application | Existing platform-admin authorization | Exact permission code UNKNOWN |
| View public storefront | Public, only for published/approved/active businesses with valid active subscription | Required visibility policy |

Backend authorization is authoritative. Frontend route visibility and role labels are not security controls.

## 9. Rules and validation

- Backend: follow the existing Yii 3 Controller → V1 DTO/Service → Core Service → DAO boundaries. Keep HTTP mapping out of DAOs and SQL out of controllers.
- Core Services and DAOs return the existing status/msgArr/data array contract. Use typed PHP parameters/return types, dependency injection, prepared SQL parameters, focused methods and structured PSR logging, matching adjacent BBG Yii 3 files. Do not copy Yii 1.1 static service/DAO examples into Yii 3.
- Frontend: Angular 22 standalone components, OnPush, inject(), typed DTOs, signals for feature state and RxJS for HTTP. No any, no new UI framework/state library, no HTTP calls in presentational components.
- Preserve existing API base URL, auth interceptor, request envelopes and response mapping unless the requirement explicitly introduces a documented new contract.
- Use one server-authoritative application state machine. Exact persisted states and transition table are UNKNOWN until reconciled with BUSINESS_APPLICATIONS, BUSINESS_PROFILES, TENANTS, TENANT_SUBSCRIPTIONS, SUBSCRIPTION_PAYMENT_PROOFS and review-history schemas.
- Allow multiple distinct businesses per user. Enforce one active draft/onboarding flow per tenant, slug uniqueness and approved platform policy.
- Do not block registration because the user already has other tenants, owner roles, employee roles or a Consumer platform role.
- Every new business creates its own tenant, owner membership and tenant-scoped TENANT_OWNER assignment; never create a PLATFORM/GLOBAL role assignment for business ownership.
- Verify slug uniqueness across active business profiles and reserve a slug for a draft according to an approved expiry/cancellation policy.
- Browser geolocation requires a secure context (HTTPS, except localhost) and explicit user permission. Handle permission denied, timeout, unavailable position and unsupported browsers without blocking registration.
- Store latitude and longitude independently from address text; validate latitude within -90..90 and longitude within -180..180. Store reported accuracy when the verified schema supports it. Editing address text must not silently change coordinates; the user can recapture location explicitly.
- The browser Geolocation API returns coordinates, not a postal address. Do not fabricate an address or add reverse-geocoding/network dependencies under this requirement. Keep address fields editable and allow manual entry/correction.
- Plan price, currency, billing period and entitlements are loaded from active backend plan data. Never trust client-submitted amount or entitlements.
- QR payee, UPI ID, QR file path, instructions and config version are captured immutably for each subscription request.
- Uploading a receipt is not payment approval and must not activate the subscription or storefront.
- Approval verifies the exact pending subscription/proof and atomically updates subscription, business approval, tenant status, review history and storefront publication state.
- Rejection preserves submitted data and history. Resubmission retains history and requires a new proof only when payment policy requires it.
- Public slug lookup enforces publication, approval, tenant, storefront and subscription checks consistently; frontend route guards are not security.
- Use common audit columns and soft-delete convention (status A active, status Z deleted). No physical deletion in application flows.
- Do not expose private receipt object paths or payment proofs to public routes.

## 10. UI states

Loading, draft-saving, saved, validation, upload progress, upload retry, submission pending, submitted, review pending, approved, rejected, unavailable plan, expired QR configuration, permission denied, empty application list and recoverable server error. Disable duplicate saves/submits/approvals while in flight. Keep a visible last-saved and next-step indicator. Never show registration failure if the application was persisted.

## 11. Responsive and theme

Mobile-first onboarding form with optional browser location capture and keyboard-accessible editable address/coordinate fields. Admin queue and drawer work on desktop/tablet/mobile; narrow drawers use existing full-width treatment. Admin queue and drawer work on desktop/tablet/mobile; narrow drawers use existing full-width treatment. Preserve BBG light/dark tokens, focus styles, reduced-motion support and accessible labels.

## 12. Acceptance criteria

1. Given an authenticated user with no business, when they start registration, then a new draft is created and the first step is shown.
2. Given an authenticated user who already owns or belongs to one or more businesses or has other tenant/platform roles, when they start another registration, then a separate business application can be created without changing existing memberships or roles.
3. Given a user with multiple applications, when they open My Businesses, then every application they own is listed with its correct status and Continue/View action.
4. Given an incomplete draft, when the user leaves and returns or signs in on another device, then the wizard resumes from persisted server data without creating another tenant/profile.
5. Given a business details step, when the user chooses Get My Location and grants permission, then valid latitude/longitude are captured and saved; the address fields remain editable and can be corrected independently. Given permission is denied or unavailable, manual address entry still works.
6. Given an eligible plan, when the user selects it, then the server records the plan against the correct application/tenant and shows server-calculated price/currency/billing details.
7. Given a pending subscription, when the payment step opens, then the exact effective QR configuration and instructions are shown and captured for that subscription.
8. Given a receipt upload, when the upload succeeds, then proof can be submitted but subscription, tenant and storefront remain inactive pending admin review.
9. Given the business application and payment proof are successfully submitted, when the response is returned, then a durable confirmation/status screen is displayed even if workspace switching or navigation subsequently fails.
10. Given an administrator opens the pending queue, then the primary row displays business name and selected plan with Approve and View details actions; receipt details are not shown in the compact row.
11. Given an administrator opens View details, then the drawer displays full business details, location, plan, payment reference, receipt and relevant review history.
12. Given an administrator approves a valid pending application/payment, when the backend transaction commits, then subscription and business are approved, tenant becomes active, owner can enter the workspace, and storefront is published and resolvable at /store/:businessSlug.
13. Given an administrator rejects an application/payment, then the owner sees the rejection reason and can correct/resubmit without losing review history.
14. Given an unpublished, unapproved, inactive or subscription-expired business, when a public visitor opens /store/:businessSlug, then the storefront is not exposed.
15. Given a slug already used by another active business, when a user saves a draft or submits, then the server rejects the duplicate and preserves the rest of the draft.
16. Given any tenant/application identifier is tampered with, when an applicant or administrator calls the API, then backend ownership/platform permission checks prevent disclosure of another tenant's information.
17. Given repeated submit/approve requests or a network retry, then no duplicate tenant, membership, owner assignment, subscription, proof or review records are created.

## Open questions

- Confirm the deployed BUSINESS_PROFILES coordinate column precision and whether an accuracy column exists before applying any schema migration. Browser geolocation does not provide reverse-geocoded address text; reverse geocoding remains out of scope.
- UNKNOWN: Exact request/response DTOs for subscription request, proof upload/submit, admin pending list/detail/approve/reject and public storefront slug lookup.
- UNKNOWN: Should draft tenant/profile rows be created immediately, or should BUSINESS_APPLICATIONS be the pre-tenant source of truth and tenant creation happen later? The existing BUSINESS_APPLICATIONS table is not used by the active BusinessServices registration path.
- UNKNOWN: Reconcile application status values and ownership across BUSINESS_APPLICATIONS, BUSINESS_PROFILES, TENANTS, TENANT_SUBSCRIPTIONS and SUBSCRIPTION_PAYMENT_PROOFS.
- UNKNOWN: BUSINESS_APPLICATIONS currently has a unique key on tenant_id. Confirm whether one application per tenant is intended and how draft rows map to multiple businesses per applicant.
- UNKNOWN: Confirm whether business approval requires a valid proof and whether rejection requires a new proof on resubmission.
- UNKNOWN: Confirm pending-owner workspace visibility predicates and test the current tenant list/permission resolver.
- Confirmed current implementation constraint: existing admin business and subscription approval endpoints are separate. A single atomic combined approval action and its plan-duration/date policy still require implementation/design.
- UNKNOWN: Verify actual deployed latitude/longitude column type and precision; supplied database design says DOUBLE(10,2).
- UNKNOWN: Confirm receipt file size/MIME restrictions and S3 object retention/access policy.
- Proposed default: after successful payment-proof approval, automatically publish the storefront; the owner can unpublish it later.

## Implementation log

- Requirement drafted and updated on feature/business-onboarding-lifecycle.
- Implemented: authenticated owner-scoped business application list endpoint; multiple independent business registrations no longer blocked by an existing owned business; registration page lists existing businesses and keeps a durable success message instead of switching into a pending tenant; optional browser Geolocation capture for latitude/longitude; address fields remain editable; backend validates and persists optional coordinates using BUSINESS_PROFILES latitude/longitude; registration flow now lists active plans, creates a subscription request, displays the captured payment QR/instructions, uploads receipts through the existing presigned S3 flow, and submits payment proof for review.
- Implemented admin review improvements: business review queue rows include the latest selected plan/subscription/payment-proof status; View details opens the shared right-side drawer and provides signed receipt/QR links; business approval is blocked until a payment-backed subscription is active; successful business approval activates storefront publication/settings. Subscription approval and business approval are still separate admin decisions, so the requested single atomic combined approval action remains outstanding.
- Implemented authorization alignment: subscription view/create/update operations map to the existing tenant-owner `SUBSCRIPTIONS_MANAGE` RBAC permission, including the existing pending-tenant permission gate; admin business and subscription review operations map to the seeded `BUSINESS_APPROVE` and `SUBSCRIPTIONS_APPROVE` platform permissions.
- Added migration `20261119_001_business_profile_geolocation_precision.sql` to add or widen coordinate columns to DECIMAL(10,7). It is documented but has not been executed; verify active database/schema and back up before applying.
- Location decision: browser Geolocation API only; no map SDK or reverse-geocoding provider. Browser geolocation returns coordinates, not a postal address, so address text remains manually editable and must be entered/corrected by the applicant.
- Not yet implemented: durable draft state before initial business creation, one atomic admin business+subscription approval transition, business admin queue/drawer consolidation, subscription upgrades, team invitations/role assignment, and end-to-end storefront publication reconciliation.
- Verification limitation: repository source was reviewed and edited through GitHub; Angular/PHP builds and live database schema were not run/verified in this environment. Confirm deployed coordinate column precision before release; the proposed DB design currently specifies DOUBLE(10,2), which is too coarse for precise location capture.
