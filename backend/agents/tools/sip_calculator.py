"""SIP & investment calculators — real Indian financial math."""
import math
from typing import List, Dict


def sip_future_value(monthly: float, annual_rate: float, years: float) -> float:
    """Calculate future value of SIP investment."""
    r = annual_rate / 100 / 12
    n = int(years * 12)
    if r == 0:
        return monthly * n
    return monthly * ((pow(1 + r, n) - 1) / r) * (1 + r)


def required_sip(target: float, annual_rate: float, years: float) -> float:
    """Calculate monthly SIP needed to reach target."""
    r = annual_rate / 100 / 12
    n = int(years * 12)
    if r == 0:
        return target / n
    return target / (((pow(1 + r, n) - 1) / r) * (1 + r))


def step_up_sip_future_value(monthly: float, step_up_pct: float, annual_rate: float, years: int) -> float:
    """SIP with annual step-up (increase SIP by X% every year)."""
    r = annual_rate / 100 / 12
    total = 0.0
    current_sip = monthly
    for year in range(years):
        remaining_months = (years - year) * 12
        fv = current_sip * ((pow(1 + r, 12) - 1) / r) * (1 + r)
        growth = pow(1 + r, remaining_months - 12)
        total += fv * growth
        current_sip *= (1 + step_up_pct / 100)
    return total


def lumpsum_future_value(principal: float, annual_rate: float, years: float) -> float:
    """Future value of a lumpsum investment."""
    return principal * pow(1 + annual_rate / 100, years)


def goal_sip_plan(goals: List[Dict], risk_profile: str = "moderate") -> List[Dict]:
    """Generate SIP plan for multiple goals."""
    rate_map = {"conservative": 8, "moderate": 12, "aggressive": 15}
    rate = rate_map.get(risk_profile, 12)
    plan = []
    for goal in goals:
        name = goal["name"]
        target = goal["target"] - goal.get("current_savings", 0)
        months = goal["timeline_months"]
        years = months / 12
        if target <= 0:
            plan.append({"goal": name, "monthly_sip": 0, "status": "achieved"})
            continue
        sip = required_sip(target, rate, years)
        future = sip_future_value(sip, rate, years)
        plan.append({
            "goal": name,
            "target": target,
            "monthly_sip": round(sip, 0),
            "expected_rate": rate,
            "future_value": round(future, 0),
            "timeline_years": round(years, 1),
        })
    return plan
