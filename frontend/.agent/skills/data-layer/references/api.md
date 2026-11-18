# BBG API patterns

## Base URL

Inject `API_BASE_URL` from `core/config/api-base-url.ts`. Paths are relative to that origin (e.g. `/api/v1/auth/login`).

## Envelope shape

Most write/read actions POST a typed envelope:

```ts
{
  authParam: { actionType: string; actionData: Record<string, unknown> }
  // or businessParam | customerParam | orderParam | enquiryParam |
  // paymentParam | promotionParam | subscriptionParam | adminParam |
  // tenantParam | dashboardParam
}
```

Responses typically:

```ts
{ status: 'SUCCESS' | 'FAILED' | 'EXCEPTION'; msgArr?: string[]; data?: T | [] }
```

Treat `data` as untrusted. Narrow before use (`!Array.isArray(data)`, field checks). User-facing errors prefer `msgArr` via `AuthService.errorMessage` or equivalent.

## Existing service homes

| Concern | Service |
| --- | --- |
| Auth | `core/auth/auth.service.ts` |
| Marketplace discovery | `core/marketplace/marketplace-api.service.ts` |
| Dashboard / permissions | `core/dashboard/dashboard-api.service.ts` |
| Business registration | `core/business/business-registration-api.service.ts` |
| Catalogue | `features/catalogue/catalogue-api.service.ts` |
| Multi-section workspace modules | inline requests in `features/dashboard/dashboard-module.ts` (prefer extracting only when touching that area) |

## Auth headers and cookies

- Bearer access token: interceptor (memory)
- Refresh / logout: `withCredentials: true` + existing CSRF header pattern in `AuthService`
- Do not log tokens or raw auth payloads

## Adding an endpoint

1. Confirm path + envelope in backend docs or existing calls.
2. Add a typed method on the appropriate service.
3. Map DTO → view model in the service when the UI needs a stable shape.
4. Do not change existing field names to “clean them up” without a coordinated API change.
