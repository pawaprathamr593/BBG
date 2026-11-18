---
name: requirement-intake
description: Draft, complete and readiness-check BBG frontend requirement files in frontend/requirements/ using the BBG requirement template. Use when the user wants to write a requirement, turn an idea/ticket into a spec, or check whether a requirement is ready for implementation.
---

# Requirement intake

Turn an idea or ticket into a requirement file that `implement-requirement` can build without guessing.

## Draft a new requirement

1. Ask (or infer): feature area, type (new / enhancement / bug), personas, primary job.
2. Pick the next id under `frontend/requirements/<area>/` as `REQ-<AREA>-<NNN>`.
3. Copy [references/requirement-template.md](references/requirement-template.md) to  
   `frontend/requirements/<area>/REQ-<AREA>-<NNN>-<kebab-slug>.md`.
4. Fill known sections. Use `bbg-context` → `product-and-users.md` for personas/devices.
5. Mark unknowns as `UNKNOWN` under Open questions. Never invent endpoints or permission keys.
6. Leave `status: draft`.

## Readiness check

| # | Check | Ready when |
| --- | --- | --- |
| 1 | Frontmatter | `id`, `title`, `area`, `type`, `owner` set |
| 2 | Problem | Clear problem and why it matters |
| 3 | Personas | Each role has a goal and device |
| 4 | Scope | In / out of scope listed |
| 5 | Entry | Route proposal and required params |
| 6 | Flow | Steps including after save/cancel |
| 7 | Screens | Regions + expected reuse |
| 8 | API | Endpoint/method/samples or `UNKNOWN` listed |
| 9 | Permissions | Actions mapped to known keys or `UNKNOWN` |
| 10 | States | Loading, empty, error, success |
| 11 | Responsive | Mobile behaviour described |
| 12 | Acceptance | Testable Given/When/Then criteria |

Verdict: **Ready** / **Ready with gaps** / **Not ready** (list blocking questions).

## Quality bar

- Business language in acceptance criteria
- One utility or screen group per file
- Do not delete the Implementation log section
