"""Mock data for demo — realistic Indian financial profiles."""
import json
import os

_dir = os.path.dirname(__file__)


def get_mock_user() -> dict:
    return {
        "user_id": "demo_user",
        "name": "Rahul Sharma",
        "age": 28,
        "occupation": "Software Engineer",
        "city": "Bangalore",
        "annual_income": 1500000,
        "monthly_take_home": 104000,
        "monthly_expenses": 45000,
        "investments": {
            "ppf": 300000, "elss": 200000, "equity_mf": 150000,
            "fd": 100000, "epf": 450000, "nps": 0, "stocks": 50000, "gold": 0,
        },
        "emergency_fund": 200000,
        "insurance": {"term_life": 0, "health": 500000, "accident": 0},
        "loans": [
            {"loan_type": "education", "outstanding": 300000, "emi": 8000, "rate": 8.5, "remaining_months": 42}
        ],
        "goals": [
            {"name": "Emergency Fund", "target": 540000, "timeline_months": 12, "current_savings": 200000},
            {"name": "Marriage", "target": 2000000, "timeline_months": 36, "current_savings": 0},
            {"name": "House Down Payment", "target": 3000000, "timeline_months": 60, "current_savings": 0},
            {"name": "Retirement", "target": 50000000, "timeline_months": 384, "current_savings": 450000},
        ],
        "risk_profile": "moderate",
        "tax_regime": "new",
        "has_hra": True,
        "rent_paid": 20000,
        "metro_city": True,
    }


def get_mock_aa_data() -> dict:
    return {
        "consent_status": "APPROVED",
        "accounts": [
            {
                "type": "SAVINGS", "bank": "HDFC Bank", "account_number": "XXXX1234",
                "balance": 285000,
                "transactions": [
                    {"date": "2026-03-01", "narration": "SALARY - TCS Ltd", "amount": 104000, "type": "CREDIT"},
                    {"date": "2026-03-01", "narration": "SIP - HDFC Mid Cap", "amount": -5000, "type": "DEBIT"},
                    {"date": "2026-03-02", "narration": "RENT - March", "amount": -20000, "type": "DEBIT"},
                    {"date": "2026-03-05", "narration": "GROCERIES", "amount": -4500, "type": "DEBIT"},
                    {"date": "2026-03-05", "narration": "UPI - Swiggy", "amount": -850, "type": "DEBIT"},
                    {"date": "2026-03-10", "narration": "EMI - Education Loan", "amount": -8000, "type": "DEBIT"},
                    {"date": "2026-03-15", "narration": "SIP - Parag Parikh", "amount": -5000, "type": "DEBIT"},
                    {"date": "2026-03-20", "narration": "ELECTRICITY BILL", "amount": -2200, "type": "DEBIT"},
                ],
            }
        ],
        "deposits": [{"type": "FD", "bank": "SBI", "amount": 100000, "rate": 7.1, "maturity": "2027-06-15"}],
        "nsdl_holdings": [
            {"name": "Reliance Industries", "quantity": 5, "avg_price": 2400, "current_price": 2850, "value": 14250},
            {"name": "TCS", "quantity": 10, "avg_price": 3200, "current_price": 3580, "value": 35800},
        ],
    }


def get_mock_cams() -> dict:
    return {
        "statement_date": "2026-03-15", "pan": "ABCDE1234F",
        "folios": [
            {
                "folio_number": "1234/90", "amc": "HDFC Mutual Fund",
                "schemes": [
                    {"scheme_name": "HDFC Mid-Cap Opportunities Fund - Growth", "category": "Equity - Mid Cap",
                     "units": 324.52, "nav": 456.70, "current_value": 148200, "invested_amount": 123442, "expense_ratio": 1.68, "xirr": 15.2},
                    {"scheme_name": "Parag Parikh Flexi Cap Fund - Growth", "category": "Equity - Flexi Cap",
                     "units": 210.0, "nav": 680.50, "current_value": 142905, "invested_amount": 120000, "expense_ratio": 0.63, "xirr": 18.5},
                ],
            },
            {
                "folio_number": "5678/12", "amc": "SBI Mutual Fund",
                "schemes": [
                    {"scheme_name": "SBI Small Cap Fund - Growth", "category": "Equity - Small Cap",
                     "units": 450.0, "nav": 142.30, "current_value": 64035, "invested_amount": 54000, "expense_ratio": 1.72, "xirr": 22.1},
                ],
            },
        ],
    }
