# BBG UI Colour & Theme Audit Matrix (REQ-SHARED-001)

This document contains the complete screen-by-screen and component-by-component inventory and audit matrix for the BBG Global Light and Dark Theme Implementation and Frontend UI Colour Consistency initiative.

Authoritative Requirement: [REQ-SHARED-001-global-theme-and-colour-consistency.md](file:///Users/apple/Documents/Development/dark-store/frontend/requirements/shared/REQ-SHARED-001-global-theme-and-colour-consistency.md)  
Target Branch: `feature/business-onboarding-from-workspace-base`

---

## 1. Global Token Specification

### 1.1 Brand Colours (Consistent across Light & Dark Mode)
| Token | Value | Intended Usage |
|---|---|---|
| `--bbg-brand-primary` | `#10B981` | Primary brand green |
| `--bbg-brand-primary-hover` | `#059669` | Primary green hover |
| `--bbg-brand-primary-active` | `#047857` | Primary green pressed |
| `--bbg-brand-primary-soft` | Light: `#DCFCE7` / Dark: `#203D30` | Subtle green surface / selection |
| `--bbg-brand-accent` | `#FBBF24` | Amber yellow accent |
| `--bbg-brand-accent-hover` | `#F59E0B` | Accent yellow hover |
| `--bbg-brand-accent-active` | `#D97706` | Accent yellow pressed |
| `--bbg-brand-accent-soft` | Light: `#FEF3C7` / Dark: `rgba(251, 191, 36, 0.15)` | Accent yellow subtle highlight |

### 1.2 Surface & Typography Hierarchy
| Token | Light Mode Value | Dark Mode Value | Semantic Role |
|---|---|---|---|
| `--bbg-surface-page` | `#F7FAF8` | `#0B1210` | Overall page backdrop |
| `--bbg-surface-sidebar` | `#FFFFFF` | `#101A16` | Sidebar navigation surface |
| `--bbg-surface-card` | `#FFFFFF` | `#16231D` | Standard cards and containers |
| `--bbg-surface-elevated` | `#FFFFFF` | `#1C2D25` | Drawers, dialogs, dropdowns, menus |
| `--bbg-surface-hover` | `#F0F7F3` | `#24372D` | Hover interactive surface |
| `--bbg-surface-selected` | `#DCFCE7` | `#203D30` | Active selection surface |
| `--bbg-surface-input` | `#FFFFFF` | `#101A16` | Form input and control background |
| `--bbg-surface-header` | `rgba(255, 255, 255, 0.96)` | `rgba(16, 26, 22, 0.96)` | Sticky header surface |
| `--bbg-surface-subtle` | `#F0F7F3` | `#16231D` | Subtle secondary sections |
| `--bbg-text-primary` | `#14231B` | `#F3F7F4` | Headings and primary copy |
| `--bbg-text-secondary` | `#52635A` | `#B0BDB5` | Secondary supporting labels |
| `--bbg-text-muted` | `#718078` | `#829188` | Muted captions and hints |
| `--bbg-text-disabled` | `#A3ADA6` | `#64736A` | Disabled input and button copy |
| `--bbg-text-inverse` | `#FFFFFF` | `#0B1210` | High-contrast inverse text |
| `--bbg-border-default` | `#DCE6DF` | `#2A3B32` | Standard card and section borders |
| `--bbg-border-strong` | `#BCCBC1` | `#35483D` | Active / focused borders |
| `--bbg-border-subtle` | `#EAEFEA` | `#1F2E26` | Light row dividers |
| `--bbg-border-focus` | `#059669` | `#10B981` | Keyboard focus border |
| `--bbg-focus-ring` | `0 0 0 3px rgba(16, 185, 129, 0.35)` | `0 0 0 3px rgba(16, 185, 129, 0.35)` | Focus ring |

### 1.3 Semantic Status Palette
| Status | Light Foreground | Light Background | Dark Foreground | Dark Background |
|---|---|---|---|---|
| Success | `#047857` | `#D1FAE5` | `#34D399` | `#123D2D` |
| Warning | `#92400E` | `#FEF3C7` | `#FBBF24` | `#453514` |
| Danger | `#B91C1C` | `#FEE2E2` | `#F87171` | `#451F24` |
| Information | `#1D4ED8` | `#DBEAFE` | `#60A5FA` | `#172F4D` |
| Neutral | `#52635A` | `#F1F5F2` | `#B0BDB5` | `#26352D` |

### 1.4 Non-Negotiable Yellow Button Rule
| State | Background | Foreground (Text & All Icons) |
|---|---|---|
| Default | `#FBBF24` (`--bbg-brand-accent`) | `#000000` |
| Hover | `#F59E0B` (`--bbg-brand-accent-hover`) | `#000000` |
| Active / Pressed | `#D97706` (`--bbg-brand-accent-active`) | `#000000` |
| Focus-visible | Current yellow background | `#000000` (with visible focus ring) |
| Disabled | `#E8DCA8` | `#000000` |

---

## 2. Route-Backed Screens Audit Matrix

| Route | Component Class | File Path | Scope | Initial Findings | Required Action | Status |
|---|---|---|---|---|---|---|
| `/` | `MarketplaceHome` | `src/app/features/marketplace/home/marketplace-home.ts` | Marketplace | Hardcoded `#f5d928`, `#123f2c`, `#0a2418`, yellow button text not strictly `#000000`. | Migrate to canonical tokens; enforce `#000000` text & icons on search button and register CTA. | Pending |
| `/businesses` | `BusinessDirectory` | `src/app/features/marketplace/businesses/business-directory.ts` | Marketplace | Hardcoded `#f5d928` on `.search-submit`, `#174d35` fallbacks. | Migrate to semantic tokens; enforce black text/icons on yellow search button. | Pending |
| `/businesses/:identifier` | `MarketplaceItemPlaceholder` | `src/app/features/marketplace/details/marketplace-item-placeholder.ts` | Marketplace | Inline styles and shared layout consumption. | Check theme token inheritance and contrast. | Pending |
| `/products` | `ProductDirectory` | `src/app/features/marketplace/products/product-directory.ts` | Marketplace | Hardcoded `#f5d928` on search button, `#174d35` focus ring. | Migrate to canonical tokens; enforce black text on search submit. | Pending |
| `/products/:identifier` | `MarketplaceItemPlaceholder` | `src/app/features/marketplace/details/marketplace-item-placeholder.ts` | Marketplace | Shared detail placeholder. | Ensure dark theme surface readability. | Pending |
| `/promotions` | `PromotionFeed` | `src/app/features/marketplace/promotions/promotion-feed.ts` | Marketplace | Legacy yellow `#f5d928` badge and pill tokens. | Migrate to `--bbg-brand-accent`. | Pending |
| `/about` | `MarketplaceAbout` | `src/app/features/marketplace/about/marketplace-about.ts` | Marketplace | `.primary-link` yellow CTA with `#17231b` text. | Enforce `#000000` text on yellow link; align emerald brand. | Pending |
| `/store/:businessSlug` | `StorefrontHome` | `src/app/features/storefront/storefront-home.ts` | Storefront | Hardcoded dark green gradients; contrast checks needed. | Retain branded hero while ensuring semantic token compatibility. | Pending |
| `/store/:businessSlug/products` | `StorefrontSection` | `src/app/features/storefront/storefront-section.ts` | Storefront | Fixed headers and card grids. | Verify surface tokens and filter interactions in both themes. | Pending |
| `/store/:businessSlug/products/:productSlug` | `StorefrontProductDetail` | `src/app/features/storefront/storefront-product-detail.ts` | Storefront | WhatsApp button `#25d366` (legitimate), hardcoded `#174d35` badge text. | Update badge to `--bbg-brand-primary`; preserve WhatsApp brand green. | Pending |
| `/store/:businessSlug/about` | `StorefrontSection` | `src/app/features/storefront/storefront-section.ts` | Storefront | General content cards. | Verify card surfaces and text contrast. | Pending |
| `/store/:businessSlug/contact` | `StorefrontSection` | `src/app/features/storefront/storefront-section.ts` | Storefront | Contact form and enquiry controls. | Ensure input surfaces and submit buttons use semantic tokens. | Pending |
| `/store/:businessSlug/login` | `StorefrontLogin` | `src/app/features/storefront/storefront-login.ts` | Storefront | Form inputs and sign-in button. | Align input and button tokens. | Pending |
| `/login` | `Login` | `src/app/features/auth/pages/login/login.ts` | Auth | Yellow submit button `.submit-button` with `#172019` text, `#f5d928` logo. | Enforce `#000000` text on submit button; use `--bbg-brand-accent` and `--bbg-brand-primary`. | Pending |
| `/register` | `Register` | `src/app/features/auth/pages/register/register.ts` | Auth | Registration card, form fields, validation states. | Align input surfaces, error text, and submit button tokens. | Pending |
| `/auth/social/callback` | `SocialAuthCallback` | `src/app/features/auth/pages/social-callback/social-callback.ts` | Auth | Spinner and redirect status message. | Ensure spinner uses `--bbg-brand-primary` and text is legible. | Pending |
| `/invite/accept` | `TeamInvitationAcceptance` | `src/app/features/team-invitation/team-invitation-acceptance.ts` | Auth | Invitation card, acceptance button, status message. | Align card surfaces, primary green CTA, and error/success states. | Pending |
| `/dashboard` | `Dashboard` | `src/app/features/dashboard/dashboard.ts` | Workspace | Hero banner `.btn-market-explore` yellow CTA with `#0a2418` text, hardcoded `#991b1b` error card. | Enforce `#000000` text on yellow CTA; use `--bbg-danger` and `--bbg-danger-soft` on error card. | Pending |
| `/dashboard/businesses` | `BusinessWorkspace` | `src/app/features/business-workspace/business-workspace.ts` | Workspace | Tenant cards, status badges, action buttons. | Verify card surfaces and button hierarchy. | Pending |
| `/dashboard/businesses/register` | `BusinessRegistration` | `src/app/features/business-registration/business-registration.ts` | Workspace | Onboarding wizard, milestone badges, form fields, `.btn-workspace`. | Align input surfaces, step milestones, and button hover states. | Pending |
| `/dashboard/catalogue` | `Catalogue` | `src/app/features/catalogue/catalogue.ts` | Workspace | Table and Grid views, sorting headers, media thumbnails. | Preserve approved layout; align table borders, sort icons, and error states. | Pending |
| `/dashboard/:section` | `DashboardModule` | `src/app/features/dashboard/dashboard-module.ts` | Workspace / Platform | Hosts all business, personal, and platform admin sections. | Standardize status tags, error banners, and table rows to semantic tokens. | Pending |

---

## 3. Reusable UI Components Audit Matrix

| Component Selector | File Path | Component Type | Current Colour Source | Findings | Required Action | Status |
|---|---|---|---|---|---|---|
| `app-button` | `src/app/shared/components/button/button.component.ts` | Shared Primitive | Inline styles with CSS tokens | `.btn-accent` has `#171d19` text instead of `#000000`. | Enforce `#000000` text and icons on `.btn-accent` across default, hover, active, focus-visible, and disabled. | Pending |
| `app-input` | `src/app/shared/components/input/input.component.ts` | Shared Primitive | Inline styles | Uses `--bbg-surface-card` instead of `--bbg-surface-input`. | Update to `var(--bbg-surface-input)` so dark mode inputs use `#101A16`. | Pending |
| `app-select` | `src/app/shared/components/select/select.component.ts` | Shared Primitive | Inline styles | Uses `--bbg-surface-card` instead of `--bbg-surface-input`. | Update to `var(--bbg-surface-input)`. | Pending |
| `app-textarea` | `src/app/shared/components/textarea/textarea.component.ts` | Shared Primitive | Inline styles | Uses `--bbg-surface-card` instead of `--bbg-surface-input`. | Update to `var(--bbg-surface-input)`. | Pending |
| `app-search-input` | `src/app/shared/components/search-input/search-input.component.ts` | Shared Primitive | Inline styles | Uses `--bbg-surface-card` for search box. | Update to `var(--bbg-surface-input)`. | Pending |
| `app-status-badge` | `src/app/shared/components/status-badge/status-badge.component.ts` | Shared Primitive | Inline styles | Uses status tokens. | Ensure all 5 semantic pairs (`success`, `warning`, `danger`, `info`, `neutral`) align with approved tokens. | Pending |
| `app-bcn-badge` | `src/app/shared/components/bcn-badge/bcn-badge.component.ts` | Shared Primitive | Inline styles | Hardcoded `rgba(23, 77, 53, 0.2)` border. | Update border to `var(--bbg-border-default)`. | Pending |
| `app-breadcrumbs` | `src/app/shared/components/breadcrumbs/breadcrumbs.component.ts` | Shared Primitive | Inline styles | Semantic tokens. | Compliant. | Verified |
| `app-confirm-dialog` | `src/app/shared/components/confirm-dialog/confirm-dialog.component.ts` | Overlay / Dialog | Inline styles | Uses `--bbg-surface-card`. | Update to `var(--bbg-surface-elevated)`. | Pending |
| `app-empty-state` | `src/app/shared/components/empty-state/empty-state.component.ts` | Shared Primitive | Inline styles | Uses `--bbg-surface-subtle` and `--bbg-border-strong`. | Verify contrast in dark mode. | Pending |
| `app-skeleton-loader` | `src/app/shared/components/skeleton-loader/skeleton-loader.component.ts` | Shared Primitive | Inline styles | Shimmer gradient uses `--bbg-surface-subtle` and `--bbg-border-default`. | Verified responsive in both modes. | Verified |
| `app-pagination` | `src/app/shared/components/pagination/pagination.component.ts` | Shared Primitive | Inline styles | Page buttons and active state. | Ensure active page uses `--bbg-brand-primary` and hover uses `--bbg-surface-hover`. | Pending |
| `app-metric-card` | `src/app/shared/components/metric-card/metric-card.component.ts` | Shared Container | Inline styles | Semantic tokens for trend badges. | Verify trend badge colors. | Verified |
| `app-plan-card` | `src/app/shared/components/plan-card/plan-card.component.ts` | Shared Container | Inline styles | Card border and hover state. | Ensure recommended badge and selected border use `--bbg-brand-primary`. | Pending |
| `app-product-card` | `src/app/shared/components/product-card/` | Shared Card | `product-card.component.scss` | Card borders, price tags, image frame. | Align with `--bbg-surface-card` and `--bbg-border-default`. | Pending |
| `app-business-card` | `src/app/shared/components/business-card/` | Shared Card | `business-card.component.scss` | Verified badge, category tag, card surface. | Align with semantic surface and badge tokens. | Audited & Aligned |
| `app-promotion-card` | `src/app/shared/components/promotion-card/` | Shared Card | `promotion-card.scss` | Media card and engagement row. | Align text, surface, and border tokens. | Audited & Aligned |
| `app-filter-drawer` | `src/app/shared/filter-drawer/filter-drawer.ts` | Shared Overlay | Inline styles | `.filter-fab` and `.drawer-apply` use `#f5d928` with `#17231b` text; focus ring `#174d35`. | Enforce `#000000` text & icons on yellow buttons; update focus ring to `var(--bbg-focus-ring-colour)`. | Audited & Aligned |
| `app-workspace-drawer` | `src/app/shared/workspace-drawer/` | Shared Overlay | `workspace-drawer.scss` | Drawer surface and backdrop. | Ensure drawer uses `var(--bbg-surface-elevated)` and overlay uses `var(--bbg-surface-overlay)`. | Audited & Aligned |
| `app-user-profile-drawer` | `src/app/shared/user-profile-drawer/` | Shared Overlay | `user-profile-drawer.ts` | Hardcoded `#c34f47` error text and `#d88a83` border. | Migrate error styles to `var(--bbg-danger)`. | Audited & Aligned |
| `app-workspace-layout` | `src/app/features/workspace/workspace-layout.ts` | Layout Shell | Inline styles in `.ts` | Hardcoded `#174d35` logo, `#f5d928` stripe, `#c34f47` switch error, fixed context pills. | Migrate logo to `--bbg-brand-primary`/`--bbg-brand-accent`; update context pills to semantic status tokens. | Audited & Aligned |

---

## 4. Verification & Status Log
- [x] Phase 1: Global tokens implemented in `src/styles.scss` and `index.html`.
- [x] Phase 2: Shared components updated (buttons, inputs, selects, dialogs, drawers, badges).
- [x] Phase 3: Route-level styles updated (marketplace, storefront, auth, workspace, dashboard).
- [x] Phase 4: Non-negotiable yellow button rule enforced globally.
- [x] Phase 5: TypeScript compile check (`npx tsc --noEmit`).
- [x] Phase 6: Unit tests (`npm test -- --watch=false` - 12/12 passed, 92/92 passed).
- [x] Phase 7: Angular development/production build (`npm run build` - successful bundle generation).
