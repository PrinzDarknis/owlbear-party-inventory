# New Plugin: Setup Checklist

From an empty folder to a running Owlbear plugin in ~15 minutes. Work through it top to bottom and tick the boxes.
Commands are for **Git Bash** (comes with Git for Windows) or any POSIX shell.

**Prerequisites:** Node.js ≥ 20, Git, an Owlbear Rodeo account with a test room, a GitHub account (for hosting).

---

## 1. Create the folder and copy the harness
- [ ] Create and enter an empty folder, then initialize git:
  ```bash
  mkdir my-plugin && cd my-plugin
  git init
  ```
- [ ] Copy `harness/` and `CLAUDE.md` from an existing plugin (adjust `SRC`):
  ```bash
  SRC="/c/Projects/owlbear/<existing-plugin>"
  cp -r "$SRC/harness" "$SRC/CLAUDE.md" .
  ```
  Don't copy `.claude/`, `node_modules/`, `dist/`, `src/` or `.Temp-*` folders.

## 2. Reset the project-specific knowledge
- [ ] Replace `harness/project/` (it describes the old plugin) with empty skeletons:
  ```bash
  rm -r harness/project
  mkdir harness/project
  cp harness/templates/project/*.md harness/project/
  mkdir harness/project/current-feature && touch harness/project/current-feature/.gitkeep
  ```

## 3. Copy the base files from the templates
- [ ] Run as one block:
  ```bash
  T=harness/templates
  cp $T/config/{package.json,tsconfig.json,tsconfig.app.json,tsconfig.node.json,eslint.config.js,vite.config.ts,version-update.mjs} .
  cp $T/config/gitignore .gitignore
  mkdir -p public html src/components/app
  cp $T/config/{manifest.json,manifest.dev.json,icon.svg} public/
  cp $T/entries/entry.html html/popover.html
  cp $T/entries/background.html html/
  cp $T/entries/{main-popover.tsx,main-background.ts} src/
  cp $T/entries/app.component.tsx src/components/app/
  cp $T/config/{index.css,vite-env.d.ts} src/
  cp -r $T/obr $T/hooks $T/model $T/utils src/
  ```

## 4. Replace the placeholders
| File | Replace |
| --- | --- |
| `package.json` | `"name": "my-plugin"` → your slug (lowercase kebab-case) |
| `src/obr/constants.ts` | `PLUGIN_ID = "com.example.my-plugin"` → your reverse-DNS id (**never change it after release**). `PROD_BASE_PATH = "/my-plugin"` → `/<github-repo-name>` |
| `public/manifest.json` | `name` (≤ 45 chars), `description` (≤ 128), `author` (public handle, **no email**), every `/my-plugin/` → `/<github-repo-name>/` |
| `public/manifest.dev.json` | `name`, `author` (paths stay without a prefix) |
| `html/*.html` | `<title>` |
| `public/icon.svg` | your icon (optional, works as is) |

- [ ] All placeholders replaced. Quick check: `grep -rn "my-plugin\|com.example\|<public display name>" --exclude-dir=harness --exclude-dir=node_modules .`

## 5. Install and verify
- [ ] Install the dependencies:
  ```bash
  npm install
  ```
- [ ] Set up Claude Code (creates `.claude/skills` and `.claude/settings.json`):
  ```bash
  node harness/scripts/sync-claude.mjs
  ```
- [ ] Both must pass without errors:
  ```bash
  npm run lint
  npm run build
  ```

## 6. First run in Owlbear
- [ ] Start the dev server: `npm run dev`
- [ ] Owlbear → your test room → profile → **Extensions** → **Add custom extension** → `http://localhost:5173/manifest.dev.json`
- [ ] The action icon appears in the top left. Clicking it opens the popover with "GM view" / "Player view". There are no errors in the browser console.

## 7. Let Claude fill in the project knowledge
- [ ] Start Claude Code in the folder and run `/harness-onboard`. It fills `harness/project/` (overview, data model …) and asks you what it can't derive from the code.
- [ ] Describe your plugin idea to Claude. It uses `/new-obr-feature`, `/new-component` and the knowledge base `harness/owlbear/`.

## 8. GitHub repo and hosting (can wait until the first release)
- [ ] Create an empty GitHub repository with the **same name** as `PROD_BASE_PATH`, then:
  ```bash
  git add . && git commit -m "chore: initial plugin setup from harness"
  git branch -M main
  git remote add origin https://github.com/<user>/<repo>.git
  git push -u origin main
  ```
- [ ] First deploy: `npm run deploy` (bumps the version, builds, pushes `dist/` to the `gh-pages` branch).
- [ ] GitHub → repo → Settings → Pages → Source: branch **`gh-pages`**, folder `/`.
- [ ] Production manifest: `https://<user>.github.io/<repo>/manifest.json`. Add it in Owlbear and test it.
- [ ] Planning a store listing with the verified badge? That needs a **custom domain** for the manifest. Decide before you share the URL (`harness/owlbear/tutorials/sharing.md`).

## 9. Clean up the example code (when your first real feature exists)
The templates contain a working example. Remove it once it's no longer needed as a reference:
- [ ] `src/obr/obr-example.service.ts`, `src/model/example/`, `src/hooks/use-room-records.hook.ts` (and its export in `src/hooks/index.ts`)
- [ ] `example` and `menu` entries in `src/obr/index.ts`, and the calls in `src/main-background.ts`
- [ ] the example constants (`METADATA_EXAMPLE`, `BROADCAST_EXAMPLE`, `CONTEXT_MENU_EXAMPLE`, …) in `src/obr/constants.ts`
- [ ] Finally: `npm run lint && npm run build`

---
Done. From here on, all rules are in `harness/core/`, and SDK knowledge is in `harness/owlbear/`.
