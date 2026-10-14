# Scam Dojo — Progress Log

Tracking the implementation phases against acceptance criteria.

## Phase 0: Bootstrap
- Status: Complete
- Verification:
  - Monorepo tooling: uv, Python 3.12, pnpm v12, ruff, mypy, pytest, vitest, next lint.
  - Knowledge Base: `knowledge.sqlite` built from seed data and verified; FTS query acceptance test passed; 10 active helpline resources verified.
  - Backend: FastAPI skeleton with `/healthz`, `/readyz`, structured logging, request ID middleware, `SqliteRepo`, PII scrubber.
  - Frontend: Next.js 15 App Router static export, Tailwind CSS v4 design tokens (light sage #E7ECE2 / dark indigo #0D1330), TopBar, BottomTabs, LeftRail, ThemeToggle, LanguageToggle, i18n key parity test.
  - All tests, lint, and typecheck pass green.
