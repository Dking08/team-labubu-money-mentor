"""
AI Money Mentor â€” Configuration
Loads environment variables and provides typed settings.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # â”€â”€ Groq â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    groq_api_key: str = "gsk_placeholder"

    # â”€â”€ Google AI (Gemini) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    google_api_key: str = "placeholder"

    # â”€â”€ Supabase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    supabase_url: str = "https://placeholder.supabase.co"
    supabase_key: str = "placeholder"

    # â”€â”€ Twilio (WhatsApp) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    twilio_account_sid: str = "placeholder"
    twilio_auth_token: str = "placeholder"
    twilio_whatsapp_from: str = "placeholder"
    twilio_whatsapp_to: str = "whatsapp:+911234567890"

    # â”€â”€ Model Routing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    orchestrator_model: str = "llama-3.3-70b-specdec"
    agent_model: str = "llama-3.3-70b-versatile"
    fast_model: str = "llama-3.1-8b-instant"
    gemini_model: str = "gemini-3.1-flash-lite-preview"

    # â”€â”€ App â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    app_env: str = "development"
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
