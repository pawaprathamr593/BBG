# BBG Design System — Direction & Foundations

**Status:** Proposed design direction for frontend implementation  
**Date:** 13 November 2026

## 1. Product design principles

1. Marketplace discovery should feel welcoming, visual and easy to scan.
2. Business operations should feel precise, calm and predictable.
3. Admin should optimize for review, oversight and safe actions.
4. The three experiences share one design language but use separate navigation/layouts.
5. Mobile layouts are designed first, not reduced desktop layouts.
6. Visual hierarchy comes from typography, spacing, alignment and restrained borders rather than decorative effects.
7. Status, approval and payment states must always be explicit and must reflect backend-confirmed values.

## 2. Selected direction

**BBG Marketplace Editorial** — warm neutral surfaces, deep navy typography, restrained blue actions, subtle teal success states, image-led marketplace discovery and structured operational workspaces.

Direction A is the selected foundation. Direction B (Enterprise Command Center) is retained only as a density reference for Admin and data-heavy screens.

## 3. Initial design tokens

These values are initial design proposals, not existing brand specifications. Centralize them in SCSS custom properties and revise only through the design system.

### Color

| Token | Proposed value | Use |
|---|---|---|
| `--bbg-primary` | `#245EA8` | Primary actions, links, active navigation |
| `--bbg-primary-strong` | `#194A86` | Hover/pressed primary |
| `--bbg-primary-soft` | `#EAF1FA` | Soft active surfaces |
| `--bbg-ink` | `#172536` | Main headings/body text |
| `--bbg-muted` | `#667487` | Secondary text |
| `--bbg-page` | `#F7F8FA` | Application background |
| `--bbg-surface` | `#FFFFFF` | Cards, dialogs, navigation |
| `--bbg-border` | `#E4E8EE` | Dividers and outlines |
| `--bbg-success` | `#21836A` | Confirmed success only |
| `--bbg-warning` | `#A96D20` | Pending/review states |
| `--bbg-danger` | `#B84242` | Destructive/error states |
| `--bbg-info` | `#3976A9` | Informational state |

Do not use semantic colors as decoration. Status badges must use text as well as color.

### Typography

- Font stack: Inter when bundled/available, with system sans-serif fallback.
- Display: 32–40px desktop, fluid down to 28px mobile.
- Page heading: 26–32px desktop, 24–28px mobile.
- Section heading: 18–22px.
- Body: 14–16px.
- Metadata/labels: 12–13px; never below 12px for essential content.
- Numeric values use tabular numerals where alignment matters.

### Spacing

Use a 4px base scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

### Shape and elevation

- Small control radius: 8px.
- Standard card/dialog radius: 12px.
- Large feature surface radius: 16px.
- Borders are the default separation mechanism.
- Use low, soft elevation only for overlays and interactive surfaces.
- Avoid excessive nested cards.

### Interaction

- Minimum target size approximately 44×44px.
- Visible keyboard focus.
- Motion duration 120–200ms for simple transitions.
- Honor `prefers-reduced-motion`.
- Use explicit loading, empty, error, offline and permission-denied states.

## 4. Responsive layout rules

| Breakpoint | Target | Layout |
|---|---|---|
| 360–430px | Mobile | Single-column content, compact header, suitable bottom navigation, drawers/bottom sheets |
| 768px | Tablet | Two-column grids where useful, collapsible navigation |
| 1024px | Small desktop | Sidebar + content where appropriate |
| 1280px | Desktop | Full role navigation, readable content max-width |
| 1440px+ | Large desktop | Wider grids/data views without excessive whitespace |

No horizontal page overflow. Dense tables must become card/list views on narrow screens.

## 5. Experience-specific patterns

### Public marketplace

- Image-led business and product discovery.
- Search and category filters remain prominent.
- Business storefront identity and approval/publication state are clear.
- Promotion feed uses a distinct but consistent card treatment.

### Consumer

- Mobile-first navigation: Home, Explore, Promotions, Orders, Profile (only show routes that are in the active scope).
- Order status timeline and enquiry history.
- Checkout totals are backend-sourced; payment status is explicit.

### Entrepreneur

- Business context and approval status always visible.
- Subscription status and entitlement limitations are clear.
- Product/promotion management uses list + focused create/edit forms.
- Incoming orders/enquiries prioritize actionable status and response controls.

### Platform Administrator

- Separate shell and navigation.
- Review queues use filters and responsive data views.
- Approval/rejection/moderation actions require confirmation and clear reason handling where the backend contract supports it.
- System health shows only safe backend-approved fields.

## 6. Shared component inventory

Buttons; form controls; search/filter controls; status and subscription badges; business/product/promotion/category cards; dialogs; drawers; bottom sheets; toast viewport; loading skeletons; empty/error/offline states; pagination; responsive data table; breadcrumbs; image uploader; order timeline; confirmation dialog; permission-denied view.

Presentational components must not call HttpClient, feature stores, router navigation or authorization services.

## 7. Theme scope

Implement the light theme first. Dark mode is not a release blocker and must not delay core functionality unless separately approved.
