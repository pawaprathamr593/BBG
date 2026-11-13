# BBG Public Marketplace Discovery API

**Version:** 1.0  
**Status:** Implemented on the `development` branch; runtime verification pending  
**Audience:** Angular public marketplace client

All endpoints are POST-only and use the existing marketplace request envelope:

```json
{
  "marketplaceParam": {
    "actionData": {
      "page": 1,
      "page_size": 8
    }
  }
}
```

The response envelope remains:

```json
{
  "status": "SUCCESS",
  "msgArr": [],
  "data": {}
}
```

## Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/marketplace/businesses/popular` | Businesses ranked by recorded profile views plus active customer enquiries |
| `POST /api/v1/marketplace/businesses/recent` | Currently published businesses ordered by `BUSINESS_PROFILES.created_on` |
| `POST /api/v1/marketplace/products/recent` | Currently published products across all eligible published storefronts, ordered by `PRODUCTS.created_on` |
| `POST /api/v1/marketplace/home` | Existing home summary, extended with the three discovery collections |

## Popular-business ranking

The ranking uses actual persisted counts:

- `view_count`: active `CONTENT_VIEWS` rows where `content_type = 'BUSINESS'`, joined by both `tenant_id` and business-profile `content_id`.
- `enquiry_count`: active `CUSTOMER_ENQUIRIES` rows for the business tenant.
- `engagement_count`: `view_count + enquiry_count`; no weighting or fabricated score.
- The ranking period is all-time; `view_count` is the number of active persisted view events, not unique visitors.
- Businesses with zero recorded views and zero active enquiries are excluded from the popular list.
- Tie-break order: engagement count, views, enquiries, business name, then profile ID.

The existing `POST /api/v1/engagement/views/record` endpoint now accepts `content_type = 'BUSINESS'` with the public business-profile ID as `content_id`. The request still requires an authenticated user or a `visitor_key`. Business-profile views begin accumulating only after the public business detail page calls this endpoint; no historical business-view counts are fabricated.

Sales are not included in this ranking. The current public marketplace ranking does not infer completed sales from order records.

## Recent-business and recent-product timestamps

The current schema has no dedicated `published_on` column on `BUSINESS_PROFILES` or `PRODUCTS`. Both feeds therefore:

1. Filter to records whose publication status is `PUBLISHED` and whose operational status is active.
2. Require an approved, published business profile, an active tenant and an active storefront.
3. Sort by `created_on DESC`, then ID descending.
4. Return `sort_basis = 'created_on'` and a timestamp note in the dedicated endpoint response.

The homepage displays this caveat. Do not describe `created_on` as the exact publication time. A future schema enhancement may add an immutable publication timestamp, but that is not part of this change.

## Home-summary response additions

The existing `categories`, `businesses` and `promotions` keys remain available. The response now also contains:

- `popular_businesses`
- `recent_businesses`
- `recent_products`
- `discovery_meta`

The legacy `businesses` collection retains its existing directory ordering and contract; clients should use `popular_businesses` for the homepage popularity section.

## Database support

Migration `../database/migrations/20261113_001_public_marketplace_engagement.sql` creates `CONTENT_VIEWS` and `CUSTOMER_ENQUIRIES` only when they do not already exist. It is additive and does not alter existing tables. Review the live schema and take a backup before applying it. The migration is not automatically executed by this code change.

## Security and tenancy

- All discovery queries are public-read-only and return only published/approved businesses and active published products.
- Business metrics are aggregated by tenant; business view rows are joined by tenant and profile ID.
- No client-supplied tenant ID is accepted for discovery.
- Tenant-private enquiry, order or customer details are never returned by these endpoints.
