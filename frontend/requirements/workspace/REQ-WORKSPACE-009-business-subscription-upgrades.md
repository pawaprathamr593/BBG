---
id: REQ-WORKSPACE-009
title: Business subscription upgrades and plan changes
area: workspace
type: enhancement
owner: unset
status: draft
---

# Business subscription upgrades and plan changes

## 1. Problem

The current subscription workflow supports plan listing, subscription requests, renewals and manual payment-proof review. It does not yet provide a complete upgrade lifecycle for an already active business. An owner must be able to request an upgrade without losing the existing active subscription while the new payment is reviewed.

## 2. Personas

| Persona | Device | Goal |
| --- | --- | --- |
| Business owner / authorized subscription manager | Mobile, tablet, desktop | Compare plans and request an upgrade for the active business |
| Platform administrator | Desktop, tablet, mobile | Review upgrade payment and activate the new plan |
| Authorized business member | Mobile, tablet, desktop | View the current plan and upgrade status when permitted |

## 3. Scope

**In scope:** Show current plan, billing period, dates, entitlements and pending upgrade; compare active plans; request an eligible upgrade; use existing QR instructions and S3 receipt upload; capture immutable QR snapshot; show pending/approved/rejected upgrade history; keep current plan active until approval; activate the new plan atomically after approval; refresh workspace entitlements.

**Out of scope:** Automated gateway settlement; automatic downgrade/cancellation/refund; proration/credit/partial refund until decided; plan price editing and QR configuration; initial business onboarding (REQ-WORKSPACE-008).

## 4. Entry and context

- Route: existing /dashboard/subscriptions.
- Requires an active server-authorized business tenant and exact subscription-management permission.
- Tenant ID is resolved from active authorized workspace context and is never trusted merely because it is present in a client payload.

## 5. Flow

1. Owner opens Subscriptions and sees active plan and benefits.
2. Owner selects Upgrade plan.
3. System lists eligible active plans and identifies the current plan.
4. Owner selects a plan and reviews server-calculated price, billing period and effective-date policy.
5. System creates a pending upgrade request and captures current QR instructions.
6. Owner pays, enters reference and uploads receipt.
7. Owner submits proof and sees pending review status.
8. Admin reviews and approves/rejects.
9. Until approval, the old active subscription remains effective.
10. On approval, backend activates the new plan, preserves old subscription history and refreshes entitlements.
11. On rejection, old plan remains active and owner sees reason/resubmission policy.

## 6. Screens / regions

| Region | Intent | Reuse expectation |
| --- | --- | --- |
| Current plan summary | Show plan, period, entitlements and status | Existing subscription module |
| Plan comparison | Compare eligible plans | Existing plan cards |
| Payment QR/instructions | Show captured QR version and payee | Existing payment instruction pattern |
| Receipt upload | Upload proof and enter reference | Existing S3 proof workflow |
| Upgrade history | Show pending and historical plan changes | Existing subscription history/review data |
| Admin review | Review upgrade proof | Existing subscription review drawer |

## 7. API

| Operation | Method | Path | Envelope | Status |
| --- | --- | --- | --- | --- |
| List plans | POST | /api/v1/subscriptions/plans/list | subscriptionParam | Existing |
| List my subscriptions | POST | /api/v1/subscriptions/mine/list | subscriptionParam | Existing |
| Subscription detail | POST | /api/v1/subscriptions/mine/detail | subscriptionParam | Existing |
| Request plan change/upgrade | POST | /api/v1/subscriptions/request | subscriptionParam | Existing route; verify active-subscription conflict and upgrade semantics |
| Request proof upload URL | POST | /api/v1/subscriptions/proofs/upload-url | subscriptionParam | Existing |
| Submit proof | POST | /api/v1/subscriptions/proofs/submit | subscriptionParam | Existing |
| Admin pending/detail/approve/reject | POST | Existing /api/v1/admin/subscriptions/* routes | adminParam | Existing; verify plan-change review handling |
| Upgrade quote/effective-date calculation | POST | UNKNOWN | subscriptionParam | Add only if existing plan API cannot provide server-calculated quote |

Do not assume a new endpoint or DTO field. Verify the current backend request action and subscription state machine first.

## 8. Permissions

| Action | Permission key | Status |
| --- | --- | --- |
| View plan/history | subscription.view | Existing candidate; verify backend |
| Request upgrade/submit proof | subscription.create / subscription.update | Existing candidates; verify backend |
| Approve/reject upgrade | Platform admin permission | UNKNOWN; inspect admin authorization |

## 9. Rules and validation

- Follow BBG Yii 3 and Angular 22 coding standards.
- Backend determines eligible plans, price, currency, billing period and entitlements.
- Never trust plan price, amount, tenant ID or entitlement values from browser input.
- Only one unresolved upgrade/payment request per tenant unless product policy explicitly allows multiple.
- Do not deactivate or mutate current active subscription when an upgrade is merely requested or proof is uploaded.
- Approval is idempotent and transactional. Preserve prior subscriptions and review history.
- Effective date/proration policy is UNKNOWN and must be decided before implementation.
- Use status Z for soft deletion; never physically delete subscription history.
- Refresh workspace permission/entitlement state only after server confirms approval and new subscription is effective.

## 10. UI states

Loading, no active subscription, current plan, plan comparison, request pending, payment pending, proof submitted, under review, approved, rejected, upload error, permission denied and retryable server error.

## 11. Responsive and theme

Reuse current BBG plan cards, workspace drawer and responsive patterns. Support mobile/tablet/desktop, light/dark themes, keyboard access and reduced motion.

## 12. Acceptance criteria

1. Given a tenant with an active subscription, when an authorized owner opens Subscriptions, then the current plan and entitlements are displayed.
2. Given eligible upgrade plans, when the owner selects one, then backend validates eligibility and calculates the amount.
3. Given a pending upgrade request, when payment proof is submitted, then current active subscription remains unchanged.
4. Given an administrator rejects the upgrade, then old subscription remains active and rejection reason is visible.
5. Given an administrator approves the upgrade, then new subscription becomes effective atomically and old subscription remains in history.
6. Given an approved plan change, when owner returns to workspace, then UI reflects new plan entitlements without stale navigation state.
7. Given duplicate submissions/retries, then no duplicate active subscription or review decision is created.

## Open questions

- UNKNOWN: Upgrade effective date: immediate on approval or next billing cycle?
- UNKNOWN: Proration, credit for unused time, tax and amount-difference policy.
- UNKNOWN: Whether downgrade is in scope now or only upgrade.
- UNKNOWN: Whether existing /subscriptions/request action can safely support upgrades without changing contract.
- UNKNOWN: Platform permission code for subscription approval.

## Implementation log

- Requirement drafted on feature/business-onboarding-lifecycle.
- No application code or database migration changed in this draft.
