"""
AI Money Mentor — Configuration
Loads environment variables and provides typed settings.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Groq ──────────────────────────────────────────
    groq_api_key: str = "gsk_placeholder"

    # ── Google AI (Gemini) ────────────────────────────
    google_api_key: str = "placeholder"

    # ── Text To Speech ────────────────────────────────
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "JBFqnCBsd6RMkjVDRZzb"
    elevenlabs_model_id: str = "eleven_multilingual_v2"

    # ── Supabase ──────────────────────────────────────
    supabase_url: str = "https://placeholder.supabase.co"
    supabase_key: str = "placeholder"

    # ── Twilio (WhatsApp) ─────────────────────────────
    twilio_account_sid: str = "placeholder"
    twilio_auth_token: str = "placeholder"
    twilio_whatsapp_from: str = "placeholder"
    twilio_whatsapp_to: str = ""

    # ── WAHA (WhatsApp HTTP API) ──────────────────────
    waha_base_url: str = "http://localhost:3001"
    waha_session: str = "default"
    waha_api_key: str = ""
    whatsapp_default_to: str = ""

    # ── Setu Account Aggregator ───────────────────────
    setu_client_id: str = "7ae0553f-f10f-475d-88ea-4a5f94ff3723" # Playground, same for all
    setu_client_secret: str = "1qfpRYp0pgQFuRUhrsIOvBj6vku15Yc2" # Playground, same for all
    setu_product_instance_id: str = "orgservice-prod"

    # ── Model Routing ─────────────────────────────────
    orchestrator_model: str = "openai/gpt-oss-120b"
    agent_model: str = "llama-3.3-70b-versatile"
    fast_model: str = "llama-3.1-8b-instant"
    gemini_model: str = "gemini-3.1-flash-lite-preview"

    # ── App ───────────────────────────────────────────
    app_env: str = "development"
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
