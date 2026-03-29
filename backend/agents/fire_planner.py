"""FIRE Planner Agent — Builds complete financial independence roadmaps."""
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from config import settings
from agents.tools.fire_calculator import fire_roadmap
from agents.tools.sip_calculator import goal_sip_plan
import json


FIRE_SYSTEM_PROMPT = """You are the FIRE Planner agent in AI Money Mentor — India's smartest financial planning platform. You specialize in Financial Independence, Retire Early (FIRE) planning for Indian users.

Your capabilities:
- Calculate FIRE number, CoastFIRE, LeanFIRE, FatFIRE
- Create month-by-month financial roadmaps
- Design SIP strategies per goal with asset allocation
- Identify insurance gaps and emergency fund targets
- Suggest tax-saving moves aligned with FIRE goals

Always use the Indian context:
- Reference INR amounts
- Consider Indian tax laws (80C, NPS, etc.)
- Recommend Indian mutual fund categories (Large Cap, Mid Cap, Small Cap, ELSS, Flexi Cap)
- Account for Indian inflation (~6-7%)

You will receive the user's financial data and the FIRE calculation results. Provide:
1. A clear FIRE roadmap summary
2. Monthly SIP allocation per goal
3. Asset allocation recommendation based on risk profile
4. Specific action items (e.g., "Start ₹5,000 SIP in Parag Parikh Flexi Cap")
5. Insurance & emergency fund gaps

Be encouraging but realistic. Use specific numbers. Format with clear sections."""


async def run_fire_planner(user_data: dict, query: str) -> dict:
    """Run the FIRE planner agent."""
    # Calculate FIRE metrics
    age = user_data.get("age", 28)
    income = user_data.get("annual_income", 1500000)
    expenses = user_data.get("monthly_expenses", 45000) * 12
    savings = sum(user_data.get("investments", {}).values())
    monthly_invest = user_data.get("monthly_take_home", 100000) - user_data.get("monthly_expenses", 45000)
    monthly_invest -= sum(l.get("emi", 0) for l in user_data.get("loans", []))

    roadmap = fire_roadmap(
        age=age, annual_income=income, annual_expenses=expenses,
        current_savings=savings, monthly_investment=monthly_invest,
        retire_age=50, return_rate=12,
    )

    # Generate SIP plan for goals
    goals = user_data.get("goals", [])
    sip_plan = goal_sip_plan(
        [{"name": g.get("name", ""), "target": g.get("target", 0),
          "current_savings": g.get("current_savings", 0),
          "timeline_months": g.get("timeline_months", 60)}
         for g in goals],
        risk_profile=user_data.get("risk_profile", "moderate"),
    )

    context = f"""User Data:
- Age: {age}, Income: ₹{income:,.0f}/yr, Expenses: ₹{expenses:,.0f}/yr
- Current Investments: ₹{savings:,.0f}
- Monthly Savings Capacity: ₹{monthly_invest:,.0f}
- Risk Profile: {user_data.get('risk_profile', 'moderate')}

FIRE Calculations:
{json.dumps(roadmap, indent=2)}

SIP Plan:
{json.dumps(sip_plan, indent=2)}

User Query: {query}"""

    llm = ChatGroq(model=settings.agent_model, temperature=0.3, api_key=settings.groq_api_key)
    messages = [SystemMessage(content=FIRE_SYSTEM_PROMPT), HumanMessage(content=context)]
    response = await llm.ainvoke(messages)

    return {
        "agent_name": "fire_planner",
        "response_text": response.content,
        "data": {"roadmap": roadmap, "sip_plan": sip_plan},
        "ui_action": {"action": "navigate", "page": "/fire-planner", "data": roadmap},
        "follow_up_questions": [
            "Want me to adjust the retirement age?",
            "Should I factor in inflation for your goals?",
            "Would you like to see a step-up SIP strategy?",
        ],
    }
