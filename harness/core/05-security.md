# 05 – Security, Privacy and Compliance

The rules here are **security first**. They take precedence over feature requests. If a request conflicts with them, say so and propose a safe alternative.

## Threat model in short
- An Owlbear plugin runs as static JS in iframes on `owlbear.rodeo`. **Every room member is a potential writer.** Any client can change room, scene and item metadata and send broadcasts, whatever role it has.
- Imported files (JSON backups and similar) are untrusted.
- Other extensions share the same metadata space and can write unexpected data.

## Mandatory rules
1. **Validate all external input** before using it: metadata reads, broadcast `data`, imported files, data from adapters.
   - Use type guards or parsers in `src/model/**/<name>.parse.ts` and fall back to defaults.
   - Use **allowlists** for anything that becomes a URL, file name, CSS class or HTML (e.g. a sound id must be a known id).
   - Limit sizes (string lengths, array lengths, total JSON size) before writing to metadata.
2. **No raw HTML:** never use `dangerouslySetInnerHTML` with data from metadata, broadcasts or imports. React escaping is the default; keep it.
3. **No secrets** in the repo, the bundle, metadata or localStorage. There are none in a static plugin. If a backend is ever needed, it must not be called with secrets embedded in client code. If you find a credential, flag it as a security risk and do not echo it.
4. **Roles are not authorization.** GM checks only control the UI (see [03](03-obr-sdk-guide.md#roles-and-trust)). Design data so that a misbehaving client can cause at most visible, recoverable changes. Keep backups.
5. **Dev server CORS** is limited to `https://www.owlbear.rodeo` (see the `vite.config.ts` template). Never use `origin: "*"`.
6. **Dependencies:** minimal runtime deps, `npm audit` before every release, no packages from unknown sources, lockfile committed.
7. **External requests:** a plugin should not call third-party services by default. Any external fetch must be documented in `project/deviations.md`, use HTTPS and send no personal data.

## Privacy (GDPR principles)
- **Data minimization:** store only what the feature needs. Player names, colors and ids from `OBR.player` / `OBR.party` are personal data and must not be persisted unless required. Prefer connection or player ids over names, and do not log them in production.
- **Purpose limitation:** data stored for one feature is not reused for another without need.
- **Local data:** localStorage keys are namespaced, and there is a way to delete them (e.g. a "clear local data" action for backups). **Every storage access is wrapped in try/catch** with an in-memory fallback, because the extension must work in private windows or with cookies disabled (Owlbear verification guideline, `harness/owlbear/tutorials/sharing.md`).
- **Exports/backups** may contain player-entered content. Name that in the UI and do not upload exports anywhere automatically.
- Do not put real personal data into docs, mock data, tests or examples. Use neutral placeholders.

## Review checklist (used by `/harness-review`)
- [ ] Every new metadata/broadcast/import read is validated.
- [ ] No `as` cast on untrusted data without a guard.
- [ ] Payload sizes are bounded and room metadata growth is considered.
- [ ] Subscriptions are cleaned up and listeners don't cause write loops.
- [ ] No secrets, no personal data in logs, docs or fixtures.
- [ ] No new runtime dependency, or it is justified in `project/deviations.md`.
