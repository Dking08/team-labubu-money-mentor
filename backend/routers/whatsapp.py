"""WhatsApp webhook & messaging via Twilio."""
from fastapi import APIRouter, Request, Response
from config import settings
from agents.orchestrator import process_message
from data.mock_data import get_mock_user

router = APIRouter()


async def send_whatsapp(to: str, body: str) -> dict:
    """Send a WhatsApp message via Twilio."""
    try:
        from twilio.rest import Client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        message = client.messages.create(
            from_=settings.twilio_whatsapp_from,
            body=body,
            to=to or settings.twilio_whatsapp_to,
        )
        return {"status": "sent", "sid": message.sid}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@router.post("/webhook")
async def whatsapp_webhook(request: Request):
    """Handle incoming WhatsApp messages from Twilio."""
    form = await request.form()
    incoming_msg = form.get("Body", "").strip()
    from_number = form.get("From", "")

    if not incoming_msg:
        return Response(content="<Response></Response>", media_type="application/xml")

    # Process through orchestrator
    result = await process_message(user_id="whatsapp_user", message=incoming_msg, user_data=get_mock_user())
    reply = result.get("response_text", "Sorry, I couldn't process that.")
    # Truncate for WhatsApp (1600 char limit)
    if len(reply) > 1500:
        reply = reply[:1497] + "..."

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{reply}</Message>
</Response>"""
    return Response(content=twiml, media_type="application/xml")


@router.post("/send")
async def send_message(to: str = None, body: str = ""):
    """Send a proactive WhatsApp message."""
    return await send_whatsapp(to or settings.twilio_whatsapp_to, body)


@router.post("/send-summary")
async def send_summary(summary: str = ""):
    """Send a meeting/chat summary via WhatsApp."""
    body = f"📊 *AI Money Mentor Summary*\n\n{summary}\n\n_Reply with any question for instant advice!_"
    return await send_whatsapp(settings.twilio_whatsapp_to, body)
