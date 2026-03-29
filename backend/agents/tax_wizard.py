"""Tax Wizard Agent — Old vs New regime analysis and deduction optimization."""
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from config import settings
from agents.tools.tax_calculator import compare_regimes, find_missed_deductions
import json

TAX_SYSTEM_PROMPT = """You are the Tax Wizard agent in AI Money Mentor. You are an expert in Indian income tax planning.

Your capabilities:
- Compare Old vs New tax regime with user's actual numbers
- Identify every deduction they're missing (80C, 80D, 80CCD, HRA, Section 24)
- Suggest tax-saving investments ranked by risk profile and liquidity
- Model salary restructuring for tax optimization
- Explain in simple language with exact ₹ savings

Tax-saving investment hierarchy (by return potential):
1. ELSS Mutual Funds (80C) — 3yr lock-in, high return potential
2. NPS (80CCD) — Additional ₹50K deduction, retirement focused
3. PPF (80C) — Safe, 15yr lock-in, guaranteed returns
4. SSY/NSC (80C) — For specific profiles
5. Term/Health Insurance (80D) — Essential protection

Always show exact tax saved in ₹. Be specific and actionable."""


async def run_tax_wizard(user_data: dict, query: str) -> dict:
    income = user_data.get("annual_income", 1500000)
    investments = user_data.get("investments", {})
    deductions = {
        "80c": investments.get("ppf", 0) + investments.get("elss", 0),
        "80d": 25000 if user_data.get("insurance", {}).get("health", 0) > 0 else 0,
        "80ccd_1b": min(investments.get("nps", 0), 50000),
        "hra": 0,
    }
    if user_data.get("has_hra") and user_data.get("rent_paid", 0) > 0:
        basic = income * 0.4
        hra_received = income * 0.2
        rent_minus = user_data["rent_paid"] * 12 - 0.1 * basic
        city_pct = 0.5 if user_data.get("metro_city") else 0.4
        deductions["hra"] = min(hra_received, rent_minus, basic * city_pct)

    comparison = compare_regimes(income, deductions)
    missed = find_missed_deductions(user_data)

    context = f"""User: Income ₹{income:,.0f}, Age {user_data.get('age', 28)}, Risk: {user_data.get('risk_profile', 'moderate')}
Tax Comparison: {json.dumps(comparison, indent=2)}
Missed Deductions: {json.dumps(missed, indent=2)}
Query: {query}"""

    llm = ChatGroq(model=settings.agent_model, temperature=0.3, api_key=settings.groq_api_key)
    messages = [SystemMessage(content=TAX_SYSTEM_PROMPT), HumanMessage(content=context)]
    response = await llm.ainvoke(messages)

    return {
        "agent_name": "tax_wizard",
        "response_text": response.content,
        "data": {"comparison": comparison, "missed_deductions": missed},
        "ui_action": {"action": "navigate", "page": "/tax-wizard", "data": comparison},
    }
