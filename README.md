# OmniChat

Ứng dụng desktop gộp nhiều account chat (Telegram, Zalo, Teams) trong một app.

## Tech stack
- Desktop UI: React + TypeScript
- Runtime: Electron (`WebContentsView`)
- Local Gateway: Node.js + Express + TypeScript
- Storage: SQLite (`better-sqlite3`)

## Monorepo structure
- `apps/desktop`: Electron app + frontend
- `services/gateway`: local API/data layer

## Yêu cầu
- Node.js 22+
- pnpm 10+

## Chạy local (dev)
```bash
pnpm install
pnpm dev:electron
```

## Build local
```bash
pnpm build
pnpm dist:mac
pnpm dist:win
```
Artifacts nằm trong:
- `apps/desktop/release/`

## Release qua GitHub Actions
Workflow: `.github/workflows/release.yml`
- Trigger khi push tag `v*` (ví dụ `v0.1.0`)
- Publish macOS + Windows artifacts lên GitHub Releases

## Auto-update
App dùng `electron-updater` + GitHub Releases.

## Lỗi thường gặp khi mở app từ Release

### macOS: app bị chặn / damaged (unsigned)
```bash
xattr -dr com.apple.quarantine /Applications/OmniChat.app
```
Sau đó mở lại app.

### Windows: SmartScreen chặn app
- Chọn `More info` -> `Run anyway`.
- Hoặc: Right click file `.exe` -> `Properties` -> tick `Unblock` -> `Apply`.

## API (gateway)
- `GET /health`
- `GET /api/accounts`
- `POST /api/accounts`
- `PATCH /api/accounts/:id`
- `DELETE /api/accounts/:id`
