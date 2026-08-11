# Contributing to PrepMind

Thanks for your interest in PrepMind! This document explains how to get the project running locally and the conventions we follow.

## Project Layout

```
PrepMind/
├── PrepMind-App/       # Expo React Native frontend (TypeScript)
└── PrepMind-Backend/   # FastAPI backend (Python)
```

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| Python | 3.11+ |
| Expo CLI | via `npx` |
| A Supabase project | free tier is fine |
| Gemini API key | [aistudio.google.com](https://aistudio.google.com) |
| Groq API key | [console.groq.com](https://console.groq.com) |

## Backend Setup

```bash
cd PrepMind-Backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

# Copy and fill in the env file
cp .env.example .env

# Set up the database (run once in Supabase SQL Editor)
# 1. supabase_schema.sql  → tables + RLS policies
# 2. supabase_rag.sql     → pgvector extension + HNSW index + match_knowledge() RPC

# Seed the knowledge base
python seed_knowledge.py          # ingest UPSC content
python seed_knowledge.py --stats  # verify chunk count
python seed_knowledge.py --list   # see all seeded sources

# Start the API server
uvicorn main:app --port 8000
# Docs: http://localhost:8000/docs
```

## Frontend Setup

```bash
cd PrepMind-App

npm install

cp .env.example .env
# Set EXPO_PUBLIC_API_BASE_URL to your backend URL

# Run on device/simulator
npx expo start

# Run in browser (PWA)
npx expo start --web
```

## Code Conventions

### Backend (Python)
- Use type hints on all function signatures.
- All routers degrade gracefully — never let a DB error 500 an analytics endpoint.
- Auth: use `services/auth.py` (`resolve_user_id` / `optional_user`) — never trust a `user_id` from the request body.
- RAG: always fall back to `generate_simple_answer()` if `retrieve_context()` returns `[]`.

### Frontend (TypeScript)
- All backend calls go through `services/api.ts` — use `authedGet` / `authedPost` / `authedDelete`.
- Theme tokens live in `constants/theme.ts` — never hardcode hex colors or spacing values in components.
- Styles use `themed((Colors) => StyleSheet.create({...}))` so dark/light mode flips automatically.

## Pull Request Guidelines

1. Keep PRs focused — one feature or fix per PR.
2. Test locally on both web (`expo start --web`) and a real device before opening a PR.
3. Run `python seed_knowledge.py --test "your question"` after any RAG changes to verify retrieval still works.
4. Update `.env.example` if you add a new environment variable.
