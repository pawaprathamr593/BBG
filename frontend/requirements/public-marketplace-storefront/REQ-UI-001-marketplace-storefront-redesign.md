---
id: REQ-UI-001
title: Public Marketplace and Business Storefront UI/UX Redesign
area: public-marketplace-storefront
type: enhancement
owner: BBG Product / Frontend
status: draft
priority: high
---

# REQ-UI-001 — Public Marketplace and Business Storefront UI/UX Redesign

## 1. Purpose

Redesign the **Public Marketplace** and **Business Storefront** experiences using the approved BBG visual direction. This requirement covers all identified public-facing pages, not only the homepages.

This is a frontend UI/UX enhancement. The backend APIs are already implemented and must be reused. Do not create, rename, modify, or replace API endpoints, request envelopes, DTO contracts, backend services, database structures, permissions, or business workflows as part of this requirement.

## 2. Scope

### 2.1 Public Marketplace — in scope

1. Marketplace Homepage
2. Business Directory
3. Product Directory
4. Business Details
5. Product Details — **protected / no redesign**
6. Promotions Listing
7. Promotion Details
8. About BBG

### 2.2 Business Storefront — in scope

1. Storefront Homepage
2. Storefront Products
3. Storefront Product Details — **protected / no redesign**
4. Storefront About
5. Storefront Contact
6. Storefront Promotions
7. Storefront Promotion Details

### 2.3 Explicitly out of scope

- Authenticated BBG Platform UI: Personal Account, Business Workspace and Platform Administration.
- Backend Yii 3 implementation or API changes.
- Database migrations, schema changes, seeds or destructive SQL.
- New checkout, cart, payment, coupon redemption, discount calculation, ordering, booking or other workflows not already supported by current APIs and UI.
- Replacing existing product-detail experiences.

## 3. Protected Product Details — strict constraint

The existing specific-product view must remain visually and functionally unchanged when a visitor opens a specific product.

This protection applies to:
- Public Marketplace Product Details.
- Business Storefront Product Details.

Do not redesign, restyle, rearrange, simplify, replace, or re-componentise these pages as part of this task. Do not change their page structure, visual hierarchy, content presentation, gallery, specifications, variants, actions, routing, or interaction behaviour.

The product directory/listing pages and product cards may be redesigned, but their navigation into the protected detail page must continue to work exactly as it does today.

Only make a change to a protected product-detail page if the owner separately authorises that exact change. Do not bundle unrelated bug fixes or responsive changes into this requirement.

The corresponding reference images are labelled **PROTECTED — EXISTING UI ONLY**. They are visual identification aids, not redesign targets.

## 4. Approved visual direction

### 4.1 Brand tokens

Use the already-approved BBG brand palette and existing semantic theme-token architecture.

| Token | Value | Intended use |
|---|---|---|
| Primary | #06402B | Main brand surfaces and primary actions |
| Primary hover | #075438 | Hover |
| Primary active | #043522 | Pressed |
| Primary highlight | #10B981 | Indicators and highlights |
| Primary soft | #D1FAE5 | Selected surfaces in light theme |
| Primary tint | #ECFDF5 | Subtle light surfaces |
| Accent | #FBBF24 | Secondary emphasis and selected CTA |
| Accent hover | #F59E0B | Accent hover |
| Accent active | #D97706 | Accent pressed |

Light theme page background: #F7FAF8. Dark theme uses the approved Forest Charcoal surfaces (#171D19 page, #242E27 elevated surfaces, #202923 inset surfaces).

Use the semantic CSS variables already present in the frontend. Do not scatter raw hex values through component SCSS and do not create a parallel token system.

### 4.2 Dark-theme semantic text rule

Semantic brand-green text in light mode becomes accent yellow (#FBBF24) in dark mode. Apply only to semantic brand text, brand links, active navigation text, highlighted headings and active brand icons. Do not globally recolour ordinary text, status colours, green button backgrounds, or primary-button text.

### 4.3 Experience distinction

The Marketplace and Storefront must share BBG design language, typography, spacing, accessible controls and theme behaviour, but must remain recognisably distinct experiences.

- Marketplace: multi-business discovery and exploration.
- Storefront: an individual business's branded public presence and catalogue.

Do not force both experiences into one identical page template.

## 5. Page-level wireframe requirements

Page wireframe reference images are stored separately under [references/](references/). Each page has its own image file. The references are visual direction; exact content and actions must be reconciled with existing frontend models and APIs.

### 5.1 Public Marketplace Homepage

Reference: [marketplace-homepage.svg](references/marketplace-homepage.svg)

- BBG public header with logo, navigation, marketplace search and account actions.
- Forest Green hero as the dominant brand surface.
- Clear headline, concise supporting copy, prominent search and primary discovery actions.
- Trust/supporting proof panel only when backed by existing data/content.
- Category discovery.
- Featured businesses and popular products.
- Promotions preview using the existing promotion-card concept.
- Recently joined businesses and platform value proposition where existing data/content supports them.
- Footer with public navigation and existing contact/legal links.

Do not fabricate statistics, trust badges, business counts or claims.

### 5.2 Business Directory

Reference: [marketplace-business-directory.svg](references/marketplace-business-directory.svg)

- Shared Marketplace header.
- Page title and concise introduction.
- Search and supported filter controls.
- Category/filter area and sorting only where supported by current implementation/API.
- Responsive business cards/list rows using existing business fields.
- Pagination or load-more behaviour must reuse the current supported mechanism.
- Loading, empty, error and populated states.

### 5.3 Product Directory

Reference: [marketplace-product-directory.svg](references/marketplace-product-directory.svg)

- Shared Marketplace header.
- Product search and supported category/filter controls.
- Responsive product grid/list and clear product-card hierarchy.
- Preserve all existing product-card actions and route targets unless an approved change is explicitly documented.
- Opening a product must navigate to the protected existing Product Details view.
- Loading, empty, error and populated states.

### 5.4 Business Details

Reference: [marketplace-business-details.svg](references/marketplace-business-details.svg)

- Business cover/identity region and logo.
- Business name and verified/status indicators only if present in source data.
- Existing contact/location information.
- Business overview and available capabilities.
- Product and promotion previews when current API data supports them.
- Clear action to visit the business's storefront.
- Do not add unverified certifications, accreditations, trust claims or business metadata.

### 5.5 Marketplace Product Details — protected

Reference: [marketplace-product-details-protected.svg](references/marketplace-product-details-protected.svg)

**No redesign. Existing specific-product page must remain untouched.** This reference is a protected-screen marker only.

### 5.6 Marketplace Promotions

Reference: [marketplace-promotions.svg](references/marketplace-promotions.svg)

- Shared Marketplace header and page title.
- Reuse the current shared promotion-card concept.
- Keep business identity, date/validity, media, hashtags and existing Save/Report/engagement affordances where they are currently supported.
- Refine responsive behaviour and spacing without replacing the card concept.
- Test long titles/descriptions, long business names, verification indicators, single/multiple media, video/audio/document attachments, action controls, date/status, engagement/comments and CTA wrapping.
- Do not invent discount redemption, coupons, checkout or purchase actions.

### 5.7 Promotion Details

Reference: [marketplace-promotion-details.svg](references/marketplace-promotion-details.svg)

- Individual promotion content and media.
- Promotion title, published date and validity where supplied.
- Business identity and available location.
- Full promotion description and hashtags where available.
- Existing Save and Report actions only if supported.
- View Business / storefront navigation.
- Related promotions only if supported by existing API data.
- Do not invent a redemption, coupon, checkout or order flow. Confirm an existing detail endpoint/route before wiring this screen; if no supported endpoint exists, report the gap rather than fabricate one.

### 5.8 About BBG

Reference: [marketplace-about.svg](references/marketplace-about.svg)

- Public platform introduction and purpose.
- Explain marketplace value using approved, existing content.
- Supporting value propositions and calls to explore the marketplace.
- Do not introduce unsupported claims, partner logos, certifications or metrics.

### 5.9 Storefront Homepage

Reference: [storefront-homepage.svg](references/storefront-homepage.svg)

- Business-branded header/navigation and identity.
- Cover/hero image and logo.
- Business name, introduction and supported contact/location actions.
- Featured products/catalogue preview.
- Promotion preview using existing promotion cards.
- Business capabilities/about preview and footer.
- Respect available storefront settings and optional content; do not render fabricated data.

### 5.10 Storefront Products

Reference: [storefront-products.svg](references/storefront-products.svg)

- Storefront-specific product catalogue.
- Search, categories and filters only where currently supported.
- Responsive product cards/grid.
- Preserve existing product selection and navigation.
- Opening an individual product must show the protected existing Storefront Product Details page.

### 5.11 Storefront Product Details — protected

Reference: [storefront-product-details-protected.svg](references/storefront-product-details-protected.svg)

**No redesign. Existing specific-product page must remain untouched.** This reference is a protected-screen marker only.

### 5.12 Storefront About

Reference: [storefront-about.svg](references/storefront-about.svg)

- Business overview and story using existing profile data.
- Capabilities, services, locations or other sections only when supported.
- Responsive image/text composition.
- Keep storefront identity and navigation consistent.

### 5.13 Storefront Contact

Reference: [storefront-contact.svg](references/storefront-contact.svg)

- Existing contact information and contact methods.
- Existing enquiry form fields and validation only.
- Map/location only if existing data or current implementation supports it.
- Preserve existing submission API and success/error handling.
- Accessible labels, validation messages and submission feedback.

### 5.14 Storefront Promotions

Reference: [storefront-promotions.svg](references/storefront-promotions.svg)

- Show promotions belonging to the current storefront business only.
- Reuse shared promotion-card concept and supported actions.
- Responsive card layout and media handling.
- Empty state when no promotions are available.

### 5.15 Storefront Promotion Details

Reference: [storefront-promotion-details.svg](references/storefront-promotion-details.svg)

- Full promotion information in the current storefront context.
- Business identity, title, content, media and validity only from existing data.
- Existing supported actions and navigation.
- Do not invent redemption or commerce flows.

## 6. Shared components and interaction requirements

Inspect and reuse existing components before creating new ones. Candidate shared UI includes:
- Public marketplace header/navigation and footer.
- Storefront header/navigation and footer.
- Search input and filter controls.
- Business card.
- Product card.
- Promotion card (preserve current card concept).
- Badge/status indicators.
- Pagination/load-more controls.
- Empty, loading and error states.
- Responsive media/gallery primitives.

A component should be extracted only when it has a real reuse case. Avoid over-componentisation and do not duplicate feature-specific data orchestration inside presentational components.

## 7. API and data integration — existing APIs only

The APIs are already implemented. This requirement is not permission to add or change APIs.

Before implementation:
1. Inspect current Angular routes, page components, API services, typed models and request/response mappings.
2. Map each page operation to the existing service method and endpoint.
3. Reuse existing action envelopes and response structures exactly.
4. Keep HTTP orchestration in existing feature/core API services.
5. Preserve authentication/interceptor behaviour and public access behaviour.
6. Preserve existing route paths and query/route parameters unless an explicit route change is separately approved.
7. Do not invent DTO properties, API fields, permission keys, endpoint paths or response shapes.
8. If a page requires data for which no existing endpoint/service method can be verified, mark it as a blocker and ask for direction. Do not implement a mock API or fabricate data.

No backend changes, schema changes or migrations are permitted under this requirement.

## 8. Responsive behaviour

Use the existing project breakpoints and responsive conventions. At minimum verify:
- Compact mobile: below 640px.
- Tablet: 640px–1023px.
- Desktop: 1024px–1439px.
- Wide desktop: 1440px and above.

Requirements:
- No horizontal page overflow.
- Navigation collapses into a usable mobile pattern.
- Search and filters remain usable on touch devices.
- Cards reflow without clipped content.
- Long business names, product titles and promotion content wrap safely.
- Images preserve intended aspect ratio and avoid layout shift.
- Forms remain readable and usable with mobile keyboards.
- Touch targets and spacing are accessible.
- Test all redesigned pages in both themes.
- Protected Product Details pages remain unchanged; do not use this requirement to alter their responsive styling.

## 9. Accessibility, performance and quality

- Target WCAG 2.2 AA practices consistent with existing project standards.
- Semantic landmarks and heading hierarchy.
- Keyboard access and visible focus states.
- Labels and accessible names for controls.
- Form errors associated with inputs.
- Meaningful alternative text for informative images; decorative images use empty alt text.
- Respect reduced-motion preferences.
- Use existing lazy-loading and image optimisation patterns.
- Avoid layout shift and unnecessary large assets.
- Do not add a new UI framework, CSS framework, state-management library or runtime dependency.

## 10. Required BBG agent skills and workflows

Read these before implementation:

1. `frontend/AGENTS.md`
2. `frontend/.agent/README.md`
3. `frontend/.agent/rules/bbg-skills-workflow.md`
4. `frontend/.agent/skills/bbg-context/SKILL.md`
5. `frontend/.agent/skills/bbg-context/references/architecture.md`
6. `frontend/.agent/skills/coding-standards/SKILL.md`
7. `frontend/CODING_STANDARDS.md`
8. `frontend/.agent/skills/build-ui/SKILL.md` and its referenced UI/UX standards.
9. `frontend/.agent/skills/data-layer/SKILL.md` and referenced API documentation.
10. `frontend/.agent/skills/requirement-intake/SKILL.md`
11. `frontend/.agent/skills/implement-requirement/SKILL.md`
12. `frontend/.agent/skills/review-and-release/SKILL.md`

Skill routing:
- Page layouts, templates, SCSS, responsive behaviour and reusable presentational UI: **build-ui**.
- Existing API integration, models, service methods, routes and state: **data-layer** (inspection/reuse only unless an approved gap is identified).
- Requirement readiness and scope validation: **requirement-intake**.
- Implementation sequencing and approval gates: **implement-requirement**.
- Final diff and release review: **review-and-release**.

Do not copy patterns from unrelated technology stacks in any bundled skills kit. BBG's Angular 22, SCSS, existing component architecture and coding standards remain authoritative.

## 11. Implementation sequence and approval gates

1. Audit current public marketplace and storefront routes, components, services and APIs.
2. Produce a page-to-route-to-component-to-API mapping table.
3. Identify existing reusable components and protected product-detail files.
4. Report missing/uncertain API coverage and any route ambiguity.
5. Present a file-level implementation plan grouped by page and shared components.
6. Wait for approval of that implementation plan before editing code.
7. Implement only the approved public Marketplace and Storefront scope.
8. Verify protected product-detail pages have no diff.
9. Run formatting, build and relevant tests.
10. Review the final diff and update this requirement's implementation log.

Do not commit, push, merge or perform branch operations unless separately requested.

## 12. Acceptance criteria

- [ ] All in-scope Marketplace pages are covered by the approved page references and implementation plan.
- [ ] All in-scope Storefront pages are covered by the approved page references and implementation plan.
- [ ] Marketplace and Storefront retain distinct identities while sharing the BBG design language.
- [ ] Approved Forest Green brand tokens are used through semantic theme variables.
- [ ] Light and dark themes work on all redesigned pages.
- [ ] Dark-theme semantic brand-green text changes to accent yellow without globally recolouring ordinary/status text.
- [ ] Existing APIs, endpoints, request envelopes, DTOs and response mappings are reused unchanged.
- [ ] Existing route behaviour and navigation remain intact unless separately approved.
- [ ] Existing promotion-card concept is retained with responsive refinements.
- [ ] Public Marketplace Product Details page has no redesign changes.
- [ ] Storefront Product Details page has no redesign changes.
- [ ] Product listing cards continue navigating to their existing protected detail pages.
- [ ] No unsupported checkout, coupon, redemption, ordering or payment functionality is introduced.
- [ ] Loading, empty, error and success states are handled where applicable.
- [ ] Responsive layouts are checked at mobile, tablet, desktop and wide desktop sizes.
- [ ] Accessibility and keyboard behaviour are checked.
- [ ] Angular development build succeeds.
- [ ] `git diff --check` succeeds and no unrelated files are changed.

## 13. Verification commands

Run from `frontend/`:

```bash
npx prettier --check <touched-files>
npx ng build --configuration development
```

Also run relevant existing tests and:

```bash
git diff --check
```

Manually verify each affected page in light/dark themes and all responsive breakpoints. Confirm that protected product-detail files have no changes in the diff.

## 14. Open questions / blockers

- Exact current route and service mapping for Promotion Details must be verified in the current branch.
- Any page/API data mismatch discovered during audit must be reported before implementation.
- Existing page content and business claims must be sourced from current BBG content/data; no new claims are assumed by this requirement.

## 15. Implementation log

| Date | Status | Notes |
|---|---|---|
| 2026-11-23 | Draft created | Scope and wireframe references documented. No application code changed. |
