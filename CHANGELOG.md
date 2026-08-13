# Changelog

All notable changes to PrepMind are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- `CONTRIBUTING.md` — local setup guide, code conventions, and PR guidelines
- `SECURITY.md` — vulnerability disclosure policy and auth architecture docs
- `authedPost` / `authedDelete` helpers in `api.ts` to eliminate repeated header boilerplate
- `/api/version` debug endpoint on the backend (returns version, Python runtime, ENV)
- `--list` flag to `seed_knowledge.py` — shows all seeded sources and chunk counts
- `ServerWakeupBanner` — animated toast shown during Render free-tier cold starts (~50s)

### Changed
- Evaluation quota bumped from **3 → 10** per month (both server and client synced)
- `trackedFetch` now applies a **90-second `AbortController` hard timeout** to prevent infinite hangs
- `ServerWakeupBanner` upgraded: spring entrance animation, pulsing amber dot, slide-out exit
- `Procfile` tuned: explicit `--workers 1` + `--timeout-keep-alive 75s` for Render free tier
- Analytics summary endpoint now returns `Cache-Control: private, max-age=60`
- Planner `hours_per_day` clamped to 1–12 range; clamped value now passed to prompt

### Fixed
- `import base64` moved from mid-file to top-level imports in `voice.py`
- Stale ChromaDB / Groq / Phase-number references updated across `llm_service.py`, `knowledge.py`, `mcq.py`, `planner.py`, `voice.py`
- Wrong model name (`llama3-8b-8192`) corrected to `llama-3.1-8b-instant` in `llm_service.py` return values
- Client-side `FREE_MONTHLY_LIMIT` in `evaluate.tsx` synced to match server (was 3, now 10)
- `weak_topics` variable initialization order fixed in `planner.py` (used before assignment bug)
- Junk dev comments removed from `storage.ts`, `index.tsx`, `weakness.tsx`, `profile.tsx`, `analytics.tsx`, `voice.tsx`, `voice.py`, `analytics.py`, `evaluate.py`, `main.py`

### Infrastructure
- UPSC knowledge base expanded to 6,000+ words (18 chunks) covering Polity, History, Geography, Economy, Environment, and S&T
- RAG migrated from ChromaDB + sentence-transformers to **Supabase pgvector + Gemini embeddings** (zero native deps, runs on 512 MB)
- Backend deployed on Render; frontend PWA deployed on Vercel
- Added `.npmrc` with `legacy-peer-deps=true` to resolve React 19 peer dependency conflicts on Vercel

---

## [1.0.0] — 2026-07

### Added
- Answer evaluation via Gemini Vision (handwritten Mains answers → marks + grade)
- RAG-powered Q&A (`/api/ask`) using Supabase pgvector + Gemini embeddings
- UPSC MCQ generator with Groq + RAG context (`/api/mcq/generate`, `/api/mcq/submit`)
- Weakness Map: auto-tracks wrong MCQ topics and visualises gaps
- AI Study Planner: generates personalised 7-day schedule from weak topics
- Voice Doubt Solver: Groq Whisper STT + RAG answer → expo-speech TTS
- Real-time Deepgram Voice Agent (WebSocket, web only)
- Supabase JWT verification in backend (`services/auth.py`) — server never trusts client-supplied `user_id`
- Evaluation history stored in Supabase and surfaced in the Profile screen
- Dark / light / system theme with `themed()` helper and token-based design system
