# Public Marketplace Feature

## Implemented pages
- Home: home summary, categories, featured businesses and latest promotions.
- Business directory: search, city/state/category filters and server pagination.
- Business storefront: published business profile and product list.
- Product detail: product data and variants.
- Promotions: public feed with server pagination.
- Promotion detail: promotion content, publication dates and media references.

## API service
MarketplaceService uses the registered POST routes in backend/config/common/routes.php and the marketplaceParam envelope. Controller dispatch and data contracts were checked against:
- backend/src/Modules/Api/V1/Controllers/MarketplaceController.php
- backend/src/Modules/Api/V1/Services/Implementations/MarketplaceServicesV1.php
- backend/src/Services/Implementations/MarketplaceServices.php
- backend/src/Dao/MarketplaceDao.php

Confirmed request fields:
- Business list: page, page_size, search, city, state, category_id.
- Business detail: business_slug.
- Product list: business_slug, page, page_size, search.
- Product detail: business_slug, product_id.
- Promotion list: page, page_size, business_slug (optional).
- Promotion detail: promotion_id.

Home summary returns categories, businesses and promotions. Business detail returns business and storefront. Product detail returns product and variants. Promotion detail returns promotion and media. List responses use items and pagination with page, page_size and total.

## Guardrails
- Public queries rely on backend DAO filters for active/published/approved records.
- No fake sample business/product/promotion data is inserted into the UI.
- Price is rendered only when the backend includes selling_price; otherwise the page says price on request.
- Media file paths are treated as backend-provided references. Their deployed public URL resolution still requires environment verification.
- Consumer cart/order/enquiry actions are not added to public pages in this increment.
- No tenant workspace, inventory or purchasing routes are active.

## Tests and validation
marketplace.service.spec.ts checks the home request envelope and business-directory filter payload. Tests and Angular build have not yet been run in this environment.
