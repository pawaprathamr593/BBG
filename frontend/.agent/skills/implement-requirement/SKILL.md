---
name: implement-requirement
description: Implement a BBG frontend requirement file under frontend/requirements/ end to end by analysing it, planning, routing work to specialist skills, verifying, and logging progress. Use when the user says implement, build or develop a requirement, or references a file under frontend/requirements/.
---

# Implement a requirement

The requirement file is the contract. Every decision traces back to it; every gap becomes a question.

```text
Progress:
- [ ] 1. Load requirement + context
- [ ] 2. Readiness gate
- [ ] 3. Analyse codebase
- [ ] 4. Plan + skill routing  → wait for approval
- [ ] 5. Build (per skill)
- [ ] 6. Verify
- [ ] 7. Review
- [ ] 8. Log + status
```

## 1. Load requirement and context

- Read the requirement completely.
- Load `bbg-context` (`architecture.md`, `codebase-map.md` as needed) and `coding-standards`.

## 2. Readiness gate

Apply `requirement-intake` readiness check. **Not ready** → stop with blocking questions.

## 3. Analyse the codebase

- Find the feature folder, routes, services and nearest sibling screen. Read them.
- Confirm endpoints/permissions against existing code or backend docs.

## 4. Plan (wait for approval)

```markdown
## Plan for <REQ-ID> <title>

### Understanding
...

### UI reuse                      (build-ui)
| Region | Intent | Component / pattern | Ladder | Why |

### State                         (data-layer)
...

### API                           (data-layer)
| Operation | Endpoint | Status | Model |

### Navigation & permissions
...

### Files
- create/modify: <path> — <why>

### Acceptance criteria → verification
| AC | How verified |

### Questions / assumptions
```

Skill routing: screens → `build-ui`; models/API/state/routes → `data-layer`; review → `review-and-release`.

## 5–8. Build, verify, review, log

- Build with `data-layer` then `build-ui` (or reverse only when UI-only).
- Verify: Prettier on touched files, `npx ng build --configuration development`, `git diff --check`, relevant tests.
- Review with `review-and-release`.
- Append to the requirement Implementation log; set `status` appropriately.
- Do not change unrelated UI or behaviour.
