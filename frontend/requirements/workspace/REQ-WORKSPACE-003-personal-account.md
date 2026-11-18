---
id: REQ-WORKSPACE-003
title: Personal account workspace
area: workspace
type: enhancement
owner: frontend
status: draft
---

# Personal account workspace

## 1. Problem
Signed-in customers need a reliable place to manage their own profile and addresses and review their orders, enquiries and payment history without seeing another customer's data.

## 2. Personas
| Persona | Device | Goal |
| --- | --- | --- |
| Customer (signed in) | Phone / desktop | Manage account information and review personal activity |

## 3. Scope
**In scope:**
- Existing personal workspace sections: profile, addresses, My Orders, My Enquiries and My Payments.
- Profile read/update using the existing authenticated profile API.
- Address list/create/update/delete/default actions where currently supported by the UI and API.
- Order and enquiry history with detail/thread views where backend contracts exist.
- Payment history and detail using read-only payment APIs.
- Loading, empty, validation, error, success and permission-denied states.

**Out of scope:**
- Payment collection, refunds, invoice generation or order payment confirmation.
- Managing other users' accounts or addresses.
- New account fields or address fields not present in backend DTOs.

## 4. Entry and context
- Routes: preserve existing personal dashboard sections and section identifiers under `/dashboard`.
- Required params / auth / workspace context: authenticated customer identity; address operations must use the selected/authorized business context as required by the backend.

## 5. Flow
1. Customer opens a personal section.
2. UI loads the authenticated profile or personal records.
3. Customer edits profile/address data and submits validated changes, or opens a read-only order/enquiry/payment record.
4. On successful mutation, refresh or update the displayed record from the confirmed API response.
5. On cancel, discard unsaved edits and return to the prior view.
6. On failure, retain safe user input and show actionable error feedback.

## 6. Screens / regions
| Region | Intent | Reuse expectation |
| --- | --- | --- |
| Profile | View/update own profile | Reuse existing profile form |
| Addresses | Manage own address book/default | Reuse existing address form and list |
| Orders | Personal order list/detail | Reuse existing record/list/dialog patterns |
| Enquiries | Personal enquiry list/thread | Reuse existing enquiry patterns |
| Payments | Personal payment history/detail | Read-only presentation |

## 7. API
All operations are POST and use existing module envelopes.
| Operation | Method | Path | Status |
| --- | --- | --- | --- |
| Profile read/update | POST | `/api/v1/auth/profile`, `/api/v1/auth/profile/update` | Backend catalogue |
| Address list/create/update/delete/default | POST | `/api/v1/customers/addresses/{list,create,update,delete,default}` | Backend catalogue |
| My orders list/detail | POST | `/api/v1/orders/list`, `/api/v1/orders/detail` | Backend catalogue |
| My enquiries list/detail | POST | `/api/v1/enquiries/mine/list`, `/api/v1/enquiries/mine/detail` | Backend catalogue |
| My payments list/detail | POST | `/api/v1/payments/mine/list`, `/api/v1/payments/mine/detail` | Backend catalogue |
| Consumer summary | POST | `/api/v1/dashboard/consumer/summary` | Backend catalogue |

## 8. Permissions
| Action | Permission key | Status |
| --- | --- | --- |
| Read/update own profile | Authenticated principal ownership | Backend enforced |
| Read/manage own addresses | Own customer identity + selected tenant scope | Backend enforced |
| Read own orders/enquiries/payments | Resource ownership | Backend enforced |
| Any cross-customer access | UNKNOWN / not allowed | Deny by default |

## 9. Rules and validation
- Use only DTO fields and validation rules established by current services/backend contracts.
- Do not expose records belonging to another customer or tenant.
- Payment records are informational; no payment mutation or confirmation is implied.
- Destructive address actions require confirmation and must reflect the server result.

## 10. UI states
Explicit loading, empty, validation, error/retry, success and permission-denied states for each section.

## 11. Responsive and theme
Mobile-first lists and forms; detail content must not cause horizontal overflow. Preserve light/dark tokens, labels, focus states and touch targets.

## 12. Acceptance criteria
1. Given a customer opens their profile, when the API responds, then only their authenticated profile is displayed.
2. Given a customer creates or updates an address, when the backend confirms success, then the saved record is reflected in the list.
3. Given an address delete/default action fails, when the UI handles the response, then it does not show a false success state.
4. Given a customer opens order, enquiry or payment history, when records exist, then only records authorized for that customer are displayed.
5. Given no records exist, when a history section loads, then a clear empty state is shown.
6. Given a narrow viewport or dark theme, when forms and details render, then they remain usable and readable.

## Open questions
- UNKNOWN: exact frontend response DTOs and detail dialog capabilities must be confirmed against existing API services and live code before refactoring.
- Readiness: Ready with gaps — API catalogue supports these read/manage operations; frontend mappings require code verification.

## Implementation log
- Pending implementation.
