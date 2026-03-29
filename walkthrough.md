# AI Money Mentor — Build Walkthrough

## What Was Built

A complete **multi-agent AI personal finance mentor** prototype with:

- **Backend**: FastAPI + LangGraph orchestrator routing to 6 specialized agents
- **Frontend**: Next.js 16 with 8 pages, premium glassmorphism dark UI
- **Voice**: Browser-native STT (Groq Whisper) + TTS with animated orb
- **Chat**: Floating chat panel with agent routing display
- **WhatsApp**: Twilio webhook + proactive summary messaging
- **Memory**: Mem0 integration with graceful fallback

---

## Files Created

### Backend (FastAPI + LangGraph)

| File | Purpose |
|------|---------|
| [requirements.txt](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/requirements.txt) | Python dependencies |
| [.env.example](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/.env.example) | Environment template |
| [config.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/config.py) | Pydantic settings with model routing |
| [main.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/main.py) | FastAPI entry with CORS & router mounting |

#### Models
| File | Purpose |
|------|---------|
| [user.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/models/user.py) | UserProfile with Indian financial context |
| [financial.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/models/financial.py) | SIP, Tax, FIRE, Portfolio result models |
| [agent_response.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/models/agent_response.py) | Agent response + UI action commands |

#### Agent Tools (Real Calculators)
| File | Purpose |
|------|---------|
| [sip_calculator.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/agents/tools/sip_calculator.py) | SIP future value, required SIP, step-up, goal planning |
| [tax_calculator.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/agents/tools/tax_calculator.py) | Old/New regime with real FY24-25 slabs, deduction finder |
| [fire_calculator.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/agents/tools/fire_calculator.py) | FIRE/CoastFIRE/LeanFIRE with milestone roadmap |
| [portfolio_analyzer.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/agents/tools/portfolio_analyzer.py) | XIRR (Newton's method), overlap, expense ratio drag |

#### Specialized Agents (LLM-Powered)
| File | Model | Purpose |
|------|-------|---------|
| [orchestrator.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/agents/orchestrator.py) | llama-3.3-70b-specdec | LangGraph supervisor routing to 6 agents |
| [fire_planner.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/agents/fire_planner.py) | llama-3.3-70b-versatile | FIRE roadmaps + SIP strategies |
| [money_health.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/agents/money_health.py) | llama-3.1-8b-instant | 6-dimension financial scoring |
| [tax_wizard.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/agents/tax_wizard.py) | llama-3.3-70b-versatile | Tax regime comparison + optimization |
| [life_event.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/agents/life_event.py) | llama-3.3-70b-versatile | **Star demo agent** — bonus/marriage/baby |
| [mf_xray.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/agents/mf_xray.py) | llama-3.3-70b-versatile | Portfolio analysis + rebalancing |
| [couple_planner.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/agents/couple_planner.py) | llama-3.3-70b-versatile | Joint financial optimization |

#### API Routers
| File | Purpose |
|------|---------|
| [chat.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/routers/chat.py) | `POST /api/chat` — main orchestrator endpoint |
| [agents.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/routers/agents.py) | Direct agent endpoints (fire, health, tax, etc.) |
| [voice.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/routers/voice.py) | Voice transcription + WebSocket for real-time |
| [whatsapp.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/routers/whatsapp.py) | Twilio webhook + send summary |

#### Memory & Data
| File | Purpose |
|------|---------|
| [mem0_layer.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/memory/mem0_layer.py) | Mem0 + fallback memory system |
| [mock_data.py](file:///d:/6th%20Sem/Hackathon/EtGenAI/backend/data/mock_data.py) | Realistic Indian user profile, AA data, CAMS |

---

### Frontend (Next.js 16 + TypeScript)

| File | Purpose |
|------|---------|
| [globals.css](file:///d:/6th%20Sem/Hackathon/EtGenAI/frontend/src/app/globals.css) | 500+ line design system: glassmorphism, gradients, animations |
| [layout.tsx](file:///d:/6th%20Sem/Hackathon/EtGenAI/frontend/src/app/layout.tsx) | Root layout with SEO metadata |
| [api.ts](file:///d:/6th%20Sem/Hackathon/EtGenAI/frontend/src/lib/api.ts) | Backend API client library |
| [Sidebar.tsx](file:///d:/6th%20Sem/Hackathon/EtGenAI/frontend/src/components/Sidebar.tsx) | Glassmorphic navigation sidebar |
| [TopBar.tsx](file:///d:/6th%20Sem/Hackathon/EtGenAI/frontend/src/components/TopBar.tsx) | Top bar with health score badge |
| [ChatPanel.tsx](file:///d:/6th%20Sem/Hackathon/EtGenAI/frontend/src/components/ChatPanel.tsx) | Floating chat with typing indicators |

#### Pages (8 routes)
| Route | File | Feature |
|-------|------|---------|
| `/` | [page.tsx](file:///d:/6th%20Sem/Hackathon/EtGenAI/frontend/src/app/page.tsx) | Dashboard with animated stats, goals, portfolio |
| `/mentor` | [page.tsx](file:///d:/6th%20Sem/Hackathon/EtGenAI/frontend/src/app/mentor/page.tsx) | Voice meeting with animated orb + transcript |
| `/health-score` | [page.tsx](file:///d:/6th%20Sem/Hackathon/EtGenAI/frontend/src/app/health-score/page.tsx) | 6-dimension wellness scoring |
| `/fire-planner` | [page.tsx](file:///d:/6th%20Sem/Hackathon/EtGenAI/frontend/src/app/fire-planner/page.tsx) | FIRE roadmap with timeline |
| `/tax-wizard` | [page.tsx](file:///d:/6th%20Sem/Hackathon/EtGenAI/frontend/src/app/tax-wizard/page.tsx) | Old vs New regime comparison |
| `/mf-xray` | [page.tsx](file:///d:/6th%20Sem/Hackathon/EtGenAI/frontend/src/app/mf-xray/page.tsx) | Portfolio overlap + expense ratio analysis |
| `/life-events` | [page.tsx](file:///d:/6th%20Sem/Hackathon/EtGenAI/frontend/src/app/life-events/page.tsx) | Life event advisor (bonus/marriage/baby) |
| `/couple-planner` | [page.tsx](file:///d:/6th%20Sem/Hackathon/EtGenAI/frontend/src/app/couple-planner/page.tsx) | Joint financial optimization |

---

## How to Run

### Terminal 1 — Backend
```bash
cd backend
copy .env.example .env    # Edit with your API keys
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Terminal 2 — Frontend
```bash
cd frontend
npm run dev
```

Open **http://localhost:3000**

---

## Demo Flow (60 seconds)

1. Open Dashboard → See animated stats, goals, health score
2. Click "Start AI Meeting" → Voice orb page
3. Tap orb → Say "I got a 2 lakh bonus, what should I do?"
4. AI responds with voice → Transcript shows routing to Life Event agent
5. View allocation breakdown → Tax savings + SIP recommendations
6. Click "Send to WhatsApp" → Summary delivered
7. Show chat panel → Ask follow-up questions

---

## Verification

- **Frontend build**: ✅ `npm run build` passes cleanly (all 8 routes compiled)
- **Backend syntax**: All Python files follow consistent patterns
- **Graceful degradation**: Frontend works with fallback data when backend is offline
