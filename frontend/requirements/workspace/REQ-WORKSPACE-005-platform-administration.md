---
id: REQ-WORKSPACE-005
title: Platform administration workspace
area: workspace
type: enhancement
owner: unset
status: in-progress
---

# Platform administration workspace

## 1. Problem
Authorized Platform Admins need a controlled workspace for user administration, business/subscription review, categories, moderation, analytics and safe operational health.

## 2. Personas
| Persona | Device | Goal |
| --- | --- | --- |
| Platform Admin | Desktop, tablet | Review platform records and perform authorized decisions |

## 3. Scope
**In scope:** Users list/detail/suspend/restore; business approval queue/detail/approve/reject/reopen; subscription pending/active/detail/approve/reject; categories list/create/update/delete/stats; moderation queue/action/history; analytics summary/trends; safe health summary.
**Out of scope:** Assigning platform roles; gateway/refunds/reconciliation; secrets/raw infrastructure data; unsupported moderation targets or new endpoints. Payment QR configuration is in scope because its routes and backend workers exist on this branch; it only configures instructions for new subscription requests and does not settle payments.

## 4. Entry and context
Existing /dashboard/platform-users, /dashboard/business-approval, /dashboard/subscription-approval, /dashboard/categories, /dashboard/moderation, /dashboard/platform-analytics and /dashboard/system-health. Requires trusted platform-scoped role and permissions.

## 5. Flow
1. Switch to Platform context.
2. Open a queue/list and inspect detail.
3. Select a supported action; confirm destructive/decision actions and provide required reason.
4. Submit existing API operation.
5. Refresh affected queue/detail/summary only on success; preserve record and show safe error on failure.
6. Review moderation history and safe health summary.

## 6. Screens / regions
| Region | Intent | Reuse expectation |
| --- | --- | --- |
| Platform users | Search/detail/suspend/restore | Existing list/dialog |
| Business approvals | Review decisions | Existing queue/detail |
| Subscription approvals | Inspect proof and decide | Existing review dialog |
| Categories | Taxonomy management | Existing category form/list |
| Moderation | Queue/actions/history | Existing moderation UI |
| Analytics | Platform metrics | Existing summary/charts |
| System health | Safe operational status | Existing summary |

## 7. API
| Operation | Method | Path | Action | Status |
| --- | --- | --- | --- | --- |
| Users | POST | /api/v1/admin/users/list, detail, suspend, restore | Admin user actions | Existing |
| Business reviews | POST | /api/v1/admin/businesses/pending/list, detail, approve, reject, reopen | Business review actions | Existing |
| Subscription reviews | POST | /api/v1/admin/subscriptions/pending/list, detail, approve, reject, active/list | Subscription review actions | Existing |
| Categories | POST | /api/v1/admin/categories/list, create, update, delete, stats | Category actions | Existing |
| Moderation | POST | /api/v1/admin/moderation/queue, action, history | Moderation actions | Existing |
| Analytics | POST | /api/v1/admin/analytics/summary, trends | Analytics actions | Existing |
| Safe health | POST | /api/v1/admin/health/summary | getSafeSystemHealth | Existing |
| Payment QR settings read/upload/save | POST | /api/v1/admin/subscriptions/payment-qr/current, /upload-url, /save | getCurrentPaymentQrConfig, generatePaymentQrUploadUrl, savePaymentQrConfig | Route registry and backend workers exist on this branch; API V1 catalogue is stale and must be reconciled separately |

## 8. Permissions
Reuse existing keys: PLATFORM_USERS_MANAGE, BUSINESS_APPROVE, SUBSCRIPTIONS_APPROVE, CATEGORIES_MANAGE, MODERATION_MANAGE, ANALYTICS_VIEW, SYSTEM_HEALTH_VIEW. Backend platform authorization is mandatory.

## 9. Rules and validation
Do not assign platform roles in frontend. Follow backend lifecycle and reason requirements. Proof is evidence, not approval. Category deletion follows dependency rules. Moderation actions limited to supported targets. Health output must not expose secrets. No QR settings request/form without an approved API contract.

## 10. UI states
Loading, empty, error/retry, permission denied, detail loading, mutation pending, success and failed decision. Confirm destructive actions and prevent duplicate submissions.

## 11. Responsive and theme
Review screens remain usable on tablet/mobile; preserve theme tokens, focus and keyboard accessibility.

## 12. Acceptance criteria
1. Unauthorized users cannot access platform data; backend denies requests.
2. Admin queues show only API-returned records.
3. Successful decisions refresh server-confirmed lifecycle state.
4. Failed decisions never show false success.
5. Subscription proof is reviewed through existing admin APIs.
6. Payment QR configuration uses the branch-implemented read, presigned upload and save operations; it never marks a customer order or payment as settled.
7. Health UI exposes only safe summary data.

## Open questions
- UNKNOWN: Confirm exact admin request DTO fields and reason requirements against backend workers.
- The API V1 catalogue does not yet document payment QR routes, although the route registry and AdminServices workers implement them on this branch. Reconcile the catalogue in a backend documentation task.

## Implementation log
- Requirement created on approved branch HG_CODE_IMPROVEMENTS.
