# Multi-Account Desktop Skeleton (Electron + TS + Node)

## Stack
- Desktop UI: React + TypeScript
- Desktop Runtime: Electron (`WebContentsView`)
- Local Gateway: Node.js + Express + TypeScript
- Storage: SQLite (`better-sqlite3`)

## Structure
- `apps/desktop`: UI shell
- `services/gateway`: local API and session/data layer skeleton

## Run (desktop mode)
1. `npm install`
2. `npm run dev:electron`

Gateway runs at `http://localhost:8787`.

## API (MVP)
- `GET /health`
- `GET /api/accounts`
- `POST /api/accounts` with `{ "platform": "telegram|zalo|teams", "displayName": "..." }`
