# BBG — RBAC & Filter Architecture Addendum

**Version:** 1.0  
**Date:** 13 November 2026  
**Applies to:** BBG RBAC, reusable filter, and responsive drawer specification  
**Status:** Proposed design clarification; no application code or database migration is included in this document.

This addendum records the responsive sizing and floating-filter-trigger requirements. Read it together with the companion document BBG_RBAC_and_Filter_Architecture_v1.0.

## 1. Floating Filters action

The advanced Filters trigger must not occupy a position beside the search input. On pages with an active filter profile, render it as a floating action button (FAB) fixed to the lower-right viewport corner.

### Behavior

- Remains available while the user scrolls the results page.
- Opens the same context-aware advanced filter drawer.
- Displays a count badge for applied advanced filters only. Do not count search text, sort order, or mandatory contextual scope.
- Uses an icon and visible “Filters” label when there is sufficient width. At very narrow widths, the label may be visually collapsed, but the control must retain an accessible name.
- Must have a sufficiently large touch target (recommended minimum 44 × 44 CSS px; target 48 × 48 CSS px).
- Must not be rendered on pages that have no filter profile or no advanced filters.
- Must not overlap essential page controls, mobile bottom navigation, cookie notices, or other floating widgets. Use a shared floating-action placement/offset policy rather than arbitrary per-page offsets.
- When the drawer is open, the FAB is hidden or made inert; it must not sit above the modal drawer.
- It is a convenience control, not an authorization control. Its visibility does not affect backend access.

### Toolbar

Keep search, sort, view mode, result count, and pagination in their normal page positions. Do not put the Filters FAB beside search. Applied filter chips remain below the normal toolbar.

## 2. Responsive drawer sizing

Use fluid constraints rather than fixed pixel dimensions. The drawer must fit the available viewport width and height on compact phones, large phones, tablets, laptops, and large desktop displays.

| Breakpoint class | Presentation | Width rule | Height rule |
|---|---|---|---|
| Mobile / narrow viewport | Full-screen modal panel | 100% of viewport width | 100 dynamic viewport height |
| Tablet | Right-side overlay drawer | Fluid width, capped at 80vw and available width | Available dynamic viewport height |
| Desktop | Right-side overlay drawer | Fluid width, suggested clamp between 20rem and 30rem, never wider than available viewport | Available dynamic viewport height |

Suggested CSS starting point (adapt tokens and breakpoints to the BBG design system):

~~~scss
.filter-drawer {
  position: fixed;
  inset-block: 0;
  inset-inline-end: 0;
  width: clamp(20rem, 34vw, 30rem);
  max-width: min(100vw, 100%);
  height: 100vh;  // fallback
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.filter-drawer__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.filter-drawer__header,
.filter-drawer__footer {
  flex: 0 0 auto;
}

.filter-fab {
  position: fixed;
  inset-inline-end: max(1rem, env(safe-area-inset-right));
  inset-block-end: max(1rem, env(safe-area-inset-bottom));
  z-index: var(--z-floating-action);
}

@media (min-width: 768px) and (max-width: 1023.98px) {
  .filter-drawer {
    width: min(80vw, 27.5rem);
  }
}

@media (max-width: 767.98px) {
  .filter-drawer {
    inset: 0;
    width: 100%;
    max-width: 100%;
    height: 100vh;  // fallback
    height: 100dvh;
  }

  .filter-drawer__footer {
    padding-block-end: max(1rem, env(safe-area-inset-bottom));
  }

  .filter-fab {
    inset-inline-end: max(1rem, env(safe-area-inset-right));
    inset-block-end: max(1rem, env(safe-area-inset-bottom));
  }
}
~~~

These are sizing guidelines, not final production CSS. Use BBG's established breakpoints, spacing tokens, typography, color, shadow, and z-index tokens after inspecting the existing design system. Avoid hard-coded assumptions about browser chrome; 100dvh is preferred with 100vh as a fallback.

## 3. Drawer structure and scrolling

Use three vertical regions:

1. Header — title, optional result context, and close action.
2. Body — independently scrollable filter controls.
3. Footer — Reset and Apply Filters actions, always reachable.

The drawer itself must not scroll as one large block if that causes the header or actions to disappear. Use min-height: 0 on the flex body so nested scrolling works correctly.

On mobile, account for safe-area insets, virtual keyboard resizing and focused-input visibility, browser dynamic viewport changes, one-handed reach and adequate touch targets, and a sticky footer that does not obscure the final filter control.

On desktop/tablet, lock background scrolling while the modal drawer is open. On mobile, also prevent background page scroll and preserve the result-list scroll position for return after Apply or Close.

## 4. Floating action collision policy

BBG may later include chat, support, back-to-top, or other floating actions. Define shared z-index layers and placement rules centrally.

- The Filters FAB must not overlap a higher-priority support/chat action.
- If two actions share a corner, stack them with consistent spacing or move one to the opposite corner according to the global floating-action policy.
- Reserve space for mobile bottom navigation and safe-area insets.
- Avoid placing the FAB over checkout, submit, pagination, or other high-priority actions.
- Test the FAB at short viewport heights as well as narrow widths.

## 5. Responsive acceptance criteria

Test at least:

- 320 × 640, 360 × 800, and 390 × 844 mobile viewports;
- 768 × 1024 tablet portrait and 1024 × 768 landscape;
- 1280 × 800 and 1440 × 900 desktop;
- browser zoom at 200%;
- short and long filter forms;
- virtual keyboard open on mobile;
- safe-area devices;
- pages with and without other floating controls.

Pass criteria:

- No horizontal overflow or clipped drawer content.
- Drawer width never exceeds the visible viewport.
- Header and footer actions remain visible and usable.
- Filter body scrolls independently.
- FAB remains reachable without covering essential content.
- Opening the drawer hides/disables the FAB and traps modal focus.
- Closing restores focus and preserves the result scroll position.
- Responsive changes do not alter draft/applied filter semantics.

## 6. Authorization and context remain unchanged

This UI update does not change the RBAC model or server-side data scope:

- Public storefront customers still do not see a business selector.
- Storefront business scope is derived and enforced by the backend.
- Consumer order filters remain restricted to the authenticated Consumer's own records.
- Tenant filters remain tenant-scoped.
- Platform-wide selectors appear only when the caller has the relevant platform permission.
- Hiding a control is not a security boundary.

## 7. Implementation boundary

This addendum updates the design baseline only. Before implementation, inspect the current Angular shell, global z-index conventions, responsive breakpoints, shared button styles, and existing floating widgets. Integrate with existing tokens and components rather than introducing conflicting global styles. No DB migration is needed for this UI clarification.


## 8. Implementation status — first vertical slice

The following first-slice implementation is now present on `feature/public-marketplace-pages`:

- A reusable Angular `FilterDrawer` component provides the floating Filters action, right-side desktop/tablet drawer, full-screen mobile panel, safe-area spacing, independently scrolling body, sticky actions, Escape/backdrop close, focus handling, and background-scroll locking.
- The public Products directory uses the floating trigger at the lower-right of the viewport. Search and sort remain in the normal toolbar.
- Product advanced filters are edited as draft values and applied together. Closing without applying discards the draft; Reset clears only the draft; applied filter chips can be removed individually.
- Password registration and new social registration assign the global `CONSUMER` role inside the same database transaction as account creation.
- The additive seed `backend/database/seeds/20261113_004_global_consumer_role.sql` creates the global role and backfills all active existing accounts idempotently.
- The database migration README documents the seed. CI now has a minimal MySQL fixture check for seed syntax, active-account backfill, and idempotence.

**Important scope boundary:** this slice creates and assigns the Consumer role. It does not yet seed Consumer-specific permission codes or add Consumer permission checks to personal order/address/enquiry endpoints. Those must be implemented with endpoint-by-endpoint ownership tests; the role assignment alone is not an authorization control.

**Database deployment step:** apply the new Consumer seed only after verifying the target database schema and taking the required backup. Do not apply it to an unverified database. The application registration path expects the active `CONSUMER` role row to exist; deploy the seed before enabling the new registration code.
