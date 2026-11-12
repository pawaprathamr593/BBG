# Authentication Feature

## Implemented
- Responsive password login page at `/login`.
- Responsive account registration page at `/register`.
- Reactive form validation matching the current backend's minimum password length (8), full-name limit (150), email limit (190), and mobile limit (25).
- Auth requests and session state are implemented in `src/app/core/auth`.

## Current scope and limitations
- Registration accepts email, mobile, or both; at least one identifier is required.
- Login accepts a single email/mobile identifier and password.
- Successful login/registration stores the access token only in memory and receives the refresh token through the backend's HttpOnly cookie.
- Social providers, verification, forgot-password, account linking, and business onboarding screens are not part of this feature yet.
- The public overview shell remains the default route. Login and registration routes are directly accessible; authenticated workspace routes/guards will be added when workspace navigation is introduced.
- Error text currently displays the backend's `msgArr` messages.
