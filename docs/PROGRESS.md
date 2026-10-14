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

## Phase 1: Train Backend
- Status: Complete
- Verification:
  - Agent Runtime & Prompts: Jinja2 prompt rendering for `observer.md.j2`, `scammer.md.j2`, `coach.md.j2`; Google GenAI/ADK live streaming and structured output with fallback offline simulator.
  - Turn Pipeline: PII scrubbing -> Observer referee assessment -> Server rules override -> Scammer streaming -> Trace hook.
  - Safety & Filters: Distress detection (English & Hindi) triggering Sensei safety break; Output filter ensuring only fictional entities (`+91 00000 00000`, `*.example`, `*@fakebank`).
  - Scoring & Progression Engine: 100% unit-tested implementation of `session_score` (outcome, flags, earliness verify, leak penalty, coach adj), resilience EMA, belt qualifications (including Black belt gate), streak calendar calculation, weak tactics EMA, auto difficulty recommendation.
  - Endpoints: `POST /v1/train/sessions` (201), `POST /v1/train/sessions/{sid}/messages` (SSE streaming & `?stream=false`), `POST /v1/train/sessions/{sid}/end` (scoring & debrief), `GET /v1/train/sessions/{sid}`, `GET /v1/train/sessions`, `GET /v1/scenarios`, `GET /v1/resources`, `GET|PATCH /v1/me`.
  - Scripted integration tests: Verified `user_won` victory and `user_fell` credential leak paths; idempotency on `clientMsgId` confirmed.
  - 42 pytest tests green, Ruff and Mypy 100% clean.
