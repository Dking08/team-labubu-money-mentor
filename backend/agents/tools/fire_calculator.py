"""FIRE (Financial Independence, Retire Early) calculators."""
import math
from typing import Dict, List


def fire_number(annual_expenses: float, withdrawal_rate: float = 4.0) -> float:
    """FIRE corpus = annual expenses / withdrawal rate."""
    return annual_expenses / (withdrawal_rate / 100)


def lean_fire(annual_expenses: float) -> float:
    """Lean FIRE = 70% of normal FIRE number."""
    return fire_number(annual_expenses * 0.7)


def fat_fire(annual_expenses: float) -> float:
    """Fat FIRE = 150% of normal FIRE number."""
    return fire_number(annual_expenses * 1.5)


def coast_fire(fire_target: float, current_age: int, retire_age: int, expected_return: float = 12) -> float:
    """Amount you need NOW so it grows to FIRE number by retirement (no more contributions)."""
    years = retire_age - current_age
    return fire_target / pow(1 + expected_return / 100, years)


def years_to_fire(current_savings: float, monthly_investment: float,
                  annual_return: float, fire_target: float) -> float:
    """Calculate years to reach FIRE number."""
    r = annual_return / 100 / 12
    if r == 0:
        months = (fire_target - current_savings) / monthly_investment
        return max(0, months / 12)
    for months in range(1, 1200):
        fv_savings = current_savings * pow(1 + r, months)
        fv_sip = monthly_investment * ((pow(1 + r, months) - 1) / r) * (1 + r)
        if fv_savings + fv_sip >= fire_target:
            return months / 12
    return 99


def fire_roadmap(age: int, annual_income: float, annual_expenses: float,
                 current_savings: float, monthly_investment: float,
                 retire_age: int = 50, return_rate: float = 12) -> Dict:
    """Complete FIRE roadmap with milestones."""
    annual_exp = annual_expenses
    fn = fire_number(annual_exp)
    ln = lean_fire(annual_exp)
    ffn = fat_fire(annual_exp)
    cf = coast_fire(fn, age, retire_age, return_rate)
    ytf = years_to_fire(current_savings, monthly_investment, return_rate, fn)
    fire_age = age + ytf
    savings_rate = (annual_income - annual_expenses) / annual_income * 100

    milestones = []
    r = return_rate / 100 / 12
    for year in range(1, int(ytf) + 2):
        m = year * 12
        fv = current_savings * pow(1 + r, m) + monthly_investment * ((pow(1 + r, m) - 1) / r) * (1 + r)
        pct = min(100, fv / fn * 100)
        milestones.append({
            "year": year, "age": age + year, "corpus": round(fv, 0),
            "progress_pct": round(pct, 1),
            "milestone": "Coast FIRE" if fv >= cf and year > 0 else
                         "Lean FIRE" if fv >= ln else
                         "FIRE!" if fv >= fn else None,
        })
        if fv >= fn:
            break

    return {
        "fire_number": round(fn, 0),
        "lean_fire": round(ln, 0),
        "fat_fire": round(ffn, 0),
        "coast_fire": round(cf, 0),
        "years_to_fire": round(ytf, 1),
        "fire_age": round(fire_age, 1),
        "savings_rate": round(savings_rate, 1),
        "monthly_investment_needed": round(monthly_investment, 0),
        "milestones": milestones[:30],
    }
