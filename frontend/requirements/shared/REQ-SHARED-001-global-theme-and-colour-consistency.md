---
id: REQ-SHARED-001
title: Global BBG light and dark theme colour system and UI consistency
area: shared
type: enhancement
owner: unset
status: draft
---

# Global BBG light and dark theme colour system and UI consistency

## 1. Problem

BBG currently has inconsistent colour usage across global theme tokens and UI components. The established and approved BBG brand direction across active workspace modules is:

- Primary brand colour: Forest Green `#174D35` (Hover: `#123F2C`, Soft: `#E8F1EB`).
- Accent brand colour: Yellow `#F5D928` (Hover: `#E0C51F`, Soft: `#FEF9E7`).
- Dark Mode: Primary brand shifts to Yellow `#F5D928` with layered dark surfaces (`#171D19`, `#242E27`, `#202923`).
- Light Mode: Clean, neutral surfaces (`#FFFFFF`, `#F8FAFC`, `#F1F5F9`) with Forest Green accents.
- Yellow-background buttons: Black (`#000000`) text and icons in every state and in both themes.

Individual screens and components (such as Catalogue and certain shared components) contain divergent or locally defined hardcoded colours (e.g. `#111`, `#bd3535`, `#d97777`, `#dc2626`). This creates visual drift between marketplace, storefront, catalogue, workspace modules, and shared components.

The objective is to establish one authoritative semantic token system and audit and align every frontend UI screen and component with the approved Pure Black + Forest Green Accent dark mode design system.

## 2. Personas

| Persona | Device | Goal |
| --- | --- | --- |
| Public marketplace visitor | Mobile, tablet, desktop | Experience consistent BBG branding and readable content |
| Business owner / tenant member | Mobile, tablet, desktop | Use all workspace screens consistently in Light and Dark Mode |
| Platform administrator | Desktop, tablet | Operate administration screens with consistent status, table and action colours |
| Authenticated consumer | Mobile, tablet, desktop | Use account, authentication and marketplace flows with consistent theme behaviour |
| Frontend developer / maintainer | Desktop | Reuse a single documented token source instead of inventing component-specific colours |

## 3. Scope

**In scope:**

- Audit every route-backed UI screen and every reusable UI component under `frontend/src/app/`.
- Audit global styles, theme service integration, design tokens, component SCSS, templates, inline styles, SVG/icon styling, overlays, and any theme-aware visual utilities.
- Public marketplace screens and shared marketplace elements.
- Business storefront screens and storefront shell.
- Login, registration, authentication dialogs/popups and account/profile UI.
- Business registration/onboarding and related steps, forms, status displays and dialogs.
- Workspace shell, navigation, context switcher, dashboard and every Personal, Business and Platform Administration module.
- Catalogue Table View and Grid View, preserving their approved layout and behaviour while aligning colours.
- Shared components: buttons, icon buttons, inputs, selects, textareas, checkboxes, radios, switches, tabs, cards, tables, badges, alerts, tooltips, dropdowns, popovers, drawers, modals, dialogs, pagination, upload zones, skeletons, empty states, toasts, navigation and responsive shell elements.
- Status and semantic colours, chart/graph series where present, focus states, hover/active/disabled states, borders, dividers, overlays and shadows.
- Centralized semantic tokens and backwards-compatible aliases while usages are migrated.
- Light, Dark and System theme modes using the existing ThemeService and `data-theme="dark"` mechanism.

**Out of scope:**

- Backend, database, API, authentication, authorization, RBAC, tenant isolation or business-rule changes.
- Route, navigation hierarchy, content, copy, feature behaviour or interaction redesign unrelated to theme consistency.
- Replacing Angular, adding a UI framework, component library or state-management library.
- Rebuilding approved screen layouts or changing their information architecture.
- Changing third-party/externally rendered content that BBG does not control.
- Recolouring user-provided images, product photography, business logos, uploaded media or other content imagery.
- Deployment, AWS, infrastructure or production configuration changes.

## 4. Entry and context

- Routes: all routes discovered from the current branch's Angular route configuration, including lazy-loaded feature routes. Do not rely on a hardcoded or stale route list.
- Contexts: public marketplace, storefront, authentication, business registration/onboarding, personal account, business workspace and platform administration.
- Theme mechanism: existing `ThemeService`, `data-theme="dark"` on the document element, and the existing Light / Dark / System preference.
- Primary token source: `frontend/src/styles.scss`, unless repository analysis identifies an established canonical token file that supersedes it. Do not create a parallel token system.
- Project rules: `frontend/AGENTS.md`, `frontend/.agent/README.md`, `frontend/.agent/rules/bbg-skills-workflow.md`, `frontend/CODING_STANDARDS.md`, and relevant skills/references under `frontend/.agent/skills/`.

## 5. Flow

1. Read BBG context, coding standards, build-ui and requirement implementation/review workflows.
2. Inspect the current branch and working tree before edits; preserve unrelated or uncommitted changes.
3. Discover all Angular routes, lazy-loaded pages, shared components, dialogs, drawers, overlays, global styles and component-level style files.
4. Build a screen/component inventory. Record the route or host, component, current colour source, theme support, reuse opportunity, and audit status.
5. Identify every hardcoded colour, local palette, conflicting token alias, inline colour, SVG fill/stroke and theme-specific override. Distinguish UI chrome from user/content imagery and legitimate data visualisations.
6. Establish the canonical tokens in the existing global token source. Keep legacy aliases functional during migration; do not leave duplicate sources of truth.
7. Update shared components and global UI primitives first, then all route-level screens and feature-specific components.
8. Validate every screen and component in Light and Dark Mode, including hover, focus-visible, active, selected, disabled, loading, empty, error, success and permission-denied states where applicable.
9. Verify responsive layouts and accessibility contrast. Fix colour-specific regressions without changing unrelated layout or behaviour.
10. Run the required checks, record actual results, and update the implementation log and inventory.

## 6. Screens / regions

| Region | Intent | Reuse expectation |
| --- | --- | --- |
| Global theme and token layer | Single source of truth for brand, surface, text, border, focus, status, overlay and shadow colours | Existing `src/styles.scss` token architecture and ThemeService |
| Public marketplace | Consistent branding across landing, discovery, listing, detail and promotional screens | Existing marketplace components and shared tokens |
| Business storefront | Every storefront route and screen, including storefront landing/overview, navigation, product/promotion cards, detail surfaces, forms and calls to action | Existing storefront shell and components |
| Authentication | Consistent login, registration, popup, validation and social-auth presentation | Existing shared auth components |
| Business onboarding | Consistent steps, forms, progress, document/status presentation and dialogs | Existing onboarding components |
| Personal / account | Consistent profile, preferences, theme selector and account drawers | Existing profile and account components |
| Business workspace | Consistent workspace overview/dashboard and every existing catalogue, records, team, customer, order, enquiry, payment, promotion, subscription and analytics screen | Existing workspace shell, shared tables/cards/drawers and feature patterns |
| Platform administration | Every platform administration landing/overview screen, admin dashboard, management screen, table, form, review queue and status action that exists on the current branch | Existing platform components and shared patterns |
| Shared UI primitives | Consistent interactive and informational components across every host | Reuse first; consolidate only where appropriate |
| Data visualisations | Readable chart series, legends, axes, tooltips and empty states in both themes | Existing chart implementation and semantic tokens |

The inventory must be generated from the actual current-branch route and component structure. The table above defines coverage categories, not an assertion that every named feature currently has a complete screen.

## 7. API

No API changes are required.

| Operation | Method | Path | Envelope | Status |
| --- | --- | --- | --- | --- |
| Change theme preference | Existing client-side ThemeService | No API path | None | Existing; preserve |
| Resolve System theme | Existing browser colour-scheme preference through ThemeService | No API path | None | Existing; preserve |
| Render theme tokens | CSS custom properties | No API path | None | Existing mechanism; update tokens |

Do not add API calls, backend settings, database fields, persistence mechanisms or new theme dependencies.

## 8. Permissions

| Action | Permission key | Status |
| --- | --- | --- |
| View screens in the current user's authorized context | Existing route and backend authorization | Preserve |
| Change own theme preference | No additional permission | Existing user preference; preserve |
| Render theme-aware controls | No additional permission | Presentation only |
| Display permission-denied states | Existing authorization result | Preserve; do not turn denied states into empty states |

Theme work must not change route guards, permission checks, role visibility, tenant scoping or backend authorization.

## 9. Rules and validation

### 9.1 Approved brand colours

The following brand values are established across Light and Dark Mode:

| Token | Light Mode Value | Dark Mode Value | Usage |
| --- | --- | --- | --- |
| `--bbg-brand-primary` | `#174D35` | `#F5D927` | Primary brand colour (Green in light, Yellow in dark) |
| `--bbg-brand-primary-hover` | `#123F2C` | `#EAC816` | Primary brand hover |
| `--bbg-brand-primary-active` | `#0E3323` | `#D4AF12` | Primary brand active |
| `--bbg-brand-primary-soft` | `#E8F1EB` | `rgba(245, 217, 39, 0.15)` | Subtle brand selection/surface |
| `--bbg-brand-accent` | `#F5D928` | `#F5D927` | Yellow brand accent |
| `--bbg-brand-accent-hover` | `#E0C51F` | `#EAC816` | Yellow hover |
| `--bbg-brand-accent-active` | `#C8A816` | `#D4AF12` | Yellow active |
| `--bbg-brand-highlight` | `#10B981` | `#F5D927` | Highlight colour (Yellow in dark) |
| `--bbg-btn-text-on-primary` | `#FFFFFF` | `#000000` | Text on primary brand buttons |
| `--bbg-btn-text-on-accent` | `#000000` | `#000000` | Text on yellow accent buttons |

In Dark Mode, all green and its shades change to yellow and its shades accordingly. Any button with a yellow background must strictly use black (`#000000`) text and icons in every state.

### 9.2 Light Mode palette

| Semantic token | Exact value |
| --- | --- |
| `--bbg-surface-page` | `#F8FAFC` (`var(--surface-page)`: `#FFFFFF`) |
| `--bbg-surface-card` | `#FFFFFF` |
| `--bbg-surface-subtle` | `#F1F5F9` |
| `--bbg-text-primary` | `#0F172A` (`var(--text-primary)`: `#171D19`) |
| `--bbg-text-secondary` | `#475569` (`var(--text-secondary)`: `#626B65`) |
| `--bbg-text-muted` | `#64748B` (`var(--text-muted)`: `#7A847E`) |
| `--bbg-border-default` | `#E2E8F0` (`var(--border)`: `#E3E8E4`) |
| `--bbg-border-strong` | `#CBD5E1` |
| `--bbg-border-focus` | `#174D35` |
| `--bbg-focus-ring` | `0 0 0 3px rgba(23, 77, 53, 0.25)` |

### 9.3 Dark Mode palette — Pure Black + Yellow Accent (exclusive)

**Pure Black + Yellow Accent is the canonical Dark Mode surface identity for BBG.**

| Visual layer / semantic token | Exact value | Usage |
| --- | --- | --- |
| `--bbg-surface-page` | `#000000` (`var(--surface-page)`: `#000000`) | Main application canvas / page background |
| `--bbg-surface-sidebar` | `#0A0A0A` (`var(--surface-sidebar)`: `#0A0A0A`) | Sidebar and navigation shell background |
| `--bbg-surface-card` | `#141414` (`var(--surface-card)`: `#141414`) | Primary cards, panels, elevated containers |
| `--bbg-surface-elevated` | `#141414` (`var(--surface-elevated)`: `#141414`) | Drawers, modals, popups and elevated panels |
| `--bbg-surface-subtle` | `#111111` (`var(--surface-subtle)`: `#111111`) | Secondary sections, nested containers, insets |
| `--bbg-surface-input` | `#111111` (`var(--surface-input)`: `#111111`) | Inputs, selects and textareas |
| `--bbg-surface-hover` | `#1A1A1A` (`var(--surface-hover)`: `#1A1A1A`) | Hovered interactive rows, cards, and list items |
| `--bbg-surface-selected` | `#202020` (`var(--surface-selected)`: `#202020`) | Active navigation items, selected table rows |
| `--bbg-surface-overlay` | `rgba(0, 0, 0, 0.85)` | Modal/drawer backdrop overlay |
| `--bbg-text-primary` | `#FFFFFF` (`var(--text-primary)`: `#FFFFFF`) | Main headings, primary content, table cells |
| `--bbg-text-secondary` | `#A3A3A3` (`var(--text-secondary)`: `#A3A3A3`) | Supporting text, labels, descriptions |
| `--bbg-text-muted` | `#737373` (`var(--text-muted)`: `#737373`) | Metadata, timestamps, helper text |
| `--bbg-text-disabled` | `#525252` | Disabled controls and inactive states |
| `--bbg-text-inverse` | `#000000` | Text on light or yellow accent surfaces |
| `--bbg-border-default` | `#292929` (`var(--border)`: `#292929`) | Primary card/container borders |
| `--bbg-border-subtle` | `#202020` | Subtle dividers, table cell lines |
| `--bbg-border-strong` | `#3A3A3A` | Active inputs, prominent separators |
| `--bbg-border-focus` | `#F5D927` | Focus rings, selected input outlines |
| `--bbg-focus-ring` | `0 0 0 3px rgba(245, 217, 39, 0.35)` | Visible keyboard focus ring |

Dark Mode must use layered surfaces. Do not flatten every element to one background colour. Keep the hierarchy: main canvas (`#000000`) → sidebar (`#0A0A0A`) → cards/modals (`#141414`) → inputs/subtle surfaces (`#111111`) → hover (`#1A1A1A`) → selected (`#202020`).

### 9.4 Semantic status palette

Status meaning must remain consistent in every module and theme.

| Status | Light foreground | Light background | Dark foreground | Dark background |
| --- | --- | --- | --- | --- |
| Success | `#047857` | `#D1FAE5` | `#34D399` | `#123D2D` |
| Warning | `#92400E` | `#FEF3C7` | `#FBBF24` | `#453514` |
| Danger | `#B91C1C` | `#FEE2E2` | `#F87171` | `#451F24` |
| Information | `#1D4ED8` | `#DBEAFE` | `#60A5FA` | `#172F4D` |
| Neutral | `#52635A` | `#F1F5F2` | `#B0BDB5` | `#26352D` |

Use semantic status tokens for badges, alerts, notifications, validation, status indicators and review states. Do not communicate status by colour alone; retain readable text/icons.

### 9.5 Yellow button rule — mandatory

Every button or button-like action with a yellow/amber background must use black text and black icons in all states and both themes.

| State | Background | Text and icon |
| --- | --- | --- |
| Default | `#FBBF24` | `#000000` |
| Hover | `#F59E0B` | `#000000` |
| Active / pressed | `#D97706` | `#000000` |
| Focus-visible | Current yellow state background | `#000000` |
| Disabled | `#E8DCA8` | `#000000` |

This rule applies to primary/secondary CTAs when yellow is selected, icon buttons, table actions, dropdown actions, modal/drawer actions, marketplace promotions and all shared or feature-specific button components. No white, grey, green or theme-inverse text/icon colour is permitted on a yellow background. A visible focus ring must remain present without changing the black foreground rule.

### 9.6 Other interactive component rules

- Green primary buttons use the primary green tokens and a foreground that passes contrast requirements. Do not change green to yellow in Dark Mode.
- Secondary, outline, ghost, danger and link buttons use semantic tokens, not arbitrary per-screen colours.
- Inputs, selects and textareas use theme-specific input surfaces, text, border, placeholder, disabled and focus tokens.
- Checkboxes, radios and switches use the primary green selected state.
- Selected tabs, navigation items and pagination use green semantic indicators/surfaces.
- Tables use semantic header, row, hover, selected, border, text and focus tokens.
- Drawers, dialogs, modals, popovers, menus and tooltips use elevated surface tokens and appropriate theme-aware overlay/shadow tokens.
- Loading, empty, error, success and permission-denied states use shared semantic treatments.
- Icons inherit semantic foreground tokens unless an icon has an approved semantic status role.
- SVG fill/stroke, pseudo-elements, CSS gradients and inline styles must be included in the audit.
- Charts must use a documented, theme-aware semantic series palette. Do not invent new per-chart colours; if an existing chart requires a colour not covered by approved tokens, record it as an open question before introducing it.
- User/content imagery is not a UI colour token and must not be recoloured as part of this requirement.

### 9.7 Token architecture and migration

- Use one canonical token source in the existing global theme architecture. Do not introduce a second theme file/system.
- Define semantic tokens for brand, page/surface levels, text hierarchy, borders, focus, status, overlay, shadows and interactive states.
- Map existing public aliases (including `--brand`, `--brand-strong`, `--brand-soft`, `--accent`, `--surface-page`, `--surface-header`, `--surface-card`, `--surface-subtle`, `--text-primary`, `--text-secondary`, `--text-muted`, and `--border`) to the canonical tokens while migrating existing consumers.
- Do not remove or rename an alias until repository-wide search confirms that no consumer depends on it.
- Do not use hardcoded hexadecimal colours in component SCSS for UI chrome. Use semantic tokens. Document and justify any exceptional data-visualisation token.
- Do not introduce Tailwind, PrimeNG, Angular Material, Bootstrap, NgRx, another UI kit or new runtime dependency.
- Preserve Angular standalone component patterns, existing componentisation, SCSS architecture, OnPush/signals conventions and accessibility behaviour.
- Preserve ThemeService's Light / Dark / System preference behaviour and existing preference persistence. Do not introduce a competing theme state mechanism.
- Keep the existing approved screen hierarchy, layout, spacing, typography, content, route structure and interaction behaviour unless a colour correction is strictly required.

### 9.8 Audit and implementation evidence

Create a complete inventory before implementation and keep it updated. At minimum, each row must identify:

| Field | Required evidence |
| --- | --- |
| Route / host | Exact route or shared host context |
| Screen / component | Actual component selector/class and file path |
| Type | Route page, layout, shared component, overlay, chart or other |
| Current colour source | Token, component SCSS, inline style, SVG, third-party style or unknown |
| Theme coverage | Light, Dark, System and any missing state |
| Findings | Inconsistent token, hardcoded colour, contrast issue or no issue |
| Change | Exact files and tokens changed, or reason no change was needed |
| Verification | Light/Dark screenshot or browser check and relevant test evidence |
| Status | Not audited / audited / changed / verified / blocked |

The inventory must include all route components discovered from the current route configuration and all shared components discovered under `src/app/shared/`, plus feature-local reusable components, dialogs, drawers, popovers and component styles. Do not claim repository-wide completion based on a sample of screens.

## 10. UI states

- Loading: skeletons/spinners and loading overlays remain legible in both themes.
- Empty: empty-state illustration/icon, message and actions use semantic tokens.
- Error: error text, border, icon and alert surface use danger tokens.
- Success: success feedback uses success tokens and appears only after real success.
- Permission denied: existing permission-denied presentation remains distinct from empty data.
- Hover: all interactive surfaces use theme-specific hover tokens.
- Focus-visible: keyboard focus is clearly visible in both themes.
- Active/selected: selected controls and rows use approved selected tokens.
- Disabled: disabled controls remain distinguishable and readable without appearing enabled.
- System theme: resolves consistently to the corresponding Light or Dark tokens.

## 11. Responsive and theme

- Audit all screens at mobile (~360–390px), tablet and desktop/wide breakpoints used by the project.
- Preserve responsive layouts, navigation behaviour, table overflow handling, card grids and touch targets.
- Verify both Light and Dark modes on every route and shared component host.
- Verify System mode using both light and dark operating-system preference where browser testing supports it.
- Ensure no theme-specific hardcoded colours leak into the opposite theme.
- Ensure overlays, sticky headers, sidebars, dropdowns and drawers maintain appropriate contrast and stacking surfaces.
- Respect `prefers-reduced-motion`; colour changes must not introduce new motion or layout shifts.
- Preserve storefront/workspace shell behaviour and do not accidentally reveal or hide global header/footer elements.

## 12. Acceptance criteria

1. Given the current frontend route configuration, when the audit is completed, then every route-backed screen and lazy-loaded route is listed in the screen/component inventory.
2. Given the current frontend shared and feature component directories, when the audit is completed, then every reusable component, dialog, drawer, popover and component stylesheet is accounted for.
3. Given the approved brand palette, when Light Mode is active, then primary brand green is `#174D35` (hover `#123F2C`, active `#0E3323`) with yellow accent `#F5D928`; when Dark Mode is active, then all green and its shades change to yellow and its shades accordingly (`--bbg-brand-primary: #F5D927`, hover `#EAC816`, active `#D4AF12`, soft `rgba(245, 217, 39, 0.15)`).
4. Given Dark Mode is active, when any page or component renders, then it uses the authoritative Pure Black + Yellow Accent surface identity (`#000000` page, `#0A0A0A` sidebar, `#141414` card/elevated, `#111111` subtle/input, `#292929` default border, `#F5D927` focus border) and layered surfaces.
5. Given Light Mode is active, when any page or component renders, then it uses the approved clean neutral palette.
6. Given a button has a yellow background, when it is rendered in default, hover, active, focus-visible or disabled state, then its text and icons are black (`#000000`).
7. Given a shared component is used by multiple screens, when its tokens are updated, then all hosts receive consistent theme behaviour without duplicating local colour overrides.
8. Given a UI element uses a brand, surface, text, border, focus or status colour, when the audit searches its source, then it references the approved semantic token rather than an arbitrary component-local hex literal.
9. Given a legitimate chart/data visualisation requires multiple series, when it is themed, then it uses a documented shared palette and remains readable in both themes.
10. Given the user switches Light, Dark or System theme, when the preference resolves, then all route screens, shared components and overlays update consistently using the existing ThemeService.
11. Given a screen has loading, empty, error, success or permission-denied states, when each state is displayed, then it remains visually distinct, readable and consistent in both themes.
12. Given an interactive element receives keyboard focus, when `:focus-visible` applies, then a visible focus indicator is shown in both themes and is not removed by component overrides.
13. Given a screen is displayed on mobile, tablet or desktop, when the theme is changed, then its layout remains responsive without horizontal overflow or theme-related layout regression.
14. Given an approved benchmark screen is updated, when its colours are aligned, then its approved layout, component hierarchy and interaction behaviour remain intact.
15. Given the implementation is complete, when repository-wide colour searches are run, then all remaining hardcoded UI colour exceptions are documented with a reason and owner; unexplained local colour palettes are not left behind.
16. Given the implementation is complete, when verification is performed, then Prettier, TypeScript, Angular development build, relevant tests, accessibility contrast checks, route/theme browser checks and `git diff --check` results are recorded accurately.
17. Given the implementation report is written, when completion is claimed, then every inventory row is either verified or explicitly marked blocked; no untested route or component is reported as complete.

## Open questions

- UNKNOWN: Exact current-branch route and component inventory. Must be generated from `app.routes.ts`, lazy route definitions and source directories before implementation.
- UNKNOWN: Whether all existing chart components can consume semantic CSS variables directly or require chart-library-specific theme adapters. Inspect actual chart implementations before deciding.
- UNKNOWN: Whether any third-party component or externally rendered widget owns styles that BBG cannot override. Record each occurrence and its available integration boundary.
- UNKNOWN: Whether existing design-token aliases have consumers outside the inspected global stylesheet. Run repository-wide searches before removing or remapping aliases.

## Implementation log

- Pure Black + Yellow Accent Design System Implementation:
  - Global Dark Mode tokens updated to Pure Black canvas (`#000000` page canvas, `#0A0A0A` sidebar, `#141414` cards/modals, `#111111` subtle/inputs, `#1A1A1A` hover, `#202020` active/selected).
  - All green and its shades change to yellow and its shades in Dark Mode:
    - Primary Brand: `#F5D927` (hover: `#EAC816`, active: `#D4AF12`, soft: `rgba(245, 217, 39, 0.15)`).
    - Accent Brand Yellow: `#F5D927`.
    - Focus border: `#F5D927`. Focus rings use `3px solid rgba(245, 217, 39, 0.35)`.
    - Yellow button text rule: All buttons with yellow background strictly use `#000000` text and icons.
  - Borders: default `#292929`, subtle `#202020`, strong `#3A3A3A`, focus `#F5D927`.
  - Typography: primary `#FFFFFF`, secondary `#A3A3A3`, muted `#737373`, disabled `#525252`, inverse `#000000`.
  - All shared UI primitives, form inputs, buttons, navigation, storefront, workspace and dashboard components verified and aligned with the Pure Black design system.
