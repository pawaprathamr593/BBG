# BBG Frontend Coding Standards

**Applies to:** `frontend/`  
**Baseline:** Angular 22, TypeScript 6, RxJS 7.8, SCSS  
**Purpose:** Improve consistency, type safety, accessibility and maintainability without changing BBG features, API contracts, routes, styling or user-visible behaviour.

These standards are BBG-specific. The uploaded agent skills kit is an engineering reference, not an instruction to copy its EduNova stack, PrimeNG/Tailwind conventions, `de-*` component library, NgRx setup or legacy file structure.

## 1. Non-negotiable change boundaries

- Preserve existing feature behaviour, API endpoints, request envelopes, response mapping, route paths, permissions and navigation.
- Preserve existing visual design, CSS tokens, responsive layouts, theme behaviour, content and interaction patterns during code-quality refactors.
- Do not introduce a UI framework, state library, API wrapper, runtime dependency or new architecture without explicit approval.
- Keep changes scoped. Do not combine formatting-only changes with unrelated feature changes.
- Do not modify backend code, database/schema, infrastructure, AWS resources or deployment configuration as part of frontend-only work.
- Existing code is the source of truth when a convention in an external reference conflicts with the current BBG implementation.

## 2. Angular and TypeScript

- Use standalone Angular components and lazy feature loading, following the existing route structure.
- Use `ChangeDetectionStrategy.OnPush` for new components and adopt it in existing components only when their state updates are compatible with OnPush.
- Prefer `inject()` for dependency injection in new code.
- Prefer signal inputs (`input()`), outputs (`output()`), `signal()` and `computed()` for new Angular components where appropriate. Preserve existing public component bindings and event names when migrating decorators.
- Use interfaces for object contracts. Do not add `any`; use `unknown` at untrusted boundaries and narrow it before use.
- Use explicit return types for public methods and exported helpers when they improve the contract.
- Use descriptive camelCase names for variables and functions, PascalCase for classes and interfaces, and UPPER_SNAKE_CASE for true constants.
- Boolean names should communicate intent, e.g. `isLoading`, `hasPermission`, `canSubmit`.
- Keep functions focused. Prefer an options object when a function needs more than three independent arguments.
- Use immutable array/object updates (`map`, `filter`, spread) rather than mutating shared state.
- Prefer pure helpers in focused utility files when logic is reused or independently testable.
- Keep new component TypeScript files focused; split domain models, API contracts and reusable helpers rather than creating oversized components.

## 3. Components and templates

- Route-level/feature components own orchestration: route context, service calls, loading/error handling, permissions and navigation.
- Presentational components receive typed inputs and emit outputs. They should not independently call APIs or own feature-wide state.
- Reuse existing BBG components, services, models and CSS tokens before introducing new abstractions.
- Keep templates declarative. Move non-trivial transformations and repeated calculations into typed component members or pure helpers.
- Use Angular control flow (`@if`, `@for`, `@switch`) in new templates.
- Every repeated list must use a stable `track` expression based on a real identity where available.
- Use strict comparisons (`===` / `!==`) and avoid unsafe non-null assertions on API data.
- Keep template expressions simple; do not perform expensive transformations or side effects in templates.
- Use semantic HTML and native controls where they fit the existing design. Every interactive control needs an accessible name and keyboard operation.

## 4. API and data contracts

- Keep HTTP calls in core/feature API services, not presentational components.
- Use the existing BBG endpoint, payload envelope, response contract and authentication interceptor. Do not invent endpoints, fields, permission codes or response shapes.
- Keep API DTOs distinct from view models when a mapping boundary exists or is introduced for a new feature.
- Type service inputs and outputs. Treat network data as untrusted and validate/narrow it before use.
- Preserve existing error semantics and user-facing messages unless a separate behaviour change is approved.
- Do not log access tokens, credentials, personal data or raw authentication responses.
- Do not move tokens or sensitive user data into localStorage/sessionStorage. Follow the existing authentication/session design.
- Do not bypass HTTP interceptors or add ad-hoc authorization headers unless the existing API contract explicitly requires them.

## 5. State and asynchronous work

- Use Angular signals for synchronous component and feature state where the current feature already follows that pattern.
- Use RxJS for HTTP streams, cancellation, composition and event streams. Do not introduce NgRx solely to match the external kit.
- Maintain one source of truth for each data set; avoid duplicated component/service/store copies.
- Use `takeUntilDestroyed` for component-owned subscriptions that do not complete on their own.
- Handle loading, empty, error and success states explicitly. Disable duplicate submissions while a mutation is in progress.
- Cancel or ignore stale requests when changing search/filter context where the existing feature requires it.
- Avoid nested subscriptions; compose dependent asynchronous operations with RxJS operators or clearly awaited promises.
- Do not put HTTP requests or side effects inside `computed()` or reactive derivations.

## 6. Styling and visual regression protection

- Keep the current BBG design system: existing SCSS, CSS custom properties, theme attributes and component-specific styling.
- Do not introduce Tailwind, PrimeNG or another component framework as part of a standards refactor.
- Reuse existing design tokens for brand, surfaces, text and borders; avoid duplicating hard-coded values when a token already exists.
- Preserve light/dark theme contrast and ensure new styles work in both themes.
- Keep layouts mobile-first and test narrow screens (at least 360–390px) as well as tablet and desktop widths.
- Do not change spacing, typography, colours, dimensions, animation, breakpoints or component composition during a code-only refactor unless required to fix a verified defect and approved.
- Respect `prefers-reduced-motion`, visible focus states and touch targets.

## 7. Accessibility and UI states

- Use semantic landmarks, headings, labels and buttons.
- Associate form labels with controls; expose validation and errors to assistive technology.
- Provide visible keyboard focus and do not make hover the only way to access an action.
- Use `aria-live`, `role="status"` or `role="alert"` appropriately for asynchronous feedback.
- Keep layout stable while loading; explain empty states and provide a next step where appropriate.
- Confirm destructive actions and report mutation failures accurately. Never show success feedback when an operation failed.

## 8. Formatting and hygiene

- Follow the existing `frontend/.prettierrc` and `.editorconfig`: 2-space indentation, single quotes in TypeScript, 100-character print width and Angular HTML parsing.
- Keep imports used and ordered consistently with nearby files.
- Remove newly introduced unused variables, imports, dead code and debugging logs.
- Do not leave commented-out implementation blocks or temporary mock data in release code.
- Avoid broad reformatting of untouched files.

## 9. Testing and verification

For every scoped change:

1. Run Prettier check on touched files.
2. Run `npx ng build --configuration development` from `frontend/`.
3. Run relevant unit/component tests when present.
4. Run `git diff --check`.
5. For UI-adjacent changes, manually check the affected flow at mobile and desktop sizes, in light and dark themes, and verify keyboard/focus behaviour.

Report each check as passed, failed or not run. Never claim visual verification without actually performing it.

## 10. Safe refactoring checklist

- [ ] Existing inputs, outputs, route paths and API contracts remain compatible.
- [ ] No feature or interaction has been removed or reinterpreted.
- [ ] No visual, responsive or theme changes were introduced intentionally.
- [ ] New code is typed and does not introduce `any`.
- [ ] Subscriptions and asynchronous work have clear lifecycle/error handling.
- [ ] Loading, empty, error and success feedback remain correct.
- [ ] Build, tests, formatting and diff checks are reported honestly.


> Agent note: keep this file in sync with `frontend/CODING_STANDARDS.md` when standards change.
