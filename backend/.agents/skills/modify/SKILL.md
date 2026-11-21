---
name: modify
description: Use this skill ALWAYS, before touching any existing code in SIMS. Whenever the agent is about to edit, replace, or delete code, logic, queries, validations, or configuration that already exists, this skill must be loaded first, whether the user asked for the change or the agent decided on it while debugging. It applies in two cases. (1) User-requested change - the user asks to alter existing behavior, such as adjusting a business rule, changing a validation, altering a response or query, updating a field's handling, or tweaking a workflow in an existing module. Triggers include "change [existing behavior] to...", "update the logic in...", "modify [function/API/module] so that...", "replace X with Y in...", "adjust...". (2) Debugging and correction - something is broken, incorrect, or behaving differently from what it should, and the agent must diagnose it and edit existing code to fix it. Triggers include "fix this bug...", "X is not working...", "getting an error when...", "this returns the wrong value...", "why is [thing] failing...", "it crashes when...", "this used to work but now...", "debug...", "troubleshoot...", "resolve this issue...", or a pasted stack trace, error log, or failing test. Load this skill at the moment a fix or edit to existing code becomes necessary, even if the user never used the words "fix" or "modify". Do NOT use this skill for building a brand-new module, or adding a new endpoint, action, field, workflow, or report (use new-dev instead); refactoring or cleanup with no change in behavior; performance tuning with no functional defect; or purely explaining how existing code works without changing it. If it's unclear whether the request modifies existing behavior or adds new capability (for example "make X also do Y"), ask the user to clarify before proceeding.
---

# General

- Do not create duplicate functionality; ask about pre-existing submodules to build upon.
- Inspect existing implementations before modifying code.
- Code > architecture rules in case of conflicts — this applies specifically to modification tasks: if the existing code contradicts its Architecture.md file, follow the code as-is rather than "correcting" it toward the documented pattern. That file is descriptive and is used only to locate layers and files.
- For any other contradiction (not the code-vs-architecture case above), ask explicitly rather than assuming.
- New development only happens in `digitalsims`, targeting the best PHP version compatible with Yii 1.1.14.
- `simsServices` (SOAP) is obsolete; any change there (bug-fix or otherwise) should only proceed if explicitly requested by the user.

# Workflow

## 1. Contract Protection (changes inside existing functions)

- **Do not change the input or output contract** of existing code (request/response shape, parameters, field names or types, return values, status or error codes, function signatures, DB columns or event payloads) **unless the user explicitly asks for it.**
- Make the fix or change within the existing contract. Prefer solutions that keep it intact (for example, correcting internal logic rather than altering what is returned).
- If the issue or request cannot be done without changing the contract, do not change it by default. Stop, state the conflict, explain why, list the affected consumers, and ask the user whether to change the contract before proceeding.
- If the user has explicitly asked for a contract change, make only the change they asked for and nothing beyond it.

## 2. Implementation Guidelines (changes inside existing functions)

Make exactly the requested change. While implementing:

- **Read the neighborhood first.** Before editing any function, read the functions directly around it (the ones above and below it in the file, plus any sibling functions it calls or is called by). Understand how they are written before you write anything.
- **Mimic the local style.** Match the coding style of that proximity: naming conventions, indentation and brace placement, quoting, comment style and density, error-handling and logging patterns, how values are validated, how queries or API calls are structured, and how similar cases are already handled. If nearby code and the wider file disagree, follow the nearby code.
- **Reuse, don't reinvent.** If an adjacent function already solves part of the problem (helpers, constants, shared utilities), use it instead of adding a new pattern.
- **Keep the diff in character.** Your change should look like it was written by the same author as the surrounding code. Do not reformat, rename, or refactor neighboring lines that are outside the requested scope.
- **Scope deviation:** if the work turns out to need changes beyond the request (extra files, a different root cause, or a need for new capability), stop, describe the gap, and ask the user before proceeding. Do not expand scope silently. If the gap amounts to a new endpoint, action, field, workflow, or report, tell the user it belongs under new-dev.

## 3. New Function Guidelines (new functions)

When the fix or change needs a new function (for example a helper, a validation, or a query method), do not invent a structure. Follow the ideal code snippets in the reference table below:

- Pick the reference file for the layer the new function belongs to and follow it for structure, naming, validation, error handling, logging, and how queries or API calls are written.
- Reuse existing helpers, constants, and shared utilities before writing new ones.
- Place the function next to related functions in the file, and keep it small and focused on the requested change.
- A new function must not alter the contract of any existing function. Existing callers keep working unchanged unless the user explicitly asked otherwise.
- If no reference snippet covers the kind of function you need, ask the user instead of guessing a pattern.

# Code Sample References

| Layer                   | Reference file                    |
|-------------------------|-----------------------------------|
| Architecture            | `./resources/Architecture.md`     |
| Rules & Conventions     | `./Rules.md`                      |
| InDto                   | `./examples/InDtoSamples.md`      |
| Controller              | `./examples/ControllerSamples.md` |
| Versioned services (V1) | `./examples/ServicesV1Samples.md` |
| Core services           | `./examples/ServicesSamples.md`   |
| DAO                     | `./examples/DaoSamples.md`        |