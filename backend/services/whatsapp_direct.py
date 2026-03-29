"""WhatsApp messaging via WAHA (self-hosted) with pywhatkit fallback.

WAHA (WhatsApp HTTP API): Docker container exposing REST API.
  Run: docker run -it -p 3001:3000/e WHATSAPP_DEFAULT_ENGINE=WEBJS devlikeapro/waha
  Scan QR: http://localhost:3001/dashboard
  Docs: https://waha.devlike.pro/docs

Fallback: pywhatkit (opens Chrome, sends via WhatsApp Web)
"""
import httpx
from typing import Optional

WAHA_BASE = "http://localhost:3001"
WAHA_SESSION = "default"


async def _waha_available() -> bool:
    """Check if WAHA Docker container is running."""
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"{WAHA_BASE}/api/sessions")
            return resp.status_code == 200
    except Exception:
        return False


async def send_message_waha(to: str, text: str) -> dict:
    """Send WhatsApp message via WAHA REST API.

    Args:
        to: Phone number with country code (e.g. '919876543210')
        text: Message body
    """
    payload = {
        "session": WAHA_SESSION,
        "chatId": f"{to}@c.us",
        "text": text,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{WAHA_BASE}/api/sendText",
                json=payload,
            )
            if resp.status_code == 200 or resp.status_code == 201:
                return {"status": "sent", "method": "waha", "response": resp.json()}
            else:
                return {"status": "failed", "method": "waha", "detail": resp.text[:300]}
    except Exception as e:
        return {"status": "error", "method": "waha", "detail": str(e)}


def send_message_pywhatkit(to: str, text: str) -> dict:
    """Send WhatsApp message via pywhatkit (browser automation fallback).

    Opens Chrome/WhatsApp Web and sends the message.
    Requires: pip install pywhatkit
    """
    try:
        import pywhatkit
        # pywhatkit needs +country_code format
        phone = to if to.startswith("+") else f"+{to}"
        # Send instantly (wait_time=10s for WhatsApp Web to load, close_time=3s)
        pywhatkit.sendwhatmsg_instantly(phone, text, wait_time=10, tab_close=True, close_time=3)
        return {"status": "sent", "method": "pywhatkit"}
    except ImportError:
        return {"status": "error", "method": "pywhatkit", "detail": "pywhatkit not installed. pip install pywhatkit"}
    except Exception as e:
        return {"status": "error", "method": "pywhatkit", "detail": str(e)}


async def send_message_twilio(to: str, text: str) -> dict:
    """Send via Twilio (original implementation, kept as fallback)."""
    try:
        from config import settings
        from twilio.rest import Client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        wa_to = to if to.startswith("whatsapp:") else f"whatsapp:+{to}"
        wa_from = getattr(settings, "twilio_whatsapp_from", "placeholder")
        message = client.messages.create(from_=wa_from, body=text, to=wa_to)
        return {"status": "sent", "method": "twilio", "sid": message.sid}
    except Exception as e:
        return {"status": "error", "method": "twilio", "detail": str(e)}


async def send_whatsapp(to: str, text: str) -> dict:
    """Smart WhatsApp sender â€” tries WAHA first, then pywhatkit, then Twilio.

    Args:
        to: Phone number (e.g. '919876543210' or '+919876543210')
        text: Message text
    """
    # Normalize phone
    phone = to.replace("+", "").replace(" ", "").replace("-", "")
    if phone.startswith("whatsapp:"):
        phone = phone.replace("whatsapp:", "").replace("+", "")

    # Try WAHA (Docker) first
    if await _waha_available():
        result = await send_message_waha(phone, text)
        if result["status"] == "sent":
            return result

    # Try pywhatkit (browser)
    result = send_message_pywhatkit(phone, text)
    if result["status"] == "sent":
        return result

    # Last resort: Twilio
    return await send_message_twilio(phone, text)


async def get_waha_qr() -> dict:
    """Get QR code from WAHA for scanning (first-time setup)."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{WAHA_BASE}/api/screenshot?session={WAHA_SESSION}")
            if resp.status_code == 200:
                return {
                    "status": "qr_available",
                    "dashboard_url": f"{WAHA_BASE}/dashboard",
                    "hint": f"Open {WAHA_BASE}/dashboard in browser to scan QR code",
                }
            return {"status": "no_qr", "detail": "Session may already be authenticated"}
    except Exception as e:
        return {
            "status": "waha_not_running",
            "detail": str(e),
            "hint": "Run: docker run -it -p 3001:3000 -e WHATSAPP_DEFAULT_ENGINE=WEBJS devlikeapro/waha",
        }


async def get_messaging_status() -> dict:
    """Check which WhatsApp methods are available."""
    waha_ok = await _waha_available()
    try:
        import pywhatkit
        pywhatkit_ok = True
    except ImportError:
        pywhatkit_ok = False

    twilio_ok = False
    try:
        from config import settings
        twilio_ok = settings.twilio_account_sid not in ("placeholder", "")
    except Exception:
        pass

    methods = []
    if waha_ok:
        methods.append("waha")
    if pywhatkit_ok:
        methods.append("pywhatkit")
    if twilio_ok:
        methods.append("twilio")

    return {
        "available_methods": methods,
        "primary": methods[0] if methods else "none",
        "waha_running": waha_ok,
        "pywhatkit_installed": pywhatkit_ok,
        "twilio_configured": twilio_ok,
    }
