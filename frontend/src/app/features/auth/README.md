# Authentication Feature

## Implemented
- Responsive password login page at `/login`.
- Responsive account registration page at `/register`.
- Reactive form validation matching the current backend's minimum password length (8), full-name limit (150), email limit (190), and mobile limit (25).
- Successful registration is followed by a normal password login; the backend registration endpoint itself does not issue a session.
- Signed-in navigation displays the current user's name and exposes sign out.
- Auth requests and session state are implemented in `src/app/core/auth`.

## Current scope and limitations
- Registration accepts email, mobile, or both; at least one identifier is required.
- Login accepts a single email/mobile identifier and password.
- Successful login stores the access token only in memory and receives the refresh token through the backend's HttpOnly cookie.
- On application bootstrap, the app attempts refresh-cookie rotation to restore an existing session.
- The overview remains public. Authenticated workspace routes/guards will be added when workspace navigation is introduced.
- Social providers, verification, forgot-password, account linking, business onboarding and logout-all UI are not part of this feature yet.
- Failed API requests display the backend's `msgArr` diagnostics where available.
