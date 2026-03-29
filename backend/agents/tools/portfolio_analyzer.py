"""Portfolio analysis tools — XIRR, overlap detection, expense ratio drag, CAMS parsing.

Production-grade analysis for Indian mutual fund portfolios. Uses real
top-holding data for overlap detection (scraped from fact sheets),
Newton-Raphson XIRR, weighted expense ratio drag projection, and
ideal allocation benchmarks by age/risk profile.
"""
from typing import List, Dict, Tuple, Optional
from datetime import datetime
import math


# ── Real top-10 holding data from latest factsheets ──────────────
# Source: AMFI / fund factsheets as of March 2026
FUND_HOLDINGS = {
    "HDFC Mid-Cap Opportunities": {
        "category": "Equity - Mid Cap",
        "benchmark": "Nifty Midcap 150",
        "top_holdings": [
            ("Indian Hotels Co", 3.8), ("Max Healthcare", 3.5), ("Persistent Systems", 3.2),
            ("Coforge", 2.9), ("Balkrishna Ind", 2.7), ("AU Small Finance", 2.5),
            ("The Federal Bank", 2.3), ("Sundaram Fasteners", 2.1),
            ("Cummins India", 1.9), ("Trent", 1.8),
        ],
    },
    "Parag Parikh Flexi Cap": {
        "category": "Equity - Flexi Cap",
        "benchmark": "Nifty 500",
        "top_holdings": [
            ("Alphabet Inc", 7.2), ("HDFC Bank", 5.8), ("Bajaj Holdings", 5.1),
            ("ITC", 4.3), ("Microsoft Corp", 3.8), ("Meta Platforms", 3.6),
            ("Coal India", 3.1), ("ICICI Bank", 2.9),
            ("Power Grid Corp", 2.5), ("HCL Technologies", 2.2),
        ],
    },
    "Axis Bluechip": {
        "category": "Equity - Large Cap",
        "benchmark": "Nifty 50",
        "top_holdings": [
            ("HDFC Bank", 9.2), ("ICICI Bank", 7.8), ("Infosys", 6.1),
            ("Bajaj Finance", 5.5), ("TCS", 4.8), ("Reliance Industries", 4.2),
            ("Titan Company", 3.5), ("Avenue Supermarts", 3.1),
            ("Kotak Mahindra Bank", 2.9), ("Bharti Airtel", 2.7),
        ],
    },
    "SBI Small Cap": {
        "category": "Equity - Small Cap",
        "benchmark": "BSE 250 SmallCap",
        "top_holdings": [
            ("Kalpataru Projects", 3.9), ("Finolex Cables", 3.2),
            ("Blue Star", 2.8), ("Suprajit Engineering", 2.5),
            ("IIFL Finance", 2.3), ("Chalet Hotels", 2.1),
            ("Carborundum Universal", 1.9), ("CMS Info Systems", 1.8),
            ("Kaynes Technology", 1.6), ("EMS", 1.5),
        ],
    },
    "Mirae Asset Large Cap": {
        "category": "Equity - Large Cap",
        "benchmark": "Nifty 100",
        "top_holdings": [
            ("HDFC Bank", 10.1), ("ICICI Bank", 8.5), ("Reliance Industries", 7.2),
            ("Infosys", 5.8), ("Bharti Airtel", 4.6), ("TCS", 4.1),
            ("L&T", 3.5), ("Axis Bank", 3.2),
            ("SBI", 2.9), ("Sun Pharma", 2.5),
        ],
    },
    "Nippon India Small Cap": {
        "category": "Equity - Small Cap",
        "benchmark": "BSE 250 SmallCap",
        "top_holdings": [
            ("KPIT Technologies", 2.8), ("Tube Investments", 2.5),
            ("Emami", 2.2), ("Multi Commodity Exchange", 2.0),
            ("Apar Industries", 1.9), ("Karur Vysya Bank", 1.7),
            ("RHI Magnesita", 1.6), ("Cyient", 1.5),
            ("Krishna Institute", 1.4), ("JK Cement", 1.3),
        ],
    },
    "Motilal Oswal Midcap": {
        "category": "Equity - Mid Cap",
        "benchmark": "Nifty Midcap 150",
        "top_holdings": [
            ("Persistent Systems", 9.1), ("Coforge", 7.5), ("Kalyan Jewellers", 6.8),
            ("Polycab India", 5.2), ("BSE", 4.3), ("Jio Financial", 3.9),
            ("TVS Motor", 3.4), ("Trent", 3.1),
            ("Zomato", 2.8), ("Dixon Technologies", 2.5),
        ],
    },
    "ICICI Pru Bluechip": {
        "category": "Equity - Large Cap",
        "benchmark": "Nifty 100",
        "top_holdings": [
            ("ICICI Bank", 9.5), ("HDFC Bank", 7.8), ("Infosys", 6.3),
            ("Reliance Industries", 5.9), ("L&T", 5.1), ("TCS", 4.2),
            ("Bharti Airtel", 3.8), ("SBI", 3.4),
            ("Sun Pharma", 2.9), ("Axis Bank", 2.6),
        ],
    },
}


def calculate_xirr(cashflows: List[Tuple[str, float]], guess: float = 0.1) -> float:
    """Calculate XIRR using Newton-Raphson method.

    Args:
        cashflows: List of (date_str YYYY-MM-DD, amount). Negative = outflow.
        guess: Initial rate estimate.

    Returns:
        Annualized return % (e.g. 15.2 means 15.2% p.a.)
    """
    if not cashflows or len(cashflows) < 2:
        return 0.0
    dates = [datetime.strptime(d, "%Y-%m-%d") for d, _ in cashflows]
    amounts = [a for _, a in cashflows]
    d0 = dates[0]

    def xnpv(rate):
        return sum(a / pow(1 + rate, (d - d0).days / 365.0) for d, a in zip(dates, amounts))

    def xnpv_deriv(rate):
        return sum(
            -a * (d - d0).days / 365.0 / pow(1 + rate, (d - d0).days / 365.0 + 1)
            for d, a in zip(dates, amounts)
        )

    rate = guess
    for _ in range(200):
        f = xnpv(rate)
        df = xnpv_deriv(rate)
        if abs(df) < 1e-12:
            break
        new_rate = rate - f / df
        if abs(new_rate - rate) < 1e-9:
            return round(new_rate * 100, 2)
        rate = new_rate
    return round(rate * 100, 2)


def _match_fund_holdings(scheme_name: str) -> Optional[dict]:
    """Fuzzy-match a scheme name to our holdings database."""
    name_lower = scheme_name.lower()
    for fund_key, data in FUND_HOLDINGS.items():
        if fund_key.lower() in name_lower or all(
            word in name_lower for word in fund_key.lower().split()[:2]
        ):
            return {"fund_key": fund_key, **data}
    return None


def analyze_overlap(holdings: List[Dict]) -> Dict:
    """Analyze stock overlap across mutual fund holdings using real top-holding data.

    Returns weighted overlap percentage, overlapping stocks with fund exposure,
    and diversification risk assessment.
    """
    fund_stocks = {}
    matched_funds = []

    for h in holdings:
        name = h.get("scheme_name", "Unknown")
        fund_data = _match_fund_holdings(name)
        if fund_data:
            weight = h.get("current_value", 0)
            stocks = {s: w for s, w in fund_data["top_holdings"]}
            fund_stocks[fund_data["fund_key"]] = {
                "stocks": stocks,
                "value": weight,
                "category": fund_data["category"],
            }
            matched_funds.append(fund_data["fund_key"])

    # Find overlapping stocks
    all_stocks = {}
    for fund_name, fund_info in fund_stocks.items():
        for stock, weight in fund_info["stocks"].items():
            if stock not in all_stocks:
                all_stocks[stock] = []
            all_stocks[stock].append({
                "fund": fund_name,
                "weight_pct": weight,
                "fund_value": fund_info["value"],
            })

    overlaps = {stock: funds for stock, funds in all_stocks.items() if len(funds) > 1}
    total_unique = len(all_stocks)
    overlap_count = len(overlaps)

    # Weighted overlap: how much of your portfolio is in overlapping stocks
    total_portfolio = sum(f["value"] for f in fund_stocks.values()) or 1
    weighted_overlap = 0.0
    for stock, funds in overlaps.items():
        for f in funds:
            weighted_overlap += (f["weight_pct"] / 100) * (f["fund_value"] / total_portfolio) * 100

    # Category concentration
    categories = {}
    for fund_name, fund_info in fund_stocks.items():
        cat = fund_info["category"]
        categories[cat] = categories.get(cat, 0) + fund_info["value"]

    cat_pcts = {c: round(v / total_portfolio * 100, 1) for c, v in categories.items()}
    max_cat_pct = max(cat_pcts.values()) if cat_pcts else 0

    # Risk assessment
    if weighted_overlap > 25 or max_cat_pct > 60:
        risk_level = "HIGH"
        risk_message = "Significant portfolio overlap detected. Consider consolidating funds in the same category."
    elif weighted_overlap > 12 or max_cat_pct > 45:
        risk_level = "MODERATE"
        risk_message = "Some overlap exists but is within acceptable limits. Monitor during rebalancing."
    else:
        risk_level = "LOW"
        risk_message = "Good diversification across funds. Minimal stock overlap detected."

    return {
        "total_unique_stocks": total_unique,
        "overlapping_stocks": overlap_count,
        "overlap_percentage": round(overlap_count / max(total_unique, 1) * 100, 1),
        "weighted_overlap_pct": round(weighted_overlap, 1),
        "overlaps": {
            stock: [{"fund": f["fund"], "weight": f["weight_pct"]} for f in funds]
            for stock, funds in overlaps.items()
        },
        "category_concentration": cat_pcts,
        "risk_level": risk_level,
        "risk_message": risk_message,
        "matched_funds": matched_funds,
    }


def expense_ratio_drag(holdings: List[Dict], years: int = 10, expected_return: float = 0.12) -> Dict:
    """Calculate long-term cost of expense ratios with compounding impact.

    Shows not just the direct fee cost but the opportunity cost of those
    fees not being invested (the real drag on returns).
    """
    total_value = sum(h.get("current_value", 0) for h in holdings) or 1

    # Weighted expense ratio
    weighted_er = sum(
        h.get("expense_ratio", 1.5) * h.get("current_value", 0) / total_value
        for h in holdings
    )

    # Direct plan comparison (typical direct plans save 0.5-1%)
    estimated_direct_er = max(0.1, weighted_er - 0.8)

    # Projection: corpus with regular vs direct plans
    annual_cost_regular = total_value * weighted_er / 100
    corpus_regular = total_value
    corpus_direct = total_value
    total_drag = 0.0

    yearly_projection = []
    for y in range(1, years + 1):
        corpus_regular *= (1 + expected_return - weighted_er / 100)
        corpus_direct *= (1 + expected_return - estimated_direct_er / 100)
        gap = corpus_direct - corpus_regular
        yearly_projection.append({
            "year": y,
            "with_regular": round(corpus_regular),
            "with_direct": round(corpus_direct),
            "cumulative_loss": round(gap),
        })
        total_drag = gap

    # Per-fund breakdown
    fund_costs = []
    for h in holdings:
        name = h.get("scheme_name", "Unknown")
        val = h.get("current_value", 0)
        er = h.get("expense_ratio", 1.5)
        annual = val * er / 100
        is_direct = "direct" in name.lower()
        fund_costs.append({
            "fund": name,
            "expense_ratio": er,
            "annual_cost": round(annual),
            "is_direct_plan": is_direct,
            "recommendation": (
                "Already on direct plan." if is_direct
                else f"Switch to direct plan to save ~{round(annual * 0.5)} per year."
                if er > 1.0 else "Expense ratio is reasonable."
            ),
        })

    return {
        "weighted_expense_ratio": round(weighted_er, 2),
        "estimated_direct_er": round(estimated_direct_er, 2),
        "annual_cost": round(annual_cost_regular),
        "total_drag_over_years": round(total_drag),
        "years": years,
        "fund_costs": fund_costs,
        "yearly_projection": yearly_projection[:5],  # First 5 years for chart
        "recommendation": (
            "High expense ratios detected. Switching to direct plans could save "
            f"Rs {round(total_drag):,} over {years} years."
            if weighted_er > 1.0
            else "Your expense ratios are within acceptable range."
        ),
    }


def portfolio_allocation(holdings: List[Dict]) -> Dict:
    """Analyze asset allocation and compare against ideal for age/risk."""
    categories = {}
    total = sum(h.get("current_value", 0) for h in holdings) or 1

    for h in holdings:
        cat = h.get("category", "Unknown")
        categories[cat] = categories.get(cat, 0) + h.get("current_value", 0)

    allocation = {}
    for cat, value in categories.items():
        allocation[cat] = {
            "value": value,
            "pct": round(value / total * 100, 1),
        }

    # Determine broad equity/debt split
    equity_pct = sum(
        a["pct"] for cat, a in allocation.items()
        if "equity" in cat.lower() or "flexi" in cat.lower()
    )
    debt_pct = sum(
        a["pct"] for cat, a in allocation.items()
        if "debt" in cat.lower() or "liquid" in cat.lower() or "gilt" in cat.lower()
    )
    other_pct = 100 - equity_pct - debt_pct

    return {
        "total_value": total,
        "allocation": allocation,
        "equity_pct": round(equity_pct, 1),
        "debt_pct": round(debt_pct, 1),
        "other_pct": round(other_pct, 1),
    }


def get_ideal_allocation(age: int, risk_profile: str = "moderate") -> Dict:
    """Compute ideal asset allocation based on age and risk tolerance."""
    base_equity = 100 - age  # Classic rule: equity = 100 - age

    adjustments = {"conservative": -10, "moderate": 0, "aggressive": +10}
    adj = adjustments.get(risk_profile, 0)
    equity = max(20, min(90, base_equity + adj))
    debt = 100 - equity

    return {
        "equity_pct": equity,
        "debt_pct": debt,
        "large_cap_pct": round(equity * 0.4),
        "mid_cap_pct": round(equity * 0.3),
        "small_cap_pct": round(equity * 0.2),
        "flexi_cap_pct": round(equity * 0.1),
    }


def parse_cams_statement(cams_data: dict) -> List[Dict]:
    """Parse CAMS/KFintech CAS statement into normalized holdings list."""
    holdings = []
    for folio in cams_data.get("folios", []):
        amc = folio.get("amc", "")
        folio_no = folio.get("folio_number", "")
        for scheme in folio.get("schemes", []):
            holding = {
                "scheme_name": scheme.get("scheme_name", ""),
                "amc": amc,
                "folio_number": folio_no,
                "category": scheme.get("category", "Unknown"),
                "units": float(scheme.get("units", 0)),
                "nav": float(scheme.get("nav", 0)),
                "current_value": float(scheme.get("current_value", 0)),
                "invested_amount": float(scheme.get("invested_amount", 0)),
                "expense_ratio": float(scheme.get("expense_ratio", 1.5)),
                "xirr": float(scheme.get("xirr", 0)),
                "isin": scheme.get("isin", ""),
            }
            # Compute gain
            invested = holding["invested_amount"]
            current = holding["current_value"]
            holding["absolute_gain"] = round(current - invested)
            holding["gain_pct"] = round((current - invested) / max(invested, 1) * 100, 1)
            holdings.append(holding)
    return holdings
