"""Voice endpoint — receives audio, transcribes with Groq Whisper, processes, returns."""
from fastapi import APIRouter, UploadFile, File, WebSocket, WebSocketDisconnect
from config import settings
from agents.orchestrator import process_message
from data.mock_data import get_mock_user
import httpx
import json
import base64

router = APIRouter()


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Transcribe audio using Groq Whisper API."""
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {settings.groq_api_key}"}

    async with httpx.AsyncClient(timeout=30) as client:
        files = {"file": (filename, audio_bytes, "audio/webm")}
        data = {"model": "whisper-large-v3", "language": "en"}
        response = await client.post(url, headers=headers, files=files, data=data)
        response.raise_for_status()
        return response.json().get("text", "")


@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    """Transcribe uploaded audio file."""
    audio_bytes = await file.read()
    text = await transcribe_audio(audio_bytes, file.filename)
    return {"text": text}


@router.post("/process")
async def voice_process(file: UploadFile = File(...)):
    """Full pipeline: transcribe → orchestrator → response."""
    audio_bytes = await file.read()
    transcript = await transcribe_audio(audio_bytes, file.filename)

    if not transcript.strip():
        return {"transcript": "", "response": None}

    result = await process_message(
        user_id="demo_user",
        message=transcript,
        user_data=get_mock_user(),
    )

    return {
        "transcript": transcript,
        "response": result,
    }


@router.websocket("/ws")
async def voice_websocket(websocket: WebSocket):
    """WebSocket for real-time voice conversation."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)

            if msg.get("type") == "audio":
                # Decode base64 audio
                audio_bytes = base64.b64decode(msg["data"])
                transcript = await transcribe_audio(audio_bytes)

                # Send transcript immediately
                await websocket.send_json({
                    "type": "transcript",
                    "text": transcript,
                })

                if transcript.strip():
                    # Process through orchestrator
                    result = await process_message(
                        user_id="demo_user",
                        message=transcript,
                        user_data=get_mock_user(),
                    )

                    await websocket.send_json({
                        "type": "response",
                        "agent_name": result.get("agent_name", ""),
                        "text": result.get("response_text", ""),
                        "data": result.get("data"),
                        "ui_action": result.get("ui_action"),
                    })

            elif msg.get("type") == "text":
                # Direct text input (fallback)
                result = await process_message(
                    user_id="demo_user",
                    message=msg.get("text", ""),
                    user_data=get_mock_user(),
                )
                await websocket.send_json({
                    "type": "response",
                    "agent_name": result.get("agent_name", ""),
                    "text": result.get("response_text", ""),
                    "data": result.get("data"),
                    "ui_action": result.get("ui_action"),
                })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
