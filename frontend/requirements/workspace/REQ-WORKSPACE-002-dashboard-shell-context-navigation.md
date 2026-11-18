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
Reuse exact existing keys: BUSINESS_PROFILE_MANAGE, CATALOGUE_MANAGE, CUSTOMERS_MANAGE, ENQUIRIES_MANAGE, ORDERS_MANAGE, PAYMENTS_VIEW, PROMOTIONS_MANAGE, SUBSCRIPTIONS_MANAGE, TENANT_MEMBERS_VIEW, ANALYTICS_VIEW, PLATFORM_USERS_MANAGE, BUSINESS_APPROVE, SUBSCRIPTIONS_APPROVE, CATEGORIES_MANAGE, MODERATION_MANAGE, SYSTEM_HEALTH_VIEW. Unknown permission denies access. Personal GLOBAL navigation remains as currently implemented.

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
4. Missing/unknown permission does not expose a protected destination.
5. Existing dashboard URLs and public/storefront shell behaviour remain unchanged.
6. Unauthenticated requests to `/dashboard` and its child routes are redirected to `/login` after the startup session-restore attempt.

## Open questions
- None for the authentication guard. Context-specific authorization continues to rely on existing server-provided permissions and backend enforcement.

## Implementation log
- Requirement created on approved branch HG_CODE_IMPROVEMENTS.
- Added `authenticatedWorkspaceGuard` to the `/dashboard` parent route. It checks the existing `AuthService.isAuthenticated()` state after the app initializer's session-restore attempt and redirects unauthenticated users to `/login`.
- Preserved all existing dashboard paths and context/permission semantics. Build and browser verification remain pending.
