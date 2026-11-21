# Antigravity Implementation Prompt — BBG Dashboard Upgrade

You are the senior Angular 22 enterprise UI architect, Yii 3 backend architect, RBAC/security engineer and QA engineer for the existing BBG repository.

## Read requirements first

Before inspecting or changing code, read the complete specification:

requirements/BBG_DASHBOARD_MODULE_UX_RBAC_SUBSCRIPTION_SPEC.md

Also read and follow the repository instructions and skills:
- frontend/AGENTS.md
- frontend/.agent/README.md
- frontend/.agent/rules/bbg-skills-workflow.md
- Relevant frontend/.agent/rules/
- Relevant frontend/.agent/skills/ (BBG context, coding standards, build-ui, data-layer, navigation/permissions, API and media/S3)
- frontend/CODING_STANDARDS.md
- Backend .agents instructions and supplied seven-layer architecture documentation.

Inspect actual skill paths; do not guess. Reuse existing skills rather than creating a parallel skill system. If a required skill is absent, report it.

## Mission

Upgrade **every applicable dashboard module** across Personal, Business Workspace and Platform Administration. Previous UI changes were incomplete or superficial. Do not stop after updating a few modules or shared components.

Follow the specification's complete acceptance criteria. Mandatory outcomes:
1. Individually audit and redesign every applicable dashboard module.
2. Provide Table View and Grid View for every suitable record list.
3. Let users configure table columns (show/hide, reorder where practical, reset defaults) and page size.
4. Show actual record images/media in Grid View wherever available.
5. Build properly structured, record-specific View Details drawers/pages. A flat generic label/value div dump is unacceptable.
6. Show existing images/documents in Details and Edit; preview new media and preserve existing media unless explicitly replaced.
7. Give business approval a complete review experience with application information, documents, media, status and review history where supported.
8. Show exactly what each subscription plan includes using actual plan and entitlement data.
9. Make plan creation future-proof and database-driven: authorised admins can select existing entitlement definitions and configure supported values/limits. Never hardcode Gold/Diamond/Platinum-specific logic.
10. Upgrade Team & Access to add/invite users, assign/change/remove roles and remove tenant members through supported APIs.
11. Grant/revoke individual user permissions only if the real backend/schema supports user-level overrides. Never alter shared role permissions to imitate per-user overrides.
12. Preserve RBAC, tenant isolation, S3 signed media handling, token security, routes, API contracts and existing design tokens.

## Work sequence

### Phase 1 — Audit before coding
Check repository, current branch and working tree. Preserve user changes. Inventory all modules/routes and inspect frontend/backend/API/database/RBAC/entitlement/media support. Produce a module-by-module gap matrix and identify missing capabilities.

### Phase 2 — Shared foundations
Build justified typed, reusable components for configurable tables, table/grid switching, media-aware cards, structured detail sections, media/document preview, filters/pagination, status, dialogs and common form states. Shared components are presentation-only. Validate against the approved marketplace and catalogue benchmark screens.

### Phase 3 — Upgrade every module
Implement module-specific listing, details, create/edit and actions. Do not leave modules untouched. Business approval, plan administration and Team & Access are mandatory. Keep the dashboard to the agreed maximum of three prominent summary cards where applicable.

### Phase 4 — Backend and database dependencies
Use existing APIs first. Any approved backend work must follow the seven logical layers: InDto, Controller, Versioned Services, Core Services, DAO, Model reference/legacy, Utils. If an API/schema capability is absent, document exact evidence and the smallest proposed dependency. Do not fake it.

### Phase 5 — Regression and proof
Run available formatting, lint, TypeScript, unit/component, build, integration and E2E checks. Capture screenshots/equivalent visual evidence for every module and test responsive layouts and light/dark themes.

## Non-negotiable safety rules
- No invented APIs, fields, permission codes, entitlement codes, statuses, business rules, metrics or data.
- No fake UI actions, fake records or simulated success.
- No frontend-only permission override.
- Never change ROLE_PERMISSIONS to simulate an individual user's permission.
- Backend authorization and tenant isolation are mandatory; Angular guards are not security.
- Preserve S3 private media and signed URL lifecycle.
- Do not run migrations, seed scripts, destructive SQL or production operations.
- Do not create a branch, commit, push, merge or open a PR.
- Do not overwrite uncommitted or unrelated user work.
- Do not add Tailwind, PrimeNG, NgRx or a new UI framework unless approved by repository standards.
- Do not activate cart/checkout, business order management, inventory or purchasing without separate approval.

## Completion gate

A module is complete only when its own applicable checklist in the specification is satisfied and evidence is recorded. Report each module as Implemented, Partially implemented, Blocked by dependency or Not implemented.

Final report must include module inventory/status matrix, per-module changes, changed files, visual evidence, exact test commands/results, API/database/RBAC gaps and outstanding approvals. Be honest about untested areas. Start with the audit; do not skip directly to coding.
