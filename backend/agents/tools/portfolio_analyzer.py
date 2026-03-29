"""Portfolio analysis tools — XIRR, overlap, expense ratio drag."""
from typing import List, Dict, Tuple
from datetime import datetime
import math


def calculate_xirr(cashflows: List[Tuple[str, float]], guess: float = 0.1) -> float:
    """Calculate XIRR using Newton's method. cashflows: [(date_str, amount)]."""
    if not cashflows:
        return 0.0
    dates = [datetime.strptime(d, "%Y-%m-%d") for d, _ in cashflows]
    amounts = [a for _, a in cashflows]
    d0 = dates[0]
    def xnpv(rate):
        return sum(a / pow(1 + rate, (d - d0).days / 365.0) for d, a in zip(dates, amounts))
    def xnpv_deriv(rate):
        return sum(-a * (d - d0).days / 365.0 / pow(1 + rate, (d - d0).days / 365.0 + 1)
                   for d, a in zip(dates, amounts))
    rate = guess
    for _ in range(100):
        f = xnpv(rate)
        df = xnpv_deriv(rate)
        if abs(df) < 1e-10:
            break
        new_rate = rate - f / df
        if abs(new_rate - rate) < 1e-7:
            return round(new_rate * 100, 2)
        rate = new_rate
    return round(rate * 100, 2)


def analyze_overlap(holdings: List[Dict]) -> Dict:
    """Analyze stock overlap between mutual fund holdings."""
    MOCK_STOCKS = {
        "HDFC Mid-Cap": ["HDFC Bank", "Infosys", "TCS", "Bajaj Finance", "Asian Paints"],
        "Parag Parikh Flexi": ["Alphabet", "Microsoft", "HDFC Bank", "ITC", "Bajaj Holdings"],
        "Axis Bluechip": ["HDFC Bank", "Infosys", "TCS", "Reliance", "ICICI Bank"],
        "SBI Small Cap": ["Kalpataru Projects", "Finolex Cables", "Blue Star", "Suprajit", "HDFC Bank"],
    }
    all_stocks = {}
    for h in holdings:
        name = h.get("scheme_name", "Unknown")
        for key, stocks in MOCK_STOCKS.items():
            if key.lower() in name.lower():
                for s in stocks:
                    all_stocks.setdefault(s, []).append(name)
                break
    overlaps = {s: funds for s, funds in all_stocks.items() if len(funds) > 1}
    total_unique = len(all_stocks)
    overlap_count = len(overlaps)
    return {
        "total_unique_stocks": total_unique,
        "overlapping_stocks": overlap_count,
        "overlap_percentage": round(overlap_count / max(total_unique, 1) * 100, 1),
        "overlaps": overlaps,
        "risk_level": "HIGH" if overlap_count > 5 else "MODERATE" if overlap_count > 2 else "LOW",
    }


def expense_ratio_drag(holdings: List[Dict], years: int = 10) -> Dict:
    """Calculate the long-term cost of expense ratios."""
    total_invested = sum(h.get("current_value", 0) for h in holdings)
    weighted_er = sum(
        h.get("expense_ratio", 1.5) * h.get("current_value", 0) / max(total_invested, 1)
        for h in holdings
    )
    annual_drag = total_invested * weighted_er / 100
    total_drag = 0
    for y in range(1, years + 1):
        corpus = total_invested * pow(1.12, y)
        total_drag += corpus * weighted_er / 100
    return {
        "weighted_expense_ratio": round(weighted_er, 2),
        "annual_cost": round(annual_drag, 0),
        "total_cost_over_years": round(total_drag, 0),
        "years": years,
        "suggestion": "Consider switching to direct plans to save on expense ratios"
            if weighted_er > 1.0 else "Your expense ratios are reasonable",
    }


def portfolio_allocation(holdings: List[Dict]) -> Dict:
    """Analyze asset allocation."""
    categories = {}
    total = sum(h.get("current_value", 0) for h in holdings)
    for h in holdings:
        cat = h.get("category", "Unknown")
        categories[cat] = categories.get(cat, 0) + h.get("current_value", 0)
    return {
        "total_value": total,
        "allocation": {c: {"value": v, "pct": round(v / max(total, 1) * 100, 1)}
                       for c, v in categories.items()},
    }
