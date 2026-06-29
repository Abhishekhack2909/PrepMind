# PrepMind 🎯

**AI-powered UPSC preparation app** — built with Expo (React Native) + FastAPI + Gemini + Groq + ChromaDB + Supabase.

---

## What PrepMind Does

| Feature -Description -AI Used |
| ----------------------------- | --------------------------------------------------------------------------- | --------------------- |
| **Answer Evaluator**          | Upload handwritten answers → AI grades them (marks, feedback, model answer) | Gemini Vision         |
| **Voice Doubt Solver**        | Speak a question → AI answers from your knowledge base                      | Groq Whisper + llama3 |
| **Knowledge Base**            | RAG system — upload NCERT/PYQ content, get grounded answers                 | ChromaDB + Groq       |
| **MCQ Engine**                | AI generates UPSC-style questions on any topic with explanations            | Groq llama3           |
| **Weakness Map**              | Visual analytics of your weak topics based on MCQ history                   | Supabase Analytics    |
| **Study Planner**             | AI creates personalized 7-day study schedule from your weak areas           | Groq llama3           |
| **Home Dashboard**            | Stats overview, today's schedule, quick actions                             | —                     |
| **Profile**                   | Performance history, badges, sign out                                       | —                     |

---

## Tech-Stack

### Frontend (PrepMind-App)

- **Expo** (React Native) with Expo Router file-based navigation
- **TypeScript** throughout
- **Supabase** JS client for auth + data
- Anonymous auth by default (no login required)

### Backend (PrepMind-Backend)

- **FastAPI** — Python REST API
- **Gemini Vision** (`gemini-1.5-flash`) — handwriting recognition & evaluation
- **Groq** (`llama-3.1-8b-instant` + `whisper-large-v3-turbo`) — fast text generation + STT
- **ChromaDB** — vector database for RAG (local persistent)
- **SentenceTransformers** (`all-MiniLM-L6-v2`) — text embeddings
- **Supabase** — PostgreSQL +  Row Level Security

---

## API Routes

| Method | Endpoint                  | Description                                |
| ------ | ------------------------- | ------------------------------------------ |
| GET    | `/health`                 | Health check                               |
| POST   | `/api/evaluate`           | Evaluate handwritten answer (base64 image) |
| POST   | `/api/ask`                | RAG Q&A from knowledge base                |
| POST   | `/api/ingest`             | Add document to knowledge base             |
| GET    | `/api/kb/stats`           | Knowledge base stats                       |
| POST   | `/api/voice/transcribe`   | Transcribe audio with Whisper              |
| POST   | `/api/voice/ask`          | Transcribe + RAG answer in one call        |
| POST   | `/api/mcq/generate`       | Generate UPSC MCQ questions                |
| POST   | `/api/mcq/submit`         | Grade answers + store results              |
| GET    | `/api/analytics/weakness` | Topic weakness map                         |
| GET    | `/api/analytics/summary`  | Performance summary                        |
| POST   | `/api/planner/generate`   | Generate 7-day study plan                  |
| GET    | `/api/planner/latest`     | Get saved plan                             |

---

## Setup

### Backend

```bash
cd PrepMind-Backend
pip install -r requirements.txt
cp .env.example .env


# Seed knowledge base (run once)
python seed_knowledge.py

# Start server
uvicorn main:app --reload --port 8000
```

**Required API Keys** (all free tiers available):

- `GEMINI_API_KEY` → [aistudio.google.com](https://aistudio.google.com)
- `GROQ_API_KEY` → [console.groq.com](https://console.groq.com)
- `SUPABASE_URL` + keys → [supabase.com](https://supabase.com)

### Supabase Tables (run in SQL editor)

```sql
-- Evaluations
CREATE TABLE evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT, total_marks INTEGER, grade TEXT,
  content_score INTEGER, structure_score INTEGER,
  strong_points TEXT[], improvement_areas TEXT[], model_answer_hint TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own" ON evaluations FOR ALL USING (auth.uid() = user_id);

-- MCQ Sessions
CREATE TABLE mcq_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT, total_questions INTEGER, correct_answers INTEGER,
  percentage INTEGER, wrong_topics TEXT[], results JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE mcq_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own" ON mcq_sessions FOR ALL USING (auth.uid() = user_id);

-- Study Plans
CREATE TABLE study_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan JSONB, weak_topics TEXT[], hours_per_day INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own" ON study_plans FOR ALL USING (auth.uid() = user_id);
```

### Frontend

```bash
cd PrepMind-App
npm install
cp .env.example .env
# Set EXPO_PUBLIC_API_BASE_URL to your backend IP

npx expo start
```

---

## Project Structure

```
PrepMind/
├── PrepMind-App/          # Expo React Native frontend
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx      # Home Dashboard
│   │   │   ├── evaluate.tsx   # Answer Evaluator
│   │   │   ├── voice.tsx      # Voice Doubt Solver
│   │   │   ├── mcq.tsx        # MCQ Engine
│   │   │   ├── planner.tsx    # Study Planner
│   │   │   ├── weakness.tsx   # Weakness Map
│   │   │   └── profile.tsx    # Profile
│   │   └── _layout.tsx        # Root layout + auth guard
│   ├── hooks/useAuth.ts       # Supabase anonymous auth
│   ├── services/api.ts        # Backend API client
│   └── constants/theme.ts     # Design tokens
│
├── PrepMind-Backend/      # FastAPI backend
│   ├── main.py                # App entry + all routers
│   ├── routers/
│   │   ├── evaluate.py        # Gemini Vision evaluation
│   │   ├── knowledge.py       # RAG Q&A + ingestion
│   │   ├── voice.py           # Whisper STT
│   │   ├── mcq.py             # MCQ generation + grading
│   │   ├── analytics.py       # Weakness map + summary
│   │   └── planner.py         # AI study planner
│   ├── services/
│   │   ├── gemini_service.py  # Google Gemini Vision
│   │   ├── rag_service.py     # ChromaDB vector search
│   │   └── llm_service.py     # Groq text generation
│   ├── knowledge_base/        # UPSC content files
│   ├── chroma_db/             # Vector store (auto-created)
│   └── seed_knowledge.py      # One-time KB seeder
│
└── LEARNING.md            # Full learning notes (all phases)
```

