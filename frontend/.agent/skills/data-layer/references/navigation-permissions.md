# Routes and permissions

## Routing conventions

- Define routes in `app.routes.ts` with lazy `loadComponent` (workspace shell uses a parent `component` + children).
- Set a human `title` on each route.
- Keep storefront under `/store/:businessSlug` with children.
- Keep workspace under `/dashboard` with `WorkspaceLayout` children (`''`, `catalogue`, `:section`).
- Do not rename public paths without an explicit product decision.

## Shell behaviour

`App` hides the public header/footer when:

- path starts with `/store/`
- path is `/dashboard` or starts with `/dashboard/`

Preserve that when adding routes.

## Permissions

- Permissions come from dashboard/workspace APIs into `WorkspaceContextService`.
- Gate actions in feature hosts (hide/disable). Unknown permission → deny.
- Do not invent permission codes; copy exact strings from existing workspace nav / module code or backend docs.
- Frontend checks are UX only; backend must enforce.

## Auth entry points

| Entry | Mechanism |
| --- | --- |
| `/login`, `/register` | Feature pages extending / composing auth experience |
| Storefront `/store/:slug/login` | `StorefrontLogin` + `AuthExperienceComponent` |
| Header / gated actions | `AuthDialogService` + `AuthPopupComponent` |
| Social return | `/auth/social/callback` |

After auth success, preserve existing redirect / dialog-complete behaviour.
