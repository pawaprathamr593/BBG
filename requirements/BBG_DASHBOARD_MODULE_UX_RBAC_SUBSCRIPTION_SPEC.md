# BBG Dashboard Module UX, RBAC & Subscription Requirements

**Product:** BBG — Business Management & Marketplace Platform  
**Repository:** pawaprathamr593/BBG  
**Target branch:** feature/business-onboarding-from-workspace-base  
**Stack:** Angular 22, Yii 3, PHP 8.4, MySQL 8.4, AWS S3  
**Status:** Requirements for implementation; current code, API contracts and live schema must be inspected before changes.

## 1. Objective and quality bar

Upgrade **every applicable dashboard module** across Personal / My Account, Business Workspace and Platform Administration. The previous UI pass left modules unchanged or only superficially changed. This is not a colour refresh or a shared-component-only refactor.

Every module must be individually audited and upgraded across its real user journey: list → details → create/edit → supported actions. A module is not complete merely because a shared table, card, drawer or button was updated.

Use the agreed modern enterprise SaaS direction, existing BBG design tokens, responsive layouts and light/dark themes. Preserve the approved benchmark screens: Public Marketplace Landing Page, Product Catalogue Table View and Product Catalogue Grid View. Retain the maximum of three prominent dashboard summary cards where that design decision applies.

## 2. Mandatory audit and source-of-truth rules

Before implementation:

1. Inspect repository, branch, working tree and uncommitted changes. Preserve user work. Do not reset, stash, overwrite unrelated changes or reformat unrelated files.
2. Inventory every dashboard route, module, component, service, model, API operation, permission, media field and test.
3. Read and follow frontend/AGENTS.md, frontend/.agent/README.md, frontend/.agent/rules/bbg-skills-workflow.md, all relevant frontend/.agent/rules files, frontend/CODING_STANDARDS.md, and relevant skills under frontend/.agent/skills (BBG context, coding standards, build-ui, data-layer, navigation/permissions, API and media/S3).
4. Read backend .agents instructions and supplied backend architecture documentation. Preserve the seven logical layers: InDto, Controller, Versioned Services, Core Services, DAO, Model reference/legacy, Utils.
5. Inspect actual endpoints, DTOs, response shapes, backend authorization, tenant scoping, media lifecycle and database schema. Inspect PLANS and PLAN_ENTITLEMENTS records and the actual RBAC records in ROLES, PERMISSIONS, ROLE_PERMISSIONS, USER_ROLE_ASSIGNMENTS and TENANT_MEMBERSHIPS.
6. Verify whether subscription/payment tables and migrations exist and whether migrations have actually been applied. Previously discussed candidate tables include TENANT_SUBSCRIPTIONS, SUBSCRIPTION_PAYMENT_PROOFS, PLATFORM_PAYMENT_QR_CONFIG, TENANT_SUBSCRIPTION_PAYMENT_INSTRUCTIONS and TENANT_SUBSCRIPTION_REVIEW_HISTORY. Recheck; do not assume.
7. Report gaps as dependencies. Do not invent endpoints, fields, permission codes, entitlement codes, statuses, metrics, workflows or data.

Actual code/API and verified schema establish current capability; repository architecture and skills establish implementation conventions; this document defines required outcomes. Document conflicts rather than silently resolving them.

## 3. Dashboard-wide module coverage

Create a module matrix listing route, context, current UI quality, data/API source, actions, permission requirements, list views, media, details, create/edit, responsive/theme coverage, gaps, status and evidence.

Inspect and upgrade **all applicable modules**, not only the landing dashboard or selected showcase pages. Each screen must have its own meaningful design treatment while sharing appropriate components. Do not force list-view controls onto dashboards, settings, forms or screens where a table/grid is not meaningful.

## 4. Universal Table View and Grid View

For every module that displays a collection where both layouts are suitable, provide Table View and Grid View. Both views must use the same records, search, filters, sort, pagination and permission-aware actions. Switching views must preserve relevant list state.

### 4.1 Table View: user-configurable columns

Each module defines a typed, module-specific column catalogue and sensible defaults. Users must be able to:
- Show/hide optional columns.
- Reorder columns where practical.
- Reset to module defaults.
- Keep required identity columns visible where necessary.
- Configure supported page sizes.
- Sort supported columns.
- Search and filter fields actually supported by the API.
- Persist preferences through an approved mechanism when available.

Do not expose fictional fields or claim server-side filtering/sorting where the API does not support it. Prefer server-side pagination for large collections where available.

### 4.2 Grid View: actual media

Cards show actual record media whenever it exists and the current user may access it. Examples, subject to actual fields:
- Products: product image, name, category, price and status.
- Businesses: logo/cover, name and verification status.
- Promotions: creative/thumbnail, title and publication status.
- Customers: profile image or initials fallback, name and contact summary.
- Categories: actual image/icon where available.
- Payments: proof thumbnail or document indicator and review status.
- Team: profile image or initials, name, role and membership status.

Use the existing S3 service and signed-URL lifecycle. Handle loading, missing, expired, broken and forbidden media. Never invent or use unrelated stock images as if they were uploaded user media. Keep card actions consistent with Table View.

## 5. Structured View Details and Edit experiences

Every View Details drawer/page must be record-specific and properly organised. A flat list of generic label/value divs is unacceptable.

Group actual fields into meaningful sections, as applicable:
- Overview / identity
- Description and business information
- Contact and address
- Pricing/configuration
- Media and attachments
- Status and lifecycle
- Owner, tenant and assigned users
- Activity, review and history
- Created/updated audit metadata
- Related records

Use clear hierarchy, headings, grouped metadata, status indicators, timelines, document lists, image galleries and readable key-value layouts where appropriate. Do not dump all fields into one block or make internal IDs the primary presentation.

### 5.1 Media continuity

If a record has media:
1. Show it in Grid View where applicable.
2. Show it in View Details with appropriate image/document preview.
3. Show existing media in Edit before changes.
4. Allow replacement/removal only when API and permissions support it.
5. Preview newly selected files before saving.
6. Preserve existing media when no replacement is selected.
7. Handle signed URL expiry, loading, failures and unauthorized access.

Apply to product media, business logos/covers, promotion creatives, profile photos, category media and payment/document proofs where relevant.

### 5.2 Forms

Create/edit forms must be domain-specific and logically grouped. Load existing values and media. Provide typed validation, field errors, loading/submission state, duplicate-submit prevention, clear success/error feedback, unsaved-change protection where appropriate and destructive-action confirmation. Do not invent fields or payload properties.

## 6. Business application review and approval

Business approval must be a complete application-review experience, not a minimal table with approve/reject buttons. Provide a drawer or detail route with sections populated from actual backend data:
- Business identity/profile and registration details
- Owner/contact details and address
- Logo, cover and other uploaded media
- Uploaded supporting documents with preview/download where supported
- Selected plan and payment details when part of the actual registration flow
- Submission date and current application status
- Existing verification/review history and reviewer metadata, if available

Approval/rejection must call the existing authorised backend workflow and be visible only to users with verified permissions. Show confirmation and resulting state. Capture rejection reasons according to backend validation. Never invent statuses or bypass backend checks.

## 7. Subscription plans and entitlement management

### 7.1 Plan display

Plan cards and detail pages must clearly explain **what each plan includes**, including actual features, limits, billing cycle, duration, price and relevant terms. Prior discussions included Gold, Diamond and Platinum with QUARTERLY and YEARLY variants; verify current PLANS and PLAN_ENTITLEMENTS records and approved business rules before rendering. Do not hardcode plan names, prices, feature lists or limits.

### 7.2 Future-proof plan creation

Platform Administration should allow authorised administrators to create future plans and configure included entitlements, subject to actual backend/schema support. The plan editor should support:
- Name, description and status
- Supported billing cycles (the agreed cycles are QUARTERLY and YEARLY; verify API/schema)
- Price and duration as defined by the existing model
- Selection from existing active entitlement definitions
- Entitlement values/limits using actual data types and validation
- A readable included-features summary before save
- Editing/deactivation subject to existing subscription/history constraints

A new valid plan must be displayable and enforceable without hardcoded plan-name conditionals or frontend code changes. Do not invent new entitlement codes or values.

### 7.3 Entitlements are not RBAC permissions

Plan entitlements control subscribed business capabilities and limits. RBAC permissions control what an individual user may do. They are separate concepts and must not be mixed. Backend enforcement is authoritative. Apply the verified backend effective-access rules; do not invent a rule or assume tenant owners bypass subscription limits.

### 7.4 Payment/subscription lifecycle

Inspect existing plan selection, registration payment instructions, QR configuration, proof upload, explicit submit-for-review, review queue, approval/rejection, renewals, upgrades and lineage. Verify actual tables, API and migration state, including the candidate tables listed in Section 2. Do not run migrations or alter data without approval. Do not invent proration, refund or payment-confirmation rules.

## 8. Team & Access

Team & Access must provide actual access administration, not only a member list.

### 8.1 Add/invite user

Provide Add User / Invite User using the existing supported backend workflow. Collect required information, add/invite the user to the current tenant, select an eligible existing tenant role, and display invitation/membership state and errors. Do not invent an invitation API or bypass verification.

### 8.2 Role and membership management

Show member identity, profile media, membership status, assigned role(s), scope and access summary. Where supported and authorised, allow assigning/changing a role, removing a user's role assignment, and removing/deactivating tenant membership through the supported workflow. Protect platform roles, tenant ownership, the final owner and other tenants' memberships. Confirm destructive actions.

### 8.3 Individual permission grant/revoke

Support individual permission grants/revocations **only if actual backend and schema explicitly support user-level overrides**.

Important: ROLE_PERMISSIONS links permissions to a role; USER_ROLE_ASSIGNMENTS links users to roles (potentially within a tenant). These tables alone do not establish direct per-user overrides.

Inspect actual schema and APIs for user-level grants/denials. If absent:
- Do not simulate an override by editing ROLE_PERMISSIONS; that changes access for every user assigned to the role.
- Do not keep fake overrides in frontend state or local storage.
- Report the exact backend/database dependency and propose the smallest compatible design for approval.
- Still implement supported role assignment/removal workflows.

### 8.4 Permission matrix

Where real permission metadata is available, group it by module and show labels/descriptions. Distinguish inherited role permissions from direct overrides if supported. Show granted, denied, inherited, unavailable and not-applicable states accurately. Never infer codes from labels or hardcode an illustrative permission matrix as real data.

## 9. Security, tenant isolation and S3

Backend authorization is authoritative. Frontend guards and hidden buttons are not security. Enforce tenant scoping in every tenant operation; never trust a client-supplied tenant ID alone. Preserve platform/tenant boundaries, token security, private S3 media and signed URL handling. Preserve A/Z soft deletion and audit conventions where applicable. Do not physically delete records unless explicitly supported. Never fabricate audit history, users, metrics, payment states or success.

## 10. Componentisation and skills

Build typed reusable presentation components only for genuinely shared patterns: configurable table/column chooser, table-grid switch, media-aware grid cards, structured detail sections, media/document preview, filters/pagination, status indicators, confirmation/reason dialogs and common form/loading/empty/error states.

Shared components remain presentation-focused. Feature modules own domain workflows, data loading and API calls. Do not build one oversized generic component with unrelated flags.

Follow repository Angular 22 conventions: standalone components, lazy routes, OnPush where established, typed forms/models, Signals/RxJS according to existing patterns, inject(), strict TypeScript, no any, SCSS/design tokens, services for API calls and existing error/loading patterns. Do not introduce Tailwind, PrimeNG, NgRx or another UI framework unless explicitly approved by repository standards.

Follow the supplied Yii 3 seven-layer architecture for any approved backend changes. Do not replace it with another architecture. Reuse existing .agent skills; do not create duplicate skill systems. If a relevant skill is absent, report it.

## 11. Exclusions and change safety

Do not activate cart/checkout, business order management, inventory or purchasing without separate approval. Do not add tables, columns, APIs, permission/entitlement codes, statuses or business rules without evidence and approval. Do not run migrations, seed scripts, destructive SQL or production operations. Do not create branches, commit, push, merge or open PRs unless explicitly requested. Preserve all user changes. No fake UI actions or mock success.

## 12. Required workflow

**Phase A — Audit:** module inventory, UI quality/gaps, API/schema capability, permission map, entitlement map and media map.

**Phase B — Shared foundations:** implement justified typed components and validate them against approved benchmark screens.

**Phase C — Module-by-module upgrade:** upgrade every applicable module end-to-end. Business approval, plan administration and Team & Access are mandatory.

**Phase D — Dependencies:** use existing APIs first. Document exact missing API/schema support and request approval for minimal backend/database changes. Never simulate missing functionality.

**Phase E — Verification:** run available format, lint, TypeScript, unit/component, build, integration and E2E checks. Capture visual evidence for each module, including responsive and light/dark examples where practical.

## 13. Acceptance checklist

For every applicable module:
- [ ] Actual screen redesigned to BBG quality; not merely a shared-component replacement.
- [ ] Correct navigation and responsive layout.
- [ ] Light/dark themes are consistent and legible.
- [ ] Table/Grid switch where appropriate.
- [ ] User-configurable table columns, reset/defaults and page size.
- [ ] Search, filters, sort and pagination work according to API capability.
- [ ] Grid uses real media and graceful fallbacks.
- [ ] Table and Grid show consistent data/actions.
- [ ] Details are structured into meaningful record-specific sections.
- [ ] Existing media appears in Details and Edit.
- [ ] Create/Edit validation and API errors work.
- [ ] All visible actions are functional and permission-aware.
- [ ] Loading, empty, error and forbidden states are handled.
- [ ] Tenant isolation and backend authorization are preserved.
- [ ] Tests and visual evidence are recorded.

Additional mandatory acceptance:
- [ ] Business review exposes complete application data, documents and media before decision.
- [ ] Plans show actual included entitlements and limits.
- [ ] New plans can select database-backed entitlement definitions without hardcoded plan-name logic.
- [ ] Team supports adding/inviting users and role assignment/removal where APIs permit.
- [ ] Per-user permission grant/revoke is real backend functionality or explicitly documented as blocked.
- [ ] Subscription/payment flows preserve proof, review, decision and history behaviour.

## 14. Required deliverables

Provide:
1. Module inventory and before/after status matrix.
2. Per-module UI/UX gap and change report.
3. API/database/RBAC/entitlement capability and gap report.
4. Changed-file list grouped by module/shared foundation.
5. Screenshots or equivalent visual evidence for every redesigned module.
6. Exact test commands and results.
7. Outstanding dependencies and approvals.
8. Final status per module: Implemented, Partially implemented, Blocked by dependency, or Not implemented.

Never claim blanket completion. Each module requires its own evidence-backed status.
