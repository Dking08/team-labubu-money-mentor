"""Agent response models."""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class UIAction(BaseModel):
    """Command sent to frontend to control the UI (for voice meeting)."""
    action: str  # "navigate", "show_chart", "highlight", "open_panel"
    page: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


class AgentResponse(BaseModel):
    agent_name: str
    response_text: str
    data: Optional[Dict[str, Any]] = None
    ui_action: Optional[UIAction] = None
    confidence: float = 0.9
    follow_up_questions: List[str] = []
    whatsapp_summary: Optional[str] = None
