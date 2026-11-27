# BBG — Apple-Inspired Glassmorphism Frontend Redesign Report

**Date:** 2026-11-26  
**Branch:** `feature/business-onboarding-from-workspace-base`  
**Stack:** Angular 22, TypeScript, SCSS, Signals  
**Design Direction:** Apple-inspired Modern Enterprise Glassmorphism + BBG Forest-Green (`#174D35` / `#0B3020`) & Saffron (`#F5D928`) Identity  

---

## 1. Executive Summary

The BBG frontend has been visually transformed using a balanced Apple-inspired enterprise glassmorphism design system (~70% clean readable surfaces, ~20% frosted translucent glass, ~10% ambient depth and brand accents) while strictly preserving all existing Angular architecture, Yii 3 API contracts, RBAC guards, tenant isolation, and interactive workflows.

---

## 2. Repository & Architecture Audit Summary

- Inspected `frontend/CODING_STANDARDS.md`, `frontend/src/styles.scss`, `app.routes.ts`, shared components (`frontend/src/app/shared/`), and all feature modules (`marketplace`, `auth`, `business-registration`, `workspace`, `dashboard` + 12 submodules, `catalogue`, `business-workspace`, `business-storefront`, `business-subscriptions`, `storefront`).
- Verified that `ThemeService` drives `data-theme="light" | "dark"` and `body.dark-theme` from a single CSS token system in `frontend/src/styles.scss`.
- Confirmed component stylesheet budgets (`20 kB` warning / `25 kB` error) in `angular.json`, so reusable glass tokens and surface classes were centralized in `styles.scss`.

---

## 3. Global Design-Token & Theme Changes (`frontend/src/styles.scss`)

### Light & Dark Glass Tokens
- `--bbg-teal: #218c83`
- `--bbg-glass-bg`: `rgba(255, 255, 255, 0.72)` (Light) / `rgba(18, 32, 24, 0.76)` (Dark)
- `--bbg-glass-bg-elevated`: `rgba(255, 255, 255, 0.86)` (Light) / `rgba(24, 42, 31, 0.86)` (Dark)
- `--bbg-glass-bg-subtle`: `rgba(255, 255, 255, 0.56)` (Light) / `rgba(15, 24, 18, 0.64)` (Dark)
- `--bbg-glass-bg-nav`: `rgba(23, 77, 53, 0.90)` (Light) / `rgba(7, 13, 10, 0.84)` (Dark)
- `--bbg-glass-bg-sidebar`: `rgba(255, 255, 255, 0.78)` (Light) / `rgba(15, 24, 18, 0.78)` (Dark)
- `--bbg-glass-border` / `--bbg-glass-border-subtle` / `--bbg-glass-highlight` / `--bbg-glass-shadow`
- `--bbg-glass-blur`: `blur(20px) saturate(150%)` (Light) / `blur(20px) saturate(140%)` (Dark)
- `--bbg-glass-blur-sm`: `blur(12px) saturate(140%)` (Light) / `blur(12px) saturate(135%)` (Dark)
- `--bbg-ambient-bg`: Subtle forest-green, restrained saffron, and teal radial ambient gradients fixed behind `body`.

### Reusable Classes & Fallbacks
- Added `.glass-surface`, `.glass-card`, `.glass-panel`, and `.glass-interactive`.
- Added `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))` solid surface fallbacks.
- Preserved `prefers-reduced-motion` transition/animation disabling.

---

## 4. Redesigned Screens, Shells & Shared Components

### Shared Application Shell & Overlays
- **Public Topbar** (`frontend/src/app/app.scss`): Frosted forest-green glass navigation (`--bbg-glass-bg-nav`, `--bbg-glass-blur-sm`).
- **Workspace Shell** (`frontend/src/app/features/workspace/workspace-layout.ts`): Translucent frosted topbar and frosted sidebar (`--bbg-glass-bg-sidebar`, `--bbg-glass-blur`) with transparent context switcher.
- **Workspace Drawer** (`frontend/src/app/shared/workspace-drawer/workspace-drawer.scss`): Frosted elevated drawer panel (`--bbg-glass-bg-elevated`) with neutral non-blurred backdrop fade (`rgba(0, 0, 0, 0.4)`).
- **Confirm Dialog** (`frontend/src/app/shared/components/confirm-dialog/confirm-dialog.component.ts`): Frosted elevated dialog card (`--bbg-radius-xl`) over neutral non-blurred backdrop.
- **Auth Popup** (`frontend/src/app/shared/auth-experience/auth-experience.scss`): Frosted elevated dialog card with content-fitted height and document-anchored positioning.
- **Shared Cards & States**: `MetricCardComponent`, `BusinessCard`, `ProductCard`, `PromotionCard`, `EmptyStateComponent`.

### Public Marketplace & Auth / Onboarding
- **Marketplace Home** (`marketplace-home.scss`): Frosted search bar, glass browse pill, and frosted value-proposition cards.
- **Directories & Detail** (`business-directory`, `product-directory`, `promotion-feed`, `promotion-detail.scss`, `marketplace-about.scss`): Frosted cards/sidebars over ambient canvas, preserving infinite scroll and all card actions.
- **Auth & Business Onboarding** (`login.scss`, `business-registration.scss`): Frosted elevated `.auth-card` and `.form-card` containers with solid, high-contrast form inputs.

### Workspace & Modules
- **Dashboard, Catalogue (Table & Grid), Business Workspace, Storefront Management, Subscriptions, and all 12 `dashboard-module` Submodules**: Transparent `:host` canvas revealing subtle ambient depth behind frosted summary/status/application cards (`workspace-summary-module.scss`, `business-workspace.scss`, `business-storefront-management.scss`), while keeping data tables solid and highly legible.

### Merchant Storefronts
- **Storefront Shell, Home & Sections** (`storefront-layout.scss`, `storefront-home.scss`, `storefront-section.scss`): Frosted header, quick-action cards, `.about-aside`, `.contact-card`, and `.address-panel`, strictly preserving independent merchant branding (`--store-accent`).

---

## 5. Verification Results

Executed after final edits:
- **TypeScript (`npx tsc --noEmit`)**: Passed with **0 errors**.
- **Production Build (`npm run build`)**: Compiled cleanly (`dist/bbg-frontend` generated).
- **Unit Tests (`npx ng test --no-watch`)**: **20/20 test files passed, 156/156 tests passed** in 6.17s.

### Manual Browser Verification Recommended
- Visually inspect Light and Dark themes across `/`, `/businesses`, `/products`, `/promotions`, `/login`, `/dashboard`, `/dashboard/catalogue` (Table & Grid), and `/store/:slug` in Chrome at desktop (`1440px`), tablet (`768px`), and mobile (`375px`) viewports.
