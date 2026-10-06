# Tutorial: Sharing your Extension (hosting, store, verification)

> Sources: docs "Tutorial - Sharing your Extension" → "Showcase your Extension", "Extension Verification" (provided by the user 2026-10-06); the "Hosting" page was not copied (user decision: GitHub Pages is used) · Updated: 2026-10-06

## Purpose
How to make an extension available to others: hosting, listing in the **Extension Store** (extensions.owlbear.rodeo), and the optional **verified** badge.
An extension can be used **without** the store: anyone can add it by manifest URL.

## 1. Hosting
- Any static hosting that serves `manifest.json` and the built files over HTTPS works.
- Harness default: **GitHub Pages** via `gh-pages` (`harness/core/06-build-release.md`). The production manifest paths include the repository base path.
- **For verification the manifest must be on a custom domain controlled by the developer** (see below). GitHub Pages supports custom domains. Plan this before publishing, because changing the domain later changes the manifest URL for all users.

## 2. Store listing (Showcase)
Prerequisites: hosted, fully featured and functional.
1. **Store page markdown file**, publicly reachable (e.g. `docs/store.md` in the repo). It starts with YAML front matter:
   ```yaml
   ---
   title: <extension name>
   description: <short description>
   author: <name or alias>          # public handle, no private contact data
   image: <absolute URL of a hero image, hosted externally>
   icon: <absolute URL of the icon, hosted externally>
   tags:
     - <tag from the official tags.json>   # "built-by-owlbear" is reserved
   manifest: <URL of manifest.json>
   learn-more: <website or support contact>
   ---
   ```
   After the front matter: description, screenshots, usage guide and support contact. All of it is shown on the store page. Images must be valid and appropriate, and tags correct. Reference example: the official dice extension's `docs/store.md`.
2. **Fork** `github.com/owlbear-rodeo/extensions`, and add an entry to the end of `extensions.json`: key = unique **lowercase kebab-case** name, value = URL of the markdown file.
3. **Pull request** against `main` with **exactly one commit**. The extension is listed once the PR is merged.

## 3. Verification (green tick)
Guidelines that must be met:
- accessible colors and font sizes; legible in Owlbear's **light and dark** theme
- **fully functional on mobile** (iPhone, Android, iPad) and in **Chrome, Firefox and Safari**
- requires **no other extensions**
- works in a **private window / with cookies disabled**
- **proper use of the APIs** (e.g. scene metadata only for data that shares the scene's lifecycle)
- works with **and without an open scene**
- user support for questions, issues and requests; **no known bugs**
- manifest hosted on a **custom domain** controlled by the developer

Process: after the store PR is accepted, comment `/verify <extension-key>` on the PR. A thread on the Owlbear Rodeo Discord tracks the checks, and the Owlbear team adds the badge once the community confirms them.

## Implications for harness-built plugins
- "Works without cookies" means storage access can fail: wrap every `localStorage` access in try/catch with a fallback, and never make core features depend on it.
- "Requires no other extensions": integrations with other extensions (adapters) must be optional and switchable.
- Test with no scene open, on mobile widths (popover ~400 px), and in both themes. Add these to the live-test checklist before a store submission.
- Store markdown and images contain only public data (no personal contact details beyond a chosen support channel).

## Claude workflow
- On request: draft `docs/store.md` (front matter + content) from `harness/project/overview.md`, and a pre-submission checklist from the verification guidelines.
- Claude never forks, pushes or opens the store PR without explicit confirmation. These are outward-facing actions; the user may prefer to do them.
- Live test (by the user): the verification guideline checklist on real devices and browsers.
