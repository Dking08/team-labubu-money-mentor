# AI Money Mentor

**AI-powered personal finance mentor** — multi-agent system with voice meetings, WhatsApp alerts, and premium UI.

Built for the **ET GenAI Hackathon 2026** by Team Labubu.

---

## Quick Start

### 1. Backend (FastAPI + LangGraph)

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Setup environment
copy .env.example .env
# Edit .env with your actual API keys

# Run the server
uvicorn main:app --reload --port 8000
```

### 2. Frontend (Next.js)

```bash
cd frontend

# Install dependencies (already done if you ran the setup)
npm install

# Run dev server
npm run dev
```

**Open**: [http://localhost:3000](http://localhost:3000)

---

## API Keys Required

| Service | Purpose | Get it at |
|---------|---------|-----------|
| Groq | LLM inference (Llama 3.3) + Whisper STT | [console.groq.com](https://console.groq.com) |
| Google AI | Gemini Flash (PDF/doc parsing) | [aistudio.google.com](https://aistudio.google.com) |
| Twilio | WhatsApp sandbox | [twilio.com](https://www.twilio.com) |

All free tier / free credits.

---

## Architecture

```
User (Web / Voice / WhatsApp)
         |
    FastAPI Gateway
         |
  LangGraph Orchestrator (Groq llama-3.3-70b-specdec)
         |
   +-----+-----+-----+-----+-----+-----+
   |     |     |     |     |     |     |
  FIRE  Health  Tax  Life  MF   Couple
 Plan   Score  Wizard Event X-Ray Plan
   |     |     |     |     |     |     |
  Groq  Groq  Groq  Groq  Gemini Groq
         |
       Mem0 Memory Layer
```

## Features

- **FIRE Planner** — Month-by-month financial independence roadmap
- **Money Health Score** — 6-dimension financial wellness assessment
- **Tax Wizard** — Old vs New regime with missed deductions
- **Life Event Advisor** — Bonus, marriage, baby financial planning
- **MF X-Ray** — Portfolio overlap, expense ratio, rebalancing
- **Couple Planner** — Joint income optimization
- **Voice AI Meeting** — Talk to your financial mentor
- **WhatsApp Alerts** — Get summaries and reminders

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Vanilla CSS |
| Backend | FastAPI, LangGraph, Python |
| LLMs | Groq (Llama 3.3 70B), Google Gemini Flash |
| Memory | Mem0 |
| Voice | Groq Whisper STT + Browser TTS |
| WhatsApp | Twilio Sandbox |

---

**Demo flow**: User joins voice meeting -> Says "I got a 2 lakh bonus" -> AI responds with tax breakdown + SIP allocation -> UI shows Life Event Advisor -> WhatsApp summary sent.
