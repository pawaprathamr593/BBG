# BBG Frontend Implementation Notes

## Scope implemented

- The public marketplace remains the discovery entry point, with homepage business search, category discovery, published business cards, latest promotions and a business-owner registration call to action.
- Business storefront routes render through a dedicated storefront layout rather than inheriting the BBG public navigation and footer.
- Storefront shell includes business identity, logo, category, navigation, product/about/contact anchors, contact actions, customer sign-in and registration links, and BBG attribution.
- Storefront product pages remain nested under the business URL and use the existing marketplace product-detail endpoint.
- Authentication accepts an internal `returnUrl` and rejects protocol-relative or authentication-loop destinations.
- Light/dark theme preference supports light, dark and system modes; the preference is stored locally where browser storage is available. Theme controls are present in public, storefront, authentication and workspace layouts.
- Route metadata, canonical URLs, Open Graph metadata, private-route noindex directives and JSON-LD are managed centrally. Storefront metadata uses public business details; product pages use the existing product response.
- PWA manifest, icon, offline fallback and a public-shell service worker are included.
- Responsive styling, keyboard skip links, focus visibility and reduced-motion handling are retained or applied to the updated layouts.

## Data and contract constraints

The existing public home-summary response exposes categories, businesses and promotions. The inspected frontend contract does not expose monthly business rankings or monthly product rankings. The homepage therefore does not fabricate a "top business" or "top product" list, rank, rating, sales count or popularity score. A verified ranking feature requires a documented backend response and agreed ranking methodology before UI wiring.

The current directory query contract exposes search, category, city and state filters. It does not expose a locality-specific filter, so locality-level discovery cannot be implemented accurately without an approved API contract extension.

The current business detail and product list/detail endpoints are reused. Storefront pages read the existing business and product records; no duplicate storefront catalogue is introduced. No backend endpoint, DTO, database table, authentication policy, permission or tenant policy is changed by this frontend work.

The consumer, entrepreneur and admin areas retain the existing configuration-driven workspace action interface. Theme and responsive presentation were improved, but domain-specific management forms were not invented where the current frontend/backend contract does not define field-level request and response behavior.

## PWA cache policy

The service worker caches only the static application shell, approved `/assets/` and `/icons/` files, and hashed application bundles. Requests with query strings, API paths and URL paths containing authentication, token, payment, proof, admin, tenant, upload or media markers are excluded. No runtime caching of API responses, user profiles, tenant records, order state or payment information is enabled. The worker does not force immediate activation over an existing open application; the updated worker takes control after the previous worker's clients close.

## SEO / AEO / GEO release requirements still requiring deployment configuration

- Set the production canonical origin and verify redirects from all alternate hostnames.
- Generate sitemap XML from the actual public business, product and promotion records at the deployment origin. Do not include authenticated workspace routes.
- Verify server-side rendering or prerendering for public discovery and storefront routes. This Angular client-rendered change alone does not guarantee crawler-visible dynamic business content.
- Configure server fallback for Angular routes and verify robots, canonical, JSON-LD, Open Graph and 404 responses with production URLs.
- Add business-specific structured-data types only when the business category and verified fields support them; the generic `LocalBusiness` type is the current conservative fallback.
- Build substantial city/locality/category landing pages only when there is unique, useful content and an approved public data contract; avoid thin or duplicate programmatic SEO pages.

## Verification

GitHub Actions run [`43389731713`](https://github.com/pawaprathamr593/BBG/actions/runs/43389731713) completed successfully on 13 November 2026:
- `npm ci`: passed
- `npm run build`: passed
- `npm test -- --watch=false`: passed, 4 test files and 9 tests

The production build still reports non-blocking component-style budget warnings for the business directory, workspace and homepage styles. Browser accessibility review, Lighthouse/SEO audit, real-device PWA install/offline testing and production URL verification have not been performed. No merge or deployment was performed.
