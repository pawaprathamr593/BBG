# .agent — BBG frontend AI setup

Everything AI agents need for the BBG Angular frontend lives in `.agent/`. There is no tool-specific folder (`.cursor/`, `.claude/`, …); tools reach these files directly or through `frontend/AGENTS.md`.

```text
.agent/
├── skills/      development skills (single source of truth)
├── rules/       always-on routing of work to the skills
└── workflows/   slash-command style procedures
```

| Tool | How it uses `.agent/` |
| --- | --- |
| Antigravity | Reads `.agent/rules/`, `.agent/workflows/` and `.agent/skills/` |
| Cursor / Codex / Copilot | `frontend/AGENTS.md` points here |

## Skills

| Skill | Use for |
| --- | --- |
| `bbg-context` | Product, architecture, codebase map — load before analysing or changing code |
| `coding-standards` | TypeScript/Angular/SCSS quality rules that must not change UI or behaviour |
| `build-ui` | Screens, templates, SCSS tokens, shared presentational components |
| `data-layer` | Models, API services, signals, routes, workspace permissions |
| `requirement-intake` | Draft / readiness-check requirement files under `frontend/requirements/` |
| `implement-requirement` | Implement a requirement end to end |
| `review-and-release` | Diff review and release notes |

## Maintaining skills

- Edit skills only here. One rule lives in one file; other skills link to it.
- Each skill is a folder with `SKILL.md` (`name` = folder name, `description` ≤ 1024 characters, body under 500 lines) plus optional `references/`.
- These skills are **BBG-specific**. Do not import EduNova / PrimeNG / Tailwind / NgRx / `de-*` conventions.
- After a requirement is implemented, record agent mistakes as a fix to the skill that should have prevented them.
- Coding standards source of truth for code quality: `frontend/CODING_STANDARDS.md` (mirrored by the `coding-standards` skill).
