---
name: new-dev
description: Use this skill when the user asks to build something new in SIMS, either (a) a brand-new module that does not exist in the codebase at all, or (b) a new feature added to an already-existing module, such as a new endpoint, action, field, workflow, or report. Triggers include phrases like "create a new module for...", "build a new module that handles...", "I need a whole new module for...", "set up a new [entity] module from scratch", "add a new endpoint to...", "add a [feature] to the [existing] module", "extend [module] to support...", "add a field/action/filter to...", "implement [new capability] in...". Do NOT use this skill for fixing broken or incorrect behavior in any module (use modify instead); refactoring or cleanup with no new behavior; or purely reading/explaining existing code. If it's unclear whether the request is a new feature or a bug fix, ask the user to clarify before proceeding.
---

> For `new-dev` tasks, always follow `Architecture.md`, even if existing code elsewhere deviates from it. New code should not replicate known architectural drift.

# General

- Do not create duplicate functionality; ask about pre-existing submodules to build upon.
- Inspect existing implementations before modifying code.
- Code > architecture rules in case of conflicts — this applies specifically to modification tasks: if the existing code contradicts its Architecture.md file, follow the code as-is rather than "correcting" it toward the documented pattern. That file is descriptive and is used only to locate layers and files.
- For any other contradiction (not the code-vs-architecture case above), ask explicitly rather than assuming.
- New development only happens in `digitalsims`, targeting the best PHP version compatible with Yii 1.1.14.
- `simsServices` (SOAP) is obsolete; any change there (bug-fix or otherwise) should only proceed if explicitly requested by the user.

# Workflow

There are only two checkpoints: **plan approval** (before implementation) and **final summary** (after implementation).

## 1. Plan (iterate until approved)

### 1.1 Gather facts
- Collect DB requirements, business logic, and the input/output contracts for the API(s).
- If any of these are missing, ask the user. Do not assume.
- Ask the user whether to reuse existing submodules and DB tables. Do not search the codebase for reusable pieces unless the user asks.

### 1.2 Write the plan
The plan must include:
- **Purpose and scope:** the module/feature purpose and its major components.
- **DB design:** the normalized schema, including reused vs. new tables.
- **Business rules and I/O contracts:** a short restatement of what the user told you.
- **Layer mapping:** which files are created or touched at each layer, in order (InDto → Controller → Versioned services → Core services → DAO), following the project's layered architecture.
- **Validation ownership:** for each new validation rule, which layer owns it, so implementation doesn't duplicate or misplace validation.
- **Exception handling:** handle each exception at the layer where it occurs. Each calling layer above checks the returned response's `status`; if it indicates an error, it returns the same response upward with an appended message for easier debugging, rather than swallowing or reconstructing it.

### 1.3 Approval loop (hard gate)
- Present the plan, then **stop**. Do not create or modify any file until the user explicitly approves.
- If the user requests changes, revise the plan and present it again. Repeat until the user explicitly approves.
- Silence, partial agreement, or answers to clarifying questions do not count as approval.

## 2. Implementation
- Implement exactly what the approved plan describes, using the facts, DB fields, and business rules already gathered. Implementation is not a new requirements-gathering pass.
- For each layer, follow its sample (see Code Sample References) for structure, naming, and error-handling conventions rather than improvising the pattern.
- If a gap or new requirement appears mid-implementation, stop and describe it. If it changes the plan's file list, layer ownership, or DB design, return to Step 1.3 with an updated plan. Do not expand scope silently.

## 3. Final Summary
Before summarizing, check what was built against the approved plan: every planned file exists, and each layer's validation ownership and error handling match the plan.

Then give the developer a summary covering:
- Files created or modified, per layer
- DB changes
- Validation ownership
- Deviations from the plan (if any)
- tests for checking the developed api
- What was verified and what could not be verified (e.g. no build, DB, or runtime access), so the developer knows what to test
- Follow-ups

# Code Sample References

Before implementing a layer, open its reference file and mirror its structure, naming, and error-handling conventions. Read `Architecture.md` first, then only the samples for the layers you are touching.

| Layer                   | Reference file                    |
|-------------------------|-----------------------------------|
| Architecture            | `./resources/Architecture.md`     |
| Rules & Conventions     | `./Rules.md`                      |
| InDto                   | `./examples/InDtoSamples.md`      |
| Controller              | `./examples/ControllerSamples.md` |
| Versioned services (V1) | `./examples/ServicesV1Samples.md` |
| Core services           | `./examples/ServicesSamples.md`   |
| DAO                     | `./examples/DaoSamples.md`        |