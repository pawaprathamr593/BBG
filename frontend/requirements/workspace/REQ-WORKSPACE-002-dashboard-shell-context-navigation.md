---
id: REQ-WORKSPACE-002
title: Workspace shell, context switching and permission-aware navigation
area: workspace
type: enhancement
owner: unset
status: in-progress
---

# Workspace shell, context switching and permission-aware navigation

## 1. Problem
Authenticated users need a consistent shell for Personal, Business and Platform contexts. The existing shell already implements much of this; complete and verify it without replacing existing routes or interactions.

## 2. Personas
| Persona | Device | Goal |
| --- | --- | --- |
| Consumer | Mobile, tablet, desktop | Reach personal account activity |
| Business member | Mobile, tablet, desktop | Switch to an authorized tenant and its tools |
| Platform Admin | Tablet, desktop | Access platform administration |

## 3. Scope
**In scope:** Preserve /dashboard and existing child routes; verify context initialization/switching; render navigation from server-provided memberships and exact existing permissions; handle loading, empty, failure and denied states; preserve filter/query state.
**Out of scope:** New roles, permission codes, backend authorization changes, new routes or public/storefront changes.

## 4. Entry and context
Routes: existing /dashboard and /dashboard/:section. Requires authenticated session. Business context requires tenant membership; Platform context requires platform-scoped permission.

## 5. Flow
1. Initialize session, memberships and permission snapshot.
2. Render only contexts available to the user.
3. On context selection, prevent duplicate switching and validate tenant selection against server-provided memberships.
4. On success navigate to /dashboard in the selected context.
5. On failure retain prior context and show an actionable error.
6. Direct navigation must not bypass backend authorization.

## 6. Screens / regions
| Region | Intent | Reuse expectation |
| --- | --- | --- |
| Topbar / identity | Brand and active context | Existing workspace shell |
| Context selector | Personal, Business, Platform | Existing selector |
| Navigation | Context- and permission-aware links | Existing nav definitions |
| Breadcrumbs / filters | Route orientation and filters | Existing shell and FilterDrawer |

## 7. API
| Operation | Method | Path | Action | Status |
| --- | --- | --- | --- | --- |
| Profile/session | POST | /api/v1/auth/profile | getProfile | Existing |
| Permissions | POST | /api/v1/auth/permissions | getPermissions | Existing |
| Membership list | POST | /api/v1/tenants/mine/list | listMyTenants | Existing |
| Tenant detail | POST | /api/v1/tenants/mine/detail | getMyTenant | Existing |

## 8. Permissions
Use the seeded permission catalogue returned by `getPermissions`: tenant view keys include `business.view`, `catalogue.view`, `customer.view`, `enquiry.view`, `order.view`, `payment.view`, `promotion.view`, `subscription.view`, `tenant.view` and `report.view`; platform view/review keys include `user.view`, `business.approve`, `subscription.approve`, `admin.view` and `report.view`; consumer keys include `user.view`, `order.own.view` and `enquiry.own.view`. `CONSUMER` rows may be returned with `PLATFORM` scope by the current demo seed and are treated as Personal-only in the frontend; they must never grant Platform Administration context. Unknown permission denies access. The SQL seed labels this matrix as a proposed starter policy. The current backend role-permission response does not itself apply plan-entitlement filtering.

## 9. Rules and validation
Backend authorization is authoritative. Never trust browser-supplied tenant IDs without membership and backend checks. Tenant roles do not imply Platform access. Do not persist access tokens in browser storage. Preserve route paths and shell behaviour.

## 10. UI states
Loading during initialization/switch; empty when no optional context exists; error with previous context retained; success after server-confirmed switch; denied for unavailable context/permission.

## 11. Responsive and theme
Preserve existing mobile navigation, touch targets, keyboard operation, visible focus and light/dark tokens.

## 12. Acceptance criteria
1. Only server-authorized contexts are selectable.
2. Successful switching updates shell and navigation.
3. Failed switching retains previous context and shows an error.
4. Missing/unknown permission does not expose a protected destination, including through direct URL navigation.
5. Existing dashboard URLs and public/storefront shell behaviour remain unchanged.
6. Unauthenticated requests to `/dashboard` and its child routes are redirected to `/login` after the startup session-restore attempt.

## Open questions
- None for the authentication guard. Context-specific authorization continues to rely on existing server-provided permissions and backend enforcement.

- Isolated `CONSUMER` permission rows from Platform Administration context; the demo seed's `PLATFORM` scope is treated as Personal-only in the UI pending correction of the seed/backend role-scope mismatch.
## Implementation log
- Added a shared workspace navigation registry so the sidebar and overview use the same context and permission filtering.
- Replaced legacy synthetic permission names with exact seeded view/review permission codes; the Platform Admin and Platform Super Admin contexts remain separated from Consumer permissions.
- Added an explicit empty-permissions state on the overview rather than silently presenting an empty workspace.
- Fixed principal-change detection so session restoration's initial null user ID to loaded profile ID does not clear workspace initialization.
- Requirement created on approved branch HG_CODE_IMPROVEMENTS.
- Added `authenticatedWorkspaceGuard` to the `/dashboard` parent route. It checks the existing `AuthService.isAuthenticated()` state after the app initializer's session-restore attempt and redirects unauthenticated users to `/login`.
- Added `workspacePermissionGuard` to child routes. It checks the active Personal, Business or Platform context against the exact existing permission keys; Personal activity sections remain available without invented GLOBAL permission codes. Unknown or out-of-context sections redirect to `/dashboard`.
- Preserved all existing dashboard paths and context/permission semantics. Build and browser verification remain pending.
- Fixed dashboard summary refresh when switching between Personal and Platform contexts, which both have a null tenant ID. Summary requests are now invalidated when context changes so a late response from the previous context cannot repopulate stale summary data.
