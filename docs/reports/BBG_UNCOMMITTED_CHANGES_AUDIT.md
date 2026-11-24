# BBG — Uncommitted Changes Audit, Implementation Review & Testing Report

**Date:** November 24, 2026  
**Repository:** Bavdhan Business Group (BBG) Platform (`dark-store`)  
**Current Branch:** `feature/business-onboarding-from-workspace-base`  
**Auditor Roles:** Senior Full-Stack Architect, Angular Architect, Yii 3 Backend Developer, QA Engineer & Code Reviewer  
**Audit Scope:** Complete working tree analysis of all uncommitted files, recent developments, automated builds, test results, architecture compliance, security/RBAC, and commit readiness.

---

## A. Executive Summary

### Implementation Condition
The local working tree contains significant, high-value functional enhancements covering subscription lifecycle management, 2-day grace periods, zero/undeclared price fallbacks, marketplace promotion detail navigation, and payment proof verification workflows. 

The backend implementation strictly adheres to the established BBG Yii 3 architecture (`InDto → Controller → Services → DAO`), preserving tenant isolation, `$resArr` response envelopes, and SQL-level security. The frontend components leverage modern Angular 22 standalone paradigms, signals (`signal`, `computed`), OnPush change detection, and responsive layouts.

### Total Files Changed
- **Total Modified Files:** 33 files
- **Total Untracked Files / Directories:** 5 paths (comprising 8 new files)
- **Insertions / Deletions:** +3,014 insertions / -590 deletions

### Main Development Areas
1. **Commercial Pricing Fallback:** Storefront Product Detail & Product Card fallback to "Price on Request" when selling price is undefined, null, empty, 0, or 0.00, with context-aware WhatsApp CTA ("Contact Business for Price").
2. **Subscription 2-Day Grace Period:** 2-day grace window after `ends_on` implemented across all backend DAOs (`CatalogueDao`, `DashboardDao`, `MarketplaceDao`, `PromotionDao`, `SubscriptionDao`, `TenantDao`), service layer (`SubscriptionServices`), and frontend Business Workspace banners.
3. **Renewal / Upgrade Checkout Drawer & Atomic Submission:** Interactive slide-over drawer allowing merchants to review plans, switch plans, copy UPI, view payee information, and submit payment proof atomically without premature database record creation.
4. **Plan Entitlements Cleaning & Filtering:** Strict parser (`subscription-plan.utils.ts`) that guarantees negative/zero/unavailable values (`0`, `0.00`, `false`, `none`, `unavailable`, `no`) are never displayed on plan cards across marketplace, onboarding, and workspace.
5. **Subscription Card Cleanup & View Details Drawer:** Removal of QR thumbnails from summary list cards, and addition of a dedicated View Details drawer with payment proof verification history, permanent lock enforcement on approved/active/expired plans, and resubmission flows for rejected plans.
6. **Marketplace Promotion Details & Card Polish:** Standalone route `/promotions/:id`, `PromotionDetail` component, primary image framing with placeholder fallback, and comment count preservation in engagement bar.

### Build and Test Status
- **Backend Syntax Check (`php -l`):** PASS (0 syntax errors across all modified PHP files)
- **Backend Unit Tests (`codecept run Unit`):** PASS (38/38 tests, 105/105 assertions passing)
- **Frontend TypeScript Compilation (`npx tsc --noEmit`):** PASS (0 errors)
- **Frontend Unit Tests (`npx ng test --no-watch`):** PASS (19/19 test files, 149/149 unit tests passing)
- **Frontend Production Build (`ng build`):** **FAIL** (exceeded component style budget: `business-subscription-management.scss` is 31.18 kB vs maximum error budget 25.00 kB)
- **Frontend Code Formatting (`npm run format:check`):** FAIL (34 files contain Prettier formatting discrepancies)

### Main Risks
1. **Production CI/CD Build Failure:** `ng build` fails due to `business-subscription-management.scss` exceeding Angular's 25 kB component budget.
2. **Uncommitted Untracked Dependencies:** Crucial utilities (`subscription-plan.utils.ts`) and test files (`SubscriptionPlanRbacTest.php`, `business-subscription-management.spec.ts`) are untracked and must be staged together to prevent breaking downstream CI.

---

## B. Git Working-Tree Summary

- **Current Branch:** `feature/business-onboarding-from-workspace-base`
- **Tracking Branch:** `origin/feature/business-onboarding-from-workspace-base` (Up to date)
- **Staged Changes:** None (`git diff --cached` is empty)
- **Deleted / Renamed Files:** None

### Modified Files (33 files)
```
backend/src/Dao/CatalogueDao.php
backend/src/Dao/DashboardDao.php
backend/src/Dao/MarketplaceDao.php
backend/src/Dao/PromotionDao.php
backend/src/Dao/SubscriptionDao.php
backend/src/Dao/TenantDao.php
backend/src/Services/Implementations/SubscriptionServices.php
frontend/src/app/app.routes.ts
frontend/src/app/core/business/business-registration-api.service.ts
frontend/src/app/core/marketplace/marketplace-api.service.ts
frontend/src/app/features/business-registration/business-registration.html
frontend/src/app/features/business-registration/business-registration.ts
frontend/src/app/features/business-subscriptions/business-subscription-management.html
frontend/src/app/features/business-subscriptions/business-subscription-management.scss
frontend/src/app/features/business-subscriptions/business-subscription-management.ts
frontend/src/app/features/business-workspace/business-workspace.html
frontend/src/app/features/business-workspace/business-workspace.scss
frontend/src/app/features/business-workspace/business-workspace.ts
frontend/src/app/features/dashboard/components/subscription-plans-module/subscription-plans-module.ts
frontend/src/app/features/dashboard/dashboard-module.html
frontend/src/app/features/dashboard/dashboard-module.scss
frontend/src/app/features/dashboard/dashboard-module.ts
frontend/src/app/features/marketplace/promotions/promotion-feed.html
frontend/src/app/features/marketplace/promotions/promotion-feed.ts
frontend/src/app/features/storefront/storefront-product-detail.html
frontend/src/app/features/storefront/storefront-product-detail.ts
frontend/src/app/shared/components/promotion-card/promotion-card.html
frontend/src/app/shared/components/promotion-card/promotion-card.scss
frontend/src/app/shared/components/promotion-card/promotion-card.spec.ts
frontend/src/app/shared/components/promotion-card/promotion-card.ts
frontend/src/app/shared/components/promotion-engagement/promotion-engagement.component.html
frontend/src/app/shared/components/promotion-engagement/promotion-engagement.component.spec.ts
frontend/src/app/shared/components/promotion-engagement/promotion-engagement.component.ts
```

### Untracked Files & Folders (5 paths / 8 files)
```
backend/tests/Unit/Services/SubscriptionPlanRbacTest.php
frontend/src/app/core/subscription/subscription-plan.utils.ts
frontend/src/app/core/subscription/subscription-plan.utils.spec.ts
frontend/src/app/features/business-subscriptions/business-subscription-management.spec.ts
frontend/src/app/features/marketplace/promotions/promotion-detail/promotion-detail.html
frontend/src/app/features/marketplace/promotions/promotion-detail/promotion-detail.scss
frontend/src/app/features/marketplace/promotions/promotion-detail/promotion-detail.spec.ts
frontend/src/app/features/marketplace/promotions/promotion-detail/promotion-detail.ts
frontend/src/app/features/storefront/storefront-product-detail.spec.ts
```

---

## C. Recent Development Traceability

| Development Area | Evidence Found | Files Affected | Current Implementation Status |
|---|---|---|---|
| **Zero / 0.00 Pricing Fallback** | `storefront-product-detail.ts` methods `hasValidPrice()` & `formatPrice()`, WhatsApp price enquiry CTA, unit tests | `storefront-product-detail.html`, `storefront-product-detail.ts`, `storefront-product-detail.spec.ts` | Fully implemented, unit tested, passing |
| **Subscription 2-Day Grace Period** | SQL queries updated with `DATE_ADD(ends_on, INTERVAL 2 DAY)`, `GRACE_PERIOD` status resolution, warning banners | 6 backend DAOs, `SubscriptionServices.php`, `SubscriptionPlanRbacTest.php`, `subscription-plan.utils.ts`, `business-workspace.*` | Fully implemented, unit tested, passing |
| **Renewal / Upgrade Checkout Drawer** | Local slide-over drawer, plan switcher, pending cancellation, atomic DB persistence on submit | `business-subscription-management.*`, `business-registration-api.service.ts` | Fully implemented, unit tested; SCSS budget error on build |
| **Plan Entitlements Sanitization** | `parseOfferedPlanFeatures()` utility omitting 0/false/none/unavailable, humanized limits | `subscription-plan.utils.ts`, `business-registration.*`, `subscription-plans-module.ts`, `business-subscription-management.*` | Fully implemented, unit tested, passing |
| **QR Code Removal from List Cards** | Conditioned `paymentQr` in `dashboard-module.ts` to `payment-qr-settings` section | `dashboard-module.ts` | Fully implemented, verified |
| **View Details Drawer & Proof Locking** | Details drawer with BCN, plan dates, payment info, proof history; permanent lock on approved; resubmit on rejected | `dashboard-module.html`, `dashboard-module.scss`, `business-subscription-management.*` | Fully implemented, unit tested |
| **Marketplace Promotion Detail Page** | Dedicated route `/promotions/:id`, media carousel, bookmarks, sharing, reporting, comments | `app.routes.ts`, `marketplace-api.service.ts`, `promotion-feed.*`, `promotion-detail/*`, `promotion-card.*`, `promotion-engagement.*` | Fully implemented, unit tested, passing |

---

## D. Feature-by-Feature Review

### 1. Commercial Terms & Zero/Empty Price Fallback
- **Expected:** When a product or variant has no price or `0` / `0.00`, display "Price on Request" without displaying currency symbols with zero (`₹0`). WhatsApp action must change to "Contact Business for Price".
- **Actual:** `hasValidPrice()` validates positive numeric values. `formatPrice()` formats via `Intl.NumberFormat`. Schema.org SEO skips pricing when invalid.
- **What Works:** Product cards, detail page commercial card, variants table, WhatsApp deep links.
- **What is Incomplete/Broken:** None.
- **Evidence:** `storefront-product-detail.spec.ts` (8 tests passing).

### 2. Subscription 2-Day Grace Period
- **Expected:** When a merchant's subscription expires, the storefront and public business listing must remain published for 2 calendar days post-expiry. The merchant must see reminder banners with remaining hours.
- **Actual:** Backend queries across `CatalogueDao`, `DashboardDao`, `MarketplaceDao`, `PromotionDao`, `SubscriptionDao`, and `TenantDao` use `(ts.ends_on IS NULL OR DATE_ADD(ts.ends_on, INTERVAL 2 DAY) >= CURRENT_TIMESTAMP)`. `SubscriptionServices` computes `GRACE_PERIOD` status dynamically. `business-workspace` shows a countdown banner with direct renewal CTA.
- **What Works:** Public storefront access during grace period, workspace countdown banner, renewal eligibility during grace window.
- **What is Incomplete/Broken:** None.
- **Evidence:** `SubscriptionPlanRbacTest.php` and `subscription-plan.utils.spec.ts` passing.

### 3. Renewal / Upgrade Slide-Over Checkout Drawer
- **Expected:** Clicking "Renew subscription" or "Upgrade" must open an interactive drawer where the user can inspect details and switch plans locally. Database records must NOT be created on click. DB record is inserted only when user submits payment proof. Pending requests can be cancelled.
- **Actual:** Implemented in `business-subscription-management.ts` with signals `drawerOpen`, `selectedPlan`, `drawerMode`. Submitting calls `requestApplicationSubscriptionRenewal` / `requestApplicationSubscriptionUpgrade` and `uploadApplicationPaymentProof` consecutively. `cancelPendingRequest()` calls `cancelApplicationSubscription`.
- **What Works:** Local plan switching, atomic DB submission, pending cancellation, UPI copy button.
- **What is Broken:** `business-subscription-management.scss` is 31.18 kB, exceeding Angular's 25 kB component budget.
- **Evidence:** `business-subscription-management.spec.ts` (8 tests passing).

### 4. Plan Entitlements Sanitization & Visibility
- **Expected:** Plan cards across the platform and workspace must display what is offered, strictly hiding `0`, `0.00`, `false`, `none`, `unavailable`, and `no`.
- **Actual:** `parseOfferedPlanFeatures()` parses semicolon-delimited key-value pairs, humanizes entitlement codes, converts limits (e.g. `DAILY_PROMOTION_LIMIT=1` to "1 Promotional Post per day"), and excludes non-positive entries.
- **What Works:** Plan cards in registration, workspace subscription management, and platform dashboard.
- **What is Incomplete/Broken:** None.
- **Evidence:** `subscription-plan.utils.spec.ts` passing.

### 5. Subscription Card QR Cleanup & View Details Drawer
- **Expected:** Subscription summary cards must not display QR thumbnails. "View Details" opens a drawer displaying subscription metadata and payment proof history. Once verified/active/expired, proofs are locked permanently. If rejected, the user can upload a revised receipt and resubmit.
- **Actual:** `DashboardModule` sets `paymentQr` only on `payment-qr-settings`. Detail drawer displays plan specs, BCN, payee details, and submitted receipt history. Enforces `proof-locked-banner` on `ACTIVE`, `APPROVED`, `EXPIRED`, `GRACE_PERIOD`, and `resubmit-proof-form` on `REJECTED`.
- **What Works:** QR removal, detail rendering, permanent proof lock, rejection resubmission flow.
- **What is Incomplete/Broken:** None.
- **Evidence:** `DashboardModule` and `BusinessSubscriptionManagement` unit tests.

### 6. Public Marketplace Promotion Details
- **Expected:** Users clicking promotion cards in the feed navigate to `/promotions/:id`, where full details, media gallery, engagement metrics, bookmarks, reporting, and comments are accessible.
- **Actual:** Route `/promotions/:id` added to `app.routes.ts`. `PromotionDetail` component handles API loading via `MarketplaceApiService.getPublicPromotion`, provides image switching, bookmark persistence in `localStorage`, share link copying, content reporting, and full comment drawer.
- **What Works:** Routing, media gallery, bookmarks, share, report modal, comments integration.
- **What is Incomplete/Broken:** None.
- **Evidence:** `promotion-detail.spec.ts` (8 tests passing).

---

## E. Architecture and Coding-Standard Review

### Frontend Architecture (Angular 22)
- **Componentisation:** Standalone components used throughout with `ChangeDetectionStrategy.OnPush`.
- **Signals & Reactivity:** Clean signal management (`signal`, `computed`, `effect`) without manual subscription leaks.
- **Separation of Concerns:** Business logic separated into API services (`BusinessRegistrationApiService`, `MarketplaceApiService`) and pure utility functions (`subscription-plan.utils.ts`).
- **Template Safety:** Handled optional fields gracefully; added `asArray()` helper in `DashboardModule` to ensure template type-safety with `detail['proofs']`.

### Backend Architecture (Yii 3 PHP)
- **Pipeline Conformity:** `InDto → Controller → Versioned Services → Core Services → DAO`.
- **DAO Boundaries:** Database queries remain strictly within DAO classes (`SubscriptionDao`, `MarketplaceDao`, etc.). Parameter binding (`:tenant_id`, `:subscription_id`) is strictly enforced.
- **Response Format:** Consistent `$resArr = ['status' => 'SUCCESS'|'FAILED', 'msgArr' => [], 'data' => []]`.
- **Tenant Isolation:** Enforced via `tenant_id` query filters and `applicationOwnerContext()` verification in services.

---

## F. Test Results

| Test Category | Command Executed | Result | Details |
|---|---|---|---|
| **PHP Syntax Check** | `php -l <modified_files>` | **PASS** | All 8 modified PHP files passed syntax analysis |
| **Backend Unit Tests** | `./vendor/bin/codecept run Unit` | **PASS** | 38 tests, 105 assertions passed (0.35s) |
| **TypeScript Compilation** | `npx tsc --noEmit` | **PASS** | Exited 0 with no type errors across the entire codebase |
| **Frontend Unit Tests** | `npx ng test --no-watch` | **PASS** | 19 test files, 149 tests passed (10.91s) |
| **Frontend Production Build** | `npm run build` | **FAIL** | Exceeded budget: `business-subscription-management.scss` (31.18 kB vs 25 kB limit) |
| **Frontend Code Formatting** | `npm run format:check` | **FAIL** | 34 files have formatting warnings |
| **Backend Psalm Analysis** | `./vendor/bin/psalm <modified_files>` | **PARTIAL** | Ran at Level 1; identified standard dynamic array access notices |

---

## G. Bugs and Issues

### 1. [HIGH] SCSS Budget Exceeded on Production Build
- **Classification:** High (Blocks production builds / CI pipeline)
- **Description:** Angular CLI fails during `ng build` with error: `src/app/features/business-subscriptions/business-subscription-management.scss exceeded maximum budget. Budget 25.00 kB was not met by 6.18 kB with a total of 31.18 kB.`
- **Affected File:** `frontend/src/app/features/business-subscriptions/business-subscription-management.scss`
- **Recommended Fix:** Extract drawer styles (checkout drawer & detail drawer) into a shared partial (e.g. `_subscription-drawers.scss`) or adjust the budget rule in `angular.json` for component styles to `35kB`.

### 2. [MEDIUM] Prettier Formatting Discrepancies
- **Classification:** Medium (Code style consistency)
- **Description:** `npm run format:check` reported 34 files with formatting differences.
- **Affected Files:** Modified components and templates.
- **Recommended Fix:** Run `npm run format` after user approval.

### 3. [LOW] Initial Bundle Size Warning
- **Classification:** Low (Non-blocking warning)
- **Description:** `bundle initial exceeded maximum budget. Budget 500.00 kB was not met by 16.83 kB with a total of 516.83 kB.`
- **Affected File:** `angular.json` / initial bundle.
- **Recommended Fix:** Optimize initial shared imports or adjust warning threshold in `angular.json` to 550 kB.

---

## H. Implementation Readiness

| Feature / Area | Readiness Classification | Notes |
|---|---|---|
| **Storefront Zero/Empty Price Fallback** | **Ready for commit** | Fully tested, verified, clean |
| **Subscription 2-Day Grace Period** | **Ready for commit** | Backend DAOs and frontend banners fully tested |
| **Plan Entitlements Cleaning Utility** | **Ready for commit** | Clean utility and comprehensive unit tests |
| **Subscription QR Cleanup & Locked Details** | **Ready for commit** | Functional in dashboard and workspace |
| **Marketplace Promotion Detail Page** | **Ready for commit** | Standalone route, gallery, unit tests passing |
| **Business Subscription Management UI** | **Requires minor fix** | Must resolve the 6.18 kB SCSS budget violation before committing |

---

## I. Recommended Next Actions

1. **Resolve SCSS Budget Issue:** Refactor `business-subscription-management.scss` to reduce duplicated rules, or adjust the component style budget in `angular.json`.
2. **Run Prettier Formatter:** Execute `npm run format` to ensure clean formatting compliance across all modified and new files.
3. **Stage Untracked Files:** Ensure the 8 untracked files are staged alongside modified files:
   - `backend/tests/Unit/Services/SubscriptionPlanRbacTest.php`
   - `frontend/src/app/core/subscription/subscription-plan.utils.ts`
   - `frontend/src/app/core/subscription/subscription-plan.utils.spec.ts`
   - `frontend/src/app/features/business-subscriptions/business-subscription-management.spec.ts`
   - `frontend/src/app/features/marketplace/promotions/promotion-detail/*`
   - `frontend/src/app/features/storefront/storefront-product-detail.spec.ts`
4. **Final Verification:** Re-run `npm run build && npm run test` and `composer test` to confirm clean passes across all build and test runners.
5. **Request User Approval:** Obtain user sign-off before committing.
