# BBG Auth module — implementation status

## Implemented scope

- Password-based account registration.
- Password login using email or mobile.
- Short-lived HS256 access tokens.
- Random refresh tokens stored only as SHA-256 hashes in `USER_SESSIONS`.
- Secure/HttpOnly refresh cookie support, configurable for local HTTP and production HTTPS.
- Refresh-token rotation, old-token replacement tracking and token-family revocation on replay.
- Current-session logout and all-session logout.
- Authenticated profile read and update.
- Google, Facebook, Apple and Instagram professional-account sign-in / registration with server-side provider verification.
- Explicit authenticated provider-identity linking through `USER_IDENTITIES`.
- The seven-layer BBG architecture and internal `$resArr` contract.

No business-application, tenant-selection or role-assignment endpoints are added by this authentication increment. Provider applications and credentials still require external setup.

## Routes

All routes are POST and require the `authParam` module envelope.

| Route | `actionType` | `actionData.action` |
|---|---|---|
| `/api/v1/auth/register` | `manageAuth` | `register` |
| `/api/v1/auth/login` | `manageAuth` | `login` |
| `/api/v1/auth/refresh` | `manageAuth` | `refresh` |
| `/api/v1/auth/logout` | `manageAuth` | `logout` |
| `/api/v1/auth/logout-all` | `manageAuth` | `logoutAll` |
| `/api/v1/auth/profile` | `getAuth` | `getProfile` |\n| `/api/v1/auth/social/login` | `manageAuth` | `socialLogin` |\n| `/api/v1/auth/social/link` | `manageAuth` | `socialLink` |\n| `/api/v1/auth/social/config` | GET | public provider configuration |

Example registration body:

```json
{
  "authParam": {
    "actionType": "manageAuth",
    "actionData": {
      "action": "register",
      "full_name": "Example User",
      "email": "user@example.com",
      "mobile": "9876543210",
      "password": "replace-with-a-strong-password"
    }
  }
}
```

Example login body:

```json
{
  "authParam": {
    "actionType": "manageAuth",
    "actionData": {
      "action": "login",
      "identifier": "user@example.com",
      "password": "replace-with-a-strong-password"
    }
  }
}
```

For `/refresh` and `/logout`, send `X-BBG-CSRF: 1`; the browser sends the `bbg_refresh` HttpOnly cookie. Profile and logout-all require `Authorization: Bearer <access-token>`.

The public HTTP response currently exposes `$resArr` unchanged because a separate public response envelope has not been approved. Refresh-token values are removed from JSON and sent only as cookies.

## Environment configuration

Set these in the root `.env` for Docker Compose (copy from `.env.example`) or inject them directly into the PHP process in production:

- `AUTH_ACCESS_TOKEN_SECRET`: required; generate with `openssl rand -hex 32` or stronger. Never commit the generated value.
- `AUTH_ACCESS_TOKEN_TTL`: default `900` seconds (15 minutes).
- `AUTH_REFRESH_TOKEN_TTL`: default `2592000` seconds (30 days).
- `AUTH_REFRESH_COOKIE_SECURE`: `false` for local HTTP only; must be `true` in production HTTPS.
- `AUTH_REFRESH_COOKIE_SAMESITE`: defaults to `Lax`.
- `AUTH_REFRESH_COOKIE_DOMAIN`: optional; leave empty for host-only cookies.
- `AUTH_TOKEN_ISSUER` and `AUTH_TOKEN_AUDIENCE`: defaults `bbg` and `bbg-web`.

TTL and cookie defaults are implementation defaults pending final security review. The access-token secret is mandatory; auth operations fail closed if it is absent, is a placeholder, or is shorter than 32 characters.

## Database behaviour

Password authentication uses `USERS` and `USER_SESSIONS`. Social authentication also uses `USER_IDENTITIES`, created by the additive migration `20261113_002_social_identity_mapping.sql`. The migration is not executed automatically. No existing table is altered. User rows are created with `status='A'` and `account_status='ACTIVE'`; `email_verified_on` and `mobile_verified_on` remain NULL. Account verification has not yet been implemented or decided. The initial registration validator enforces an 8-character minimum password pending a formal password policy.

Refresh rotation inserts a replacement session and marks the old session revoked with `replaced_by_session_id` in one Core Services transaction. Reuse of a rotated token revokes the token family. DAO operations use parameterized commands and standard user reads filter `status='A'`.

Registration checks duplicate email/mobile values across active and soft-deleted rows in application logic. The inspected live schema did not show unique email/mobile indexes, so concurrent duplicate registrations remain possible until a separately approved unique-index change is made. The observed lack of indexes on `USER_SESSIONS.session_uuid`, `refresh_token_hash` and `token_family_id` can affect session lookup and rotation performance. No index or schema changes are made here.

## Explicit limitations / follow-up

- Google, Facebook, Apple and Instagram sign-in code is implemented, but each provider remains disabled until its developer application credentials and redirect/origin configuration are supplied. Apple requires a Services ID, Team ID, Key ID and private key. Instagram uses the Instagram Login product's own client ID and secret.
- Instagram Login supports professional Business/Creator accounts only; consumer/personal accounts are not supported by the official Instagram Login API.
- The authenticated provider-link API is implemented; a provider-management settings screen is not included in this increment.
- Registration currently permits an account with an email or mobile and does not enforce verification. Confirm the verification workflow before production.
- Rate limiting, password reset/recovery, email/SMS verification, session-management UI and provider app review remain follow-up work.
- The `X-BBG-CSRF: 1` custom-header check assumes same-origin use or a restrictive CORS policy. A formal CSRF/origin allowlist policy is still required before production.
- Profile read is implemented; profile update and password change are not part of this first increment.

## Verification

From `backend/` after installing dependencies:

```bash
composer test -- --filter AuthTokenServiceTest
composer test
```

Also verify with a disposable local test account:

1. Register with a unique email/mobile.
2. Log in and confirm the response contains an access token but no refresh-token JSON field.
3. Confirm the `bbg_refresh` cookie is HttpOnly and the stored `refresh_token_hash` differs from the cookie value.
4. Call profile with the bearer token.
5. Refresh once; confirm the old session row has `revoked_on` and `replaced_by_session_id` populated.
6. Replay the old refresh cookie; confirm the token family is revoked.
7. Log out and confirm the cookie is cleared and the session family is revoked.
8. Log out all sessions and confirm prior protected requests are rejected.

Do not use production credentials or production accounts for replay tests.


## Social authentication implementation

Social authentication uses provider-issued credentials that are verified server-side before BBG creates its own session. Provider access tokens and ID tokens are never stored in the database. BBG stores only the provider name, immutable provider subject, optional provider email, and linked user ID in `USER_IDENTITIES`.

Supported providers in the implementation are Google, Facebook, Apple, and Instagram Login for Instagram professional (Business/Creator) accounts. Instagram does not provide a general personal-account login flow; first-time Instagram registration must include an email address or mobile number on the BBG registration form. Consumer/personal Instagram accounts are not supported by Meta's Instagram Login API. The backend rejects a provider credential unless it can verify the token against the configured provider application.

### Social identity rules

- Existing identities authenticate by the unique `(provider, provider_subject)` pair.
- First-time account creation occurs only when the user explicitly chooses the registration flow.
- A provider email matching an existing BBG account does not silently link accounts. The user must sign in to that BBG account and use the authenticated provider-link flow.
- First-time social registration follows the existing BBG contact rule: at least one email address or mobile number must be supplied by the provider or entered on the registration form. The password hash may remain NULL for provider-only authentication. Only provider-attested verified email is marked as verified.
- Provider tokens are verified server-side and are not persisted.
- The refresh token remains in the existing HttpOnly `bbg_refresh` cookie; the access token remains in Angular memory.

### Social authentication configuration

Configure these variables in the ignored root `.env` for Docker Compose, or in the backend secret manager:

- `AUTH_SOCIAL_ALLOWED_ORIGINS`: comma-separated exact frontend origins. Set the production HTTPS origin; do not use wildcards.
- `AUTH_GOOGLE_CLIENT_ID`: Google OAuth web client ID.
- `AUTH_FACEBOOK_APP_ID` and `AUTH_FACEBOOK_APP_SECRET`: Meta app credentials for Facebook Login.
- `AUTH_INSTAGRAM_APP_ID` and `AUTH_INSTAGRAM_APP_SECRET`: Meta app credentials with Instagram Login configured for professional accounts.
- `AUTH_APPLE_CLIENT_ID`: Sign in with Apple Services ID / client ID.
- `AUTH_META_GRAPH_API_VERSION`: Graph API version used for Meta token validation (currently configured as `v27.0`).

The public client IDs are safe to expose to the Angular application; app secrets must remain backend-only. Provider application setup, redirect URI/domain registration, permissions, app review and production verification are external setup requirements. Empty credentials keep the corresponding provider disabled. Never commit real credentials.

### Social routes

- `POST /api/v1/auth/social/login`: verifies provider credential, then signs in or creates an account according to `intent=login|register`.
- `POST /api/v1/auth/social/link`: links a verified provider identity to the currently authenticated BBG account. Requires a bearer access token and same-origin request checks.
- `GET /api/v1/auth/social/config`: returns public provider client IDs and enabled flags only.

Apply `backend/database/migrations/20261113_002_social_identity_mapping.sql` after reviewing the live database and taking a backup. The migration is additive and is not executed automatically.
