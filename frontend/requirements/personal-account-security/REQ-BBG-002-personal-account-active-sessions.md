---
id: BBG-REQ-002
title: Personal Account Active Sessions and Remote Sign-out
module: personal-account-security
type: enhancement
owner: product-and-engineering
status: draft
version: 1.0
last_updated: 2026-11-23
stack:
  frontend: Angular 22
  backend: Yii 3 / PHP 8.4
  database: MySQL 8.4
---

# BBG — Personal Account Active Sessions & Remote Sign-out

## 1. Purpose

This requirement defines an authenticated user's ability to inspect their currently active BBG sign-in sessions and remotely sign out sessions they do not recognize or no longer want to keep.

The feature belongs exclusively to **My Account / Personal Account → Security → Active Sessions**. It is not a Business Workspace, Consumer, Marketplace, Storefront, or Platform Administration feature.

**Primary outcome:** A user can see which devices/browser sessions are currently signed in to their BBG account, identify the current device, revoke one other session, or sign out all other sessions while preserving the current session.

This is a cross-layer security requirement. It must be inspected and implemented against the actual Angular 22 application, Yii 3 authentication/session implementation, access-token validation, refresh-token rotation, and live MySQL schema.

## 2. Authority, source documents and implementation evidence

Use the following supplied BBG references as design baselines:

- `BBG_Backend_Architecture_v1.0.md`
- `frontend_architecture.md`
- `BBG_Database_Design_Final_v2.0.md`
- The supplied `.agents` skills archive and the repository's actual `.agent/` and/or `.agents/` instructions.
- The actual current BBG source code, tests, API contracts and live MySQL schema.

Interpretation rules:

1. The backend architecture describes BBG's Yii 3 adaptation and logical seven-layer architecture. Verify actual file paths and implementations before using them.
2. The frontend architecture lists AuthenticationService, SessionService, AuthStore and ProfilePage as architectural concepts. It explicitly leaves authentication/session API paths and contracts as UNKNOWN. Do not treat proposed names as proof that those files or endpoints exist.
3. The database design describes `USER_SESSIONS` as a current-release candidate and its schema as a design reference. The user has separately supplied the following `USER_SESSIONS` columns and sample-row behavior for this requirement; verify the live schema and actual DAO usage before implementation:
   - `id`, `user_id`, `session_uuid`, `refresh_token_hash`, `token_family_id`
   - `device_name`, `ip_address`, `user_agent`
   - `issued_on`, `expires_on`, `last_used_on`, `revoked_on`
   - `replaced_by_session_id`, `status`
   - `created_by`, `created_on`, `updated_by`, `updated_on`
4. The supplied session rows show that `device_name` may be NULL, `ip_address` may be NULL or an internal/private address such as `172.21.0.1`, replacement chains exist, and rows with `status = 'A'` can still have `revoked_on` or `replaced_by_session_id` populated. Therefore, `status = 'A'` alone must never be treated as proof that a session is active.
5. Actual repository code and live schema are the implementation evidence. Design documents, sample rows, and this requirement do not prove that a particular endpoint, middleware, token claim, query, or revocation mechanism exists.
6. Do not silently reconcile differences between the reference documents, supplied sample data and live implementation. Record discrepancies and resolve them using the project's decision process.

## 3. Goals

- Provide an Active Sessions screen under Personal Account security.
- List only currently valid, active sign-in sessions by default.
- Clearly identify the session belonging to the browser/device making the current authenticated request.
- Display useful device, browser, operating-system and session activity details where available.
- Avoid duplicate rows caused by refresh-token rotation/replacement chains.
- Allow the user to sign out one selected other session.
- Allow the user to sign out all other sessions while retaining the current session.
- Ensure server-side authorization is scoped to the authenticated user.
- Ensure remote revocation invalidates refresh capability and access-token use according to the actual BBG authentication validator.
- Reuse the existing `USER_SESSIONS` table and authentication infrastructure.
- Make no database schema changes in this requirement.
- Preserve all unrelated Personal Account and application-domain functionality.

## 4. Scope and non-goals

### 4.1 In scope

- My Account / Personal Account navigation and Security section.
- Active Sessions list and session summary.
- Current Device marker.
- Device/browser/OS metadata presentation and safe fallback labels.
- Individual remote sign-out of another session.
- Sign out all other devices/sessions.
- Confirmation, loading, empty, error and success states.
- Backend session discovery, ownership checks and revocation.
- Correct handling of refresh-token rotation and replacement chains.
- Automated tests for authorization, revocation, current-session protection and session filtering.

### 4.2 Out of scope

Unless separately approved, do not redesign or modify:

- Business Workspace or tenant membership/roles.
- Platform Administration.
- Consumer dashboard.
- Marketplace, public storefront or business onboarding.
- OAuth provider selection or account-linking UX.
- Password reset, MFA, trusted contacts or account recovery.
- A historical session audit/history screen.
- A new authentication provider or token architecture.
- General-purpose session analytics or IP geolocation.
- Database schema, indexes, constraints, columns, tables or migrations.

Do not:
- Invent API routes, permission codes, DTO properties, token claims, status values or database columns.
- Accept a client-supplied `user_id` as the authority for session listing or revocation.
- Treat frontend route guards or hidden buttons as authorization.
- Expose raw refresh tokens, refresh-token hashes, session UUIDs, token-family IDs or access tokens to the UI.
- Identify the current device by matching IP address, browser string or user-agent alone.
- Treat every row with `status = 'A'` as active.
- Group all sessions sharing a token-family ID into one device without proving that this matches the real token-family lifecycle.
- Add a schema migration or persist new session metadata without explicit approval.
- Commit, push, reset, clean, merge, rebase or switch branches unless separately requested.

## 5. User and access context

### 5.1 Authenticated Personal Account user

The signed-in BBG user can:

- View their own active sessions.
- Identify which listed session is the current session.
- Sign out a selected session other than the current session.
- Sign out all other sessions while preserving the current one.

The user cannot:

- View another user's sessions.
- Revoke another user's sessions.
- Revoke the current session from the individual-session action.
- Submit a different user ID to broaden access.
- Access token hashes, session secrets or internal token-family metadata.

### 5.2 Current-session authority

The backend must determine the current session from trusted authentication context, such as the validated session identifier or an equivalent server-verified token/session relationship.

The frontend must not infer the current session by comparing:
- IP address.
- User-agent.
- Device name.
- Browser/OS combination.
- Approximate location.
- Client timestamps.

The current-session flag returned to the frontend must be server-authoritative.

If the existing access-token/authentication context cannot reliably resolve the current `USER_SESSIONS` row, record this as a blocker. Do not guess or add an unapproved token claim/schema field.

## 6. Navigation and UI placement

Expected conceptual navigation:

**My Account → Security → Active Sessions**

Inspect the existing Personal Account information architecture first. Reuse the existing account shell, settings navigation, route conventions, page title/breadcrumb pattern and permission handling. Do not add a second, duplicate Security area if one already exists.

The Active Sessions page must be visually consistent with the existing BBG enterprise SaaS UI and support light and dark themes.

### 6.1 Page header and explanation

Suggested content:

- Page title: **Active Sessions**
- Short explanation: “Review where your BBG account is signed in. You can sign out devices you no longer use or do not recognize.”
- A summary of the number of active sessions/devices, based on the backend response.
- A prominent **Sign out all other devices** action when at least one other revocable session exists.

Do not hardcode counts or sample session data.

### 6.2 Session card/list information

Each active session entry should show, when available:

- Friendly device name.
- Browser name and version, if reliably parsed.
- Operating system and version, if reliably parsed.
- Device category/icon (desktop, laptop, tablet, mobile) only when the parser can determine it.
- IP address, if available and approved for display.
- Login/issued date and time.
- Last active date and time.
- Expiry date and time.
- A clear **Current device** indicator for the current session.
- A **Sign out** action for other sessions only.

Do not display empty, misleading or fabricated values. Use clear fallbacks such as “Unknown device”, “Browser unavailable”, “Not available” or omit optional fields where the existing design system recommends omission.

### 6.3 Current device

- The current session must be visually distinct and clearly labeled **Current device**.
- Do not show an individual Sign out action for the current session.
- The bulk action must preserve the current session.
- The current session must remain usable after a successful sign-out-all-others operation.

### 6.4 Device metadata fallback

The supplied session rows indicate `device_name` can be NULL.

When `device_name` is NULL or blank:
- Derive a friendly display label from `user_agent` using a safe, deterministic parser already present in the project, if one exists.
- Otherwise use a neutral fallback such as “Unknown device”.
- Parse browser and OS only as accurately as the available user-agent permits.
- Do not infer a person's identity, precise location or physical device ownership from user-agent data.
- If existing login/session-creation code can safely populate `device_name` using an existing column, it may be proposed as a follow-up within this task only if it requires no contract/schema change and is consistent with existing patterns. Do not broaden login behavior without tracing its callers and regression impact.

### 6.5 IP address handling

- Display IP only when available and when the existing product's privacy policy permits it.
- Inspect trusted proxy handling before deciding which address is persisted.
- Do not expose internal/private/container addresses as a meaningful user location.
- Treat addresses such as `172.21.0.1` as internal/private network metadata, not geolocation.
- Do not add IP geolocation or third-party lookup.
- Do not claim city/country/location based only on an IP address.
- If the address is internal, malformed or not useful to the user, omit it or label it neutrally according to the existing UI pattern.

### 6.6 Destructive confirmation

Individual sign-out:
- Ask the user to confirm signing out the selected device/session.
- Identify the selected device using safe display metadata.
- Explain that the device will need to sign in again.
- Prevent submission while the action is in progress.
- On success, remove/update the revoked session from the active list and show the standard success feedback.

Sign out all other devices:
- Ask for explicit confirmation.
- Explain that all other active sessions will be signed out while this current device remains signed in.
- Prevent duplicate submissions while in progress.
- On success, refresh the active-session list and retain the current session.
- If any session could not be revoked, report partial failure accurately; never show full success if the backend reports failure.

## 7. Active session eligibility and refresh-token rotation

This is a critical backend correctness requirement.

### 7.1 Active session definition

Inspect the actual session lifecycle, status semantics, expiry policy, refresh-token validator, revocation logic and access-token validation before implementing the query.

A session may be listed only when all applicable authoritative conditions are satisfied, including:

- It belongs to the authenticated user.
- It is not revoked (`revoked_on` is NULL, unless the actual implementation defines a stricter equivalent).
- It is not expired (`expires_on` is later than the server's authoritative current time).
- It has not been replaced by another session row (`replaced_by_session_id` is NULL for the current leaf, subject to verified implementation semantics).
- It is not invalidated by token-family reuse detection or another security event.
- It is accepted as valid by the same authoritative rules used by the authentication/refresh flow.
- It satisfies the live `status`/soft-delete rules.

These are logical conditions to verify against the live implementation, not permission to invent a new status model. In particular, `status = 'A'` is not sufficient by itself.

### 7.2 Replacement-chain handling

The supplied rows contain refresh-token replacement chains through `replaced_by_session_id`.

Requirements:
- Trace how BBG creates the original session and replacement session during refresh.
- Follow actual replacement relationships to identify the latest valid session in a lifecycle.
- Do not display every historical token-rotation row as a separate device.
- Do not select the row with the highest database ID or latest timestamp as a shortcut.
- Do not assume one token family always equals one physical device until verified.
- If one token family represents one login lifecycle, display only its latest valid leaf session.
- If the implementation permits independent sessions within a token family, preserve the actual independent device/session boundaries.
- Detect and safely handle malformed chains, missing replacement rows, cycles, cross-user links or inconsistent ownership. Fail closed for invalid session records and log safe diagnostics without logging secrets.
- A replaced historical row must not remain in the active list merely because its status is still `A`.

### 7.3 Session identity in API responses

The UI needs a stable identifier to request revocation of a selected listed session.

- Reuse an existing safe, non-secret identifier if one already exists in the API contract.
- If a new response identifier is needed, use a non-authentication identifier and document its mapping to the server-side session row.
- Never return `session_uuid`, `refresh_token_hash`, raw refresh tokens, access tokens or `token_family_id` to the frontend.
- A session row identifier is not authorization: every revoke operation must still verify ownership and current-session restrictions server-side.

## 8. Individual remote sign-out

An authenticated user can revoke one selected session other than the current session.

Backend requirements:
- Derive the acting user from trusted authenticated request context.
- Resolve the target session using the supplied safe identifier.
- Verify the target belongs to the authenticated user.
- Verify the target is not the current session.
- Verify the target is eligible for revocation or return an idempotent result according to established API conventions.
- Revoke the server-side refresh-token/session capability using the existing auth/session service.
- Ensure the session can no longer refresh or obtain a valid replacement token.
- Ensure access-token use is invalidated according to the actual access-token validator, as specified in section 10.
- Update existing audit fields using the authenticated actor where the current schema and code support it.
- Execute related state changes atomically using the existing Core Services transaction convention.
- Prevent a cross-user IDOR by changing the target identifier in the request.
- Do not allow a client-supplied user ID, tenant ID or owner identifier to influence the target scope.

A successful API response must mean the backend revocation operation actually succeeded. Do not return success merely because the frontend removed a row.

## 9. Sign out all other devices

An authenticated user can revoke every other active session while retaining the current session.

Backend requirements:
- Resolve the current session from trusted authentication context.
- Scope the operation to the authenticated user.
- Identify all other currently valid sessions using the authoritative session eligibility and replacement-chain rules.
- Exclude the current session by its server-resolved identity, not by browser/IP matching.
- Revoke all eligible other sessions using the existing token-family/session semantics.
- Preserve the current session's refresh capability and access-token validity.
- Ensure repeated requests are safe/idempotent.
- Use an atomic transaction or the established safe transaction strategy for the operation.
- If partial revocation is possible in the actual architecture, return an accurate outcome and ensure failed rows are not represented as revoked.
- Never accept a client-provided list of user IDs or arbitrary session IDs as the definition of “all other devices”.

The operation must not:
- Revoke the current session.
- Revoke sessions belonging to another user.
- Revoke all sessions in the database.
- Revoke unrelated tenant/workspace memberships or roles.

## 10. Access-token invalidation and security guarantees

The BBG backend architecture describes short-lived access tokens, rotated refresh tokens stored in a Secure/HttpOnly cookie, server-side session/token-family tracking, and server-side revocation. It also states that exact token/session revocation behavior must follow the approved implementation.

Remote sign-out must invalidate the target session's ability to continue using BBG, not merely remove it from the UI.

Inspect whether protected API requests:
- Carry a session identifier or equivalent trusted session reference.
- Validate the session's current server-side state.
- Check token/session revocation on each request or through an approved cache/invalidation mechanism.
- Enforce token expiry and token-family compromise/reuse state.

Required behavior:
- Refresh-token use for a revoked session must fail.
- A revoked session must not receive replacement refresh tokens.
- Access-token use from the revoked session must be rejected according to the approved BBG revocation guarantee.
- The current session must continue to work after sign out all other devices.

**Critical decision gate:** If the current access-token implementation is fully stateless and cannot immediately recognize server-side session revocation, do not claim that remote sign-out immediately invalidates access-token use. Do not introduce an unapproved table, column, token claim, cache or middleware architecture. Document the exact limitation and propose the smallest architecture-compatible options (for example, validating an existing session reference against server-side state, if the current token already contains one). Stop for approval if the required guarantee cannot be met without a contract, schema or architecture change.

Do not silently weaken the security requirement to “refresh token revoked but existing access token remains valid until expiry”. If that is the only currently possible behavior, report it as a blocker and obtain an explicit product/security decision.

## 11. API and contract discovery

Do not invent APIs or response fields.

Inspect and document the actual implementation for:
- Existing session restore/current-session endpoint.
- Existing logout endpoint and behavior.
- Existing refresh endpoint and rotation logic.
- Existing session creation and replacement logic.
- Existing access-token claims and validation middleware.
- Existing session/refresh-token DAO queries.
- Existing authentication Core Services transaction boundaries.
- Existing Angular AuthenticationService/SessionService/AuthStore patterns.
- Existing Personal Account routing and settings navigation.

For each required operation, record:
- HTTP method and actual route.
- Authentication requirements.
- CSRF requirements for cookie-authenticated requests.
- Request DTO/input envelope.
- Response contract and error format.
- Angular service method and state owner.
- Yii 3 controller, versioned service, Core Services and DAO methods.
- Database tables/columns used.
- Session ownership and current-session checks.
- Access-token and refresh-token revocation semantics.

Required logical operations:
1. List the authenticated user's active sessions and identify the current session.
2. Revoke one other session.
3. Revoke all other sessions while preserving the current session.

If an equivalent operation already exists, reuse it. If an operation is missing, classify it as new development and follow the applicable new-development skill. If the required API contract or token validation behavior must change, document the impact and decision gate before implementation. Do not stub a fake endpoint or use mock data to make the screen appear functional.

## 12. Backend architecture and implementation rules

Preserve the BBG Yii 3 backend architecture and its actual repository conventions. The supplied BBG backend architecture defines these seven logical layers:

1. InDto
2. Controller
3. Versioned Services
4. Core Services
5. DAO
6. Model — legacy/reference layer; do not introduce for new development where BBG project rules prohibit it.
7. Utils

Responsibilities:
- Core Services own use-case orchestration, validation, authorization, transaction boundaries and session lifecycle decisions.
- DAO owns database reads/writes only.
- InDto holds the established input structure/defaults.
- Controller handles the HTTP endpoint and delegates.
- Versioned Services map the request to InDto/Core Services and preserve the API response conventions.
- Utils contain reusable helpers only; do not hide business workflows or database access in them.

Preserve the actual BBG Yii 3 adaptation, namespaces, dependency injection, connection handling, exception handling and response envelope. Do not copy Yii 1.1/SIMS paths or implementation snippets into BBG.

The supplied `.agents` archive includes `modify`, `new-dev` and `db-design` skill material. Some archive text explicitly references a separate SIMS/Yii 1.1.14 codebase. Apply only generic workflow guidance (inspect before editing, protect contracts, read neighboring functions/callers, reuse local patterns and keep changes scoped). **The SIMS-specific paths, framework version, PHP compatibility rules and code snippets are not BBG implementation instructions.** For BBG, the actual repository and `BBG_Backend_Architecture_v1.0.md` take precedence.

Preserve the established BBG response contract and error conventions, including `$resArr` where the actual BBG implementation uses it. Do not impose conventions from an unrelated codebase where BBG code differs.

## 13. Frontend implementation rules

Inspect the actual BBG frontend and its `.agent/` and/or `.agents/` guidance before editing.

Follow:
- Existing Angular 22 routing and lazy-loading conventions.
- Existing My Account/Personal Account shell and navigation.
- Existing smart/container and reusable presentational component boundaries.
- Existing API service and typed DTO/model mapping.
- Existing state-management conventions; use the established AuthStore/SessionService pattern if it exists.
- Existing dialog, toast, loading, empty and error components.
- Existing light/dark theme tokens and responsive breakpoints.
- Existing accessibility conventions.

Do not:
- Call APIs directly from presentational components.
- Use raw `HttpClient`/fetch if the project requires a shared API service.
- Expose raw backend envelopes to presentation components.
- Store access/refresh tokens or session secrets in localStorage/sessionStorage.
- Use IP or user-agent comparison to determine the current session.
- Add mock sessions or hardcoded device counts.
- Add fake permission keys.
- Add a second Security navigation section when one already exists.
- Change unrelated account/profile functionality.

Build reusable, appropriately scoped components only where the existing code does not already provide them. Avoid over-componentisation.

## 14. Database and schema safety

Reuse the existing `USER_SESSIONS` table and existing authentication/session structures.

The supplied session-column list is a reference for inspection, not permission to alter schema. Verify the live schema and actual query semantics.

No changes are permitted to:
- Tables.
- Columns.
- Indexes.
- Foreign keys or constraints.
- Data types.
- Token/session persistence model.
- Migrations or seed data.

Do not introduce a session-history table, access-token blacklist table, device registry or new audit table under this requirement.

If the required access-token revocation guarantee or session identity cannot be implemented safely using the existing schema and architecture:
1. Stop before making a schema change.
2. Record the exact live-schema and code evidence.
3. Explain the security limitation.
4. Propose the minimum schema/contract/architecture change separately.
5. Include migration/backfill, security, performance and rollback implications.
6. Request explicit approval.

Use the existing audit fields `created_by`, `created_on`, `updated_by`, `updated_on` as appropriate. Do not physically delete session rows unless the existing security lifecycle explicitly requires it.

## 15. Privacy, security and operational safeguards

- Never return or log `refresh_token_hash`, raw refresh tokens, access tokens, `session_uuid`, or unnecessary token-family metadata.
- Do not expose session secrets in browser console, analytics, telemetry, error messages or frontend state.
- Enforce authenticated-user ownership on every list and revoke operation.
- Prevent IDOR by verifying the target session's `user_id` against the authenticated user in the backend.
- Use server-derived current-session identity.
- Apply existing CSRF protections to cookie-authenticated state-changing requests.
- Follow existing rate-limiting and abuse-protection conventions.
- Make revocation idempotent and safe under repeated requests.
- Avoid leaking whether another user's session exists.
- Log security events using the existing safe audit/logging conventions, without token values or unnecessary PII.
- Ensure session data is not cached by public/service-worker caches.
- Clear or refresh only the relevant frontend session-list state after a mutation; do not clear the current authenticated state after bulk sign-out.
- Keep server time/timezone handling consistent with the authentication implementation.

## 16. Required skills and workflow

Before changing code, inspect the repository's actual skill instructions and load the relevant documents.

### 16.1 Existing behavior changes

Use the repository's applicable **modify** skill for changes to existing authentication, refresh, logout, session validation, shared navigation, AuthStore or API behavior.

Review the supplied skill references where applicable:
- `.agents/skills/modify/SKILL.md`
- `.agents/skills/modify/Rules.md`
- `.agents/skills/modify/resources/Architecture.md`
- Relevant examples: InDto, Controller, ServicesV1, Services and DAO.

Read the neighboring implementation, callers and callees before editing. Preserve existing request/response contracts unless a change is explicitly approved.

### 16.2 New capability

Use the repository's applicable **new-dev** skill if a new Active Sessions page, endpoint/action, service operation, DTO or workflow must be created.

Review:
- `.agents/skills/new-dev/SKILL.md`
- `.agents/skills/new-dev/Rules.md`
- `.agents/skills/new-dev/resources/Architecture.md`
- Relevant examples and gotchas.

The supplied archive's new-dev architecture material is SIMS/Yii 1.1.14-specific in places. Do not copy its SIMS-specific paths or framework instructions into BBG. Follow BBG's Yii 3 architecture and the actual repository's conventions.

### 16.3 Database skill

The supplied `.agents/skills/db-design/SKILL.md` is relevant only if a separate schema proposal becomes necessary. This requirement explicitly prohibits schema changes, so do not use that skill as authorization to create or alter tables.

### 16.4 Frontend skills

Inspect the actual repository's `.agent/README.md`, rules, skills and workflows. Load the skills relevant to:
- Requirement intake/readiness.
- BBG frontend context and architecture.
- UI construction and componentisation.
- API/data/state integration.
- Navigation and permissions.
- Testing, review and release.

Do not assume that the uploaded Edunova/insync4 skill kit applies to BBG. Confirm every skill against actual BBG repository structure before following it.

### 16.5 Required execution workflow

1. Inspect Git status, current branch and existing diff. Preserve all local/uncommitted work.
2. Read BBG project instructions and applicable skills.
3. Audit actual Personal Account routes, shell, settings navigation and design components.
4. Audit authentication, session creation, refresh rotation, logout, current-session context and access-token validation.
5. Verify the live `USER_SESSIONS` schema and representative row semantics without exposing secrets in logs/reports.
6. Map each operation to frontend components/services/state, API contracts, backend layers, tables/columns and authorization.
7. Produce a readiness report: known, unknown, existing, missing, blocked.
8. Identify the smallest safe implementation plan and any decision gates.
9. Implement only what can be completed within the approved scope and existing contracts.
10. Add backend and frontend tests.
11. Run targeted checks and relevant regression tests.
12. Review the final diff for security, scope and architecture compliance.
13. Report actual files, APIs, tests, outcomes and unresolved blockers.

If an approval gate is reached, stop only the blocked portion. Do not silently implement an alternative security model.

## 17. Test requirements

### 17.1 Session listing

- Authenticated user sees only their own sessions.
- Unauthenticated user cannot access the list.
- Current session is marked by server-derived identity.
- Expired sessions are excluded.
- Revoked sessions are excluded.
- Replaced historical sessions are excluded.
- A row with `status = 'A'` but non-null `revoked_on` is excluded.
- A row with `status = 'A'` but a replacement link is not shown as a separate active device when it is a replaced historical row.
- Only the latest valid session in a verified rotation chain is represented.
- Independent browser/device sessions remain separate when the actual token-family model permits them.
- Malformed, cyclic, orphaned or cross-user replacement links fail safely.
- NULL/blank `device_name` produces a safe fallback.
- NULL/unknown `user_agent` produces a safe fallback.
- NULL IP is handled.
- Internal/private IP is not presented as a geographic location.
- No token hash, raw token, session UUID or token-family ID appears in the API response.

### 17.2 Individual sign-out

- User can revoke an eligible other session.
- User cannot revoke their current session through the individual action.
- User A cannot revoke User B's session by changing the target identifier.
- A nonexistent/foreign target returns the established safe error behavior.
- Repeated revoke requests are idempotent or handled according to existing API conventions.
- Revoked refresh token cannot be reused.
- Replacement refresh token cannot be issued for the revoked session.
- Access-token use is rejected according to the approved revocation guarantee.
- Audit metadata is updated correctly where supported.
- A failed backend mutation does not remove the row or show success in the UI.

### 17.3 Sign out all other devices

- All other eligible sessions for the authenticated user are revoked.
- Current session remains active and usable.
- Other users' sessions are untouched.
- Replaced/expired/revoked historical rows are handled correctly.
- Repeated calls are safe.
- Partial failure is represented accurately.
- The UI refreshes the list and continues to show the current device.
- Current AuthStore/session state is not cleared by this operation.

### 17.4 UI and accessibility

- Correct placement under Personal Account → Security.
- Responsive at mobile, tablet and desktop widths.
- Light and dark themes.
- Keyboard-accessible actions and dialogs.
- Dialog focus trap/restore and Escape behavior follow existing conventions.
- Loading, empty, error, retry and success states.
- Destructive confirmation before individual and bulk revocation.
- No Sign out action on the current device.
- No fake/mock sessions or fabricated metadata.
- Screen-reader announcement for mutation results.

### 17.5 Regression and security

- Login and OAuth callback.
- Session restoration.
- Refresh-token rotation.
- Existing logout.
- Expired access-token behavior.
- Refresh-token reuse detection.
- Personal Account profile read/update.
- Business Workspace and tenant context.
- Consumer and Marketplace access.
- CSRF protection for cookie-authenticated mutations.
- Cross-user and IDOR attempts.
- Existing authentication and API response contracts.

Run actual test commands, static checks and builds. Report commands and results. Never claim an unrun test passed.

## 18. Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-001 | A user is authenticated | They open My Account → Security → Active Sessions | They see their active sessions only |
| AC-002 | The current session is included in the active list | The list is rendered | The current session is clearly marked Current device |
| AC-003 | A session has a NULL/blank device name | The list is rendered | A safe friendly fallback is shown |
| AC-004 | A session has an unavailable or internal IP | The list is rendered | No false geographic location is shown |
| AC-005 | A session has expired, been revoked or been replaced | The active list is loaded | That historical/ineligible row is not shown as an active device |
| AC-006 | Refresh rotation has produced a replacement chain | The active list is loaded | Only the latest valid session for that verified lifecycle is represented |
| AC-007 | A user selects another active session | They confirm Sign out | Only that user's selected other session is revoked |
| AC-008 | A user attempts to revoke their current session through the individual action | The request is submitted | Backend rejects the action and the current session remains active |
| AC-009 | User A submits an identifier belonging to User B | A revoke request is made | Backend denies access without revealing another user's session details |
| AC-010 | A user chooses Sign out all other devices | They confirm | All their other eligible sessions are revoked |
| AC-011 | Sign out all other devices succeeds | The current device continues making requests | The current session remains usable |
| AC-012 | A target session has been revoked | It attempts refresh | The refresh operation is rejected |
| AC-013 | A target session has been revoked | It attempts a protected API request | Access is rejected according to the approved BBG revocation guarantee |
| AC-014 | A mutation fails | The UI receives the failure | It does not show success or falsely remove the session |
| AC-015 | The active list has no other sessions | The page is rendered | A clear empty/only-current-session state is shown and bulk sign-out is unavailable |
| AC-016 | A user signs out all other devices | The list reloads | Only the still-valid current session remains |
| AC-017 | This feature is implemented | Other BBG domains are used | Business Workspace, Consumer, Marketplace and Platform Administration remain unaffected |
| AC-018 | Implementation appears to require schema/contract changes | The blocker is reached | Work stops for explicit approval; no migration or unapproved contract change is made |

## 19. Open questions and decision gates

Keep these as UNKNOWN until verified against the actual repository and live runtime:

1. What is the actual Personal Account route and current Security/settings navigation structure?
2. Does a session list endpoint already exist?
3. Does the current logout operation revoke one session, a token family, or all sessions?
4. What trusted session identifier is available in the authenticated request context?
5. Does the access token contain an existing session reference that can be validated server-side?
6. Is access-token revocation checked on every protected request, via a cache, or only through token expiry?
7. Does one `token_family_id` correspond to exactly one login lifecycle/device in the actual implementation?
8. Are replacement links always populated, and what is the behavior when a replacement chain is malformed?
9. What are the live `status` semantics for `USER_SESSIONS`?
10. What timezone and boundary semantics are used for `expires_on`?
11. Which trusted proxy configuration determines the persisted client IP?
12. Is there an existing user-agent parser/device-label helper?
13. What are the exact API error/partial-success conventions for bulk revocation?
14. Can immediate access-token invalidation be guaranteed without a schema, token-contract or architecture change?

Do not invent answers. Resolve all security-critical questions before claiming the feature complete.

## 20. Required implementation report

Produce a report containing:

### A. Current-state audit

For each relevant capability use one of: `WORKING`, `PARTIAL`, `BROKEN`, `MISSING`, `BLOCKED`, or `NOT VERIFIED`.

Include exact file paths, class/method names, routes, middleware, token claims, validators and tests.

### B. Session lifecycle and data findings

Document:
- Live `USER_SESSIONS` columns used.
- Active-session eligibility predicate.
- Status/revocation/expiry semantics.
- Refresh rotation and replacement-chain behavior.
- Token-family meaning.
- Current-session resolution.
- Access-token invalidation behavior.
- Safe device and IP metadata handling.

Do not include raw token hashes, session UUIDs, access/refresh tokens or unnecessary personal data.

### C. API contract map

For list, individual revoke and revoke-all:
- Actual method/route.
- Input and response contract.
- Frontend service/store integration.
- Backend layer mapping.
- Ownership/current-session authorization.
- Revocation semantics.

### D. Implementation changes

List every changed file and explain:
- UI/navigation changes.
- Backend changes.
- Session filtering and rotation handling.
- Security/authorization.
- Error/partial-failure handling.
- Confirmation and feedback behavior.

### E. Verification evidence

List actual:
- Unit/integration/API tests.
- Frontend tests.
- TypeScript/lint/build checks.
- Browser verification, if performed.
- IDOR/current-session/bulk-revoke test results.
- Access-token and refresh-token revocation test results.
- Regression checks.

Distinguish automated tests from manual browser verification.

### F. Remaining issues and decisions

List:
- Unresolved security questions.
- Any blocked access-token invalidation requirement.
- Contract/schema changes proposed but not applied.
- Any tests or browser checks not run.
- Required product/security approvals.

Do not label the feature complete if remote access invalidation, ownership enforcement, current-session preservation or any critical acceptance criterion is unimplemented or unverified.

## 21. Completion rule

The task is complete only when:
- The Active Sessions feature is available in Personal Account.
- Only valid active sessions are listed and rotation chains are represented correctly.
- The current session is reliably identified by the backend.
- Individual and bulk revocation are securely scoped to the authenticated user.
- Bulk revocation preserves the current session.
- Refresh-token use is rejected after revocation.
- Access-token use follows the approved revocation guarantee, with no unsupported claims.
- No token secrets are exposed.
- No database schema change has been made.
- Required tests and relevant regression checks have passed.
- The implementation report provides verifiable evidence.

**Execution order: inspect skills and repository → audit auth/session lifecycle → verify schema → map contracts → readiness/decision report → implement → test → security review → report.**
