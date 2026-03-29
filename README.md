# AI Money Mentor

AI-powered personal finance mentor built for the ET GenAI Hackathon 2026 by Team Labubu.

The app combines a `FastAPI + LangGraph` backend with a `Next.js` frontend to deliver:

- multi-agent financial advice
- chat and voice interactions
- WhatsApp summaries and alerts
- Setu Account Aggregator based account linking
- Gemini-powered financial document parsing

## Current Model Routing

These are the active defaults in `backend/config.py`:

```python
orchestrator_model = "openai/gpt-oss-120b"
agent_model = "llama-3.3-70b-versatile"
fast_model = "llama-3.1-8b-instant"
gemini_model = "gemini-3.1-flash-lite-preview"
```

## Features

- `LangGraph` orchestrator that routes each query to the right finance specialist
- Six specialist agents: `FIRE Planner`, `Money Health Score`, `Tax Wizard`, `Life Event Advisor`, `MF X-Ray`, and `Couple Planner`
- Dashboard with net worth, monthly savings, health score, goals, and portfolio snapshot
- Onboarding flow that links mock or Setu AA-backed accounts into the user profile
- Voice flow with Groq Whisper transcription and optional ElevenLabs TTS
- WhatsApp delivery with `WAHA` as primary, then `pywhatkit`, then `Twilio` fallback
- File upload pipeline for `PDF`, `images`, `CSV`, and `XLSX`, parsed with Gemini and optionally routed straight to an agent
- Memory layer using `mem0` for contextual follow-ups

## Architecture

```text
Next.js Frontend
  |-- onboarding
  |-- dashboard
  |-- mentor meeting
  |-- agent pages
  |
  v
FastAPI Backend
  |-- /api/chat
  |-- /api/agents/*
  |-- /api/voice/*
  |-- /api/whatsapp/*
  |-- /api/aa/*
  |-- /api/upload/*
  |
  v
LangGraph Orchestrator
  |-- retrieve memory (mem0)
  |-- route with openai/gpt-oss-120b
  |-- execute specialist agent
  |
  +-- fire_planner
  +-- money_health
  +-- tax_wizard
  +-- life_event
  +-- mf_xray
  +-- couple_planner
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript |
| Backend | FastAPI, LangGraph, Python |
| LLM Routing + Agents | Groq-hosted `openai/gpt-oss-120b`, `llama-3.3-70b-versatile`, `llama-3.1-8b-instant` |
| Document Parsing | Google Gemini `gemini-3.1-flash-lite-preview` |
| Memory | Mem0 |
| Voice | Groq Whisper STT, ElevenLabs TTS, browser fallback |
| Messaging | WAHA, pywhatkit, Twilio |
| Data Linking | Setu Account Aggregator |

## Project Structure

```text
backend/
  agents/        # orchestrator + specialist agents
  routers/       # chat, agents, voice, WhatsApp, AA, uploads
  services/      # Setu, TTS, WhatsApp helpers
  memory/        # mem0 integration
  data/          # demo/mock data

frontend/
  src/app/       # dashboard, onboarding, mentor, agent pages
  src/components/# shared UI blocks
  src/lib/       # API client + financial profile state
```

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000
```

Backend will start on `http://localhost:8000`.

Useful endpoints:

- `GET /api/health`
- `GET /docs`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

Optional frontend env:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill what you need.

### Required for core flows

| Variable | Purpose |
| --- | --- |
| `GROQ_API_KEY` | Orchestrator, agent inference, and Whisper transcription |
| `GOOGLE_API_KEY` | Gemini document parsing |

### Optional integrations

| Variable | Purpose |
| --- | --- |
| `ELEVENLABS_API_KEY` | High-quality TTS for the mentor meeting |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `TWILIO_WHATSAPP_TO` | Twilio WhatsApp fallback |
| `WAHA_BASE_URL`, `WAHA_SESSION`, `WAHA_API_KEY`, `WHATSAPP_DEFAULT_TO` | WAHA self-hosted WhatsApp setup |
| `SETU_CLIENT_ID`, `SETU_CLIENT_SECRET`, `SETU_PRODUCT_INSTANCE_ID` | Setu AA sandbox/live integration |
| `SUPABASE_URL`, `SUPABASE_KEY` | Reserved in config for future persistence work |
| `FRONTEND_URL` | Backend CORS/frontend origin |

## API Surface

### Core chat and agent routes

- `POST /api/chat`
- `POST /api/agents/fire`
- `POST /api/agents/health-score`
- `POST /api/agents/tax-wizard`
- `POST /api/agents/life-event`
- `POST /api/agents/mf-xray`
- `POST /api/agents/couple-planner`

### Voice routes

- `POST /api/voice/transcribe`
- `POST /api/voice/process`
- `POST /api/voice/tts`
- `GET /api/voice/tts/status`
- `WS /api/voice/ws`

### WhatsApp routes

- `GET /api/whatsapp/status`
- `GET /api/whatsapp/qr`
- `POST /api/whatsapp/send`
- `POST /api/whatsapp/send-summary`
- `POST /api/whatsapp/webhook`

### Account Aggregator routes

- `GET /api/aa/test`
- `POST /api/aa/consent`
- `GET /api/aa/consent/{consent_id}`
- `POST /api/aa/session/{consent_id}`
- `GET /api/aa/data/{session_id}`
- `POST /api/aa/demo-flow`
- `GET /api/aa/mock-data`

### Upload routes

- `POST /api/upload/`
- `POST /api/upload/parse-and-analyze`

## Optional WhatsApp Setup

If you want local WhatsApp delivery through `WAHA`, run:

```bash
docker run -it -p 3001:3000 -e WHATSAPP_DEFAULT_ENGINE=WEBJS devlikeapro/waha
```

Then open `http://localhost:3001/dashboard` and scan the QR for your session.

## Demo Flow

1. Start onboarding and link accounts via Setu mock data or AA sandbox.
2. Open the dashboard to see linked balances, portfolio, savings, and goals.
3. Start the AI mentor meeting or use the chat panel.
4. Ask about a life event like a bonus, car purchase, or tax decision.
5. Let the app generate agent advice, UI actions, and optionally send a WhatsApp summary.
