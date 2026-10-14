# Manual Smoke Test Records

## Phase 0: Bootstrap Smoke Test
- Local API health check: `GET /healthz` returns `{"ok": true}`
- Knowledge Base: `knowledge.sqlite` built and FTS search verified
- Local Web: Next.js dev server starts, displays Anek typography, light/dark theme switch, language toggle
- Tests: `make test` runs pytest and vitest
