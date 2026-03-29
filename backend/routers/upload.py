"""File upload router — parse PDFs, images, spreadsheets via Gemini Flash.

Supports:
  - PDF: CAMS/KFintech statements, Form 16, salary slips, insurance docs
  - Images: Screenshots of broker apps, tax certificates
  - XLSX/CSV: Transaction data, portfolio exports
  - Auto-routes parsed data to the appropriate agent
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
import json
import base64
import io

router = APIRouter()

# File type -> suggested agent mapping
DOCUMENT_AGENT_MAP = {
    "cams": "mf-xray",
    "kfintech": "mf-xray",
    "mutual_fund": "mf-xray",
    "portfolio": "mf-xray",
    "form_16": "tax-wizard",
    "form_26as": "tax-wizard",
    "salary_slip": "tax-wizard",
    "tax": "tax-wizard",
    "insurance": "health-score",
    "bank_statement": "life-event",
    "investment": "fire",
    "general": "mentor",
}


async def parse_with_gemini(file_content: bytes, filename: str, mime_type: str, agent_hint: str = "") -> dict:
    """Use Gemini Flash to parse and extract structured data from documents.

    Gemini handles:
    - OCR for images and scanned PDFs
    - Table extraction from statements
    - Structured data extraction into JSON
    """
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import HumanMessage
        from config import settings

        llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.google_api_key,
            temperature=0,
        )

        # Build extraction prompt based on agent hint
        extraction_prompts = {
            "mf-xray": """Extract mutual fund portfolio data from this document. Return JSON with:
{
  "document_type": "CAMS_CAS" or "KFINTECH_CAS" or "PORTFOLIO_EXPORT",
  "investor_name": "...",
  "pan": "...",
  "statement_date": "...",
  "folios": [
    {
      "folio_number": "...",
      "amc": "...",
      "schemes": [
        {
          "scheme_name": "...",
          "category": "Equity - Large Cap" etc.,
          "units": 0.0,
          "nav": 0.0,
          "current_value": 0.0,
          "invested_amount": 0.0,
          "expense_ratio": 0.0,
          "xirr": 0.0,
          "isin": "..."
        }
      ]
    }
  ]
}""",
            "tax-wizard": """Extract tax-related data from this document. Return JSON with:
{
  "document_type": "FORM_16" or "FORM_26AS" or "SALARY_SLIP" or "TAX_RETURN",
  "financial_year": "...",
  "employer_name": "...",
  "gross_salary": 0,
  "deductions": {
    "section_80c": 0,
    "section_80d": 0,
    "nps_80ccd": 0,
    "hra": 0,
    "standard_deduction": 0,
    "home_loan_interest": 0
  },
  "tax_paid": 0,
  "tds_breakdown": []
}""",
            "health-score": """Extract insurance/health-related financial data. Return JSON with:
{
  "document_type": "INSURANCE_POLICY" or "HEALTH_INSURANCE" or "TERM_PLAN",
  "policy_number": "...",
  "insurer": "...",
  "sum_assured": 0,
  "premium": 0,
  "coverage_type": "...",
  "nominees": [],
  "maturity_date": "..."
}""",
        }

        prompt = extraction_prompts.get(agent_hint, """Extract all financial data from this document.
Return structured JSON with the key data points. Include:
- Document type
- Amounts, dates, names
- Any tables or structured data
- Key financial figures""")

        # Encode file for Gemini multimodal
        b64_content = base64.b64encode(file_content).decode("utf-8")

        if mime_type.startswith("image/") or mime_type == "application/pdf":
            # Multimodal: send as image/PDF
            message = HumanMessage(content=[
                {"type": "text", "text": f"Parse this financial document ({filename}). {prompt}\n\nReturn ONLY valid JSON, no markdown fences."},
                {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64_content}"}},
            ])
        else:
            # Text-based files (CSV, etc.)
            try:
                text_content = file_content.decode("utf-8")[:10000]
            except UnicodeDecodeError:
                text_content = file_content.decode("latin-1")[:10000]
            message = HumanMessage(content=f"Parse this financial data from {filename}:\n\n{text_content}\n\n{prompt}\n\nReturn ONLY valid JSON.")

        response = await llm.ainvoke([message])
        text = response.content.strip()

        # Strip markdown fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[-1]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            parsed = {"raw_extraction": text, "parse_note": "Gemini returned non-JSON, raw text preserved"}

        return {
            "status": "parsed",
            "filename": filename,
            "mime_type": mime_type,
            "parsed_data": parsed,
            "suggested_agent": agent_hint or _detect_agent(parsed),
        }

    except Exception as e:
        return {
            "status": "parse_error",
            "filename": filename,
            "error": str(e),
            "hint": "Check google_api_key in config.py for Gemini access",
        }


def _detect_agent(parsed_data: dict) -> str:
    """Auto-detect which agent should handle parsed data."""
    doc_type = parsed_data.get("document_type", "").lower()
    for keyword, agent in DOCUMENT_AGENT_MAP.items():
        if keyword in doc_type:
            return agent

    # Check content clues
    if parsed_data.get("folios") or parsed_data.get("schemes"):
        return "mf-xray"
    if parsed_data.get("deductions") or parsed_data.get("tax_paid"):
        return "tax-wizard"
    if parsed_data.get("sum_assured") or parsed_data.get("premium"):
        return "health-score"

    return "mentor"


ALLOWED_TYPES = {
    "application/pdf",
    "image/png", "image/jpeg", "image/jpg", "image/webp",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}


@router.post("/")
async def upload_document(
    file: UploadFile = File(...),
    agent_hint: Optional[str] = Form(None),
):
    """Upload a financial document for AI parsing.

    Supports PDF, images (PNG/JPG/WebP), CSV, XLSX.
    Returns structured data and suggests the appropriate agent.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    mime = file.content_type or "application/octet-stream"

    # Be lenient with mime types for demo
    if mime not in ALLOWED_TYPES:
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        ext_map = {"pdf": "application/pdf", "png": "image/png", "jpg": "image/jpeg",
                    "jpeg": "image/jpeg", "webp": "image/webp", "csv": "text/csv",
                    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
        mime = ext_map.get(ext, mime)

    result = await parse_with_gemini(content, file.filename, mime, agent_hint or "")
    return result


@router.post("/parse-and-analyze")
async def parse_and_analyze(
    file: UploadFile = File(...),
    agent_hint: Optional[str] = Form(None),
    query: Optional[str] = Form("Analyze this document"),
):
    """Upload, parse, AND route to the appropriate agent in one call.

    1. Gemini parses the document into structured data
    2. Data is routed to the detected/hinted agent
    3. Agent returns analysis
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    content = await file.read()
    mime = file.content_type or "application/octet-stream"

    # Parse
    parsed = await parse_with_gemini(content, file.filename, mime, agent_hint or "")

    if parsed.get("status") != "parsed":
        return parsed

    # Route to agent
    target_agent = agent_hint or parsed.get("suggested_agent", "mentor")

    try:
        from agents.orchestrator import process_message
        from data.mock_data import get_mock_user

        agent_result = await process_message(
            user_id="upload_user",
            message=f"{query}\n\nParsed document data: {json.dumps(parsed['parsed_data'], indent=2)[:3000]}",
            user_data=get_mock_user(),
        )
        return {
            **parsed,
            "agent_response": agent_result,
        }
    except Exception as e:
        return {
            **parsed,
            "agent_error": str(e),
            "hint": "Agent analysis failed, but document was parsed successfully.",
        }
