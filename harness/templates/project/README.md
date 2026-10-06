# Project: <Plugin Name>

Project-specific knowledge for this plugin. **Everything here overrides nothing in `harness/core` unless `deviations.md` says so.**
When starting a new plugin, replace this folder with the skeletons from `harness/templates/project/` and run `/harness-onboard`.

| File | Content |
| --- | --- |
| [overview.md](overview.md) | Purpose, features, roles, scripts |
| [entries-and-deploy.md](entries-and-deploy.md) | Iframe contexts, manifest, hosting path, release specifics |
| [data-model.md](data-model.md) | Metadata keys, broadcast channels, storage keys, migrations, foreign adapters |
| [deviations.md](deviations.md) | Where this project intentionally differs from core |
| [known-issues.md](known-issues.md) | Bugs, tech debt, TODOs |
| [current-feature/](current-feature/) | Plan and status of the feature in progress; empty on the default branch (`harness/core/07-workflow.md` §Feature lifecycle) |
