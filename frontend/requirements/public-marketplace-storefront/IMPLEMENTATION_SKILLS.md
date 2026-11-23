# Required Skills & Implementation Workflow

This requirement must be implemented through BBG's existing frontend agent workflow. Do not create a parallel agent system.

## Mandatory reading order

1. `frontend/AGENTS.md`
2. `frontend/.agent/README.md`
3. `frontend/.agent/rules/bbg-skills-workflow.md`
4. `frontend/.agent/skills/bbg-context/SKILL.md`
5. `frontend/.agent/skills/bbg-context/references/architecture.md`
6. `frontend/.agent/skills/coding-standards/SKILL.md`
7. `frontend/CODING_STANDARDS.md`
8. `frontend/.agent/skills/build-ui/SKILL.md` and its referenced UI/UX standards
9. `frontend/.agent/skills/data-layer/SKILL.md` and its referenced API documentation
10. `frontend/.agent/skills/requirement-intake/SKILL.md`
11. `frontend/.agent/skills/implement-requirement/SKILL.md`
12. `frontend/.agent/skills/review-and-release/SKILL.md`

## Skill routing

| Work type | Required skill | How to apply |
|---|---|---|
| Public page layout, template, SCSS, responsive UI | `build-ui` | Reuse current shells/components/tokens; make presentational components reusable where justified |
| Existing API and model inspection | `data-layer` | Map pages to current services/models/routes; reuse existing contracts only |
| Requirement readiness | `requirement-intake` | Check scope, acceptance criteria, route/API evidence and blockers |
| Implementation plan and execution | `implement-requirement` | Analyse first, present a file-level plan, wait for approval, implement and log |
| Final diff and release review | `review-and-release` | Check scope, regressions, build, formatting and release notes |
| Code quality | `coding-standards` | Follow Angular 22, strict TypeScript, SCSS tokens, accessibility and project patterns |

## Required workflow

1. Read the complete requirement and every referenced page wireframe.
2. Inspect the current branch, route configuration, public Marketplace and Storefront page components, shared components, API services, typed models and existing styles.
3. Produce a traceability table: page → route → current component → API service/method → shared components → reference image.
4. Mark each API operation as verified from code or unknown. Do not infer endpoint names, DTO fields, request envelopes or response properties.
5. Identify the exact files that render the two protected product-detail pages and add them to a no-change guard list.
6. Present a component reuse plan and file-level change plan before editing.
7. Wait for approval of the implementation plan.
8. Implement approved pages in manageable page groups; reuse existing API methods and response mapping.
9. Do not edit protected product-detail components, templates, styles, route behaviour or their supporting feature logic.
10. Verify desktop/tablet/mobile and light/dark modes for redesigned pages only.
11. Run Prettier, Angular development build, relevant tests and `git diff --check`.
12. Review the diff and confirm both protected product-detail experiences have zero changes.
13. Update the requirement implementation log with files changed, verification performed, blockers and remaining work.

## Hard constraints

- Backend APIs already exist: do not add or change endpoints, Yii services, request/response contracts or database schema.
- Do not add mock APIs or invented data to make a page look complete.
- Do not add Tailwind, PrimeNG, Angular Material, NgRx or another UI framework.
- Do not redesign either specific-product detail page.
- Do not invent checkout, cart, ordering, coupon, redemption, payment or discount-calculation functionality.
- Preserve existing public navigation and route semantics.
- Use BBG semantic design tokens and the approved Forest Green palette.
- No unrelated refactoring, commits, pushes or branch operations unless separately authorised.

## Completion report format

- Pages implemented
- Existing components reused / new components created
- Existing API methods reused
- Routes preserved
- Responsive/theme checks completed
- Accessibility checks completed
- Build/test results
- Protected product-detail diff check (must be zero)
- Known blockers and unimplemented items
