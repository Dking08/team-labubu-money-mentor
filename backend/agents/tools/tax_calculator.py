"""Indian income tax calculators — Old vs New regime with all deductions."""
from typing import Dict, List, Any


# FY 2024-25 Tax Slabs
OLD_REGIME_SLABS = [
    (250000, 0), (500000, 0.05), (1000000, 0.20), (float("inf"), 0.30)
]
NEW_REGIME_SLABS = [
    (300000, 0), (700000, 0.05), (1000000, 0.10),
    (1200000, 0.15), (1500000, 0.20), (float("inf"), 0.30)
]

OLD_STANDARD_DEDUCTION = 50000
NEW_STANDARD_DEDUCTION = 75000


def _calc_tax(income: float, slabs: list) -> float:
    tax = 0.0
    prev = 0
    for limit, rate in slabs:
        taxable = min(income, limit) - prev
        if taxable > 0:
            tax += taxable * rate
        prev = limit
        if income <= limit:
            break
    cess = tax * 0.04  # 4% health & education cess
    return tax + cess


def calc_old_regime(gross_income: float, deductions: Dict[str, float] = None) -> Dict:
    """Calculate tax under Old Regime with deductions."""
    if deductions is None:
        deductions = {}
    std_ded = OLD_STANDARD_DEDUCTION
    sec_80c = min(deductions.get("80c", 0), 150000)
    sec_80d = min(deductions.get("80d", 0), 25000)
    sec_80ccd = min(deductions.get("80ccd_1b", 0), 50000)
    hra = deductions.get("hra", 0)
    sec_24 = min(deductions.get("home_loan_interest", 0), 200000)
    total_ded = std_ded + sec_80c + sec_80d + sec_80ccd + hra + sec_24
    taxable = max(0, gross_income - total_ded)
    tax = _calc_tax(taxable, OLD_REGIME_SLABS)
    # Section 87A rebate
    if taxable <= 500000:
        tax = max(0, tax - 12500)
    return {
        "regime": "old",
        "gross_income": gross_income,
        "total_deductions": total_ded,
        "taxable_income": taxable,
        "tax": round(tax, 0),
        "effective_rate": round(tax / gross_income * 100, 2) if gross_income > 0 else 0,
        "deductions_breakdown": {
            "standard": std_ded, "80c": sec_80c, "80d": sec_80d,
            "80ccd_1b": sec_80ccd, "hra": hra, "sec_24": sec_24,
        },
    }


def calc_new_regime(gross_income: float) -> Dict:
    """Calculate tax under New Regime."""
    taxable = max(0, gross_income - NEW_STANDARD_DEDUCTION)
    tax = _calc_tax(taxable, NEW_REGIME_SLABS)
    if taxable <= 700000:
        tax = max(0, tax - 25000)
    return {
        "regime": "new",
        "gross_income": gross_income,
        "total_deductions": NEW_STANDARD_DEDUCTION,
        "taxable_income": taxable,
        "tax": round(tax, 0),
        "effective_rate": round(tax / gross_income * 100, 2) if gross_income > 0 else 0,
    }


def compare_regimes(gross_income: float, deductions: Dict[str, float] = None) -> Dict:
    """Compare Old vs New regime and recommend."""
    old = calc_old_regime(gross_income, deductions)
    new = calc_new_regime(gross_income)
    savings = abs(old["tax"] - new["tax"])
    recommended = "old" if old["tax"] < new["tax"] else "new"
    return {
        "old_regime": old,
        "new_regime": new,
        "recommended": recommended,
        "savings": savings,
        "savings_pct": round(savings / max(old["tax"], new["tax"], 1) * 100, 1),
    }


def find_missed_deductions(user_data: Dict) -> List[Dict]:
    """Identify tax-saving deductions the user might be missing."""
    missed = []
    investments = user_data.get("investments", {})
    if investments.get("nps", 0) == 0:
        missed.append({"section": "80CCD(1B)", "max_benefit": 50000,
                       "suggestion": "Invest ₹50,000 in NPS for additional tax deduction"})
    total_80c = investments.get("ppf", 0) + investments.get("elss", 0) + investments.get("epf", 0)
    if total_80c < 150000:
        gap = 150000 - total_80c
        missed.append({"section": "80C", "max_benefit": gap,
                       "suggestion": f"You can invest ₹{gap:,.0f} more in ELSS/PPF to maximize 80C"})
    if user_data.get("insurance", {}).get("term_life", 0) == 0:
        missed.append({"section": "80D", "max_benefit": 25000,
                       "suggestion": "Get term life + health insurance for tax benefits under 80D"})
    return missed
