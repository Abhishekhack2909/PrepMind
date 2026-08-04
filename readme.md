# PrepMind 🎯

> **AI-powered UPSC preparation companion** — speaks your doubts, grades your answers, maps your weaknesses, plans your schedule.

Live Demo → **[prepmind.vercel.app](https://prepmind.vercel.app)** · Backend → **[prepmind-2ua4.onrender.com](https://prepmind-2ua4.onrender.com)**

---

## Features

| Feature | What it does | AI Stack |
|---------|-------------|----------|
| **Answer Evaluator** | Photograph handwritten Mains answers → AI grades marks, structure, examples, impression + writes model answer | Gemini 1.5 Flash (Vision) |
| **Voice Tutor** | Speak any doubt → transcribed → RAG-grounded answer spoken back | Groq Whisper STT + Gemini RAG |
| **MCQ Engine** | Generate UPSC-style questions on any topic, timed quiz, instant explanations | Gemini text generation |
| **Study Planner** | 7-day personalized schedule built from your actual weak topics | Gemini + Supabase analytics |
| **Weakness Map** | Visual subject-wise accuracy chart from MCQ history, highlights critical topics | Supabase + analytics router |
| **Home Dashboard** | Today's plan card, quick-action tiles, performance overview | — |
| **Profile** | Exam countdown, badges earned from real stats, appearance toggle | Supabase |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PrepMind-App (Expo)                     │
│  React Native + TypeScript · Expo Router · PWA installable  │
│                                                             │
│  api.ts ──► authHeaders() adds Supabase JWT to every call   │
│  ServerWakeupBanner — detects Render cold-starts (> 3s)     │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS + Bearer JWT
┌─────────────────────▼───────────────────────────────────────┐
│                  PrepMind-Backend (FastAPI)                  │
│                                                             │
│  services/auth.py    ─ Supabase JWT verification (RS256)    │
│  services/rag_service.py ─ pgvector cosine similarity       │
│  services/embeddings.py  ─ Gemini embedding-001 (768 dim)   │
│  services/llm_service.py ─ Gemini 1.5 Flash text/vision     │
│                                                             │
│  routers/evaluate.py  ─ image → marks + feedback            │
│  routers/mcq.py       ─ MCQ generation + grading            │
│  routers/voice.py     ─ STT + RAG answer                    │
│  routers/planner.py   ─ 7-day study plan                    │
│  routers/analytics.py ─ weakness map + summary              │
│  routers/knowledge.py ─ RAG Q&A + ingestion stats           │
└──────────┬──────────────────────────┬───────────────────────┘
           │                          │
  ┌────────▼────────┐      ┌──────────▼──────────┐
  │    Supabase     │      │     Gemini API       │
  │                 │      │                      │
  │  PostgreSQL     │      │  gemini-1.5-flash    │
  │  + pgvector     │      │  gemini-embedding-001│
  │  Auth (JWT)     │      │  whisper (via Groq)  │
  │  RLS policies   │      └──────────────────────┘
  │  knowledge_chunks│
  │  evaluations    │
  │  mcq_sessions   │
  │  study_plans    │
  │  users          │
  └─────────────────┘
```

---

## Tech Stack

### Frontend — `PrepMind-App/`
- **Expo SDK 56** (React Native) — runs on iOS, Android, and Web (PWA)
- **Expo Router** — file-based navigation with tab layout
- **TypeScript** throughout
- **Supabase JS** — anonymous auth, real-time session
- **PWA** — installable on any device via browser, no app store needed
- `services/api.ts` — centralized API client with JWT injection + cold-start detection

### Backend — `PrepMind-Backend/`
- **FastAPI** — async Python REST API
- **Gemini 1.5 Flash** — MCQ generation, answer evaluation (vision), study planning, voice answers
- **Gemini embedding-001** — 768-dim text embeddings for RAG (no native deps, no torch)
- **Groq Whisper** — ultra-fast audio transcription
- **Supabase pgvector** — vector similarity search with HNSW index (replaces ChromaDB)
- **Supabase PostgreSQL** — all user data with Row Level Security
- **JWT auth** — backend verifies Supabase tokens (RS256), derives `user_id` from token

### Infrastructure
- **Backend**: Render (free tier, auto-deploy from GitHub)
- **Frontend**: Vercel (auto-deploy from GitHub, PWA headers)
- **Database**: Supabase (PostgreSQL + pgvector + Auth)

---

## RAG Pipeline

```
INDEXING (one-time):
  UPSC content (6000+ words)
    → chunk_text() [400-word chunks, 50-word overlap]
    → Gemini embedding-001 [768-dim vectors]
    → Supabase knowledge_chunks table (pgvector HNSW index)

RETRIEVAL (per query):
  User question
    → embed_query() [Gemini]
    → match_knowledge() RPC [cosine similarity, threshold 0.35]
    → top-4 chunks returned

GENERATION:
  chunks + question → Gemini 1.5 Flash → grounded answer
```

> **Why pgvector instead of ChromaDB?** ChromaDB's Rust core segfaults on some Windows hosts and its `sentence-transformers` dependency pulls in ~200MB of torch which OOMs small cloud instances. Supabase pgvector + Gemini embeddings has zero native Python deps and runs identically on a laptop and a 512MB Render server.

---

## Deployment

### Backend (Render)
```bash
# Auto-deploys from GitHub. Required env vars on Render:
GEMINI_API_KEY=...
GROQ_API_KEY=...
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_KEY=...
ALLOWED_ORIGINS=https://your-app.vercel.app
RAG_ENABLED=true
```

### Frontend (Vercel)
```bash
# Root Directory: PrepMind-App
# Build Command + Output: auto (from vercel.json)
# Required env vars:
EXPO_PUBLIC_API_BASE_URL=https://your-backend.onrender.com
EXPO_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

### Database Setup (Supabase SQL Editor)
```sql
-- 1. Run PrepMind-Backend/supabase_schema.sql   ← all tables + RLS
-- 2. Run PrepMind-Backend/supabase_rag.sql      ← pgvector + HNSW index + match_knowledge()
-- 3. python seed_knowledge.py                   ← embed and insert UPSC content
```

---

## Local Development

### Backend
```bash
cd PrepMind-Backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env            # fill in your keys

# Seed knowledge base (run once after Supabase setup)
python seed_knowledge.py
python seed_knowledge.py --stats   # verify chunks
python seed_knowledge.py --test "What is Article 21?"  # test retrieval

# Start server (no --reload, it breaks outbound HTTP calls)
uvicorn main:app --port 8000
```

### Frontend
```bash
cd PrepMind-App
npm install                     # uses legacy-peer-deps (.npmrc)
cp .env.example .env

npx expo start                  # Expo Go on device
npx expo start --web            # Browser
```

### PWA Build
```bash
cd PrepMind-App
npx expo export --platform web
node scripts/build-pwa.mjs      # injects manifest, service worker, iOS tags
# Output in dist/ — deploy to Vercel or any static host
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | — | Landing page (confirms server is alive) |
| GET | `/health` | — | Health + RAG status |
| POST | `/api/evaluate` | JWT | Grade handwritten answer (base64 image) |
| GET | `/api/evaluations` | JWT | List past evaluations |
| GET | `/api/evaluations/quota` | JWT | Monthly quota (used/limit/remaining) |
| POST | `/api/mcq/generate` | JWT | Generate UPSC MCQ questions |
| POST | `/api/mcq/submit` | JWT | Grade + save MCQ session |
| POST | `/api/voice/chat` | JWT | Conversational voice tutor (history-aware) |
| POST | `/api/voice/ask` | JWT | Upload audio → STT + RAG answer |
| POST | `/api/ask` | JWT | Text Q&A from knowledge base |
| GET | `/api/kb/stats` | — | Knowledge base chunk count |
| GET | `/api/analytics/weakness` | JWT | Topic-wise accuracy map |
| GET | `/api/analytics/summary` | JWT | Overall MCQ + evaluation stats |
| POST | `/api/planner/generate` | JWT | Generate 7-day study plan |
| GET | `/api/planner/latest` | JWT | Fetch saved study plan |

---

## Project Structure

```
PrepMind/
├── PrepMind-App/                 # Expo React Native frontend
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── onboarding.tsx    # First-run onboarding + anonymous sign-in
│   │   ├── (tabs)/
│   │   │   ├── index.tsx         # Home dashboard
│   │   │   ├── evaluate.tsx      # Mains answer evaluator
│   │   │   ├── voice.tsx         # Voice tutor
│   │   │   ├── mcq.tsx           # MCQ quiz engine
│   │   │   ├── planner.tsx       # Study planner
│   │   │   ├── weakness.tsx      # Weakness analytics
│   │   │   └── profile.tsx       # Profile + settings
│   │   └── _layout.tsx           # Root layout, theme, auth guard, cold-start banner
│   ├── components/
│   │   └── ServerWakeupBanner.tsx  # Auto-shown during Render cold-start
│   ├── hooks/useAuth.ts          # Supabase session hook
│   ├── services/api.ts           # Typed API client (JWT + cold-start detection)
│   ├── constants/theme.ts        # Design tokens, dark/light mode
│   ├── lib/supabase.ts           # Supabase client init
│   ├── scripts/build-pwa.mjs     # PWA injection script
│   └── vercel.json               # Vercel config (rewrite rules, SW headers)
│
├── PrepMind-Backend/             # FastAPI backend
│   ├── main.py                   # App entry, CORS, router mounts
│   ├── routers/
│   │   ├── evaluate.py           # Gemini Vision evaluation + quota
│   │   ├── mcq.py                # MCQ generation + grading
│   │   ├── voice.py              # Whisper STT + voice chat
│   │   ├── voice_agent.py        # Conversational agent with history
│   │   ├── knowledge.py          # RAG Q&A + stats
│   │   ├── analytics.py          # Weakness map + summary
│   │   └── planner.py            # Study plan generation + storage
│   ├── services/
│   │   ├── auth.py               # Supabase JWT verification dependency
│   │   ├── rag_service.py        # pgvector retrieval + ingestion
│   │   ├── embeddings.py         # Gemini embedding-001 (768 dim)
│   │   ├── llm_service.py        # Gemini text + vision API wrapper
│   │   └── gemini_service.py     # Gemini Vision for evaluate router
│   ├── knowledge_base/
│   │   └── upsc_content.txt      # UPSC notes (6000+ words, 18 RAG chunks)
│   ├── supabase_schema.sql       # All table definitions + RLS policies
│   ├── supabase_rag.sql          # pgvector extension + HNSW index + RPC
│   ├── seed_knowledge.py         # CLI to embed and insert knowledge base
│   └── requirements.txt
│
└── .gitignore
```

---

## Security Notes

- **JWTs verified server-side** — backend calls `supabase.auth.get_user(token)` on every protected route. `user_id` is derived from the verified token, not trusted from the request body.
- **RLS everywhere** — every Supabase table has Row Level Security enabled. Users can only read/write their own rows.
- **Service key server-only** — `SUPABASE_SERVICE_KEY` is only on the backend (bypasses RLS for RAG writes). Never in the frontend.
- **Anon key is safe to ship** — the `SUPABASE_ANON_KEY` is designed to be public and is protected by RLS policies.

---

## Acknowledgements

Built with:
- [Google Gemini API](https://ai.google.dev) — Gemini 1.5 Flash + embedding-001
- [Groq](https://groq.com) — Whisper large-v3-turbo for STT
- [Supabase](https://supabase.com) — Postgres + pgvector + Auth
- [Expo](https://expo.dev) — cross-platform React Native
- [FastAPI](https://fastapi.tiangolo.com) — Python backend
- [Render](https://render.com) — backend hosting
- [Vercel](https://vercel.com) — frontend hosting
