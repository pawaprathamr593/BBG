---
id: REQ-WORKSPACE-010
title: Catalogue visual parity, product media rendering and client-side table sorting
area: workspace
type: enhancement
owner: unset
status: draft
---

# Catalogue visual parity, product media rendering and client-side table sorting

## 1. Problem

The Product Catalogue provides Table View and Grid View, but its visual treatment does not feel consistent with other BBG dashboard record modules. Product images are also missing from Grid View even when product image media is available. The table needs predictable ascending and descending sorting for sortable columns.

The goal is to make Catalogue feel like a native BBG dashboard module by reusing the established module presentation and media-rendering implementation, while making sorting operate only on data already available in the frontend. Changing sort order must not trigger an API request.

This is a focused Catalogue refinement. Preserve existing catalogue operations, APIs, permissions, responsive defaults and the previously agreed Categories-before-Products page hierarchy.

## 2. Personas

| Persona | Device | Goal |
| --- | --- | --- |
| Business owner / authorized catalogue manager | Mobile, tablet, desktop | Browse, find and manage products using a consistent catalogue experience |
| Authorized business staff member | Mobile, tablet, desktop | Identify products, inspect product media and sort the available product list |
| Platform administrator, where catalogue access is provided | Desktop, tablet, mobile | Use the same established BBG list and media patterns where Catalogue is available |

## 3. Scope

**In scope:**

- Align Catalogue Table View and Grid View with the existing visual implementation used by BBG dashboard record modules.
- Inspect and reuse the established Grid View card structure, media container, status treatment, typography, spacing, actions and responsive behaviour.
- Fix product image rendering in Grid View using the existing product media fields and approved media/S3 URL resolution lifecycle.
- Provide graceful image loading, missing-media and failed-media states using existing BBG fallback patterns.
- Add ascending and descending client-side sorting to every Catalogue table column for which loaded product data contains a meaningful sortable value.
- Keep sorting local to the frontend dataset already available; sorting must not issue an HTTP request or change API query parameters.
- Keep Table View and Grid View based on the same filtered and ordered product collection.
- Keep sorting compatible with existing search, category filtering, column visibility, page-size controls and pagination.
- Preserve existing responsive view defaults and the Categories section above the Products section.

**Out of scope:**

- New backend endpoints, API request parameters, response fields, DTOs, database columns, migrations or S3 configuration.
- Server-side sorting or a new global sorting contract.
- Changes to product creation, editing, deletion, category CRUD, publication rules or business permissions except where required to preserve existing behaviour.
- Replacing the current design system or introducing Tailwind, PrimeNG, Material, NgRx or another UI framework.
- Rebuilding unrelated dashboard modules or changing their behaviour.

## 4. Entry and context

- Route: existing authenticated Business Workspace Catalogue route, currently /dashboard/catalogue.
- Context: the active server-authorized tenant and existing Catalogue permissions/entitlements.
- Preserve current route behaviour, workspace context, tenant isolation and deep links.
- Preserve the existing page hierarchy: Catalogue header, Categories management section, then Products section.

## 5. Flow

1. An authorized user opens Catalogue in the active Business Workspace.
2. Catalogue loads product and category data through the existing feature/API services.
3. The user selects Table View or Grid View. Existing responsive defaults remain: Grid View on mobile/tablet and Table View on desktop.
4. Grid View displays each product's actual available image media using the same media-resolution and image-presentation approach used by other BBG modules. If no usable image exists, the established fallback is shown.
5. In Table View, the user activates a sortable column header.
6. The first sort action orders the currently available product dataset ascending by that column. The next action orders it descending. The user can clear sorting and return to the default loaded order.
7. The frontend derives the sorted collection without calling an API. Search and category filters remain applied, and pagination renders the appropriate slice according to the existing pagination model.
8. Switching between Table and Grid retains active filters, sort order and list state.
9. Normal data loading, supported filter requests and existing product/category mutations continue to use their current API behaviour; only changing sort order is guaranteed to be request-free.

## 6. Screens / regions

| Region | Intent | Reuse expectation |
| --- | --- | --- |
| Catalogue page shell | Maintain established dashboard hierarchy and visual language | Follow the nearest existing dashboard record module and approved Catalogue baseline |
| Products toolbar | Keep search, filters, view switch, page size and column configuration aligned | Reuse existing BBG toolbar/control patterns |
| Products Table View | Show readable product columns and clear sort affordances | Reuse table header, row, status and action patterns used by other record modules |
| Products Grid View | Display product media and information in consistent cards | Reuse the existing dashboard Grid View card/media implementation rather than inventing a Catalogue-only card style |
| Product media | Render actual product image media with loading and fallback states | Reuse existing media component/service/resolver and signed-URL lifecycle |
| Sort indicators | Communicate unsorted, ascending and descending states accessibly | Reuse existing BBG iconography, focus and button patterns |

## 7. API

No new API operations are introduced.

- Continue using existing Catalogue product and category API services, request envelopes, DTOs and response mappings.
- Do not add sort fields to API requests or alter endpoint query/payload contracts.
- Do not call the backend when a user changes a table sort column or direction.
- Reuse current product media data and existing S3 signed-URL/media resolution flow. Do not invent a media field, URL format, resolver endpoint or presigned URL operation.
- Confirm exact product image fields and media resolver inputs from current-branch models, API service and working media-bearing sibling modules before implementation.
- If the API currently returns only a server-paginated page, client-side sorting can only order records currently loaded in memory. Do not claim that this sorts products on other pages that have not been loaded. Do not fetch additional pages solely to sort.

| Operation | Method | Path | Envelope | Status |
| --- | --- | --- | --- | --- |
| Load products | Existing Catalogue operation | Existing path from current Catalogue API service | Preserve existing envelope | Existing; verify current implementation |
| Load categories | Existing Catalogue operation | Existing path from current Catalogue API service | Preserve existing envelope | Existing; verify current implementation |
| Resolve product media | Existing media/S3 workflow | Existing resolver/service; no new path | Preserve current contract | Existing workflow must be reused |
| Sort loaded products | In-memory operation | No HTTP path | None | New client-side behaviour; must not call API |

## 8. Permissions

- Preserve current Catalogue view and product action permission/entitlement checks.
- Do not add or infer permission keys.
- Sorting and switching presentation modes are local presentation operations and must not grant additional access to product data or actions.
- Backend authorization and tenant scoping remain authoritative.

| Action | Permission key | Status |
| --- | --- | --- |
| View Catalogue products/categories | Existing Catalogue view permission and entitlement | Existing; preserve |
| Create/edit/delete product | Existing action-specific Catalogue permissions | Existing; preserve |
| Sort currently loaded products | No additional permission | Local presentation only |
| Switch Table/Grid View | No additional permission | Local presentation only |

## 9. Rules and validation

### 9.1 Visual parity

- Before changing Catalogue, inspect the current working implementations in WorkspaceRecordsModule, PlatformCategoriesModule and other suitable record modules.
- Identify the closest working reference for card layout, media display, table headers, status badges, row actions and responsive behaviour.
- Reuse existing shared components/utilities when they fit. If Catalogue requires a feature-specific composition, it must still use the same established design tokens, structure and interaction patterns.
- Do not create a visually unrelated card design or duplicate an existing shared component without a documented technical reason.
- Match card proportions, image container sizing/aspect ratio, object-fit, spacing, borders, radius, typography, status placement, action placement and hover/focus treatment.
- Use existing CSS custom properties and support both light and dark themes. Do not add hardcoded hex colours or a parallel token set.

### 9.2 Product media

- Inspect actual product response/model fields and compare them with a working media-bearing module.
- Use the same approved media URL resolver/component/service and S3 signed-URL lifecycle used elsewhere in BBG.
- Never construct a public S3 URL from an object key, expose private bucket details, bypass authorization or invent a presigned URL.
- Do not introduce repeated or unnecessary media API requests.
- Display the real product image whenever valid image media is available and accessible.
- Preserve aspect ratio and use established image sizing/object-fit behaviour; avoid stretched or distorted images.
- Provide loading and error handling. If media is absent, expired, broken or forbidden, show the existing appropriate fallback without breaking the card.
- Do not use stock images, unrelated images or fabricated placeholders as product media.
- Ensure media rendering works at mobile, tablet and desktop widths.

### 9.3 Client-side sorting

- Sorting must operate only on product records already available in frontend memory.
- Do not issue HTTP requests, reload products, alter API parameters or change backend state when sort state changes.
- Use a typed sort definition and reusable pure comparison/ordering helper where this fits the existing architecture.
- Do not use any; handle nullable and missing values safely.
- Support case-insensitive string comparison, numeric price comparison, meaningful category/status comparison and stable ordering.
- Do not mutate the original loaded product array. Preserve original order so clearing sorting restores the current loaded order.
- Each sortable header must expose an accessible name and current sort state. Use visible ascending/descending indicators and keyboard-operable buttons.
- Sort only columns whose values are present and meaningful in the actual product model.

Candidate sortable columns, subject to actual available product fields:

| Column | Sort behaviour |
| --- | --- |
| Product name | Case-insensitive alphabetical |
| Product code / BCN | Case-insensitive alphanumeric |
| Brand | Case-insensitive alphabetical |
| Category | Case-insensitive alphabetical |
| Selling price | Numeric |
| Cost price | Numeric |
| Barcode | Case-insensitive alphanumeric |
| Publication status | Consistent ordering of actual status values |

- The default interaction cycle is unsorted → ascending → descending → unsorted.
- If the current application already has a documented shared sort interaction, follow it instead and keep the same capability and request-free guarantee.
- Hiding a column must not remove its value from the sort dataset. Showing it again must retain correct sort behaviour.

### 9.4 Filtering and pagination

- Keep one source of truth for the product collection used by both views.
- Apply existing search and category filters consistently before rendering either view.
- Apply client-side sorting to the currently available filtered collection, then apply local pagination when pagination is local.
- If pagination is server-driven and only one page is loaded, sort only records currently available in memory; do not silently claim global sorting and do not fetch other pages for sorting.
- Preserve existing page-size options and behaviour.
- When filters or the sorted result change, reset or safely clamp the current page so the user is not left on an invalid page.
- Switching between Table and Grid must preserve current sort and resulting record order.

### 9.5 Implementation standards

- Follow frontend/AGENTS.md, frontend/CODING_STANDARDS.md and relevant BBG skills.
- Angular 22 standalone components, existing signals/RxJS patterns, inject(), strict types and OnPush where established.
- Keep API calls in feature/API services; keep reusable UI components presentation-only.
- Use Angular control flow with stable tracking keys.
- Preserve existing product CRUD, category filtering, pagination, permissions, tenant isolation and responsive defaults.
- Do not modify backend or database code for this requirement.
- Handle loading, empty, error and permission-denied states using established BBG components/patterns.

## 10. UI states

- Loading: retain established Catalogue loading treatment and reserve media/card space to avoid layout shifts.
- Populated: actual product data and accessible media are displayed.
- Empty: existing empty state remains meaningful for no products and no filter matches.
- Media loading: show established loading placeholder/skeleton.
- Media failure or unavailable media: show established product fallback.
- Sorting: clearly show unsorted, ascending and descending states; sorting itself must not introduce a loading state or API activity.
- Error: show accurate product/media errors and retry only where the existing workflow safely supports it.
- Permission denied: preserve existing permission/entitlement denied behaviour.

## 11. Responsive and theme

- Preserve existing responsive defaults: Grid View on mobile and tablet; Table View on desktop.
- Preserve manual Table/Grid switching.
- Use the existing responsive view-mode utility and breakpoint conventions; do not create a conflicting Catalogue-only breakpoint.
- Grid cards must use available width effectively and must not create horizontal overflow.
- Desktop table headers and sort controls must remain readable and keyboard accessible.
- Verify at approximately 360–390px, tablet widths and desktop widths.
- Support light and dark themes using existing tokens.
- Preserve visible focus states, accessible labels, reduced-motion preferences and usable touch targets.

## 12. Acceptance criteria

1. Given an authorized user opens Catalogue, when Table or Grid View is displayed, then its visual hierarchy, spacing, card treatment, status indicators, media containers and actions follow established BBG dashboard record-module patterns.
2. Given a product has valid accessible image media, when Grid View renders, then the actual product image is visible using the existing BBG media/S3 resolution workflow.
3. Given a product has no image or its image cannot be loaded, when Grid View renders, then the established fallback is displayed without a broken layout.
4. Given product image media is private or signed, when it is rendered, then the existing authorization and signed-URL lifecycle is respected and no private bucket URL or credential is exposed.
5. Given a sortable table column is available, when the user activates its header, then the currently available product records are sorted ascending by that column.
6. Given the same column is already ascending, when the user activates it again, then the currently available product records are sorted descending.
7. Given the same column is already descending, when the user clears its sort using the established interaction, then the original loaded order is restored.
8. Given the user changes sort column or direction, when the interaction completes, then no HTTP request is issued and no API query parameter or backend state is changed.
9. Given price columns contain numeric values, when the user sorts them, then values are compared numerically rather than lexicographically.
10. Given sortable values are null, missing or equal, when sorting occurs, then the comparator handles them safely and maintains stable ordering.
11. Given the user searches or filters by category, when sorting is applied, then only matching currently available records are ordered and both views show the same result order.
12. Given the user changes page size or navigates pagination after sorting, when records render, then pagination remains valid and the sorted order is preserved within the currently available dataset.
13. Given a table column is hidden and later shown, when sorting is used, then column visibility does not corrupt the sort dataset or sort state.
14. Given the user switches from Table View to Grid View after sorting, when Grid View appears, then it displays the same filtered and ordered records.
15. Given the user resizes between mobile, tablet and desktop, when Catalogue responds, then existing responsive defaults and manual view switching continue to work without horizontal overflow.
16. Given the user changes light/dark theme, when Catalogue renders, then cards, images, table headers, sort indicators and controls remain legible and consistent with BBG tokens.
17. Given implementation is complete, when verification is performed, then TypeScript, relevant tests, formatting and Angular development build results are recorded with exact commands and actual outcomes.

## Open questions

- UNKNOWN: Exact product image/media property names and whether the current product list response includes a resolved media URL or only a media/object reference. Confirm from current-branch DTOs and existing working media resolver before implementation.
- UNKNOWN: Whether product pagination is fully client-side or server-driven for the complete catalogue. Confirm from current Catalogue API service and response metadata. Sorting must remain request-free and limited to records currently loaded in memory.
- UNKNOWN: Exact shared component/helper used by the best-matching dashboard Grid View. Inspect current branch and reuse it where compatible; do not assume a component name or path.

## Implementation log

- Requirement drafted from the Catalogue visual-parity, missing product-image and request-free client-side sorting refinement.
- Source guidance: requirements/BBG_DASHBOARD_MODULE_UX_RBAC_SUBSCRIPTION_SPEC.md, frontend/requirements/workspace/REQ-WORKSPACE-004-business-workspace.md, and frontend/requirements/workspace/REQ-WORKSPACE-007-modular-workspace-and-drawer-ux.md.
- Skill workflow: bbg-context, requirement-intake, build-ui, data-layer and coding-standards; requirement template and UI/UX standards reviewed.
- Status remains draft until the open questions are resolved against the current implementation and the requirement is readiness-checked.
