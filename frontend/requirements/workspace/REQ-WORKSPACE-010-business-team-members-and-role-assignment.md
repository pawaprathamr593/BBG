---
id: REQ-WORKSPACE-010
title: Business team invitations and tenant role assignment
area: workspace
type: enhancement
owner: unset
status: draft
---

# Business team invitations and tenant role assignment

## 1. Problem

The Business Workspace currently supports viewing tenant members, but not adding members or assigning tenant-scoped roles. Owners need to add an existing BBG account or invite a person who does not yet have an account, then grant only the role needed in the selected business.

A user's global BBG identity must remain separate from tenant membership and tenant roles. Being a member in one business must not block the user from joining another business, and a role in one tenant must never grant access to another tenant.

## 2. Personas

| Persona | Device | Goal |
| --- | --- | --- |
| Business owner / authorized tenant administrator | Mobile, tablet, desktop | Add a team member and assign an allowed role in the active business |
| Existing BBG account holder | Mobile, tablet, desktop | Join another business without creating a duplicate account |
| New team member | Mobile, tablet, desktop | Complete account registration and join the inviting business |
| Platform administrator | Desktop, tablet | Retain platform-level oversight without implicit tenant access |

## 3. Scope

**In scope:**

- Add a member from the Business Workspace by entering an email address.
- For an existing BBG account, resolve the account securely, display minimum identifying information, and add the user to the active tenant with a selected allowed tenant role.
- For an email not associated with an account, create an invitation/registration flow. The invitee completes account registration and is assigned to the tenant only after invitation validation and acceptance.
- List members with membership status and tenant role assignments.
- Allow authorized tenant administrators to change or revoke tenant role assignments and deactivate membership, subject to an agreed role policy.
- Preserve one global user identity across multiple businesses.
- Use tenant-scoped TENANT_MEMBERSHIPS and USER_ROLE_ASSIGNMENTS; never create platform/global roles to represent business membership.
- Reuse the existing Team & Access route, workspace drawer and member list presentation.

**Out of scope:** Assigning platform administrator roles from a business workspace; changing global credentials/personal profile from tenant management; cross-tenant member discovery; plan-based seat limits until entitlements are defined; payroll, attendance and HR management.

## 4. Entry and context

- Route: existing /dashboard/members.
- Requires an active business workspace and server-authorized tenant membership.
- Tenant ID is resolved from authenticated workspace context and validated by backend for every operation.
- Member actions are available only to authorized tenant owners/administrators; exact permission keys must be confirmed from permission seeds and backend checks.

## 5. Flow

### Existing account

1. Owner opens Team & Access and chooses Add member.
2. Owner enters an email address.
3. Backend performs a tenant-authorized, rate-limited exact-email lookup.
4. If user exists, frontend displays minimal confirmation (for example name and masked email).
5. Owner selects an allowed tenant role and confirms.
6. Backend creates/reactivates tenant membership and inserts the tenant-scoped role assignment without changing roles in other tenants.
7. Member appears in the team list.

### New account

1. Owner enters an email address not associated with an account.
2. Owner selects an allowed role and sends an invitation.
3. Backend creates a time-limited, single-use invitation and sends a registration/acceptance link through the configured notification channel.
4. Invitee registers or signs in, verifies the email and accepts invitation.
5. Backend creates/reactivates tenant membership and assigns the selected tenant role atomically.
6. Member appears in the team list. Expired/revoked invitations cannot be accepted.

### Role change / removal

1. Authorized owner selects a member and chooses Change role or Remove access.
2. Backend validates actor authority and prevents removing the last active tenant owner.
3. Backend updates/revokes only the selected tenant's assignment/membership.
4. Other tenant memberships and roles remain unchanged.

## 6. Screens / regions

| Region | Intent | Reuse expectation |
| --- | --- | --- |
| Team list | Show current members, membership and roles | Existing /dashboard/members and tenant members API |
| Add member drawer | Email lookup, role selection and confirmation | Existing shared WorkspaceDrawer |
| Invitation status | Show invitation state and expiry | Existing record/status patterns |
| New-user registration | Complete account registration and accept invitation | Existing authentication/register feature |
| Member role drawer | Change allowed tenant roles | Existing shared drawer and typed forms |

## 7. API

| Operation | Method | Path | Envelope | Status |
| --- | --- | --- | --- | --- |
| List members | POST | /api/v1/tenants/members/list | tenantParam | Existing, read-only |
| Resolve account by email | POST | UNKNOWN | tenantParam | Required; tenant-authorized and privacy-safe |
| Create invitation | POST | UNKNOWN | tenantParam | Required |
| List/revoke/resend invitations | POST | UNKNOWN | tenantParam | Required |
| Accept invitation | POST | UNKNOWN | authParam or invitation-specific envelope | Required; contract UNKNOWN |
| Change tenant role | POST | UNKNOWN | tenantParam | Required |
| Revoke membership | POST | UNKNOWN | tenantParam | Required |

Do not invent endpoint names, envelope keys, request fields or permission codes. Confirm API naming and contracts before frontend integration.

## 8. Permissions

| Action | Permission key | Status |
| --- | --- | --- |
| View members | tenant.view | Existing candidate; verify exact backend check |
| Add/invite member | UNKNOWN | New permission or confirm existing |
| Change tenant role | UNKNOWN | New permission or confirm existing |
| Revoke member access | UNKNOWN | New permission or confirm existing |
| Accept invitation | Invitation token + authenticated/verified email | New authorization rule |

Backend checks active tenant, actor role-management authority, target role scope and tenant ownership. Frontend visibility is not authorization.

## 9. Rules and validation

- Follow BBG Yii 3 and Angular 22 coding standards.
- Email lookup is exact, normalized and rate-limited. Do not expose full user records or allow unrestricted account enumeration.
- A user is a global identity; membership and roles are tenant-specific.
- Only active TENANT roles may be assigned. PLATFORM roles and platform Consumer roles are never assignable from tenant management.
- Exact assignable-role matrix is UNKNOWN. A tenant owner must not grant a role above their authority or create another owner unless explicitly allowed.
- Invitation tokens are random, stored hashed, single-use and time-limited; invalidate on acceptance, revocation or expiry.
- Invitation acceptance verifies the email matches the invited address.
- Existing users must not receive duplicate global accounts. Membership and assignment operations are idempotent.
- Prevent removal/demotion of the last active tenant owner.
- Membership and role changes are tenant-scoped, audited and soft-deleted with status Z rather than physically deleted.
- Never trust browser-supplied tenant, role or user IDs without server-side authorization.

## 10. UI states

Loading, lookup pending, existing user found, no account found, invitation sent, invitation expired, already a member, role unavailable, permission denied, saving, success and retryable error.

## 11. Responsive and theme

Reuse existing Team & Access layout and drawer. Support mobile/tablet/desktop, light/dark themes, keyboard-accessible lookup/role selection and accessible feedback.

## 12. Acceptance criteria

1. Given an authorized owner in Business A, when they add an existing BBG user, then the user is added to Business A with the selected tenant role and existing roles in other tenants remain unchanged.
2. Given an email has no BBG account, when the owner sends an invitation, then a single-use, expiring invitation is created and no global user is created prematurely.
3. Given an invitee accepts a valid invitation using the invited email, then one global user account (if needed), one tenant membership and selected tenant role assignment are created atomically.
4. Given an invitation is expired, revoked or addressed to another email, when accepted, then backend rejects it.
5. Given a user already belongs to the tenant, when the owner attempts to add them again, then no duplicate active membership or role assignment is created.
6. Given a user has roles in multiple tenants, when one tenant role is changed or revoked, then other tenant assignments are unchanged.
7. Given a tenant owner attempts to assign a PLATFORM role or a role above their authority, then backend rejects the request.
8. Given a tenant has only one active owner, when that owner attempts to remove or demote themselves, then backend prevents loss of the last active owner.
9. Given an unauthorized tenant member calls a member-management endpoint directly, then backend rejects the action regardless of frontend visibility.
10. Given a member list is loaded, then only members of the active authorized tenant are returned.

## Open questions

- UNKNOWN: Should existing-account members be added immediately after owner confirmation, or also receive/accept an invitation?
- UNKNOWN: For a new email, should the owner create a pending invite (recommended) or directly create the user with a temporary credential? Recommended: invitation + self-registration; never ask the owner to set another person's password.
- UNKNOWN: Exact role assignability matrix, including whether TENANT_OWNER and manager roles can be assigned by a tenant owner.
- UNKNOWN: Exact permission keys and whether current tenant-owner permissions include member management.
- UNKNOWN: Invitation delivery provider/configuration, expiry duration, resend limits and email verification policy.
- UNKNOWN: Plan-based seat limits and whether member count is included in plan entitlements.

## Implementation log

- Requirement drafted on feature/business-onboarding-lifecycle.
- Current API exposes a read-only tenant members list. No member invitation, user lookup, role assignment or revocation routes were found in the current route table.
- No application code or database migration changed in this draft.
