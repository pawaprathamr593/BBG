# BBG — BCF-Inspired UI/UX Adaptation Specification
**Document:** `BBG_BCF_Inspired_UI_UX_Adaptation_Specification.md`  
**Version:** 1.0  
**Date:** 24 November 2026  
**Status:** Analysis-first design and implementation brief  
**Product:** BBG — Business Management & Marketplace Platform  
**Frontend:** Angular 22 / TypeScript  
**Backend integration:** Yii 3 / PHP 8.4 / MySQL 8.4  
**Visual reference:** Bavdhan Citizens Forum (BCF) parent website screenshots supplied by the project owner

---

## 1. Purpose

This specification defines how BBG may adopt the visual language of the Bavdhan Citizens Forum (BCF) parent website while remaining a distinct enterprise business-management and marketplace application.

The goal is **brand-family consistency, not a website copy**. BBG should feel visually related to BCF through its colour language, typography hierarchy, navigation treatment, cards, page banners, status indicators, spacing and theme treatment. It must retain its own information architecture, enterprise workflows, role-based access control (RBAC), tenant boundaries, marketplace journeys and operational density.

This is an **analysis-first requirement**. Antigravity must first inspect the current BBG frontend, all routes and reachable screens, the actual component catalogue, current design tokens, existing behaviours, responsive layouts, theme implementation and project skills. It must then produce a screen-by-screen adoption plan and wait for approval before changing code.

## 2. Source authority and evidence boundaries

### 2.1 Sources used

1. **BCF screenshots supplied in this conversation** — visual reference for the parent organisation's website. They show:
   - Deep forest-green header/navigation.
   - White BCF logo and tagline.
   - Rounded navigation container with yellow active navigation state.
   - Yellow primary actions and highlighted typography.
   - Deep-green image/gradient hero and page banners.
   - White metric cards with compact icons and bold figures.
   - Rounded content cards, light neutral surfaces and subtle borders/shadows.
   - Green/yellow initiative cards and status chips.
   - Light interface with a visible Night Mode control.
   - Dense content sections that retain clear hierarchy and generous separation.
2. **`frontend_architecture.md`** — proposed Angular 22 architecture, layouts, route candidates, component classifications, feature areas, security, state, testing and open decisions.
3. **`BBG_Backend_Architecture_v1.0.md`** — backend boundaries, RBAC/security implications, API contract constraints and seven logical `.agents` layers adapted to Yii 3.
4. **`BBG_Database_Design_Final_v2.0.md`** — multi-tenant domain context, current-release candidates and future-scope boundaries. It is a proposed design, not proof of live schema.
5. **`.agents` archive** — legacy/reference backend skills, rules and examples.
6. **`.agent-skills-kit.zip`** — UI, data-layer, requirement-intake and implementation workflow references originally written for another Edunova application. General workflow practices may be adapted, but BBG must not inherit Edunova-specific engines, selectors, APIs, paths, permissions or commands.

### 2.2 What has and has not been inspected

The BCF screenshots are available and are the visual source for this specification. The BBG public subdomain could not previously be inspected because the browser returned a certificate-name error and an empty server response. Therefore, this document does **not** claim that every live BBG page has been visually audited.

The BBG frontend architecture document describes proposed architecture and candidate routes; it is not proof that every listed route or component currently exists. Antigravity must verify the actual checked-out repository and current branch before treating any proposed route, feature or component as implemented.

### 2.3 Precedence rules

When sources disagree, use this order:

1. Current repository code and actual runtime behaviour on the checked-out branch.
2. Current BBG `.agent/`, `.agents/`, root `AGENTS.md`, and repository coding standards that are actually present.
3. Approved BBG architecture and database specifications.
4. This UI/UX adaptation specification.
5. BCF screenshots as visual inspiration only.
6. Generic skill-kit examples as workflow guidance only.

Do not silently resolve a product, API, data, permission, route or business-rule ambiguity. Record it as an open question.

---

## 3. Product and experience principles

1. **BCF visual family, BBG product identity.** Reuse the visual language, not BCF's civic content, navigation labels, initiative semantics or community workflows.
2. **Enterprise-first.** BBG must remain efficient for business owners, workspace members, consumers and platform administrators.
3. **Preserve approved screens.** Treat the existing approved Public Marketplace Landing Page, Product Catalogue — Table View and Product Catalogue — Grid View as visual/functional benchmarks. Do not regress or casually redesign them; propose any necessary alignment changes explicitly.
4. **Preserve working behaviour.** UI redesign must not remove or alter existing actions, filters, validation, routes, API calls, RBAC, tenant scoping, uploads, state transitions or responsive behaviour.
5. **Role-aware, not role-forked.** Prefer shared components configured by permissions and context. Do not create duplicate pages solely for different roles when one permission-aware page is appropriate.
6. **Progressive disclosure.** Show the summary and primary action first; reveal secondary details in tabs, drawers, dialogs or detail routes where suitable.
7. **Consistency over decoration.** Avoid excessive gradients, glow, animation, ornamental shapes and oversized hero sections inside operational screens.
8. **Accessible by default.** Keyboard operation, visible focus, readable contrast, semantic structure, labelled controls and accessible icon-only actions are required.
9. **Responsive by design.** Desktop density must not be achieved by making mobile unusable. Do not rely on hover-only interactions.
10. **Data truth.** Do not invent metrics, counts, badges, ratings, activity, status, sample records or chart data to make a screen look populated.

---

## 4. BCF visual reference analysis

### 4.1 Brand expression

The screenshots communicate:
- A strong dark-green brand foundation.
- Warm yellow for active states, important highlights and primary actions.
- White and soft neutral surfaces for content.
- Teal/blue/purple used sparingly for semantic metric/icon differentiation.
- Bold, high-contrast headings and compact uppercase eyebrow labels.
- Rounded corners and pill-shaped badges/actions.
- A clear contrast between dark hero/banner regions and light content regions.

### 4.2 Provisional design tokens

These values are **starting proposals inferred from screenshots**, not extracted official brand tokens. Antigravity must inspect the current BBG theme and existing CSS variables, sample the supplied reference assets if available, and validate contrast before finalising them.

| Token | Proposed value | Intended use |
|---|---:|---|
| `--bbg-brand-900` | `#174D35` | Primary dark green / brand header |
| `--bbg-brand-800` | `#1D5A40` | Hover/secondary green surfaces |
| `--bbg-brand-700` | `#287052` | Secondary emphasis |
| `--bbg-accent-500` | `#F2D323` | Yellow primary action / active state |
| `--bbg-accent-600` | `#D9B900` | Hover/pressed yellow |
| `--bbg-teal-600` | `#218C83` | Supporting accent, only where meaningful |
| `--bbg-surface-0` | `#FFFFFF` | Cards and elevated surfaces |
| `--bbg-surface-50` | `#F5F7F5` | Main light canvas |
| `--bbg-surface-100` | `#EDF1EE` | Muted panels |
| `--bbg-text-900` | `#18211C` | Main text |
| `--bbg-text-600` | `#5E6962` | Secondary text |
| `--bbg-border` | `#DCE4DE` | Subtle borders |

Rules:
- Define tokens centrally; do not scatter raw hex values across feature SCSS.
- Verify text contrast for all normal, hover, disabled, selected and focus states.
- Yellow is an accent, not a general background colour for large content areas.
- Keep status colours semantic and consistent (success, warning, danger, info); do not use brand green/yellow to obscure status meaning.
- Dark theme must be designed as a complete token set, not a mechanical inversion. Ensure cards, tables, overlays, menus, inputs, charts, borders and text remain readable.
- If current BBG design tokens already exist, map them to the proposed palette rather than creating a parallel token system.

### 4.3 Typography

- Retain the existing BBG font family if it is already approved and consistently applied.
- Establish a clear hierarchy: page title, section title, card title, body, helper text, metadata.
- Use bold headings and compact eyebrow labels selectively, as in BCF.
- Avoid excessive all-caps text in operational labels.
- Use tabular numerals for monetary values, quantities, dates and dashboard metrics where supported.
- Do not introduce a new external font/CDN dependency without approval.

### 4.4 Shape, spacing and elevation

- Use a consistent radius scale for cards, inputs, menus, dialogs and badges.
- Use subtle borders and low-elevation shadows; avoid stacking multiple shadows.
- Use consistent spacing tokens and a predictable page content width.
- Use pill shapes mainly for compact status/filters/actions, not every control.
- Keep operational content visually compact enough for real work while preserving whitespace between major regions.

---

## 5. BBG shell and navigation adaptation

### 5.1 Shared application shell

Inspect the actual BBG shells and determine whether separate shells already exist for public marketplace, authentication, consumer, entrepreneur/business, workspace and platform administration. Preserve domain boundaries.

Recommended visual adaptation:
- Brand area at the left, using a **BBG-specific identity**. Do not reuse the BCF logo as the BBG product logo unless the owner explicitly approves it.
- Deep-green navigation/header foundation, with accessible contrast.
- Yellow active/selected indicator used consistently but not excessively.
- Clear account/profile, notifications and theme controls.
- Consistent breadcrumb/page-title placement where appropriate.
- Responsive navigation that becomes a compact menu/drawer on small screens.
- Enterprise workspace may retain its existing collapsible sidebar if that is the established application-shell decision. Do not replace it with the BCF public horizontal navigation merely to look similar.
- Public marketplace may use a horizontal navigation pattern if it matches the existing information architecture.

### 5.2 Navigation behaviour

- Active route and expanded group must be visually distinct.
- Dropdowns must support pointer, keyboard and touch.
- Menus must not close when focus moves into their content.
- Escape closes overlays; outside click closes transient menus where appropriate.
- Do not rely on hover as the only way to open a menu.
- Keep navigation items permission-aware, but treat server authorization as authoritative.
- Preserve all existing routes and route guards unless an approved route change is documented.

### 5.3 Domain separation

Keep these areas visually related but functionally separate:
- Public Marketplace.
- Consumer account.
- Entrepreneur/business account.
- Business Workspace (tenant-private).
- Platform Administration.
- Authentication and account flows.

Do not expose tenant-private workspace navigation or data in public/consumer shells. Do not treat role/persona switching as an authorization mechanism.

---

## 6. Page composition patterns

### 6.1 Page header / banner

Use BCF-inspired dark-green page banners selectively for:
- Public landing hero.
- Marketplace category or campaign landing pages.
- Workspace/module overview pages where a contextual banner adds value.
- Important administration overview pages only if it does not waste vertical space.

Pattern:
1. Optional eyebrow/category label.
2. Page title and concise supporting sentence.
3. Contextual primary action.
4. Optional count/status chip only when backed by actual data.
5. Optional subtle illustration or approved image with restrained green overlay.

Do not put a large hero on every CRUD/list/detail screen. Most operational pages should use a compact title row, breadcrumb and actions.

### 6.2 Dashboard summary cards

Adopt BCF metric-card styling for:
- Workspace KPIs.
- Marketplace/business summary metrics.
- Order/payment/subscription summary.
- Admin overview metrics.

Rules:
- Metrics must be sourced from real API/state data.
- Label, value, unit and comparison period must be unambiguous.
- Use icon containers consistently.
- Avoid arbitrary multi-colour icon decoration.
- Clicking a metric is allowed only if the destination/drill-down is meaningful and implemented.
- Responsive layout: 4/3/2/1 columns according to available width and content.

### 6.3 Cards and grids

- Use consistent card anatomy: optional media/header, title, supporting metadata, body, status and action area.
- Align card heights within a grid where practical.
- Keep primary actions prominent and secondary actions visually quiet.
- Avoid multiple competing full-width primary buttons in one card.
- Do not reproduce BCF civic initiative card content or volunteer controls.
- Product and business cards must preserve their existing data, pricing, media, stock/availability and permission behaviours.
- Use image aspect ratios appropriate to each entity and avoid layout shifts while images load.

### 6.4 Tables and list pages

- Retain enterprise data density and existing table capabilities.
- Apply brand styling to header rows, selected rows, filters, pagination, action menus and status chips without sacrificing readability.
- Keep sorting, filtering, pagination, selection, export and row actions intact.
- Use responsive table-to-card or controlled horizontal-scroll behaviour according to the actual component and dataset.
- Do not replace a working table with a decorative card grid merely to imitate the parent site.
- Show loading, no-data, no-results, error and permission-denied states distinctly.

### 6.5 Forms and drawers

- Use consistent labels, helper text, required markers, validation messages and focus states.
- Group fields into meaningful sections.
- Use one-column mobile forms and appropriate multi-column desktop layouts.
- Keep submit/cancel actions predictable and visible.
- For complex create/edit workflows, prefer the established drawer/dialog/page pattern in BBG rather than inventing a new interaction.
- Preserve form validation, upload limits, dirty-state handling, confirmation and API behaviour.

### 6.6 Detail pages

- Establish a strong title/identity section.
- Present lifecycle/status and primary actions near the title.
- Use tabs/sections for secondary detail only where the existing workflow supports them.
- Keep audit/history, media, comments, payment proof and related records clearly separated.
- Never hide permission-sensitive actions only through styling; use the existing permission-aware implementation and backend checks.

---

## 7. Feature-area adaptation guidance

The list below is a review checklist, not confirmation that every route exists or belongs to the current release. Antigravity must map actual routes and screens to these areas and mark absent, proposed, out-of-scope and future-scope items accurately.

| BBG area | BCF visual elements to consider | BBG-specific constraints |
|---|---|---|
| Public Marketplace landing | Hero/banner, yellow CTA, metric cards, category tiles, featured cards | Preserve marketplace discovery, real business/product content, SEO/public access and current approved landing page |
| Business directory | Search panel, filter chips, consistent cards, compact status labels | Preserve filters, sorting, pagination, public visibility and tenant-safe data |
| Business storefront | Branded banner, business summary, product/promotion sections | Keep business-specific branding/content and public/private field rules |
| Product catalogue — table | Green/yellow accents, restrained surfaces, consistent badges | Preserve approved table view, density, column behaviour, filters, sorting, actions and permissions |
| Product catalogue — grid | BCF card rhythm, media, typography, status pills | Preserve approved grid view and parity with table view |
| Product detail | Strong title, media region, metadata cards, clear CTA | Preserve variants, price, availability, enquiry/order behaviour and public visibility |
| Promotion feed/detail | Consistent media cards, status chips, clear engagement controls | Preserve post detail, media, likes/comments/share/report/bookmark behaviour; do not introduce civic-style actions |
| Business onboarding | Green section headers, progress/status presentation, clear forms | Preserve actual verification, document upload, validation and approval workflow |
| Subscription/plan management | Summary cards, tier/status badges, clear payment action | Preserve entitlement rules, renewal/upgrade flow, proof upload/review and server-side locking |
| Consumer account | Consistent account shell, order/enquiry summary cards | Keep consumer data private and separate from tenant workspace |
| Workspace dashboard | Compact KPI cards, dark-green compact banner, structured modules | Preserve tenant selector/context, collapsible sidebar, role-aware navigation and workspace RBAC |
| Workspace catalogue/customers/sales | Table/card patterns and consistent forms | Preserve tenant isolation, server-side pagination/filtering, business workflows and permissions |
| Orders/payments/invoices | Status timeline, summary cards, detail panels | Preserve financial correctness, immutable/posted records, audit/history and transactional workflows |
| Platform administration | Consistent shell, compact page banners, metric cards | Keep separate privilege domain; do not conflate platform admin with tenant roles |
| Reports/analytics | KPI → trends → detail hierarchy | Use actual API metrics; ensure charts remain legible and accessible in both themes |
| Settings/profile | Consistent forms, compact panels | Preserve account, tenant and security boundaries |

### 7.1 Explicitly excluded from visual transplantation

Do not copy:
- BCF civic initiatives, civic complaint categories, volunteer flows or resident-specific language.
- BCF's exact navigation structure or route names.
- BCF statistics or sample counts.
- BCF imagery, photography, logo or content as BBG assets.
- Community-specific authority/department status semantics.
- BCF-specific account names, profile data or screenshot text.

---

## 8. Design system and reusable Angular components

### 8.1 First inspect, then standardise

Before creating or modifying shared components:
1. Inspect the actual Angular workspace and shared component folders.
2. Generate or inspect the current component catalogue using only scripts that exist in this repository.
3. Search for equivalent components and patterns.
4. Review the three approved benchmark screens.
5. Map each screen region to an existing component, a safe extension or a genuinely new reusable component.
6. Produce a component mapping table before implementation.

### 8.2 Suggested shared component responsibilities

These are conceptual candidates; use existing BBG components where possible:
- Application header / public header / workspace shell / admin shell.
- Sidebar, responsive navigation, breadcrumbs and account menu.
- Page heading/banner.
- KPI/stat card.
- Status badge and category chip.
- Search and filter bar.
- Data table wrapper and responsive list pattern.
- Product card, business card and promotion card.
- Empty, loading, error and permission-denied states.
- Confirmation dialog and standard drawer.
- File/media uploader.
- Form field and validation presentation.
- Toast/notification presentation.

### 8.3 Component rules

- Standalone Angular components where consistent with the existing Angular 22 codebase.
- Strongly typed inputs/outputs; no `any` in new code.
- Presentational/shared components must not call APIs, own domain business logic, bypass permissions or duplicate navigation.
- Smart/container components or feature stores own data loading, orchestration, navigation and permission-aware actions.
- Keep components small and focused; split genuinely reusable visual units.
- Use the existing UI library and component conventions. Do not introduce PrimeNG, Material, Tailwind, a chart library or another dependency unless already present or explicitly approved.
- Avoid `::ng-deep`, broad global selectors and `!important` unless the existing project has a documented justified exception.
- Use CSS variables/design tokens for themeable colours, surfaces, borders, radii and spacing.
- Do not create duplicate components that differ only by role or colour.

---

## 9. Responsive design requirements

Validate at minimum:
- 360–390 px mobile.
- 576 px small tablet/large phone.
- 768 px tablet.
- 992 px compact desktop.
- 1280 px desktop.
- 1440 px wide desktop.
- 1920 px large display.

Requirements:
- No unintended horizontal page overflow.
- Primary action remains discoverable and reachable.
- Touch targets should be at least 40 × 40 CSS px where practical.
- No hover-only controls.
- Navigation, dropdowns, drawers, dialogs and tables must work with touch and keyboard.
- KPI grids collapse gracefully.
- Card layouts become one column on narrow screens where appropriate.
- Dense tables use a deliberate responsive strategy: priority columns, horizontal scrolling, row cards or detail drawer.
- Forms stack vertically on mobile.
- Text must not clip, overlap or become unreadably small.
- Sticky elements must not cover content or focus targets.

---

## 10. Light and dark themes

Both themes are required for all redesigned surfaces if theme support exists in the current BBG application.

Audit:
- Header and navigation.
- Sidebar and active states.
- Page canvas and banner.
- Cards, tables, list rows and hover/selected states.
- Inputs, selects, date pickers and validation.
- Menus, popovers, dialogs and drawers.
- Charts and data visualisations.
- Status badges and disabled controls.
- Focus indicators, borders, dividers and shadows.
- Images/media overlays and skeletons.

Rules:
- Use central theme tokens and existing theme-switching mechanism.
- Do not hardcode light-only colours in component styles.
- Do not implement a second theme service if one already exists.
- Preserve theme preference behaviour already implemented.
- Check contrast and colour meaning independently in both themes.

---

## 11. RBAC, tenancy and security preservation

A visual redesign must not weaken BBG's security model.

- Backend authorization remains authoritative.
- Angular route guards, menus and hidden/disabled buttons are usability controls, not security boundaries.
- Preserve the existing permission matrix and exact permission keys; do not invent new permission identifiers.
- Preserve separate platform-admin and tenant/workspace privilege domains.
- Tenant context must come from the trusted authenticated context and verified membership, not merely a client-supplied tenant ID.
- Keep public storefront routes separate from authenticated tenant workspace routes.
- Do not leak private workspace data into public marketplace pages, browser caches or shared client state.
- Do not expose tokens, secrets, internal diagnostics or raw backend exceptions in the UI.
- Preserve access-token-in-memory and rotating refresh-token-cookie direction documented by BBG backend architecture; do not change authentication behaviour during visual work.
- Verify permission-sensitive controls for each relevant role and test direct URL/API access where applicable.

---

## 12. Architecture and backend integration constraints

### 12.1 Frontend architecture

Use the actual repository's architecture. The supplied frontend architecture proposes:
- Angular 22 and TypeScript.
- Standalone components.
- Feature-first lazy routes.
- Smart/container and typed presentational component separation.
- Signals for synchronous state and RxJS for asynchronous composition.
- Typed Reactive Forms.
- Functional interceptors and guards.
- Shared API abstraction and feature-scoped services/stores.
- Server-side filtering, sorting and pagination.
- Public routes separated from authenticated tenant workspace routes.

These are proposed architectural decisions and must be reconciled with the current codebase before implementation.

### 12.2 Backend architecture

When a UI task requires backend changes, preserve the BBG logical layer separation adapted to Yii 3:
1. InDto.
2. Controller.
3. Versioned Services.
4. Core Services.
5. DAO.
6. Model — legacy/reference only unless current Yii 3 code explicitly establishes otherwise.
7. Utils.

Core Services own validation, authorization, tenant checks, business rules and transaction boundaries. DAO performs parameterized persistence operations and does not own business workflows or transactions.

Preserve the `$resArr` contract in DAO/Core Services:
- `status`: `SUCCESS`, `FAILED` or `EXCEPTION`.
- `msgArr`: flat list of diagnostic/message strings.
- `data`: result payload; empty array for failure/exception.

Do not change API response contracts, route names, methods, payload fields, status mapping or pagination shape as part of a visual redesign unless explicitly approved.

### 12.3 Database and release scope

- The supplied database design describes 68 tables, with 52 current-release candidates and 16 future-scope inventory/purchasing tables.
- This does not prove that all tables or features are implemented or approved for the current release.
- Do not create UI, routes, APIs or workflows for future-scope inventory/purchasing solely because those tables appear in the design.
- Do not infer live schema from the proposed data dictionary.

---

## 13. Skill and instruction routing

Antigravity must inspect and follow the skill files that actually exist in the repository. The uploaded archives are reference material; they are not automatically the current repository's active instructions.

### 13.1 BBG `.agent/` skill-kit references

The uploaded skill kit contains:
- `build-ui/SKILL.md`
- `build-ui/references/ui-ux-standards.md`
- `build-ui/references/shared-component.md`
- `data-layer/SKILL.md`
- `data-layer/references/api.md`
- `data-layer/references/navigation-permissions.md`
- `data-layer/references/state.md`
- `requirement-intake/SKILL.md`
- `implement-requirement/SKILL.md`
- `review-and-release/SKILL.md`
- `edunova-context/SKILL.md` and Edunova-specific references.
- Workflow and UI catalogue scripts/examples.

**Important adaptation warning:** This kit was authored for Edunova/insync4. Reuse its general workflow principles (analysis before implementation, component reuse, requirement readiness, typed boundaries, responsive/dark UI, UI states, verification and review). Do **not** copy Edunova product assumptions or implementation details into BBG. In particular, do not assume:
- `de-*` component names or DEBI engines.
- Edunova selectors, services, stores, route files, `loginPrvJson.json`, permissions or API envelope.
- Edunova `ApiHttpService` / `CommonApiCallService`.
- Edunova-specific build/test commands or blocked scripts.
- Student/exam/institute-specific UX or data context.

Only run a script after verifying it exists and is compatible with the BBG repository.

### 13.2 `.agents/` backend references

The uploaded `.agents` archive contains:
- `skills/new-dev/SKILL.md`
- `skills/new-dev/Rules.md`
- `skills/new-dev/resources/Architecture.md`
- `skills/new-dev/examples/`
- `skills/modify/SKILL.md`
- `skills/modify/Rules.md`
- `skills/modify/resources/Architecture.md`
- `skills/modify/examples/`
- `skills/db-design/SKILL.md`

Use the BBG backend architecture document to adapt these references to Yii 3/PHP 8.4. Legacy Yii 1.1 examples are structural references only; do not mechanically copy obsolete APIs or SQL patterns.

### 13.3 Skill routing matrix

| Work type | Required skill/reference |
|---|---|
| Any codebase analysis | Current root `AGENTS.md`, `.agent/`, `.agents/`, actual architecture docs and nearest sibling implementation |
| UI/screen/layout/style | Current BBG UI skill if present; otherwise adapt general practices from `build-ui` and this specification |
| Shared Angular component | Current BBG component conventions; adapt shared-component guidance without Edunova naming |
| API/service/model/store | Current BBG frontend data-layer rules and actual API contract |
| Route/navigation/RBAC | Actual BBG route/permission implementation and backend authority |
| Yii 3 backend change | `.agents` new-dev/modify references adapted to Yii 3; BBG backend architecture |
| Requirement readiness | Adapt requirement-intake checklist: roles, scope, flow, screens, APIs, permissions, states, responsive and acceptance criteria |
| Implementation | Analyse → plan → approval → implement → verify; use actual BBG commands |
| Review/release | Review changed files, tests, build, accessibility, responsive behaviour and regression evidence |

---

## 14. Required analysis phase — before any code change

Antigravity must complete the following and provide a report.

### 14.1 Repository safety and context

1. Confirm repository root and current branch.
2. Read root `AGENTS.md` and all relevant instructions under `.agent/` and `.agents/`.
3. Identify actual frontend/backend folders, package manager, Angular version, build/test/lint commands and installed UI libraries.
4. Inspect Git status, including staged, unstaged and untracked files.
5. Do not reset, clean, stash, checkout, switch branches, merge, rebase, commit, push or discard any work.
6. Do not overwrite or reformat unrelated user changes.

### 14.2 Full UI inventory

1. Enumerate all actual Angular routes, lazy modules/features and layouts.
2. Map routes to screens and identify public, consumer, entrepreneur, workspace and platform-admin domains.
3. Inspect every reachable screen, including nested detail pages, create/edit forms, drawers, dialogs, dropdowns, tables, cards and responsive navigation.
4. Identify screens that are implemented, partially implemented, placeholders, inaccessible, feature-flagged or absent.
5. Inspect both light and dark theme implementations.
6. Inspect responsive behaviour at the widths in Section 9.
7. Inspect shared components and identify duplicates or inconsistent patterns.
8. Identify loading, empty, error, permission-denied, success and destructive-confirmation states.
9. Inspect actual RBAC wiring and confirm the visual controls do not bypass it.
10. Inspect current approved benchmark screens and record any proposed changes separately.

### 14.3 Component and design-system inventory

Record:
- Existing colour, typography, spacing, radius, shadow and breakpoint tokens.
- Theme service/toggle and persistence mechanism.
- Existing header/sidebar/footer/breadcrumb/page-header components.
- Existing cards, badges, buttons, inputs, dialogs, drawers, tables, filters, charts and uploaders.
- Existing UI library and version.
- Component reuse opportunities and duplicated implementations.
- Accessibility and responsive issues.

### 14.4 Screen-by-screen comparison

For each screen, produce:
- Route and user role(s).
- Current purpose and current UI pattern.
- Existing functionality that must be preserved.
- Current design strengths/issues.
- BCF visual elements that can be adopted.
- BCF visual elements that should not be adopted.
- Proposed layout and component reuse.
- Light/dark changes.
- Responsive changes.
- RBAC/data/security risks.
- Dependencies and open questions.
- Acceptance criteria.

### 14.5 Analysis deliverables

Create an analysis report before implementation:
`docs/reports/BBG_BCF_UI_UX_ADOPTION_ANALYSIS.md`

The report must include:
1. Executive summary.
2. Repository/branch and instruction files inspected.
3. Actual route and screen inventory.
4. Existing design system and component inventory.
5. Existing functionality preservation matrix.
6. Screen-by-screen BCF adaptation matrix.
7. Proposed design tokens and contrast findings.
8. Responsive and dark-theme findings.
9. RBAC/tenant/security regression risks.
10. Component reuse/mapping table.
11. Prioritised recommendations (P0/P1/P2).
12. Open questions and decisions requiring owner approval.
13. Proposed implementation phases and verification plan.

**Stop after the analysis report and present the proposed plan for approval. Do not implement the redesign until the project owner approves the plan.**

---

## 15. Implementation phase — only after approval

When approved:
1. Establish central design tokens and theme mapping first.
2. Update the shared shell and navigation without changing route/security behaviour.
3. Update shared primitives and page composition patterns.
4. Migrate screens in small, coherent feature batches.
5. Preserve each screen's API calls, state, forms, permissions, routes and business workflows.
6. Update mobile and dark-theme layouts alongside the desktop/light version.
7. Add or update component tests for changed shared components.
8. Add/adjust screen tests for primary interactions and role visibility.
9. Run the actual repository's lint, type-check, tests and production/development builds.
10. Perform manual responsive and accessibility checks.
11. Review the final diff for accidental functionality changes.

### 15.1 Prioritisation

- **P0:** Broken navigation, inaccessible controls, contrast failures, RBAC/security regression, responsive overflow, loss of existing functionality.
- **P1:** Shared shell, design tokens, typography, common buttons/cards/forms/tables, light/dark consistency.
- **P2:** Secondary animation, decorative refinements and low-impact visual polish.

### 15.2 Animation

- Use subtle transitions only where they improve feedback or navigation.
- Respect `prefers-reduced-motion`.
- Avoid continuous animation, excessive glow, parallax and motion that delays operational work.
- Never use animation as the only indication of status or interaction.

---

## 16. Acceptance criteria

The redesign is acceptable only when all applicable criteria pass.

### Visual and brand
- [ ] BBG has a recognisable visual relationship to BCF through approved green/yellow visual language.
- [ ] BBG retains a distinct product identity and does not look like a civic portal.
- [ ] Design tokens are centralised and consistently applied.
- [ ] Existing approved benchmark screens are preserved or changes are separately approved.
- [ ] No arbitrary sample metrics, fake content or decorative controls are introduced.

### Functionality
- [ ] Every existing action remains available to the same authorised users.
- [ ] Existing routes, API contracts, filters, sorting, pagination, uploads and workflows remain intact.
- [ ] Forms retain validation, dirty-state, submit, cancel and error behaviour.
- [ ] Tables retain selection, sorting, filters, pagination and row actions.
- [ ] Public, consumer, entrepreneur, workspace and admin contexts remain separate.

### RBAC and security
- [ ] No permission key or role rule is invented or weakened.
- [ ] Hidden/disabled UI actions match actual permissions.
- [ ] Backend authorization remains authoritative.
- [ ] Tenant-private data remains tenant-scoped.
- [ ] Public pages do not expose private workspace data.

### Responsive and accessibility
- [ ] No unintended overflow at 360, 375, 768, 992, 1280, 1440 and 1920 px.
- [ ] Keyboard navigation and focus indicators work.
- [ ] Icon-only buttons have accessible labels.
- [ ] Dialogs/drawers support Escape and focus management according to existing standards.
- [ ] Contrast is acceptable in light and dark themes.
- [ ] Reduced-motion preferences are respected.

### UI states and verification
- [ ] Loading, empty, no-results, error, permission-denied and success states are handled.
- [ ] Destructive actions require clear confirmation.
- [ ] Changed components and flows have appropriate tests.
- [ ] Build, lint, type-check and tests are reported with actual command/output evidence.
- [ ] No unverified check is reported as passed.

---

## 17. Required reporting format

### Analysis report

| Screen/route | Current status | Preserve | BCF adaptation | Risks | Priority |
|---|---|---|---|---|---|

### Component mapping

| Screen region | Existing component | Reuse/extend/new | Reason | Test impact |
|---|---|---|---|---|

### Implementation report

Include:
- Approved scope and deviations.
- Files created/modified.
- Design tokens changed.
- Screens completed and remaining.
- Functionality/RBAC preservation evidence.
- Responsive/theme/accessibility checks.
- Tests/build/lint/type-check commands and results.
- Known issues and unverified areas.
- Confirmation that no Git history/branch operations were performed unless explicitly requested.

---

## 18. Non-negotiable guardrails

- Analysis first; no code changes before approval.
- Current BBG code is the implementation source of truth.
- Do not assume proposed frontend routes are implemented.
- Do not copy BCF civic content or navigation.
- Do not copy Edunova-specific `.agent` implementation patterns into BBG.
- Do not mechanically copy legacy Yii 1.1 examples into Yii 3.
- Do not invent APIs, routes, DTO fields, permission keys, roles, metrics or business rules.
- Do not change backend contracts or database schema for a visual task.
- Do not remove, reset, stash, overwrite or discard user changes.
- Do not add dependencies without approval.
- Do not claim full verification without evidence.

---

## 19. Open decisions

Antigravity must identify whether these are already decided in the repository or require owner input:
1. Final BBG brand mark/logo and whether any BCF endorsement wording is required.
2. Exact approved brand token values and font family.
3. Whether the enterprise workspace shell retains its current collapsible sidebar unchanged.
4. Which screens are in the current release versus future scope.
5. Whether all user-facing domains require dark mode in the current release.
6. Approved icon library and chart library.
7. Supported browser/device matrix.
8. Which visual differences between the approved marketplace screens and the proposed palette are acceptable.
9. Any required brand/legal wording for the BCF parent-domain relationship.

Do not block the analysis report on decisions that can be clearly marked as pending. Do not implement unresolved decisions that materially affect identity, information architecture, security or business behaviour.

---

## 20. Definition of done

The task is complete when:
1. The actual BBG frontend has been inventoried and analysed.
2. The current UI and existing behaviours are documented.
3. Every applicable screen has a BCF adaptation decision.
4. Reusable components and design tokens are mapped.
5. RBAC, tenant, responsive and theme risks are documented.
6. The project owner has approved the implementation plan.
7. Approved changes are implemented and verified without regressions.
8. The analysis and implementation reports are updated with evidence.