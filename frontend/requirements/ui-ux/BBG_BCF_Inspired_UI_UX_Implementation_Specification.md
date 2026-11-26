# BBG — BCF-Inspired UI/UX Implementation Specification
**Version:** 1.0  
**Date:** 26 November 2026  
**Status:** Implementation-ready specification; execute in controlled phases  
**Repository:** `pawaprathamr593/BBG`  
**Target branch:** `feature/business-onboarding-from-workspace-base`  
**Frontend:** Angular 22, standalone components, SCSS, Signals/RxJS  
**Backend:** Yii 3 REST API  
**Primary reference:** Bavdhan Citizens Forum (BCF) website screenshots and `docs/reports/BBG_BCF_UI_UX_ADOPTION_ANALYSIS.md`

---

## 1. Implementation objective

Transform the existing BBG interface so that it visibly belongs to the BCF brand family while remaining a polished enterprise business-management and marketplace product.

This is a **visual-language adoption**, not a clone of the BCF civic website. Adopt its forest-green brand foundation, yellow accent language, strong page banners, clean white metric cards, rounded surfaces, clear typography, and calm spacing. Retain BBG's distinct product identity, information architecture, enterprise navigation, business workflows, public marketplace, tenant storefronts, RBAC, tenant isolation and existing functionality.

The supplied analysis report is the screen inventory and current-state baseline. Treat its route/component observations as an audit snapshot, not an immutable truth: verify every relevant item against the current checkout before editing.

## 2. Mandatory project context and skill instructions

### 2.1 Read active repository instructions first

Before implementation, inspect and follow the actual files in the current checkout:
- Root `AGENTS.md` and any nested instruction files.
- `.agent/` rules, skills, references and coding standards.
- `.agents/` backend skills and architecture references.
- `frontend/CODING_STANDARDS.md`, if present.
- Existing frontend/backend architecture documents.
- The analysis report: `docs/reports/BBG_BCF_UI_UX_ADOPTION_ANALYSIS.md`.
- This specification.

Do not assume an uploaded skill archive is active merely because it exists in the conversation. Repository instructions take precedence.

### 2.2 Skill routing

Use the active repository skill with the matching responsibility. If the exact skill name differs, locate the nearest equivalent and record it in the implementation report.

| Task | Required skill/reference | Application |
|---|---|---|
| UI implementation | `.agent/skills/build-ui/SKILL.md` or active equivalent | Design consistency, responsive UI, component implementation and visual states |
| UI standards | `build-ui/references/ui-ux-standards.md` | Typography, spacing, colour, contrast, interaction and responsive standards |
| Shared components | `build-ui/references/shared-component.md` | Reuse existing primitives; avoid duplicated UI components |
| Data/API integration | `.agent/skills/data-layer/SKILL.md` or active equivalent | Preserve typed API boundaries and async state handling |
| API contracts | `data-layer/references/api.md` | Do not change endpoint, payload or response contracts for visual work |
| Navigation/RBAC | `data-layer/references/navigation-permissions.md` | Preserve route guards, permission checks and domain separation |
| State management | `data-layer/references/state.md` | Follow current Signals/RxJS/store conventions |
| Requirement interpretation | `requirement-intake/SKILL.md` or equivalent | Confirm scope, roles, routes, states, acceptance criteria and dependencies |
| Existing feature modification | `.agents/skills/modify/SKILL.md` | Trace existing behaviour before modifying a component |
| New shared component | `.agents/skills/new-dev/SKILL.md` | Follow current architecture and examples, adapted to Yii 3 where relevant |
| Database design | `.agents/skills/db-design/SKILL.md` | Not in scope; use only if a separately approved schema change is requested |
| Review and release | `review-and-release/SKILL.md` or active equivalent | Regression review, build/test evidence and final report |

**Skill-kit warning:** General workflow practices from the uploaded Edunova/insync4 skill kit may be reused, but do not import Edunova-specific component prefixes, engines, selectors, APIs, routes, permissions, service names, scripts or domain assumptions. Legacy Yii 1.1 examples in `.agents` are reference-only; BBG backend architecture is Yii 3. This UI task should normally require no backend or database changes.

## 3. Non-negotiable guardrails

1. Preserve all existing working behaviour and current user changes.
2. Do not run destructive Git operations: no reset, clean, stash, restore, checkout, branch switch, merge or rebase.
3. Do not commit or push unless explicitly requested by the owner.
4. Do not alter API endpoints, methods, DTOs, payloads, response envelopes, pagination contracts or backend business rules.
5. Do not change database schema or seed data.
6. Do not invent routes, screens, roles, permission keys, data, statistics or statuses.
7. Do not remove existing controls or actions to simplify the design.
8. Do not introduce dependencies or UI frameworks without explicit approval.
9. Do not duplicate an existing shared component; extend/reuse it when appropriate.
10. Keep changes focused and incremental. Run checks after each phase.
11. If an existing feature is broken before the change, document it separately; do not silently attribute it to the redesign.
12. If an implementation detail is ambiguous or would change product behaviour, stop and ask for approval.

## 4. Design direction and token system

### 4.1 Brand language

- Primary identity: deep forest green.
- Accent: warm saffron/yellow.
- Supporting accent: restrained teal where it has a clear semantic/design purpose.
- Light surfaces: white and soft organic neutral.
- Dark surfaces: forest-charcoal, not flat pure black.
- Typography: clear hierarchy, strong page titles, compact metadata and readable body text.
- Geometry: consistent rounded cards and pill badges; subtle borders and elevation.
- Motion: short, restrained transitions; respect reduced-motion preferences.

### 4.2 Starting token values

The following values are the analysis report's proposed starting point. Inspect existing tokens and verify contrast before applying. Do not create a second token system if equivalent tokens already exist.

| Token | Light value | Purpose |
|---|---|---|
| `--bbg-brand-900` | `#0B3020` | Hero/deep brand |
| `--bbg-brand-primary` | `#174D35` | Main forest green |
| `--bbg-brand-primary-hover` | `#123F2C` | Hover |
| `--bbg-brand-primary-soft` | `#E8F1EB` | Soft selected surface |
| `--bbg-brand-accent` | `#F5D928` | Yellow CTA/highlight |
| `--bbg-brand-accent-hover` | `#E0C51F` | Yellow hover |
| `--bbg-brand-accent-soft` | `#FEF9E7` | Yellow tint |
| `--bbg-surface-page` | `#F5F7F5` | Page canvas |
| `--bbg-surface-header` | `#174D35` | Public header |
| `--bbg-surface-sidebar` | `#FFFFFF` | Light sidebar |
| `--bbg-surface-card` | `#FFFFFF` | Card |
| `--bbg-surface-subtle` | `#EDF1EE` | Muted section |
| `--bbg-text-primary` | `#141C17` | Main text |
| `--bbg-text-secondary` | `#4A574F` | Secondary text |
| `--bbg-text-muted` | `#6B7A71` | Metadata |
| `--bbg-text-inverse` | `#FFFFFF` | Text on green |
| `--bbg-border-default` | `#DCE4DE` | Border |
| `--bbg-border-focus` | `#174D35` | Focus (verify contrast) |
| `--bbg-radius-sm/md/lg/xl/full` | `6/8/12/16/9999px` | Shape scale |

Dark theme starting surfaces from the analysis:
- Page: `#0B140E`
- Header: `#070D0A`
- Sidebar: `#0F1812`
- Card: `#122018`
- Subtle: `#17241D`
- Elevated: `#1A2921`
- Input: `#111A14`
- Text primary: `#F0FDF4`
- Text secondary: `#94A39B`
- Border: `#1E2E25`

Do not mechanically invert colours. Preserve semantic tokens across themes:
- Success remains green/emerald.
- Warning remains amber.
- Danger remains red/coral.
- Info remains an accessible blue/teal.
- Yellow is a brand accent, not the success colour.

### 4.3 Contrast and controls

- Yellow backgrounds must use dark/black foreground text and icons; never white text on yellow.
- Validate actual contrast ratios for normal text, large text, icons, disabled states, hover, selected and focus states.
- Do not use `!important` as the normal enforcement mechanism; use component variants and token contracts.
- Provide clear `:focus-visible` indicators.
- Interactive touch targets should be approximately 44×44 CSS px where practical.
- Icon-only actions require accessible names/tooltips.
- Status must not be communicated by colour alone.

## 5. Scope and screen-by-screen implementation

The following inventory is taken from the supplied 26-screen analysis. Reconfirm route/component names before editing. Do not create missing screens merely because they appear here.

### Phase 1 — Design tokens and theme foundation (P0)

**Target:** central styles and existing theme service.

Tasks:
1. Inspect `frontend/src/styles.scss`, current CSS variables, theme service, theme persistence and all theme-specific component overrides.
2. Consolidate the BCF palette into the existing token architecture.
3. Replace pure-black light/dark surfaces with layered forest-charcoal surfaces where appropriate.
4. Correct the dark-theme semantic bug reported in the analysis: success must not be mapped to the yellow brand accent.
5. Define button foreground tokens for green and yellow variants.
6. Standardise radius, border and shadow tokens.
7. Ensure existing `data-theme` and `bbg.theme` preference behaviour remains unchanged.
8. Search for hardcoded old surface/brand colours in components; migrate only where the token mapping is clear.
9. Avoid a massive global selector override. Keep styles predictable and component-scoped.
10. Check SCSS component budgets and avoid increasing budgets just to hide oversized styles.

Acceptance:
- Both themes render consistently.
- Existing theme switch/persistence/system preference works.
- Semantic success/warning/danger meanings remain distinct.
- No new component style budget violation.
- No unrelated global styling regression.

### Phase 2 — Public application shell and navigation (P0)

**Target:** public host/header styles and templates (analysis identifies `app.html` / `app.scss`; verify actual file paths).

Tasks:
1. Change public topbar to a deep forest-green surface.
2. Use white logo/brand text and accessible navigation text.
3. Use yellow pill/underline treatment for the active route, with dark foreground text on yellow.
4. Preserve existing logo/brand asset unless a BBG-specific approved asset is available.
5. Do not replace the BBG logo with the BCF logo.
6. Preserve existing auth popup/trigger, login/register, account menu, theme toggle and route links.
7. Make mobile navigation touch-friendly and keyboard accessible.
8. Preserve separate workspace shell and collapsible sidebar; do not force the public horizontal nav pattern into the workspace.
9. Check sticky/fixed header behaviour and ensure it does not obscure page anchors or focus targets.

Acceptance:
- All existing navigation links resolve to the same routes.
- Active state follows router state.
- Mobile menu supports touch and keyboard.
- Theme toggle and account controls still work.
- No public/private navigation leakage.

### Phase 3 — Shared components and page banner (P1)

**Reuse first:** analysis identifies existing `MetricCard`, `BusinessCard`, `ProductCard`, `PromotionCard`, `FilterDrawer`, `StatusBadge`, `Pagination`, `SkeletonLoader` and `EmptyState`. Confirm actual selectors and paths.

Tasks:
1. Reuse and polish existing metric cards with consistent icon containers, tabular figures and elevation.
2. Preserve business/product/promotion card data contracts, action outputs and existing behaviour.
3. Standardise badge shape, padding and semantic colours without changing status values.
4. Align filter drawer buttons, inputs, headings and footer actions with shared tokens.
5. Introduce a reusable `PageBannerComponent` only if no existing component provides the same responsibility.
6. Banner should support typed title, optional eyebrow, description, optional action slot/content and optional real-data summary chips.
7. Do not couple the shared banner to API calls, route navigation or feature-specific business logic.
8. Use compact variant for workspace pages; full hero variant only for public discovery/landing pages.
9. Keep component styles lean and under current SCSS budgets.

Acceptance:
- No duplicate component for an existing responsibility.
- Existing cards retain their data, action and accessibility contracts.
- Banner is reusable and responsive.
- Shared components pass their existing tests plus relevant new tests.

### Phase 4 — Public marketplace and discovery (P1)

**Routes in analysis snapshot:** `/`, `/businesses`, `/products`, `/promotions`, `/promotions/:id`, `/about`, and placeholder/detail routes. Verify current route tree.

Tasks:
1. Preserve the Marketplace Home as a benchmark. Make only approved token/consistency refinements.
2. Apply consistent compact dark-green page banners to business and product directory pages.
3. Apply a restrained banner to promotion feed; keep content cards focused on promotions and engagement.
4. Align About page sections with BCF brand language without importing civic copy.
5. Keep search, filter, category selection, sorting, pagination, empty/error/loading states and SEO metadata intact.
6. Preserve promotion detail navigation, media, likes, comments, bookmark/share/report interactions and their current event behaviour.
7. Do not introduce fake stats, testimonials, businesses, products or promotions.
8. Ensure public content visibility follows existing API response and moderation rules.

Acceptance:
- Discovery pages feel like one family with the marketplace home.
- Search and filters work exactly as before.
- Promotion engagement actions remain independent and correct.
- Public pages expose no private tenant/workspace data.

### Phase 5 — Storefront experience (P1)

**Routes in analysis snapshot:** `/store/:slug`, products, product detail, about, contact and login.

Tasks:
1. Keep merchant cover image, logo, colours and custom branding authoritative.
2. Add subtle BBG/BCF visual family cues in shared chrome, not by overriding merchant branding.
3. If a “Storefront powered by BBG” attribution is already approved, style it unobtrusively; otherwise do not add new endorsement copy without owner approval.
4. Refine product price/availability card and stock badges using semantic status colours.
5. Preserve missing-price/contact-business behaviour and WhatsApp enquiry content.
6. Preserve product image zoom-lens calculations and interactions.
7. Preserve storefront login and route boundaries.
8. Verify long business names, missing logos, missing cover images and mobile layouts.

Acceptance:
- Merchant brand is not overridden by platform brand.
- WhatsApp enquiry and price-request behaviour is unchanged.
- Image zoom works with mouse, touch and keyboard-accessible alternatives where applicable.
- Storefront remains responsive.

### Phase 6 — Onboarding and authenticated workspace (P1)

**Routes in analysis snapshot:** invitation acceptance, business registration, business list, dashboard, catalogue, dashboard modules, subscriptions and storefront management.

Tasks:
1. Merchant onboarding: retain three-step reactive form, uploads, validation and subscription selector. Apply green brand panel, clear progress states and yellow milestone accents without changing validation/dirty state.
2. Business workspace list: use compact banner and consistent white business cards; prevent mobile overflow.
3. Executive dashboard: use compact green overview banner and white KPI cards; preserve current two-column information density and operational widgets.
4. Catalogue table and grid are **P0 preservation benchmarks**:
   - Do not change table column calculations, column chooser, sorting, pagination, filters, row actions or horizontal-scroll logic.
   - Do not change grid card data/action behaviour or create/edit drawer.
   - Only apply low-risk token, badge, border and surface refinements after visual comparison.
5. Dashboard submodules: standardise compact page heading, module surface, form controls and status pills. Preserve each module's unique controls and permission hooks.
6. Subscription management: preserve plan filtering, drawer, proof upload, verified/locked state, renewal and upgrade workflows. Keep component SCSS under the existing 25 kB error budget; refactor duplicated styles rather than raising the budget by default.
7. Storefront management: preserve all existing configuration and upload workflows.
8. Do not redesign role-specific menus by guessing; read actual permission implementation.

Acceptance:
- Workspace sidebar remains collapsible and role-aware.
- All existing module actions and permissions remain intact.
- Catalogue benchmark behaviour is unchanged.
- Subscription/payment workflows remain unchanged.
- Onboarding form and uploads remain functional.
- No tenant context or isolation regression.

### Phase 7 — Regression, accessibility and release verification (P0)

Run the actual scripts defined by the current package manifests and CI. The analysis report mentions Vitest, Angular build, Codeception and a 25 kB component style budget. Verify current commands rather than assuming all counts remain current.

Required checks:
- Angular type-check/build.
- Frontend unit tests.
- Backend tests only if backend files were touched (normally no backend changes are expected).
- Lint/format checks on changed files.
- Production build and SCSS budget.
- Route/navigation smoke test.
- Light/dark visual review.
- Responsive review at 360–390, 576, 768, 992/1024, 1280, 1440 and 1920 px.
- Keyboard-only interaction pass.
- Focus visibility, contrast, labels, dialog/drawer focus and reduced motion.
- RBAC visibility checks for relevant roles and direct-route access.
- Tenant boundary smoke checks.

Report each check as PASS, FAIL, BLOCKED or NOT RUN with command and evidence. Never report a test count from the analysis report as a current result without rerunning it.

## 6. Screen-specific preservation matrix

| Screen | Required treatment | Critical preservation |
|---|---|---|
| Marketplace home `/` | Benchmark; light token refinements only | Hero, featured content, navigation and real metrics |
| Business directory `/businesses` | Add consistent green discovery banner | Search, filters, cards, pagination |
| Product directory `/products` | Add consistent green discovery banner | Search, filters, price/availability and product actions |
| Business/product placeholder routes | Preserve actual redirect/detail semantics | Do not invent detail workflows |
| Promotion feed/detail | Brand-aligned banners/cards | Like, comments, bookmark, share, report, media and routing |
| About `/about` | Consistent brand sections | Existing content and links |
| Login/register/social callback | Brand-aligned auth surfaces | Auth flow, callback, validation, tokens and redirects |
| Storefront shell/home | Subtle platform chrome | Merchant cover/logo/brand and WhatsApp action |
| Storefront product detail | Refined price/status/contact region | Zoom lens and enquiry logic |
| Invitation acceptance | Consistent compact form shell | Invite validation and acceptance flow |
| Business onboarding | Green brand/progress panel | Stepper, form state, uploads, validation |
| Business workspace list | Compact banner and cards | Approval state, storefront links and registration action |
| Executive dashboard | Green compact banner and KPI cards | Widgets, data, module links, 2-column density |
| Catalogue table | Preserve benchmark | Column widths, chooser, sorting, pagination, row actions |
| Catalogue grid | Preserve benchmark | Cards, category chips, drawer, responsive switch |
| Workspace submodules | Standard compact page header/cards | 12-section-specific actions and permission hooks |
| Subscription management | Green/yellow plan hierarchy | Entitlements, payment proof, locking, renewal/upgrade drawer |
| Storefront management | Consistent forms/cards | Existing configuration and upload behaviour |

## 7. Angular implementation standards

- Follow current Angular 22 conventions in the repository.
- Prefer existing standalone component patterns and OnPush change detection where established.
- Use typed inputs/outputs and existing signal/RxJS patterns.
- No new `any` types.
- Keep API/data orchestration in existing feature services/stores, not visual shared components.
- Do not duplicate API calls in presentational components.
- Use existing route configuration, guards and permission utilities.
- Keep templates semantic and accessible.
- Keep styles scoped; avoid broad selectors, unnecessary `::ng-deep`, and `!important`.
- Reuse existing icon library and naming conventions.
- Do not add third-party UI libraries.
- Avoid changing public component contracts unless required and explicitly documented.
- Do not introduce artificial data to improve screenshots.

## 8. Backend, API and data constraints

This is a frontend visual implementation. No backend change is expected.

If an unexpected backend change appears necessary, stop and request approval. Any approved backend work must follow BBG's Yii 3 layer boundaries:
`InDto → Controller → Versioned Services → Core Services → DAO → Model/Utils`.

Core Services retain business validation, authorization, tenant checks, transactions and workflows. DAO remains persistence-focused. Preserve the existing `$resArr` response contract and all API semantics. Do not modify database design as part of this task.

## 9. Execution workflow

### Before each phase
1. Check Git status and current branch.
2. Read relevant skills and nearest sibling components.
3. Identify affected routes, components, APIs, permission checks and tests.
4. Write a concise phase plan with files likely to change.
5. Confirm there are no overlapping uncommitted changes that would be overwritten.

### During each phase
1. Make small, coherent changes.
2. Reuse components/tokens.
3. Keep functionality unchanged.
4. Run focused tests/build checks.
5. Inspect light and dark states.
6. Review the diff for unrelated edits.

### After each phase
1. Report changed files and rationale.
2. Report tests/build results.
3. List known issues and follow-up items.
4. Stop if a critical regression occurs; fix it before continuing.

Do not combine all seven phases into one large unreviewable change. The owner may approve the whole roadmap, but execution must still be incremental with validation gates.

## 10. Acceptance criteria

### Brand and visual quality
- [ ] BBG has an unmistakable BCF brand-family relationship.
- [ ] BBG remains an enterprise SaaS/marketplace product, not a civic portal clone.
- [ ] Forest-green and yellow tokens are centralised.
- [ ] Yellow CTA foreground is dark and contrast-verified.
- [ ] Light and dark themes have coherent surfaces and semantic statuses.
- [ ] Public discovery pages have consistent visual hierarchy.
- [ ] Workspace pages remain compact and operational.
- [ ] Merchant storefront branding is respected.

### Functional integrity
- [ ] All existing routes and navigation work.
- [ ] All search/filter/sort/pagination behaviour remains intact.
- [ ] All forms, validations, uploads and drawers work.
- [ ] All product/business/promotion actions remain intact.
- [ ] Catalogue table/grid benchmark behaviour is unchanged.
- [ ] Subscription and payment-proof workflows are unchanged.
- [ ] No API or database contract changes.

### Security and accessibility
- [ ] Existing permission keys and route guards are unchanged.
- [ ] Backend remains authorization authority.
- [ ] Tenant isolation is unchanged.
- [ ] Public pages do not expose private data.
- [ ] Keyboard navigation and visible focus work.
- [ ] Icon-only controls have accessible names.
- [ ] Reduced-motion is respected.
- [ ] Responsive layouts do not overflow or clip essential controls.

### Quality gates
- [ ] Frontend tests pass.
- [ ] Type-check and production build pass.
- [ ] SCSS budgets pass.
- [ ] Changed-file lint/format checks pass.
- [ ] Relevant backend tests pass if backend was touched.
- [ ] Manual visual checks cover required breakpoints and both themes.
- [ ] All results include actual command/evidence.

## 11. Required implementation report

Create/update:
`docs/reports/BBG_BCF_UI_UX_IMPLEMENTATION_REPORT.md`

Include:
1. Phase and approved scope.
2. Actual instruction/skill files read.
3. Files changed with rationale.
4. Design token changes.
5. Screens/components completed.
6. Functionality preserved and regression evidence.
7. RBAC and tenant isolation checks.
8. Light/dark and responsive review.
9. Accessibility review.
10. Test/build/lint commands and actual outcomes.
11. Remaining defects, blockers and deferred work.
12. Confirmation no Git history/branch operations were performed unless explicitly requested.

## 12. Definition of done

The redesign is done only when the approved phases are implemented, all existing user journeys and permission boundaries are preserved, the three benchmark screens remain intact, both themes and responsive layouts are verified, quality gates pass, and the implementation report contains reproducible evidence.

**Execution instruction:** Start by checking the current branch and working tree, reading all applicable skills, and validating the analysis report against current code. Then execute the approved phases incrementally. If the owner has not explicitly approved implementation, do not modify code; return the implementation plan and wait.
