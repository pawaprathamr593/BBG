---
id: REQ-WORKSPACE-005
title: Platform administration workspace
area: workspace
type: enhancement
owner: frontend
status: draft
---

# Platform administration workspace

## 1. Problem
Platform operators need a controlled workspace for reviewing users, business and subscription applications, managing marketplace categories and moderation, and viewing operational summaries. Platform actions must remain separate from tenant permissions.

## 2. Personas
| Persona | Device | Goal |
| --- | --- | --- |
| Platform admin | Desktop / tablet | Review and administer platform-level records safely |

## 3. Scope
**In scope:**
- Platform user list/detail and supported suspend/restore actions.
- Pending business queue, detail, approve/reject/reopen where API supports.
- Pending and active subscription review, detail, approve/reject and BCN display where returned.
- Marketplace category list/create/update/delete/statistics.
- Moderation queue, supported actions and history.
- Platform analytics summary/trends where implemented in UI.
- Safe system health summary.
- Explicit confirmation, audit-friendly feedback and error handling.

**Out of scope:**
- Tenant member/role administration.
- Payment QR/UPI configuration until a backend contract exists.
- Gateway payment collection, reconciliation, refunds or automated paid status.
- Moderation of target types not supported by backend policy.
- Exposing secrets, environment variables or sensitive infrastructure details in health UI.

## 4. Entry and context
- Routes: preserve current platform sections under `/dashboard`: platform users, business approval, subscription approval, categories, moderation, platform analytics and system health.
- Required params / auth / workspace context: authenticated platform-scoped operator; backend requires PLATFORM_ADMIN role and relevant authorization.

## 5. Flow
1. Platform admin opens a queue or management section.
2. UI loads paginated/list data and displays only permitted actions.
3. Admin opens a detail view and reviews server-provided information.
4. Admin confirms an action and submits the existing API request.
5. UI updates only after backend success and refreshes the affected record/queue.
6. On failure, keep the record state unchanged and show a safe error.
7. Health and analytics views expose only safe summary information.

## 6. Screens / regions
| Region | Intent | Reuse expectation |
| --- | --- | --- |
| Platform users | Search/list/detail and suspend/restore | Existing list/dialog patterns |
| Business approvals | Review queue/detail/decision | Existing review dialog |
| Subscription approvals | Review proof/detail/decision and BCN | Existing subscription detail and BCN presentation |
| Categories | Category list and supported CRUD | Existing category form |
| Moderation | Queue/action/history | Existing moderation list/action pattern |
| Analytics | Platform summary/trends | Existing metric/chart patterns |
| System health | Safe operational summary | Existing health summary view |

## 7. API
All routes are existing POST contracts in backend API V1 catalogue:
| Operation | Path | Status |
| --- | --- | --- |
| Users list/detail/suspend/restore | `/api/v1/admin/users/list`, `detail`, `suspend`, `restore` | Documented |
| Business review | `/api/v1/admin/businesses/pending/list`, `detail`, `approve`, `reject`, `reopen` | Documented |
| Subscription review | `/api/v1/admin/subscriptions/pending/list`, `detail`, `approve`, `reject`, `active/list` | Documented |
| Categories | `/api/v1/admin/categories/list`, `create`, `update`, `delete`, `stats` | Documented |
| Analytics | `/api/v1/admin/analytics/summary`, `trends` | Documented |
| Moderation | `/api/v1/admin/moderation/queue`, `action`, `history` | Documented |
| Safe health | `/api/v1/admin/health/summary` | Documented |
| Payment QR configuration | Existing frontend call(s) | UNKNOWN — not in backend catalogue |

## 8. Permissions
| Action | Permission key | Status |
| --- | --- | --- |
| Platform admin sections | Platform-scoped authorization | Backend default-deny; exact permission keys UNKNOWN until verified |
| User/business/subscription/category/moderation mutations | Corresponding platform action permission | Verify exact keys; no new keys |
| Payment QR configuration | UNKNOWN | Not supported; do not expose as an operational feature |

## 9. Rules and validation
- Platform authority is distinct from tenant membership; tenant roles never imply platform access.
- Backend authorization is authoritative; frontend navigation is not a security boundary.
- Destructive or irreversible actions require confirmation and a reason where required by the existing API.
- Do not invent request fields, moderation target types or workflow transitions.
- Health responses must remain safe and must not reveal credentials, tokens or secret configuration.
- BCN is displayed only when returned for an approved subscription; frontend does not generate it.

## 10. UI states
Loading, empty queue, detail loading, action pending, success, failure/retry, permission denied and safe health-unavailable states.

## 11. Responsive and theme
Desktop-first admin tables remain usable on tablet/mobile through existing responsive patterns. Preserve theme tokens, accessible focus and semantic action labels.

## 12. Acceptance criteria
1. Given a non-platform user opens a platform route, when authorization is evaluated, then platform data/actions remain inaccessible.
2. Given an authorized admin approves/rejects a business or subscription, when the backend confirms the action, then the queue/detail reflects the confirmed state.
3. Given an admin reviews an approved subscription, when the backend returns a BCN, then the exact BCN is displayed without client-side generation.
4. Given an admin suspends/restores a user or manages a category, when the mutation fails, then the UI does not show success or assume the record changed.
5. Given moderation reports exist, when the queue/history loads, then only supported target types and actions are presented.
6. Given the health summary is displayed, when the response contains operational data, then secrets and sensitive configuration are not exposed.
7. Given payment QR configuration is not part of the backend API contract, when the admin workspace renders, then it is not presented as a working save/configuration feature.

## Open questions
- UNKNOWN: exact platform permission keys must be verified against current backend role/permission seed and frontend permission service.
- UNKNOWN: frontend payment QR configuration API has no documented backend counterpart and is excluded pending approval.
- Readiness: Ready with gaps — primary platform operations are documented; payment QR settings are blocked and permission identifiers require verification.

## Implementation log
- Pending implementation.
