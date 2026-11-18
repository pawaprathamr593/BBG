---
description: Implement a BBG frontend requirement file from frontend/requirements/ end to end
---

1. Ask for the requirement file path if it was not given (`frontend/requirements/<area>/REQ-*.md`).
2. Read `.agent/skills/implement-requirement/SKILL.md` and follow it exactly.
3. Load `.agent/skills/bbg-context` and `.agent/skills/coding-standards`.
4. Run the readiness check from `.agent/skills/requirement-intake`. If "Not ready", stop and list blocking questions.
5. Post the plan and wait for approval.
6. Build using `.agent/skills/data-layer` and `.agent/skills/build-ui`.
7. Verify with Prettier (touched files), `npx ng build --configuration development`, and `git diff --check`.
8. Review with `.agent/skills/review-and-release`, then append to the requirement Implementation log.
