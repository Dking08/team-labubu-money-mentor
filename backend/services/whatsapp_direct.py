"""WhatsApp messaging via WAHA (self-hosted) with pywhatkit and Twilio fallbacks."""

import re

import httpx

from config import settings


def _waha_headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if settings.waha_api_key:
        headers["X-Api-Key"] = settings.waha_api_key
    return headers


def _normalize_phone(value: str) -> str:
    cleaned = (value or "").strip()
    cleaned = cleaned.replace("whatsapp:", "").replace("@c.us", "")
    cleaned = re.sub(r"[^\d]", "", cleaned)
    return cleaned


def resolve_recipient(to: str | None = None) -> str:
    raw = to or settings.whatsapp_default_to or settings.twilio_whatsapp_to
    phone = _normalize_phone(raw)
    if not phone:
        raise ValueError(
            "No WhatsApp recipient configured. Set WHATSAPP_DEFAULT_TO or pass a 'to' value."
        )
    return phone


async def _waha_probe() -> dict:
    """Check if the WAHA container is reachable and whether auth is satisfied."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                f"{settings.waha_base_url}/api/sessions",
                headers=_waha_headers(),
            )
    except Exception as exc:
        return {"available": False, "status": "offline", "detail": str(exc)}

    if resp.status_code == 200:
        return {"available": True, "status": "ready"}
    if resp.status_code == 401:
        return {
            "available": False,
            "status": "auth_required",
            "detail": (
                "WAHA is reachable but requires X-Api-Key authentication. "
                "Set WAHA_API_KEY in backend/.env to match your Docker container."
            ),
        }

    return {
        "available": False,
        "status": "unexpected_response",
        "detail": resp.text[:300],
    }


async def send_message_waha(to: str, text: str) -> dict:
    """Send WhatsApp message via WAHA REST API."""
    payload = {
        "session": settings.waha_session,
        "chatId": f"{to}@c.us",
        "text": text,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{settings.waha_base_url}/api/sendText",
                headers=_waha_headers(),
                json=payload,
            )
    except Exception as exc:
        return {"status": "error", "method": "waha", "detail": str(exc)}

    if resp.status_code in (200, 201):
        return {"status": "sent", "method": "waha", "response": resp.json()}
    if resp.status_code == 401:
        return {
            "status": "auth_required",
            "method": "waha",
            "detail": (
                "WAHA rejected the request with 401 Unauthorized. "
                "Add WAHA_API_KEY in backend/.env with the same key configured on the container."
            ),
        }

    return {"status": "failed", "method": "waha", "detail": resp.text[:300]}


def send_message_pywhatkit(to: str, text: str) -> dict:
    """Send WhatsApp message via pywhatkit browser automation."""
    try:
        import pywhatkit

        phone = to if to.startswith("+") else f"+{to}"
        pywhatkit.sendwhatmsg_instantly(phone, text, wait_time=10, tab_close=True, close_time=3)
        return {"status": "sent", "method": "pywhatkit"}
    except ImportError:
        return {
            "status": "error",
            "method": "pywhatkit",
            "detail": "pywhatkit not installed. pip install pywhatkit",
        }
    except Exception as exc:
        return {"status": "error", "method": "pywhatkit", "detail": str(exc)}


async def send_message_twilio(to: str, text: str) -> dict:
    """Send via Twilio as a final fallback."""
    try:
        from twilio.rest import Client

        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        wa_to = f"whatsapp:+{to}"
        message = client.messages.create(
            from_=settings.twilio_whatsapp_from,
            body=text,
            to=wa_to,
        )
        return {"status": "sent", "method": "twilio", "sid": message.sid}
    except Exception as exc:
        return {"status": "error", "method": "twilio", "detail": str(exc)}


async def send_whatsapp(to: str | None, text: str) -> dict:
    """Try WAHA first, then pywhatkit, then Twilio."""
    phone = resolve_recipient(to)

    waha_status = await _waha_probe()
    if waha_status["available"]:
        result = await send_message_waha(phone, text)
        if result["status"] == "sent":
            return result
    else:
        result = {
            "status": waha_status["status"],
            "method": "waha",
            "detail": waha_status.get("detail", ""),
        }

    pywhatkit_result = send_message_pywhatkit(phone, text)
    if pywhatkit_result["status"] == "sent":
        return pywhatkit_result

    twilio_result = await send_message_twilio(phone, text)
    if twilio_result["status"] == "sent":
        return twilio_result

    return {
        "status": "failed",
        "phone": phone,
        "attempts": [result, pywhatkit_result, twilio_result],
    }


async def get_waha_qr() -> dict:
    """Return a dashboard hint or explain why the QR cannot be fetched."""
    probe = await _waha_probe()
    if probe["status"] == "auth_required":
        return {
            "status": "auth_required",
            "dashboard_url": f"{settings.waha_base_url}/dashboard",
            "detail": probe["detail"],
        }
    if not probe["available"]:
        return {
            "status": "waha_not_running",
            "detail": probe.get("detail", ""),
            "hint": (
                "Run: docker run -it -p 3001:3000 "
                "-e WHATSAPP_DEFAULT_ENGINE=WEBJS "
                "devlikeapro/waha"
            ),
        }

    return {
        "status": "dashboard_available",
        "dashboard_url": f"{settings.waha_base_url}/dashboard",
        "hint": f"Open {settings.waha_base_url}/dashboard and scan the QR for session '{settings.waha_session}'.",
    }


async def get_messaging_status() -> dict:
    """Check which WhatsApp methods are available."""
    probe = await _waha_probe()
    try:
        import pywhatkit  # noqa: F401

        pywhatkit_ok = True
    except ImportError:
        pywhatkit_ok = False

    twilio_ok = settings.twilio_account_sid not in ("placeholder", "")

    methods = []
    if probe["available"]:
        methods.append("waha")
    if pywhatkit_ok:
        methods.append("pywhatkit")
    if twilio_ok:
        methods.append("twilio")

    return {
        "available_methods": methods,
        "primary": methods[0] if methods else "none",
        "waha_running": probe["status"] != "offline",
        "waha_status": probe["status"],
        "waha_detail": probe.get("detail"),
        "waha_base_url": settings.waha_base_url,
        "waha_session": settings.waha_session,
        "pywhatkit_installed": pywhatkit_ok,
        "twilio_configured": twilio_ok,
        "default_recipient": _normalize_phone(settings.whatsapp_default_to or settings.twilio_whatsapp_to),
    }
