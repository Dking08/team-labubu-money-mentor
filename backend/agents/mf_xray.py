"""MF Portfolio X-Ray Agent — Portfolio analysis, overlap, expense ratio."""
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from config import settings
from agents.tools.portfolio_analyzer import analyze_overlap, expense_ratio_drag, portfolio_allocation
import json

MF_SYSTEM_PROMPT = """You are the Mutual Fund X-Ray agent. Analyze the user's MF portfolio and provide:
1. Complete portfolio reconstruction with current values
2. XIRR performance analysis
3. Stock overlap analysis across funds
4. Expense ratio drag (how much money they lose to fees)
5. Asset allocation vs ideal allocation for their age/risk
6. AI-generated rebalancing recommendations

Use Indian MF context. Reference specific fund categories. Be data-driven."""


async def run_mf_xray(user_data: dict, query: str, cams_data: dict = None) -> dict:
    # Use mock CAMS data if not provided
    if cams_data is None:
        cams_data = _get_mock_cams()

    holdings = []
    for folio in cams_data.get("folios", []):
        for scheme in folio.get("schemes", []):
            holdings.append(scheme)

    overlap = analyze_overlap(holdings)
    er_drag = expense_ratio_drag(holdings)
    allocation = portfolio_allocation(holdings)

    context = f"""Portfolio Holdings: {json.dumps(holdings, indent=2)}
Overlap: {json.dumps(overlap, indent=2)}
Expense Ratio: {json.dumps(er_drag, indent=2)}
Allocation: {json.dumps(allocation, indent=2)}
Risk Profile: {user_data.get('risk_profile', 'moderate')}, Age: {user_data.get('age', 28)}
Query: {query}"""

    llm = ChatGroq(model=settings.agent_model, temperature=0.3, api_key=settings.groq_api_key)
    messages = [SystemMessage(content=MF_SYSTEM_PROMPT), HumanMessage(content=context)]
    response = await llm.ainvoke(messages)

    return {
        "agent_name": "mf_xray",
        "response_text": response.content,
        "data": {"holdings": holdings, "overlap": overlap, "expense_ratio": er_drag, "allocation": allocation},
        "ui_action": {"action": "navigate", "page": "/portfolio"},
    }


def _get_mock_cams():
    return {
        "statement_date": "2026-03-15", "pan": "ABCDE1234F",
        "folios": [{
            "folio_number": "1234/90", "amc": "HDFC MF",
            "schemes": [
                {"scheme_name": "HDFC Mid-Cap Opportunities Fund", "category": "Equity - Mid Cap",
                 "units": 324.52, "nav": 456.70, "current_value": 148200,
                 "invested_amount": 123442, "expense_ratio": 1.68, "xirr": 15.2},
                {"scheme_name": "Parag Parikh Flexi Cap Fund", "category": "Equity - Flexi Cap",
                 "units": 210.0, "nav": 680.50, "current_value": 142905,
                 "invested_amount": 120000, "expense_ratio": 0.63, "xirr": 18.5},
            ]
        }, {
            "folio_number": "5678/12", "amc": "SBI MF",
            "schemes": [
                {"scheme_name": "SBI Small Cap Fund", "category": "Equity - Small Cap",
                 "units": 450.0, "nav": 142.30, "current_value": 64035,
                 "invested_amount": 54000, "expense_ratio": 1.72, "xirr": 22.1},
                {"scheme_name": "Axis Bluechip Fund", "category": "Equity - Large Cap",
                 "units": 180.0, "nav": 52.80, "current_value": 9504,
                 "invested_amount": 9000, "expense_ratio": 1.45, "xirr": 8.3},
            ]
        }]
    }
