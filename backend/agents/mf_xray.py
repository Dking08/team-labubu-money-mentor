"""MF Portfolio X-Ray Agent — comprehensive mutual fund portfolio analysis.

Provides:
  - CAMS/KFintech statement parsing into structured holdings
  - XIRR performance for each fund and overall portfolio
  - Stock overlap detection across funds (real top-holding data)
  - Expense ratio drag with direct plan comparison
  - Asset allocation vs ideal allocation for age/risk
  - AI-powered rebalancing recommendations via Groq LLM
"""
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from config import settings
from agents.tools.portfolio_analyzer import (
    analyze_overlap,
    expense_ratio_drag,
    portfolio_allocation,
    get_ideal_allocation,
    parse_cams_statement,
)
import json

MF_SYSTEM_PROMPT = """You are the Mutual Fund Portfolio X-Ray agent for ET Money Mentor.
You provide institutional-grade portfolio analysis for Indian retail investors.

Your analysis must cover:
1. Portfolio Reconstruction: List every fund with current value, XIRR, and gain/loss.
2. Performance Attribution: Identify top performers and underperformers vs benchmark.
3. Stock Overlap Analysis: When multiple funds hold the same stocks, it concentrates
   risk without adding diversification. Flag overlaps with weighted impact.
4. Expense Ratio Drag: Quantify how much fees cost over 10 years with compounding.
   Recommend direct plan switches where the savings justify the effort.
5. Asset Allocation: Compare current allocation (large/mid/small/flexi) against
   ideal allocation for the user's age and risk profile.
6. Actionable Rebalancing Plan: Specific buy/sell/switch recommendations with amounts.

Rules:
- Use rupee amounts in Indian notation (lakhs and crores).
- Reference specific fund names and AMFI categories.
- Back every recommendation with data from the analysis.
- Be direct. No filler. No disclaimers unless legally required.
- Format with clear sections using markdown-style headers."""


async def run_mf_xray(user_data: dict, query: str, cams_data: dict = None) -> dict:
    """Run complete portfolio X-Ray analysis.

    Args:
        user_data: User profile with age, risk_profile, etc.
        query: User's specific question about their portfolio.
        cams_data: CAMS CAS statement (dict with 'folios' containing 'schemes').
                   Falls back to comprehensive mock data if not provided.
    """
    if cams_data is None:
        cams_data = _get_detailed_mock_cams()

    # Parse holdings from CAMS structure
    holdings = parse_cams_statement(cams_data)

    if not holdings:
        return {
            "agent_name": "mf_xray",
            "response_text": "No mutual fund holdings found. Please upload a CAMS or KFintech CAS statement.",
            "data": {},
            "ui_action": None,
        }

    # Run all analysis tools
    overlap = analyze_overlap(holdings)
    er_drag = expense_ratio_drag(holdings)
    allocation = portfolio_allocation(holdings)
    ideal = get_ideal_allocation(
        age=user_data.get("age", 28),
        risk_profile=user_data.get("risk_profile", "moderate"),
    )

    # Portfolio-level metrics
    total_invested = sum(h["invested_amount"] for h in holdings)
    total_current = sum(h["current_value"] for h in holdings)
    total_gain = total_current - total_invested
    total_gain_pct = round(total_gain / max(total_invested, 1) * 100, 1)

    # Per-fund summary
    fund_summary = []
    for h in holdings:
        fund_summary.append({
            "name": h["scheme_name"],
            "category": h["category"],
            "amc": h.get("amc", ""),
            "invested": h["invested_amount"],
            "current_value": h["current_value"],
            "gain": h["absolute_gain"],
            "gain_pct": h["gain_pct"],
            "xirr": h["xirr"],
            "expense_ratio": h["expense_ratio"],
            "units": h["units"],
            "nav": h["nav"],
        })

    # Build LLM context
    context = f"""PORTFOLIO ANALYSIS DATA
======================

Holdings ({len(holdings)} funds, total value: Rs {total_current:,.0f}):
{json.dumps(fund_summary, indent=2)}

Portfolio Performance:
- Total Invested: Rs {total_invested:,.0f}
- Current Value: Rs {total_current:,.0f}
- Total Gain: Rs {total_gain:,.0f} ({total_gain_pct}%)

Overlap Analysis:
- Unique Stocks: {overlap['total_unique_stocks']}
- Overlapping Stocks: {overlap['overlapping_stocks']}
- Weighted Overlap: {overlap['weighted_overlap_pct']}%
- Risk Level: {overlap['risk_level']}
- Overlapping Details: {json.dumps(overlap['overlaps'], indent=2)}

Expense Ratio Analysis:
- Weighted ER: {er_drag['weighted_expense_ratio']}%
- Annual Cost: Rs {er_drag['annual_cost']:,.0f}
- 10yr Drag (vs direct plans): Rs {er_drag['total_drag_over_years']:,.0f}
- Per Fund: {json.dumps(er_drag['fund_costs'], indent=2)}

Current Allocation: Equity {allocation['equity_pct']}% | Debt {allocation['debt_pct']}%
Category Breakdown: {json.dumps(allocation['allocation'], indent=2)}

Ideal Allocation (Age {user_data.get('age', 28)}, {user_data.get('risk_profile', 'moderate')} risk):
{json.dumps(ideal, indent=2)}

User Query: {query}"""

    llm = ChatGroq(
        model=settings.agent_model,
        temperature=0.3,
        api_key=settings.groq_api_key,
    )
    messages = [SystemMessage(content=MF_SYSTEM_PROMPT), HumanMessage(content=context)]
    response = await llm.ainvoke(messages)

    return {
        "agent_name": "mf_xray",
        "response_text": response.content,
        "data": {
            "portfolio_summary": {
                "total_invested": total_invested,
                "total_current": total_current,
                "total_gain": total_gain,
                "total_gain_pct": total_gain_pct,
                "fund_count": len(holdings),
            },
            "holdings": fund_summary,
            "overlap": overlap,
            "expense_ratio": er_drag,
            "allocation": allocation,
            "ideal_allocation": ideal,
        },
        "ui_action": {"action": "navigate", "page": "/mf-xray"},
    }


def _get_detailed_mock_cams() -> dict:
    """Comprehensive mock CAMS statement for demo — 6 funds across categories."""
    return {
        "statement_date": "2026-03-15",
        "pan": "ABCDE1234F",
        "investor_name": "Rahul Sharma",
        "folios": [
            {
                "folio_number": "1234/90",
                "amc": "HDFC Mutual Fund",
                "schemes": [
                    {
                        "scheme_name": "HDFC Mid-Cap Opportunities Fund - Growth",
                        "category": "Equity - Mid Cap",
                        "units": 324.52,
                        "nav": 456.70,
                        "current_value": 148200,
                        "invested_amount": 120000,
                        "expense_ratio": 1.68,
                        "xirr": 15.2,
                        "isin": "INF179KA1GX4",
                    },
                ],
            },
            {
                "folio_number": "2345/11",
                "amc": "PPFAS Mutual Fund",
                "schemes": [
                    {
                        "scheme_name": "Parag Parikh Flexi Cap Fund - Direct Growth",
                        "category": "Equity - Flexi Cap",
                        "units": 210.00,
                        "nav": 680.50,
                        "current_value": 142905,
                        "invested_amount": 108000,
                        "expense_ratio": 0.63,
                        "xirr": 22.5,
                        "isin": "INF879O01027",
                    },
                ],
            },
            {
                "folio_number": "5678/12",
                "amc": "SBI Mutual Fund",
                "schemes": [
                    {
                        "scheme_name": "SBI Small Cap Fund - Growth",
                        "category": "Equity - Small Cap",
                        "units": 450.00,
                        "nav": 142.30,
                        "current_value": 64035,
                        "invested_amount": 48000,
                        "expense_ratio": 1.72,
                        "xirr": 24.1,
                        "isin": "INF200KA1HL0",
                    },
                ],
            },
            {
                "folio_number": "6789/23",
                "amc": "Axis Mutual Fund",
                "schemes": [
                    {
                        "scheme_name": "Axis Bluechip Fund - Growth",
                        "category": "Equity - Large Cap",
                        "units": 580.00,
                        "nav": 52.80,
                        "current_value": 30624,
                        "invested_amount": 27000,
                        "expense_ratio": 1.56,
                        "xirr": 9.8,
                        "isin": "INF846K01IJ9",
                    },
                ],
            },
            {
                "folio_number": "7890/34",
                "amc": "Motilal Oswal Mutual Fund",
                "schemes": [
                    {
                        "scheme_name": "Motilal Oswal Midcap Fund - Growth",
                        "category": "Equity - Mid Cap",
                        "units": 195.00,
                        "nav": 85.20,
                        "current_value": 16614,
                        "invested_amount": 12000,
                        "expense_ratio": 1.82,
                        "xirr": 28.4,
                        "isin": "INF247L01AJ3",
                    },
                ],
            },
            {
                "folio_number": "8901/45",
                "amc": "ICICI Prudential Mutual Fund",
                "schemes": [
                    {
                        "scheme_name": "ICICI Pru Bluechip Fund - Growth",
                        "category": "Equity - Large Cap",
                        "units": 320.00,
                        "nav": 95.40,
                        "current_value": 30528,
                        "invested_amount": 24000,
                        "expense_ratio": 1.69,
                        "xirr": 18.2,
                        "isin": "INF109K01AV0",
                    },
                ],
            },
        ],
    }
