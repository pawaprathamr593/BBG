---
id: REQ-WORKSPACE-003
title: Personal account profile, addresses and activity
area: workspace
type: enhancement
owner: unset
status: in-progress
---

# Personal account profile, addresses and activity

## 1. Problem
Consumers need a Personal workspace to manage their own profile and addresses and review their marketplace activity without access to tenant or platform records.

## 2. Personas
| Persona | Device | Goal |
| --- | --- | --- |
| Consumer / account holder | Mobile, tablet, desktop | Manage own profile, addresses, orders, enquiries and payments |

## 3. Scope
**In scope:** Own profile read/update; own customer profile and address list/create/update/delete/default; own order and enquiry lists/details; consumer summary; clear loading, empty, error and success feedback. The own-payment API exists, but My Payments is not exposed until the seed defines a matching consumer permission.
**Out of scope:** Other customers' records, tenant-wide directory, tenant order actions, business enquiry responses, payment gateway, refunds or new fields/endpoints.

## 4. Entry and context
Existing /dashboard, /dashboard/customers, /dashboard/orders and /dashboard/enquiries. `/dashboard/payments` remains unavailable in Personal context because the seed has no consumer own-payment permission. Requires authenticated Personal context; APIs scope data to the authenticated principal.

## 5. Flow
1. Open Personal context.
2. Load consumer summary.
3. Open profile/address section and manage own data.
4. Confirm destructive address actions; refresh after successful mutation.
5. Review own orders, enquiries and payments and available details.
6. On failure show safe API feedback without false success.

## 6. Screens / regions
| Region | Intent | Reuse expectation |
| --- | --- | --- |
| Overview | Consumer summary and shortcuts | Existing dashboard |
| Profile | Own name/email/mobile | Existing auth profile form |
| Addresses | Own address book | Existing address form/dialog |
| Activity | Orders, enquiries, payments | Existing record lists/details |

## 7. API
| Operation | Method | Path | Action | Status |
| --- | --- | --- | --- | --- |
| Profile read/update | POST | /api/v1/auth/profile, /api/v1/auth/profile/update | getProfile, updateProfile | Existing |
| Customer profile | POST | /api/v1/customers/profile | getMyCustomerProfile | Existing |
| Address operations | POST | /api/v1/customers/addresses/list, create, update, delete, default | Customer address actions | Existing |
| Consumer summary | POST | /api/v1/dashboard/consumer/summary | getConsumerDashboard | Existing |
| Own orders | POST | /api/v1/orders/list, /api/v1/orders/detail | listMyOrders, getMyOrder | Existing |
| Own enquiries | POST | /api/v1/enquiries/mine/list, /api/v1/enquiries/mine/detail | listMyEnquiries, getMyEnquiry | Existing |
| Own payments | POST | /api/v1/payments/mine/list, /api/v1/payments/mine/detail | listMyPayments, getMyPayment | Existing |

## 8. Permissions
Personal navigation uses the seeded consumer permissions `user.view`, `user.update`, `order.own.view` and `enquiry.own.view`, with backend ownership checks remaining authoritative. The seed contains no own-payment permission, so My Payments is not exposed by the workspace navigation or Personal route guard until the permission catalogue and backend policy define one. The seed assigns the demo Consumer role with `PLATFORM` scope, while `AuthDao::assignConsumerRole` currently looks up a `GLOBAL` Consumer role; fresh registration role assignment must be reconciled in the backend.

## 9. Rules and validation
Use existing DTOs and envelopes. Server resolves current user. Preserve address ownership/default semantics. Do not show tenant actions in Personal context. Proof/QR must never imply payment settlement.

## 10. UI states
Loading, empty, error/retry, validation, saving/disabled, success and permission denied. Confirm destructive actions.

## 11. Responsive and theme
Mobile-first forms and lists; no horizontal overflow; preserve keyboard access, touch targets and theme tokens.

## 12. Acceptance criteria
1. Personal data displays only records authorized for the current principal.
2. Successful address mutation refreshes the list.
3. Failed mutation shows an error and no false success.
4. Own activity lists use the authenticated user's records.
5. Personal context exposes no tenant management actions.

## Open questions
- UNKNOWN: Verify exact DTO fields and detail response shapes from current feature calls before modifying models/forms.

## Implementation log
- Requirement created on approved branch HG_CODE_IMPROVEMENTS.
- Added personal profile editing through the existing auth profile update API.
- Added saved-address editing through the existing customer address update API; existing create/default/delete actions remain intact.
- Added detail views for the current user's order, enquiry and payment records using the existing `getMyOrder`, `getMyEnquiry` and `getMyPayment` routes/actions.
- Added previous/next pagination to personal order and enquiry lists, using the backend pagination totals.
- Personal navigation now requires the corresponding seeded consumer view permission; My Payments is hidden because the seed has no consumer own-payment permission.
