# PrepMind — Learning Notes
> Personal learning log. Updated after every phase. NOT committed to GitHub.

---

## Phase 0 — Project Setup

### 1. Why Two Separate Folders (Frontend + Backend)?

We split the project into `PrepMind-App/` (React Native) and `PrepMind-Backend/` (Python FastAPI).

**Reason: Security.**
- The mobile app ships to users' phones. Anyone can decompile an APK and read code.
- If API keys (Groq, Gemini, Supabase Service Key) were in the app → they'd be exposed.
- The backend runs on a server YOU control. Keys live there, safe.
- The app only ever talks to YOUR backend — never directly to Groq or Gemini.

```
Phone App  →  Your FastAPI Server  →  Groq / Gemini / Supabase
              (keys live here)
```

---

### 2. What is Expo and Why Use It?

**React Native** lets you write JavaScript once and run on iOS + Android.  
**Expo** is a layer on top that handles:
- Camera, Microphone, Notifications — pre-built native modules, no setup needed
- `expo start` → QR code → scan with Expo Go app on phone → instant preview
- `app.json` → central config for app name, permissions, icons

Without Expo, you'd need to write separate Swift (iOS) and Kotlin (Android) permission code.

---

### 3. How Expo Router Works (File-Based Navigation)

Expo Router works like Next.js — **the file = the route**.

```
app/
  (auth)/
    login.tsx       → /login  screen
    signup.tsx      → /signup screen
  (tabs)/
    index.tsx       → / home tab
    evaluate.tsx    → /evaluate tab
  _layout.tsx       → wraps all screens in this folder
```

- Folders with `(name)` are **route groups** — they organize screens without changing the URL
- `_layout.tsx` is a **wrapper** — runs before every screen in its folder
- `Stack` navigator = screens stack on top of each other (with back button)
- `Tabs` navigator = bottom tab bar

---

### 4. What is NativeWind?

**TailwindCSS for React Native.**

In web HTML you write: `<div className="bg-blue-500 p-4 rounded-lg">`  
In React Native normally you write:
```js
const styles = StyleSheet.create({
  box: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 8 }
})
```

With NativeWind you write: `<View className="bg-blue-500 p-4 rounded-lg">`  
Same Tailwind classes, NativeWind converts them to React Native StyleSheet at build time.

---

### 5. What is TypeScript and Why Use It?

TypeScript = JavaScript + types.

```ts
// JavaScript — no error until runtime
function getScore(user) {
  return user.scroe; // typo! but no error shown
}

// TypeScript — error shown immediately in editor
function getScore(user: User) {
  return user.scroe; // Error: Property 'scroe' does not exist. Did you mean 'score'?
}
```

In a big project like PrepMind with 20+ files, TypeScript prevents bugs before they happen.  
The `tsconfig.json` file configures how strict TypeScript is.

**Path aliases in tsconfig:**
```json
"paths": { "@/*": ["./*"] }
```
This lets you write `import { supabase } from '@/lib/supabase'` instead of  
`import { supabase } from '../../lib/supabase'` — much cleaner.

---

### 6. What is Supabase?

**"Firebase but with PostgreSQL"** — open source backend-as-a-service.

It gives you 4 things in one project:
| Service | What it does | PrepMind uses it for |
|---------|-------------|---------------------|
| **Auth** | User signup/login | Email + Google login |
| **Database** | PostgreSQL tables | Users, MCQs, plans, evaluations |
| **Storage** | File storage (like S3) | Storing answer photos |
| **Realtime** | Live data sync | Syncing plan updates |

**Two API keys:**
- `ANON KEY` → Used in the app. Limited by Row Level Security (RLS).
- `SERVICE KEY` → Used on backend only. Bypasses all security. Never in app.

---

### 7. What is Row Level Security (RLS)?

RLS = database-level security rules.

Without RLS: anyone with the anon key can `SELECT * FROM users` and see ALL users.  
With RLS: each user can only see rows where `id = auth.uid()` (their own row).

```sql
-- This policy means: "you can only touch rows where YOUR user ID matches"
CREATE POLICY "Users can manage own profile"
  ON users FOR ALL
  USING (auth.uid() = id);
```

Even if a hacker gets the anon key, RLS ensures they can only read their own data.

---

### 8. What is FastAPI?

Python web framework for building REST APIs. Key features:

- **`async`** — handles many requests at the same time without blocking
- **Auto docs** — go to `http://localhost:8000/docs` → interactive API documentation generated automatically
- **Pydantic** — validates incoming request data. If you send wrong data, FastAPI returns a clear error.

```python
@app.post("/evaluate")
async def evaluate(image_url: str):  # FastAPI validates this automatically
    result = await gemini.evaluate(image_url)
    return result
```

---

### 9. What is a Virtual Environment (venv)?

Python installs packages globally by default. Problem: Project A needs `fastapi==0.100` but Project B needs `fastapi==0.115`. Conflict!

`venv` creates an **isolated Python environment per project**:
```bash
python -m venv venv       # Create isolated environment
venv\Scripts\activate     # Activate it (Windows)
pip install -r requirements.txt  # Install only for THIS project
```

Now PrepMind's packages don't conflict with anything else on your computer.

---

### 10. What is .gitignore?

A file that tells Git which files to **never commit**.

Things we gitignore and WHY:
```
.env              → Contains API keys — if pushed, anyone can steal them
node_modules/     → 200MB+ folder, can be reinstalled with npm install
venv/             → Same — recreated with pip install
__pycache__/      → Python auto-generated bytecode, not needed
chroma_db/        → Vector database files, generated at runtime (large)
```

The `.env.example` file IS committed — it shows the structure without real values,  
so other developers know which keys to fill in.

---

### 11. The Stitch MCP Connection

**MCP = Model Context Protocol** — a standard way for AI assistants to connect to external services.

We configured it in `mcp_config.json`:
```json
{
  "mcpServers": {
    "stitch": {
      "serverUrl": "https://stitch.googleapis.com/mcp",
      "headers": { "X-Goog-Api-Key": "..." }
    }
  }
}
```

This lets us call Stitch tools like `get_screen` via JSON-RPC:
```
POST https://stitch.googleapis.com/mcp
{ "method": "tools/call", "params": { "name": "get_screen", ... } }
```

We used this to fetch all 10 screen designs (HTML + PNG) directly from your Stitch project and download them into `designs/`.

---

## Phase 1 — Authentication

### 1. How Supabase Auth Works (JWT Tokens)

When a user signs in, Supabase returns two tokens:
- **`access_token`** (JWT) — short-lived (1 hour). Sent with every API request as `Authorization: Bearer <token>`. The backend verifies this to know WHO is making the request.
- **`refresh_token`** — long-lived (weeks). Used to get a new access_token when it expires, without the user having to log in again.

```
User logs in → Supabase returns { access_token, refresh_token }
               ↓
               AsyncStorage saves both tokens
               ↓
App reopens → reads tokens from AsyncStorage
              ↓
              access_token expired? → auto-refresh with refresh_token
              ↓
              User stays logged in
```

### 2. What is a JWT (JSON Web Token)?

A JWT looks like: `eyJhbGci...` (long base64 string)

It has 3 parts separated by dots:
```
HEADER.PAYLOAD.SIGNATURE
```
The PAYLOAD contains: `{ "sub": "user-uuid", "role": "authenticated", "exp": 1234567890 }`

Anyone can READ a JWT (it's just base64), but no one can FAKE one — the SIGNATURE is created with Supabase's secret key. The backend verifies the signature.

### 3. Why AsyncStorage for Sessions?

React Native has no browser cookies or localStorage.  
`AsyncStorage` is React Native's key-value storage — it persists data to the device's disk.

We configure Supabase to use it:
```ts
createClient(url, key, { auth: { storage: AsyncStorage } })
```

Now tokens survive app restarts, device reboots, etc.

### 4. useAuth Hook — onAuthStateChange

`supabase.auth.onAuthStateChange()` fires every time auth state changes:
- User signs in → fires with `event: 'SIGNED_IN'`
- User signs out → fires with `event: 'SIGNED_OUT'`
- Token refreshes → fires with `event: 'TOKEN_REFRESHED'`

Our `useAuth` hook listens to this and updates React state → triggers re-render → AuthGuard redirects.

### 5. Two-Step Sign Up (Auth + Profile)

Supabase Auth's `auth.users` table only stores email + password hash.  
Our app needs extra fields (name, exam_date, daily_hours).

So sign up is two steps:
```
Step 1: supabase.auth.signUp()    → creates row in auth.users (managed by Supabase)
Step 2: supabase.from('users').insert()  → creates row in OUR users table
```
Both rows share the same UUID (`id`), linked by foreign key.

### 6. AuthGuard Pattern

`useSegments()` returns current route segments, e.g., `['(auth)', 'login']` or `['(tabs)']`.  
We check if the user is in the auth group and whether they're logged in:

```
Not logged in + not on auth screen → redirect to /onboarding
Logged in + on auth screen         → redirect to /(tabs) home
```

This runs in a `useEffect` that fires whenever `user` or `segments` changes — so any navigation state change re-checks auth automatically.

### 7. KeyboardAvoidingView

On mobile, the keyboard pops up and covers the form inputs. 
`KeyboardAvoidingView` pushes the content up when keyboard appears:
- iOS: `behavior="padding"` — adds padding at the bottom
- Android: `behavior="height"` — shrinks the view height

### 8. Onboarding — AsyncStorage First Launch Check

We store `'onboarding_done': 'true'` in AsyncStorage after the user finishes onboarding.  
On app start, check this key — if it exists, skip onboarding and go straight to login.  
This is a common pattern for "show only once" screens.

### 9. Animated API (React Native)

React Native's built-in animation library:
```ts
const opacity = useRef(new Animated.Value(1)).current;  // Start at 1 (fully visible)

Animated.timing(opacity, {
  toValue: 0,         // Animate to 0 (invisible)
  duration: 800,      // Over 800ms
  useNativeDriver: true,  // Runs on native thread — smoother, no JS jank
}).start();
```

`useNativeDriver: true` is key — it offloads animation to the native side, giving 60fps even if JS is busy.

---

## Phase 2 — Answer Evaluator

### 1. What is a Large Language Model (LLM)?

An LLM (like Gemini, GPT-4, Claude) is a neural network trained on massive text data.
It learned patterns from billions of documents, so it can:
- Read and understand text (and images with Vision models)
- Generate human-like responses
- Follow instructions ("evaluate this answer against UPSC criteria")

**Key insight:** We're not programming evaluation rules. We're DESCRIBING what a good evaluator does, and the model figures out the rest. This is the paradigm shift.

### 2. What is Gemini Vision?

Gemini is Google's LLM family. The "Vision" capability means it can process IMAGES alongside text.

```
Input to Gemini:  [IMAGE of handwritten answer] + [TEXT prompt: "evaluate this..."]
Output from Gemini: [JSON with scores, feedback, grade]
```

This is called **multimodal AI** — handling multiple types of inputs (text + image).

### 3. What is a Prompt?

A prompt is the instruction we give to the AI. It's the most important part of the system.

Bad prompt: "evaluate this answer"  
Good prompt: "You are a UPSC evaluator with 15 years experience. Evaluate against these criteria: content (0-5), structure (0-3)... Return ONLY valid JSON: { total_marks, grade, ... }"

**Prompt engineering** = crafting prompts that give reliable, structured output.

### 4. Why Do We Get JSON Back?

We told Gemini in the prompt: "Return ONLY a valid JSON object". 

This is called **structured output** — instead of getting a paragraph of text, we get machine-readable data that our app can display properly (scores as numbers, arrays of feedback points, etc.).

The risk: Gemini sometimes adds markdown (```json ... ```) around the JSON. So we use regex to extract just the `{ ... }` part.

### 5. Base64 — How Images Travel as Text

HTTP APIs send text, not raw bytes. So to send an image to Gemini, we encode it as Base64:

```
Raw image bytes: 0x89 0x50 0x4E 0x47 ...
Base64 string:   "iVBORw0KGgoAAAANSUhEUgAA..."
```

Base64 converts any binary data to a string using only 64 safe characters (A-Z, a-z, 0-9, +, /).
The string is ~33% larger than the original, but it travels safely through text-based APIs.

### 6. FastAPI Router Pattern

Instead of putting all routes in `main.py`, we split them into routers:

```python
# routers/evaluate.py
router = APIRouter(prefix="/api", tags=["Evaluate"])

@router.post("/evaluate")
async def evaluate_endpoint(req: EvaluateRequest): ...

# main.py
from routers import evaluate
app.include_router(evaluate.router)  # registers /api/evaluate
```

This keeps code organized. Each feature (evaluate, voice, mcq) is its own router file.

### 7. Pydantic Models (Request Validation)

FastAPI uses Pydantic to validate incoming data:

```python
class EvaluateRequest(BaseModel):
    image_base64: str          # Required — FastAPI rejects requests without this
    question: Optional[str] = None   # Optional — defaults to None
    user_id: Optional[str] = None
```

If someone sends `{"image_base64": 123}` (int instead of str), FastAPI automatically returns a 422 error with a clear message. No manual validation needed.

### 8. Row Level Security (RLS) — Who Can See What

Supabase uses PostgreSQL RLS policies to control data access at the database level:

```sql
CREATE POLICY "Users see own evaluations"
ON evaluations FOR ALL
USING (auth.uid() = user_id);
```

This means: **even if someone has your anon key, they can ONLY read rows where `user_id = their own ID`**.
The backend uses the SERVICE KEY (bypasses RLS) to write results.
The frontend uses the ANON KEY (respects RLS) to read only their own data.

### 9. Anonymous Auth — How It Works

`supabase.auth.signInAnonymously()` creates a real user with a real UUID, but no email/password.
The user gets a JWT token immediately — no login screen needed.

Later, if they want to "upgrade" to a real account:
```ts
supabase.auth.updateUser({ email: "...", password: "..." })
```
Their data stays attached to the same UUID — no data loss.

---

## Phase 3 — Knowledge Base & RAG

### 1. What is RAG? (Retrieval Augmented Generation)

Plain LLMs (like Gemini, llama3) only know what they were trained on. They can't know:
- Your specific NCERT notes
- Recent PYQs you uploaded
- Current affairs from last month

RAG fixes this. It has 3 stages:

```
INDEXING (once):
  Documents → Chunks → Embeddings → ChromaDB

RETRIEVAL (per query):
  Question → Embedding → Search ChromaDB → Top K relevant chunks

GENERATION:
  Chunks + Question → LLM → Grounded Answer
```

Key insight: The LLM doesn't need to "know" everything — we GIVE it the relevant context at query time.

### 2. What is an Embedding?

An embedding is a list of numbers (a vector) that captures the "meaning" of text.

```
"Preamble of the Constitution" → [0.23, -0.11, 0.87, 0.04, ...]  (384 numbers)
"Indian Constitution Preamble" → [0.21, -0.13, 0.85, 0.03, ...]  (similar!)
"Photosynthesis in plants"     → [0.91, 0.44, -0.23, 0.77, ...]  (very different)
```

Semantically similar text → similar vectors.
We measure similarity using cosine distance (angle between vectors).

Model used: `all-MiniLM-L6-v2` from SentenceTransformers.
- Small (90MB), fast, good quality
- Outputs 384-dimensional vectors
- No API call needed — runs locally

### 3. What is ChromaDB?

ChromaDB is a vector database — like SQLite but for vectors.

Regular DB: stores rows of text/numbers, searches by exact match
Vector DB:  stores embeddings, searches by semantic similarity

```python
# Store
collection.add(documents=["text..."], ids=["id1"], metadatas=[{"source": "NCERT"}])

# Search — finds most semantically similar documents
results = collection.query(query_texts=["What is Preamble?"], n_results=4)
```

ChromaDB runs locally, persists to disk (chroma_db/ folder).
In production, you'd use Pinecone, Weaviate, or Supabase pgvector.

### 4. What is Text Chunking?

We can't embed an entire 300-page book as one vector — too much info gets averaged out.
We split documents into chunks (~400 words each), with overlap.

```
Document:  [===========================================]
Chunk 1:   [============] (words 0-400)
Chunk 2:       [============] (words 350-750)  ← overlap prevents cutting context
Chunk 3:           [============] (words 700-1100)
```

Overlap = 50 words ensures answers that span chunk boundaries aren't missed.

### 5. What is Groq?

Groq is a company that built custom AI chips (LPUs — Language Processing Units).
They run open-source LLMs (llama3, mixtral) at extremely high speed.

- OpenAI GPT-4: ~20-40 tokens/second
- Groq llama3:  ~800-1200 tokens/second (30-50x faster)
- Free tier: 6000 tokens/minute

We use Groq for text generation (answers) because:
1. It's fast — students get answers in <1 second
2. It's free during development
3. We use Gemini for vision, Groq for text — best tool for each job

### 6. Why Low Temperature for RAG?

```python
response = groq_client.chat.completions.create(
    model="llama3-8b-8192",
    temperature=0.3,   # LOW — more factual, less creative
    ...
)
```

Temperature controls randomness:
- temp=0.0 → always picks the most likely next token (deterministic, repetitive)
- temp=0.3 → mostly factual with small variations (good for Q&A)
- temp=0.9 → creative, unpredictable (good for stories, bad for facts)

For UPSC answers we want accurate, consistent answers → low temperature.

### 7. Preventing Hallucination with RAG

Hallucination = LLM confidently saying wrong things.

Without RAG: "When was the Preamble amended?" → LLM might guess wrong year
With RAG: We pass the exact text chunk that says "42nd Amendment 1976" → LLM uses it

The system prompt says: "Answer using ONLY the context provided."
This forces the model to stay grounded in retrieved facts.

### 8. Groq vs Gemini — When to Use Which

| Task | Tool | Why |
|------|------|-----|
| Read handwriting (Vision) | Gemini Vision | Multimodal capability |
| Q&A from knowledge base | Groq llama3 | Fast, free, great at text |
| MCQ generation | Groq llama3 | Structured output, fast |
| Image analysis | Gemini Vision | Only option |
| Voice transcript → Answer | Groq llama3 | Speed matters for voice UX |

---

## Phase 4 — Voice Doubt Solver

### 1. What is Whisper?

Whisper is a Speech-to-Text (STT) model by OpenAI, trained on 680,000 hours of multilingual audio. It converts audio recordings to text with high accuracy, handling:
- Different accents (including Indian English)
- Background noise
- Technical vocabulary (great for UPSC terms like "preamble", "federalism")

Model variants: tiny, base, small, medium, large-v3, large-v3-turbo
We use `whisper-large-v3-turbo` via Groq — best accuracy at Groq's speed.

### 2. Web Speech API vs Whisper

| Feature | Web Speech API | Groq Whisper |
|---------|---------------|--------------|
| Platform | Browser only | Everywhere |
| Setup | Zero — built-in Chrome | API call |
| Cost | Free | Free (Groq tier) |
| Offline | No | No |
| Accuracy | Good | Excellent |
| Language | Limited | 99 languages |

For web dev: Web Speech API is perfect (zero setup).
For mobile: Record audio with expo-av → send .m4a to Groq Whisper.

### 3. Audio File Flow on Mobile

```
User taps mic → expo-av starts recording → saves to .m4a file
User taps stop → app reads file as base64
POST /api/voice/ask (multipart/form-data with audio file)
→ Groq Whisper: audio bytes → transcript text
→ ChromaDB: transcript → similar chunks
→ Groq llama: chunks + question → answer
→ App displays answer
```

### 4. multipart/form-data (How Files Are Sent)

Regular API calls send JSON. But audio files are binary — can't put binary in JSON efficiently.
`multipart/form-data` is the standard for file uploads:

```
Content-Type: multipart/form-data; boundary=---XYZ
---XYZ
Content-Disposition: form-data; name="audio"; filename="recording.m4a"
Content-Type: audio/m4a
[binary audio bytes here]
---XYZ
Content-Disposition: form-data; name="language"
en
---XYZ--
```

FastAPI handles this automatically with `UploadFile = File(...)`.

### 5. SpeechRecognition Browser API

```javascript
const recognition = new webkitSpeechRecognition();
recognition.lang = 'en-IN';      // Indian English
recognition.continuous = false;  // Stop after one utterance

recognition.onresult = (event) => {
  const text = event.results[0][0].transcript; // The spoken words
};
recognition.start(); // Asks for mic permission, starts recording
```

The browser handles everything: mic access, streaming audio, ASR. No API calls needed.

### 6. Animated Pulse in React Native

```typescript
const pulseAnim = useRef(new Animated.Value(1)).current;

Animated.loop(
  Animated.sequence([
    Animated.timing(pulseAnim, { toValue: 1.25, duration: 700, useNativeDriver: true }),
    Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
  ])
).start();

// Apply to component:
<Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
```

`useNativeDriver: true` runs animation on native thread — 60fps even if JS is busy.
On web we must set it to `false` (no native thread in browser).

---

## Phase 5 — MCQ Engine

### 1. How AI Generates MCQs

We use Groq (llama-3.1-8b-instant) with a carefully structured prompt:

```
"Generate exactly 5 MCQs on 'Indian Polity'. 
Return ONLY a JSON array. Each question has:
question, options (A-D), correct, explanation, difficulty"
```

The model outputs structured JSON which we parse with `re.search(r'\[.*\]', raw, re.DOTALL)`.

Key: `temperature=0.7` (higher than RAG) for variety — each quiz session generates different questions on the same topic.

### 2. RAG-Enhanced MCQ Generation

Before generating, we retrieve relevant chunks from ChromaDB:
```python
chunks = retrieve_context(topic, top_k=3)
context = "\n\n".join([c["text"] for c in chunks])
```
This grounds the questions in actual NCERT content — reducing hallucination and improving accuracy.

### 3. JSONB in PostgreSQL (Supabase)

`results JSONB` stores the full question-answer breakdown as JSON in PostgreSQL.

```sql
-- Query: find all sessions where user scored below 60%
SELECT * FROM mcq_sessions WHERE user_id = $1 AND percentage < 60;

-- Query: extract wrong_topics from all sessions
SELECT unnest(wrong_topics) as topic, COUNT(*) 
FROM mcq_sessions GROUP BY topic ORDER BY COUNT(*) DESC;
```

JSONB (Binary JSON) allows fast querying inside JSON documents — used by Phase 6 (Weakness Map).

### 4. Adaptive Difficulty (Future)

Currently: 40% easy, 40% medium, 20% hard (fixed in prompt).
Future: Track wrong answers by difficulty → increase hard questions in weak areas.

This is "adaptive learning" — the quiz gets harder where you're weak.

### 5. State Machine Pattern

The MCQ screen uses a state machine:
```
topic_select → loading → quiz → results
     ↑                              |
     └──────── resetQuiz() ─────────┘
```

Each state renders completely different UI. This is cleaner than boolean flags like `isLoading`, `isShowingResults` etc.

### 6. Color-coded Feedback (UX)

After answering:
- Correct answer → Green background
- Wrong answer → Red background  
- Other options → Dimmed (50% opacity)

This instant visual feedback reinforces learning — students see what they got wrong immediately, with the explanation right there.

---

## Phase 6 — Weakness Map

### 1. Aggregating Data in PostgreSQL (Supabase)

The weakness map works by aggregating MCQ session results:

```sql
-- Average score per topic
SELECT topic, AVG(percentage) as avg_score, COUNT(*) as sessions
FROM mcq_sessions
WHERE user_id = $1
GROUP BY topic
ORDER BY avg_score ASC;  -- Weakest first
```

We do this aggregation in Python (not SQL) for flexibility:
```python
topic_data[topic]["sum"] += percentage
topic_data[topic]["sessions"] += 1
avg = topic_data[topic]["sum"] / topic_data[topic]["sessions"]
```

### 2. Weakness Levels (Thresholds)

```
strong   = avg >= 75%  → Green
moderate = avg >= 50%  → Amber  
weak     = avg < 50%   → Red
```

Thresholds are arbitrary but sensible for UPSC where 60%+ is a pass. You can adjust based on user feedback.

### 3. Pull-to-Refresh in React Native

```tsx
<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}     // Called when user pulls down
      tintColor={Colors.primary}
    />
  }
>
```

The OS provides the pull animation automatically. You just handle the data reload.

### 4. Promise.all — Parallel API Calls

```typescript
// BAD: Sequential — waits for each one
const weakRes = await fetch('/weakness');   // 300ms
const sumRes  = await fetch('/summary');    // 300ms
// Total: 600ms

// GOOD: Parallel — both fire at once
const [weakRes, sumRes] = await Promise.all([
  fetch('/weakness'),
  fetch('/summary'),
]);
// Total: ~300ms (fastest one)
```

Always use `Promise.all` when fetching independent data sources.

---

## Phase 7 — Study Planner

### 1. Why Not LangGraph?

LangGraph is a framework for multi-step AI agent workflows. For a study planner:
- LangGraph would: fetch weak topics → research each one → generate tasks → validate → output
- Our approach: single Groq call with a rich prompt — simpler, faster, free

For this scale, a well-crafted prompt is better than a complex agent graph. We'll add LangGraph when the planner needs multi-step reasoning (e.g., dynamically adjusting based on progress).

### 2. Prompt Engineering for Structured Output

Getting an LLM to return valid, parseable JSON reliably requires:
1. **Explicit format instruction**: "Return ONLY valid JSON, no text outside"
2. **Show an example**: Include the exact schema with sample values
3. **Post-process**: Use regex to extract JSON even if the model adds extra text

```python
raw = response.choices[0].message.content.strip()
match = re.search(r'\{.*\}', raw, re.DOTALL)
plan = json.loads(match.group())
```

### 3. Upsert in Supabase

```python
supabase.table("study_plans").upsert(
    {"user_id": req.user_id, "plan": plan},
    on_conflict="user_id"    # If user already has a plan, UPDATE it
).execute()
```

`upsert` = INSERT if not exists, UPDATE if exists. The `UNIQUE(user_id)` constraint on the table makes this work — each user has exactly one active plan.

### 4. useEffect with Dependencies

```typescript
useEffect(() => {
  fetchData();
}, [fetchData]);  // Re-runs if fetchData changes
```

`fetchData` is wrapped in `useCallback([userId])` — so it only changes when userId changes. This prevents infinite re-render loops while ensuring data refreshes on login.

---

## Phase 8 — Home Dashboard

### 1. The Dashboard Pattern

A good dashboard answers: **"What should I do right now?"**

We show:
1. Stats (what have I done) → past
2. Today's schedule (what's planned) → present  
3. Quick actions (what can I do) → future
4. Weak area reminder → nudge

This flow guides the user from data → action.

### 2. Graceful Degradation

The home screen fetches from multiple backend endpoints. If the backend is down:
```typescript
const [sumRes, planRes] = await Promise.all([
  fetch(...).catch(() => null),  // null if failed
  fetch(...).catch(() => null),
]);
if (sumRes?.ok) { ... }  // Only use if successful
```

The screen renders with empty states instead of crashing. This is called **graceful degradation** — the app works even when parts fail.

### 3. Time-based Greeting

```typescript
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
```

Small personalizations like this make apps feel alive and thoughtful.

### 4. Navigation with expo-router

```typescript
const router = useRouter();
router.push('/(tabs)/mcq');  // Navigate to MCQ tab
```

File-based routing means the path IS the file path:
- `app/(tabs)/mcq.tsx` → route `/(tabs)/mcq`
- `app/(tabs)/index.tsx` → route `/(tabs)/` (home)

---

## Phase 9 — Profile

### 1. Anonymous Auth in Supabase

When the app starts, we call:
```typescript
const { data } = await supabase.auth.signInAnonymously();
// data.user.is_anonymous === true
// data.user.id === a real UUID (stable across sessions)
```

This creates a real user in Supabase auth, but without email/password. The user's data (MCQ sessions, evaluations) is linked to this UUID via RLS policies.

The UUID persists until the user uninstalls the app or signs out. This means:
- ✅ Data persists across app restarts
- ❌ Data is lost if user reinstalls or uses a different device
- To fix: user can "upgrade" by linking email (future feature)

### 2. Alert for Destructive Actions

```typescript
Alert.alert(
  'Sign Out',
  'Are you sure?',
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign Out', style: 'destructive', onPress: signOut },
  ]
);
```

`style: 'destructive'` renders red on iOS — a platform convention for dangerous actions. Always confirm before data loss actions.

### 3. Badge System Design

Badges are computed at render time, not stored:
```typescript
const earnedBadges = BADGES.filter(b => {
  if (b.id === 'first_mcq') return mcqSessions >= 1;
  if (b.id === 'five_mcq')  return mcqSessions >= 5;
  ...
});
```

Advantage: no extra DB column needed. Just check the data we already have.
Disadvantage: can't give badges for one-time events (like "first login on a Monday").

---

## Phase 10 — Polish + Deploy

### 1. What Makes a Production Backend?

Our current FastAPI backend runs with `uvicorn main:app --reload`. For production:

```bash
# Dev (local)
uvicorn main:app --reload --port 8000

# Production
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

Differences:
- Remove `--reload` (file watching adds overhead)
- Use `gunicorn` with multiple workers (`-w 4`) for parallel requests
- Bind to `0.0.0.0` to accept external connections (not just localhost)

### 2. Environment Variables in Expo

```bash
# .env in PrepMind-App/
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.5:8000
```

Only variables prefixed with `EXPO_PUBLIC_` are available in the JS bundle.
Variables WITHOUT that prefix are server-only (not bundled into the app).

In code:
```typescript
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';
```

### 3. Finding Your Local IP for Mobile Testing

When testing on a real phone (same WiFi network):
```bash
# Windows
ipconfig  # Look for IPv4 Address under Wi-Fi

# Mac/Linux
ifconfig | grep inet
```

Then set:
```
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:8000
```

Don't use `localhost` — that refers to the phone itself, not your computer.

### 4. Deploy Options

| Option | Cost | Ease | Best For |
|--------|------|------|----------|
| Railway | Free tier | Easy | FastAPI backend |
| Render | Free tier | Easy | FastAPI backend |
| Fly.io | Free tier | Medium | FastAPI + ChromaDB |
| Vercel | Free | Easy | Frontend only |
| Expo EAS | Free tier | Easy | Mobile app builds |

For PrepMind:
- Backend → **Railway** or **Render** (free, auto-deploys from GitHub)
- App → **Expo EAS Build** → APK for Android testing

### 5. What We Built — Full Summary

```
PrepMind Stack:

  React Native (Expo) ←─── User Interface (7 screens)
         ↓
  FastAPI Backend ←──────── 13 REST endpoints
    ├── Gemini Vision ←──── Handwriting → Evaluation
    ├── ChromaDB ←───────── NCERT content → Vector search
    ├── Groq llama3 ←────── RAG answers + MCQ + Planner
    ├── Groq Whisper ←───── Voice → Text
    └── Supabase ←───────── PostgreSQL + Auth + RLS
```

Total: ~3000 lines of code across 20+ files. Built phase by phase, with learning notes at every step.
