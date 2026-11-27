# BBG Agent Skills & Engineering Operating Rules

**Product:** BBG — Business Management & Marketplace Platform  
**Applies to:** AI coding agents, developers, reviewers and implementation assistants  
**Stack:** Angular 22 · Yii 3 · PHP 8.4 · MySQL 8.4

> This document consolidates transferable engineering workflows from the supplied agent-skill bundles and the BBG-specific architecture. It is not permission to import another product's framework, components, routes, APIs or conventions. BBG source code, BBG architecture documents and explicit product-owner decisions take precedence.

## 1. Mandatory task classification

| Task type | Required workflow |
|---|---|
| Explain, audit, inventory or compare | Read-only inspection. Do not edit. |
| Modify/fix existing behaviour | Use **Modify Existing** below. |
| Add a feature, field, endpoint, action, workflow or report | Use **New Development** below. |
| UI redesign or new screen | Use **Build UI** and inspect approved BBG design references and existing components. |
| Database design/schema change | Use **Database Design** and verify migrations/current schema before proposing or changing anything. |
| Review, test, release or summarize | Use **Review & Release**. |

If it is unclear whether a request is a bug fix or new capability, ask one focused clarification before implementation.

## 2. Universal BBG rules

1. Inspect the repository, current branch, working tree, relevant files and nearby implementation before editing.
2. Preserve all existing local/uncommitted work. Never reset, clean, discard, overwrite, force-push or rebase user work without explicit approval.
3. Follow repository agent instructions, relevant skills, frontend/CODING_STANDARDS.md and architecture documents that actually exist.
4. Do not assume an architecture proposal is implemented. Verify source code and schema separately.
5. Do not invent endpoints, request envelopes, response fields, permissions, role names, DB columns, enum values, workflows or integrations.
6. Preserve existing API routes, request/response contracts, authentication, authorization and navigation unless the user explicitly requests a contract change.
7. Keep changes minimal and scoped. Avoid unrelated refactoring, formatting, dependency additions or architecture migration.
8. Do not change backend, database, infrastructure, S3, deployment or environment configuration during a frontend-only task.
9. Never claim a build, test, migration, deployment or Git push succeeded unless tool output confirms it.
10. Report assumptions, blockers, pending decisions and unverified facts explicitly.

## 3. BBG backend architecture — mandatory seven layers

Preserve these seven logical layers and responsibilities:

1. **InDto** — module input parameter structure/defaults; no business logic.
2. **Controller** — HTTP boundary; forwards the expected module envelope.
3. **Versioned Services** — API version boundary; maps input to InDto, invokes Core Services and returns the response.
4. **Core Services** — action validation, authorization, tenant checks, dispatch, business use cases, business validation and transaction ownership.
5. **DAO** — parameterized database reads/writes using the supplied connection and scalar arguments.
6. **Model** — legacy/reference only; do not introduce into new Yii 3 work unless the current BBG codebase explicitly requires it.
7. **Utils** — reusable non-business, non-persistence helpers.

Yii 3 routing, middleware, dependency injection and framework plumbing do not create replacement business layers. Do not substitute a generic Controller → Application Service → Repository architecture.

### 3.1 Response contract

Preserve the existing associative response array named $resArr:

- status: SUCCESS, FAILED or EXCEPTION
- msgArr: flat diagnostic message list
- data: result payload; empty array on failure/exception where required by the established contract

Do not expose SQL, stack traces, secrets, raw tokens or server paths. Do not silently reshape existing API responses.

### 3.2 Ownership

- Core Services own validation, permission/tenant enforcement, business workflows and transactions.
- DAO owns persistence only; use parameter binding and do not place business authorization in DAO.
- Controllers remain thin.
- InDto is a data structure, not a business-logic layer.
- Preserve established exception propagation and append diagnostic context only in the project-approved way.

## 4. Skill: Modify existing code

**Trigger:** bug fixes, corrections, changes to existing validation/business rules, existing API/query/field behaviour, or edits to existing configuration.

### Workflow

1. Read the target file and surrounding functions/classes.
2. Trace callers, callees, DTOs, API contracts, permissions, tests and dependent UI.
3. Identify the root cause before editing.
4. Record the existing contract and expected behaviour.
5. Reuse nearby helpers and match local naming, formatting, error handling and query style.
6. Make exactly the requested change. Keep the diff focused.
7. If the fix requires changing a public contract, schema, route, permission or unrelated module, stop and ask for approval.
8. Add/update focused tests and run relevant verification commands.
9. Summarize files changed, behaviour changed, tests run and known limitations.

Do not reformat neighbouring code, rename unrelated symbols, create duplicate functionality, silently expand scope or correct unrelated architectural drift.

## 5. Skill: New development

**Trigger:** new module, endpoint, action, field, filter, report, workflow or capability.

### Mandatory planning gate

Before coding, inspect the current implementation and present a plan covering:

- Purpose, user roles and scope
- Reusable existing modules/components/tables/services
- Business rules and lifecycle/state transitions
- Input/output contracts and validation
- DB design: reused/new tables, relationships, indexes, audit and soft-delete behaviour
- Authorization matrix and tenant scope
- Layer-by-layer files to create/update
- Transaction boundaries and failure handling
- Frontend routes, screens, components, services and state
- Tests, migration and rollout risks
- Open questions and decisions requiring owner approval

Do not implement a material change or contract/schema change until the user approves the plan.

### Backend implementation order

Follow InDto → Controller → Versioned Services → Core Services → DAO. For every new validation rule, state which layer owns it. Keep authorization and tenant isolation in Core Services; keep SQL in DAO; preserve the response contract.

### Frontend implementation

Follow Angular 22 patterns and frontend/CODING_STANDARDS.md. Reuse shared components and services. Keep route containers smart and reusable presentational components focused on typed inputs/outputs. Do not introduce a UI framework or state library without approval.

## 6. Skill: Build UI / UX

1. Inspect the existing screen, route, component tree, shared component catalogue, design tokens and responsive behaviour.
2. Treat these approved BBG benchmark screens as visual and interaction references:
   - Public Marketplace Landing Page
   - Product Catalogue — Table View
   - Product Catalogue — Grid View
3. Follow the current BBG design direction:
   - Modern Enterprise SaaS A
   - BCF-inspired palette adapted to BBG identity
   - Light and dark themes
   - Collapsible sidebar application shell
   - Restrained Apple-like glassmorphism: approximately 70% solid/readable surfaces, 20% glass and 10% accents
4. Keep BBG identity distinct from BCF and preserve merchant storefront branding.
5. Use semantic design tokens. Do not hardcode component hex colours; use the CSS custom properties in the BBG theme system.
6. Reuse components; do not create near-duplicate buttons, dialogs, tables, cards, inputs, badges or empty states.
7. Preserve existing functionality, RBAC, routes, API wiring and data behaviour during visual work.
8. Support keyboard use, visible focus, WCAG 2.2 AA contrast, labels, validation associations and accessible dialogs.
9. Every data-driven screen must handle loading, empty, error/retry and success states.
10. Validate desktop, tablet and mobile; light and dark themes.

### Approved marketplace/storefront behaviour

- Maximum three platform cards in the relevant platform-card area.
- Cart and orders are excluded/hidden from the current approved public marketplace experience.
- Product card actions: **View Details**, **WhatsApp**, **Go to Business**; include **Explore Storefront** where specified by the approved screen.
- Business card actions: **View / Go to Business** and **WhatsApp**.
- Product enquiry WhatsApp message must carry product context/name.
- Missing product price is displayed as **Contact business for price**.
- Product reviews belong on the product page.
- Promotional posts retain comments/reviews and likes/reactions.
- Pagination rather than infinite scrolling applies to Public Marketplace and Merchant Storefront only. Do not impose this rule on workspace screens; preserve their existing pagination/loading behaviour.

## 7. Skill: Data layer & API integration

1. Inspect the real Yii controller, versioned service, Core Service, DAO, DTO and frontend API service before wiring a screen.
2. Preserve the correct action envelope (for example, existing module-specific envelopes such as businessParam, authParam, adminParam, customerParam, subscriptionParam, tenantParam or dashboardParam where actually used).
3. Do not send flat payloads to endpoints expecting an envelope.
4. Keep TypeScript request/response types explicit; avoid any. Treat untrusted data as unknown and narrow it.
5. Preserve the backend response contract and existing frontend mapping.
6. Use RxJS for asynchronous HTTP/streams and Angular Signals for local synchronous UI state, following the existing service/store pattern.
7. Cancel or ignore stale requests; debounce search; prevent duplicate submissions; clean up subscriptions with takeUntilDestroyed or toSignal.
8. Use server-side filtering/sorting/pagination where supported. Never assume an endpoint supports a query parameter until verified.
9. Keep secrets and sensitive data out of browser storage, logs and public responses.

## 8. Skill: Database design & migration

1. Read the canonical BBG database design and inspect actual migrations/live schema evidence.
2. Distinguish documented design, migration SQL and verified live schema. Never treat them as interchangeable.
3. Preserve existing table/column names and definitions unless an approved change says otherwise.
4. Apply mandatory common columns and A/Z soft-delete convention consistently with the canonical database design.
5. Use parameterized queries, appropriate indexes, explicit foreign-key names and tenant-safe relationships.
6. Never cascade-delete business records by default. Respect the approved FK action policy.
7. Keep polymorphic relationships application-managed where the design specifies no physical FK.
8. Do not activate future-scope inventory/purchasing tables or workflows without approval.
9. Before adding FKs or unique constraints, inspect types, nullability, indexes, duplicates, orphan rows and tenant consistency.
10. Never run migrations against production or perform destructive data repair without explicit approval, backup and a reviewed rollout plan.

## 9. Skill: Authorization, RBAC & multi-tenancy

- Server-side authorization is authoritative; frontend guards and hidden controls are usability only.
- Check user identity, role/permission, tenant membership, resource ownership and tenant scope on every protected operation.
- Do not rely on role-name checks where the permission model already provides permission checks.
- Never trust a client-supplied tenant ID as proof of access.
- Keep platform administration separate from tenant-level business roles.
- Apply tenant scope before filtering, counting, sorting and pagination.
- Deny by default when permission evidence is missing.
- Do not invent permission keys or assign privileges without an approved matrix.
- Test cross-tenant reads, updates, deletes, file access and identifier substitution.

## 10. Skill: Review, test & release

### Review checklist

- [ ] Request scope and acceptance criteria satisfied
- [ ] Existing working tree/local changes preserved
- [ ] No unrelated changes or duplicate functionality
- [ ] API contracts, routes and permissions preserved
- [ ] Tenant isolation and sensitive-data handling verified
- [ ] Error, empty, loading and success states covered
- [ ] Responsive layout and light/dark themes checked
- [ ] Accessibility and keyboard interaction checked
- [ ] Tests/build/type checks run and results recorded
- [ ] Migration reviewed; no unapproved production execution
- [ ] Documentation updated
- [ ] Git diff and changed-file list reviewed

### Frontend baseline checks

Use the actual scripts available in frontend/package.json. BBG coding standards specify:

- npx tsc --noEmit
- npm run build

Also run relevant unit/integration/e2e tests where available. Do not report a check as passed if it was not run.

### Final report

Include:
1. Summary of what changed
2. Files created/updated
3. API/schema/permission impact (or explicitly none)
4. Tests and commands with actual outcomes
5. Known limitations/open decisions
6. Git branch and commit/push status, only if performed

## 11. BBG frontend coding standards

The repository file frontend/CODING_STANDARDS.md is authoritative for detailed Angular rules. Key requirements:

- Angular 22, TypeScript 5.9+, RxJS 7.8, SCSS.
- Standalone components, OnPush change detection and inject().
- Container/presentational/layout component separation.
- Signals for local state; RxJS for async streams.
- Modern Angular template control flow: @if, @for, @switch.
- Stable tracking keys for loops.
- No any; explicit types and return types.
- CSS custom properties from the BBG theme; no component-level hardcoded hex values.
- Light/dark support, mobile-first layout, semantic HTML and WCAG 2.2 AA.
- No new UI framework, state library, API wrapper or runtime dependency without explicit approval.
- Preserve API envelopes, routes, response mapping and current behaviour.

## 12. Source and precedence

When instructions conflict, use this order:

1. Explicit latest instruction/approval from the BBG project owner
2. Existing BBG implementation and contracts for modification tasks
3. BBG-specific approved architecture/specification and frontend/CODING_STANDARDS.md
4. BBG database design and backend architecture documents
5. Transferable workflow/process guidance from supplied skills bundles
6. General engineering convention

The supplied agent-skill kits contain examples from other systems (including EduNova/SIMS). Their stack-specific code, component names, file paths, NgRx/PrimeNG/Tailwind conventions and unrelated product rules must not be copied into BBG unless independently approved and compatible with BBG.

---

**End of BBG Agent Skills & Engineering Operating Rules.**
