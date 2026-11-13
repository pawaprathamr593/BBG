# BBG Frontend Implementation Notes

## Scope implemented on this branch

- The BBG public marketplace remains the discovery entry point, with homepage business search, category discovery, published business cards, promotions and a business-owner registration call to action.
- Business storefronts use a separate layout with business branding, their own header/navigation/footer, and dedicated Home, About, Products, Promotions and Contact routes.
- Storefronts reuse the existing public business, product and promotion records. No duplicate catalogue or business records are created.
- Storefront contact pages support direct phone, email and enabled WhatsApp links. Signed-in customers can submit enquiries using the existing POST /api/v1/enquiries/create contract. The customer must sign in before submitting; the originating storefront URL is retained.
- Product pages support variant selection, quantity input and authenticated add-to-cart using the existing cart API. Variant selection is required for variant products.
- Each business has a separate customer cart. The cart page supports quantity updates, item removal, clearing and checkout with the backend-required shipping-address fields. Checkout confirmation explicitly shows the order as UNPAID; no payment is collected or implied.
- Storefront customer sign-in/registration returns to the originating storefront. Signed-in storefront customers can open their account and sign out.
- Authentication route guards restore the rotating refresh-token session before deciding access.
- Entrepreneur workspace loads the user's active tenant memberships and provides a business selector. Tenant-scoped actions receive the selected tenant_id automatically, while the backend remains responsible for membership, permission and resource checks.
- Permission context retains platform permissions while replacing the active tenant permission snapshot. The platform-admin route is protected by verified PLATFORM scope; navigation does not expose admin links to users without that verified scope.
- Light/dark/system theme preference is supported across public, authentication, storefront and workspace layouts.
- Route metadata, canonical URLs, Open Graph metadata, private-route noindex directives and JSON-LD are managed centrally. Storefront pages use public business details; product and promotion pages use their existing public API data.
- A sitemap generator is available as npm run generate:sitemap. It reads public businesses, products and promotions from the existing API, writes public/sitemap.xml, and adds the configured sitemap URL to public/robots.txt.
- PWA manifest, icon, offline fallback and a public-shell service worker are included. The service worker excludes API and sensitive/private paths from caching.
- Responsive styling, keyboard skip links, visible focus states and reduced-motion handling are retained or applied to the updated layouts.

## Data and contract constraints

The public home-summary response exposes categories, businesses and promotions. It does not provide verified monthly business rankings or monthly product rankings. The homepage therefore does not invent a "top business" or "top product" list, rank, rating, sales count or popularity score. A ranking feature still needs an approved ranking methodology and backend response.

The current business-directory contract supports search, category, city and state filters, but not locality-specific filtering. Locality discovery needs an approved API contract extension.

The current public product queries do not return product media records. The public business detail API returns logo and cover image fields, but no full gallery or service catalogue endpoint was identified. Product image galleries, business gallery pages and structured service catalogues therefore remain unavailable until the public API exposes those records.

The management workspace uses the registered backend routes and module envelopes. Actions with contract-dependent request fields retain a JSON payload editor rather than guessing DTO fields. The backend status documentation marks broader tenant member management, notifications, expense/cash workflows, invoice generation, payment gateway integration and OAuth provider integration as unimplemented or guarded. Those are not presented as completed frontend capabilities. Inventory and purchasing remain future scope and have no active frontend routes.

No backend endpoint, DTO, database table, authentication policy, permission seed, tenant policy or business rule was changed by this frontend work.

## PWA cache policy

The service worker caches only the static application shell, approved /assets/ and /icons/ files, and hashed application bundles. Requests with query strings, API paths and URL paths containing authentication, token, payment, proof, admin, tenant, upload or media markers are excluded. No runtime caching of API responses, user profiles, tenant records, order state or payment information is enabled. The worker does not force immediate activation over an existing open application; the updated worker takes control after the previous worker's clients close.

## SEO / AEO / GEO release requirements still requiring deployment configuration

- Set BBG_PUBLIC_ORIGIN and BBG_API_BASE_URL, then run npm run generate:sitemap during a release build. The generator has not been run against production data in this implementation session.
- Verify server-side rendering or prerendering for public discovery and storefront routes. This Angular client-rendered change alone does not guarantee crawler-visible dynamic business content.
- Configure server fallback for Angular routes and verify robots, canonical, JSON-LD, Open Graph and 404 responses with production URLs.
- Add business-specific structured-data types only when the business category and verified fields support them; generic LocalBusiness is the current conservative fallback.
- Build substantial city/locality/category landing pages only when there is unique, useful content and an approved public data contract; avoid thin or duplicate programmatic SEO pages.

## Verification

GitHub Actions run 43394793634 completed successfully on 13 November 2026:
- npm ci: passed
- Sitemap generator syntax check: passed
- Angular production build: passed
- Unit tests: passed, 6 test files and 15 tests

The build has non-blocking component stylesheet budget warnings, including the storefront cart and existing business directory/home styles. Browser accessibility review, Lighthouse/SEO audit, end-to-end user journeys, real-device PWA install/offline testing and production URL verification remain outstanding. No merge or deployment was performed.
