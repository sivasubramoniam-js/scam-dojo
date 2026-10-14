# Architecture & Implementation Decisions

Record of all architectural choices, API verifications, helpline data checks, and deviations.

## 2026-10-14 — Phase 0: Bootstrap Decisions & Verifications

### 1. Toolchain & Environment
- **Node.js**: v22.17.1 LTS.
- **Package Manager**: `pnpm` 12.11.2 (installed globally via npm to replace unconfigured Corepack shim).
- **Python**: Python 3.12.14 installed via `uv`. Virtual environment created with `uv venv --python 3.12`.
- **Backend Frameworks**: FastAPI + Uvicorn + Pydantic v2 + structlog + aiosqlite.
- **Frontend Frameworks**: Next.js 15 (App Router, static export `output: 'export'`, Tailwind CSS v4 `@theme`, motion, Lucide React).

### 2. Model IDs Verification
- Verified against Google AI Studio / Vertex AI specs:
  - `MODEL_LITE`: `gemini-2.5-flash-lite`
  - `MODEL_FAST`: `gemini-2.5-flash`
  - `MODEL_PRO`: `gemini-2.5-pro`
  - `MODEL_FALLBACK`: `gemini-2.5-flash`
- Configured in `.env.example` and `config.py` with environment variable overrides.

### 3. Google ADK & Google GenAI Versions
- Verified against PyPI:
  - `google-adk`: 2.12.0
  - `google-genai`: 2.30.1
- Verified core primitives: `LlmAgent`, `SequentialAgent`, `InMemorySessionService`, `Runner`.
- Confirmed stateless architecture pattern: each turn pipeline seeds an in-memory session from persistent repo state.

### 4. Helplines & Verified Sources Verification
- Verified official Indian helplines:
  - `1930`: National Cyber Crime Helpline (MHA / I4C) for financial fraud — Verified active.
  - `https://cybercrime.gov.in`: National Cybercrime Reporting Portal — Verified official URL.
  - `14416`: Tele-MANAS National Mental Health Helpline (MoHFW) — Verified active 24/7.
  - `1947`: UIDAI Aadhaar helpline — Verified official number.
  - `https://myaadhaar.uidai.gov.in`: UIDAI Aadhaar portal — Verified official portal.
  - `14448`: Reserve Bank of India (RBI) Contact Centre / Integrated Ombudsman — Verified official number.
  - `112`: National Emergency number — Verified standard emergency number.
  - `https://sancharsaathi.gov.in`: Department of Telecommunications (DoT) citizen portal for fraud communication & device tracking — Verified official URL.
  - `https://cms.rbi.org.in`: RBI Complaint Management System — Verified official URL.
  - `https://www.npci.org.in`: National Payments Corporation of India (UPI redressal) — Verified official URL.
- All entries entered in `data/seed/resources.yaml` with `verified_on: "2026-10-14"` and exact `source_url`.
