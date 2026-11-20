# BBG Frontend Coding Standards

**Applies to:** `frontend/`  
**Baseline:** Angular 22, TypeScript 5.9+, RxJS 7.8, SCSS  
**Purpose:** Improve consistency, type safety, accessibility, component reusability and maintainability without changing BBG features, API contracts, routes, styling or user-visible behaviour.

These standards are BBG-specific and authoritative. The uploaded agent skills kit is an engineering reference, not an instruction to copy its EduNova stack, PrimeNG/Tailwind conventions, `de-*` component library, NgRx setup or legacy file structure.

---

## 1. Non-negotiable Change Boundaries

- Preserve existing feature behaviour, API endpoints, request envelopes, response mapping, route paths, permissions and navigation.
- Preserve existing visual design, CSS tokens, responsive layouts, theme behaviour, content and interaction patterns during code-quality refactors.
- Do not introduce a UI framework (e.g. Tailwind, PrimeNG, Material, Bootstrap), state library (NgRx, Akita), API wrapper, runtime dependency or new architecture without explicit approval.
- Keep changes scoped. Do not combine formatting-only changes with unrelated feature changes.
- Do not modify backend code, database/schema, infrastructure, AWS resources or deployment configuration as part of frontend-only work.
- Existing code is the source of truth when a convention in an external reference conflicts with the current BBG implementation.

---

## 2. Angular Architecture & Component Structure

### 2.1 Component Classification
- **Container (Smart) Components:** Own route context, service injection, API orchestration, loading/error signals, permissions, and navigation. Located under `src/app/features/`.
- **Presentational (Dumb) Components:** Pure presentation. Strictly receive data via typed inputs (`input()`) and emit events via outputs (`output()`). Must NOT inject HTTP services or mutate global state. Located under `src/app/shared/components/` or feature-specific subfolders.
- **Layout Components:** Shell structures managing responsive navigation, sidebars, headers, and content projection (`<ng-content>`).

### 2.2 Component Class Structure Order
Every Angular component should follow a uniform internal member ordering:
1. `@Component` decorator with `standalone: true`, `changeDetection: ChangeDetectionStrategy.OnPush`, `imports`, and template/styles.
2. Injected dependencies using `inject(...)` at field declaration level.
3. Component inputs: `input<T>()` or `input.required<T>()`.
4. Component outputs: `output<T>()`.
5. Reactive state: `signal<T>()`, `computed<T>()`, `toSignal(...)`.
6. Lifecycle hooks in chronological order: `ngOnInit()`, `ngAfterViewInit()`, `ngOnDestroy()`.
7. Public methods called from template event bindings.
8. Private helper methods.

### 2.3 Naming & File Conventions
- **Class Names:** PascalCase with standard suffixes: `MarketplaceHomeComponent`, `ProductCardComponent`, `AuthService`, `AuthInterceptor`.
- **Selectors:** kebab-case prefixed with `app-`, e.g. `app-business-card`, `app-workspace-drawer`.
- **Files:** kebab-case. Shared components: `[name].component.ts`, `[name].component.html`, `[name].component.scss`. Route feature containers may retain established concise naming (`marketplace-home.ts`, `catalogue.ts`) to avoid breaking existing imports.
- **Directories:** Feature-first organization under `src/app/features/<feature-name>/`, shared reusable UI under `src/app/shared/components/`, core singleton services under `src/app/core/services/`.

---

## 3. TypeScript Strictness & Data Contracts

- **No `any`:** Strict typing is mandatory. Use specific interfaces or union types. At untrusted external boundaries (e.g. raw JSON parsing), use `unknown` and narrow it with type guards before use.
- **Explicit Return Types:** Exported functions, service methods, and public component methods must specify explicit return types.
- **Backend API Envelopes:** Preserve Yii 3 action-envelope contracts (`businessParam`, `authParam`, `adminParam`, `customerParam`, `subscriptionParam`, `tenantParam`, `dashboardParam`). Never send flat payloads to endpoints expecting envelope objects.
- **Immutability:** Use immutable array and object updates (`.map()`, `.filter()`, object spread `{ ...state }`) instead of mutating arrays in-place.
- **Strict Equality:** Always use `===` and `!==`. Never use loose equality (`==`, `!=`).

---

## 4. HTML Template Standards

- **Control Flow:** Exclusively use modern Angular control flow syntax: `@if`, `@for`, `@switch`. Do not introduce legacy `*ngIf` or `*ngFor` in new templates.
- **Stable Tracking:** Every `@for` loop must provide a stable, unique tracking key: `@for (item of items(); track item.id)`. Never track by volatile index unless the list is strictly static and read-only.
- **Logic-Free Templates:** Do not embed complex calculations, multi-step ternary logic, or function invocations in template expressions. Delegate to `computed()` signals or component getters.
- **Semantic HTML:** Use native semantic elements: `<main>`, `<nav>`, `<aside>`, `<header>`, `<footer>`, `<section>`, `<article>`, `<button>`, `<table>`. Do not use `<div (click)="...">` when `<button>` is semantically appropriate.

---

## 5. Styling, Design Tokens & SCSS Architecture

- **Centralized Design Tokens:** All colors, spacing, borders, shadows, and radii must reference CSS custom properties defined in `src/app/core/theme/tokens.scss` or `src/styles.scss` (e.g. `var(--bbg-brand-primary)`).
- **Zero Hardcoded Hex Codes:** Hardcoded hexadecimal color literals (e.g. `#174D35`, `#F5D928`) are strictly prohibited in component styles. Always use semantic CSS variables.
- **Theme Support:** Every component style must support both Light and Dark modes seamlessly via CSS custom properties. Test contrast across both themes.
- **SCSS Nesting Limit:** Limit CSS/SCSS nesting to a maximum of 3 levels deep to prevent specificity bloat and performance degradation.
- **Bundle Budgets:** Keep component SCSS lean. Reusable styles belong in shared SCSS partials or shared components to prevent exceeding Angular's 16kB component style budget.
- **Mobile-First Responsive Grid:**
  - `Mobile (Compact)`: `< 640px`
  - `Tablet`: `640px - 1023px`
  - `Desktop`: `1024px - 1439px`
  - `Wide`: `>= 1440px`

---

## 6. Signals, State & Asynchronous Programming

- **Signal-First Reactivity:** Use Angular Signals (`signal()`, `computed()`) for local component state and synchronous derivations.
- **RxJS for Async Streams:** Use RxJS Observables for HTTP communication, real-time streams, debouncing, and event cancellation.
- **Subscription Lifecycle Management:** Every component-owned `.subscribe()` must be automatically cleaned up using `takeUntilDestroyed(this.destroyRef)` or converted to a signal with `toSignal()`. Unmanaged subscriptions that cause memory leaks are strictly prohibited.
- **No Side Effects in `computed()`:** Computed signals must be pure synchronous derivations. Never make HTTP calls or dispatch state mutations inside a `computed()` block.
- **Explicit UI States:** Every screen and data-dependent component must handle and visually present 4 core states:
  1. *Loading State:* Shimmer skeleton (`app-skeleton-loader`) or focused spinner.
  2. *Empty State:* Meaningful message, icon/illustration, and next-step action button (`app-empty-state`).
  3. *Error State:* Non-blocking alert banner with human-readable error and retry action.
  4. *Success State:* Clean populated UI with optimistic or immediate updates.

---

## 7. Accessibility (WCAG 2.2 AA) Standards

- **Color Contrast:** All body text must maintain a minimum contrast ratio of 4.5:1 against its background. Large headings (>=24px) and graphical elements must maintain at least 3:1.
- **Focus Rings:** Interactive elements must have a high-visibility `:focus-visible` ring (`var(--bbg-focus-ring)`). Never set `outline: none` without providing an accessible focus alternative.
- **Form Controls:** Every input, select, and textarea must be explicitly associated with a `<label>` or contain an `aria-label` / `aria-labelledby` attribute. Form validation errors must be linked via `aria-describedby`.
- **Modals & Drawers:** Overlays must trap keyboard focus, set `role="dialog"`, declare `aria-modal="true"`, supply an accessible `aria-labelledby`, and dismiss safely on `Escape` key press.
- **Live Regions:** Asynchronous notifications and toast alerts must use `aria-live="polite"` or `role="alert"`.

---

## 8. Services & Dependency Injection

- **`inject()` Pattern:** Use `inject(ServiceName)` for dependency injection instead of constructor parameter injection.
- **Single Responsibility Services:** Keep services focused. API services handle communication with specific endpoints; state services manage shared client state.
- **Token Storage & Security:** Authentication tokens must remain in-memory signals in `AuthService`. Refresh tokens reside in HttpOnly cookies. Never store tokens or sensitive credentials in `localStorage` or `sessionStorage`.

---

## 9. Verification & Safe Refactoring Checklist

Before completing any task or moving between phases:
1. Verify TypeScript compiles with zero errors: `npx tsc --noEmit`.
2. Verify Angular builds with zero errors: `npm run build`.
3. Check all affected routes and interactions at mobile (<640px) and desktop (>1024px) viewports.
4. Verify both Light and Dark themes.
5. Verify keyboard navigation and focus indicators.
6. Verify API request and response payload integrity.
