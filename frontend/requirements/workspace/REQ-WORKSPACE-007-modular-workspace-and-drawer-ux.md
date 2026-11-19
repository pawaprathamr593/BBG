---
id: REQ-WORKSPACE-007
title: Workspace modular component architecture and unified drawer UX
area: workspace
type: enhancement
owner: unset
status: in-progress
---

# Workspace modular component architecture and unified drawer UX

## 1. Problem

The unified workspace currently concentrates multiple Personal, Business and Platform module views and interactions in a large dashboard module component. This makes module ownership unclear, increases coupling between unrelated screens, and makes consistent UI/UX changes difficult.

Several workspace screens also need clearer information hierarchy and more consistent editing flows. In particular, business profile and storefront information should be presented as structured detail cards; catalogue products and categories should be clearly separated; and add/edit forms should use the same right-side drawer interaction already established elsewhere in BBG. Media fields must provide useful previews rather than poorly sized or ambiguous thumbnails.

This requirement is a frontend architecture and UX improvement. It must not expand backend capabilities or change existing business rules.

## 2. Personas

| Persona | Device | Goal |
| --- | --- | --- |
| Personal account holder | Mobile, tablet, desktop | View and manage their own account information and supported activity |
| Business owner / authorized member | Mobile, tablet, desktop | Manage permitted business profile, storefront and operational modules |
| Platform Admin | Desktop, tablet, mobile | Review and manage permitted platform administration modules |

## 3. Scope

**In scope:**

- Refactor the unified workspace so each existing workspace module has a clearly owned feature component, rather than keeping module-specific view logic and markup in one large dashboard module component.
- Keep the dashboard/workspace shell responsible for context, navigation, shared permissions and high-level orchestration. Keep feature components responsible for their module's page state and workflows. Extract reusable presentational components where they provide genuine reuse.
- Apply the refactor to existing Personal, Business and Platform workspace modules covered by REQ-WORKSPACE-003, REQ-WORKSPACE-004 and REQ-WORKSPACE-005.
- Preserve existing route paths, API calls, request/response envelopes, DTO fields, permission checks, entitlement checks, context rules and supported actions.
- Introduce/reuse a consistent right-side drawer pattern for every supported add and edit workflow in the workspace, including forms currently rendered inline, in centered modals, or through browser prompts.
- Match the existing BBG drawer behaviour on desktop and mobile, including backdrop, close action, keyboard operation, focus handling, scroll behaviour, safe-area spacing and responsive sizing.
- Structure Business Profile and Storefront pages as readable sections/cards that show the available business details and status. Provide edit actions for supported fields, with edits opening the shared drawer.
- Reorganize Catalogue so Products and Categories are distinct, clearly separated sections with their own headings, descriptions, counts/states and actions. Do not present the two management areas as competing side-by-side panels.
- Improve media presentation in add/edit drawers and relevant workspace views: correctly sized image previews, consistent aspect ratios and object-fit, and appropriate previews or file indicators for supported video, audio and document media. Clearly distinguish existing media from newly selected files and expose remove, upload progress and error states where the existing workflow supports them.
- Use BBG's existing design tokens and shared components; support light/dark themes, responsive layouts and accessibility.
- Provide loading, empty, error/retry, permission-denied, validation, saving, success and upload states appropriate to each module.

**Out of scope:**

- New backend endpoints, DTO fields, database/schema changes, migrations, infrastructure or S3 configuration changes.
- New business capabilities, unsupported module actions, new permission codes, or changes to role/tenant authorization policy.
- Changes to marketplace/public storefront functionality outside the authenticated workspace, except where a shared component must remain API-compatible.
- Replacing Angular, adding Tailwind, PrimeNG, NgRx, another UI framework, a new state library or a parallel design system.
- Rewriting API services or changing endpoint contracts solely to simplify the component refactor.
- Making read-only or decision/review workflows editable where the current backend does not support it.

## 4. Entry and context

- Routes: existing unified workspace routes under `/dashboard`, including Personal, Business and Platform sections listed in REQ-WORKSPACE-003, REQ-WORKSPACE-004 and REQ-WORKSPACE-005.
- Context: Personal, Business tenant and Platform contexts remain explicit and server-authorized through the existing WorkspaceContextService and authentication flow.
- Existing route paths and deep links must continue to resolve as they do before the refactor.
- A module must not load or expose data outside the active context and its existing permissions/entitlements.

## 5. Flow

1. The user enters the workspace and selects or resumes an authorized context using the existing context-selection behaviour.
2. The workspace shell displays only modules allowed by the current context and existing permission/entitlement rules.
3. Selecting a module loads that module's dedicated feature component while retaining the existing route and navigation behaviour.
4. The feature component loads data through the existing API service or current supported API orchestration. It presents loading, data, empty, error and permission states.
5. When the user chooses a supported Add or Edit action, the relevant form opens in a right-side drawer.
6. The drawer supports cancel/close without saving, validation, pending/disabled submission and accessible error feedback.
7. On successful API response, close or update the drawer according to the existing workflow and refresh the affected data. On failure, keep the form/data available and show the actual safe error; do not show false success.
8. When media is present, show existing and newly selected media with appropriate previews and upload status. Preserve the current presigned upload/link lifecycle.
9. On narrow screens, the drawer uses the same mobile interaction and sizing conventions as BBG's existing drawers.

## 6. Screens / regions

| Region | Intent | Reuse expectation |
| --- | --- | --- |
| Workspace shell and context navigation | Own active context, navigation and shared access state | Existing dashboard/workspace shell and WorkspaceContextService |
| Personal modules | Separate account, addresses and supported activity module views | Existing Personal routes, API services and form/list patterns |
| Business overview and modules | Separate profile, storefront, catalogue, members, customers, orders, enquiries, payments, promotions, subscriptions and analytics views | Existing Business feature pages and module workflows |
| Platform modules | Separate users, business approvals, subscription approvals, categories, moderation, analytics and system-health views | Existing Platform feature pages and API workflows |
| Business profile | Present business identity, registration, contact, address, category and status details available from current DTOs | Structured cards/sections; edit via shared drawer |
| Storefront | Present branding, public identity, description, available display settings and publication status supported by current DTOs | Structured cards/sections; edit via shared drawer |
| Catalogue | Make Products and Categories distinct management sections | Separate vertically stacked sections or clear section navigation; no side-by-side management panels |
| Add/edit forms | Consistent creation and editing experience across supported workspace modules | Shared right-side drawer composed with existing BBG drawer patterns |
| Media fields | Show selected and existing supported media clearly | Shared media preview/picker presentation where compatible with existing media DTOs and upload flows |

## 7. API

No new API operations are introduced by this requirement.

- Reuse the existing APIs documented in REQ-WORKSPACE-003 (Personal), REQ-WORKSPACE-004 (Business) and REQ-WORKSPACE-005 (Platform).
- Reuse existing feature API services and the existing authentication interceptor.
- Do not move HTTP calls into shared presentational components.
- Do not invent or rename endpoints, request envelopes, DTO fields or response mappings.
- Confirm exact DTO fields and mutation behaviour from the current branch's API services/backend workers before changing any form or detail presentation.
- Preserve the existing product/promotion media presigned upload and link operations; no direct public object-key rendering or new upload mechanism.

## 8. Permissions

- Use the existing permission and entitlement checks from WorkspaceContextService and the current access helpers.
- Feature components must not infer authorization from role labels or tenant IDs.
- Add/edit controls appear only when the existing permission and entitlement checks allow the operation.
- Unknown or missing permissions deny access to protected data/actions.
- Backend authorization and tenant ownership checks remain authoritative.
- No new permission codes or permission policy changes.

## 9. Rules and validation

- Follow `frontend/AGENTS.md`, `frontend/CODING_STANDARDS.md` and the BBG `.agent/skills/` workflows.
- Angular 22 standalone components; use OnPush for new components, `inject()`, typed inputs/outputs and signals where appropriate.
- Feature/route components own API orchestration, module state, permissions and navigation. Shared presentational components receive typed inputs and emit outputs; they do not call APIs.
- Each module must have a clear component boundary and focused template/styles. Keep TypeScript, HTML and SCSS in separate files for newly extracted feature components unless an established local pattern or Angular constraint gives a documented reason otherwise.
- Keep templates declarative; use Angular control flow and stable track identities.
- No `any`, unsafe non-null assertions on API data, duplicate state stores or side effects inside computed signals.
- The shared drawer must support close button, backdrop close, Escape, visible focus, keyboard use, focus restoration/management and body-scroll handling consistent with existing BBG drawers. Do not regress mobile behaviour or create nested competing overlays.
- Add/edit drawers must have a clear title, labelled controls, validation feedback, cancel and submit actions, pending state and safe error handling.
- Media previews must respect the actual media type. Images use bounded preview containers and suitable object-fit; video/audio use native controls where supported; documents use a file-type/name/size indicator or existing safe preview. Do not fabricate preview URLs or bypass existing signed URL/upload flows.
- Keep existing feature behaviour and supported operations. A componentisation task must not turn read-only screens into editable ones or expose unsupported actions.
- Preserve context isolation and stale-request protection when the user changes route, tenant or authenticated principal.

## 10. UI states

Every data-driven module/section must handle applicable states:

- Initial loading and refresh loading.
- Loaded content.
- Empty state with an appropriate next step.
- Recoverable error with retry where safe.
- Permission/entitlement denied state distinct from an empty list.
- Form validation and field-level feedback.
- Saving/uploading state with duplicate submission prevention.
- Success only after server-confirmed mutation.
- Upload progress and upload failure for existing media workflows.
- Safe retention of already-loaded data when a refresh fails, where current behaviour supports it.

## 11. Responsive and theme

- Match existing BBG workspace drawer interaction on desktop and mobile. On mobile, the drawer must use the established full-width/near-full-width treatment and fit the viewport without horizontal overflow.
- Verify widths around 360–390px, tablet and desktop.
- Preserve the workspace shell and public storefront shell boundaries.
- Use existing CSS custom properties and support light and dark themes.
- Provide visible `:focus-visible`, semantic headings/labels, keyboard operation, suitable touch targets and reduced-motion support.
- Avoid layout shifts and horizontal scrolling in cards, forms, tables and media previews.

## 12. Acceptance criteria

1. Given the user opens any existing Personal, Business or Platform workspace module, when the module loads, then its module-specific view is owned by a dedicated feature component rather than module-specific markup and workflow logic being accumulated in the central dashboard module component.
2. Given the user navigates between modules or changes workspace context, when the next module loads, then the existing route, context, permission and tenant-isolation behaviour is preserved and stale data from the previous module/context is not displayed.
3. Given a user opens a supported Add or Edit action, when the form is invoked, then it opens in the shared right-side drawer and not a browser prompt, inline form or centered modal.
4. Given the drawer is open on desktop or mobile, when the user closes it using the close button, backdrop or Escape, then it closes safely, restores appropriate focus and does not leave body scrolling locked.
5. Given the user opens a Business Profile page, when the profile loads, then available details are grouped into readable cards/sections with clear labels, status and a permission-aware Edit action.
6. Given the user opens a Storefront page, when storefront data loads, then available branding, identity, description, settings and publication details are presented in a structured layout and supported edits open in the shared drawer.
7. Given the user opens Catalogue, when the page loads, then Products and Categories are clearly separated into distinct sections and are not displayed as side-by-side management panels.
8. Given a product/category or other supported media-bearing add/edit form is opened, when existing or newly selected media is present, then previews/indicators are correctly sized and type-appropriate, with existing/new state and upload progress/error feedback where supported.
9. Given a user lacks a required permission or entitlement, when the user visits a module or attempts an action, then protected data/actions are not exposed and the existing denied state is shown.
10. Given a mutation succeeds, when the API confirms success, then the affected view refreshes or updates and success feedback is shown.
11. Given a mutation fails, when the API returns failure, then no false success is shown, the user's safe form state is retained and an actionable error is displayed.
12. Given the workspace is used at mobile, tablet and desktop sizes in light and dark themes, when each affected module and drawer is rendered, then there is no horizontal overflow and controls remain keyboard-accessible with visible focus.
13. Given the refactor is complete, when the frontend checks are run, then Prettier, the Angular development build, relevant tests and `git diff --check` results are recorded accurately.

## Open questions

- UNKNOWN: Confirm the complete current module-to-route inventory from the latest route configuration before splitting components; the existing module requirements are the intended scope baseline.
- UNKNOWN: Confirm which existing add/edit flows currently use browser prompts, inline forms or centered modals and map each to the shared drawer during implementation.
- UNKNOWN: Confirm current DTO fields for Business Profile and Storefront from the existing API services before finalizing the exact detail-card fields.
- UNKNOWN: Confirm available automated test coverage and commands for workspace context, drawer behaviour and module components.
- UNKNOWN: Manual visual verification requires running the frontend with suitable authenticated Personal, Business and Platform test accounts.

## Implementation log

- Requirement drafted on branch `refactor/workspace-module-components` after reviewing REQ-WORKSPACE-003 through REQ-WORKSPACE-006, frontend agent instructions and the current workspace implementation.

- Extracted DashboardModule's inline styles into `dashboard-module.scss` and retained the existing selectors/styles.
- Added a shared `WorkspaceModuleApiService` for the business-profile and storefront feature components, preserving their existing Yii API endpoints, envelope and action names.
- Moved Business Profile and Storefront edit/publish workflows into their respective standalone feature components; successful mutations request a parent refresh and failed mutations retain the drawer with an error.
- Added a consistent accessible title association to the shared workspace drawer and improved mobile safe-area spacing/touch target sizing.
- Corrected promotion composer media previews so image, video, audio and document files render with type-appropriate previews or indicators.
- Catalogue Products and Categories remain separate vertically stacked management sections; product media drawer retains existing/new media, upload progress and failure feedback.
- Verification still pending: Angular development build, Prettier, automated tests and authenticated responsive browser checks. No build or browser success is claimed.

- Moved Personal Account profile editing and password set/change flows into the Personal Account feature component; it now owns its form state and uses the shared right-side drawer. Successful updates emit a refresh request to reload the authenticated profile.

- Extracted Platform Marketplace Categories into its own feature component with permission-gated create/edit/delete drawers/actions and preserved server pagination.

- Product and promotion media selection now creates local previews for audio files as well as images and videos; document files retain a safe type/name indicator. The product drawer renders native audio controls instead of treating audio as video.

- Remaining implementation scope: extract the other record-oriented Business and Platform workflows and their action/drawer orchestration into focused feature components without changing their current API contracts. The current branch intentionally remains `in-progress` until those extractions and the required verification are complete.
