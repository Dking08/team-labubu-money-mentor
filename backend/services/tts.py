"""Text-to-speech helpers for the AI meeting experience."""

import re

import httpx

from config import settings

ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech"


def _prepare_text(text: str) -> str:
    clean = (text or "").strip()
    clean = clean.replace("₹", "Rs ")
    clean = re.sub(r"\*\*(.*?)\*\*", r"\1", clean)
    clean = re.sub(r"\s+", " ", clean)
    return clean[:1500]


async def synthesize_speech(text: str) -> tuple[bytes, str]:
    """Generate spoken audio using ElevenLabs."""
    if not settings.elevenlabs_api_key:
        raise ValueError("ELEVENLABS_API_KEY is not configured.")

    clean_text = _prepare_text(text)
    if not clean_text:
        raise ValueError("No text provided for speech generation.")

    url = f"{ELEVENLABS_TTS_URL}/{settings.elevenlabs_voice_id}"
    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
    }
    payload = {
        "text": clean_text,
        "model_id": settings.elevenlabs_model_id,
        "voice_settings": {
            "stability": 0.45,
            "similarity_boost": 0.8,
            "style": 0.2,
            "use_speaker_boost": True,
        },
    }

    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.content, response.headers.get("content-type", "audio/mpeg")
