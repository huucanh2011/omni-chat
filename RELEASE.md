# OmniChat Release Checklist

## 1) Pre-flight
- Ensure code is on `main` and CI is green.
- Confirm version in [`apps/desktop/package.json`](/Users/canhnguyen/Documents/Codex/2026-04-30/t-i-mu-n-t-o/apps/desktop/package.json).
- Update changelog/release notes.

## 2) Local Validation
```bash
pnpm install
pnpm typecheck
pnpm build
pnpm -C apps/desktop lint
```

## 3) Build Test Artifacts (local)
```bash
pnpm dist:mac
pnpm dist:win
```
Output folder:
- `apps/desktop/release/`

## 4) GitHub Release Publish (for auto-update)
Required env vars:
- `GH_TOKEN` (repo scope)
- `GH_OWNER`
- `GH_REPO`

```bash
export GH_TOKEN=xxxxx
export GH_OWNER=<your-user-or-org>
export GH_REPO=<your-repo>

pnpm -C apps/desktop publish:mac
pnpm -C apps/desktop publish:win
```

## 5) Verify Auto-Update
- Install previous app version on test machine.
- Launch app and wait auto-check (or trigger check in app settings if exposed).
- Confirm update is downloaded and applied after restart.

## 6) Post-Release Smoke Test
- Multi-account switch works (Telegram/Zalo/Teams).
- Unread red-dot works.
- Search/filter account works.
- Launch on startup setting persists.
- App starts single-instance only.

## 7) Rollback (if needed)
- Unpublish/bump GitHub release as needed.
- Ship hotfix patch version (`x.y.z+1`) and re-publish.

## Versioning Note
Recommended:
- Patch: bug fix (`0.1.1`)
- Minor: feature (`0.2.0`)
- Major: breaking change (`1.0.0`)
