"""Financial data models."""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class SIPRecommendation(BaseModel):
    fund_name: str
    category: str
    monthly_amount: float
    expected_return: float
    goal: str
    rationale: str = ""


class TaxAnalysis(BaseModel):
    old_regime_tax: float
    new_regime_tax: float
    recommended_regime: str
    savings: float
    deductions_used: List[Dict[str, Any]] = []
    missed_deductions: List[Dict[str, Any]] = []


class FIREProjection(BaseModel):
    fire_number: float
    coast_fire_number: float
    lean_fire_number: float
    years_to_fire: float
    monthly_sip_needed: float
    current_progress_pct: float
    milestones: List[Dict[str, Any]] = []


class PortfolioHolding(BaseModel):
    scheme_name: str
    category: str
    invested: float
    current_value: float
    units: float
    nav: float
    xirr: float = 0
    expense_ratio: float = 0
    overlap_pct: float = 0


class MoneyHealthScore(BaseModel):
    overall_score: int
    emergency_score: int
    insurance_score: int
    investment_score: int
    debt_score: int
    tax_score: int
    retirement_score: int
    recommendations: List[str] = []
