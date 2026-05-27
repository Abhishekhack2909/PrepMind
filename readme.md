# PrepMind — AI Study Companion for Competitive Exams

An AI-powered mobile app for UPSC exam preparation with handwritten answer evaluation, voice doubt solving, adaptive MCQs, and smart study planning.

## Project Structure
```
PrepMind/
├── PrepMind-App/       # React Native + Expo (Mobile Frontend)
├── PrepMind-Backend/   # FastAPI (Python Backend)
└── designs/            # Stitch design references
```

## Tech Stack
- **Frontend**: React Native + Expo + NativeWind
- **Backend**: FastAPI + LangGraph + ChromaDB
- **AI**: Groq (LLM) + Gemini Vision + faster-whisper
- **Database**: Supabase (PostgreSQL + Auth + Storage)

## Setup

### Frontend
```bash
cd PrepMind-App
cp .env.example .env   # fill in your keys
npm install
npx expo start
```

### Backend
```bash
cd PrepMind-Backend
cp .env.example .env   # fill in your keys
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
