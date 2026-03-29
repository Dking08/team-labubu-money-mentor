"""Setu Account Aggregator integration — OAuth token + consent + data fetch.

Auth flow (confirmed from Setu API Playground):
  1. POST https://orgservice-prod.setu.co/v1/users/login  →  JWT token
  2. Use Bearer token + x-product-instance-id for all /v2/ endpoints
  3. Sandbox base: https://fiu-sandbox.setu.co/v2
"""
import httpx
from config import settings
from typing import Optional
import time

# ── URLs confirmed from Setu API Playground ──────────────
SETU_AUTH_URL = "https://orgservice-prod.setu.co/v1/users/login"
SETU_SANDBOX_BASE = "https://fiu-sandbox.setu.co/v2"
SETU_PROD_BASE = "https://fiu.setu.co/v2"

# Sandbox product instance ID from playground
SANDBOX_PRODUCT_INSTANCE_ID = "b6d7a54a-6150-4fe7-a556-d37763720bcd"

# Token cache
_token_cache = {"token": None, "expires_at": 0}


def _api_base() -> str:
    if settings.app_env == "production":
        return SETU_PROD_BASE
    return SETU_SANDBOX_BASE


def _product_instance_id() -> str:
    pid = getattr(settings, "setu_product_instance_id", "")
    if pid and pid not in ("placeholder", "orgservice-prod"):
        return pid
    return SANDBOX_PRODUCT_INSTANCE_ID


async def get_auth_token(force_refresh: bool = False) -> str:
    """Get JWT token from Setu OAuth endpoint. Caches for 25 minutes.

    POST https://orgservice-prod.setu.co/v1/users/login
    Headers: client: bridge, Content-Type: application/json
    Body: { clientID, grant_type: client_credentials, secret }
    """
    now = time.time()
    if not force_refresh and _token_cache["token"] and _token_cache["expires_at"] > now:
        return _token_cache["token"]

    payload = {
        "clientID": settings.setu_client_id,
        "grant_type": "client_credentials",
        "secret": settings.setu_client_secret,
    }
    headers = {
        "client": "bridge",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(SETU_AUTH_URL, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    # Token is in data.token or data.access_token depending on version
    token = data.get("token") or data.get("access_token") or data.get("data", {}).get("token", "")
    if not token:
        raise ValueError(f"No token in Setu auth response: {data}")

    _token_cache["token"] = token
    _token_cache["expires_at"] = now + 25 * 60  # 25 min cache
    return token


async def _auth_headers() -> dict:
    """Build headers with Bearer token + product instance ID."""
    token = await get_auth_token()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-product-instance-id": _product_instance_id(),
    }


async def test_connection() -> dict:
    """Test Setu credentials by requesting a token. Returns status."""
    try:
        token = await get_auth_token(force_refresh=True)
        return {
            "status": "connected",
            "token_preview": token[:20] + "..." if len(token) > 20 else token,
            "api_base": _api_base(),
            "product_instance_id": _product_instance_id(),
        }
    except httpx.HTTPStatusError as e:
        return {
            "status": "auth_failed",
            "error": str(e),
            "response_body": e.response.text[:500] if e.response else "",
            "hint": "Check setu_client_id and setu_client_secret in config.py",
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def create_consent(
    mobile: str = "9999999999",
    fi_types: list[str] = None,
    date_from: str = "2023-01-01T00:00:00Z",
    date_to: str = "2026-03-01T00:00:00Z",
) -> dict:
    """Create an AA consent request.

    POST https://fiu-sandbox.setu.co/v2/consents
    VUA format: mobile@onemoney (sandbox)
    """
    if fi_types is None:
        fi_types = ["DEPOSIT", "MUTUAL_FUNDS", "EQUITIES", "TERM_DEPOSIT"]

    # VUA must include AA handle for sandbox
    vua = mobile if "@" in mobile else f"{mobile}@onemoney"

    payload = {
        "consentDuration": {"unit": "MONTH", "value": "24"},
        "vua": vua,
        "dataRange": {"from": date_from, "to": date_to},
        "consentTypes": ["PROFILE", "SUMMARY", "TRANSACTIONS"],
        "context": [],
    }

    headers = await _auth_headers()
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{_api_base()}/consents", json=payload, headers=headers)
        if resp.status_code >= 400:
            return {
                "error": True,
                "status_code": resp.status_code,
                "detail": resp.text[:500],
                "hint": "Check VUA format and credentials",
            }
        data = resp.json()
        return {
            "consent_id": data.get("id"),
            "status": data.get("status"),
            "redirect_url": data.get("url"),
            "detail": data.get("detail"),
        }


async def get_consent_status(consent_id: str) -> dict:
    """Check consent status (PENDING, ACTIVE, REJECTED, REVOKED)."""
    headers = await _auth_headers()
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{_api_base()}/consents/{consent_id}", headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return {
            "consent_id": data.get("id"),
            "status": data.get("status"),
            "accounts_linked": data.get("accountsLinked", []),
            "detail": data.get("detail"),
        }


async def create_data_session(
    consent_id: str,
    date_from: str = "2023-01-01T00:00:00Z",
    date_to: str = "2026-03-01T00:00:00Z",
) -> dict:
    """Create FI data fetch session once consent is ACTIVE."""
    payload = {
        "consentId": consent_id,
        "dataRange": {"from": date_from, "to": date_to},
        "format": "json",
    }
    headers = await _auth_headers()
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{_api_base()}/sessions", json=payload, headers=headers)
        if resp.status_code >= 400:
            return {"error": True, "status_code": resp.status_code, "detail": resp.text[:500]}
        data = resp.json()
        return {
            "session_id": data.get("id"),
            "status": data.get("status"),
            "consent_id": consent_id,
        }


async def fetch_fi_data(session_id: str) -> dict:
    """Fetch financial data from completed data session."""
    headers = await _auth_headers()
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{_api_base()}/sessions/{session_id}", headers=headers)
        resp.raise_for_status()
        return resp.json()


def normalize_aa_data(raw_data: dict) -> dict:
    """Normalize raw Setu AA response into our internal format.

    Transforms ReBIT-standard JSON into the format used by Money Mentor agents.
    """
    result = {
        "source": "setu_aa",
        "accounts": [],
        "deposits": [],
        "mutual_funds": [],
        "equities": [],
    }

    fi_data = raw_data.get("fIData", raw_data.get("FIData", raw_data.get("data", [])))
    if not isinstance(fi_data, list):
        fi_data = [fi_data] if fi_data else []

    for fi in fi_data:
        fi_type = fi.get("fiType", fi.get("type", ""))
        data = fi.get("data", fi)

        if fi_type == "DEPOSIT":
            summary = data.get("Summary", data.get("summary", {}))
            txns = data.get("Transactions", data.get("transactions", []))
            tx_list = txns.get("Transaction", txns) if isinstance(txns, dict) else txns
            result["accounts"].append({
                "type": "SAVINGS",
                "bank": summary.get("branch", "Unknown Bank"),
                "account_number": summary.get("maskedAccNumber", "XXXX"),
                "balance": float(summary.get("currentBalance", 0)),
                "currency": summary.get("currency", "INR"),
                "transactions": [
                    {
                        "date": t.get("txnDate", t.get("transactionTimestamp", "")),
                        "narration": t.get("narration", ""),
                        "amount": float(t.get("amount", 0)),
                        "type": t.get("type", "DEBIT"),
                        "balance": float(t.get("currentBalance", 0)),
                    }
                    for t in (tx_list if isinstance(tx_list, list) else [])
                ],
            })

        elif fi_type == "TERM_DEPOSIT":
            summary = data.get("Summary", data.get("summary", {}))
            result["deposits"].append({
                "type": "FD",
                "bank": summary.get("branch", "Unknown"),
                "amount": float(summary.get("currentValue", 0)),
                "rate": float(summary.get("interestRate", 0)),
                "maturity": summary.get("maturityDate", ""),
                "tenure_months": int(summary.get("tenureDays", 0)) // 30,
            })

        elif fi_type == "MUTUAL_FUNDS":
            holdings = data.get("Holdings", data.get("holdings", []))
            if isinstance(holdings, dict):
                holdings = holdings.get("Holding", [])
            for h in (holdings if isinstance(holdings, list) else []):
                result["mutual_funds"].append({
                    "scheme_name": h.get("schemeName", h.get("amc", "")),
                    "isin": h.get("isin", ""),
                    "units": float(h.get("closingUnits", h.get("units", 0))),
                    "nav": float(h.get("nav", 0)),
                    "current_value": float(h.get("currentValue", 0)),
                    "cost_value": float(h.get("costValue", 0)),
                    "folio_number": h.get("folioNo", ""),
                })

        elif fi_type == "EQUITIES":
            holdings = data.get("Holdings", data.get("holdings", []))
            if isinstance(holdings, dict):
                holdings = holdings.get("Holding", [])
            for h in (holdings if isinstance(holdings, list) else []):
                result["equities"].append({
                    "name": h.get("companyName", h.get("issuerName", "")),
                    "isin": h.get("isin", ""),
                    "quantity": int(h.get("holdingUnits", h.get("units", 0))),
                    "avg_price": float(h.get("rate", 0)),
                    "current_value": float(h.get("investmentValue", 0)),
                })

    return result


async def full_flow_sandbox(mobile: str = "9999999999") -> dict:
    """Run the complete AA sandbox flow.

    1. Authenticate → get JWT
    2. Create consent → get redirect URL
    3. User approves consent (sandbox: Setu FIP-2, OTP 123456)
    4. After approval: create data session + fetch

    Returns step-by-step status for frontend to track progress.
    """
    try:
        # Step 1: Auth
        token_result = await test_connection()
        if token_result["status"] != "connected":
            return {**token_result, "fallback": "Using mock AA data for demo."}

        # Step 2: Create consent
        consent = await create_consent(mobile)
        if consent.get("error"):
            return {**consent, "step": "consent_failed", "fallback": "Using mock AA data."}

        return {
            "step": "consent_created",
            "consent_id": consent["consent_id"],
            "redirect_url": consent["redirect_url"],
            "status": consent["status"],
            "instructions": (
                "Open the redirect URL to approve the consent. "
                "In sandbox, use Setu FIP-2 with OTP 123456. "
                "After approval, call /api/aa/session/{consent_id} to create a data session, "
                "then /api/aa/data/{session_id} to fetch financial data."
            ),
        }
    except Exception as e:
        return {
            "error": str(e),
            "step": "failed",
            "fallback": "Using mock AA data for demo.",
        }
