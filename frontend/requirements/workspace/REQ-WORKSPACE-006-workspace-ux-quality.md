---
id: REQ-WORKSPACE-006
title: Workspace cross-cutting UX, accessibility and integration quality
area: workspace
type: enhancement
owner: unset
status: in-progress
---

# Workspace cross-cutting UX, accessibility and integration quality

## 1. Problem
Workspace modules need consistent asynchronous states, validation, accessibility and responsive behaviour across Personal, Business and Platform contexts without breaking routes, API contracts or the BBG visual language.

## 2. Personas
| Persona | Device | Goal |
| --- | --- | --- |
| Personal account holder | Mobile, tablet, desktop | Complete account tasks with clear feedback |
| Business member | Mobile, tablet, desktop | Complete authorized tenant tasks reliably |
| Platform Admin | Desktop, tablet, mobile | Review and administer records safely |

## 3. Scope
**In scope:** Loading/empty/error/retry/success/denied states; validation; duplicate-submit prevention; destructive confirmations; accessible labels, keyboard/focus and status announcements; responsive/light-dark compatibility; typed API boundary handling; tests for context and permission separation where test infrastructure permits.
**Out of scope:** New design system/library/state manager/API wrapper; backend/schema/infrastructure changes; unrelated redesign; claims of live API/S3 testing without configured environment.

## 4. Entry and context
Applies to existing /dashboard shell and current workspace sections. Context and permissions come from existing auth/workspace services; backend remains authoritative.

## 5. Flow
1. Open a workspace section and show loading.
2. Render data, useful empty state or recoverable error.
3. Validate and submit a supported action with pending state.
4. Announce success only after API success and refresh affected data.
5. On failure retain safe data and show safe API feedback.

## 6. Screens / regions
| Region | Intent | Reuse expectation |
| --- | --- | --- |
| Lists/cards | Loading, empty, error and data | Existing BBG patterns |
| Forms/dialogs | Validation and mutation state | Existing forms/dialogs |
| Status feedback | Accessible operation result | Existing notice service |
| Navigation/pages | Keyboard, responsive and theme | Existing workspace shell/tokens |

## 7. API
Existing feature-specific POST routes and module envelopes only. No new API routes.

## 8. Permissions
Reuse exact existing workspace permission keys. Backend authorization governs resource access and mutation. Unknown permission denies access.

## 9. Rules and validation
Treat network data as untrusted and narrow it. No any, speculative DTO fields or endpoints. Keep HTTP in services, use signals consistently, takeUntilDestroyed for long-lived subscriptions, preserve auth interceptor and in-memory token design, and use existing CSS custom properties.

## 10. UI states
Loading, empty, error/retry, success, saving/disabled, validation, permission denied and stale-request handling where required.

## 11. Responsive and theme
Verify 360–390px, tablet and desktop; light and dark themes; no horizontal overflow; visible focus, keyboard access and reduced-motion respect.

## 12. Acceptance criteria
1. Pending requests show stable loading feedback.
2. Empty lists show helpful empty states.
3. Failed mutations do not show success and preserve safe data.
4. Pending mutations prevent duplicate submissions.
5. Keyboard users can reach and operate controls/dialogs with visible focus.
6. Mobile and both themes remain usable without horizontal overflow.
7. Backend permission/ownership denial does not reveal protected data.
8. Paginated record lists expose working previous/next navigation using server-reported totals.
9. A stale response from a previous route or workspace context cannot overwrite the active section's data.
10. Logout or account changes clear in-memory tenant and permission context.

## Open questions
- UNKNOWN: Confirm test commands and workspace test coverage from package.json and test files.
- UNKNOWN: Manual visual verification requires running frontend and authenticated test accounts for each context.

## Implementation log
- Requirement created on approved branch HG_CODE_IMPROVEMENTS.
- Removed manual Bearer header construction from workspace dashboard API calls so the shared auth interceptor owns API authentication.
- Dashboard summary loading now responds to active workspace context changes and ignores stale responses from an earlier context.
- Workspace context is cleared when the authenticated principal logs out or changes, preventing prior-user tenant and permission state from remaining in memory.
- Added detail rendering for nested record responses while suppressing token, credential, hash and raw-payload fields.
- Added server-backed pagination to workspace record lists and stale-load protection when the user changes section or workspace context.
- Refresh failures now retain already-loaded records in the active section and show inline error feedback rather than replacing the data with a full-page error panel.
