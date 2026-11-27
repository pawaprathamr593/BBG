# BBG — Master UI, Backend & Database Requirements

**Product:** BBG — Business Management & Marketplace Platform  
**Document type:** Consolidated product and technical requirements baseline  
**Target stack:** Angular 22 · Yii 3 · PHP 8.4 · MySQL 8.4 · Nginx · PHP-FPM  
**Status:** Consolidated baseline; individual items retain their source status (confirmed, proposed, pending or future scope).  
**Last consolidated:** 27 November 2026

> **Authority note:** This document consolidates the uploaded BBG frontend architecture, backend architecture and database design, together with explicit BBG product-owner decisions for UI/UX and PAN requirements. It does not claim every proposed architecture item is implemented. Verify the current repository and live schema before implementation. Do not silently resolve source conflicts or pending decisions.

## 1. Product scope & experience boundaries

BBG is a multi-tenant business management and marketplace platform with three connected experiences:

1. **Public Marketplace / Merchant Storefront** — public discovery of businesses, products and promotional content, plus customer enquiries and approved marketplace interactions.
2. **Private Business Workspace** — authenticated tenant-scoped business operations for owners and authorized staff.
3. **Platform Administration** — platform-level onboarding, business approval, compliance, moderation and platform configuration, separate from tenant roles.

The Angular frontend communicates with a Yii 3 / PHP 8.4 backend and MySQL 8.4. Nginx and PHP-FPM provide the web runtime. The database design contains 68 tables; inventory and purchasing are explicitly classified as future scope in the supplied design.

## 2. Decision labels

| Label | Meaning |
|---|---|
| Confirmed | Explicit project-owner decision |
| Source requirement | Present in one of the supplied BBG architecture/design documents |
| Proposed | Design recommendation awaiting approval |
| Pending | Must be decided before implementation |
| Future scope | Documented for later; not active in the current release unless separately approved |

Where the documents disagree, keep the conflict visible and request a decision.

# Part A — UI / UX Requirements

## 3. Frontend technology & architecture

### 3.1 Technology baseline

- Angular 22
- TypeScript 5.9+
- RxJS 7.8
- SCSS
- Existing BBG frontend architecture, routes, services, state patterns and component library
- Responsive web application with light and dark themes

Do not introduce Tailwind, PrimeNG, Angular Material, Bootstrap, NgRx/Akita or another runtime/UI/state dependency unless explicitly approved. The supplied agent skills kit is a workflow reference, not authority to import EduNova/SIMS stack conventions.

### 3.2 Component architecture

Use feature-first organization and separate:

- **Container/smart components:** route context, API orchestration, permissions, loading/error state and navigation.
- **Presentational components:** typed inputs and outputs; no HTTP calls or global state mutation.
- **Layout components:** application shell, header, sidebar, responsive navigation and content projection.
- **Shared components:** reusable buttons, forms, tables, cards, dialogs, drawers, badges, skeletons, empty states and feedback patterns.
- **Feature components:** domain-specific screens and presentation.

Prefer reuse over duplication. Keep component responsibilities small and cohesive.

### 3.3 Frontend coding standards

The repository file frontend/CODING_STANDARDS.md is authoritative. Core requirements:

- Standalone components and OnPush change detection.
- Use inject() for dependency injection.
- Angular Signals (signal, computed) for local synchronous state.
- RxJS Observables for HTTP, real-time streams, debounce and cancellation.
- Use takeUntilDestroyed or toSignal for component-owned subscriptions.
- Use modern Angular control flow (@if, @for, @switch).
- Every @for must use a stable tracking key.
- Avoid any; use explicit interfaces, union types and return types.
- Keep templates free of complex business logic.
- Use semantic HTML and accessible controls.
- Do not add a new framework, state library, API wrapper or runtime dependency without approval.

## 4. BBG visual design system

### 4.1 Approved direction

- **Visual direction:** Modern Enterprise SaaS A.
- **Themes:** Light and dark.
- **Branding:** BCF-inspired colour direction adapted to BBG. BBG must remain its own identity; merchant storefront branding remains distinct.
- **Application shell:** Collapsible sidebar.
- **Surface treatment:** Restrained Apple-like glassmorphism across the application, balanced for usability.

### 4.2 Colour and surface guidance

The following are project design-direction reference values. Component styles must consume established CSS custom properties rather than hardcode hex values.

| Purpose | Reference |
|---|---|
| Brand forest green | #174D35 |
| Deep green | #0B3020 |
| Saffron accent | #F5D928 |
| Restrained teal | #218C83 |
| Light page background | #F5F7F5 |
| Dark page background | #0B140E |
| Dark header | #070D0A |
| Dark sidebar | #0F1812 |
| Dark cards | #122018 |
| Dark primary text | #F0FDF4 |
| Dark secondary text | #94A39B |
| Dark border | #1E2E25 |

Glassmorphism intensity guidance: approximately 70% solid/readable surfaces, 20% glass surfaces and 10% accent treatments. Do not make every component translucent. Tables, forms, long text, dense data and accessibility-critical controls must remain readable.

### 4.3 Design-system requirements

- Use CSS custom properties from the BBG theme system (src/app/core/theme/tokens.scss / src/styles.scss, subject to actual repository structure).
- No hardcoded hex values in component styles.
- Every component must work in light and dark themes.
- Maintain visible focus states and semantic contrast.
- Keep SCSS nesting to a maximum of three levels.
- Mobile-first responsive breakpoints per coding standards:
  - Compact mobile: below 640px
  - Tablet: 640–1023px
  - Desktop: 1024–1439px
  - Wide: 1440px and above

## 5. Approved benchmark screens & marketplace rules

The following screens are the visual and interaction benchmarks. Preserve their approved information architecture and functionality when updating other screens:

1. Public Marketplace Landing Page
2. Product Catalogue — Table View
3. Product Catalogue — Grid View

### 5.1 Marketplace card and action rules

- Maximum three platform cards in the relevant platform-card area.
- Hide/exclude cart and orders from the approved current marketplace experience.
- Product card actions:
  - View Details
  - WhatsApp
  - Go to Business
  - Explore Storefront where specified by the approved screen
- Business card actions:
  - View / Go to Business
  - WhatsApp
- Product WhatsApp enquiry must include the product name/context in the prefilled message.
- If product price is missing, show **Contact business for price**; do not show a fabricated price.
- Product-based reviews belong on the product page.
- Promotional posts retain comments/reviews and likes/reactions.
- Keep promotional content visually clear and professional; avoid overfilled or unbalanced promotion cards.

### 5.2 Pagination and loading

- Use pagination rather than infinite scrolling on Public Marketplace and Merchant Storefront.
- This requirement does not apply to workspace screens. Preserve workspace pagination, loading and data-fetch behaviour unless a separate approved requirement changes it.
- Use loading, empty, error/retry and success states.
- Avoid stale search results; debounce search and cancel/ignore superseded requests where appropriate.

## 6. Frontend feature areas & requirements register

### 6.1 Public and authentication

- Public landing and marketplace discovery.
- Authentication and registration flows.
- Public business/storefront and product discovery.
- Route separation between public pages and authenticated workspace.
- Authentication/session state handled centrally and securely.
- Social sign-in providers are subject to provider feasibility and configured credentials; do not claim a provider is live unless verified.

### 6.2 Consumer

- Consumer account can exist without PAN.
- PAN is not required for normal consumer registration, social registration, marketplace browsing or consumer functionality.
- Consumer registration UI and payload must not collect PAN.
- Consumer-facing product/business interactions follow the approved marketplace rules.

### 6.3 Business / Entrepreneur onboarding

- Business onboarding is separate from consumer registration.
- A signed-in consumer can start a business application.
- Draft applications may be incomplete.
- PAN and PAN document are required before final business application submission, according to the approved PAN rules in Part D.
- Preserve the existing application, subscription/payment proof and admin-review lifecycle unless a separately approved change modifies it.
- Do not assume a table or migration is active merely because it exists in the design documents.

### 6.4 Business Workspace

- Workspace is private and tenant-scoped.
- Role/permission-based access controls every screen and action.
- Preserve current workspace pagination/loading behaviour.
- Reuse shared components and follow existing workspace feature/module architecture.
- Do not activate future-scope inventory/purchasing functionality without approval.
- Do not change backend APIs or DB schema as part of frontend-only redesign work.

### 6.5 Platform Administration

- Platform-level administration is separate from tenant business roles.
- Business application review and approval.
- Compliance request and PAN verification queue as specified in Part D.
- Marketplace moderation and other admin functions only where supported by current approved scope and permission model.
- Do not invent role names, permission keys or admin routes.

## 7. Frontend API, state, security & accessibility

### 7.1 API contracts

Preserve actual backend routes, action envelopes, request field names, response structures and response mapping. Existing module envelopes may include businessParam, authParam, adminParam, customerParam, subscriptionParam, tenantParam and dashboardParam; use only the envelope actually defined by the endpoint.

Never send a flat payload to an endpoint that expects an envelope. Do not invent API routes or query parameters.

### 7.2 State and data fetching

- Component signals for ephemeral UI state.
- RxJS for async HTTP and streams.
- Shared feature state only where existing architecture requires it.
- URL query parameters for bookmarkable filters/page/search where supported.
- Explicit idle/loading/success/error state where needed.
- Prevent duplicate submits and handle cancellation/stale results.
- Server-side filtering, sorting and pagination where backend supports it.

### 7.3 Security

- Do not store tokens/secrets in localStorage or sessionStorage.
- Follow existing access-token and refresh-cookie architecture.
- Route guards and hidden actions are not security boundaries.
- Backend authorization remains authoritative.
- Do not expose private business, customer, financial, PAN or audit data in public responses.

### 7.4 Accessibility

Target WCAG 2.2 AA:

- Body text contrast at least 4.5:1; large text and graphical controls at least 3:1.
- Keyboard navigation and visible :focus-visible.
- Every form control has a label or accessible name.
- Validation messages connected with aria-describedby.
- Dialogs trap focus, declare dialog semantics and support Escape.
- Async notifications use appropriate live regions.
- Touch targets and responsive layouts remain usable.

# Part B — Backend Requirements

## 8. Backend technology & request flow

### 8.1 Confirmed technology foundation

| Area | Technology |
|---|---|
| Frontend | Angular 22 |
| Backend framework | Yii 3 |
| Backend language | PHP 8.4 |
| Database | MySQL 8.4 |
| Web server | Nginx |
| PHP runtime | PHP-FPM |
| Database administration | phpMyAdmin |
| Version control | Git |
| Local development direction | Docker Compose on macOS |

### 8.2 Request path

    Angular 22
      → HTTPS / JSON
      → Nginx
      → PHP-FPM (PHP 8.4)
      → Yii 3 routing / middleware / controller
      → InDto
      → Versioned Services (V1)
      → Core Services (dispatcher / worker)
      → DAO
      → MySQL 8.4

Yii routing, middleware, dependency injection and bootstrap are framework plumbing, not replacement business-logic layers.

## 9. Mandatory seven-layer backend architecture

Preserve exactly these logical layers:

| Order | Layer | Responsibility |
|---:|---|---|
| 1 | InDto | Module input parameter structure/defaults; no business logic |
| 2 | Controller | HTTP endpoint; forwards expected input envelope |
| 3 | Versioned Services | Maps input to InDto, calls Core Services and returns API response |
| 4 | Core Services | Action validation, dispatch, business use cases, authorization, tenant checks, business validation and transaction ownership |
| 5 | DAO | Database reads/writes using supplied DB connection and scalar arguments |
| 6 | Model | Legacy/reference only; no new development unless actual BBG codebase explicitly requires it |
| 7 | Utils | Shared helpers, neither business services nor database access |

Do not replace this with a different service/repository architecture.

### 9.1 $resArr response contract

Preserve the established associative array:

- status: SUCCESS, FAILED or EXCEPTION
- msgArr: flat diagnostic message list
- data: result payload; empty array on failure/exception as specified by existing implementation

Do not change the response contract without explicit approval.

### 9.2 Service and DAO responsibilities

- Core Services validate action envelopes and input, enforce authentication/authorization/tenant membership, apply business rules, coordinate workflows and own transactions.
- DAO performs parameterized persistence only.
- DAO methods receive the database connection and scalar arguments following existing conventions.
- Controllers must not contain business workflows or direct SQL.
- Versioned Services preserve API-version boundaries and serialization.
- Utils must not become a hidden business service or persistence layer.

## 10. Authentication, authorization & multi-tenancy

### 10.1 Authentication direction

- Short-lived access token.
- Rotating refresh-token cookie.
- Refresh token hashes and session/family metadata stored in USER_SESSIONS; never store raw refresh tokens.
- Rotation and reuse detection are application logic and should be transactionally safe.
- Cookie flags, expiry durations, provider credentials and final provider setup remain subject to detailed backend architecture and deployment decisions.
- Google, Facebook and Instagram sign-in have been requested, but provider feasibility/configuration is not automatically confirmed.

### 10.2 Authorization

- Separate platform administration from tenant roles.
- Verify identity, permissions, tenant membership and resource ownership server-side.
- Apply tenant scope on every tenant-owned read/write.
- Never trust a client-supplied tenant ID as authorization.
- Frontend guards are convenience only.
- Deny by default when permission evidence is missing.
- Do not invent roles or permission keys.

### 10.3 Tenant isolation

- Tenant-owned resources must be scoped to the authenticated tenant.
- Apply tenant scope before search/filter/count/pagination.
- Check that referenced child and parent records belong to the same tenant.
- Test cross-tenant identifier substitution and file/media access.
- Foreign keys do not replace service-layer authorization.

## 11. Backend functional areas

The backend architecture identifies candidate module responsibilities across:

- Authentication and user identity
- Sessions and token lifecycle
- Roles, permissions and user-role assignments
- Tenants and memberships
- Modules, dependencies, plans and subscription entitlements
- Business profiles and storefront settings
- Product catalogue, categories, units, variants and media
- Customer identities, tenant customers and addresses
- Orders, order items, status history and fulfilment (release approval applies)
- Payments, transactions, refunds and invoices (release approval applies)
- Marketplace promotions, media, enquiries, messages, likes, comments, views and reports
- Moderation logs
- Expenses, cash sessions and cash movements
- Notifications and audit logs
- Inventory and purchasing — future scope only in the supplied DB design

The database catalogue is not proof that every module is active in the current release. Verify approved release scope before exposing UI/API workflows.

## 12. Backend security & reliability

- Prepared statements / Yii query parameter binding; no SQL concatenation with untrusted input.
- Authentication, authorization and tenant checks on every protected operation.
- Protect password hashes, refresh-token hashes, provider identities, payment payloads and audit logs.
- Encrypt sensitive provider credentials when persisted.
- Never log secrets, raw tokens, passwords, PAN or private document credentials.
- Keep public media and private documents under appropriate storage/access policies.
- Exclude soft-deleted rows from normal APIs unless explicitly authorized.
- Protect immutable financial, stock-ledger and audit records from ordinary update/delete operations.
- Use least-privilege database credentials.
- Handle FK/integrity failures as controlled business errors.
- Transactions belong to Core Services; rollback failed multi-write workflows.

# Part C — Database Requirements

## 13. Database baseline

- MySQL 8.4.
- Database design document: **BBG Database Design Final v2.0**.
- The design documents 68 tables.
- This is a logical/documented design, not proof of the live production schema.
- Validate all migrations and actual schema before implementation.
- Do not silently rename, remove, add or redefine columns.

## 14. Mandatory common columns & soft deletion

The database design states that all 68 tables carry the mandatory common fields:

- id
- status
- created_by
- created_on
- updated_by
- updated_on

The five mandatory non-ID common columns are status, created_by, created_on, updated_by and updated_on.

Soft deletion uses the A/Z status convention defined in the database design. Do not introduce deleted_at or hard-delete behaviour unless separately approved. Follow the source's exact status meanings and update conventions.

## 15. Complete database table catalogue (68)

The following names are from the supplied BBG Database Design Final v2.0. Preserve section classification and future-scope boundaries.

### 15.1 Platform identity, tenancy & authorization

1. USERS
2. USER_IDENTITIES
3. USER_SESSIONS
4. ROLES
5. PERMISSIONS
6. ROLE_PERMISSIONS
7. USER_ROLE_ASSIGNMENTS
8. TENANTS
9. TENANT_MEMBERSHIPS
10. TENANT_SETTINGS

### 15.2 Modules, plans & subscription entitlements

11. MODULES
12. MODULE_DEPENDENCIES
13. TENANT_MODULES
14. PLANS
15. PLAN_ENTITLEMENTS
16. TENANT_SUBSCRIPTIONS
17. SUBSCRIPTION_PAYMENT_PROOFS

### 15.3 Business profile & product catalogue

18. BUSINESS_PROFILES
19. CATEGORIES
20. TENANT_PRODUCT_CATEGORIES
21. UNITS_OF_MEASURE
22. PRODUCTS
23. PRODUCT_VARIANTS
24. PRODUCT_MEDIA
25. STOREFRONT_SETTINGS

### 15.4 Customer identity & tenant relationship

26. CUSTOMER_IDENTITIES
27. TENANT_CUSTOMERS
28. CUSTOMER_ADDRESSES

### 15.5 Sales, orders & fulfilment

29. ORDERS
30. ORDER_ITEMS
31. ORDER_STATUS_HISTORY
32. ORDER_FULFILMENTS

### 15.6 Payments, refunds & invoices

33. PAYMENTS
34. PAYMENT_TRANSACTIONS
35. REFUNDS
36. INVOICES

### 15.7 Inventory & purchasing — future scope

37. SUPPLIERS
38. PURCHASE_ORDERS
39. PURCHASE_ORDER_ITEMS
40. GOODS_RECEIPTS
41. GOODS_RECEIPT_ITEMS
42. STORES
43. STOCK_LOCATIONS
44. STOCK_BALANCES
45. STOCK_MOVEMENTS
46. STOCK_COST_LAYERS
47. STOCK_COST_ALLOCATIONS
48. STOCK_RESERVATIONS
49. STOCK_TRANSFERS
50. STOCK_TRANSFER_ITEMS
51. STOCK_ADJUSTMENTS
52. STOCK_ADJUSTMENT_ITEMS

### 15.8 Marketplace engagement & communication

53. PROMOTIONAL_POSTS
54. POST_MEDIA
55. CUSTOMER_ENQUIRIES
56. ENQUIRY_MESSAGES
57. CONTENT_LIKES
58. COMMENTS
59. CONTENT_VIEWS
60. CONTENT_REPORTS
61. MODERATION_LOGS

### 15.9 Expenses, cash, notifications & audit

62. EXPENSE_CATEGORIES
63. EXPENSES
64. CASH_SESSIONS
65. CASH_MOVEMENTS
66. NOTIFICATION_PREFERENCES
67. NOTIFICATIONS
68. AUDIT_LOGS

> The 16 inventory/purchasing tables (37–52) remain future scope. Their presence in the schema design does not authorize current-release screens, endpoints, permissions or workflows.

## 16. Database relationships, integrity & indexing

- Preserve primary keys, unique constraints and secondary indexes documented in the database design.
- Use the proposed foreign-key register only after validating live schema and existing data.
- Follow documented referential-action policy; do not introduce cascading deletes for business records.
- Keep polymorphic relationships application-managed where the design specifies no ordinary physical FK.
- Tenant-composite FK opportunities require review/approval and supporting indexes.
- Verify child/parent column types, lengths, signedness, nullability, engines and indexes before adding constraints.
- Check orphan records, duplicate values, NULL behaviour and tenant consistency before constraints.
- Do not silently repair, reassign or delete existing records.
- Consider MySQL nullable UNIQUE semantics, especially nullable columns such as a stock variant identifier.
- Preserve source financial type decisions unless a separate migration/change is approved; floating-point money values require careful handling and the documented MySQL 8.4 caveat must be reviewed.

## 17. Database implementation & migration safety

Before any schema migration:

1. Identify target environment/database name; source materials mention environment naming differences that must be resolved explicitly.
2. Compare documented design, migration SQL and live schema as separate evidence.
3. Review affected application queries and DTO/API contracts.
4. Check existing data for duplicates, orphan references, nulls and cross-tenant inconsistencies.
5. Produce a reviewed migration plan and rollback/recovery strategy.
6. Back up and test against a clone before production.
7. Account for MySQL DDL implicit commits; do not assume a multi-statement DDL migration is fully rollbackable.
8. Do not run production migrations or destructive repair without explicit owner approval.

No trigger, stored procedure, partitioning, collation, grant or seed catalogue should be invented from the logical schema alone.

# Part D — Approved PAN & Business Compliance Requirements

## 18. Consumer PAN rules

- Consumers may register and maintain an account without PAN.
- PAN is never required for normal consumer registration.
- PAN is not required for social registration.
- PAN is not required for marketplace browsing or consumer functionality.
- Do not add PAN fields or PAN validation to consumer registration.

## 19. New business application PAN rules

- A new business application must provide PAN before final submission.
- Draft applications may be incomplete and saved without PAN.
- PAN owner type must be BUSINESS or INDIVIDUAL.
- If owner type is INDIVIDUAL, collect the PAN holder's name only.
- Do not collect the relationship between the individual and the business.
- Manual verification is performed by BBG Platform Admin.
- PAN format validation is a syntax check only; it does not prove PAN authenticity or holder identity.
- The PAN document must be submitted before final application submission.
- After rejection, the business applicant must be able to view the rejection reason, correct details/document and resubmit.

## 20. Existing approved businesses

- No blanket PAN migration requirement.
- Platform Admin decides individually whether an existing approved business must provide PAN.
- Existing businesses start as NOT_REVIEWED for this compliance decision, not automatically REQUIRED.
- A business marked NOT_REQUIRED continues operating.
- A business marked REQUIRED receives a compliance request and due date.
- Missing PAN must not automatically suspend an existing business or block workspace access.
- Suspension/blocking requires separate explicit approval and policy.

## 21. PAN data & security design

Recommended design from the finalized PAN specification:

### 21.1 BUSINESS_TAX_IDENTIFIERS

Suggested responsibility: tenant-linked PAN identity and verification record.

Suggested fields:

- id, tenant_id
- pan_owner_type (BUSINESS / INDIVIDUAL)
- pan_number_encrypted
- pan_fingerprint
- pan_holder_name (required only for INDIVIDUAL)
- verification_status (PENDING, VERIFIED, REJECTED)
- submitted_on, verified_by, verified_on, rejection_reason
- Common status and audit columns

This is a proposed table, not a claim that it already exists. Retain correction/rejection history; do not overwrite historical evidence. One-current-record-per-tenant strategy and cross-business PAN reuse policy require explicit schema/business confirmation.

### 21.2 BUSINESS_PAN_REQUIREMENTS

Suggested responsibility: per-business compliance requirement decision.

Suggested fields:

- id, tenant_id
- requirement_status (NOT_REVIEWED, REQUIRED, NOT_REQUIRED)
- reason, requested_by, requested_on, due_on
- Common status and audit columns

### 21.3 Existing document table reuse

Reuse BUSINESS_APPLICATION_DOCUMENTS with document_type = PAN_CARD only if repository/schema inspection confirms it is integrated with the active business onboarding workflow and access control. The existing design/migration mentions this table, but the active service flow previously inspected uses BUSINESS_PROFILES; do not assume integration.

### 21.4 Sensitive-data protection

- Never store PAN in USERS.
- Never expose PAN in public BUSINESS_PROFILES or marketplace APIs.
- Encrypt PAN using authenticated encryption; keep keys outside the database.
- Use keyed HMAC fingerprint for duplicate detection, not a plain unsalted hash.
- Mask PAN in normal API responses.
- Restrict full PAN visibility to authorized verification workflows.
- Protect document retrieval with role and tenant checks.
- Never log raw PAN, keys, document credentials or unmasked PAN.
- Do not add a unique fingerprint constraint until PAN reuse policy is confirmed.

## 22. PAN workflow requirements

### 22.1 Business applicant

- Save incomplete business draft without PAN.
- Select PAN owner type.
- Enter PAN number.
- Show PAN holder name only for INDIVIDUAL owner type.
- Upload PAN document.
- Validate conditional fields.
- Prevent final application submission until PAN details and required document are present.
- Restore draft values and upload state safely.
- Display pending/verified/rejected state and rejection reason.
- Allow correction and resubmission after rejection.

### 22.2 Platform Admin

- View PAN compliance queue.
- Filter by status and business.
- Review masked PAN and protected document.
- Verify or reject; rejection reason is mandatory.
- Record reviewer and verification timestamp.
- View verification/rejection history.
- Assign existing-business requirement individually with reason and due date.
- Do not suspend or block workspace solely due to missing PAN.

### 22.3 Candidate database integration

The active onboarding implementation previously identified uses BUSINESS_PROFILES, TENANTS, TENANT_MEMBERSHIPS, USER_ROLE_ASSIGNMENTS and STOREFRONT_SETTINGS. The existing migration 20261112_001_business_application_and_cart.sql mentions BUSINESS_APPLICATIONS.tax_identifier and BUSINESS_APPLICATION_DOCUMENTS, but the active service workflow must be verified before reuse. Do not repurpose generic tax_identifier as PAN without a dedicated owner-type model.

# Part E — Delivery, Traceability & Acceptance

## 23. Scope boundaries

Unless separately approved, do not:

- Change Yii APIs/backend while doing frontend-only work.
- Change DB schema while doing UI-only work.
- Introduce new frameworks, state libraries or dependencies.
- Activate cart/orders in the current approved public marketplace.
- Activate inventory/purchasing workflows.
- Add consumer PAN collection.
- Automatically suspend existing businesses for missing PAN.
- Add external/government PAN verification integration.
- Automatically verify PAN.
- Change subscription/payment behaviour as part of PAN work.
- Change unrelated RBAC, route or data models.

## 24. Testing & acceptance checklist

### UI

- [ ] Benchmark screens remain intact and consistent.
- [ ] Maximum-three-card rule applied in its intended area.
- [ ] Cart/orders remain hidden from approved marketplace scope.
- [ ] Product/business card actions match approved behaviour.
- [ ] WhatsApp product message includes product context.
- [ ] Missing price displays Contact business for price.
- [ ] Product reviews appear on product page.
- [ ] Promotion interactions retain comments and reactions.
- [ ] Marketplace/storefront use pagination; workspace behaviour remains unchanged.
- [ ] Loading, empty, error/retry and success states work.
- [ ] Light/dark theme and responsive breakpoints verified.
- [ ] Keyboard navigation and WCAG 2.2 AA checks completed.

### Backend

- [ ] Seven logical layers preserved.
- [ ] Existing API envelopes and $resArr preserved.
- [ ] Core Services enforce authentication, permissions and tenant scope.
- [ ] DAO uses parameterized SQL.
- [ ] Transactions and rollback tested.
- [ ] Cross-tenant access attempts rejected.
- [ ] Sensitive values excluded from logs and public responses.
- [ ] Future-scope modules not accidentally activated.

### Database

- [ ] Existing schema/migrations inspected before change.
- [ ] Common audit/status columns preserved.
- [ ] A/Z soft deletion respected.
- [ ] FK/index/unique constraints validated against real data.
- [ ] Tenant consistency checked.
- [ ] No unapproved column/table changes.
- [ ] No production migration without approval and backup.

### PAN

- [ ] Consumer registration works without PAN.
- [ ] Consumer social registration works without PAN.
- [ ] Business draft can be saved without PAN.
- [ ] Final business submission requires PAN and document.
- [ ] BUSINESS and INDIVIDUAL owner types supported.
- [ ] Individual holder name shown/required only for INDIVIDUAL.
- [ ] No relationship field is collected.
- [ ] Admin can verify/reject with mandatory rejection reason.
- [ ] Rejected applicant can correct and resubmit.
- [ ] Existing business requirement is assigned individually.
- [ ] NOT_REQUIRED businesses continue operating.
- [ ] Missing PAN does not automatically suspend/block existing workspace.
- [ ] Tenant isolation, masking, encryption and protected document access verified.

## 25. Source documents & precedence

Primary uploaded source documents:

1. **BBG_Backend_Architecture_v1.0.md** — seven-layer backend architecture, Yii 3 mapping, authentication, RBAC, tenancy, API response, transactions, security and testing.
2. **frontend_architecture.md** — Angular frontend architecture, components, routes, services, state, feature requirements, security and testing.
3. **BBG_Database_Design_Final_v2.0.md** — 68-table catalogue, data dictionary, common columns, soft deletion, relationships, constraints, indexes and migration caveats.
4. **frontend/CODING_STANDARDS.md** — authoritative BBG Angular/TypeScript/SCSS coding standards in the repository.
5. **.agents/skills/** — transferable implementation, modification, DB-design and review workflows; use BBG-specific adaptations in .agents/BBG_AGENT_SKILLS.md.

Precedence:

1. Latest explicit BBG project-owner decision.
2. Existing BBG code/API/schema behaviour for modification tasks.
3. Approved BBG requirements and architecture.
4. BBG coding standards and database design.
5. Transferable agent workflow guidance.
6. General engineering convention.

If a conflict remains, document it and request a decision; do not silently reconcile.

---

**End of BBG Master UI, Backend & Database Requirements.**
