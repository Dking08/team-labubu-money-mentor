"""Money Health Score Agent — 6-dimension financial wellness scoring."""
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from config import settings
import json


HEALTH_SYSTEM_PROMPT = """You are the Money Health Score agent in AI Money Mentor. You evaluate a user's financial wellness across 6 dimensions and provide a comprehensive score with actionable recommendations.

The 6 dimensions (each scored 0-100):
1. Emergency Preparedness — Does the user have 6 months of expenses saved?
2. Insurance Coverage — Term life (10x income), health (₹10L+), accident cover
3. Investment Diversification — Proper asset allocation across equity, debt, gold
4. Debt Health — Debt-to-income ratio, high-interest debt, EMI burden
5. Tax Efficiency — Are they maximizing deductions? Right regime?
6. Retirement Readiness — On track for retirement corpus?

Overall score = weighted average (emergency: 20%, insurance: 15%, investment: 20%, debt: 15%, tax: 15%, retirement: 15%)

For each dimension, provide:
- Score (0-100)
- Status (Critical / Needs Work / Good / Excellent)
- Top recommendation

Be specific with Indian context. Use ₹ amounts. Reference specific products."""


def calculate_health_scores(user_data: dict) -> dict:
    """Calculate raw health scores from user data."""
    monthly_exp = user_data.get("monthly_expenses", 45000)
    emergency = user_data.get("emergency_fund", 0)
    income = user_data.get("annual_income", 1500000)
    investments = user_data.get("investments", {})
    loans = user_data.get("loans", [])
    insurance = user_data.get("insurance", {})

    # 1. Emergency (target: 6 months expenses)
    target_emergency = monthly_exp * 6
    emergency_score = min(100, int(emergency / target_emergency * 100))

    # 2. Insurance
    term_target = income * 10
    term_life = insurance.get("term_life", 0) if isinstance(insurance, dict) else 0
    health_ins = insurance.get("health", 0) if isinstance(insurance, dict) else 0
    ins_score = 0
    ins_score += min(50, int(term_life / term_target * 50)) if term_target > 0 else 0
    ins_score += min(50, int(health_ins / 1000000 * 50))

    # 3. Investment Diversification
    total_inv = sum(investments.values())
    equity = investments.get("equity_mf", 0) + investments.get("stocks", 0) + investments.get("elss", 0)
    debt = investments.get("ppf", 0) + investments.get("fd", 0) + investments.get("epf", 0)
    equity_pct = equity / max(total_inv, 1) * 100
    inv_score = 70 if 40 <= equity_pct <= 80 else 40 if equity_pct > 0 else 20
    if investments.get("nps", 0) > 0:
        inv_score += 15
    if len([v for v in investments.values() if v > 0]) >= 4:
        inv_score += 15
    inv_score = min(100, inv_score)

    # 4. Debt Health
    total_emi = sum(l.get("emi", 0) for l in loans)
    monthly_income = income / 12
    emi_ratio = total_emi / max(monthly_income, 1) * 100
    debt_score = 100 if emi_ratio == 0 else 80 if emi_ratio < 20 else 50 if emi_ratio < 40 else 20

    # 5. Tax Efficiency (simplified)
    total_80c = investments.get("ppf", 0) + investments.get("elss", 0)
    tax_score = min(100, int(total_80c / 150000 * 50) + (25 if investments.get("nps", 0) > 0 else 0) + 25)

    # 6. Retirement
    age = user_data.get("age", 28)
    years_to_retire = 60 - age
    target_corpus = monthly_exp * 12 * 25  # 4% rule
    retire_score = min(100, int(total_inv / target_corpus * 100 * 3))

    overall = int(
        emergency_score * 0.20 + ins_score * 0.15 + inv_score * 0.20 +
        debt_score * 0.15 + tax_score * 0.15 + retire_score * 0.15
    )

    return {
        "overall_score": overall,
        "dimensions": {
            "emergency": {"score": emergency_score, "status": _status(emergency_score)},
            "insurance": {"score": ins_score, "status": _status(ins_score)},
            "investment": {"score": inv_score, "status": _status(inv_score)},
            "debt": {"score": debt_score, "status": _status(debt_score)},
            "tax": {"score": tax_score, "status": _status(tax_score)},
            "retirement": {"score": retire_score, "status": _status(retire_score)},
        },
    }


def _status(score: int) -> str:
    if score >= 80: return "Excellent"
    if score >= 60: return "Good"
    if score >= 40: return "Needs Work"
    return "Critical"


async def run_money_health(user_data: dict, query: str = "") -> dict:
    scores = calculate_health_scores(user_data)
    context = f"User Data: {json.dumps(user_data, indent=2, default=str)}\n\nHealth Scores: {json.dumps(scores, indent=2)}\n\nUser Query: {query or 'Give me my complete financial health assessment.'}"
    llm = ChatGroq(model=settings.fast_model, temperature=0.3, api_key=settings.groq_api_key)
    messages = [SystemMessage(content=HEALTH_SYSTEM_PROMPT), HumanMessage(content=context)]
    response = await llm.ainvoke(messages)
    return {
        "agent_name": "money_health",
        "response_text": response.content,
        "data": scores,
        "ui_action": {"action": "navigate", "page": "/health-score", "data": scores},
    }
