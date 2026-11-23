---
id: BBG-REQ-001
title: Business Lifecycle, Subscription Activation, Tenant Ownership, RBAC, Entitlements and Storefront Publication
module: business-onboarding-subscriptions
type: enhancement
owner: product-and-engineering
status: draft
version: 1.0
last_updated: 2026-11-23
stack:
  frontend: Angular 22
  backend: Yii 3 / PHP 8.4
  database: MySQL 8.4
---

# BBG — Business Lifecycle, Subscription Activation, Tenant Ownership, RBAC, Entitlements & Storefront Publication

## 1. Purpose

This requirement defines the end-to-end business lifecycle for BBG, from a user's first business application through platform review, subscription approval and activation, tenant ownership, module access, team invitations, role-based permissions, and storefront publication.

It also defines the platform administrator's subscription-validity control during approval.

This is a cross-layer requirement. It must be analysed and implemented across Angular 22, Yii 3, the existing seven-layer backend architecture, database persistence, authorization, file storage, and public marketplace queries.

**Primary outcome:** The person who originally registered an approved business becomes its initial tenant owner. The active plan determines the tenant's module and feature entitlements. Each tenant user can perform only the actions allowed by both the tenant's active plan and that user's tenant-scoped role. The storefront reaches its correct publication state only when all configured publication conditions are satisfied.

## 2. Authority, source documents and implementation evidence

Use these supplied project references as design baselines:

- `BBG_Backend_Architecture_v1.0.md`
- `frontend_architecture.md`
- `BBG_Database_Design_Final_v2.0.md`
- Existing repository `.agents/` and `.agent/` instructions and skills.

Important interpretation:

1. The backend architecture document describes the seven-layer architecture and records pending decisions; it is not proof that every proposed file/API exists.
2. The database design is a proposed data dictionary, not proof of the live schema. Verify the actual MySQL schema and current DAO/model usage before relying on any table or column.
3. The frontend architecture document includes proposed features and open questions. Verify actual routes, components, services, state and API contracts.
4. Actual repository implementation and live schema are the evidence for implementation status.
5. Do not silently reconcile differences between the documents and code. Record discrepancies and resolve them through the project's decision process.

## 3. Goals

- Allow applicants to save and continue business applications as drafts.
- Return rejected/needs-correction applications to the original applicant with actionable notes.
- Allow applicants to update and resubmit returned applications.
- Allow platform administrators to inspect payment receipts/proofs in a popup and download them when authorized.
- Present subscription details in clear, categorized sections.
- Allow an administrator to approve a business and determine its subscription validity using the existing plan billing cycle.
- Start subscription validity at the exact time the subscription is approved, not at application creation, payment upload, or an earlier date.
- Assign the original business applicant as the initial tenant owner through the existing tenant membership and role model.
- Resolve plan entitlements and activate the included tenant modules.
- Allow the owner to invite users and assign only delegable tenant roles.
- Enforce the intersection of plan entitlements and user role permissions in the backend.
- Correctly transition eligible storefronts from draft to the appropriate publication state.
- Preserve platform/tenant separation and prevent cross-tenant access.

## 4. Non-goals and boundaries

Unless repository evidence proves a narrowly required dependency, do not redesign or modify:

- Unrelated Personal Account functionality.
- Unrelated Consumer dashboard functionality.
- Existing Business Workspace modules unrelated to this lifecycle.
- Platform Administration modules unrelated to business/subscription review.
- Product, order, inventory, promotion, or marketplace functionality outside the required publication/visibility integration.
- Authentication provider architecture.
- Global tenant-switching behavior.
- Unrelated APIs or database structures.

Do not:
- Invent API routes, DTO fields, permission keys, status values, table names, columns, or plan features.
- Hardcode plan names as authorization logic.
- Treat a UI-hidden action as backend authorization.
- Grant platform-administrator privileges to a tenant owner.
- Trust a client-supplied user ID, tenant ID, role ID, approval timestamp, or subscription start date as authoritative.
- Automatically publish incomplete or ineligible storefronts.
- Create schema migrations before documenting the gap and obtaining explicit approval.
- Commit, push, reset, clean, merge, rebase, or switch branches unless separately requested.

## 5. Personas and access domains

### 5.1 Applicant / business registrant

The authenticated user who creates the business application.

Can:
- Create and save their own application draft.
- Continue their own saved draft.
- Submit their application.
- View its review state and administrator notes.
- Correct and resubmit an application returned for updates.
- View subscription and payment status relevant to their business.
- Access the tenant workspace after valid activation and owner assignment.

Cannot:
- Read or modify another applicant's application.
- Approve their own business or subscription.
- Set trusted tenant ownership or subscription dates from the client.
- Grant themselves platform roles.

### 5.2 Platform administrator

A platform-level actor with the relevant platform permissions.

Can, subject to existing permission definitions:
- Review business applications.
- Approve or return/reject applications with required notes.
- Review subscription and payment proof.
- Preview and securely download submitted proof.
- Approve or reject a subscription.
- Confirm the subscription validity period at approval using the rules in section 8.

Platform privileges must remain separate from tenant roles.

### 5.3 Tenant owner

The original applicant who is assigned initial tenant ownership after the approved activation workflow succeeds.

Can:
- Access the tenant workspace.
- See modules and features included in the active plan.
- Perform actions allowed by their tenant owner role and active plan.
- Invite users and assign roles within their delegation authority.
- View tenant subscription and storefront state.
- Perform an owner publication action only if the existing product rules require one and the owner has permission.

### 5.4 Tenant member

An invited/added user with an accepted tenant membership and an assigned tenant role.

Can only perform operations allowed by:
- Active tenant membership.
- Tenant-scoped role permissions.
- Active subscription entitlements.
- Resource-level ownership and business rules.

A role assignment does not independently grant access to a module that the tenant's plan does not provide.

## 6. End-to-end lifecycle

The expected high-level lifecycle is:

1. User starts business registration.
2. User saves one or more supported steps as a persisted draft.
3. User can leave and later continue from the last persisted state.
4. User submits the application.
5. Platform administrator reviews the application.
6. Administrator approves it or returns it for correction/rejects it with a reason, according to the actual status model.
7. If returned, the original applicant sees the review notes, edits allowed fields and resubmits.
8. Once business approval requirements are satisfied, the business/tenant proceeds through the subscription workflow.
9. Applicant selects an existing plan and submits the required payment proof, where applicable.
10. Platform administrator reviews the payment proof and subscription.
11. At subscription approval, the administrator confirms the validity period. The start timestamp is assigned by the backend at approval time. The end timestamp is calculated using the selected plan's existing billing cycle, unless the repository contains an approved, existing override policy.
12. The backend activates the subscription, resolves plan entitlements and provisions tenant modules.
13. The original applicant receives initial tenant owner membership and the configured tenant owner role.
14. The owner can invite members and assign authorized tenant roles.
15. Invited members accept invitations and receive their tenant-scoped membership/role.
16. The storefront is published only when its publication prerequisites are met, either automatically through the lifecycle or by an explicit authorized owner action, according to the existing product rule.

Do not assume business approval and subscription approval are the same decision. Inspect whether the existing product has one combined approval action or separate decisions and preserve the established contract unless a change is approved.

## 7. Business application drafts, review and resubmission

### 7.1 Draft persistence and continuation

Drafts must be persisted server-side.

Requirements:
- The original applicant can list and reopen their own drafts.
- Reopening a draft restores all previously persisted fields and step progress.
- Saving an existing draft updates the same application; it must not create duplicates.
- A reload, logout/login, or navigation away must not erase persisted draft data.
- Uploaded files must follow the existing secure file lifecycle and ownership checks.
- The user can continue from the last persisted step and submit when ready.
- Drafts must not enter the administrator's submitted-review queue unless existing product policy explicitly says otherwise.
- All reads and writes must enforce applicant ownership.

### 7.2 Review decision

The administrator review action must:
- Verify the actor's platform permission.
- Verify the application is in a reviewable state.
- Persist the decision, reviewer, timestamp, and reason/notes as supported by the actual model.
- Prevent invalid or duplicate transitions.
- Preserve review history where supported.
- Make a returned/rejected application available to its original applicant.

### 7.3 Correction and resubmission

When an application is returned for correction:
- Show the required updates and review notes prominently.
- Allow the original applicant to edit the permitted fields.
- Preserve unaffected submitted information.
- Save changes against the same application record.
- Provide a resubmission action.
- Record the resubmission event using existing audit/history mechanisms.
- Return it to the correct review state/queue.
- Prevent a different user from editing or resubmitting it.

Use existing status values if they exist. Do not invent new status strings without documenting and approving the state-model change.

## 8. Subscription approval and validity period — critical requirement

### 8.1 Administrator approval controls

When a platform administrator approves a business/subscription through the existing approval workflow, the UI must clearly show:

- Selected plan.
- Existing plan billing cycle.
- Amount and currency.
- Payment review state.
- Proposed subscription start.
- Calculated subscription end.
- The resulting validity period.
- Any existing supported renewal/grace-period information.

The administrator must be able to understand and confirm the validity period as part of approval.

### 8.2 Start timestamp rule

**The subscription start must begin at the exact time the plan/subscription is approved.**

The authoritative `starts_on` value must be generated server-side at the successful approval operation, using the server's consistent timezone/date-time policy.

It must not be based on:
- Business application creation date.
- Business application submission date.
- Plan selection date.
- Payment proof upload date.
- Payment reference date unless the existing approved business policy explicitly requires it.
- A client-provided timestamp.
- A manually backdated date.

The approval timestamp and subscription start timestamp should be the same authoritative instant for the approval transaction, unless the existing data model has a documented distinction.

### 8.3 End timestamp and existing billing cycle

Use the selected plan's existing `billing_cycle` value to calculate the default subscription end.

Do not create a second billing-cycle system or hardcode plan names.

First inspect the actual supported billing-cycle values and existing date-calculation code. Define the exact mapping from those existing values to calendar periods.

Expected examples only, subject to the actual configured values:
- Monthly: approval instant plus one calendar month.
- Quarterly: approval instant plus three calendar months.
- Half-yearly: approval instant plus six calendar months.
- Yearly/annual: approval instant plus twelve calendar months.

Do not assume all these values exist. Use the real configured billing-cycle vocabulary.

Calendar arithmetic must be correct for month-end and leap-year dates. For example, adding one month to a date near the end of a long month must follow one documented and tested rule; do not allow PHP/SQL date overflow to create an unintended extra month.

### 8.4 Admin selection / override behavior

The administrator must have a clear validity-period control during approval.

Default behavior:
- `Valid from` is read-only and automatically set to the backend approval time.
- `Valid until` is pre-calculated from the selected plan's existing billing cycle.
- The UI clearly explains the selected billing cycle and calculated period.

If the current product already supports administrator adjustment of the subscription end date, preserve and validate that capability. If no such policy exists, do not silently add arbitrary manual duration overrides. Record the decision as an open product question and implement the fixed start + billing-cycle-derived end behavior first.

If the product owner confirms that administrators must be allowed to override the calculated end date, implement it as an explicitly authorized, audited override:
- The start must still be the approval timestamp.
- The end must be later than the start.
- The override reason must be required.
- The override must not silently alter the plan's `billing_cycle`.
- The backend must validate the override and record who made it and when, using existing audit/history structures where possible.
- If audit persistence requires new schema, stop and request schema approval.

### 8.5 Approval transaction

The approval operation must be atomic and idempotent.

Within the existing Core Services transaction boundary:
1. Revalidate the subscription and payment review state.
2. Revalidate the selected plan and its active billing-cycle configuration.
3. Capture one authoritative approval timestamp.
4. Set subscription approval metadata.
5. Set `starts_on` to that timestamp.
6. Calculate and set `ends_on` from the existing billing cycle (or an explicitly approved override).
7. Set the correct subscription status.
8. Activate plan entitlements and tenant modules as required by the existing architecture.
9. Ensure the original applicant's tenant ownership/membership is correctly established at the proper lifecycle point.
10. Commit only if all mandatory operations succeed.

Do not activate a subscription if proof review or required approval validation fails. Do not create duplicate subscriptions, memberships, role assignments, or module records on retries.

### 8.6 Renewal and expiry

Inspect existing renewal behavior before implementing new logic.

At minimum verify:
- Active period comparisons use the same timezone policy.
- A subscription is active only within its valid period and permitted status.
- Expired subscriptions stop granting plan entitlements according to the existing policy.
- Renewal does not create overlapping or unintended validity periods.
- Renewal start/end behavior is consistent with the existing billing cycle.
- `renewal_due_on`, if used, is not confused with `ends_on`.
- UI labels and backend enforcement use the same dates.

Do not invent grace periods, auto-renewal, proration, refunds, or payment gateway behavior.

## 9. Payment proof and receipt review

### 9.1 Receipt preview

The platform administrator's View Receipt/View Proof action opens a modal/popup containing the actual uploaded file and available payment details.

Organize the popup into:
- Payment summary: amount, currency, payment method if stored, payment reference, payment date/time, status.
- Subscription: subscription identifier, plan, billing cycle, validity period, status.
- Business/applicant: business name, applicant, application/tenant reference, submission date.
- Review: review status, reviewer, review date, notes/rejection reason.
- Uploaded proof: preview for supported image/PDF types, original filename and available metadata.

Render only values actually returned by the backend. Do not invent or infer payment details.

### 9.2 Secure download

Authorized platform administrators must be able to download the original uploaded proof.

- Reuse existing secure storage.
- Authorize the download server-side.
- Verify the proof belongs to the requested subscription and tenant.
- Do not expose private storage paths, credentials, or unrestricted public URLs.
- Handle unsupported, missing, corrupt, and unauthorized files.
- Keep download permission separate from tenant-user permissions.

### 9.3 Subscription detail presentation

Organize subscription details into:
1. Business and applicant.
2. Plan and billing cycle.
3. Included modules and entitlements.
4. Validity period.
5. Payment summary.
6. Uploaded proof.
7. Subscription lifecycle and review history.

## 10. Tenant creation and initial owner assignment

The person who registered the business must become its initial tenant owner after the required business/subscription activation conditions succeed.

Resolve the applicant from trusted persisted application data and authenticated identity relationships.

Expected logical relationship:
- Global user identity.
- Tenant/business identity.
- Tenant-scoped membership.
- Tenant-scoped role assignment.
- Separate platform-level roles.

Requirements:
- Create/activate the tenant only at the correct lifecycle point.
- Create or activate the original applicant's tenant membership.
- Assign the configured tenant owner role in the correct tenant scope.
- Apply only the permissions configured for that tenant owner role.
- Do not assign platform administrator privileges.
- Ensure the owner can enter the correct tenant workspace.
- Make the operation idempotent.
- Prevent duplicate owner memberships and role assignments.
- Do not allow a client to nominate a different owner.
- Preserve existing ownership/membership history where supported.

If tenant ownership is already represented differently in the live code, document the actual model and use it consistently rather than inventing a parallel ownership system.

## 11. Plans, modules and entitlements

Audit and use the existing plan/module model. The supplied database design identifies these candidate tables:

- `MODULES`
- `MODULE_DEPENDENCIES`
- `TENANT_MODULES`
- `PLANS`
- `PLAN_ENTITLEMENTS`
- `TENANT_SUBSCRIPTIONS`

Verify these exact tables and columns in the live database before implementation.

Requirements:
- Resolve the active subscription and its plan.
- Load active entitlements for that plan.
- Resolve modules and required dependencies.
- Activate or expose only the modules granted to the tenant.
- Enforce entitlement limits and feature values from configured data.
- Refresh frontend module visibility after activation, renewal, expiry, or plan changes.
- Clearly distinguish enabled, unavailable, expired, suspended, or restricted modules using existing state semantics.
- Do not hardcode plan names, module lists, limits, or permissions.

Effective authorization must require all applicable conditions:
1. Authenticated user.
2. Active membership in the requested tenant.
3. Required tenant-scoped role permission.
4. Active plan/subscription entitlement for the module/feature.
5. Resource-level authorization and business validation.

The backend is authoritative. Frontend guards and hidden controls are usability features, not security boundaries.

## 12. Invitations and tenant role assignment

Inspect the actual invitation workflow, tables, APIs, and permission model before implementing.

The tenant owner must be able to invite users and assign only roles they are authorized to delegate.

Verify support for:
- Invitation creation.
- Existing BBG user invitation.
- New-user invitation, if supported.
- Expiration.
- Acceptance.
- Cancellation/revocation.
- Resend.
- Membership activation.
- Tenant role assignment.
- Role update/removal where authorized.

After acceptance:
- Create/activate the tenant membership.
- Apply the intended tenant-scoped role.
- Resolve modules using the tenant's plan.
- Resolve actions using the member's role permissions.
- Do not grant owner or platform-admin privileges by default.

Prevent:
- Cross-tenant membership changes.
- Platform role assignment through tenant workflows.
- Self-escalation.
- Delegation above the actor's authority.
- Assignment of inactive/invalid roles.
- Permission bypass through direct API calls.

If invitation support is missing from the actual data model, document the gap. Do not add tables/columns without approval.

## 13. RBAC and plan enforcement

Audit actual roles, permissions, assignments, guards, middleware, service checks and DAO tenant scoping.

The supplied database design identifies candidate entities:
- `ROLES`
- `PERMISSIONS`
- `ROLE_PERMISSIONS`
- `USER_ROLE_ASSIGNMENTS`
- `TENANT_MEMBERSHIPS`

Verify actual deployed schema and role scope.

For every relevant operation, verify:
- Authentication.
- Tenant context.
- Active membership.
- Role scope.
- Permission code.
- Plan entitlement.
- Resource ownership.
- Tenant-scoped query.

A user with a role permission must still be denied if the tenant plan does not provide the relevant module/feature. A tenant plan entitlement must not grant an action to a user whose role lacks the required permission.

Unknown permissions default to deny. Platform and tenant roles must never be conflated.

## 14. Storefront publication lifecycle

A business being approved and a subscription being active do not automatically prove that the storefront is publishable.

Inspect the actual implementation of:
- Business approval state.
- Business profile publication state.
- Storefront settings state.
- Subscription state and validity.
- Plan storefront entitlement.
- Required profile/content fields.
- Owner publication action, if any.
- Public marketplace query filters.
- Frontend status mapping and refresh.

The supplied database design proposes separate fields:
- `BUSINESS_PROFILES.approval_status`
- `BUSINESS_PROFILES.publication_status`
- `STOREFRONT_SETTINGS.storefront_status`

Verify whether these exist and are used in the live schema.

Investigate the reported defect: a newly registered business was approved and its subscription approved, but storefront publication still displayed `DRAFT`.

Trace the exact lifecycle and identify the first missing or incorrect state transition. Potential investigation points include missing storefront initialization, missing entitlement activation, unmet content prerequisites, an explicit owner publication requirement, inconsistent tenant identifiers, transaction rollback, stale frontend state, or a marketplace query filtering on a different status. These are hypotheses until verified.

Define the authoritative publication eligibility rule from actual product policy. Then:
- If eligible publication is automatic, perform the transition in the backend lifecycle.
- If owner publication is a deliberate product action, show the owner the prerequisites and a functional authorized Publish action.
- Never publish an incomplete storefront.
- Ensure workspace, storefront, and public marketplace APIs agree.
- Public queries must not expose drafts or unpublished businesses.

## 15. Database audit and schema safety

Audit the actual schema and data relationships for identity, tenancy, authorization, plans, modules, subscriptions, payment proofs, business profiles, storefront settings, applications, invitations, files, and audit history.

Check:
- Primary/foreign keys.
- Unique constraints.
- Tenant ownership.
- Nullable relationships.
- Status semantics.
- Soft-delete behavior.
- Audit fields.
- Duplicate/orphan records.
- Cross-tenant relationship defects.
- Query/index performance where relevant.
- Inconsistent lifecycle combinations.

The supplied database design documents a common audit-field convention:
- `status`
- `created_by`
- `created_on`
- `updated_by`
- `updated_on`

It also documents `A` as active and `Z` as soft-deleted. Verify the live implementation and preserve its actual convention. Do not introduce `deleted_at` or physical deletion if the project requires A/Z soft deletion.

**No schema changes in this task without explicit approval.** Do not run migrations or alter tables, columns, indexes, keys, constraints, or data types during the initial audit/implementation.

If a schema gap genuinely blocks a safe implementation, prepare a separate proposal with:
- Exact live-schema evidence.
- Existing application behavior.
- Why existing fields/relationships are insufficient.
- Proposed change.
- Backfill/data migration impact.
- Tenant/security impact.
- Rollback plan.
- Tests.
Then stop for approval.

## 16. Backend architecture and implementation rules

Preserve the seven logical layers from the supplied `.agents` architecture:

1. InDto
2. Controller
3. Versioned Services
4. Core Services
5. DAO
6. Model — legacy/reference layer; do not introduce for new development where project rules prohibit it.
7. Utils

Use the existing Yii 3 adaptation and request path. Do not replace the architecture with a different service/repository layering system.

Core Services:
- Own business use cases, state transitions, validation, authorization decisions and transaction boundaries.
- Validate the action envelope.
- Coordinate DAOs.
- Return the established `$resArr` contract.

DAO:
- Performs database reads/writes using the supplied connection and scalar arguments.
- Does not own business workflow decisions or transaction boundaries.
- Follows existing naming and query conventions.

InDto:
- Holds input parameter structure/defaults.
- Does not contain business logic.

Controller:
- Handles HTTP endpoint and forwards the expected input envelope.
- Does not implement business workflow logic.

Versioned Services:
- Map input arrays to InDto.
- Invoke Core Services.
- Preserve API response conventions.

Utils:
- Reusable helpers only; do not hide business workflows or database access in utilities.

Respect the repository's actual Yii 3 adaptation and local coding style. The supplied `.agents` skill samples and rules are mandatory references for backend modifications.

## 17. Frontend implementation rules

Inspect the actual BBG frontend architecture and current repository `.agent` skills before editing.

Follow:
- Existing Angular routing and lazy-loading conventions.
- Existing smart/container and reusable presentational component boundaries.
- Existing API services and typed DTO/model mapping.
- Existing state-management conventions.
- Existing permission service/guards/directives.
- Existing design tokens and light/dark theme.
- Existing form validation and feedback patterns.
- Existing accessibility and responsive behavior.

Do not:
- Call APIs directly from presentational components.
- Use raw `HttpClient`/`fetch` if the project requires a shared API service.
- Expose raw backend envelopes to presentation components.
- Add fake data or hardcoded permissions.
- Add local-storage persistence for sensitive information.
- Generate IDs client-side.
- Duplicate a data set across multiple stores.
- Add navigation entries without the correct route and permission wiring.

The uploaded `.agent-skills-kit.zip` contains Edunova/insync4-specific references. Treat those as examples only where a rule is genuinely generic. Do not copy Edunova-specific paths, component prefixes, menu JSON names, permission keys, or state architecture into BBG unless the actual BBG repository confirms they apply.

## 18. Required skills and workflow

Before implementation, inspect the current repository's actual skills and load the applicable skill documents.

### 18.1 Backend skills from the supplied `.agents` archive

For modifications to existing backend behavior, load:

- `.agents/skills/modify/SKILL.md`
- `.agents/skills/modify/Rules.md`
- `.agents/skills/modify/resources/Architecture.md`
- Relevant examples:
  - `.agents/skills/modify/examples/InDtoSamples.md`
  - `.agents/skills/modify/examples/ControllerSamples.md`
  - `.agents/skills/modify/examples/ServicesV1Samples.md`
  - `.agents/skills/modify/examples/ServicesSamples.md`
  - `.agents/skills/modify/examples/DaoSamples.md`

For new backend capabilities, load:

- `.agents/skills/new-dev/SKILL.md`
- `.agents/skills/new-dev/Rules.md`
- `.agents/skills/new-dev/resources/Architecture.md`
- Relevant new-dev examples and gotchas.

For any database design assessment, load:

- `.agents/skills/db-design/SKILL.md`

Important skill rules:
- Inspect existing implementation before modification.
- Preserve existing input/output contracts unless a contract change is explicitly approved.
- Read neighboring functions and their callers/callees before editing.
- Reuse existing helpers and local patterns.
- Keep diffs narrowly scoped.
- If a new endpoint/action/field/workflow is needed, classify it as new development and follow the new-dev skill.
- If an API or DB contract change is unavoidable but not approved, stop and report the gap.

### 18.2 Frontend skills

Inspect the actual BBG repository's `.agent/README.md`, rules, skills, workflows, and frontend architecture before coding.

Load the applicable skills for:
- Requirement intake and readiness.
- BBG context and architecture.
- UI construction and component reuse.
- Data/API/state/navigation/permission layers.
- Requirement implementation.
- Review, testing and release.

Do not assume the Edunova skill-kit filenames or conventions apply to BBG. Confirm them against the actual repository. If the repo has no suitable skill, follow `frontend_architecture.md` and existing code conventions and document the gap rather than importing an unrelated architecture.

### 18.3 Required workflow

1. Read project instructions and applicable skills.
2. Inspect Git status, branch and current diff. Preserve all existing work.
3. Audit current implementation and live schema.
4. Produce a requirement readiness report with knowns, unknowns and blockers.
5. Map each workflow to UI, API, backend layers, tables and permissions.
6. Identify root causes and minimal safe changes.
7. Implement backend changes in the correct layers.
8. Implement frontend changes using existing reusable components and services.
9. Add tests at service, DAO/integration, API and frontend levels as applicable.
10. Run review and release checks.
11. Report actual verification evidence and remaining gaps.

## 19. API and contract discovery

Do not invent APIs.

For each operation, discover and document:
- Existing HTTP method and route.
- Input DTO and validation.
- Response contract.
- Angular service method.
- Backend controller action.
- Versioned Services method.
- Core Services action.
- DAO operations.
- Tables/columns used.
- Permission and tenant checks.

If an operation is missing, mark it `MISSING` or `UNKNOWN`, explain whether it is a bug or new capability, and follow the appropriate skill. Do not silently stub an endpoint or make the UI appear functional with mock data.

## 20. Transaction, concurrency and audit requirements

Review atomicity for:
- Application review/resubmission.
- Business approval.
- Subscription approval and date assignment.
- Tenant activation and initial owner assignment.
- Entitlement and module activation.
- Invitation acceptance and role assignment.
- Storefront initialization/publication.

Use the existing Core Services transaction conventions.

Prevent:
- Partial tenant activation.
- Subscription activation without valid approval.
- Duplicate memberships or role assignments.
- Duplicate module activation rows.
- Double approval.
- Concurrent approval/rejection races.
- Invalid status transitions.
- Publication when prerequisites fail.
- Success responses when a required operation failed.

Use the project's audit fields and history structures. Never log secrets, payment documents, access tokens, or unnecessary personal data.

## 21. Test requirements

### Application
- Draft create/update/list/reopen.
- Continue after reload and reauthentication.
- Applicant ownership enforcement.
- Submit and admin review.
- Return/reject with notes.
- Applicant correction and resubmission.
- Invalid transition rejection.

### Payment and subscription
- Proof upload and retrieval.
- Authorized receipt preview/download.
- Unauthorized download denied.
- Payment proof associated with correct tenant/subscription.
- Approve/reject and duplicate decision handling.
- Correct start timestamp at approval.
- Billing-cycle-derived end timestamp.
- Month-end and leap-year date arithmetic.
- Invalid/inactive billing cycle rejected.
- Subscription active/expired boundary behavior.
- Retry/idempotency and concurrent approval.

### Tenant and RBAC
- Original applicant becomes initial tenant owner.
- Correct tenant membership and tenant-scoped role.
- No platform role granted.
- Duplicate approval does not duplicate assignments.
- Tenant owner can invite only within delegation authority.
- Invitation acceptance produces the correct membership/role.
- Role permission without plan entitlement is denied.
- Plan entitlement without role permission is denied.
- Cross-tenant and direct API escalation attempts are denied.

### Modules and storefront
- Plan modules and entitlements resolve correctly.
- Module dependencies enforced.
- Expired/inactive plan behavior.
- Storefront prerequisites and publication transition.
- Eligible approved business is visible in public marketplace.
- Draft/unpublished storefront remains private.
- UI and API publication state agree.
- Repeated lifecycle events do not duplicate records.

### Regression
- Authentication/session.
- Personal Account.
- Consumer dashboard.
- Business Workspace.
- Platform Administration.
- Existing marketplace and storefront.
- Existing products/promotions/orders where applicable.
- Tenant isolation and existing RBAC.

Run actual project test commands, static checks, and production builds. Report commands and results. Never claim an unrun test passed.

## 22. Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-001 | An applicant has a saved application draft | They return later and open it | Previously saved data and progress are restored |
| AC-002 | An application is returned for correction | The applicant opens it | The applicant sees review notes and editable permitted fields |
| AC-003 | The applicant has corrected the returned application | They resubmit | The same application returns to the appropriate review queue |
| AC-004 | An authorized platform admin views payment proof | They select View Receipt | A popup shows the actual proof and categorized available payment details |
| AC-005 | An authorized platform admin views a proof | They select Download | The original proof downloads through an authorized backend operation |
| AC-006 | An admin approves a subscription | Approval succeeds | `starts_on` is assigned from the authoritative approval timestamp |
| AC-007 | A subscription has a supported billing cycle | The admin approves it | `ends_on` is calculated from that cycle using tested calendar arithmetic |
| AC-008 | A subscription is approved | The activation workflow completes | The plan entitlements and tenant modules reflect the selected plan |
| AC-009 | A business is approved and activated | Ownership provisioning completes | The original applicant receives the tenant owner membership/role |
| AC-010 | A tenant owner has a valid membership | They invite an eligible user and assign an allowed role | The invitation and role are scoped to that tenant |
| AC-011 | An invitee accepts an invitation | Membership activation completes | Their available modules/actions reflect both plan and role |
| AC-012 | A user has a role permission but the plan lacks the entitlement | They call the protected API | Backend denies the operation |
| AC-013 | A tenant plan has an entitlement but the user's role lacks permission | They call the protected API | Backend denies the operation |
| AC-014 | Storefront publication prerequisites are incomplete | Approval completes | The storefront is not incorrectly published |
| AC-015 | Storefront prerequisites are satisfied | The required publication transition occurs | Workspace and public marketplace show the consistent published state |
| AC-016 | An unrelated dashboard is used | These workflows are changed | Its existing functionality remains unchanged |
| AC-017 | A schema change appears necessary | The implementation reaches that blocker | Work stops for explicit schema approval |

## 23. Open questions and explicit decision gates

Keep these as `UNKNOWN` until verified:

1. What are the exact live application status values and review-history mechanism?
2. Are business approval and subscription approval separate actions or one combined workflow?
3. What are the exact configured `PLANS.billing_cycle` values?
4. Does the existing product support admin override of `ends_on`, or should it always be calculated from billing cycle?
5. What timezone is used for persisted subscription timestamps and display?
6. What is the exact rule for inclusive/exclusive subscription end boundaries?
7. Does tenant ownership already exist as a role assignment, membership attribute, or both?
8. What is the actual invitation persistence and acceptance mechanism?
9. What are the actual role and permission codes and delegation rules?
10. Which plan entitlement controls storefront publication?
11. Is storefront publication automatic after eligibility or explicitly initiated by the owner?
12. What fields/content are mandatory for storefront publication?
13. Which actual API serves the admin receipt preview/download?
14. Are any new API contracts or schema changes unavoidable?

Do not block unrelated, already-supported work on secondary questions. Do stop before making an unapproved contract or schema change.

## 24. Required implementation report

Produce a report with:

### A. Current-state audit
For each requirement: `WORKING`, `PARTIAL`, `BROKEN`, `MISSING`, `BLOCKED`, or `NOT VERIFIED`.

Include exact file paths, methods, routes, API contracts, tables and columns.

### B. Database findings
Distinguish live schema from proposed design. Include relationships, constraints, roles, permissions, plan entitlements, billing-cycle values, subscription records, owner assignments, and storefront states.

### C. Root causes
Explain the verified causes of:
- Draft continuation failures.
- Rejection/correction/resubmission failures.
- Receipt preview/download issues.
- Subscription validity date issues.
- Missing owner assignment.
- Module/entitlement mismatches.
- Invitation/role failures.
- Storefront remaining `DRAFT`.

### D. Changes
List each changed file and explain the behavior changed, contract used, permission checks and database entities affected.

### E. Verification
List actual test/build/static-check commands and results, API/browser evidence, date-boundary test cases, and dashboard regression results.

### F. Remaining issues
List unresolved questions, schema/contract blockers, and any approval needed.

Do not label the task complete if a critical workflow is unimplemented or unverified.

## 25. Completion rule

The task is complete only when the acceptance criteria are verified end-to-end, backend authorization is enforced, subscription validity starts at approval time and follows the existing billing cycle, the original applicant receives the correct tenant owner access, module access is plan- and role-aware, storefront publication is consistent, and unrelated dashboards remain unaffected.

**Execution order: inspect → map → diagnose → plan → implement → test → review → report.**