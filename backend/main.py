"""
AI Money Mentor — FastAPI Application Entry Point
Multi-agent AI-powered personal finance mentor.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routers import chat, agents, whatsapp, voice, aa, upload
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 50)
    print("[START] AI Money Mentor — Starting Up")
    print(f"   Orchestrator : {settings.orchestrator_model}")
    print(f"   Agent Model  : {settings.agent_model}")
    print(f"   Fast Model   : {settings.fast_model}")
    print(f"   Frontend     : {settings.frontend_url}")
    print("=" * 50)
    yield
    print("[STOP] AI Money Mentor — Shutting Down")


app = FastAPI(
    title="AI Money Mentor",
    description="AI-powered personal finance mentor — multi-agent system with voice, chat, and WhatsApp",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        settings.frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(agents.router, prefix="/api/agents", tags=["Agents"])
app.include_router(whatsapp.router, prefix="/api/whatsapp", tags=["WhatsApp"])
app.include_router(voice.router, prefix="/api/voice", tags=["Voice"])
app.include_router(aa.router, prefix="/api/aa", tags=["Account Aggregator"])
app.include_router(upload.router, prefix="/api/upload", tags=["File Upload"])


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "AI Money Mentor",
        "version": "1.0.0",
        "models": {
            "orchestrator": settings.orchestrator_model,
            "agents": settings.agent_model,
            "fast": settings.fast_model,
        },
    }
