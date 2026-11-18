---
trigger: always_on
description: Routes BBG frontend work to the skills in .agent/skills and CODING_STANDARDS.md
---

# Skills-based development in BBG frontend

- Skills live in `.agent/skills/<name>/SKILL.md`. Read the skill's `SKILL.md`, then only the `references/` files it points to.
- Before analysing or changing code, load `.agent/skills/bbg-context` (at minimum `references/architecture.md`) and `.agent/skills/coding-standards`.
- Any file under `frontend/requirements/` is a work contract. To build it, follow `.agent/skills/implement-requirement`; to write or check it, follow `.agent/skills/requirement-intake`.
- Route specialised work: screens, layout, styling, shared presentational components → `build-ui`; models, services, API, signals, routes, workspace permissions → `data-layer`; reviews and release notes → `review-and-release`.
- The skills in `.agent/skills/` plus `CODING_STANDARDS.md` are the single source of truth for rules. When a rule changes, edit the one skill file (or `CODING_STANDARDS.md`) that owns it.
- Never invent endpoints, payload fields, permission keys or routes. If the requirement says `UNKNOWN`, ask.
- Do not change visual design or user-visible behaviour during code-quality / standards work.
- Verify with `npx ng build --configuration development` from `frontend/`.
