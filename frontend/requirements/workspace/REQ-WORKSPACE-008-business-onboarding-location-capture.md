---
id: REQ-WORKSPACE-008
title: Business onboarding location capture and editable address
area: workspace
type: enhancement
owner: unset
status: in-progress
---

# Business onboarding location capture and editable address

## 1. Problem
Business registration needs a convenient way to capture the device's current coordinates and prefill a readable address, while allowing the applicant to correct the address to the actual business premises.

## 2. Scope
- Use the browser Geolocation API only after an explicit user click.
- Request permission and capture latitude, longitude and reported accuracy.
- Use OpenStreetMap Nominatim reverse lookup to prefill available address fields.
- Keep all address fields editable after lookup.
- Allow manual address entry when geolocation is denied, unavailable or fails.
- Allow an authenticated user to submit multiple business registrations; an existing business must not block a new one.
- Store latitude and longitude independently from the editable address.
- A later address edit must not mutate the captured coordinates.
- A subsequent explicit Get My Location action may replace the coordinates and detected address.
- Do not add a map SDK, Google Maps dependency, API key or mandatory geolocation requirement.

## 3. User flow
1. Applicant opens business registration.
2. Applicant may manually enter the business address, or select Get My Location.
3. Browser permission is requested.
4. On success, coordinates and reported accuracy are captured.
5. Nominatim reverse lookup attempts to populate address line 1, address line 2, city, state and postal code.
6. Applicant reviews and may edit every address field.
7. If location or reverse lookup fails, the applicant can continue with manual entry.
8. Registration sends address and coordinates as independent values.
9. A user with one or more existing business tenants can start and submit another business registration.
10. A successful registration shows the business application status screen without requiring an immediate workspace-context switch.

## 4. Data and validation
- `latitude` is optional and must be within -90 to 90.
- `longitude` is optional and must be within -180 to 180.
- Address values remain subject to existing field validation.
- Coordinate values are nullable and are not inferred from manually edited address text.
- Widen the existing coordinate columns to `DOUBLE(10,7)` so normal GPS precision is not lost by the existing `DOUBLE(10,2)` definition.
- Apply the migration only after verifying the live schema and taking a backup.

## 5. Privacy, provider and attribution
- Location is requested only after the user clicks the button.
- Explain that device location may differ from the business premises and the applicant must confirm the address.
- Display OpenStreetMap attribution beside the detected address.
- Nominatim is a user-triggered reverse lookup only; do not implement autocomplete, bulk geocoding or periodic lookups.
- Public Nominatim is capacity-limited and subject to its usage policy. For sustained production traffic, use an approved hosted/self-hosted provider or a server-side proxy with caching and application-wide rate limiting.
- HTTPS is required by browsers for geolocation in production.

## 6. Authorization and compatibility
- This requirement does not change authentication, roles, permissions, route guards, tenant membership, tenant authorization, interceptors or RBAC policy.
- Preserve the existing business registration endpoint, request envelope and all existing validation.
- No authorization decision may rely on browser-provided coordinates.

## 7. Acceptance criteria
1. Get My Location is explicit and never prompts on page load.
2. A successful geolocation request captures latitude and longitude.
3. Reverse lookup prepopulates available address parts.
4. Detected address fields remain editable.
5. Manual address entry works without location permission.
6. Geolocation denial/failure does not block registration.
7. Editing address does not change captured coordinates.
8. Clicking Get My Location again refreshes coordinates and detected address.
11. Backend validates coordinate ranges and persists nullable values.
12. Coordinates are returned by the existing business application read operation.
13. Existing authentication, RBAC, workspace guards and tenant authorization remain unchanged.

## Open questions
- UNKNOWN: Production traffic volume and whether BBG should proxy/cache Nominatim requests before public launch.
- UNKNOWN: Verify the live database coordinate column precision before applying the migration.

## Implementation log
- Implemented browser-triggered geolocation, editable Nominatim address prefill, independent coordinate payload fields, backend coordinate validation/persistence, and a coordinate-precision migration.
- Removed the single-application-per-user restriction and allowed registration to be opened when the user already owns other businesses. Successful submission now navigates to the business application status page rather than forcing an immediate pending-tenant context switch.
- Build, PHP syntax checks, migration execution and authenticated browser tests remain pending.
