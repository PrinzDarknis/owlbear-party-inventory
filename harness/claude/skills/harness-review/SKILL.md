---
name: harness-review
description: Review the current changes of an Owlbear plugin against the harness rules (architecture, SDK pitfalls, conventions, security/privacy) and the project's deviations. Use before committing or when the user asks for a harness/convention review.
argument-hint: [base-ref, default main]
---

# Harness review

Base: `$ARGUMENTS` (default `main`). Review `git diff <base>...HEAD` plus uncommitted changes (`git diff`, `git status`).

Read first: `harness/core/02-architecture.md`, `03-obr-sdk-guide.md`, `04-conventions.md`, `05-security.md`, and `harness/project/deviations.md` plus `data-model.md`. For each SDK API used in the diff, check the "Pitfalls and limits" section of its page in `harness/owlbear/` (index: `harness/owlbear/README.md`).

Check every changed file for:
1. **Architecture:** SDK imported only in `src/obr/` (or the facade named in deviations). Long-lived listeners and menus in the background. Correct data store choice.
2. **SDK pitfalls:** `obrReady`/`sceneReady` awaited; builders used only after ready and with an explicit `.layer()`; menus and tools registered in the background; one listener per channel per iframe; `updateItems` by ids touching only your own metadata key; hidden items (`visible: false`) not exposed to players; unsubscribe returned and called; no write loops (a guard exists for listeners that write); partial metadata writes; size budget considered; Dates parsed after reading; debounced saves awaited correctly.
3. **Security/privacy:** the checklist in `05-security.md` (validation of metadata/broadcast/imports, no `as` on untrusted data, no raw HTML, no secrets, no personal data in logs or fixtures, dependencies).
4. **Conventions:** file naming and suffixes, named exports and barrels, function components and hooks for new code, CSS naming and theme variables, English identifiers.
5. **Docs:** new keys/channels documented in `harness/project/data-model.md`; new debt in `known-issues.md`.

Output: findings grouped by severity (**blocker / should fix / nit**), each with `file:line`, the rule (doc + section) and a concrete fix. Say explicitly if nothing was found. Do not edit files unless the user asks.
