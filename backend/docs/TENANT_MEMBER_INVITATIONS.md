# BBG tenant team membership and invitation API

## Scope

The team-management flow is owner-scoped and additive. It does not change authentication, RBAC definitions, permission evaluation, guards or interceptors. Core Services verifies an active TENANT_OWNER membership for the selected active tenant before listing members, searching users, adding members or creating invitations.

The only role assignable through these operations is the already-existing TENANT_ORDER_MANAGER role with TENANT scope. TENANT_OWNER and all PLATFORM roles are rejected.

## Routes

All operations use the tenantParam envelope. The controller derives actionType from the matched route and the existing auth interceptor supplies the access token.

| Operation | Route | Action |
| --- | --- | --- |
| List members for active owner | POST /api/v1/tenants/members/owner-list | listOwnedTenantMembers |
| Search active BBG users by email | POST /api/v1/tenants/members/search | searchEligibleTenantUsers |
| Add existing BBG user | POST /api/v1/tenants/members/add | addExistingTenantMember |
| Create invitation | POST /api/v1/tenants/invitations/create | createTenantInvitation |
| Accept invitation | POST /api/v1/tenants/invitations/accept | acceptTenantInvitation |

## Existing user search and add

Search requires a complete valid email address. Only active user accounts that are not already active members of the selected tenant are returned. The server caps results at ten.

Add accepts a user_id and role_code. The role code must be exactly TENANT_ORDER_MANAGER and the role must exist with scope_type TENANT and status A. The service revalidates owner access and performs membership and role assignment writes in one transaction. Existing inactive membership rows are reactivated; normal operations do not physically delete membership history.

## Invitation creation

The owner supplies an email address. If an active BBG user already exists for that address, the API instructs the owner to use search/add instead.

For a new account, Core Services:
- generates 32 random bytes and returns the 64-character hex token once;
- stores only SHA-256(token) in TENANT_INVITATIONS;
- sets invitation_status=PENDING and expires_on to seven days after creation;
- revokes an earlier pending invitation for the same tenant/email;
- returns email, role_code, invitation_id, token and expires_on.

The frontend constructs a copyable /invite/accept?token=... URL. No invitation email is sent because no approved email-delivery provider was found in the current codebase.

## Invitation acceptance

The invitee must sign in or register with the invited email address. The API hashes the supplied token, verifies it is pending, active and not expired, compares the invitation email to the authenticated user's email, verifies the tenant is active and the role is TENANT_ORDER_MANAGER, then creates/reactivates membership and assigns the role in one transaction. The invitation is marked ACCEPTED in the same transaction.

Tokens are single-use. A used, expired, revoked or email-mismatched token is rejected.

## Database

Migration: 20261119_003_tenant_member_invitations.sql

TENANT_INVITATIONS uses the common status/audit columns. status='Z' is used when a previous pending invitation is revoked; accepted rows remain active with invitation_status='ACCEPTED' for audit history. The raw invitation token is never stored.

Apply the migration only after backing up and verifying the target schema. CI validates the migration against MySQL 8.4; that is not a substitute for a live database check.
