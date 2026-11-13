# BBG Frontend Implementation Notes

## Scope implemented

- The public marketplace remains the discovery entry point.
- Business storefront routes now render through a dedicated storefront layout rather than inheriting the BBG public navigation and footer.
- Storefront shell includes business identity, logo, category, navigation, contact actions, customer sign-in and registration links, and BBG attribution.
- Authentication accepts an internal `returnUrl` and rejects protocol-relative or authentication-loop destinations.
- The homepage has a directory search entry point and a business-owner registration call to action.
- Light/dark theme preference supports light, dark and system modes; the preference is stored locally where browser storage is available.
- Route metadata, canonical URLs, Open Graph metadata and JSON-LD are managed centrally. Storefront metadata uses the public business details already returned by the marketplace API.
- PWA manifest, icon, offline fallback and a public-shell service worker are included.

## Data and contract constraints

The existing public home-summary response currently exposes categories, businesses and promotions. The inspected frontend contract does not expose monthly business rankings or monthly product rankings. The homepage therefore does not fabricate a "top business" or "top product" list, rank, rating, sales count or popularity score. A verified ranking feature requires a documented backend response and agreed ranking methodology before UI wiring.

The current business detail and product list endpoints are reused. Storefront pages read the existing business and product records; no duplicate storefront catalogue is introduced. No backend endpoint, DTO, database table, authentication flow, permission or tenant policy is changed by this frontend work.

## PWA cache policy

The service worker caches only the static application shell and same-origin static assets. Requests to API paths and URL paths containing authentication, token, payment, proof, admin or tenant markers are excluded. No runtime caching of API responses, user profiles, tenant records, order state or payment information is enabled. The worker does not force immediate activation over an existing open application; the updated worker takes control after the previous worker's clients close.

## SEO release requirements still requiring deployment configuration

- Set the production canonical origin and verify redirects from all alternate hostnames.
- Generate sitemap XML from the actual public business, product and promotion records at the deployment origin. Do not include authenticated workspace routes.
- Verify server-side rendering or prerendering for public discovery and storefront routes. This Angular client-rendered change alone does not guarantee crawler-visible dynamic business content.
- Configure server fallback for Angular routes and verify robots, canonical, JSON-LD, Open Graph and 404 responses with production URLs.
- Add business-specific structured-data types only when the business category and verified fields support them; the generic LocalBusiness type is the current conservative fallback.

## Verification

The repository was updated through GitHub source operations. A local Angular production build, unit test run, browser accessibility audit, Lighthouse run and real-device PWA install/offline test have not been executed in this environment. Run these checks in the project workspace before merge or deployment.
