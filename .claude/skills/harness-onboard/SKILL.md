---
name: harness-onboard
description: Analyze the current Owlbear plugin repository and (re)fill harness/project/ (overview, entries, data model, deviations, known issues) from the skeletons in harness/templates/project/. Use when the harness was copied into a new plugin or when harness/project/ is outdated.
disable-model-invocation: true
---

# Harness onboarding

Goal: `harness/project/` describes **this** plugin completely. Nothing project-specific goes into `harness/core`, `harness/templates` or `harness/claude`.

1. If `harness/project/` is missing or empty, copy the skeletons from `harness/templates/project/`. If it has content, update it in place and keep entries that are still valid.
2. Analyze the repository (read-only):
   - `package.json` (scripts, deps), `vite.config.ts` (entries), `public/manifest*.json`, `html/`, `src/main-*`
   - all SDK usage (`@owlbear-rodeo/sdk` imports): metadata keys, broadcast channels, context menus/tools, localStorage keys, foreign extension keys
   - the folder structure and code style compared with `harness/core/04-conventions.md`
   - risks against `harness/core/03-obr-sdk-guide.md` and `05-security.md` (unvalidated reads, missing unsubscribe, write loops, size limits, Date round-trip)
3. Fill in:
   - `overview.md`: purpose, features table, roles, scripts
   - `entries-and-deploy.md`: contexts, hosting path, manifest URLs, release specifics
   - `data-model.md`: every key and channel, **referenced by constant name**
   - `deviations.md`: every place where the project intentionally or historically differs from core, with guidance for new code
   - `known-issues.md`: bugs and debt with severity, location and suggested fix
4. Privacy: no emails, real names or other personal data in these files. Refer to author or namespace values by constant or file instead of copying them.
5. Check that the root `CLAUDE.md` imports `harness/project/README.md`.
6. Report a short summary and the open questions you could not answer from the code.
