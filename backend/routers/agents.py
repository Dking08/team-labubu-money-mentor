"""Agent-specific direct endpoints."""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from data.mock_data import get_mock_user, get_mock_cams
from agents.fire_planner import run_fire_planner
from agents.money_health import run_money_health
from agents.tax_wizard import run_tax_wizard
from agents.life_event import run_life_event
from agents.mf_xray import run_mf_xray
from agents.couple_planner import run_couple_planner

router = APIRouter()


class AgentRequest(BaseModel):
    query: str = ""
    user_id: str = "demo_user"


@router.post("/fire")
async def fire_planner(req: AgentRequest):
    user = get_mock_user()
    return await run_fire_planner(user, req.query or "Create my FIRE plan")


@router.post("/health-score")
async def health_score(req: AgentRequest):
    user = get_mock_user()
    return await run_money_health(user, req.query or "Assess my financial health")


@router.post("/tax-wizard")
async def tax_wizard(req: AgentRequest):
    user = get_mock_user()
    return await run_tax_wizard(user, req.query or "Optimize my taxes")


@router.post("/life-event")
async def life_event(req: AgentRequest):
    user = get_mock_user()
    return await run_life_event(user, req.query or "I got a ₹2 lakh bonus")


@router.post("/mf-xray")
async def mf_xray(req: AgentRequest):
    user = get_mock_user()
    cams = get_mock_cams()
    return await run_mf_xray(user, req.query or "Analyze my mutual fund portfolio", cams)


@router.post("/couple-planner")
async def couple_planner(req: AgentRequest):
    user = get_mock_user()
    return await run_couple_planner(user, req.query or "Plan finances with my partner")
