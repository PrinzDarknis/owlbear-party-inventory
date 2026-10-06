# Known Issues and Tech Debt

Remove an entry when it is fixed. Severity: **high** (data loss or broken sync), **medium** (bug or leak), **low** (cleanup).

| # | Severity | Area | Issue | Location | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| 1 | low | dependencies | `npm audit`: `braces` (high) via the dev-only deploy tool `gh-pages`, `uuid` (moderate) inside `@owlbear-rodeo/sdk`. Neither is reachable from plugin code. | `package.json` | Re-check before each release; update `gh-pages` / SDK when fixed versions exist. |
| 2 | medium | design (planned) | Long texts in Owlbear mode live in one GM browser. A second GM browser or device sees different texts. | Owlbear storage (phase 5) | Export/import as workaround; a later sync backend. |
