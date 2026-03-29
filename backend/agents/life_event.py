"""Life Event Advisor — THE STAR DEMO AGENT. Handles bonus, marriage, baby, inheritance."""
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from config import settings
from agents.tools.sip_calculator import required_sip, sip_future_value
from agents.tools.tax_calculator import compare_regimes
import json

LIFE_EVENT_PROMPT = """You are the Life Event Financial Advisor in AI Money Mentor — the most personalized financial advisor in India.

When a user tells you about a life event (bonus, marriage, new baby, inheritance, job change, buying a house), you:

1. IMMEDIATELY acknowledge the event with empathy and excitement
2. Break down the EXACT financial impact with numbers
3. Show a clear action plan split into:
   - Tax implications (with exact ₹ amounts)
   - Investment allocation (specific fund recommendations)
   - Emergency fund adjustment
   - Insurance changes needed
   - Goal impact (how this changes their existing goals)

For BONUS specifically:
- Split into: Tax deduction investments (80C/NPS), Emergency fund top-up, Goal-based SIPs, Fun money (10-15%)
- Show tax saved by investing vs. spending

For MARRIAGE:
- Budget breakdown, insurance updates, joint planning trigger

For NEW BABY:
- SSY/education fund, term life increase, health insurance add-on

Always be specific: "Invest ₹50,000 in ELSS to save ₹15,600 in taxes" not "consider investing"
Always show before/after comparison of their financial position.
Use a warm, mentor-like tone. You're their trusted financial big brother/sister."""


async def run_life_event(user_data: dict, query: str) -> dict:
    income = user_data.get("annual_income", 1500000)
    investments = user_data.get("investments", {})
    risk = user_data.get("risk_profile", "moderate")

    # Auto-detect event type
    q_lower = query.lower()
    event_type = "general"
    if any(w in q_lower for w in ["bonus", "incentive", "variable pay"]):
        event_type = "bonus"
    elif any(w in q_lower for w in ["marr", "wedding", "shaadi"]):
        event_type = "marriage"
    elif any(w in q_lower for w in ["baby", "child", "pregnant", "newborn"]):
        event_type = "new_baby"
    elif any(w in q_lower for w in ["inherit", "property", "will"]):
        event_type = "inheritance"
    elif any(w in q_lower for w in ["job", "offer", "switch", "resign"]):
        event_type = "job_change"

    # Extract amount if mentioned
    import re
    amount = 200000  # default
    matches = re.findall(r'[\₹₨]?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lac|L|k|thousand|cr|crore)?', query, re.I)
    if matches:
        num_str = matches[0].replace(",", "")
        num = float(num_str)
        if any(w in q_lower for w in ["lakh", "lac", "l"]):
            num *= 100000
        elif any(w in q_lower for w in ["cr", "crore"]):
            num *= 10000000
        elif any(w in q_lower for w in ["k", "thousand"]):
            num *= 1000
        elif num < 1000:
            num *= 100000  # assume lakhs
        amount = num

    # Tax analysis for the bonus
    tax_data = compare_regimes(income, {
        "80c": investments.get("ppf", 0) + investments.get("elss", 0),
        "80d": 25000, "80ccd_1b": investments.get("nps", 0),
    })

    # Build allocation plan
    emergency_gap = max(0, user_data.get("monthly_expenses", 45000) * 6 - user_data.get("emergency_fund", 0))
    allocation = {}
    remaining = amount

    if event_type == "bonus":
        # Emergency fund first
        emg = min(remaining, emergency_gap)
        if emg > 0:
            allocation["Emergency Fund Top-up"] = {"amount": emg, "vehicle": "High-yield savings / Liquid fund"}
            remaining -= emg
        # Tax saving
        sec80c_gap = max(0, 150000 - investments.get("ppf", 0) - investments.get("elss", 0))
        tax_invest = min(remaining, sec80c_gap)
        if tax_invest > 0:
            allocation["ELSS (Tax Saving)"] = {"amount": tax_invest, "vehicle": "Parag Parikh ELSS / Mirae ELSS"}
            remaining -= tax_invest
        nps_gap = max(0, 50000 - investments.get("nps", 0))
        nps = min(remaining, nps_gap)
        if nps > 0:
            allocation["NPS (80CCD)"] = {"amount": nps, "vehicle": "NPS Tier-1 Aggressive"}
            remaining -= nps
        # Goals
        goal_invest = remaining * 0.7
        fun_money = remaining * 0.3
        if goal_invest > 0:
            allocation["Goal-based Investment"] = {"amount": goal_invest, "vehicle": "Flexi Cap + Mid Cap SIP"}
        if fun_money > 0:
            allocation["Fun Money 🎉"] = {"amount": fun_money, "vehicle": "Enjoy! You earned it."}

    context = f"""Event: {event_type.upper()} — Amount: ₹{amount:,.0f}
User: {user_data.get('name', 'User')}, Age {user_data.get('age', 28)}, Income ₹{income:,.0f}/yr
Risk Profile: {risk}
Current Investments: {json.dumps(investments)}
Emergency Fund: ₹{user_data.get('emergency_fund', 0):,.0f} (target: ₹{user_data.get('monthly_expenses', 45000) * 6:,.0f})
Tax Regime: {tax_data.get('recommended', 'new')} saves ₹{tax_data.get('savings', 0):,.0f}

Suggested Allocation:
{json.dumps(allocation, indent=2)}

Query: {query}"""

    llm = ChatGroq(model=settings.agent_model, temperature=0.4, api_key=settings.groq_api_key)
    messages = [SystemMessage(content=LIFE_EVENT_PROMPT), HumanMessage(content=context)]
    response = await llm.ainvoke(messages)

    return {
        "agent_name": "life_event",
        "response_text": response.content,
        "data": {"event_type": event_type, "amount": amount, "allocation": allocation, "tax": tax_data},
        "ui_action": {"action": "show_panel", "page": "/dashboard", "data": {"panel": "life_event", "event": event_type, "allocation": allocation}},
        "whatsapp_summary": f"💰 {event_type.title()} Plan: ₹{amount:,.0f} allocated across {len(allocation)} buckets. Check app for details!",
        "follow_up_questions": [
            "Want me to set up the SIPs for you?",
            "Should I show the tax impact in detail?",
            "Would you like to see how this changes your FIRE timeline?",
        ],
    }
