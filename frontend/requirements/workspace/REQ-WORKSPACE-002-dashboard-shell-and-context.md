---
id: REQ-WORKSPACE-002
title: Workspace dashboard shell and context navigation
area: workspace
type: enhancement
owner: frontend
status: draft
---

# Workspace dashboard shell and context navigation

## 1. Problem
The existing dashboard shell already exposes personal, business and platform workspaces. Its context switching, route restoration, navigation visibility and permission handling must behave consistently so users can reach only the workspace actions available to their authenticated context.

## 2. Personas
| Persona | Device | Goal |
| --- | --- | --- |
| Customer | Phone / desktop | Reach personal account tasks |
| Business owner / staff | Tablet / desktop | Switch to an authorized business workspace |
| Platform admin | Desktop | Reach platform administration tools |

## 3. Scope
**In scope:**
- Preserve the existing WorkspaceLayout, dashboard routes, section identifiers and navigation structure.
- Complete context switching using the authenticated user's available contexts.
- Keep navigation aligned with the existing permission snapshot and current workspace context.
- Preserve or safely restore the selected context/section across supported navigation and refresh flows.
- Provide clear loading, empty, error and access-denied states.

**Out of scope:**
- New roles, permission codes, tenant membership mutation or role assignment.
- Treating client-side route guards or hidden navigation as authorization.
- Changing existing route URLs or backend contracts without an approved backend requirement.

## 4. Entry and context
- Routes: existing dashboard route tree under `/dashboard`; preserve current section routes.
- Required params / auth / workspace context: authenticated session; context must be present in the backend-authorized tenant/platform context data.

## 5. Flow
1. Authenticated user enters the dashboard.
2. The shell loads the available authorized contexts and permission snapshot.
3. User selects a context that is actually available to them.
4. Navigation and landing section update to the selected context.
5. On refresh/deep link, the shell validates the requested context and section before rendering.
6. Invalid or unauthorized context falls back to a safe permitted destination and shows appropriate feedback.

## 6. Screens / regions
| Region | Intent | Reuse expectation |
| --- | --- | --- |
| Workspace header/context switcher | Select authorized workspace | Preserve existing shell controls |
| Sidebar/navigation | Show context-relevant sections | Preserve existing navigation groups |
| Main outlet | Render selected section | Preserve existing lazy route structure |
| Access/loading feedback | Explain unavailable state | Reuse existing notices and theme tokens |

## 7. API
| Operation | Method | Path | Envelope | Status |
| --- | --- | --- | --- | --- |
| Restore session / identity | POST | Existing auth restore flow | Existing auth contract | Existing |
| Permission snapshot | POST | `/api/v1/auth/permissions` | `authParam` | Backend catalogue |
| My tenant contexts | POST | `/api/v1/tenants/mine/list` | Existing tenant envelope | Backend catalogue |
| Tenant members/context | POST | `/api/v1/tenants/members/list` | Existing tenant envelope | Backend catalogue |

No new endpoint is approved.

## 8. Permissions
| Action | Permission key | Status |
| --- | --- | --- |
| View dashboard sections | Existing permission snapshot | Reuse; exact keys must be read from implementation/backend |
| Select tenant context | Server-authorized membership | Backend authoritative |
| Platform administration | Platform-scoped authorization | Default deny; exact key UNKNOWN until verified |

## 9. Rules and validation
- Never trust a tenant ID or role supplied by the browser without server authorization.
- Unknown permission codes and unknown sections must be denied or routed to a safe permitted page.
- Keep current URLs and navigation labels unless an existing defect requires a separately approved change.
- Access tokens remain in memory; do not persist them in browser storage.

## 10. UI states
Loading available contexts; empty context list; route/context mismatch; API error with retry; success; permission denied.

## 11. Responsive and theme
Mobile-first context switching and navigation; support 360–390px, tablet and desktop. Preserve light/dark CSS tokens and visible keyboard focus.

## 12. Acceptance criteria
1. Given a user has multiple authorized contexts, when they switch context, then the shell displays the navigation and landing section for that context.
2. Given a user opens a deep link, when the context or section is not authorized, then protected content is not rendered and a safe destination is selected.
3. Given the permission API fails, when the shell initializes, then it does not assume permissions and provides a recoverable error state.
4. Given a user refreshes an authorized section, when session/context restoration succeeds, then the same section remains reachable without bypassing authorization.
5. Given a narrow viewport or keyboard-only navigation, when the user operates the shell, then context and navigation controls remain usable.

## Open questions
- UNKNOWN: exact permission keys and context restoration persistence rules must be confirmed from current frontend/backend contracts before modifying those flows.
- Readiness: Ready with gaps — shell and routes exist; exact permission/context persistence details require code-level verification.

## Implementation log
- Pending implementation.
