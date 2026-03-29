"""Couple's Money Planner Agent — Joint financial optimization."""
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from config import settings
import json

COUPLE_SYSTEM_PROMPT = """You are the Couple's Money Planner agent. India's first AI-powered joint financial planning tool.

You optimize across both partners' incomes for:
- HRA claim optimization (who should claim?)
- NPS matching and tax deduction split
- SIP allocation for tax efficiency across both
- Joint vs individual insurance recommendations
- Combined net worth tracking and goal planning

Consider Indian tax law: each partner files separately. Optimize total household tax burden.
Be warm, inclusive, and practical."""


async def run_couple_planner(user_data: dict, query: str) -> dict:
    partner = user_data.get("partner") or {
        "name": "Priya Sharma", "age": 27, "annual_income": 1200000,
        "monthly_expenses": 35000, "investments": {"ppf": 100000, "elss": 50000, "epf": 300000},
        "risk_profile": "moderate", "has_hra": True, "rent_paid": 20000, "metro_city": True,
    }
    combined_income = user_data.get("annual_income", 0) + partner.get("annual_income", 0)
    combined_investments = sum(user_data.get("investments", {}).values()) + sum(partner.get("investments", {}).values())

    context = f"""Partner 1: {user_data.get('name', 'User')} — Income ₹{user_data.get('annual_income', 0):,.0f}
Partner 2: {partner.get('name', 'Partner')} — Income ₹{partner.get('annual_income', 0):,.0f}
Combined Income: ₹{combined_income:,.0f}
Combined Investments: ₹{combined_investments:,.0f}
Query: {query}"""

    llm = ChatGroq(model=settings.agent_model, temperature=0.3, api_key=settings.groq_api_key)
    messages = [SystemMessage(content=COUPLE_SYSTEM_PROMPT), HumanMessage(content=context)]
    response = await llm.ainvoke(messages)

    return {
        "agent_name": "couple_planner",
        "response_text": response.content,
        "data": {"combined_income": combined_income, "combined_investments": combined_investments},
    }
