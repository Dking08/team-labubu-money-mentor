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

    # â”€â”€ Text To Speech â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "JBFqnCBsd6RMkjVDRZzb"
    elevenlabs_model_id: str = "eleven_multilingual_v2"

    # â”€â”€ Supabase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    supabase_url: str = "https://placeholder.supabase.co"
    supabase_key: str = "placeholder"

    # â”€â”€ Twilio (WhatsApp) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    twilio_account_sid: str = "placeholder"
    twilio_auth_token: str = "placeholder"
    twilio_whatsapp_from: str = "placeholder"
    twilio_whatsapp_to: str = ""

    # â”€â”€ WAHA (WhatsApp HTTP API) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    waha_base_url: str = "http://localhost:3001"
    waha_session: str = "default"
    waha_api_key: str = ""
    whatsapp_default_to: str = ""

    # â”€â”€ Setu Account Aggregator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    setu_client_id: str = "7ae0553f-f10f-475d-88ea-4a5f94ff3723" # Playground, same for all
    setu_client_secret: str = "1qfpRYp0pgQFuRUhrsIOvBj6vku15Yc2" # Playground, same for all
    setu_product_instance_id: str = "orgservice-prod"

    # â”€â”€ Model Routing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    orchestrator_model: str = "openai/gpt-oss-120b"
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
