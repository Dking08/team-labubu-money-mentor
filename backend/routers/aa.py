"""Account Aggregator router — Setu AA consent flow, data fetch, test endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.setu_aa import (
    test_connection,
    create_consent,
    get_consent_status,
    create_data_session,
    fetch_fi_data,
    normalize_aa_data,
    full_flow_sandbox,
)
from data.mock_data import get_mock_aa_data

router = APIRouter()


class ConsentRequest(BaseModel):
    mobile: str = "9999999999"
    fi_types: Optional[list] = None


@router.get("/test")
async def test_setu():
    """Test Setu credentials and connectivity. Returns auth status."""
    return await test_connection()


@router.post("/consent")
async def start_consent(req: ConsentRequest):
    """Create an AA consent request. Returns redirect URL for user approval."""
    result = await create_consent(mobile=req.mobile, fi_types=req.fi_types)
    return result


@router.get("/consent/{consent_id}")
async def check_consent(consent_id: str):
    """Check consent status (PENDING, ACTIVE, REJECTED, REVOKED)."""
    try:
        return await get_consent_status(consent_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Setu API error: {e}")


@router.post("/session/{consent_id}")
async def create_session(consent_id: str):
    """Create a data session after consent is ACTIVE."""
    result = await create_data_session(consent_id)
    return result


@router.get("/data/{session_id}")
async def get_fi_data(session_id: str):
    """Fetch financial data from a completed data session."""
    try:
        raw = await fetch_fi_data(session_id)
        return normalize_aa_data(raw)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Setu data fetch error: {e}")


@router.post("/demo-flow")
async def demo_flow():
    """Run the full Setu AA sandbox demo flow (auth + consent creation)."""
    return await full_flow_sandbox()


@router.get("/mock-data")
async def mock_data():
    """Return mock AA data for demo when Setu sandbox is not configured."""
    return get_mock_aa_data()
