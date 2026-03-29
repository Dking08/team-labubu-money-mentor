"""User profile models for AI Money Mentor."""
from pydantic import BaseModel
from typing import Optional, List, Dict
from enum import Enum


class RiskProfile(str, Enum):
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"


class Goal(BaseModel):
    name: str
    target: float
    timeline_months: int
    current_savings: float = 0
    priority: int = 1


class Loan(BaseModel):
    loan_type: str
    outstanding: float
    emi: float
    rate: float
    remaining_months: int


class Insurance(BaseModel):
    term_life: float = 0
    health: float = 0
    accident: float = 0
    critical_illness: float = 0


class UserProfile(BaseModel):
    user_id: str = "demo_user"
    name: str = "Rahul Sharma"
    age: int = 28
    occupation: str = "Software Engineer"
    city: str = "Bangalore"
    annual_income: float = 1500000
    monthly_take_home: float = 104000
    monthly_expenses: float = 45000
    investments: Dict[str, float] = {
        "ppf": 300000, "elss": 200000, "equity_mf": 150000,
        "fd": 100000, "epf": 450000, "nps": 0, "stocks": 50000, "gold": 0,
    }
    emergency_fund: float = 200000
    insurance: Insurance = Insurance(term_life=0, health=500000)
    loans: List[Loan] = [
        Loan(loan_type="education", outstanding=300000, emi=8000, rate=8.5, remaining_months=42)
    ]
    goals: List[Goal] = [
        Goal(name="Emergency Fund", target=540000, timeline_months=12),
        Goal(name="Marriage", target=2000000, timeline_months=36),
        Goal(name="House Down Payment", target=3000000, timeline_months=60),
        Goal(name="Retirement", target=50000000, timeline_months=384),
    ]
    risk_profile: RiskProfile = RiskProfile.MODERATE
    tax_regime: str = "new"
    has_hra: bool = True
    rent_paid: float = 20000
    metro_city: bool = True
    partner: Optional["UserProfile"] = None

    @property
    def total_investments(self) -> float:
        return sum(self.investments.values())

    @property
    def net_worth(self) -> float:
        return self.total_investments + self.emergency_fund - sum(l.outstanding for l in self.loans)

    @property
    def monthly_savings(self) -> float:
        return self.monthly_take_home - self.monthly_expenses - sum(l.emi for l in self.loans)
