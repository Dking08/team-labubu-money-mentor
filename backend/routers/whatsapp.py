"""WhatsApp webhook and messaging — WAHA primary, Twilio fallback."""
from fastapi import APIRouter, Request, Response
from pydantic import BaseModel
from typing import Optional
from config import settings
from agents.orchestrator import process_message
from data.mock_data import get_mock_user
from services.whatsapp_direct import send_whatsapp, get_waha_qr, get_messaging_status

router = APIRouter()


class SendRequest(BaseModel):
    to: Optional[str] = None
    body: str = ""


class SummaryRequest(BaseModel):
    summary: str = ""
    to: Optional[str] = None


@router.get("/status")
async def whatsapp_status():
    """Check which WhatsApp methods are available (WAHA, pywhatkit, Twilio)."""
    return await get_messaging_status()


@router.get("/qr")
async def whatsapp_qr():
    """Get WAHA QR code status for initial setup."""
    return await get_waha_qr()


@router.post("/webhook")
async def whatsapp_webhook(request: Request):
    """Handle incoming WhatsApp messages from Twilio webhook."""
    form = await request.form()
    incoming_msg = form.get("Body", "").strip()
    from_number = form.get("From", "")

    if not incoming_msg:
        return Response(content="<Response></Response>", media_type="application/xml")

    result = await process_message(
        user_id="whatsapp_user", message=incoming_msg, user_data=get_mock_user()
    )
    reply = result.get("response_text", "Sorry, I could not process that.")
    if len(reply) > 1500:
        reply = reply[:1497] + "..."

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{reply}</Message>
</Response>"""
    return Response(content=twiml, media_type="application/xml")


@router.post("/send")
async def send_message(req: SendRequest):
    """Send a WhatsApp message using the best available method."""
    to = req.to or "919876543210"
    return await send_whatsapp(to, req.body)


@router.post("/send-summary")
async def send_summary(req: SummaryRequest):
    """Send a meeting/chat summary via WhatsApp."""
    body = f"*ET Money Mentor — Summary*\n\n{req.summary}\n\n_Reply with any question for instant advice._"
    to = req.to or "919876543210"
    return await send_whatsapp(to, body)
