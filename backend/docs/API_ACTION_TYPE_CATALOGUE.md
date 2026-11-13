# BBG API v1 — Route-derived Core Services actionType catalogue

**Status:** Implemented on `fix/bbg-seven-layer-audit`  
**Date:** 13 November 2026  
**Purpose:** Make the matched HTTP route the authoritative operation selector at the Controller → Versioned Services → Core Services boundary.

## Contract

1. Every registered API route remains POST and retains its existing URL.
2. The controller resolves the operation from the matched request path and writes that value to the module parameter's `actionType`.
3. Core Services Level 1 validates the envelope and dispatches on `actionType`; it does not select the operation from a client-supplied `actionData.action`.
4. Before passing the payload to existing Level 2 workers, Core Services sets `actionData.action` from the validated `actionType`. This preserves the existing worker input shape while removing client control over the operation.
5. Internal Auth Core Services calls use their explicit action as `actionType` (for example, `getPrincipal` or `getProfile`).
6. Unsupported action types reach the Level 1 default/failure path.

## Action catalogue

| Module | Core Services entry point | Allowed route-derived `actionType` values |
|---|---|---|
| Auth — read | `getAuth` | `getProfile`, `getPermissions`; internal-only: `getPrincipal` |
| Auth — manage | `manageAuth` | `register`, `login`, `refresh`, `logout`, `logoutAll`, `updateProfile` |
| Cart — read | `getCart` | `getCart` |
| Cart — manage | `manageCart` | `addItem`, `updateItem`, `removeItem`, `clearCart`, `checkout`, `whatsappOrder` |
| Orders — read | `getOrders` | `listMyOrders`, `getMyOrder`, `listTenantOrders`, `getTenantOrder` |
| Orders — manage | `manageOrders` | `changeTenantOrderStatus` (the controller supplies the route-defined `new_status` for confirm/cancel routes) |
| Marketplace — read | `getMarketplace` | `listBusinesses`, `getBusiness`, `listProducts`, `getProduct`, `listPublicCategories`, `listPublicPromotions`, `getPublicPromotion`, `getHomeSummary` |
| Tenant — read | `getTenant` | `listMyTenants`, `getMyTenant`, `listTenantMembers` |
| Business — read | `getBusiness` | `getMyBusinessApplication`, `getMyBusinessProfile`, `getBusinessVerification`, `getMyStorefront` |
| Business — manage | `manageBusiness` | `submitBusinessApplication`, `updateBusinessApplication`, `resubmitBusinessApplication`, `updateMyBusinessProfile`, `updateMyStorefront`, `publishMyStorefront`, `unpublishMyStorefront` |
| Catalogue — read | `getCatalogue` | `listUnitsOfMeasure`, `listTenantProductCategories`, `listTenantProducts`, `getTenantProduct`, `listProductMedia` |
| Catalogue — manage | `manageCatalogue` | `createTenantProductCategory`, `updateTenantProductCategory`, `deleteTenantProductCategory`, `createTenantProduct`, `updateTenantProduct`, `deleteTenantProduct`, `generateProductMediaUploadUrl`, `linkProductMedia`, `deleteProductMedia` |
| Customer — read | `getCustomer` | `getMyCustomerProfile`, `listMyAddresses` |
| Customer — manage | `manageCustomer` | `createMyAddress`, `updateMyAddress`, `deleteMyAddress`, `setDefaultAddress` |
| Enquiry — read | `getEnquiry` | `listMyEnquiries`, `getMyEnquiry`, `listTenantEnquiries`, `getTenantEnquiry` |
| Enquiry — manage | `manageEnquiry` | `createCustomerEnquiry`, `respondToEnquiry`, `closeEnquiry` |
| Promotion — read | `getPromotion` | `listMyPromotions`, `getMyPromotion`, `getPromotionEngagement` |
| Promotion — manage | `managePromotion` | `createPromotion`, `updatePromotion`, `deletePromotion`, `publishPromotion`, `unpublishPromotion` |
| Engagement — read | `getEngagement` | `listContentComments` |
| Engagement — manage | `manageEngagement` | `toggleContentLike`, `createContentComment`, `reportContent`, `recordContentView` |
| Subscription — read | `getSubscription` | `listActivePlans`, `listMySubscriptions`, `getMySubscription` |
| Subscription — manage | `manageSubscription` | `requestSubscription`, `requestSubscriptionRenewal`, `generateSubscriptionProofUploadUrl`, `submitSubscriptionProof` |
| Admin — read | `getAdmin` | `listPlatformUsers`, `getPlatformUser`, `listPendingBusinesses`, `getBusinessForReview`, `listPendingSubscriptions`, `getSubscriptionForReview`, `listActiveSubscriptions`, `listAdminCategories`, `getCategoryStatistics`, `getAdminAnalyticsSummary`, `getAdminAnalyticsTrends`, `listModerationQueue`, `listModerationHistory`, `getSafeSystemHealth` |
| Admin — manage | `manageAdmin` | `suspendPlatformUser`, `restorePlatformUser`, `approveBusiness`, `rejectBusiness`, `reopenBusinessReview`, `approveSubscription`, `rejectSubscription`, `createCategory`, `updateCategory`, `deleteCategory`, `applyModerationAction` |
| Payment — read | `getPayment` | `listMyPayments`, `getMyPayment`, `listTenantPayments`, `getTenantPayment` |
| Dashboard — read | `getDashboard` | `getConsumerDashboard`, `getEntrepreneurDashboard` |

## Notes

- This catalogue describes the current registered routes and internal action names; it does not introduce new public routes except the separately documented subscription proof upload-URL route.
- Tenant management write operations remain unsupported and are not listed as public actions.
- The action names are operation identifiers, not authorization grants. Each Level 2 worker must continue to enforce authentication, tenant membership, permission and resource ownership checks.
- The API response envelope and request payload field names are unchanged.
