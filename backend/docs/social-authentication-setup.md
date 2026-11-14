# BBG Social Authentication Setup

This document configures the server-side social sign-in implementation. OAuth secrets must remain in the ignored root `.env` file or the deployment secret manager. Never commit real provider credentials.

## Supported providers

| Provider | Sign-in model | Email handling |
|---|---|---|
| Google | OAuth 2.0 authorization-code flow with OIDC ID-token signature, issuer, audience, expiry and nonce validation | Auto-link only when Google returns `email_verified=true` |
| Apple | Sign in with Apple web authorization; server validates the signed ID token, issuer, audience, expiry and nonce | Auto-link only when Apple returns `email_verified=true` |
| Facebook | OAuth authorization-code exchange, app-token debug validation and Graph profile lookup | Facebook email is treated as unverified; BBG requires its own email OTP |
| Instagram | Instagram Login for professional accounts (Business or Creator) | Instagram Login does not provide an email for this account-linking flow; BBG requires its own email OTP |

Instagram personal/consumer accounts are not supported. Meta's Instagram API is designed for professional accounts; the Instagram Login configuration must include the `instagram_business_basic` permission. A professional account is required.

## Callback URLs

Register the exact URLs below in each provider's developer console for local development:

- Google: `http://localhost:8080/api/v1/auth/oauth/google/callback`
- Apple: `http://localhost:8080/api/v1/auth/oauth/apple/callback`
- Facebook: `http://localhost:8080/api/v1/auth/oauth/facebook/callback`
- Instagram: `http://localhost:8080/api/v1/auth/oauth/instagram/callback`

Production callback URLs must use HTTPS and must exactly match the URLs configured with each provider. Apple sends its web authorization response using `form_post`, so its callback is a POST route; the other callbacks use GET.

The frontend must open the matching `/start` endpoint in a popup. The callback page posts a result to the exact `BBG_FRONTEND_URL` origin. Do not use wildcard `postMessage` origins.

## Environment configuration

Set these in the root `.env` file. The example values are local callback URLs; replace them for deployed environments.

```dotenv
BBG_API_BASE_URL=http://localhost:8080
BBG_FRONTEND_URL=http://localhost:4200

BBG_GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8080/api/v1/auth/oauth/google/callback
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=

BBG_APPLE_OAUTH_REDIRECT_URI=http://localhost:8080/api/v1/auth/oauth/apple/callback
APPLE_OAUTH_CLIENT_ID=

BBG_FACEBOOK_OAUTH_REDIRECT_URI=http://localhost:8080/api/v1/auth/oauth/facebook/callback
FACEBOOK_OAUTH_CLIENT_ID=
FACEBOOK_OAUTH_CLIENT_SECRET=

BBG_INSTAGRAM_OAUTH_REDIRECT_URI=http://localhost:8080/api/v1/auth/oauth/instagram/callback
INSTAGRAM_OAUTH_CLIENT_ID=
INSTAGRAM_OAUTH_CLIENT_SECRET=

AWS_SES_REGION=ap-south-1
AWS_SES_FROM_EMAIL=
```

The PHP container receives these values through `docker-compose.yml`. Recreate/restart the PHP container after changing environment values. The existing Docker PHP image includes cURL and the Redis extension.

## Provider console configuration

### Google

1. Create a Web application OAuth client in Google Cloud Console.
2. Configure the authorized redirect URI shown above (or the production HTTPS URI).
3. Enable the Google identity scopes `openid`, `email`, and `profile`.
4. Put the client ID and client secret in `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`.

### Apple

1. Enable Sign in with Apple for the relevant Apple Developer App ID.
2. Create/configure a Services ID as the web client identifier.
3. Configure the domain and exact return URL in the Apple Developer console.
4. Set the Services ID in `APPLE_OAUTH_CLIENT_ID`.

The current web flow validates the Apple ID token directly against Apple's published signing keys and binds the request to a one-time state and nonce. The Apple authorization response is configured for `form_post`.

### Facebook

1. Create a Meta app and enable the Facebook Login use case for web.
2. Add the exact callback URL to Valid OAuth Redirect URIs.
3. Request `public_profile` and `email`.
4. Set the app ID and app secret in the matching environment variables.

The backend validates the returned access token against the configured Meta app before using the profile subject. The returned Facebook email is not treated as a verified email for automatic linking; BBG sends its own OTP.

### Instagram

1. Configure an Instagram Login product/use case in Meta for Developers.
2. Use the Instagram Login flow and add the exact callback URL.
3. Request `instagram_business_basic`.
4. Use an Instagram Business or Creator account for testing.
5. Set the Instagram App ID and App Secret in the matching environment variables.

Do not use a personal Instagram account. Instagram is not a general-purpose login provider for consumer accounts.

## Email OTP delivery

When a provider identity is not already linked and the provider does not assert a verified email, BBG asks the user for an email address and sends a six-digit OTP through Amazon SES.

Configure:

- `AWS_SES_FROM_EMAIL`: a verified SES sender email address or identity.
- `AWS_SES_REGION`: the region containing that SES identity.
- AWS credentials through the standard AWS SDK credential chain (for local development, the existing `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` variables; in production, prefer an instance/task role).

If the SES account is still in the SES sandbox, recipient addresses must also be verified. Request production access before allowing arbitrary customer addresses.

OTP challenge state and OAuth state are stored in Redis with short TTLs. OTP values are HMAC-hashed before storage, are single-use, have a bounded attempt count, and have a resend cooldown. No OTP table or migration is introduced.

## Account linking rules

- `USER_IDENTITIES(provider, provider_subject)` is the external identity key. Email is never used as the provider identity key.
- A previously linked provider subject signs into its existing BBG user.
- A new Google/Apple identity can silently link to an existing BBG account only when the provider explicitly marks the email as verified.
- Facebook and Instagram identities require BBG email OTP verification before linking.
- A new verified social account creates one central BBG user with a nullable password and a linked `USER_IDENTITIES` row.
- User creation and identity linking are performed in a database transaction.
- Provider access tokens are not persisted in the database.

## Security and production checklist

- Use HTTPS for all deployed callback URLs and the frontend origin.
- Set `AUTH_REFRESH_COOKIE_SECURE=true` in production.
- If frontend and API are cross-site, configure `AUTH_REFRESH_COOKIE_SAMESITE=None` together with Secure cookies and matching CORS credentials/origins.
- Keep provider secrets and AWS credentials out of source control and browser bundles.
- Restrict CORS to the exact frontend origin.
- Verify provider app review, redirect URLs, scopes and business verification requirements before production use.
- Test provider cancellation, expired state, repeated callback, unverified email, OTP expiry, resend cooldown, incorrect OTP limit, existing-account linking and duplicate callback scenarios.
