# Authentication Feature

## Implemented
- Password login at `/login` and registration at `/register` (extend shared auth experience).
- Shared auth popup via `AuthDialogService` / `AuthPopupComponent`.
- Storefront-scoped login at `/store/:businessSlug/login`.
- Social providers (Google, Facebook, Apple, Instagram) via `AuthService`, plus `/auth/social/callback`.
- Reactive form validation aligned with backend limits (password ≥ 8, name ≤ 150, email ≤ 190, mobile ≤ 25).
- Successful registration is followed by password login when using the email/password path.
- Session restore on bootstrap via refresh cookie; Bearer access token stays in memory.

## Notes
- Registration accepts email, mobile, or both; at least one identifier is required for password signup.
- Failed API requests surface backend `msgArr` diagnostics where available.
- Core auth implementation lives in `src/app/core/auth`.
