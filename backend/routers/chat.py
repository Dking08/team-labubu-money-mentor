"""Chat router — main conversational endpoint."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from agents.orchestrator import process_message
from data.mock_data import get_mock_user

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    user_id: str = "demo_user"


class ChatResponse(BaseModel):
    agent_name: str
    response_text: str
    data: Optional[dict] = None
    ui_action: Optional[dict] = None
    follow_up_questions: list = []
    whatsapp_summary: Optional[str] = None


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Process a chat message through the multi-agent orchestrator."""
    try:
        user_data = get_mock_user()
        result = await process_message(
            user_id=req.user_id,
            message=req.message,
            user_data=user_data,
        )
        return ChatResponse(
            agent_name=result.get("agent_name", "orchestrator"),
            response_text=result.get("response_text", ""),
            data=result.get("data"),
            ui_action=result.get("ui_action"),
            follow_up_questions=result.get("follow_up_questions", []),
            whatsapp_summary=result.get("whatsapp_summary"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/profile")
async def get_profile():
    """Get current user profile (mock for demo)."""
    return get_mock_user()


@router.get("/user/memories")
async def get_memories(user_id: str = "demo_user"):
    """Get all stored memories for a user."""
    try:
        from memory.mem0_layer import get_all_memories
        return {"memories": get_all_memories(user_id)}
    except Exception:
        return {"memories": []}
